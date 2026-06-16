# Security-Audit Stufe 1 — Hagi Shop

**Audit-Datum:** 2026-06-13
**Auditor:** Security-Auditor Agent (V3)
**Scope:** Datenmodell + Services (vor Checkout-Flow)
**Files im Scope:** 12 (Schema + 9 Services + Seed + Smoke-Test)

---

## 1. Executive Summary

**Verdikt: BEDINGT SICHER — Foundation ist solide, mit 3 HIGH-Findings die VOR Stufe 2 behoben werden müssen, und 4 MEDIUM-Findings die spätestens beim Checkout-Routing-Layer adressiert werden.**

Die Stufe-1-Foundation ist überdurchschnittlich gut. Crypto-Token-Service ist textbook-richtig (`crypto.randomBytes` + `timingSafeEqual` + SHA-256-Hash), Cart-Validation ist explizit Anti-Tampering-fokussiert, Webhook-Dedup nutzt `@unique` constraint, Money-Handling konsequent in Integer-Cents, IDOR-Schutz via `publicToken` ist im Schema verankert.

Die kritischen Lücken liegen NICHT in der Crypto-Hygiene, sondern in:

1. **Race-Condition beim Discount-Limit** (HIGH) — `usedCount` kann von zwei parallelen Checkouts gleichzeitig überlaufen
2. **`oncePerCustomer` umgehbar via Email-Case-Mismatch / fehlende DB-Unique** (HIGH) — Discount via Email-Casing-Trick mehrfach einlösbar wenn keine zusätzliche Customer-Verknüpfung
3. **Fehlende Validierung des `customerEmail`-Inputs in `previewDiscount`** (HIGH) — kein lowercase/trim auf Input, nur auf Vergleich → Discount-Snapshot-Drift möglich
4. **`emailVerifyToken` als Klartext im Schema** (MEDIUM) — Inkonsistent mit `passwordResetTokenHash`
5. **Tax-Mode aus Env beim Modul-Load eingefroren** (MEDIUM) — Hot-Reload-Tax-Switch nicht möglich, Test-Bypass-Risiko
6. **`processedAt`-Race in Webhook-Dedup** (MEDIUM) — Zwischen `findUnique` und `create` Lücke wenn nicht in Tx
7. **Customer-Login-Lockout existiert im Schema aber keine Service-Logik** (INFO/Stufe-2)

Für eine Foundation-Stufe ist das ein **8/10**. Brutal ehrlich: Wenn Stripe-Webhook-Handler in Stufe 2 ohne Tx-Wrap geschrieben wird, kippt das Audit auf 4/10. Die Foundation ist sicher, der Checkout-Flow wird das Schiff lenken oder versenken.

---

## 2. Findings (sortiert nach Severity)

### CRITICAL

_Keine CRITICAL-Findings in Stufe 1._

---

### HIGH

#### H-1: Race-Condition beim Discount-Limit (`usedCount` vs. `usageLimit`)

- **File:** `lib/services/discount.ts:37-39`
- **Beschreibung:** Der Check `d.usedCount >= d.usageLimit` ist eine reine Read-Operation ohne Lock. Wenn zwei Checkouts parallel laufen mit Limit=1 und usedCount=0, sehen beide den Discount als gültig.
- **Risiko:** Discount kann mehrfach über das Limit hinaus eingelöst werden. Finanzieller Schaden = `(parallele_checkouts - 1) * maxDiscountCents` pro Race-Window.
- **Empfehlung:**
  1. Im finalen `commitOrder` (Stufe 2) MUSS das Inkrement in einer Transaktion mit `SELECT ... FOR UPDATE` oder via atomar bedingtem Update gemacht werden:
     ```ts
     const result = await prisma.discount.updateMany({
       where: { code, OR: [{ usageLimit: null }, { usedCount: { lt: prisma.discount.fields.usageLimit } }] },
       data: { usedCount: { increment: 1 } },
     });
     if (result.count === 0) throw new Error("DISCOUNT_LIMIT_RACED");
     ```
     (Alternativ: Raw-SQL `UPDATE ... WHERE used_count < usage_limit RETURNING ...`)
  2. Der Kommentar in `discount.ts:21-23` benennt das Problem korrekt, aber es muss in Stufe 2 wirklich umgesetzt werden — sonst ist das ein Loch.
- **Code-Pointer:** `lib/services/discount.ts:36-39`

