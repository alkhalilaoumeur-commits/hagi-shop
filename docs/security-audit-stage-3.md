# Security Audit — Stage 3 (Post-Checkout)

> **Auditor:** Claude (security-auditor agent)
> **Audit-Datum:** 2026-06-16
> **Scope:** 9 Stage-3 Files (Email, PDF, Tracking-Page, Order-Lifecycle, Rate-Limit)
> **Status zuvor:** Stage 1+2 separat geauditet (Cart, Checkout, Stripe-Webhook).
> **Out of Scope:** Admin-UI (Stage 4), Authentifizierung der Lifecycle-Trigger (Stage 4).

---

## 1. Executive Summary

Stage 3 ist als **Foundation-Layer solide gebaut**. Token-basierter Zugriff auf Tracking + PDF nutzt 256-bit `crypto.randomBytes`-Tokens (43 Zeichen base64url), die brute-force-resistent sind. Email-Templates rendern via React-Email mit eingebautem JSX-Escape, PDF nutzt React-PDF (kein HTML-Eval). Rate-Limiting existiert auf der Invoice-Route. Order-Lifecycle ist überwiegend idempotent.

**Verdict (Stage-3-Scope):** Foundation produktionsreif **bis auf 3 blockierende Issues + 5 mittlere Verbesserungen**. Keine kritische Datenleck-Lücke, keine RCE/Injection-Pfade.

**Was vor Live-Schaltung zwingend gemacht werden muss:**
1. Rate-Limit auf Tracking-Page (`/bestellung/status/[token]`) hinzufügen — aktuell ungebremst
2. `cancelOrder` und `markOrderShipped` mit transaktionalem Idempotenz-Lock härten (Race Condition bei Doppel-Klick)
3. `extractIp()` gegen Header-Spoofing absichern (Trust-Proxy-Konfiguration)

**Was Stage-3 NICHT validiert (gehört zu Stage 4):**
- Wer darf `markOrderShipped` / `cancelOrder` aufrufen? — Authorisierung der Admin-Caller fehlt komplett, ist aber laut Scope Stage 4.
- CSRF-Schutz für POST-Mutations (kommt mit Admin-UI).

---

## 2. Findings nach Severity

### CRITICAL — keine

Keine Vulnerabilities mit unmittelbarem Schaden für PII/Geld/RCE im Scope gefunden.

---

### HIGH — 3 Findings

#### H1. Race Condition in `markOrderShipped` — Doppel-Fulfillment möglich

**Datei:** `lib/services/order-lifecycle.ts:28-69`

**Problem:** Der Idempotenz-Check `if (order.fulfillmentStatus === "FULFILLED") return;` (Zeile 32) liest VOR dem `create`/`$transaction`. Zwischen Lesen und Schreiben liegen mehrere `await`-Punkte. Zwei parallele Admin-Klicks erzeugen zwei `Fulfillment`-Rows, doppelten `fulfilledQuantity`-Update und zwei Versand-Mails.

```ts
const order = await prisma.order.findUnique(...);   // Read
if (order.fulfillmentStatus === "FULFILLED") return; // Check — RACE WINDOW BEGINS
const fulfillment = await prisma.fulfillment.create(...);  // Write 1
await prisma.$transaction([...]);                          // Write 2 (separat!)
```

Zusätzlich: Die `prisma.fulfillment.create` läuft **außerhalb** der `$transaction`. Wenn die Transaktion fehlschlägt, bleibt das Fulfillment in der DB. Inkonsistenter Zustand.

**Impact:** Doppelte Tracking-Mail an Kunde, doppelter Fulfillment-Eintrag, fehlerhafte Reports.

**Fix:**
```ts
await prisma.$transaction(async (tx) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true }
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.fulfillmentStatus === "FULFILLED") return;
  if (order.orderStatus === "CANCELLED") throw new Error("ORDER_CANCELLED");
  if (order.paymentStatus !== "PAID") throw new Error("ORDER_NOT_PAID");

  const fulfillment = await tx.fulfillment.create({ ... });
  // ... alle items.update + order.update in derselben tx
}, { isolationLevel: "Serializable" });
```

Alternativ: Unique-Constraint auf `Fulfillment(orderId)` setzen und auf P2002 prüfen.

---

#### H2. `cancelOrder` + `releaseDiscount` nicht idempotent unter Race

