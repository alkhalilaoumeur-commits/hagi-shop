# Hagi-Shop — Live-Status

> **Diese Datei ist die Quelle der Wahrheit.** Wer (Claude in zukünftiger Session, Co-Coder, du selbst nach 2 Wochen Pause) wissen will wo wir stehen und wo's weitergeht, liest hier.
> Bei jeder größeren Änderung pflegen.

**Letztes Update:** 2026-06-17
**Letzter Commit:** `811a658` — fix(types): TypeScript-Suite sauber (23 → 0 Fehler)
**Branch:** `main` (lokal — noch nicht gepusht, 2 Commits ahead)
**Test-Status:** 🟢 **110/110 grün** in 9 Suites · `tsc --noEmit` 🟢 **0 Fehler**

---

## TL;DR — Wo wir stehen

| Bereich | Status |
|---|---|
| Storefront (Browse + Cart + Checkout) | 🟢 fertig |
| Stripe Webhook + Lifecycle | 🟢 fertig |
| Email-Templates (5 Stk.) + Mock-Mode | 🟢 fertig |
| Tracking-Page + PDF (Invoice + DeliveryNote) | 🟢 fertig |
| Admin-Backend (Auth + Dashboard + Order-Mgmt + CSV) | 🟢 fertig |
| Widerruf End-to-End (Customer-UI + Admin-Gates + PDF + Refund-Reminder) | 🟢 fertig |
| Stripe-Refund Auto-Trigger (Admin-Klick erstattet real via Stripe-API) | 🟢 fertig |
| Env-Hardening + zentraler Config-Reader | 🟢 fertig |
| **Code Live-Gang-Ready** | **🟢 ja** |
| Coolify-Env + Cron-Setup (manuell) | 🔴 offen |
| Anwalt-Review | 🔴 offen |

---

## Was komplett funktioniert (mit Tests)

### Storefront
- Hero-Carousel, Kollektions-Filter, Produkt-Detail, Warenkorb, Checkout
- Cookie-Banner mit DSGVO-Consent (Essential/Custom/All)
- WhatsApp-Floater, Footer mit Legal-Links

### Checkout-Flow
- Stripe-Checkout-Session via Server Action
- Webhook: `checkout.session.completed` → PAID + CONFIRMED, `session.expired` → EXPIRED, `payment_failed` → FAILED
- Race-Safe Dedup über `providerEventId` UNIQUE
- Amount-Mismatch-Detection mit Audit-Log
- Atomic Discount-Redeem mit Race-Test (5 parallele → exakt 3 OK)
- Order-Number-Generator HAG-YYYY-NNNNNN mit Race-Test
- PII-Snapshots auf Order (10 Jahre Aufbewahrung trotz Customer-Anonymisierung)

### Post-Checkout
- 5 React-Email-Templates (Confirmation, Shipping, Delivery, Cancellation, Withdrawal)
- Mock-Mode in Dev (Log statt Send mit PII-Maske) + Fail-Fast in Prod
- Tracking-Page mit IP-Rate-Limit 30/min
- PDF-Generierung (Invoice § 14 UStG, DeliveryNote, Widerrufsformular)

### Admin-Backend
- argon2id-Auth mit Account-Lock (5 Versuche → 15min Sperre)
- DB-Sessions mit `tokenHash`, `expiresAt`, `revokedAt`
- Edge-Middleware Defense-in-Depth
- Dashboard (KPIs 30d/7d Umsatz + Pending Shipments)
- Order-Liste + Detail mit Ship/Deliver/Cancel
- Manuelle Order-Anlage für Showroom-Walkins
- CSV-Export DATEV-tauglich mit Excel-Formel-Injection-Schutz
- Audit-Log-Viewer mit Filter + Pagination