#### H-2: `oncePerCustomer` über Email-Casing umgehbar — keine Customer-ID-Verknüpfung

- **File:** `lib/services/discount.ts:45-57`
- **Beschreibung:** Der Check vergleicht `customerEmail.toLowerCase()` gegen die DB. Allerdings:
  - Es gibt keinen Index/Unique auf `Order.customerEmail` als lowercased value (Schema speichert wie reingekommen).
  - Die `Customer.email` ist `@unique`, aber Orders ohne Customer-Account (Gast-Bestellung) haben keinen `customerId`. Ein Gast kann denselben Discount mit `IliasA@x.de`, `iliasa@x.de`, `ilias.a@x.de` (Gmail-Trick mit `+`) mehrfach einlösen.
  - Auf Schema-Ebene fehlt: `customerEmail` sollte beim INSERT zwingend lowercased werden (DB-Trigger oder Service-Layer-Guard).
- **Risiko:** Discount-Abuse durch Gast-Customer.
- **Empfehlung:**
  1. **Service-Layer:** Beim Schreiben einer Order IMMER `customerEmail = email.toLowerCase().trim()`. Dokumentieren als Invariante.
  2. **Schema:** Indizes auf `Order.customerEmail` existieren — gut. Aber: Postgres-Index ist case-sensitive. Lösung: `lower(customer_email)` Functional Index oder `citext`-Typ.
  3. **Gmail-Plus-Trick:** Optional Normalisierung (`ilias+test@gmail.com` → `ilias@gmail.com`). Pflicht ist das nicht, aber Best-Practice gegen Discount-Abuse.
- **Code-Pointer:** `lib/services/discount.ts:45-57`, `prisma/schema.prisma:278` (Order.customerEmail), `prisma/schema.prisma:373` (Index)

#### H-3: `previewDiscount` validiert `customerEmail` nicht beim Input

- **File:** `lib/services/discount.ts:25-30`
- **Beschreibung:** `input.customerEmail` wird ohne Length-Check, ohne Format-Check und ohne null-Guard weitergereicht. Wenn ein Angreifer 1MB-Email schickt, wird das in den Query gepasst.
- **Risiko:** DoS via riesigen Email-Strings im Discount-Check; potenziell Log-Pollution.
- **Empfehlung:** Vor jedem `findFirst` mit `customerEmail` validieren:
  ```ts
  const email = input.customerEmail?.trim().toLowerCase();
  if (!email || email.length > 254) return null; // RFC 5321
  ```
- **Code-Pointer:** `lib/services/discount.ts:45-46`

---

### MEDIUM

#### M-1: `emailVerifyToken` als Klartext gespeichert (inkonsistent mit Password-Reset)

- **File:** `prisma/schema.prisma:203`
- **Beschreibung:** `passwordResetTokenHash` ist (richtig!) als Hash gespeichert. `emailVerifyToken` aber als Klartext. Wenn DB-Dump in falsche Hände gerät, kann jeder Email-Verify ausführen.
- **Risiko:** DB-Leak ermöglicht Email-Übernahme.
- **Empfehlung:** Rename `emailVerifyToken` → `emailVerifyTokenHash`. Beim Senden den Klartext-Token in der Mail, den Hash in DB. Konsistent mit `tokens.ts`-Pattern.
- **Code-Pointer:** `prisma/schema.prisma:203`

#### M-2: `TAX_MODE` wird beim Modul-Load eingefroren

- **File:** `lib/services/tax.ts:11-12`
- **Beschreibung:** `export const TAX_MODE: TaxMode = (process.env.TAX_MODE as TaxMode) || "small_business";` — wird einmal beim Import evaluiert. In Next.js mit Hot-Reload kann das in Dev gefährlich sein, weil ein vergessener `.env`-Eintrag silent zu `small_business` defaultet.
- **Risiko:** Wenn Hagi auf Regelbesteuerung wechselt aber `TAX_MODE=standard` nicht gesetzt ist → Steuer wird falsch berechnet → Steuerhinterziehung-Risiko (rechtlich brutal).
- **Empfehlung:**
  1. Im Production-Boot: Fail-fast wenn `TAX_MODE` nicht explizit gesetzt:
     ```ts
     if (process.env.NODE_ENV === "production" && !process.env.TAX_MODE) {
       throw new Error("TAX_MODE must be explicitly set in production");
     }
     ```
  2. `applicableTaxRate` als getter-Funktion, die `process.env` zur Laufzeit liest — oder das DB-basierte ShopConfig-Pattern statt Env (mehr Audit-Trail).