**Datei:** `lib/services/order-lifecycle.ts:146-192`

**Problem:** Der Schutz `if (order.orderStatus === "CANCELLED") return;` (Zeile 153) hat dasselbe Read-then-Write-Problem. Wenn zwei parallele `cancelOrder`-Calls reinkommen, dekrementiert `releaseDiscount` zweimal — Rabattcode-Counter wird auf negativ gezogen oder andere Kunden bekommen einen "freigegebenen" Slot, der eigentlich nicht freigegeben ist.

Zusätzlich: Wenn `markOrderShipped` und `cancelOrder` parallel laufen, kann man eine bereits versendete Order stornieren (kein Check auf `fulfillmentStatus`). Das ist eine Geschäfts-Inkonsistenz, kein reines Security-Issue, aber sollte erwähnt sein.

**Fix:** Gleiche Lösung wie H1 — alles in `$transaction` mit Serializable. `releaseDiscount` braucht eigene Idempotenz (z.B. `releasedForOrderId`-Spalte oder atomares `UPDATE … WHERE NOT released`).

---

#### H3. `extractIp()` ist gegen Header-Spoofing ungeschützt

**Datei:** `lib/services/rate-limit.ts:86-95`

**Problem:** `x-forwarded-for` wird ungeprüft genommen. Wenn der Server nicht hinter einem Trust-Proxy hängt (oder der Trust-Proxy-Layer falsch konfiguriert ist), kann jeder Client einen beliebigen Header senden und so das Rate-Limit umgehen:

```bash
curl -H "x-forwarded-for: 1.2.3.4" https://shop/api/invoice/TOKEN
curl -H "x-forwarded-for: 1.2.3.5" https://shop/api/invoice/TOKEN
# 1000 verschiedene IPs → 30*1000 = 30k Requests/Min
```

Zusätzlich: `forwarded.split(",")[0]` nimmt die **erste** IP in der Kette. Wenn die Coolify/Cloudflare-Chain `client, proxy1, proxy2` durchgereicht wird, ist die erste richtig. Wenn aber **gar kein** Trust-Proxy davor liegt, ist die erste IP komplett vom Client kontrollierbar.

**Impact:** Rate-Limit umgehbar → DoS auf PDF-Render-Endpoint (renderToBuffer ist CPU-teuer, ein PDF kann mehrere 100ms kosten).

**Fix (Coolify-Setup vorausgesetzt):**
- Sicherstellen, dass Coolify Traefik den `x-forwarded-for`-Header **überschreibt** statt anzuhängen.
- Im Code: Falls Cloudflare davor → `cf-connecting-ip` bevorzugen (kann nicht gespooft werden, wenn die Origin nur Cloudflare-IPs akzeptiert).
- Zusätzlich Rate-Limit auch auf `publicToken` als Key (siehe M1).

---

### MEDIUM — 5 Findings

#### M1. Tracking-Page hat **kein** Rate-Limit

**Datei:** `app/bestellung/status/[token]/page.tsx:27-46`

**Problem:** Die Tracking-Page macht `prisma.order.findUnique` ohne Rate-Limit. 256-bit Token sind brute-force-resistent — ja. Aber:
1. **DB-DoS:** Jeder GET triggert einen Order-Lookup mit `include: { items, fulfillments }`. Bei massivem Traffic auf einem zufälligen Token kann das Postgres belasten.
2. **Timing-Side-Channel:** `findUnique` auf existierendem vs. nicht-existierendem Token kann unterschiedlich lange brauchen — theoretisch enumerierbar (in der Praxis bei 256-bit Token irrelevant).

**Fix:**
```ts
const ip = extractIp(headers());
const rl = await rateLimit({ key: `ip:${ip}:tracking`, limit: 60, windowSeconds: 60 });
if (!rl.allowed) return <RateLimited />;
```

Der Invoice-Endpoint hat das schon (`route.ts:19-26`) — analog auf die Tracking-Page ziehen.

---

#### M2. Rate-Limit fail-open bei DB-Ausfall (kein Try/Catch)

**Datei:** `lib/services/rate-limit.ts:29-64`

**Problem:** Wenn Postgres down ist oder timeoutet, wirft `prisma.auditLog.count` oder `.create`. In `app/api/invoice/[token]/route.ts:20` läuft das **ohne try/catch um den Rate-Limit-Call**:

