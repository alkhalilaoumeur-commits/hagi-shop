# HAGI-AUDIT-CONTEXT

> Technische Bestandsaufnahme des Hagi-Shop für ein Sicherheits-Audit des neuen Admin-Bereichs.
> Erstellt am **2026-06-22** durch Code-Recherche im echten Repo (nicht aus Doku übernommen).
> Kritische Sicherheits-Claims wurden manuell im Quellcode gegengeprüft (markiert mit ✅ VERIFIZIERT).
> Stand: Working Tree (einige Änderungen uncommitted — siehe Abschnitt 9/10).

---

## 1. ZWECK & STACK

### Zweck
Hagi-Shop ist ein Premium-E-Commerce-Shop für handgeknüpfte Orientteppiche eines Stuttgarter Direktimporteurs. Die App bedient B2C-Endkunden (ca. 600–5.000 €/Order) und B2B-Kunden (Innenarchitekten/Hotels, Reverse-Charge-Support) mit Storefront, Stripe-Checkout, Kundenkonto, PDF-Rechnungen (§ 14 UStG), DSGVO-/Widerrufs-Workflows und einem argon2-gesicherten Admin-Backend. Bewusste Architektur-Entscheidung: Custom-Stack statt Shopify, USP "Knüpfer-Portrait pro Teppich" (`weaverName`, `weaverStory`, `workshop` im Datenmodell).

### Tech-Stack (belegt aus `package.json`)

| Bereich | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router) | `14.2.5` |
| Sprache | TypeScript | `^5` |
| React | React / react-dom | `^18` |
| DB | PostgreSQL (self-hosted) | — (kein npm-Paket; via `DATABASE_URL`) |
| ORM | Prisma (Client + CLI) | `^5.22.0` |
| Auth | argon2 (argon2id) + DB-Sessions | `^0.44.0` |
| Payment | Stripe Server-SDK / Stripe.js | `^17.5.0` / `^4.0.0` (API-Version gepinnt `2025-02-24.acacia` in `lib/stripe.ts:9`) |
| Email | Resend + React Email | `^4.1.2` / Components `^1.0.12`, Render `^2.0.8` |
| PDF | @react-pdf/renderer | `^4.5.1` |
| Validierung / State / Icons | Zod / Zustand / lucide-react | `^3.23.8` / `^4.5.4` / `^0.414.0` |
| Styling | Tailwind CSS | `^3.4.4` |
| Tests | Vitest (+ v8 Coverage) | `^4.1.9` |
| Hosting | Hetzner + Coolify (Docker) | aus `docs/adr/adr-001-tech-stack.md` |
| Cron | Coolify Cron (HTTP-getriggert) | siehe `app/api/cron/*` |
| Storage (Bilder) | Externe URLs (kein Server-Upload) | **NICHT VORHANDEN** als Integration |

---

## 2. KOMPLETTE ROUTEN- & ACTION-MAP

Legende: 🔒 = unter `/admin` oder `/api/admin` · 🔑 = token-/signaturbasierte Public-Route

### Tabelle A — API-Routen (`app/api/**/route.ts`)

| Pfad | Methode | Public/Auth | Rolle | Funktion | Externe Dienste |
|---|---|---|---|---|---|
| 🔒 `api/admin/export-orders/route.ts` | GET | **Auth** (`requireAdmin()`) ✅ korrekt | Admin | Bestellungen als CSV exportieren (PII!) + Audit | DB |
| 🔒 `api/admin/produkte/route.ts` | GET | **🔴 DEFEKT** (`checkAdminRequest` ohne await) | Admin | Produkte listen | DB |
| 🔒 `api/admin/produkte/route.ts` | POST | **🔴 DEFEKT** | Admin | Produkt anlegen | DB, error-log |
| 🔒 `api/admin/produkte/[id]/route.ts` | GET | **🔴 DEFEKT** | Admin | Einzelprodukt | DB |
| 🔒 `api/admin/produkte/[id]/route.ts` | PATCH | **🔴 DEFEKT** | Admin | **Produkt/Preis ändern** | DB, error-log |
| 🔒 `api/admin/produkte/[id]/route.ts` | DELETE | **🔴 DEFEKT** | Admin | **Produkt löschen (Hard-Delete)** | DB, error-log |
| 🔒 `api/admin/kategorien/route.ts` | GET | **🔴 GAR KEIN Check** | — | Kategorien listen | DB |
| 🔒 `api/admin/kategorien/route.ts` | POST | **🔴 DEFEKT** | Admin | Kategorie upsert | DB |
| 🔒 `api/admin/login/route.ts` | POST | Public | — | **DEPRECATED** → 410 | — |
| `api/stripe/webhook/route.ts` | POST | 🔑 Stripe-Signatur + `STRIPE_WEBHOOK_SECRET` | Stripe | Zahlungs-Events → Order PAID; Dedup | Stripe, DB, Resend, Audit |
| `api/stripe/checkout/route.ts` | POST | Public | — | **DEPRECATED** → 410 | — |
| `api/invoice/[token]/route.ts` | GET | 🔑 `publicToken` | Kunde (Token) | Rechnungs-/Lieferschein-PDF (nur PAID/REFUNDED); RL 30/min | DB, PDF |
| `api/widerruf/[token]/route.ts` | POST | 🔑 `publicToken` | Kunde (Token) | Widerruf (BGB §355); RL 3/h | DB, Resend, Audit |
| `api/cron/cleanup/route.ts` | GET | 🔑 `Bearer CRON_SECRET` | System | Rate-Limit-/Error-Log-Cleanup | DB |
| `api/cron/refund-reminder/route.ts` | GET | 🔑 `Bearer CRON_SECRET` | System | Refund-Reminder-Mails | DB, Resend, Audit |
| `api/health/route.ts` | GET | Public | — | Healthcheck | — |

### Tabelle B — Server-Actions (`app/actions/*.ts`, `"use server"`)