- **Code-Pointer:** `lib/services/tax.ts:11-50`

#### M-3: Race-Lücke in `recordReceive` zwischen `findUnique` und `create`

- **File:** `lib/services/webhook-dedup.ts:29-50`
- **Beschreibung:** Zwischen `findUnique` (Zeile 29) und `create` (Zeile 41) kann ein paralleler Webhook-Call den gleichen `providerEventId` einfügen. Der zweite Call crashed dann mit Prisma-Unique-Constraint-Error (P2002).
- **Risiko:** Webhook-Handler crashed → Stripe retry → Logik kann inkonsistent werden, weil Error-Pfad nicht behandelt.
- **Empfehlung:** Pattern umstellen auf "create-or-get":
  ```ts
  try {
    const created = await prisma.paymentEvent.create({ data: {...} });
    return { alreadyProcessed: false, recordId: created.id };
  } catch (e) {
    if (isPrismaUniqueViolation(e)) {
      const existing = await prisma.paymentEvent.findUnique({ where: { providerEventId }, select: { id: true, processedAt: true } });
      return { alreadyProcessed: existing!.processedAt !== null, recordId: existing!.id };
    }
    throw e;
  }
  ```
  Vorteil: Erster Call gewinnt deterministisch.
- **Code-Pointer:** `lib/services/webhook-dedup.ts:29-50`

#### M-4: `payload: Json` ist `Prisma.InputJsonValue` — keine Größenbegrenzung

- **File:** `lib/services/webhook-dedup.ts:23-50`, `prisma/schema.prisma:564`
- **Beschreibung:** Stripe-Webhook-Payloads sind normalerweise <50KB, aber maliciously kann jemand der Stripe-Signing-Secret kennt riesige Payloads schicken. Postgres `jsonb` hat 1GB-Limit pro Wert. Ohne Größencheck → Disk-Fill-DoS denkbar.
- **Risiko:** Niedrig solange Stripe-Signature-Verify in Stufe 2 davor läuft. Eskaliert wenn jemals ein Webhook-Endpoint ohne Signature-Check existiert.
- **Empfehlung:** In Stufe 2 vor `recordReceive`: `if (rawBody.length > 100_000) throw new Error("PAYLOAD_TOO_LARGE")`.
- **Code-Pointer:** `lib/services/webhook-dedup.ts:23`

---

### LOW

#### L-1: `unitPriceCents` in Cart nutzt `p.price` ohne explizite Integer-Cast-Schutz

- **File:** `lib/services/cart.ts:99-100`
- **Beschreibung:** `p.price` ist im Schema `Int` (korrekt). Aber `itemSubtotal = unitPriceCents * effectiveQty` kann theoretisch `Number.MAX_SAFE_INTEGER` überschreiten wenn jemand `quantity = 5` und `price = 2_000_000_000` (20 Millionen Euro). Praktisch nicht in Hagis Sortiment, aber Defense-in-Depth.
- **Risiko:** Hypothetisch, da MAX_QUANTITY = 5.
- **Empfehlung:** Ein Sanity-Check `if (itemSubtotal > 100_000_000) throw "OVERFLOW"` (1 Mio EUR pro Item) kostet nichts.
- **Code-Pointer:** `lib/services/cart.ts:100`

#### L-2: `shouldApplyReverseCharge` validiert die VAT-ID nicht via VIES

- **File:** `lib/services/tax.ts:58-72`
- **Beschreibung:** Die Funktion prüft NUR ob VAT-ID **vorhanden** ist, nicht ob sie **valide** ist. Bei B2B-EU mit Reverse-Charge MUSS Hagi die VAT-ID via VIES (Europäisches EU-VAT-System) verifizieren — sonst haftet Hagi für die nicht erhobene Steuer.
- **Risiko:** Steuer-Risiko, nicht Security-Risiko. Aber relevant für Audit.
- **Empfehlung:** TODO im Code, dass vor Production-Release eine VIES-Integration nötig ist.
- **Code-Pointer:** `lib/services/tax.ts:58-72`

#### L-3: `audit.ts` swallowed Errors via `try/catch`