```ts
const rl = await rateLimit({ ... });  // wirft → 500
if (!rl.allowed) return 429;
```

→ Bei DB-Ausfall geht der ganze Endpoint kaputt. Das ist eigentlich fail-closed (gut!), aber wenn man **bewusst** fail-open will (Verfügbarkeit > Sicherheit für nicht-kritische Routes), sollte das eine bewusste Entscheidung sein und im Code stehen.

**Entscheidung dokumentieren:** Für PDF-Invoice ist fail-closed besser (Server-Error statt unbegrenzten PDF-Render). Für Tracking-Page wäre fail-open vertretbar.

**Fix:** Try/catch um den Rate-Limit-Call mit definiertem Fallback-Verhalten:
```ts
let rl;
try {
  rl = await rateLimit({ ... });
} catch (e) {
  console.error("[ratelimit] DB unavailable", e);
  rl = { allowed: false, retryAfter: 60 };  // fail-closed
}
```

---

#### M3. PDF-Filename ist nicht escaped — Header-Injection-Risiko (gering)

**Datei:** `app/api/invoice/[token]/route.ts:47-52`

**Problem:** `Content-Disposition: inline; filename="${filename}"` interpoliert `order.orderNumber` ohne Escape. Wenn jemand eine `orderNumber` mit `"` oder `\r\n` in der DB anlegt, kann man theoretisch zusätzliche Header injecten.

**In der Praxis:** `orderNumber` kommt aus `order-numbering.ts` und ist ein deterministisches Pattern (`HG-2026-00123` o.ä.), also kein User-Input. **Aber:** Defense-in-Depth — der Header sollte trotzdem nicht user-controlled gestaltbar sein.

**Fix:** Filename strikt sanitisieren:
```ts
const safeOrderNumber = order.orderNumber.replace(/[^A-Za-z0-9_-]/g, "");
const filename = `${isDeliveryNote ? "Lieferschein" : "Rechnung"}_${safeOrderNumber}.pdf`;
```

Zusätzlich: RFC 5987 `filename*` für Umlaute (nicht Hagi-relevant da nur ASCII).

---

#### M4. PII in Mock-Mode-Logs

**Datei:** `lib/email/send.ts:47-49`

**Problem:**
```ts
if (isMockMode()) {
  console.log(`[email:mock] → ${to} · "${subject}" · tag=${tag}`);
  return { mocked: true };
}
```

Die `to`-Adresse ist **PII**. In Dev lokal okay — aber:
- Wenn jemand vergisst `RESEND_API_KEY` in Production zu setzen, läuft Production silently im Mock-Mode → Customer-Emails landen in Coolify-Logs (Log-Aggregator, Vercel-Logs, etc.).
- DSGVO Art. 5 (Datenminimierung) + Art. 32 (Sicherheit der Verarbeitung) — Email-Adressen sollen nicht in Application-Logs landen.

**Fix:**
1. **Production fail-fast:** In `getResend()` bzw. `isMockMode()` einen Check:
   ```ts
   if (!process.env.RESEND_API_KEY && process.env.NODE_ENV === "production") {
     throw new Error("RESEND_API_KEY required in production");
   }
   ```
2. **Log-PII-Redaction:** Email-Domain loggen, lokalen Teil maskieren:
   ```ts
   const masked = to.replace(/^(.{2}).*?(@.*)$/, "$1***$2");
   console.log(`[email:mock] → ${masked} ...`);
   ```

---

#### M5. `cleanupRateLimitLogs` hat keinen Cron-Trigger

**Datei:** `lib/services/rate-limit.ts:70-80`

**Problem:** Die Funktion existiert, aber wird nirgends aufgerufen. AuditLog-Tabelle wächst unbegrenzt. Wenn 1.000 IPs/Tag Bestellungen tracken → bei 30 req/min Window pro IP über 24h × Tage → schnell mehrere Millionen Rows.

`prisma.auditLog.count(...)` wird mit jedem Request immer langsamer (Full-Table-Scan ohne passenden Index).

**Fix:**
1. Cron-Job einrichten (Coolify hat Cron-Tasks, alternativ Vercel Cron oder ein eigener API-Route mit Schutz-Token):
   ```ts
   // app/api/cron/cleanup/route.ts
   export async function POST(req) {
     const auth = req.headers.get("authorization");
     if (auth !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Forbidden", { status: 403 });
     const deleted = await cleanupRateLimitLogs();
     return Response.json({ deleted });
   }
   ```
