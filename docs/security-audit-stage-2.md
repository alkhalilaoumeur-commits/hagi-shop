# Security Audit — Stage 2 (Checkout Flow)

**Datum:** 2026-06-16
**Scope:** 9 Files aus Stage 2 (Cart-Actions, Checkout-Action, Order-Create-Service, Stripe-Webhook, Deprecated-Stub, CartView, CheckoutForm, Confirmation-Page, CookieBanner)
**Out of Scope:** Stage 1 (separat geauditet), Mail-Templates, Auth, Admin-Auth (Stage 3-4)

---

## 1. Executive Summary

**Ampel: GRÜN mit zwei gelben Auflagen.**

Der Checkout-Flow ist auffällig sauber gebaut. Server-Side-Truth wird konsequent durchgehalten — der Client liefert nur `productId + quantity + Adresse + Email`, der Server berechnet Preise, Steuer, Versand und Rabatt aus der DB neu. Zod-Validation auf allen Eingaben, mit harten Längen-Limits und Enum-Schutz. Stripe-Webhook ist signature-verified mit raw body, dedup-fähig (Unique-Constraint + create-first), idempotency-key beim Session-Create, runtime=nodejs explizit gesetzt. Discount-Redeem ist atomar via `updateMany({ where: usedCount < usageLimit })`. PublicToken ist crypto-random 32 Bytes (256 Bit) base64url. DSGVO-Pflichten (ConsentLog mit Server-IP/UA, Snapshot personenbezogener Daten auf Order, customerId nullable) sind korrekt umgesetzt. Confirmation-Page nutzt Token-Lookup statt ID, validiert Token-Länge, setzt `noindex/nofollow`.

Zwei Themen müssen vor Live-Schaltung gefixt werden (siehe HIGH/MEDIUM-Findings):
1. **Webhook-Reihenfolge bei `recordReceive` vs `markProcessed` ist crash-resistent, aber die Order wird VOR `markProcessed` aktualisiert** — bei Crash zwischen Order.update und markProcessed führt der Retry trotz Order.paymentStatus==PAID zu einer korrekten Skip-Logik, weil ein zweiter Block `if (order.paymentStatus === "PAID") { markProcessed; return }` existiert. Soweit ok, aber die Reihenfolge sollte explizit dokumentiert oder durch Transaktion abgesichert werden.
2. **`logConsent`, `logAudit` und der Order-PII-Snapshot laufen NACH dem Stripe-Call** — wenn der Server zwischen Stripe-Success und logConsent crasht, hat man eine Stripe-Session ohne Consent-Logs. ConsentLog gehört in dieselbe Transaktion wie Order-Create.

Zusätzlich gibt es einige `LOW`/`INFO`-Punkte, die kosmetisch oder härtungs-relevant sind, aber nicht blockierend.

---

## 2. Findings nach Severity

### CRITICAL — 0 Findings

Keine.

### HIGH — 2 Findings

#### HIGH-1: ConsentLog läuft AUSSERHALB der Order-Transaktion

**Datei:** `lib/services/order-create.ts:313-318`

```typescript
// 1. Order wird in $transaction angelegt (atomar)
// 2. Stripe-Session wird erzeugt (nicht in tx, kann fail)
// 3. logConsent läuft NACH Stripe — sequenziell, nicht atomar
await logConsent({ orderId, consentType: "TERMS", ... });
await logConsent({ orderId, consentType: "PRIVACY", ... });
await logConsent({ orderId, consentType: "WITHDRAWAL", ... });
```

**Risiko:**
- Wenn der Server-Prozess zwischen Stripe-Session-Create und logConsent crasht, hat der Kunde eine bezahlte Bestellung ohne dokumentierte AGB/Privacy/Widerrufs-Einwilligung
- DSGVO-Beweispflicht (Art. 7 Abs. 1 — "der Verantwortliche muss nachweisen können") ist dann nicht erfüllt
- Ein Anwalt könnte argumentieren: AGB nicht wirksam akzeptiert → Vertrag anfechtbar

**Fix:**
ConsentLog-Inserts in die $transaction in `prisma.$transaction(async (tx) => { ... })` reinziehen, vor `tx.order.create` ODER direkt danach. Order und ConsentLog gehen gemeinsam committen oder gemeinsam rollbacken.

#### HIGH-2: Stripe-Session-ID-Update läuft AUSSERHALB der Order-Transaktion (Race)