| Datei::Funktion | Public/Auth | Rolle | Funktion | Externe Dienste |
|---|---|---|---|---|
| 🔒 `admin-auth.ts::loginAdminAction` | Public (Login-Einstieg) | →Admin | Admin-Login (argon2id, DB-Session, RL) | DB, Audit |
| 🔒 `admin-auth.ts::logoutAdminAction` | Auth | Admin | Logout + Redirect | DB |
| 🔒 `admin-manual-order.ts::createManualOrderAction` | **Auth** (`requireAdmin()`) ✅ | Admin | Showroom-Order (sofort PAID/FULFILLED) | DB, Audit |
| 🔒 `admin-manual-order.ts::createManualOrderAndRedirect` | **Auth** ✅ | Admin | wie oben + Redirect | DB, Audit |
| 🔒 `admin-orders.ts::adminMarkShipped` | **Auth** ✅ | Admin | Versenden | DB, Audit |
| 🔒 `admin-orders.ts::adminMarkDelivered` | **Auth** ✅ | Admin | Zustellen | DB, Audit |
| 🔒 `admin-orders.ts::adminCancelOrder` | **Auth** ✅ | Admin | Stornieren (+ DB-Refund) | DB, Audit |
| 🔒 `admin-orders.ts::adminMarkReturnReceived` | **Auth** ✅ | Admin | Retoure eingegangen | DB, Audit |
| 🔒 `admin-orders.ts::adminRefundWithdrawal` | **Auth** ✅ | Admin | Widerruf erstatten (echter Stripe-Refund) | **Stripe**, DB, Audit |
| 🔒 `admin-orders.ts::adminUpdateInternalNote` | **Auth** ✅ | Admin | Interne Notiz | DB |
| `cart.ts::validateCartAction` | Public | — | Warenkorb validieren | DB |
| `cart.ts::previewShippingAction` | Public | — | Versand-Quote | DB |
| `cart.ts::previewDiscountAction` | Public | — | Rabatt-Vorschau | DB |
| `checkout.ts::createCheckoutSessionAction` | Public (opt. Kunde) | Gast/Kunde | Draft-Order + Stripe-Session | **Stripe**, DB |
| `customer-address.ts::add/update/delete/setDefault…` | **Auth** (`requireCustomer()`) ✅ | Kunde | Adressbuch-CRUD (IDOR-Check im Service) | DB |
| `customer-auth.ts::registerCustomerAction` | Public | →Kunde | Registrierung (Double-Opt-In) | DB, Resend |
| `customer-auth.ts::loginCustomerAction` | Public | →Kunde | Kunden-Login (RL) | DB |
| `customer-auth.ts::logoutCustomerAction` | Auth | Kunde | Logout | DB |
| `customer-auth.ts::requestPasswordResetAction` | Public | — | Reset anfordern (Anti-Enumeration) | DB, Resend |
| `customer-auth.ts::resetPasswordAction` | 🔑 Reset-Token | Kunde | Passwort per Token setzen | DB |
| `customer-auth.ts::changePasswordAction` | **Auth** ✅ | Kunde | Passwort ändern | DB |
| `withdrawal.ts::lookupOrderForWithdrawal` | Public (Order#+E-Mail) | Kunde | Order finden → Token-URL; RL 10/10min | DB |
| `withdrawal.ts::submitWithdrawal` | 🔑 `publicToken` | Kunde | Widerruf einreichen; RL 3/h | DB, Resend, Audit |

> `checkout-schema.ts` enthält bewusst **keine** `"use server"`-Direktive (nur Zod-Schema/Typen) → keine Action.

---

## 3. DER NEUE ADMIN-BEREICH (im Detail)

### 3.1 Admin-Seiten/Routen

| Pfad | Datei | Page-Guard |
|---|---|---|
| `/admin` (Dashboard) | `app/admin/page.tsx` | `requireAdmin()` ✅ |
| `/admin/login` | `app/admin/login/page.tsx` | public (Login) |
| `/admin/bestellungen` | `app/admin/bestellungen/page.tsx` | `requireAdmin()` ✅ |
| `/admin/bestellungen/[id]` | `app/admin/bestellungen/[id]/page.tsx` | `requireAdmin()` ✅ |
| `/admin/bestellung-anlegen` | `app/admin/bestellung-anlegen/page.tsx` | `requireAdmin()` ✅ |
| `/admin/produkte` | `app/admin/produkte/page.tsx` | `requireAdminAuth()` (Shim → `requireAdmin`) ✅ |
| `/admin/produkte/neu` | `app/admin/produkte/neu/page.tsx` | **🔴 KEIN Server-Guard** — Client-Component, nur `sessionStorage` |
| `/admin/produkte/[id]` | `app/admin/produkte/[id]/page.tsx` | **🔴 KEIN Server-Guard** — Client-Component, nur `sessionStorage` |
| `/admin/audit` | `app/admin/audit/page.tsx` | `requireAdmin()` ✅ |
| `/admin/export` | `app/admin/export/page.tsx` | `requireAdmin()` ✅ |

### 3.2 Admin-Aktionen und DB-Wirkung

| Aktion | Implementierung | DB-Effekt |
|---|---|---|
| Bestellung versenden | `adminMarkShipped` → `markOrderShipped` | `fulfillmentStatus=FULFILLED`, Tracking, Audit, Mail |
| Als zugestellt | `adminMarkDelivered` → `markOrderDelivered` | `orderStatus=COMPLETED`, `deliveredAt`, Mail |
| Stornieren | `adminCancelOrder` → `cancelOrder` | `orderStatus=CANCELLED`, opt. DB-`refundedCents` (**kein** Stripe-Refund!), Mail |
| Retoure eingegangen | `adminMarkReturnReceived` → `markReturnReceived` | `returnReceivedAt` |
| Widerruf erstatten | `adminRefundWithdrawal` → `refundWithdrawnOrder` | **echter Stripe-Refund**, `paymentStatus=REFUNDED`, Wertersatz §357 BGB, Mail |
| Interne Notiz | `adminUpdateInternalNote` | `order.internalNote` |
| Manuelle Order | `createManualOrderAction` | vollständige Order (COMPLETED/PAID/FULFILLED), ggf. `product.inStock=false`, Audit |
| Produkt anlegen | `POST /api/admin/produkte` | `prisma.product.create` — **🔴 ungeschützt, s. 3.4** |
| Produkt bearbeiten | `PATCH /api/admin/produkte/[id]` | `prisma.product.update` — **🔴 ungeschützt** |
| Produkt löschen | `DELETE /api/admin/produkte/[id]` | `prisma.product.delete` (Hard-Delete) — **🔴 ungeschützt** |
| Kategorie anlegen | `POST /api/admin/kategorien` | `prisma.category.upsert` — **🔴 ungeschützt** |
| CSV-Export | `GET /api/admin/export-orders` | nur Lesen + Audit; gibt ALLE Bestelldaten (PII) als CSV |

### 3.3 Admin-Login & Session-Mechanismus (VERBATIM)

**Login-Action** (`app/actions/admin-auth.ts:16`):
```ts
export async function loginAdminAction(rawInput: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const result = await loginAdmin(parsed.data.email, parsed.data.password);
  if (!result.ok) return { ok: false, error: result.error, retryAfter: result.retryAfter };
  return { ok: true, redirectTo: "/admin" };
}
```

**Session-Erzeugung** (`lib/services/admin-auth.ts:103-136`):
```ts
const token = generateToken(32);
const tokenHash = hashToken(token);
const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
await prisma.$transaction([
  prisma.admin.update({ where: { id: admin.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip } }),
  prisma.adminSession.create({ data: { adminId: admin.id, tokenHash, ipAddress: ip, userAgent: ua ?? undefined, expiresAt } }),
]);
const cookieStore = await cookies();
cookieStore.set(ADMIN_SESSION_COOKIE, token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  expires: expiresAt,
});
```
Klartext-Token (32 Byte CSPRNG, base64url) ins Cookie; in der DB nur SHA-256-Hash (`tokenHash`, UNIQUE). Passwort-Check via argon2id. Account-Lockout 5 Fehlversuche/15 Min. Timing-Attack-Mitigation bei nicht existentem User (`sleep(150+rnd*100)`).

### 3.4 Schutz — zentraler Check, Middleware, und die zwei Auth-Systeme

**Zentraler Check (sicher)** — `lib/services/admin-auth.ts:154`:
```ts
export async function getCurrentAdmin(): Promise<AuthedAdmin | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || token.length < 16 || token.length > 100) return null;
  const session = await prisma.adminSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { admin: true } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (!session.admin.isActive) return null;
  return { id: session.admin.id, email: session.admin.email, displayName: session.admin.displayName };
}
export async function requireAdmin(): Promise<AuthedAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
```

**Middleware (`middleware.ts`)** — prüft NUR die **Existenz** eines Cookies, nicht die Gültigkeit (Edge-Runtime, bewusst Defense-in-Depth):
```ts
if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
  const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!cookie) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
}
// matcher: ["/admin/:path*", "/api/admin/:path*", "/konto/:path*"]
```
→ **Jedes beliebige nicht-leere Cookie `hagi-admin-session=…` passiert die Middleware.** Die echte Validierung MUSS pro Route passieren.

#### 🔴 CRITICAL — ✅ VERIFIZIERT: Admin-Produkt-/Kategorie-API faktisch ungeschützt

Es existieren zwei Auth-Systeme:
- **System A (neu, korrekt):** `lib/services/admin-auth.ts` (`requireAdmin`). Genutzt von allen Server-Actions + `export-orders`.
- **System B (Legacy-Shim):** `lib/admin-auth.ts::checkAdminRequest`. Genutzt von den Produkt-/Kategorie-API-Routen.

`lib/admin-auth.ts:19`:
```ts
export async function checkAdminRequest(_req: NextRequest): Promise<boolean> {
  const admin = await getCurrentAdmin();
  return admin !== null;
}
```
Die Funktion ist **`async`** → liefert ein **Promise**. Alle Call-Sites rufen sie OHNE `await` auf (verifiziert per grep — **0** Stellen mit `await`):
```ts
// app/api/admin/produkte/route.ts:25 & :38, [id]/route.ts:28/:49/:83, kategorien/route.ts:12
if (!checkAdminRequest(req)) {
  return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
}
```
Ein Promise-Objekt ist **immer truthy** → `!checkAdminRequest(req)` ist **immer `false`** → der 401-Block wird **NIE** ausgeführt.

**Konkrete Folge:** Wer ein beliebiges (auch ungültiges) `hagi-admin-session`-Cookie setzt (um die Middleware zu passieren), kann ohne gültige Session:
- `POST /api/admin/produkte` → Produkte anlegen
- `PATCH /api/admin/produkte/[id]` → **Preise manipulieren** (z. B. Teppich auf 1 Cent)
- `DELETE /api/admin/produkte/[id]` → Produkte löschen
- `POST /api/admin/kategorien` → Kategorien anlegen

Der von den Client-Pages gesetzte `x-admin-password`-Header (aus `sessionStorage.getItem("adminPw")`) wird serverseitig **gar nicht ausgewertet** → reine Fassade. Zusätzlich hat `GET /api/admin/kategorien` **überhaupt keinen** Auth-Check.

**Antwort auf die Kernfrage "Wird JEDE Admin-Action einzeln geprüft?":** NEIN. Die Server-Actions (Orders, Manual-Order, Export) sind sauber je Action mit `requireAdmin()` geschützt. Die Produkt-/Kategorie-**API-Routen** sind faktisch ungeschützt (fehlendes `await`) und verlassen sich de facto nur auf den trivial umgehbaren Cookie-Existenz-Check der Middleware.

**Fix (1 Schritt schließt es):** Die 3 Routen auf `requireAdmin()` umstellen (wie `export-orders`), das `x-admin-password`/`sessionStorage`-System entfernen, `lib/admin-auth.ts` löschen.

### 3.5 Rollen / Berechtigungsstufen
`model Admin` hat **kein** `role`-Feld — nur `isActive: Boolean`. Also reines **"Admin ja/nein"**, keine Stufen. `totpSecret`/`totpEnabledAt` existieren im Schema, werden im Login-Flow aber **nicht geprüft** → 2FA vorbereitet, aber NICHT aktiv.

### 3.6 Rate-Limiting beim Login
`loginAdmin` (`lib/services/admin-auth.ts:30`): `rateLimit({ key: 'ip:${ip}:admin-login', limit: 5, windowSeconds: 900 })` → 5/15 Min pro IP + Account-Lockout. Implementierung (`lib/services/rate-limit.ts`): Postgres-basiert, zählt `auditLog`-Einträge `action="rate.hit"` im Zeitfenster. **Schwächen:** (1) nicht atomar — `count` + `create` getrennt → Race-Condition unter Last; (2) IP über `extractIp` vertraut `x-forwarded-for`/`x-real-ip` → ohne Proxy spoofbar; (3) wächst ohne Cron-Cleanup.

---

## 4. AUTH & ZUGRIFF GESAMT

### 4.1 Token-Erzeugung/-Speicherung/-Validierung (VERBATIM `lib/security/tokens.ts`)
```ts
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
export function generateToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString("base64url");
}
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}
```
**Bewertung:** Stark. `randomBytes(32)` = CSPRNG, 256 Bit Entropie. Session-/Public-Tokens in DB nur als SHA-256-Hash. SHA-256 ohne Salt ist hier OK (Input ist bereits 256 Bit Zufall). `timingSafeEqual` gegen Timing-Attacks vorhanden.

### 4.2 Token-basierte Public-Routen (Capability-URLs)
`Order.publicToken` (`schema.prisma:293`, `String @unique`), erzeugt via `generateToken(32)` bei Order-Anlage → 256 Bit Zufall = der Token IST der Zugriffsschlüssel.

| Route | Validierung |
|---|---|
| `bestellung/status/[token]` | Format-Regex (16–64, `[A-Za-z0-9_-]`) + RL 30/min + `findUnique({publicToken})` |
| `api/invoice/[token]` | Format + RL 30/min + `findUnique` + Status-Gate (nur PAID/REFUNDED) |
| `api/widerruf/[token]` | Format + RL 3/h + Eligibility + Idempotenz + Audit |

VERBATIM (`api/invoice/[token]/route.ts:16`):
```ts
if (!token || token.length < 16 || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) {
  return NextResponse.json({ error: "invalid_token" }, { status: 400 });
}
```
**Restrisiko:** Diese Capability-Tokens haben **kein Ablaufdatum** → wer eine `publicToken`-URL kennt (E-Mail-Logs, Browser-History), kann dauerhaft die Rechnung mit voller PII abrufen. Mitigiert durch 256-Bit-Zufall + `noindex`/`no-store`.

### 4.3 Public vs. geschützt — und versehentlich offene Admin-Routen

**Public (gewollt):** Storefront, Legal-Pages, Token-Routen (status/invoice/widerruf), `stripe/webhook` (Signatur), `health`, Customer-Auth-Einstiege.
**Geschützt (Session):** alle `/admin/*` außer `/admin/login`, `/api/admin/export-orders`, `/konto/*`.

🔴 **Versehentlich ungeschützt (✅ VERIFIZIERT):**
1. `GET/POST /api/admin/produkte` — `checkAdminRequest` ohne `await`.
2. `GET/PATCH/DELETE /api/admin/produkte/[id]` — gleicher Bug. **Schwerster Fall: Preise ändern + löschen ohne Session.**
3. `POST /api/admin/kategorien` — gleicher Bug; `GET` ganz ohne Check.
4. Client-Pages `produkte/neu` + `produkte/[id]` ohne Server-Page-Guard (nur `sessionStorage`).

### 4.4 Finding-Übersicht

| # | Severity | Finding | Ort |
|---|---|---|---|
| 1 | 🔴 **CRITICAL** | `checkAdminRequest` ohne `await` → Produkt-/Kategorie-API ungeschützt (Preis ändern, löschen) | `lib/admin-auth.ts:19` + 6 Call-Sites |
| 2 | 🟠 HIGH | `x-admin-password`/`sessionStorage`-Fassade ohne Server-Wirkung; Client-Pages ohne Server-Guard | `produkte/neu`, `produkte/[id]`, `DeleteProductButton.tsx` |
| 3 | 🟡 MEDIUM | Rate-Limit nicht atomar (Race) + IP über spoofbaren `x-forwarded-for` | `lib/services/rate-limit.ts` |
| 4 | 🟡 MEDIUM | Keine Rollen (nur `isActive`); 2FA-Felder vorhanden, im Login nicht geprüft | `schema.prisma`, `admin-auth.ts` |
| 5 | 🔵 LOW | Capability-Tokens ohne Ablauf → dauerhafter PII-/Rechnungsabruf | invoice/status/widerruf |
| 6 | 🔵 LOW | `GET /api/admin/kategorien` ganz ohne Auth | `kategorien/route.ts:6` |
| 7 | 🟠 HIGH | `.env.cpgz` (komprimierte Kopie der `.env`?) im Repo-Root — mögliches Secret-Leak, prüfen ob `.gitignore` greift | Repo-Root |

**Was gut ist (ehrlich):** System A (`lib/services/admin-auth.ts`) ist solide — argon2id, DB-Sessions mit Hash, Lockout, Timing-Mitigation, Audit, httpOnly/secure-Cookie. Order-Server-Actions korrekt einzeln geschützt. Token-Generierung kryptografisch sauber.
**Was kaputt ist:** Die Migration System B → A wurde nur halb durchgeführt; `checkAdminRequest` ist durch das fehlende `await` eine No-Op. Das ist die gefährlichste Lücke im Admin-Bereich.

---

## 5. DATENMODELL

Quelle: `prisma/schema.prisma` (PostgreSQL). PII mit 🔴 markiert. 23 Models, 18 Enums.

### Kern-Models (gekürzt auf das Audit-Relevante)

- **`Admin`** (Z. 675): 🔴`email @unique`, 🔴`passwordHash` (argon2), `displayName`, `isActive`, `failedLoginAttempts`, `lockedUntil`, `lastLoginAt`, 🔴`lastLoginIp`, 🔴`totpSecret?`, `totpEnabledAt?` → `sessions AdminSession[]`. **Kein `role`-Feld.**
- **`AdminSession`** (Z. 699): `adminId`, 🔴`tokenHash @unique`, 🔴`ipAddress`, 🔴`userAgent`, `expiresAt`, `revokedAt` (Cascade).
- **`Customer`** (Z. 199): 🔴`email @unique`, 🔴`passwordHash?`, 🔴`emailVerifyTokenHash? @unique`, 🔴`passwordResetTokenHash? @unique`, 🔴`firstName/lastName/phone`, `newsletterConsent…`, `failedLoginAttempts`, `lockedUntil`, 🔴`lastLoginIp`, B2B (`companyName`, 🔴`vatId`, `taxExempt`), DSGVO (`deletedAt`, `anonymizedAt`) → `orders`, `addresses`, `consentLogs`, `sessions`.
- **`CustomerSession`** (Z. 248): 🔴`tokenHash @unique`, 🔴`ipAddress`, 🔴`userAgent`, `expiresAt`, `revokedAt`.
- **`CustomerAddress`** (Z. 264): vollständig PII — 🔴`firstName/lastName/street1/street2/city/postalCode/phone`, `company`, `countryCode`, Default-Flags.
- **`Order`** (Z. 290): `orderNumber @unique`, `publicToken @unique`, 🔴`customerEmail/customerPhone`, **Billing+Shipping je 🔴** (`*FirstName…*Phone`), Geld in Cents (`subtotalCents`, `shippingCents`, `taxCents`, `discountCents`, `totalCents`, `paidCents`, `refundedCents`, `taxRatePercent` Decimal), Status-Enums (s. u.), Stripe (`stripeSessionId @unique`, `stripePaymentIntentId @unique`), B2B (🔴`vatIdSnapshot`, `isReverseCharge`), Tracking (🔴`browserIp`, `userAgent`, `referrer`), Consent-Snapshots, Widerruf (`withdrawalRequestedAt`, `returnReceivedAt`, …), Lifecycle-Timestamps (`confirmedAt`, `paidAt`, `fulfilledAt`, `deliveredAt`, `refundedAt`, `anonymizedAt`).
- **`OrderItem`** (Z. 410): Produkt-Snapshot (`productTitle/Slug/Sku/ImageUrl`), `quantity`, `unitPriceCents`, Tax/Discount/Subtotal/Total-Cents, `fulfilledQuantity`, `refundedQuantity/Cents`.
- **`Fulfillment`** / **`FulfillmentItem`** (Z. 451/471): Tracking, `carrier`, `shippedAt`, `deliveredAt`.
- **`Refund`** / **`RefundItem`** (Z. 484/503): `amountCents`, `valueCompensationCents` (Wertersatz §357 BGB), `stripeRefundId @unique` (Idempotenz).
- **`Discount`** (Z. 517): `code @unique`, `type DiscountType`, `value`, `minOrderCents`, `maxDiscountCents`, `usageLimit`, `usedCount`, `oncePerCustomer`, `validFrom/Until`, `excludedProductIds/CategoryIds`, `stackable`, `active`.
- **`PaymentEvent`** (Z. 591): `providerEventId @unique` (Webhook-Dedup-Anker), `eventType`, `payload Json` (🔴 kann Stripe-Kundendaten enthalten), `processedAt`, `retryCount`, `lastError`.
- **`AuditLog`** (Z. 612): `actorType`, `actorId?`, `action`, `entityType/Id`, `beforeData/afterData Json?`, 🔴`ipAddress`, 🔴`userAgent`.
- **`ErrorLog`** (Z. 632): `source`, `message`, `stack?`, `context Json?`.
- **`ConsentLog`** (Z. 644): `consentType ConsentType`, `granted`, 🔴`ipAddress`, 🔴`userAgent`, `grantedAt`, `withdrawnAt`.
- **`Product`** (Z. 18): Stammdaten (Preis `price`/`comparePrice` Int, `images[]`, Maße, Material, Herkunft inkl. `weaverName`/`weaverStory`, `inStock`, `featured`), `OrderCounter` (Z. 667): fortlaufende Bestellnr./Jahr.

### Enums (vollständig)
- **`OrderStatus`**: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`
- **`PaymentStatus`**: `PENDING`, `AUTHORIZED`, `PAID`, `PARTIALLY_REFUNDED`, `REFUNDED`, `FAILED`, `EXPIRED`
- **`FulfillmentStatus`**: `UNFULFILLED`, `PARTIALLY_FULFILLED`, `FULFILLED`, `RETURNED`
- **`DeliveryType`**: `SHIPPING`, `PICKUP`, `LOCAL_DELIVERY`
- **`DiscountType`**: `PERCENTAGE`, `FIXED_AMOUNT`, `FREE_SHIPPING`
- **`ShippingType`**: `FLAT`, `WEIGHT_BASED`, `PRICE_BASED`
- **`ConsentType`**: `TERMS`, `PRIVACY`, `WITHDRAWAL`, `NEWSLETTER`, `COOKIES_ANALYTICS`, `COOKIES_MARKETING`
- Produkt-Enums: `Shape`, `PileMaterial`, `ManufacturingType`, `KnotTechnique`, `OriginCountry`, `AgeCategory`, `Condition`, `PatternType`, `Style`, `MainColor`, `Room`

> ⚠️ Schema-Werte `AUTHORIZED`, `PARTIALLY_FULFILLED`, `RETURNED`, `LOCAL_DELIVERY` werden im Lifecycle-Code **nie gesetzt** (kein Teil-Versand-Übergang).

---

## 6. GELD-/ZAHLUNGSFLUSS

**Pfad:** `createCheckoutSessionAction` → `createDraftOrderAndStripeSession` (Draft-Order `PENDING` + Stripe-Session) → Kunde zahlt → Webhook `checkout.session.completed` → Order `PAID/CONFIRMED`. Alte API-Route `api/stripe/checkout` ist **410 Gone**.

**1. Checkout-Start** (`app/actions/checkout.ts`): validiert via `checkoutInputSchema` (importiert aus `checkout-schema.ts`), liest 🔴 IP/UA/Referrer, ermittelt eingeloggten Kunden, ruft Service. Fehler-Whitelist generalisiert Unbekanntes zu `INTERNAL_ERROR`.

**2. Draft-Order + Stripe-Session** (`lib/services/order-create.ts:286`):
```ts
const idempotencyKey = `order_${order.id}_${idempotencyKeyFor(email, input.items)}`;
const session = await stripe.checkout.sessions.create({
  mode: "payment", payment_method_types: ["card"], currency: "eur",
  customer_email: email, client_reference_id: order.id,
  metadata: { orderId: order.id, orderNumber: order.orderNumber },
  success_url: `${APP_URL}/bestellung-bestaetigt?token=${publicToken}`,
  cancel_url: `${APP_URL}/checkout?canceled=1`, ...
}, { idempotencyKey });
```
Bei Stripe-Session-Fehler: Rabatt freigeben (`releaseDiscount`) + Order `CANCELLED` (`stripe_session_failed`), re-throw.

**3. Webhook** (`app/api/stripe/webhook/route.ts`). Behandelte Events: `checkout.session.completed`→PAID/CONFIRMED, `checkout.session.expired`→EXPIRED/CANCELLED, `payment_intent.payment_failed`→FAILED/CANCELLED. Default: quittiert + ignoriert.

Signaturprüfung (VERBATIM):
```ts
const sig = req.headers.get("stripe-signature");
const secret = process.env.STRIPE_WEBHOOK_SECRET;
if (!sig || !secret) return NextResponse.json({ error: "missing_signature_or_secret" }, { status: 400 });
const rawBody = await req.text();
if (rawBody.length > MAX_BODY_BYTES) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
try {
  event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
} catch (err) {
  return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
}
```
`constructEvent` über den **rohen** Body; `MAX_BODY_BYTES = 1_000_000`.

Idempotenz/Dedup (`lib/services/webhook-dedup.ts`): "create-first" auf `PaymentEvent.providerEventId @unique`; bei P2002-Unique-Violation wird der bestehende Record geladen, `alreadyProcessed = processedAt !== null`. Zusätzlich auf Order-Ebene: `if (order.paymentStatus === "PAID") { await markProcessed(...); return; }`. **Betragsprüfung:** Abweichung >100 Cent → `order.amount_mismatch`-Audit, Order wird aber **trotzdem** als bezahlt markiert (nur Logging, kein Block).

**4. Refund-Handling:** Refunds laufen **nicht** über Webhook-Events.
- `refundWithdrawnOrder` (`order-lifecycle.ts:337`) macht **echten** Stripe-Refund (`stripe.refunds.create`, Idempotency-Key `wd-refund-${order.id}-${refundCents}`) VOR DB-Markierung. Guards: nur admin/system, `withdrawalRequestedAt` Pflicht, Betragsobergrenze, bei `FULFILLED` zwingend `returnReceivedAt` (`RETURN_NOT_RECEIVED`).
- ⚠️ `cancelOrder` mit `refundCents` setzt die Order DB-seitig auf `REFUNDED`, löst aber **KEINEN** echten Stripe-Refund aus → Geld muss manuell ausgeglichen werden.

**5. Webhook-Fehlerfälle:** fehlende Signatur/Secret → 400; ungültige Signatur → 400; Handler-/DB-Fehler → `logError` + `markError` (retryCount++) + 500 (→ Stripe-Retry, `processedAt` bleibt leer); Order nicht gefunden → nur `console.warn`, quittiert.

---

## 7. ORDER-LEBENSZYKLUS

Quelle: `lib/services/order-lifecycle.ts`. Grundpattern: jeder Übergang ist ein **atomarer `updateMany` mit WHERE-Guard** (verlangt erlaubten Vorzustand). `count === 0` → `skipped: true` (idempotent, race-safe).

| Trigger | Order | Payment | Fulfillment | WHERE-Guard (Vorbedingung) |
|---|---|---|---|---|
| order-create | →PENDING | →PENDING | →UNFULFILLED | Neuanlage |
| Webhook completed | →CONFIRMED | →PAID | — | `paymentStatus != PAID` |
| Webhook expired | →CANCELLED | →EXPIRED | — | `paymentStatus != PAID` |
| Webhook payment_failed | →CANCELLED | →FAILED | — | `paymentStatus != PAID` |
| `markOrderShipped` | — | — | →FULFILLED | `orderStatus != CANCELLED` ∧ **`paymentStatus = PAID`** ∧ `fulfillmentStatus != FULFILLED` |
| `markOrderDelivered` | →COMPLETED | — | — | `orderStatus != CANCELLED` ∧ `deliveredAt = null` ∧ **`fulfillmentStatus = FULFILLED`** |
| `cancelOrder` | →CANCELLED | (opt. REFUNDED) | — | `orderStatus != CANCELLED` ∧ **`fulfillmentStatus != FULFILLED`** |
| `registerWithdrawal` | — | — | — | `orderStatus ∈ {COMPLETED, CONFIRMED}` ∧ `withdrawalRequestedAt = null` |
| `markReturnReceived` | — | — | — | admin/system ∧ `withdrawalRequestedAt != null` ∧ `returnReceivedAt = null` |
| `refundWithdrawnOrder` | →CANCELLED | →REFUNDED/PARTIALLY_REFUNDED | — | Widerruf gesetzt; bei FULFILLED zwingend `returnReceivedAt` |

**Kann man Schritte überspringen? NEIN.** Harte Block-Regeln (verifiziert per VERBATIM-Guards):
- Kein Versand ohne Bezahlung (`paymentStatus: "PAID"` Pflicht → sonst `ORDER_NOT_PAID`).
- Kein `COMPLETED` ohne `FULFILLED` (`fulfillmentStatus: "FULFILLED"` Pflicht → sonst `ORDER_NOT_SHIPPED`).
- Kein Storno nach Versand (`fulfillmentStatus != FULFILLED` → sonst `ORDER_ALREADY_SHIPPED`).
- Kein Refund vor Ware-Rückerhalt bei versandter Ware (`returnReceivedAt` Pflicht → `RETURN_NOT_RECEIVED`).

**Admin-Aktion → Übergang** (`app/actions/admin-orders.ts`, alle mit `requireAdmin()`): `adminMarkShipped`→FULFILLED, `adminMarkDelivered`→COMPLETED, `adminCancelOrder`→CANCELLED(+DB-Refund), `adminMarkReturnReceived`→`returnReceivedAt`, `adminRefundWithdrawal`→echter Stripe-Refund→REFUNDED+CANCELLED. `registerWithdrawal` wird vom **Kunden** getriggert (nicht admin).

**Idempotenz:** durchgängig über die WHERE-Guards + Stripe-Idempotency-Key beim Refund.

---

## 8. EXTERNE INTEGRATIONEN & SECRETS

### 8.1 Stripe
Init (Lazy-Singleton, `lib/stripe.ts:5`):
```ts
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY fehlt in den Umgebungsvariablen.");
    _stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return _stripe;
}
```
Calls: Checkout-Session (`order-create.ts:286`), Refund (`order-lifecycle.ts:340`). Webhook: `constructEvent` mit `STRIPE_WEBHOOK_SECRET`. Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (kein Publishable Key — Server-Redirect-Flow).

### 8.2 Resend / React Email
Init (Lazy-Singleton, `lib/email/send.ts:23`): `if (!key) throw "RESEND_API_KEY_MISSING"`. **Mock-Mode** in Dev (Log statt Send), Fail-Fast in Prod. Absender `RESEND_FROM` (Fallback `bestellungen@hagi-shop.de`). 7 Templates. Keine eingehenden Webhooks. Env: `RESEND_API_KEY`, `RESEND_FROM`.

### 8.3 Cron (Coolify, HTTP)
`api/cron/cleanup` + `api/cron/refund-reminder`: Header `Authorization: Bearer ${CRON_SECRET}`. Fehlt Secret → `503 cron_disabled`; Mismatch → `401`. Env: `CRON_SECRET`, `ADMIN_NOTIFY_EMAIL` (optional).

### 8.4 Storage
**NICHT VORHANDEN** als Server-Integration — Produktbilder als externe URLs im Admin-Form (kein Upload-Endpoint).

### 8.5 Vollständige ENV-Liste (nur Namen)
`NODE_ENV`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `CRON_SECRET`, `ADMIN_NOTIFY_EMAIL`, `TAX_MODE`, `COMPANY_NAME`, `COMPANY_STREET`, `COMPANY_CITY`, `COMPANY_VAT_ID`, `COMPANY_TAX_NUMBER`, `COMPANY_EMAIL`, `COMPANY_PHONE`, `COMPANY_IBAN`, `ADMIN_EMAIL`*, `ADMIN_PASSWORD`*, `ADMIN_NAME`* (*nur Bootstrap-Script `scripts/create-admin.ts`, nicht zur Laufzeit).

### 8.6 Verhalten bei fehlender Variable
Zentrales Muster (`lib/config.ts:14`): **Dev = Fallback + Warning, Prod = Throw beim Import** (Fail-Fast).

| Variable | Fehlt → Verhalten |
|---|---|
| `DATABASE_URL` | Throw immer |
| `NEXT_PUBLIC_APP_URL` | Dev: Fallback `http://localhost:3002` · Prod: Throw |
| `STRIPE_SECRET_KEY` | Lazy-Throw bei `getStripe()` |
| `STRIPE_WEBHOOK_SECRET` | Webhook → 400 |
| `RESEND_API_KEY` | Dev: Mock-Mode · Prod: Throw |
| `CRON_SECRET` | 503 `cron_disabled` |
| `TAX_MODE` | Dev: Default `small_business` · Prod: Throw |
| `COMPANY_VAT_ID`/`TAX_NUMBER` | Prod: Throw wenn beide leer |
| `COMPANY_IBAN` | Prod: Throw (Rechnungs-Pflicht) |