- **File:** `lib/services/audit.ts:24-40`
- **Beschreibung:** `console.error("[audit] write failed", err)` — wenn Audit-Schreiben failed, geht die Operation trotzdem durch. Das ist eine bewusste Design-Entscheidung (Audit-Failure soll Business nicht blockieren), aber Audit-Loss ist DSGVO-relevant.
- **Risiko:** Audit-Gap bei DB-Failure → DSGVO-Beweisbarkeit beeinträchtigt.
- **Empfehlung:** Audit-Failures in einen separaten Fallback-Channel (z.B. file-log oder Sentry-Breadcrumb), nicht nur `console.error`.
- **Code-Pointer:** `lib/services/audit.ts:38-40`

#### L-4: Schema-Felder ohne explizite VARCHAR-Länge (Postgres-Default = TEXT)

- **File:** `prisma/schema.prisma` (mehrfach)
- **Beschreibung:** `customerEmail`, `firstName`, `street1`, `city` etc. sind alle `String` ohne `@db.VarChar(N)`. Postgres mapped das auf `TEXT` → kein Length-Constraint auf DB-Ebene.
- **Risiko:** Service-Layer-Bypass: Wenn jemals ein API-Endpoint ohne Service-Layer-Validierung direkt schreibt, kann beliebig große Strings landen → DB-Bloat.
- **Empfehlung:** Für Felder mit klarem Limit (Email 254, Postal-Code 20, Country-Code 2) explizite `@db.VarChar(N)`. Defense-in-Depth.
- **Code-Pointer:** Schema diverse, z.B. `prisma/schema.prisma:278, 281-290`

#### L-5: `browserIp` / `userAgent` / `referrer` auf Order ohne Aufbewahrungsfrist-Strategie

- **File:** `prisma/schema.prisma:341-343`
- **Beschreibung:** DSGVO-Art. 5 Abs. 1 lit. e: Speicherbegrenzung. IP-Adressen sollten nach max. 7 Tagen anonymisiert werden (BfDI-Empfehlung), Order kann aber 10 Jahre wegen Buchhaltung erhalten bleiben.
- **Risiko:** DSGVO-Verstoß bei zu langer IP-Aufbewahrung.
- **Empfehlung:** Cron-Job (Stufe 3+) der nach X Tagen `browserIp = NULL`, `userAgent = NULL`, `referrer = NULL` setzt, OHNE Order zu touchen. Im Schema-Kommentar dokumentieren als TODO.
- **Code-Pointer:** `prisma/schema.prisma:341-343`, `prisma/schema.prisma:589-590` (AuditLog), `prisma/schema.prisma:608-609` (ConsentLog)

---

### INFO

#### I-1: `Customer.passwordHash` Algorithmus nicht spezifiziert

- **File:** `prisma/schema.prisma:204`
- **Beschreibung:** Schema ist agnostisch. Stufe 2 muss bcrypt oder argon2 nutzen — NIEMALS SHA-256 oder unsalted.
- **Empfehlung:** Aktiver Reminder: argon2id mit memory=64MB, iterations=3, parallelism=4 für Webapp-Default. Bcrypt mit cost=12 als Alternative.

#### I-2: `Order.publicToken` Länge nicht durch Schema garantiert

- **File:** `prisma/schema.prisma:275`
- **Beschreibung:** Schema sagt nur `String @unique`. Token-Service erzeugt 43+ Chars. Wenn jemand jemals direkt ein 4-Char-Token einfügt, ist Order-Tracking gebrochen.
- **Empfehlung:** `@db.VarChar(64)` und Check-Constraint via Migration `CHECK (length(public_token) >= 32)`.

#### I-3: Login-Lockout-Felder existieren aber keine Service-Logik vorhanden

- **File:** `prisma/schema.prisma:217-218`
- **Beschreibung:** `failedLoginAttempts` + `lockedUntil` sind im Schema. Foundation ist also korrekt vorbereitet. Service muss in Stufe 2 kommen.

#### I-4: `OrderCounter.id @default(1)` ist Single-Row-Anti-Pattern, aber funktioniert hier

- **File:** `prisma/schema.prisma:623`
- **Beschreibung:** `id Int @id @default(1)` — ungewöhnlich, da `year` als Unique-Key dient. Es funktioniert (year-basierter Upsert), aber das `id` Feld ist redundant. Cleanup: `@@id([year])` als Composite-Key, drop `id`-Spalte.

---

## 3. OWASP Top 10 Mapping