**Datei:** `lib/services/order-create.ts:289-296`

```typescript
const session = await stripe.checkout.sessions.create(...);
await prisma.order.update({
  where: { id: order.id },
  data: { stripeSessionId: session.id, stripePaymentIntentId: ... }
});
```

**Risiko:**
- Theoretischer Race: Stripe ruft Webhook *bevor* der `prisma.order.update` durchläuft (Stripe wartet auf success_url-Redirect normalerweise nicht, aber bei sehr schnellen Webhook-Auslieferungen z.B. mit Test-Stripe ist eine Sub-100ms-Lücke möglich)
- Webhook sucht `findUnique({ where: { stripeSessionId } })` und findet die Order nicht → `console.warn("[webhook] no order for session")` und gibt `received: true` zurück
- Stripe markiert den Webhook als erfolgreich, retried aber nicht
- Folge: Bestellung bleibt PENDING, keine Bestätigungs-Mail, kein paid-Status

**Realität:** In der Praxis braucht Stripe einige Hundert Millisekunden bis zum ersten Webhook, und Postgres-Latenz ist <50ms. Wahrscheinlichkeit ist niedrig, aber nicht null.

**Fix:** Entweder
- Option A: Stripe-Session-Erstellung VOR Order-Create. Order bekommt sessionId direkt mit. (Riskanter Rollback wenn Order-Create fehlschlägt.)
- Option B: Webhook-Handler nutzt zusätzlich `client_reference_id` (=order.id) als Fallback-Lookup, wenn `stripeSessionId` noch nicht gesetzt ist. Empfohlen.
- Option C: Im Webhook-Handler bei `no order for session` einen kurzen Retry mit Backoff (1s × 3) einbauen, sodass die Postgres-Update-Latency aufgeholt wird.

### MEDIUM — 4 Findings

#### MEDIUM-1: PII-Leak auf Confirmation-Page bei Token-Erraten (Brute-Force-Window)

**Datei:** `app/bestellung-bestaetigt/page.tsx:28-39`

- Token-Länge 16-64 wird validiert
- Generierter Token = 32 Bytes base64url = **43 Zeichen** — perfekt
- ABER: Es gibt KEIN Rate-Limit auf die Confirmation-Page. Ein Angreifer kann 1M Requests/h auf zufällige 43-char Tokens schießen
- Bei 256-Bit Entropie ist Brute-Force praktisch ausgeschlossen, aber dennoch sollte Rate-Limit her (Standard-Defense-in-Depth)

**Fix:** Edge-Middleware oder Vercel-Rate-Limit für `/bestellung-bestaetigt` und `/bestellung/status/[token]` (z.B. 30 req/min/IP). Bei Stage 4 als Teil des Rate-Limiting-Workitems erledigen.

**Severity-Begründung:** MEDIUM weil Brute-Force bei 256 Bit unrealistisch; INFO wäre zu schwach, weil PII-Risiko real ist.

#### MEDIUM-2: Discount kann doppelt released werden (Counter-Underflow)

**Datei:** `lib/services/discount.ts:195-203` + `app/api/stripe/webhook/route.ts:164,192`

- `releaseDiscount` verwendet `updateMany({ where: { usedCount: { gt: 0 } } })` — gut, blockt unter 0
- Aber: `handleCheckoutSessionExpired` UND `handlePaymentIntentFailed` können beide für dieselbe Order feuern. Beide rufen `releaseDiscount`
- Wenn die Stripe-Event-Reihenfolge `session.expired → payment_intent.payment_failed` ist, läuft `releaseDiscount` zweimal
- Erste Release: usedCount geht von 1→0
- Zweite Release: `where: { usedCount: { gt: 0 } }` matcht NICHT → keine Aktion, ok

**Tatsächliches Problem:** Bei der Variante `payment_intent.payment_failed → session.expired` (sehr unwahrscheinlich, weil expired erst nach 24h kommt) hingegen sind beide Updates auf die gleiche Order, was bei mehreren parallelen Discount-Codes UnterCount führt.

**Schlimmer:** `releaseDiscount` checkt nicht, ob die Order bereits CANCELLED ist. Wenn ein Admin später die Order manuell stornieren würde und dabei nochmal release triggert, geht der Counter zu tief runter (Anti-Pattern: nicht-idempotent).