**Beobachtung:** `lib/config.ts` deckt zentral nur `DATABASE_URL` + `NEXT_PUBLIC_APP_URL` ab; die übrigen Fail-Fast-Checks liegen dezentral in den jeweiligen Modulen.

---

## 9. WAS SICH SEIT DEM LETZTEN STAND GEÄNDERT HAT

Datenbasis: `STATUS.md`, `git log` (40 Commits), direkte Inspektion. Ursprung: Public Storefront + geplanter Admin. Heute deutlich mehr gebaut.

**NEU gebaut:**
- **Admin-Bereich — FERTIG, kein Stub.** Alle Admin-Seiten haben echte DB-Funktion (Dashboard-KPIs aus Prisma-Aggregaten, Order-Liste mit Filter+Pagination, Order-Detail mit Ship/Deliver/Cancel/Refund, Produkt-CRUD, Showroom-Order, Audit-Viewer, CSV-Export).
- **NEUES Admin-Design-System** unter `components/admin/ui/` (`AdminButton`, `AdminSidebar`, `Card`/`KpiCard`, `Field`, `PageHeader`, `Pagination`, `StatusBadge`) + zentrale Status-Labels in `lib/admin/status-labels.ts`. Neues Sidebar-Layout. **(uncommitted im Working Tree — diese Session.)**
- **Kunden-Konto v1 — FERTIG** (Double-Opt-In, Login-Lock, Passwort-Reset, Bestell-Historie, Adressbuch mit IDOR-Check). Gemergt aus `feat/customer-login`.
- **Widerruf End-to-End — FERTIG** (3 Security-Gates, Stripe-Refund, Wertersatz §357 BGB, Countdown, 3-Stufen-Cron-Reminder, Muster-PDF).
- **Observability** — zentrales DB-Fehler-Logging `lib/services/error-log.ts` + `ErrorLog`-Tabelle.