| OWASP-Kategorie | Findings | Status |
|---|---|---|
| **A01 Broken Access Control** | IDOR-Schutz via `publicToken` (sichere Wahl), aber Service-Routes existieren noch nicht. Discount `oncePerCustomer`-Bypass via Email-Casing (H-2) ist Access-Control-Schwäche. | Schema-Foundation OK, Service-Schutz in Stufe 2 wichtig |
| **A02 Cryptographic Failures** | `tokens.ts` ist exemplary. M-1 (emailVerifyToken Klartext) ist die einzige Crypto-Lücke. | 1 Finding (MEDIUM) |
| **A03 Injection** | Prisma überall, keine `$queryRaw`, Discount-Code wird `.toUpperCase()` + length-checked. SQL-Inj geprüft im Smoke-Test (Zeile 131-137). H-3 (Email-Validation) ist Input-Validation. | 1 Finding (HIGH) |
| **A04 Insecure Design** | Atomare Order-Numbering ist solide. Discount-Race (H-1) ist Design-Lücke. Webhook-Race (M-3) ist Design-Pattern-Wahl. | 2 Findings (HIGH+MEDIUM) |
| **A05 Security Misconfiguration** | M-2 (TAX_MODE) ist Misconfig-Risiko. L-4 (VARCHAR-Längen) ist defense-in-depth-Lücke. | 2 Findings (MEDIUM+LOW) |
| **A06 Vulnerable Components** | Außerhalb Scope (kein `package.json` audit). | — |
| **A07 Authentication Failures** | Lockout-Felder vorhanden (gut). Passwort-Hash-Algorithmus nicht festgelegt (I-1). Email-Verify-Token unhashed (M-1). | 1 MEDIUM + 1 INFO |
| **A08 Software/Data Integrity** | Webhook-Dedup vorhanden. M-3 ist Integrity-Risiko bei Race. Audit-Trail vorhanden (gut). | 1 MEDIUM |
| **A09 Security Logging Failures** | Audit-Service vorhanden. L-3 (swallowed errors) ist Lücke. ConsentLog ist exemplary. | 1 LOW |
| **A10 SSRF** | Kein external-URL-Fetching in Stufe 1 — nicht anwendbar. | — |

---

## 4. Was in Stufe 2 (Checkout) ZWINGEND ergänzt werden muss

Diese Liste ist nicht optional — ohne diese Punkte ist der Checkout-Flow nicht produktionsreif:

### 4.1 Atomare Discount-Einlösung
- `commitOrder` MUSS `discount.usedCount` via `updateMany` mit bedingtem `where` inkrementieren (siehe H-1)
- Bei `result.count === 0` Order-Commit abbrechen und Customer informieren

### 4.2 Email-Normalisierung als Invariante
- ALLE `customerEmail`-Inserts müssen `.toLowerCase().trim()` durchlaufen
- Vorschlag: Helper-Wrapper `normalizeEmail()` und überall verwenden
- Functional Index `CREATE INDEX ON "Order" (lower(customer_email))` oder `citext`

### 4.3 Stripe-Webhook-Signature-Verify
- Vor `recordReceive`: `stripe.webhooks.constructEvent(rawBody, signature, secret)`
- Raw-Body-Limit: `bodyParser.json({ limit: '100kb' })` für Webhook-Route
- Konstante-Zeit-Vergleich des Signing-Secrets via Stripe-SDK (intern bereits constant-time)

### 4.4 Stripe-Webhook-Dedup Pattern auf "create-first"
- Siehe M-3-Empfehlung

### 4.5 Rate-Limiting auf Checkout-Endpoints
- `POST /api/checkout/preview` und `POST /api/checkout/commit`
- Vorschlag: 30 req/min per IP für Preview, 5 req/min für Commit
- Library: `@upstash/ratelimit` oder Next.js Middleware mit Redis

### 4.6 Order-Lookup MUSS publicToken nutzen, NIE die `id`
- `GET /api/order/[token]` — `where: { publicToken: token }`
- NIE `GET /api/order/[id]` — würde IDOR ermöglichen
- `orderNumber` darf NIE als Access-Key dienen (sequentiell, raterich)

### 4.7 Password-Hash mit argon2id (NICHT bcrypt-only)
- `argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 })`
- Fallback bcrypt akzeptabel mit cost ≥ 12

### 4.8 Email-Verify-Token als Hash speichern (M-1 fix)
- Schema-Migration: `emailVerifyToken` → `emailVerifyTokenHash`
- Plus: `emailVerifyExpiresAt DateTime?` Feld (aktuell fehlt das im Schema!)