**Fix:** ConsentLog-Pattern: `releaseDiscount` sollte als Argument auch die `orderId` bekommen und prüfen, ob für diese Order schon ein "DISCOUNT_RELEASED" AuditLog existiert. Wenn ja → skip. Alternativ: AuditLog-Insert + Discount-Release in einer Transaktion.

#### MEDIUM-3: `customerEmail` für Discount-Preview wird NICHT mit Form-Email verglichen (Discount-Sharing)

**Datei:** `components/checkout/CheckoutForm.tsx:146` + `lib/services/discount.ts:93-104`

- Preview prüft `oncePerCustomer` via `customerEmail` aus dem Form
- Aber: `redeemDiscount` läuft im `order-create.ts` mit `email = normalizeEmailOrThrow(input.email)` — d.h. der Redeem-Step nutzt die echte Bestell-Email, was korrekt ist
- Theoretisch könnte ein Angreifer im Frontend eine andere Email für Preview eintippen, um den `ALREADY_USED`-Check zu umgehen — aber der finale Redeem läuft mit der Bestell-Email, also wird der Bypass gefangen

**Ergebnis:** Kein Bypass möglich. Aber: User-Confusion möglich, wenn Preview "OK" sagt und Redeem dann `ALREADY_USED` wirft. Sollte UX-mässig konsistent sein.

**Fix:** Im CheckoutForm `customerEmail: email || null` immer mitsenden (ist schon so). Server sollte bei Mismatch zwischen Preview-Email und Bestell-Email einen Hinweis loggen, aber das ist kosmetisch.

**Severity:** MEDIUM eher LOW. Nur UX, kein Security-Bypass.

#### MEDIUM-4: `paidCents` wird aus `session.amount_total` übernommen, NICHT gegen `order.totalCents` verifiziert

**Datei:** `app/api/stripe/webhook/route.ts:98`

```typescript
const paidCents = session.amount_total ?? order.totalCents;
```

- `amount_total` kommt von Stripe (vertrauenswürdig — signature-verified)
- ABER: Wenn `amount_total` aus irgendeinem Grund vom `order.totalCents` abweicht (z.B. Stripe-Bug, falsche Steuerberechnung, Rabatt auf Stripe-Seite), wird der Mismatch nicht erkannt
- Aktuell betrifft das nur die `paidCents`-Spalte, nicht den Order-Status

**Risiko:** Niedrig, weil `line_items` und `shipping_options` server-seitig konfiguriert sind. Aber: Defense-in-Depth verlangt einen Sanity-Check.

**Fix:**
```typescript
if (Math.abs((session.amount_total ?? 0) - order.totalCents) > 100) {
  await logAudit({ action: "order.amount_mismatch", ... });
  // optional: throw + manual review queue
}
```

### LOW — 5 Findings

#### LOW-1: Webhook-Error wird mit `error.message.slice(0,80)` an Client zurückgegeben

**Datei:** `app/actions/checkout.ts:115-120`

```typescript
const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
return { ok: false, errors: [{ field: "_root", code: message.slice(0, 80) }] };
```

- Error-Messages aus Prisma/Stripe können interne Details leaken (Tabellennamen, Constraints, IDs)
- 80 chars sind viel — z.B. "Unique constraint failed on (publicToken)" leakt das Feld

**Fix:** Whitelist sicherer Error-Codes (z.B. `CART_EMPTY`, `SHIPPING_RATE_INVALID`, `INVALID_EMAIL`), alles andere → `"INTERNAL_ERROR"`. Volle Error nur ins Server-Log.

#### LOW-2: `x-forwarded-for` wird nicht gegen Spoofing geschützt

**Datei:** `app/actions/checkout.ts:84`

```typescript
const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
```

- `x-forwarded-for` kommt vom Client und ist nur dann vertrauenswürdig, wenn es vom Reverse Proxy (Vercel/Cloudflare/Coolify-Traefik) gesetzt wird
- Wenn der Server direkt am Internet hängt: Spoofing möglich
- Auf Vercel/Coolify hinter Traefik: i.d.R. ok, weil der Proxy den Header überschreibt

**Fix:** Bei Vercel: `request.ip` aus NextRequest nutzen (in Server Actions nicht direkt verfügbar). Alternativ: dokumentieren, dass das Deployment-Setup einen vertrauenswürdigen Proxy voraussetzt, und einen ENV-Check (`TRUST_PROXY=true`) als Sanity vor Live einbauen.