**Geändert / Migration im Gange:**
- **Auth-Doppel-System (unvollständige Migration):** System A (`requireAdmin`, neu) vs. System B (`checkAdminRequest`/`requireAdminAuth`, Legacy-Shim). System B noch in 4 Stellen aktiv — und durch den `await`-Bug **faktisch unsicher** (s. Abschnitt 3.4/4). Migration laut Roadmap offen.
- **checkout.ts:** Zod-Schema wurde nach `checkout-schema.ts` ausgelagert (behebt den `"use server"`-Export-Fehler). **Uncommitted** im Working Tree.
- **Navbar.tsx:** Hydration-Fix für Warenkorb-Zähler (mounted-Guard). **Uncommitted.**

**Noch offen / Platzhalter:**
- Code "Live-Gang-ready", aber 6 manuelle Schritte (Coolify-Env/Cron, echte Stripe-Test-Order, DNS+Webhook, Rechts-Review).
- Legal/Config-Platzhalter (s. Abschnitt 10).
- Geplant, nicht gebaut: Wishlist, Showroom-Termin, Newsletter-DOI, DE/EN.

---

## 10. TEST-STAND & BEKANNTE PROBLEME

### Vorhandene Tests (15 Vitest-Suites, ~159 Tests, laut STATUS.md grün)
- **Auth/Security:** `security.test.ts` (IDOR, Login-Lock, Session-Expiry), `customer-auth.test.ts`, `customer-address.test.ts` (IDOR).
- **Geld:** `payment.test.ts` (Webhook-Dedup, payment_failed/expired, Amount-Mismatch), `discount.test.ts`, `order-state.test.ts` (Ship/Deliver/Cancel + Idempotenz), `order-customer-link.test.ts`.
- **Widerruf:** `withdrawal*.test.ts` (security, pdf, refund-stripe, wertersatz, countdown), `refund-reminder.test.ts`.
- **Observability:** `error-log.test.ts`.
- Plus Legacy-Smoke-Skripte `scripts/test-stage-*.ts`.