### 4.9 Pflichtfelder validieren — Zod oder Valibot Schemas
- Address-Validation (PLZ-Format pro Country, Phone-Format)
- Email-Format (RFC-konform, max 254 chars)
- VAT-ID-Format (länderspezifisch)

### 4.10 Tax-Mode-Production-Guard
- Fail-fast wenn `TAX_MODE` nicht explizit gesetzt in Production (siehe M-2)

### 4.11 VIES-VAT-ID-Verifikation
- Wenn `shouldApplyReverseCharge === true`, MUSS VAT-ID gegen VIES validiert werden VOR Order-Commit
- Validation-Result + Timestamp in `vatIdSnapshot` archivieren

### 4.12 PII-Retention-Cron
- Job der nach 7 Tagen `Order.browserIp`, `Order.userAgent`, `AuditLog.ipAddress`, `ConsentLog.ipAddress` auf NULL setzt
- Order selbst bleibt 10 Jahre (Buchhaltung), aber PII-Felder werden anonymisiert

### 4.13 Strikte Cart→Order-Konsistenz bei Unique-Items
- Aktuell: Cart limitiert Unikat auf 1 Stück. Aber: 2 parallele Checkouts können beide das gleiche Unikat in Cart haben
- Lösung im `commitOrder`: `prisma.product.updateMany({ where: { id, isUnique: true, inStock: true }, data: { inStock: false } })` und prüfen ob `count === 1`. Wenn 0 → "ALREADY_SOLD"

### 4.14 CSRF-Schutz auf State-Changing Endpoints
- Next.js Server Actions haben CSRF eingebaut. Wenn klassische API-Routes genutzt → SameSite=Strict Cookie + Origin-Header-Check

### 4.15 Stripe-Idempotency-Keys
- Bei `stripe.checkout.sessions.create` → `idempotencyKey: order.id` setzen
- Schutz gegen Doppel-Charge wenn Network-Retry

---

## 5. Pass/Fail Checkliste (Punkt 1-13)

### 1. Token-Generation & Crypto

| Check | Status | Beleg |
|---|---|---|
| `crypto.randomBytes` statt `Math.random` | ✅ PASS | `tokens.ts:1, 9` |
| Token-Länge ≥ 32 bytes / ≥ 43 chars base64url | ✅ PASS | `tokens.ts:8` (Default 32) |
| URL-safe Encoding | ✅ PASS | `base64url` |
| Klartext-Token NIE in DB | ⚠️ PARTIAL | `passwordResetTokenHash` ✅, aber `emailVerifyToken` ❌ Klartext (M-1) |
| Constant-time comparison | ✅ PASS | `timingSafeEqual` in `tokens.ts:28` |
| SHA-256 angemessen für Use-Case | ✅ PASS | Token-Hash (nicht Passwort!) — SHA-256 hier korrekt |
| Email-Verify + Password-Reset haben Hash-Felder | ⚠️ PARTIAL | Reset ✅, Verify ❌ (M-1) |

**Gesamt: PASS mit M-1 als Caveat**

### 2. IDOR

| Check | Status | Beleg |
|---|---|---|
| Order-Tracking via `publicToken` (random) | ✅ PASS | Schema `Order.publicToken @unique` |
| Schema verhindert ID-only-Lookups (Service-Design) | ✅ PASS | Schema-Foundation passt; Service-Routes in Stufe 2 |
| `orderNumber` nur als Display | ✅ PASS | Sequentiell, aber `publicToken` ist Access-Key |
| Discount-Lookup nicht User-Input-bypassable | ✅ PASS | `findUnique` mit ge-uppercased + length-checked Code |

**Gesamt: PASS**

### 3. SQL/NoSQL-Injection

| Check | Status | Beleg |
|---|---|---|
| Alle Queries via Prisma-Client | ✅ PASS | Kein `$queryRaw` im Scope |
| Kein unsicheres `$queryRaw` | ✅ PASS | grep negativ |
| Discount-Code length-limited | ✅ PASS | `discount.ts:27` (`> 64` → null) |
| Customer-Email lowercased/trimmed VOR findFirst | ⚠️ PARTIAL | Im Discount-Service ja (`discount.ts:48`), aber Input wird nicht validiert (H-3) |

**Gesamt: PASS mit H-3 als Caveat**

### 4. Mass-Assignment