2. **Wichtiger:** Composite-Index für die `count`-Query in `schema.prisma`:
   ```prisma
   model AuditLog {
     @@index([action, entityType, entityId, createdAt])
   }
   ```
3. Besser: **Eigene Tabelle** `RateLimitHit` statt Misuse von AuditLog. AuditLog ist semantisch für Audit (langlebig), nicht für hochfrequente Rate-Hits (Ephemerer Counter).

---

### LOW — 6 Findings

#### L1. PDF wird auch nach `REFUNDED` gerendert

**Datei:** `app/api/invoice/[token]/route.ts:35-37`

Das ist business-logisch wahrscheinlich erwünscht (Kunde soll auch nach Refund die Original-Rechnung als Beleg haben), aber die InvoicePDF zeigt **keinen Hinweis auf Refund**. Eine refundete Rechnung sollte mit "STORNIERT" oder einer Refund-Note überdruckt sein, sonst wirkt sie wie eine gültige Rechnung — steuerlich heikel (§ 14c UStG: wer ausweist, schuldet).

**Fix:** In `InvoicePDF` einen Storno-Hinweis rendern wenn `data.refundedCents > 0`. Oder zwei separate Routes: `/rechnung` und `/storno-rechnung`.

---

#### L2. Tracking-Page leakt `cancelReason` im Klartext

**Datei:** `app/bestellung/status/[token]/page.tsx:76`

```tsx
{`Die Bestellung wurde storniert${order.cancelReason ? ` (${order.cancelReason})` : ""}.`}
```

`cancelReason` wird von Admin/System gesetzt (`order-lifecycle.ts:159` schneidet auf 200 Zeichen, kein Format-Filter). Wenn ein Admin "Kunde hat Karte als gestohlen gemeldet — Fraud" als Grund einträgt, sieht der Kunde das.

In Stage 3 ist `cancelReason` zwar nicht user-controlled → kein XSS-Risiko (React escaped JSX), aber es ist eine **interne Information** die customer-facing ausgespielt wird. `internalNote` wird (richtigerweise) NICHT angezeigt — `cancelReason` sollte dieselbe Trennung haben oder es braucht eine separate `customerFacingCancelReason`.

**Fix:** Eigenes Whitelist-Enum für customer-facing Reasons:
```ts
type CustomerCancelReason = "kundenwunsch" | "lieferproblem" | "zahlung_fehlgeschlagen" | "sonstiges";
```

---

#### L3. PDF-Cache-Header okay, aber `X-Robots-Tag` nicht auf Tracking-Page

**Datei:** `app/bestellung/status/[token]/page.tsx:9-12`

```ts
export const metadata: Metadata = {
  title: "Bestellstatus | Hagi Teppiche",
  robots: { index: false, follow: false },
};
```

Das setzt `<meta name="robots">` — gut. Aber **kein** `X-Robots-Tag`-HTTP-Header. Manche Crawler (insbesondere wenn die Seite via Link geteilt wird in Slack/WhatsApp-Preview) ignorieren Meta-Tags und folgen nur Header. Zusätzlich fehlt `Cache-Control: private, no-store` — eine getrackte Order könnte in einem CDN/Browser-Cache landen.

**Fix:** Tracking-Page mit Route-Handler-Pattern oder mit `next.config.mjs` headers für `/bestellung/status/*`:
```js
{
  source: "/bestellung/status/(.*)",
  headers: [
    { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
    { key: "Cache-Control", value: "private, no-store, max-age=0" },
  ],
}
```

PDF-Route hat das schon korrekt (Zeile 53-54).

---

#### L4. `variant`-Parameter hat keine Whitelist

**Datei:** `app/api/invoice/[token]/route.ts:39-40`

```ts
const variant = req.nextUrl.searchParams.get("variant");
const isDeliveryNote = variant === "lieferschein";
```

Funktional korrekt (alles außer `"lieferschein"` → Rechnung). Aber kein expliziter Whitelist-Check und kein 400 bei unbekannten Variants. Wenn später `variant=quittung` oder `variant=rueckgabeschein` dazukommt, kippt das Verhalten in stille `else`-Branch.