#### LOW-3: `vatIdSnapshot` wird NICHT validiert (kein VIES-Lookup)

**Datei:** `app/actions/checkout.ts:36`

```typescript
vatId: z.string().max(40).optional().nullable(),
```

- Reine String-Validierung, kein Format-Check (z.B. `DE` + 9 Digits)
- Kein VIES-Lookup → Reverse-Charge wird auf jede beliebige VatId angewendet
- Risiko: Kunde tippt fake VatId, kriegt 0% MwSt, später Umsatzsteuer-Nachforderung

**Fix:**
- Format-Check via Regex pro Land
- VIES-API-Lookup vor Reverse-Charge (cached, async, mit Fallback "Pending review")
- Notwendig vor B2B-Live

**Severity:** LOW weil B2B-Flow wohl noch nicht aktiv ist; bei aktivierter B2B-Linie HIGH.

#### LOW-4: CookieBanner — Marketing-Toggle ohne Wirkung

**Datei:** `components/layout/CookieBanner.tsx:112-117`

- Marketing-Toggle wird angeboten, hat aber laut Text "Aktuell nutzen wir nichts in dieser Kategorie"
- User könnte verwirrt sein, dass Toggle existiert aber nichts macht
- Wenn später Marketing-Scripts geladen werden, muss der Loader auf `analytics`/`marketing` aus Custom-Event hören (Hook ist vorhanden)

**Fix:** Optional Marketing-Toggle nur einblenden, wenn tatsächlich Marketing-Scripts deployed sind. Aktuell nur kosmetisch.

#### LOW-5: CookieBanner — kein ConsentLog-Persist bei Cookie-Entscheidung

**Datei:** `components/layout/CookieBanner.tsx`

- Cookie-Entscheidung landet nur in localStorage
- DSGVO erlaubt das, weil Cookie-Consent gerätegebunden ist
- ABER: Bei späterer Bestellung ist die Cookie-Entscheidung des Users nicht im ConsentLog (server-side) dokumentiert
- Best Practice: Bei "Alle akzeptieren" auch ein Server-Event feuern, das ein `ConsentLog` ohne customerId/orderId mit Cookie-Version erzeugt

**Fix:** Optional — DSGVO-rechtlich nicht zwingend für Cookies (localStorage reicht), aber für Audit-Trail gut.

### INFO — 6 Findings

#### INFO-1: Idempotency-Key für Stripe-Session basiert auf email+items
**Datei:** `lib/services/order-create.ts:64-70`

- Idempotency-Key: `order_${order.id}_${hash(email|items)}`
- Korrekt, weil order.id schon eindeutig ist — der Hash ist redundant aber harmlos
- INFO: Stripe-Idempotency-Keys sind 24h gültig. Wenn ein User exakt 24h später nochmal mit gleichen Items bestellt, könnte (theoretisch) eine alte Session zurückkommen. Aber `order.id` unterscheidet sich, also kein Problem.

#### INFO-2: `withdrawalShownAt = new Date()` statt Form-Submit-Zeit
**Datei:** `lib/services/order-create.ts:199`

- Wird auf Server-Side gesetzt, ist also faktisch "Server-Empfangszeit", nicht "Display-Zeit"
- Für DSGVO/§ 312 BGB egal, weil der Server-Zeitstempel der maßgebliche ist
- Korrekt so.

#### INFO-3: `taxCents` pro OrderItem rundet anders als `taxCents` auf Order-Ebene
**Datei:** `lib/services/order-create.ts:217-218` vs. Zeile 131

- Item-Level: `Math.round((subtotal * rate) / (100 + rate))`
- Order-Level: `taxFromGross(effectiveSubtotal, rate)`
- Sum of items kann sich um 1-2 Cent vom Order-Level-Tax unterscheiden (Round-Half)
- Stripe rechnet weder noch — line_items sind unit_amount, kein tax breakdown
- Buchhalterisch: Beträge auf Rechnung müssen aufgehen. Falls Diskrepanz: Fix in Rechnung-Generator (Phase 3).

#### INFO-4: Confirmation-Page checkt `params.canceled` ohne Type-Schutz
**Datei:** `app/bestellung-bestaetigt/page.tsx:24`

```typescript
if (params.canceled) { return <CanceledView />; }
```

- Falls jemand `?canceled=irgendwas` ranhängt, wird `CanceledView` gezeigt — harmlos, kein Security-Issue
- INFO: könnte als `params.canceled === "1"` strikter sein.