| Check | Status | Beleg |
|---|---|---|
| Cart extrahiert nur `productId + quantity` | ✅ PASS | `cart.ts:62-72` explizit destructured |
| `unitPriceCents` aus DB, nicht Input | ✅ PASS | `cart.ts:99` `p.price` |
| `taxRatePercent` aus Service, nicht Input | ✅ PASS | `cart.ts:101-102` |
| `productTitle/Image/Sku` aus DB-Snapshot | ✅ PASS | `cart.ts:104-110` |
| Smoke-Test deckt das ab | ✅ PASS | `test-stage-1.ts:94-97` |

**Gesamt: PASS** — exemplary

### 5. Race-Conditions

| Check | Status | Beleg |
|---|---|---|
| `nextOrderNumber()` race-safe | ✅ PASS | Atomic `upsert` mit `{ increment: 1 }` (`order-numbering.ts:11-16`) |
| Discount-Inkrement-Logik race-safe | ❌ FAIL | Aktueller `previewDiscount` ist read-only — Inkrement-Pattern in Stufe 2 MUSS atomar werden (H-1) |
| PaymentEvent `providerEventId` UNIQUE | ✅ PASS | Schema Z.562 |
| Discount kann zwischen Preview/Commit doppelt eingelöst werden? | ⚠️ JA | Bis H-1 behoben — bekanntes Issue, in Stufe 2 zwingend zu fixen |

**Gesamt: FAIL für Discount-Race** (aber: nur in Schema/Service-Foundation; finaler Fix in Stufe 2)

### 6. DSGVO

| Check | Status | Beleg |
|---|---|---|
| Customer hat `deletedAt` + `anonymizedAt` | ✅ PASS | Schema Z.231-232 |
| `Order.customerId` NULLABLE | ✅ PASS | Schema Z.277 `String?` + `onDelete: SetNull` Z.365 |
| Order snapshots Email + Adresse | ✅ PASS | Schema Z.278, 281-301 — alle Address-Felder direkt auf Order |
| Consent-Versionen versioniert | ✅ PASS | `consent.ts:9-16` + Schema `ConsentLog.consentVersion` |
| AGB/Privacy-Version auf Order | ✅ PASS | Schema Z.345-350 (`termsVersion`, `privacyVersion`, `withdrawalVersion`) |
| IP + UA gespeichert, aber temporär | ⚠️ TODO | Felder existieren, aber kein Retention-Cron (L-5) |

**Gesamt: PASS mit Retention-TODO**

### 7. Webhook-Dedup

| Check | Status | Beleg |
|---|---|---|
| `providerEventId` UNIQUE | ✅ PASS | Schema Z.562 |
| Doppelter Event → `alreadyProcessed: true` | ✅ PASS | `webhook-dedup.ts:34-39` |
| Signature ge-`String`-cast | ✅ PASS | Schema `signature: String?` |
| JSON-Payload sicher | ✅ PASS | Prisma `Json` ist `JSONB`, kein eval (M-4 ist Größe, nicht Inj) |

**Gesamt: PASS mit M-3 als Race-Caveat**

### 8. Cascade-Behavior

| Check | Status | Beleg |
|---|---|---|
| Order → OrderItem CASCADE | ✅ PASS | Schema Z.413 |
| OrderItem → Product SetNull | ✅ PASS | Schema Z.414 |
| Order → Customer SetNull | ✅ PASS | Schema Z.365 |
| ConsentLog → Customer SetNull | ✅ PASS | Schema Z.614 |
| PaymentEvent → Order SetNull | ✅ PASS | Schema Z.573 |

**Gesamt: PASS** — perfekt durchdacht

### 9. Index-Coverage

| Check | Status | Beleg |
|---|---|---|
| Indizes auf Status-Felder | ✅ PASS | `orderStatus`, `paymentStatus`, `fulfillmentStatus` Z.374-376 |
| Index auf `customerEmail` | ✅ PASS | Z.373 |
| Index auf Discount `code`, `validUntil` | ✅ PASS | Z.511-513 |
| Index auf `providerEventId` | ✅ PASS | Z.575 (composite mit provider) |
| Unique auf `orderNumber`, `publicToken`, `stripeSessionId`, `stripePaymentIntentId`, `code` | ✅ PASS | Schema durchgängig |

**Gesamt: PASS** — index coverage ist sehr gut

### 10. Money-Handling