### UNGETESTETE kritische Pfade (aus `docs/test-gaps.md`)
- **🔴 Die Produkt-/Kategorie-API-Auth-Lücke (Abschnitt 3.4) ist NICHT durch Tests abgedeckt** — kein Test prüft, dass diese Routen ohne gültige Session 401 liefern.
- CSRF auf Server-Actions; Brute-Force über mehrere IPs auf `status/[token]`; Session-Hijacking (Cookie aus anderer IP); E2E Login-Round-Trip (Admin+Kunde); Verify-Token-Replay; **Action-Layer generell ungetestet** (nur Service-Layer); Webhook-Race (Webhook vor Order-Create); Live-Stripe-CLI; Rabatt-Edge-Cases (Stacking, Capping, Exclusions); Invalid-Transition-Throws nur Smoke.

### Bekannte Probleme / fragile Stellen
- **🔴 CRITICAL (Abschnitt 3.4):** `checkAdminRequest` ohne `await` → Produkt-/Kategorie-API ungeschützt. **Höchste Priorität.**
- **🟠 `.env.cpgz` im Repo-Root** — komprimierte Kopie der `.env`? Prüfen, ob `.gitignore` das erfasst (sonst Secret-Leak-Gefahr beim Commit). Sollte gelöscht werden.
- **TODO-Marker (Config/Legal, kein Logik-Bug):** `app/layout.tsx:10` (Domain/Shopname), `app/impressum/page.tsx:1` (**echte Firmendaten — Impressum noch Platzhalter, rechtlich relevant**), `lib/shop-config.ts:22` (Kontakt-E-Mail). Keine `FIXME`/`HACK`/`XXX`.
- **Catch-Blöcke insgesamt sauber:** Geld-/Auth-Pfad loggt oder wirft konsequent (Stripe-Refund wirft `STRIPE_REFUND_FAILED` ohne DB-Markierung; Webhook `logError`+`markError`; `logError`/`logAudit` werfen by design nie).
- **Bewusste swallowing catches (unkritisch):** `sitemap.ts:27` (DB beim Build), `widerruf/[token]/route.ts:48` (optionaler Body), `customer-auth.ts:416` (Enumeration-Schutz), `tokens.ts`/`password.ts` (verify→false).
- **🟡 Inkonsistenz:** Mail-Versand-Fehler in `order-lifecycle.ts` (shipping/delivery/cancellation/withdrawal) + `withdrawal.ts:94` werden nur per `console.error` geloggt, NICHT in `ErrorLog`-DB → im Betrieb schwerer nachvollziehbar.
- **`cancelOrder` + `refundCents`** markiert DB als REFUNDED **ohne** echten Stripe-Refund (Abschnitt 6) — Risiko falscher Refund-Annahme.

---

## PRIORISIERTE FIX-LISTE (für das Audit)

1. **🔴 SOFORT:** `checkAdminRequest`-Lücke schließen — 3 Routen (`produkte`, `produkte/[id]`, `kategorien`) auf `requireAdmin()` umstellen, `x-admin-password`/`sessionStorage` entfernen, `lib/admin-auth.ts` löschen. **+ Regressionstest** (401 ohne gültige Session).
2. **🟠 SOFORT:** `.env.cpgz` löschen + `.gitignore` prüfen.
3. **🟠 BALD:** Server-Page-Guard für `produkte/neu` + `produkte/[id]`.
4. **🟡:** Rate-Limit atomar machen; Impressum-Firmendaten; 2FA aktivieren; `cancelOrder`-Refund mit echtem Stripe-Refund verbinden oder UI-seitig klarstellen.