**Fix:** Explizites Switch + 400 bei unbekannt:
```ts
const variant = req.nextUrl.searchParams.get("variant") ?? "rechnung";
const ALLOWED = new Set(["rechnung", "lieferschein"]);
if (!ALLOWED.has(variant)) return NextResponse.json({ error: "invalid_variant" }, { status: 400 });
```

---

#### L5. `markOrderDelivered` triggert auch wenn `orderStatus === COMPLETED` schon ist

**Datei:** `lib/services/order-lifecycle.ts:111-144`

`if (order.deliveredAt) return;` — okay, idempotent. Aber: Wenn `deliveredAt` aus irgendeinem Grund `null` ist und die Order bereits `COMPLETED` ist (z.B. manuell in DB gesetzt), würde der Code `COMPLETED → COMPLETED` neu setzen und nochmal die Delivery-Mail schicken. In der Praxis unwahrscheinlich.

**Fix:** Doppelter Guard:
```ts
if (order.deliveredAt || order.orderStatus === "COMPLETED") return;
```

---

#### L6. Email-Templates: Plain-Text-Variante via `render(..., { plainText: true })` — Vertrauen auf React-Email

**Datei:** `lib/email/send.ts:65-94`

React-Email's `render` mit `plainText: true` strippt HTML — gut. Keine eigene HTML-Manipulation. Aber:
- Wir nutzen Inline-`<a href={trackingUrl}>` und `<strong>` in JSX — React-Email rendert das korrekt zu Plain-Text mit URL inline.
- **Risiko:** Wenn jemand später eine **rohe** HTML-String-Komponente einschleust (z.B. `dangerouslySetInnerHTML`), wäre das Plain-Text-Output kompromittiert.
- Aktuell **NICHT** der Fall. Keine `dangerouslySetInnerHTML`-Usage in den Templates → grünes Licht.

**Empfehlung:** ESLint-Rule `react/no-danger` für `lib/email/**` als Lint-Guard etablieren.

---

## 3. Spezifische Checkliste aus dem Audit-Auftrag

### 1. Email-Security

| Check | Status | Notiz |
|---|---|---|
| XSS in Templates verhindert | ✅ PASS | React-Email/JSX escaped automatisch. `customerFirstName`, `orderNumber` etc. werden als Text gerendert, kein `dangerouslySetInnerHTML`. |
| Open-Redirect in CTAs | ✅ PASS | Alle CTAs nutzen hardcoded `${APP_URL}/bestellung/status/${publicToken}`. Einzige Ausnahme: `trackingUrl` (templates.tsx:132) — kommt von Admin/Carrier-API. Siehe **Hinweis**. |
| Tracking-Links nur `publicToken`, nicht `id` | ✅ PASS | Alle 5 Templates nutzen `publicToken`. |
| Header-Injection in Subject | ✅ PASS | Subject interpoliert `orderNumber` und `trackingNumber`, beide system-controlled. Resend SDK escaped Headers selbst. |
| Plain-Text ohne HTML-Reste | ✅ PASS | React-Email `render(..., { plainText: true })` ist die Standard-Methode. |

**Hinweis zu `trackingUrl`:** Wenn Admin im Stage 4 frei eintippt, kann ein Open-Redirect/Phishing-Link in die Mail geraten. Stage-4-TODO: Whitelist der erlaubten Carrier-Domains (`*.dhl.de`, `*.dpd.de`, `*.gls-pakete.de` etc.) im `markOrderShipped`-Call.

### 2. PDF-Security

| Check | Status | Notiz |
|---|---|---|
| Token-Validation vor DB-Lookup | ✅ PASS | Length-Check + Regex (route.ts:15) vor `findUnique`. |
| `X-Robots-Tag: noindex, nofollow` | ✅ PASS | route.ts:54. |
| `Cache-Control: private, no-store` | ✅ PASS | route.ts:53. |
| Nur PAID/REFUNDED Orders rendern | ✅ PASS | route.ts:35-37. PENDING gibt 403. |
| Filename-Escape gegen Path-Injection | ⚠️ MEDIUM (M3) | `orderNumber` system-generiert, aber kein Defense-in-Depth-Escape. |
| `Content-Disposition: inline` Sinn? | ✅ PASS | Inline ist UX-richtig für In-Browser-Preview. PDF im Browser ist sicher (kein Script-Exec). Download via `?download=1` als Stage-4-Feature okay. |
| `variant`-Whitelist | ⚠️ LOW (L4) | Kein expliziter Whitelist-Check, aber fail-safe-default zu Rechnung. |