| Check | Status | Beleg |
|---|---|---|
| Alle Geldbeträge als Integer-Cents | ✅ PASS | Schema alle `Int` (`subtotalCents`, etc.) |
| Tax-Berechnung mit `Math.round` | ✅ PASS | `tax.ts:34` |
| Keine Float-Mathematik | ✅ PASS | Cart, Discount, Shipping alle Integer (`Math.floor` in `discount.ts:63`) |
| Decimal für `taxRatePercent` | ✅ PASS | `Decimal @db.Decimal(5,2)` — perfekt |

**Gesamt: PASS**

### 11. Input-Validierung

| Check | Status | Beleg |
|---|---|---|
| MAX_QUANTITY_PER_ITEM = 5 | ✅ PASS | `cart.ts:46` |
| MAX_ITEMS_IN_CART = 20 | ✅ PASS | `cart.ts:47` |
| Email lowercased + trimmed | ⚠️ PARTIAL | In `discount.ts:48` ja, aber Input-Validation fehlt (H-3) |
| Discount-Code length-limited | ✅ PASS | `discount.ts:27` (max 64) |
| User-Agent auf 500 chars | ✅ PASS | `audit.ts:35`, `consent.ts:38` |
| Last-Error auf 1000 chars | ✅ PASS | `webhook-dedup.ts:71` |

**Gesamt: PASS mit H-3 Caveat**

### 12. Unique-Edge-Cases

| Check | Status | Beleg |
|---|---|---|
| 2 User parallel auf letztes Unikat | ❌ NOT IMPLEMENTED | Schema-Foundation OK (`Product.isUnique` + Cart-Limit). Lock-Logik in Stufe 2 nötig (siehe 4.13) |
| Email-Verify 2x klick | ⚠️ DESIGN-GAP | `emailVerifyToken` hat kein Expiry-Feld. Empfehlung: `emailVerifyExpiresAt` ergänzen, beim 2. Klick gracefully NoOp |
| Password-Reset-Expiry geprüft | ✅ PASS (Schema) | `passwordResetExpiresAt` existiert Z.206 — Service-Check in Stufe 2 nötig |

**Gesamt: PARTIAL** — Foundation reicht, Stufe 2 muss Locks bauen

### 13. Crypto-spezifisch (Passwort)

| Check | Status | Beleg |
|---|---|---|
| `passwordHash` mit bcrypt/argon2 (NICHT SHA-256) | ⚠️ N/A in Stufe 1 | Schema-Feld exists, Service-Logik in Stufe 2 (I-1) |
| Geplant für Stufe 2? | ✅ JA | siehe 4.7 |

**Gesamt: N/A** — Schema bereitet vor, Implementation pending

---

## 6. Sonderlob (was richtig gut gemacht ist)

- **`tokens.ts` ist textbook-richtig**: `randomBytes` + `base64url` + `timingSafeEqual` + try/catch um Length-Mismatch → kein Crash-Vektor
- **`cart.ts` versteht das Anti-Tampering-Modell**: extra Felder werden weggeworfen, Preis kommt zwingend aus DB
- **Schema-`Decimal(5,2)` für Tax-Rate** statt Float — beweist Money-Math-Verständnis
- **Order snapshot ALLER PII-Felder** (Billing-/Shipping-Adresse statt Foreign-Key) — perfekt für DSGVO-Customer-Delete bei gleichzeitiger Buchhaltungs-Pflicht
- **`AuditLog`, `ConsentLog`, `PaymentEvent`** als first-class-Citizens im Schema von Anfang an — viele Shops bauen das erst nach Audit-Fail
- **Smoke-Test deckt Anti-Tampering, SQL-Inj, Race-Frei, Mass-Assignment** explizit ab — das ist überdurchschnittlich

---

## 7. Empfehlung

**Status: GRÜN für Stufe 2 mit folgenden Bedingungen:**

1. **H-1, H-2, H-3 bevor irgendein Checkout-Endpoint geschrieben wird** beheben oder als TODO in Code-Kommentaren mit ticket-IDs markieren
2. **M-1 (emailVerifyTokenHash)** in nächstem Migration-Schritt
3. **Stufe-2-Checkliste (Punkt 4.1-4.15)** als Spec für Checkout-Flow durcharbeiten
4. **In Stufe 2 erneutes Audit nach Webhook-Handler + commitOrder** — das sind die echten Risiko-Hotspots

Die Foundation ist sicher genug, um darauf zu bauen. Die Risiken sind sichtbar, dokumentiert und behebbar. Nicht warten mit dem Bauen — aber die HIGH-Findings in der ersten Stufe-2-Iteration anpacken.