#### INFO-5: `runtime = "nodejs"` korrekt gesetzt
**Datei:** `app/api/stripe/webhook/route.ts:10`

- Edge-Runtime hätte kein `req.text()` mit konsistentem Raw-Body
- nodejs-Runtime ist Pflicht für Stripe-Signature-Verify
- Korrekt.

#### INFO-6: Deprecated `/api/stripe/checkout` Route gibt 410 zurück
**Datei:** `app/api/stripe/checkout/route.ts`

- Korrekt — verhindert dass alte Clients still weiterleben
- INFO: Könnte zusätzlich noch ein `console.warn` mit Source-IP für Monitoring sein, um zu erkennen wann der letzte Alt-Client weg ist.

---

## 3. OWASP Top 10 Mapping

| OWASP 2021 | Status | Bemerkung |
|---|---|---|
| **A01 Broken Access Control** | PASS | Token-basierter Zugriff auf Confirmation-Page, kein Direct-Object-Reference auf `order.id`. |
| **A02 Cryptographic Failures** | PASS | `randomBytes(32).toString("base64url")` für Tokens (256 Bit). `timingSafeEqual` für Token-Vergleich. SHA-256 für Idempotency-Hash. Keine MD5/SHA1, keine Math.random für Security. |
| **A03 Injection** | PASS | Komplett Prisma-basiert mit Parameter-Binding, keine String-Konkatenation. Zod-Validation auf allen Inputs. |
| **A04 Insecure Design** | PASS mit MEDIUM-1 | Server-Side-Truth durchgehalten, atomarer Discount-Redeem, Webhook-Dedup. Rate-Limit auf Confirmation-Page fehlt noch (Stage 4). |
| **A05 Security Misconfiguration** | PASS | `runtime=nodejs` + `dynamic=force-dynamic` korrekt. Webhook-Secret als Pflicht-Check. `robots: noindex/nofollow` auf Confirmation. |
| **A06 Vulnerable Components** | n/a für diesen Scope | `stripe`-SDK aktuell, `zod` aktuell. Dependency-Audit gehört zur globalen CI. |
| **A07 Identification & Auth Failures** | n/a für diesen Scope | Auth kommt Stage 3. |
| **A08 Software & Data Integrity** | PASS | Webhook-Signature mit `constructEvent` (raw body), Idempotency-Key, Dedup via Unique-Constraint. |
| **A09 Logging Failures** | PASS mit HIGH-1 | `logAudit` und `logConsent` vorhanden, aber außerhalb der Order-Transaktion (HIGH-1). |
| **A10 SSRF** | n/a | Keine User-Controlled-URLs in diesem Scope. Stripe-Redirect ist hardcoded `APP_URL`. |

---

## 4. Vor Live-Schaltung zwingend

| # | Was | Severity | Aufwand |
|---|---|---|---|
| 1 | **ConsentLog in Order-Transaktion verschieben** | HIGH-1 | 15min — `tx.consentLog.create` 3× im `prisma.$transaction`-Block |
| 2 | **Webhook-Lookup-Fallback auf `client_reference_id`** | HIGH-2 | 10min — `findUnique({ where: { stripeSessionId } }) ?? findUnique({ where: { id: session.client_reference_id } })` |
| 3 | **Stripe `amount_total` vs `order.totalCents` Sanity-Check** | MEDIUM-4 | 5min — `if (Math.abs(diff) > 100) await logAudit("amount_mismatch")` |
| 4 | **Rate-Limit auf `/bestellung-bestaetigt` und `/bestellung/status/[token]`** | MEDIUM-1 | 30min — Vercel Edge-Middleware oder Upstash Rate-Limit |
| 5 | **Error-Message-Whitelist in Checkout-Action** | LOW-1 | 10min — Map auf bekannte Codes, Rest → `INTERNAL_ERROR` |

**Optional vor B2B-Live:**

| 6 | **VIES-Lookup für `vatId`** | LOW-3 | 1-2h — externer API-Call, cached |

Geschätzter Gesamtaufwand für die 5 Pflicht-Punkte: **~1h aktive Arbeit**.

---

## 5. Pass/Fail pro Audit-Kriterium