### 3. Tracking-Page

| Check | Status | Notiz |
|---|---|---|
| Token-Length + Regex vor DB-Lookup | ✅ PASS | page.tsx:30. |
| IDOR-sicher (publicToken, nicht id) | ✅ PASS | `findUnique({ where: { publicToken: token }})` — Token ist 256-bit, brute-force-resistent. |
| `noindex, nofollow` | ⚠️ LOW (L3) | Meta-Tag ja, HTTP-Header nein. |
| Rate-Limit | ❌ MEDIUM (M1) | **Fehlt komplett.** |
| `internalNote` nicht angezeigt | ✅ PASS | Nur customer-facing Fields gerendert. |
| `cancelReason` Leak | ⚠️ LOW (L2) | Wird angezeigt, könnte interne Info enthalten. |

### 4. Order-Lifecycle

| Check | Status | Notiz |
|---|---|---|
| `markOrderShipped` idempotent | ❌ HIGH (H1) | Read-then-Write Race; `fulfillment.create` außerhalb der Transaktion. |
| `markOrderShipped` prüft `CANCELLED + PAID` | ✅ PASS | Zeile 30-31. |
| `markOrderDelivered` Doppel-Schutz | ⚠️ LOW (L5) | Schutz auf `deliveredAt`, aber nicht auf `orderStatus`. |
| `cancelOrder` idempotent | ❌ HIGH (H2) | Read-then-Write Race; `releaseDiscount` kann doppelt laufen. |
| `cancelOrder` + `releaseDiscount` Doppel-Decrement | ❌ HIGH (H2) | Siehe oben. |
| `registerWithdrawal` prüft Status | ✅ PASS | Zeile 201-203. |
| Lifecycle-Mails in try/catch | ✅ PASS | Alle 4 Mail-Sends in try/catch. Status-Update blockt nicht. |

### 5. Rate-Limit

| Check | Status | Notiz |
|---|---|---|
| Sliding-Window funktional korrekt | ✅ PASS | Count-Query mit `gte: windowStart` ist mathematisch korrekt. |
| Key-Format gegen Collision | ✅ PASS | Pattern `ip:${ip}:${scope}` — kollisionsfrei. |
| Key sanitized | ⚠️ kein Issue | `entityId` ist Prisma-String, kein SQL-Injection-Vektor durch Prisma-ORM. |
| `cleanupRateLimitLogs` als Cron | ❌ MEDIUM (M5) | **Nicht eingerichtet → DB-Bloat.** |
| IP-Extraction | ⚠️ HIGH (H3) | Spoofable ohne Trust-Proxy. |
| Fail-open vs. fail-closed | ⚠️ MEDIUM (M2) | Aktuell implizit fail-closed via Throw, nicht dokumentiert. |

### 6. Mock-Mail

| Check | Status | Notiz |
|---|---|---|
| Mock leakt PII in Logs | ⚠️ MEDIUM (M4) | `to`-Adresse wird unmaskiert geloggt. |
| Production fail-fast geplant | ⚠️ MEDIUM (M4) | Aktuell nur Kommentar "könnte später fail-fast werden" (send.ts:35). |

### 7. Race Conditions in Lifecycle

| Check | Status | Notiz |
|---|---|---|
| Zwei Admins gleichzeitig `markShipped` | ❌ HIGH (H1) | Race möglich. |
| `cancelOrder` parallel `markShipped` | ❌ HIGH (H1+H2) | Keine cross-funktion Sperre. Versendete Order könnte storniert werden. |
| `$transaction`-Verwendung korrekt | ❌ HIGH (H1) | In `markOrderShipped` läuft `fulfillment.create` außerhalb der Transaktion. |

---

## 4. OWASP Top 10 Mapping