### Widerruf (BGB-konform, 105 Tests)
- Customer-UI: `/widerruf-antrag` (Lookup) + `/widerruf-antrag/[token]` (Form) + `/erfolg`
- Server-Action mit Zod + Rate-Limit 3/h pro IP
- Schema: `withdrawalRequestedAt`, `withdrawalReason`, `returnReceivedAt`, `returnTrackingNumber`, `withdrawalNoticeGiven`
- 3 Security-Gates: ActorType (Customer kann KEINE Admin-Aktionen), Sequence (Refund braucht Antrag), Return (Refund braucht Wareneingang)
- Admin-UI: Banner "Aktiver Widerruf" + Buttons "Ware retourniert" + "Widerruf erstatten"
- 3-Stufen-Cron-Reminder für § 357 Abs. 1 BGB Frist (Tag 9 REMINDER, Tag 12 URGENT, Tag 14+ OVERDUE)
- Muster-Widerrufsformular als dynamisches PDF unter `/widerrufsformular`

---

## Test-Verteilung (110 Tests in 9 Suites)

| Suite | Tests | Was es abdeckt |
|---|---|---|
| `security.test.ts` | 15 | IDOR Token-Isolation, Login-Lock, Session-Expiry |
| `payment.test.ts` | 7 | Webhook-Dedup race-safe, payment_failed/expired, Amount-Mismatch |
| `order-state.test.ts` | 9 | Ship/Deliver/Cancel + Idempotenz + Concurrency |
| `discount.test.ts` | 13 | %/€/FREE_SHIPPING + Min-Order + Validity + redeem/release |
| `withdrawal.test.ts` | 30 | Service-Funktionen + Customer-Endpoint Happy + Edge Cases |
| `withdrawal-security.test.ts` | 12 | G1-G8 Sicherheits-Garantien gegen Refund-Betrug |
| `withdrawal-form-pdf.test.ts` | 5 | PDF-Header, Cache-Control, Download-Flag |
| `refund-reminder.test.ts` | 14 | Stage-Klassifikation + Cron-Endpoint |
| `withdrawal-refund-stripe.test.ts` | 5 | Auto-Refund via Stripe-API, Fehler-Rollback, Idempotenz, DB-only-Pfad, Partial |

Plus 9 Smoke-Skripte in `scripts/test-stage-*.ts` (Pre-Vitest-Stand, laufen noch).

**Befehle:**
```bash
npm test              # Vitest run
npm run test:watch    # Watch-Mode während Entwicklung
npm run test:coverage # Coverage-Report
```

---

## Was JETZT noch fehlt — drei Schichten

### 🔴 Schicht 1: Ilias macht manuell (Pflicht vor Live-Gang)

| # | Task | Wo | Aufwand |
|---|---|---|---|
| 1 | `.env` lokal migrieren | `mv .env.new .env` + Werte für DB/Stripe-Test eintragen | 5 min |
| 2 | Coolify-Env setzen | `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `TAX_MODE=standard` oder `small_business`, alle `COMPANY_*`, `CRON_SECRET`, `ADMIN_NOTIFY_EMAIL` | 20 min |
| 3 | Coolify-Cron einrichten | täglich 08:00 → `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/refund-reminder` und alle 15min → `.../api/cron/cleanup` | 10 min |
| 4 | Erste echte Test-Bestellung | Stripe-Test-Card durchspielen: Bestellung → Mail → Versand → Lieferung → Widerruf → Refund | 30 min |
| 5 | DNS + Stripe-Webhook-Endpoint registrieren | `hagi-shop.de` → Coolify, Webhook auf `https://hagi-shop.de/api/stripe/webhook` | 30 min |
| 6 | Externes Rechts-Review | Fachanwalt für IT-Recht oder Verbraucherschutz vor erstem €1000+ Verkauf | extern |

### 🟡 Schicht 2: Code-Tasks (kann Claude in Folge-Session machen)