| # | Kriterium | Status | Notiz |
|---|---|---|---|
| 1 | **Zod-Validation** | PASS | Alle 3 Cart-Actions + Checkout-Action mit Zod, Längen-Limits gesetzt (email≤254, code≤64, items max 25, quantity 1-50), Enums via `z.enum`, `z.literal(true)` für Checkboxen. |
| 2 | **Server-Side Truth** | PASS | `validateCart` lädt Preise/Steuer/Bilder neu aus DB. Stripe-Session nutzt `cart.items[].unitPriceCents` aus Server-Validation, nicht aus Client. Shipping wird in `quoteShipping` neu berechnet. Discount via `redeemDiscount`. |
| 3 | **IDOR** | PASS | `publicToken = randomBytes(32).toString("base64url")` = 256 Bit, `@unique` in Schema. Confirmation nutzt `findUnique({ where: { publicToken } })`. Länge 16-64 validiert. |
| 4 | **Stripe-Sicherheit** | PASS | `req.text()` für raw body, `constructEvent`, Secret-Check mit 400-Return. Idempotency-Key. Payload-Limit 1MB. `runtime=nodejs`. Order vorher PENDING, bei Stripe-Fehler CANCELLED. |
| 5 | **Webhook-Dedup** | PASS | `recordReceive` vor jedem Handler, `alreadyProcessed` → Skip mit 200. `markProcessed(recordId, orderId?)` beim Erfolg, `markError` im catch. Unique-Constraint + create-first Pattern. |
| 6 | **Race Conditions** | PASS mit MEDIUM-2 | Discount-Redeem atomar via `updateMany({ usedCount: { lt: usageLimit } })`. OrderCounter via `upsert + increment`. PAID-Setzen idempotent durch `if (paymentStatus === "PAID") return`. Discount-Release nicht 100% idempotent (siehe MEDIUM-2). |
| 7 | **DSGVO** | PASS mit HIGH-1 | ConsentLog mit IP+UA+Version vorhanden. IP/UA via `headers()` server-side. PII auf Order gesnapshottet. customerId nullable mit `onDelete: SetNull`. Cookie-Banner blockt automatisch (keine Analytics-Loader im Layout). **ABER:** ConsentLog außerhalb der Order-Transaktion (HIGH-1). |
| 8 | **Cookie-Banner** | PASS | localStorage-Key konsistent (`hagi-cookie-consent`). Version-Check (`parsed.version !== CONSENT_VERSION` → null → erneut fragen). Essential `disabled`-Toggle. Custom-Event `hagi:consent-changed` für Loader-Reaktion. |
| 9 | **Checkout-Form Frontend** | PASS | `isBusinessCustomer` → `companyName + vatId` required. `billingSameAsShipping=false` → billing required. Submit disabled bis Pflichtfelder + 3 Checkboxen. AGB/Privacy/Withdrawal als `z.literal(true)` — kein false-Bypass. |
| 10 | **Confirmation-Page** | PASS | Token-Length 16-64 vor DB-Query. `robots: { index: false, follow: false }`. PII (Email, Adresse) nur sichtbar nach Token-Match. PAID vs PENDING korrekt unterschieden. |
| 11 | **Webhook-Edge-Cases** | PASS mit HIGH-2 | Order-Match fehlend → `console.warn` + `received: true` (HIGH-2: kein Retry). Expired → release + CANCELLED. payment_failed → release + CANCELLED. `paymentMethodLast4` aus `paymentIntents.retrieve(expand: payment_method)`, nicht aus Webhook-Payload. `paidAt` durch `if (paymentStatus === "PAID") return` geschützt. |
| 12 | **Snapshot-Integrität** | PASS | OrderItem snapshottet productTitle, productSku, productImageUrl, productCategory, unitPriceCents, unitWeightGrams, taxRatePercent, taxCents, subtotalCents. `productId` ist nullable mit `onDelete: SetNull`. Order snapshottet alle Adressen, customerEmail, vatId. |

---

## Schlusswort

Der Code ist bemerkenswert solide für eine Stage-2-Implementierung. Die meisten Best Practices (Server-Side-Truth, atomare Redeems, Webhook-Dedup, Token-Sicherheit, Snapshot-Integrität) wurden korrekt umgesetzt. Die zwei HIGH-Findings sind beide Atomicity-Themen, die mit ~30 Minuten Arbeit gefixt sind. Nichts davon ist ein Show-Stopper.

**Empfehlung:** HIGH-1 und HIGH-2 fixen, dann ist Stage 2 live-ready. MEDIUM-Punkte können in Stage 3-4 mitlaufen.