| OWASP | Finding | Severity |
|---|---|---|
| A01 Broken Access Control | Tracking-Page hat keine Rate-Limit (M1) — kein Access-Control-Bypass, aber DoS-Vektor. PDF-Route 403 bei nicht-PAID korrekt. | MEDIUM |
| A02 Cryptographic Failures | `publicToken` nutzt `crypto.randomBytes(32)` (256-bit) — korrekt. Keine schwachen Hashes. | OK |
| A03 Injection | Prisma-ORM verhindert SQL-Injection. Filename in Content-Disposition (M3) ist Header-Injection-Vektor (gering, system-controlled). | LOW |
| A04 Insecure Design | Read-then-Write Pattern in Lifecycle (H1, H2). Mock-Mode in Production möglich (M4). | HIGH |
| A05 Security Misconfiguration | `X-Robots-Tag` fehlt auf Tracking (L3). `Cache-Control` fehlt auf Tracking-Page (L3). | LOW |
| A06 Vulnerable Components | Out of Scope — Stage-3 fügt keine neuen Deps hinzu außer `@react-email/*` und `@react-pdf/renderer`, beide aktiv gepflegt. `npm audit` als Routine empfohlen. | OK |
| A07 Identification & Auth Failures | Token-basierter Auth ist korrekt für customer-facing. **Admin-Auth fehlt komplett auf Lifecycle-Funktionen** — gehört aber explizit zu Stage 4. | OK (Scope) |
| A08 Software & Data Integrity | Idempotenz-Issues H1+H2 fallen hierunter. | HIGH |
| A09 Security Logging Failures | Mail-Fehler werden geloggt + auditiert (gut). Aber Mock-Mode leakt PII (M4). | MEDIUM |
| A10 SSRF | `trackingUrl` aus Admin/Carrier-API in Email-Template — Stage-4-TODO Whitelist. Kein server-side Fetch in Stage 3. | OK |

---

## 5. Pflicht vor Live-Schaltung

**Stage 3 darf NICHT live gehen, bevor:**

1. **H1 fixen** — `markOrderShipped` in eine echte `$transaction` mit Idempotenz-Constraint packen.
2. **H2 fixen** — `cancelOrder` + `releaseDiscount` in eine `$transaction` packen, `releaseDiscount` idempotent machen.
3. **H3 fixen** — Coolify-Trust-Proxy-Konfiguration verifizieren ODER Cloudflare-IP-Header bevorzugen.
4. **M1 fixen** — Tracking-Page mit Rate-Limit ausstatten (analog zur Invoice-Route).
5. **M4 fixen** — `RESEND_API_KEY` fail-fast in Production einbauen.
6. **M5 fixen** — Cron-Job für `cleanupRateLimitLogs` einrichten **+** Composite-Index auf AuditLog.

**Kann nach Live-Schaltung gefixed werden:**
- M2, M3, L1-L6 (Quality-of-Life, kein akutes Sicherheitsrisiko).

**Empfohlene Stage-4-Vorbereitung:**
- Authorisierungs-Layer für Lifecycle-Funktionen designen (Wer darf `markShipped`/`cancel`?).
- `trackingUrl` Carrier-Domain-Whitelist.
- `customerFacingCancelReason`-Enum statt freier `cancelReason`.
- `RateLimitHit` eigene Tabelle statt AuditLog-Misuse.

---

## 6. Pass/Fail-Tabelle (kompakt)

| Bereich | Pass | Warn | Fail |
|---|---|---|---|
| Email-Security | 5 | 0 | 0 |
| PDF-Security | 5 | 2 | 0 |
| Tracking-Page | 4 | 2 | 1 (M1 Rate-Limit) |
| Order-Lifecycle | 3 | 1 | 2 (H1, H2) |
| Rate-Limit | 3 | 2 | 2 (H3, M5) |
| Mock-Mail | 0 | 1 | 1 (M4) |
| Race Conditions | 0 | 0 | 3 (H1, H2, $tx) |
| **Gesamt** | **20** | **8** | **9** |

**Severity-Verteilung:**
- CRITICAL: 0
- HIGH: 3 (H1 Race-Shipping, H2 Race-Cancel, H3 IP-Spoof)
- MEDIUM: 5 (M1 RL-Tracking, M2 RL-Fail-Open, M3 Filename, M4 Mock-Leak, M5 Cleanup-Cron)
- LOW: 6 (L1-L6)

**Stage 3 als Foundation:** **Solide.** Token-Generierung, Email-Render, PDF-Render, Status-Logik sind sauber. Die 3 HIGH-Issues sind alles **Symptome desselben Problems**: Lifecycle-Funktionen sind als optimistische Read-then-Write geschrieben, nicht als atomare Transaktionen. Fix ist gut umgrenzt und in wenigen Stunden machbar.