**Customer-Features die fehlen:**
| Priorität | Task | Aufwand |
|---|---|---|
| Mittel | Kunden-Login (aktuell guest-only) — separater Customer-Flow mit eigenem `Customer.passwordHash` | 4-6h |
| Niedrig | Wishlist/Merkliste | 2h |
| Mittel | Showroom-Termin-Formular (statt Telefon/WhatsApp) | 2-3h |
| Niedrig | Newsletter-Signup mit Double-Opt-In | 2h |
| Niedrig | Multi-Sprache DE/EN | 4h |

**Widerruf-Verbesserungen:**
| Priorität | Task | Aufwand |
|---|---|---|
| ✅ erledigt | ~~**Stripe-Refund auto-trigger** im `refundWithdrawnOrder`~~ — löst Refund jetzt real via Stripe-API aus, mit Idempotency-Key + Refund-Record + Fehler-Rollback (5 Tests) | — |
| Mittel | Wertersatz-UI bei Widerruf (§ 357 Abs. 7 BGB) mit Begründungs-Feld | 2h |
| Niedrig | Live-Counter "noch X Tage bis Frist-Ende" auf Order-Status-Page | 1h |

**Admin-Verbesserungen:**
| Priorität | Task | Aufwand |
|---|---|---|
| Mittel | `/api/admin/produkte` + `/api/admin/kategorien` von alter Static-Header-Auth auf Server Actions migrieren | 2-3h |
| Niedrig | `lib/admin-auth.ts` (Deprecation-Shim) entfernen sobald oben fertig | 30min |
| Niedrig | Admin-Bulk-Actions (mehrere Orders gleichzeitig versenden) | 2h |

### 🟢 Schicht 3: Test-Gaps (in `docs/test-gaps.md`)

| Bereich | Was fehlt | Aufwand |
|---|---|---|
| Discount | Combined-Discount-Prevention (zwei Codes gleichzeitig) | 30min |
| Discount | `maxDiscountCents` Capping bei %-Codes | 30min |
| Discount | `excludedProductIds` / `excludedCategoryIds` | 30min |
| Auth | E2E Login-Flow mit echtem Cookie-Round-Trip | 1h |
| Auth | Session-Hijacking (gleicher Cookie aus anderer IP) | 1h |
| Payment | Live-Stripe-CLI `stripe trigger` Tests | 1h |
| Payment | Webhook race: Webhook kommt VOR Order-Create in DB | 1h |

---

## Stack-Schnellreferenz

| Komponente | Wert |
|---|---|
| Framework | Next.js 14.2 App Router (React Server Components) |
| DB | PostgreSQL 15 + Prisma 5.22 |
| Payment | Stripe 17.5 (Server-Side-Redirect, kein Stripe.js) |
| Email | Resend 4.1 + React-Email |
| PDF | @react-pdf/renderer 4.5 |
| Auth | argon2id (selbst gebaut, kein Auth.js) |
| Validation | Zod 3.23 |
| State (Client) | Zustand 4.5 |
| Test | Vitest 4.1 + @vitejs/plugin-react |

---

## Wichtigste Dateien (Karte)

```
hagi-shop/
├── STATUS.md                      ← DU BIST HIER
├── CLAUDE.md                       ← Test-Pflicht-Regel, Stack-Schutz
├── docs/
│   ├── test-gaps.md               ← Lücken-Liste, lebendig
│   ├── widerruf-rechtskonformitaet.md   ← BGB-Audit
│   └── security-audit-stage-4.md  ← Letzter Security-Audit
├── prisma/schema.prisma            ← Order-Model, Withdrawal-Felder, Audit-Felder
├── lib/
│   ├── config.ts                   ← Zentraler Env-Reader mit Prod-Throws
│   ├── prisma.ts                   ← Client-Singleton
│   ├── services/
│   │   ├── order-lifecycle.ts      ← Ship/Deliver/Cancel + Widerruf-Flow
│   │   ├── withdrawal.ts           ← Pure Funktionen: Deadline + Eligible + Refund-Calc
│   │   ├── refund-reminders.ts     ← § 357 BGB 14-Tage-Reminder
│   │   ├── discount.ts             ← Race-safe Redeem
│   │   ├── webhook-dedup.ts        ← Stripe-Event-Idempotenz
│   │   ├── admin-auth.ts           ← argon2 Login + Session
│   │   └── tax.ts                  ← § 19 vs Regelbesteuerung
│   ├── email/
│   │   ├── send.ts                 ← Resend-Wrapper + Mock-Mode
│   │   └── templates.tsx           ← 5 Customer-Mails + Admin-Reminder
│   ├── pdf/
│   │   ├── invoice.tsx             ← § 14 UStG Rechnung
│   │   ├── delivery-note.tsx       ← Lieferschein
│   │   └── withdrawal-form.tsx     ← EGBGB Anlage 2 (neu)
│   └── security/
│       ├── password.ts             ← argon2id Wrapper
│       ├── tokens.ts               ← 32-byte base64url + Hash
│       └── email.ts                ← normalizeEmail
├── app/
│   ├── (storefront pages)          ← /, /produkte, /produkte/[slug], /warenkorb, /checkout, /bestellung-bestaetigt
│   ├── bestellung/status/[token]/  ← Tracking + Widerruf-Link
│   ├── widerruf/                   ← Belehrungs-Page (legal)
│   ├── widerruf-antrag/            ← Customer-Widerruf-Form (3 Pages)
│   ├── widerrufsformular/          ← PDF-Download-Route
│   ├── admin/                      ← Auth-geschützt
│   │   ├── login/
│   │   ├── page.tsx                ← Dashboard
│   │   ├── bestellungen/, bestellungen/[id]/
│   │   ├── bestellung-anlegen/
│   │   ├── produkte/, produkte/neu/, produkte/[id]/
│   │   ├── export/
│   │   └── audit/
│   ├── api/
│   │   ├── stripe/webhook/          ← Race-safe Lifecycle
│   │   ├── widerruf/[token]/        ← Alternativer Endpoint (für JSON-Clients)
│   │   ├── invoice/[token]/         ← Public PDF-Download
│   │   ├── cron/cleanup/            ← Rate-Limit-Logs alle 15min
│   │   ├── cron/refund-reminder/    ← BGB-Frist täglich
│   │   ├── admin/login, export-orders, produkte, kategorien
│   │   └── health/
│   └── actions/
│       ├── checkout.ts              ← Stripe-Session-Create
│       ├── cart.ts                  ← Validate/Preview-Shipping/Preview-Discount
│       ├── withdrawal.ts            ← Customer-Lookup + Submit
│       ├── admin-orders.ts          ← Ship/Deliver/Cancel + Return + Refund
│       ├── admin-manual-order.ts    ← Showroom-Walkin
│       └── admin-auth.ts            ← Login/Logout
├── components/
│   ├── home/                       ← Hero + Carousel + Reviews + Bestseller
│   ├── layout/                     ← Navbar, Footer, CookieBanner, WhatsApp
│   ├── shop/                       ← ProductCard, ShopFilter, AddToCartButton
│   ├── cart/, checkout/            ← CartView, CheckoutForm
│   └── admin/                      ← OrderActions, ManualOrderForm, DeleteProductButton
├── middleware.ts                   ← Edge-Cookie-Check für /admin/*
├── vitest.config.ts                ← Test-Setup mit React-Plugin
├── tests/
│   ├── _helpers/factory.ts         ← makeOrder, ensureProduct, cleanup
│   └── 8 *.test.ts Suites
└── scripts/
    ├── create-admin.ts             ← Bootstrap-Script
    └── test-stage-*.ts             ← Legacy-Smoke-Skripte (laufen noch)
```

---

## Konventionen (für Folge-Sessions wichtig)

### Test-Pflicht
**Kein Commit ohne Test.** Jede neue Funktion bekommt Happy-Path + Negativ-Test. Bei Geld/Auth/PII zusätzlich Edge-Case. Details in `CLAUDE.md`.

### Schema-Änderungen
1. `prisma/schema.prisma` editieren
2. `npx prisma db push --accept-data-loss` (lokal) + `npx prisma generate`
3. Migrations-Script wenn schon Live-Daten existieren (noch nicht der Fall)
4. Tests anpassen (factory.ts ergänzen wenn neue Pflichtfelder)

### Env-Variablen
Neue kritische Var:
1. In `lib/config.ts` als zentralen Reader hinzufügen
2. In `.env.example` dokumentieren mit Kommentar
3. In `STATUS.md` Coolify-Env-Liste ergänzen
4. In `CLAUDE.md` Env-Tabelle ergänzen

### State-Übergänge (Order-Lifecycle)
Race-Safe Pattern: **immer** `updateMany` mit WHERE-Status-Guard, dann `findUnique` als Fallback-Check. Beispiele in `lib/services/order-lifecycle.ts:markOrderShipped`, `markOrderDelivered`, `cancelOrder`, `markReturnReceived`, `refundWithdrawnOrder`.

### Customer- vs Admin-Aktionen
Wenn ein Service-Call sowohl von Customer als auch Admin kommen kann: **ActorType-Check am Anfang**. Beispiel: `markReturnReceived` und `refundWithdrawnOrder` werfen `FORBIDDEN_ACTOR` bei `customer`.

---

## Roadmap-Vorschlag (nach Wichtigkeit)

**Diese Woche** — Live-bereit machen:
1. `.env` lokal migrieren (5 min, Punkt 1 oben)
2. ~~Stripe-Refund-Auto-Trigger~~ ✅ erledigt
3. Echte Test-Bestellung durchspielen (30 min) — jetzt inkl. Refund-Test (Geld geht real zurück)

**Nächste Woche** — Live-Gang:
4. Coolify-Env + Cron (30 min)
5. DNS + Stripe-Webhook (30 min)
6. Anwalt-Termin buchen

**Monat 2** — Optimierung:
7. Kunden-Account-Flow (große Sache, 4-6h)
8. Wertersatz-UI + Live-Counter
9. Programmatic-SEO (CityPages aus SEO-Skill)

**Wenn Cash da:**
10. Ahrefs/Semrush-Mini-Abo für Keyword-Tracking
11. Optional: Cloudinary-Integration für Auto-Bild-Optimierung

---

## Wer / Wann / Was — Commit-Karte

| Commit | Datum | Was |
|---|---|---|
| `811a658` | 2026-06-17 | TypeScript-Suite sauber (23 → 0 Fehler, 13 Dateien) |
| `20082b9` | 2026-06-17 | Stripe-Refund Auto-Trigger im Widerruf-Flow (5 Tests) |
| `b2c8140` | 2026-06-17 | Widerrufsformular-PDF (EGBGB Anlage 2) |
| `1b3ea85` | 2026-06-17 | Refund-Reminder § 357 BGB |
| `856dbc8` | 2026-06-17 | Customer-Widerruf-UI + Security-Gates + 12 Tests |
| `f3441bf` | 2026-06-17 | Withdrawal-Service + Endpoint |
| `9289977` | 2026-06-17 | markOrderDelivered Status-Guard (Bug-Fix) |
| `79885b7` | 2026-06-16 | Vitest-Suite mit 50 neuen Tests |
| `c82bfb2` | 2026-06-16 | Stage 4 Admin-Backend + Env-Hardening |
| `a15fa80` | 2026-06-16 | Stage 3 Post-Checkout |
| `5c8744e` | 2026-06-16 | Stage 2 Checkout-Flow |
| `fee493d` | 2026-06-15 | gitleaks pre-commit |

---

**Falls du in einer neuen Session weitermachst:** Lies diese Datei zuerst, dann `CLAUDE.md`, dann `docs/test-gaps.md`. Damit hast du den vollen Kontext.
