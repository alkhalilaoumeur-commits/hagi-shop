# Hagi Online-Shop

> Premium-Direktimporteur für handgeknüpfte Orientteppiche · Stuttgart
> B2C-Endkunden (600-5000 €/Order) + B2B-Innenarchitekten/Hotels
> Custom-Stack (Next.js + Stripe + Postgres) statt Shopify · ~30 €/Monat Infrastruktur

---

## Briefing für den Kollegen

Wenn du diesen Repo zum ersten Mal siehst, lies in dieser Reihenfolge:

1. **Dieser README** (5 Min) — High-Level was wir bauen, warum, wo der Stand ist
2. **[`docs/WORKFLOWS.md`](docs/WORKFLOWS.md)** (30 Min) — 17 Workflows mit Risiken + Security-Maßnahmen
3. **[`docs/adr/adr-001-tech-stack.md`](docs/adr/adr-001-tech-stack.md)** (15 Min) — Vollständige Tech-Stack-Begründung
4. **[`docs/security-audit-stage-1.md`](docs/security-audit-stage-1.md)** (10 Min) — Security-Audit der Foundation
5. **[`docs/recherche-shopify-vergleich.md`](docs/recherche-shopify-vergleich.md)** (optional, 20 Min) — Warum Custom statt Shopify

Live-Playbook lokal nach `npm run dev`: <http://localhost:3000/playbook>

---

## Vision

**Hagi-Shop ist ein Premium-Direktimporteur** für handgeknüpfte Orientteppiche aus Stuttgart. Es ist **nicht** ein generischer Teppich-Shop — es ist ein editorial-luxuriöses Schaufenster für eine Familie, die seit 2003 viermal im Jahr persönlich in den Orient reist und Teppiche direkt bei 47 Knüpfer-Familien kauft.

**Wichtige Positionierungs-Entscheidungen:**

- **Knüpfer-Portrait pro Teppich** als einzigartiger USP (keiner der recherchierten Konkurrenten macht das konkret) — Datenmodell hat `weaverName`, `weaverStory`, `workshop`
- **Editorial-Luxury Design** statt klassisches E-Commerce-Grid — Magazine-Look mit Playfair Display + Italianno-Script + Bone/Sienna/Brass-Palette
- **B2C + B2B Hybrid** — Endkunden + Innenarchitekten/Hotels (Schema unterstützt `isB2B`, `vatId`, Reverse-Charge)
- **Showroom Stuttgart als physisches Trust-Element** — Termin-Buchung + Pickup-Option im Checkout
- **Sonderanfertigung als spezielle Order-Klasse** (kein Widerruf nach EuGH 2026)

Vollständige Markt- und Konkurrenz-Recherche:
- [`docs/recherche-branche.md`](docs/recherche-branche.md) (7 Premium-Teppich-Shops analysiert)
- [`docs/recherche-top-shops.md`](docs/recherche-top-shops.md) (13 Premium-E-Commerce inkl. Aesop, Hermès, Acne, Mejuri, Kith)
- [`docs/recherche-trust-ux.md`](docs/recherche-trust-ux.md) (Trust-Elemente + Anti-Patterns)

---

## Tech-Stack (verbindlich)

Vollständige Begründung pro Schicht: [`docs/adr/adr-001-tech-stack.md`](docs/adr/adr-001-tech-stack.md)

| Schicht | Wahl | Begründung |
|---|---|---|
| **Framework** | Next.js 14 App Router | React Server Components, Standard, etabliert |
| **Sprache** | TypeScript strict | Type-Safety pflicht |
| **Styling** | Tailwind CSS v3 | nicht v4 — Premium-Komponenten sind getestet |
| **DB** | Postgres 15 (self-hosted) | volle Kontrolle, 0 € Vendor-Kosten |
| **ORM** | Prisma 5 | Snyk 96, TypeScript-Types, Migrations |
| **Auth** | Auth.js v5 (NextAuth) | Open-Source, DB-Sessions, kein Vendor-Lock-In |
| **Payment** | Stripe | BGB § 312j konform, Klarna/SEPA inkl. |
| **Email** | Resend + React-Email | EU-Region, React-Templates, Snyk 92 |
| **PDF** | @react-pdf/renderer | Pure React, klein, kein Chrome-Overhead |
| **Storage** | Backblaze B2 + Cloudflare CDN | S3-API, EU Amsterdam, 0 € Egress |
| **Search** | Postgres FTS | tsvector + GIN-Index, reicht für 10k+ Produkte |
| **Hosting** | Hetzner CX32 + Coolify | EU-DE, Docker-Standard, ~15 €/Monat |
| **CDN** | Cloudflare Free | WAF + Rate-Limiting + Bandwidth-Alliance |
| **Analytics** | Plausible Cloud (9 €/Mo) | DSGVO-konform ohne Cookie-Banner |
| **Error-Monitoring** | Sentry EU | Frankfurt-Region, Free bis 5k Events |
| **Rate-Limiting** | Cloudflare WAF + Upstash Redis | gestuft, EU Frankfurt |
| **Background-Jobs** | Coolify Cron + Postgres-Queue | reicht V1 |
| **Validation** | Zod 3 | Industry-Standard |
| **Testing** | Vitest + Playwright | bereits installiert |

**Kosten:**
- Fix: ~30 €/Monat
- Bei 1000 Orders/Monat: ~95 €/Monat fix + Stripe-Fees
- Vergleich Shopify Premium-Setup: 1.500-2.500 €/Monat

**Stack-Evaluation-Methodik:** [`~/vault/agency/intern/stack-evaluation-template.md`](https://github.com/) (extern, nicht in Repo) — 7-Achsen-Bewertung für Future-Entscheidungen.

---

## Aktueller Stand (Stand 2026-06-16)

### ✅ Done (Stage 1 Foundation)

**Storefront (80% fertig):**
- Editorial-Hero mit 3D-Coverflow-Carousel + Italianno-Script-Akzent
- Trust-Strip mit 4 USP-Icons
- Bestseller-Cards mit Progressive-Blur-Hover (Pulcinella-Pattern)
- Why-Hagi Image-Accordion (5 USP-Panels, hover-expand 60px → 400px)
- Shop mit 6-Achsen-Filter + 3 Sortier-Modi
- Produkt-Detail komplett: Story + Datenblatt (30+ Felder) + Knüpfer-Portrait + Pflege + Echtheits-Zertifikat
- Showroom-Seite mit Adresse + 4 Services + Termin-Form
- Pflege-Ratgeber (6 Sektionen + 5 FAQ)
- Über-uns mit Heritage-Timeline
- Reviews + Stats + WhatsApp-Floating (Bodenbild-Mona-Pattern)
- Editorial-Luxury Bone-Beige-Sienna-Brass-Palette
- Mobile-optimiert + responsive

**Backend Foundation (Stage 1):**
- Prisma-Schema: 11 neue Modelle (Customer, Order, OrderItem, Fulfillment, Refund, Discount, ShippingZone, PaymentEvent, AuditLog, ConsentLog, OrderCounter) + 7 Enums
- 3 orthogonale Order-Status-Felder (OrderStatus / PaymentStatus / FulfillmentStatus)
- Komplette PII-Snapshots auf Order (DSGVO + 10-Jahre-Buchhaltungspflicht)
- AGB/Datenschutz/Widerruf-Versionierung via Consent-Log

**Service-Layer (9 Services):**
- `lib/security/tokens.ts` — crypto.randomBytes + SHA-256 + timingSafeEqual
- `lib/security/email.ts` — RFC-5321-konforme Email-Normalisierung
- `lib/services/order-numbering.ts` — atomare Order-Nummer (HAG-2026-000042)
- `lib/services/tax.ts` — Kleinunternehmer + Standard + Reverse-Charge, Fail-Fast in Production
- `lib/services/cart.ts` — Anti-Tampering Cart-Validation (Preis immer aus DB)
- `lib/services/discount.ts` — Atomarer Redeem mit `updateMany`-Lock (race-condition-frei)
- `lib/services/shipping.ts` — Zonen-Lookup + Free-Shipping-Threshold
- `lib/services/webhook-dedup.ts` — Stripe-Webhook-Dedup mit Create-First-Pattern
- `lib/services/audit.ts` + `lib/services/consent.ts` — DSGVO + Buchhaltung

**Tests:**
- 61/61 grün (36 Foundation + 25 Security-Re-Audit)
- Inkl. Race-Condition-Test: 5 parallele Discount-Redeems → exakt 3 OK, 2 LIMIT_REACHED

**Security:**
- Voller Audit Stage 1 dokumentiert in [`docs/security-audit-stage-1.md`](docs/security-audit-stage-1.md)
- 3 HIGH + 4 MEDIUM Findings — **alle gefixt**
- Custom-Auth-Bypass + SQL-Injection-Tests laufen grün

**Dokumentation:**
- 8 Recherche-Dokumente (Branche, Datenmodell, Shopify-Vergleich, Trust-UX, Legal/Payment)
- ADR-001 Tech-Stack (komplette Begründung)
- Operations-Playbook mit 17 Workflows ([`docs/WORKFLOWS.md`](docs/WORKFLOWS.md))
- Live-Playbook-Board als interne Seite (`/playbook`)

### 🚧 In Progress

- Email-Templates (Resend) — 2 von ~7 fertig (Bestellbestätigung + Tracking)
- Datenbank-Härtung (7 Schichten) — Plan steht, Implementierung folgt

### 📋 Planned (siehe [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md))

**Stage 2 — Checkout-Flow:**
- Warenkorb-Page Editorial-Redesign
- Checkout-Seite mit Adresse + Versand + Discount + Pickup
- Stripe Checkout Sessions + Webhook-Handler
- DSGVO-Cookie-Banner mit Consent-Gating
- B2B-Felder + Sonderanfertigung-Checkbox

**Stage 3 — Post-Checkout:**
- Order-Confirmation-Page
- Auto-Email-Trigger (alle 7 Mail-Typen)
- Tracking-Status-Page mit Token-URL
- PDF-Rechnung + Lieferschein (§ 14 UStG-konform)

**Stage 4 — Returns + Admin:**
- Self-Service-Widerruf-Portal
- Admin-Dashboard für Orders
- Manuelle Order (Showroom-Walk-in)
- CSV-Export für Steuerberater

**Stage 5 — Shop-Discovery + Compliance:**
- Postgres Full-Text-Search erweitert
- Pflicht-Seiten (Impressum mit § 5 DDG, AGB, Widerruf, Datenschutz)
- Abandoned-Cart-Cron
- DSGVO-Auskunft + Löschung

**Stage 6 — Premium-Differenziatoren:**
- AR/Room-Visualizer (Roomvo oder @google/model-viewer)
- "Teppich-Muster kostenlos anfordern"
- Wishlist (LocalStorage + Email)

---

## Workflows + Risiken + Security

**17 Workflows** vollständig dokumentiert in [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md) und im Live-Playbook (`/playbook`):

| # | Workflow | Kategorie | Status |
|---|---|---|---|
| 01 | Tech-Stack-Foundation | System | ✅ |
| 02 | Datenbank-Härtung (7 Schichten) | Compliance | 🚧 |
| 03 | Browse & Discovery | Customer | ✅ |
| 04 | Produkt-Detail-View | Customer | ✅ |
| 05 | Cart-Hinzufügen | Customer | 🚧 |
| 06 | Checkout (Adresse + Versand) | Customer | 📋 |
| 07 | Stripe-Zahlung + Webhook | System | 📋 |
| 08 | Order-Confirmation | Customer | 📋 |
| 09 | Tracking-Status | Customer | 📋 |
| 10 | PDF-Rechnung | System | 📋 |
| 11 | Widerruf-Portal | Customer | 📋 |
| 12 | Admin-Dashboard Orders | Admin | 📋 |
| 13 | Manuelle Order (Showroom) | Admin | 📋 |
| 14 | Email-Versand (Resend) | System | 🚧 |
| 15 | Spedition Großteppich | Admin | 📋 |
| 16 | DSGVO-Auskunft + Löschung | Compliance | 📋 |
| 17 | Background-Jobs (Cron) | System | 📋 |

**Risiken-Gesamtbild:**
- 42+ Risiken identifiziert
- davon ~15 HIGH-Severity
- Mitigation-Status sichtbar pro Risiko

**Wie wir mit dem Playbook arbeiten:**
1. `data.ts` ist die **Single Source of Truth**
2. Live-Board unter `/playbook` zeigt es interaktiv
3. `WORKFLOWS.md` wird per Skript daraus generiert (`npx tsx scripts/export-playbook.ts`)
4. Bei Änderung: erst `data.ts` editieren, dann Skript neu laufen lassen

---

## DB-Security: 7 Härtungsschichten

Wir nutzen **eine** Postgres-DB für alles (Customer + Auth + Orders + AuditLog). Das ist Industry-Standard für Premium-Shops. Sicherheit kommt **nicht** durch DB-Trennung, sondern durch **Defense in Depth**:

1. **Network-Isolation** — Postgres lauscht nur auf 127.0.0.1, Cloudflare WAF davor
2. **Application-Isolation** — Next.js als non-root, 3 DB-User getrennt (app/migrate/readonly)
3. **Encryption-at-Rest** — Hetzner LUKS Disk-Encryption + pgcrypto für sensitive Felder
4. **Encryption-in-Transit** — Postgres TLS Pflicht (kein Cleartext)
5. **Backup-Encryption** — pg_dump GPG-verschlüsselt + separater Backblaze-Bucket
6. **Audit-Trail** — App-AuditLog (implementiert) + Postgres log_connections
7. **Secrets-Management** — Coolify ENV-Vars + 90-Tage-Rotation + gitleaks pre-commit

Vollständige Details: Workflow `w-db-security` in [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md)

**Plus Bonus-Schichten:**
- argon2id für Passwort-Hashing (nicht bcrypt)
- 2FA-Pflicht für Admin-Login (Hagi)
- Rate-Limit auf Login (5 Versuche → Lock)

---

## Setup (lokal entwickeln)

### Voraussetzungen

- Node.js 20+
- PostgreSQL 15 lokal (Docker reicht: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:15`)
- npm

### Installation

```bash
git clone <repo-url>
cd hagi-shop
npm install
cp .env.example .env  # ENV-Werte anpassen
npx prisma db push
npx tsx prisma/seed.ts
npx tsx prisma/seed-shop-config.ts
npm run dev
```

Aufrufen: <http://localhost:3000>
Playbook: <http://localhost:3000/playbook>

### Tests laufen lassen

```bash
npx tsx scripts/test-stage-1.ts          # 36 Foundation-Tests
npx tsx scripts/test-stage-1-security.ts # 25 Security-Tests
```

### Playbook regenerieren

```bash
npx tsx scripts/export-playbook.ts  # → docs/WORKFLOWS.md
```

---

## Dateistruktur

```
hagi-shop/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Storefront-Home
│   ├── produkte/                 # Shop + Produkt-Detail
│   ├── showroom/                 # Termin-Buchung
│   ├── pflege/                   # SEO-Ratgeber
│   ├── ueber-uns/                # Heritage-Story
│   ├── playbook/                 # Internes Operations-Board
│   └── api/                      # API-Routes
│
├── components/                   # React-Komponenten
│   ├── home/                     # Hero, Carousel, Why-Accordion, Reviews
│   ├── shop/                     # ProductCard, ShopFilter, Gallery
│   ├── layout/                   # Navbar, Footer, WhatsAppBerater
│   ├── playbook/                 # PlaybookBoard
│   └── ui/                       # ScrollReveal, ProgressiveBlur
│
├── lib/                          # Business-Logik
│   ├── prisma.ts                 # DB-Client
│   ├── playbook/                 # types + data für Workflows
│   ├── security/                 # tokens, email-normalization
│   └── services/                 # cart, tax, shipping, discount, audit, consent, webhook-dedup
│
├── prisma/
│   ├── schema.prisma             # Vollständiges DB-Schema
│   ├── seed.ts                   # Produkte + Kategorien
│   └── seed-shop-config.ts       # Versandzonen + Test-Discounts
│
├── scripts/
│   ├── test-stage-1.ts           # Foundation-Smoke-Tests
│   ├── test-stage-1-security.ts  # Security-Smoke-Tests
│   └── export-playbook.ts        # data.ts → WORKFLOWS.md
│
├── docs/
│   ├── adr/
│   │   └── adr-001-tech-stack.md
│   ├── WORKFLOWS.md              # ← Generiert aus data.ts
│   ├── security-audit-stage-1.md
│   ├── pflicht-seiten-hagi.md
│   ├── bewertung-online-store.md
│   ├── recherche-branche.md
│   ├── recherche-datenmodell.md
│   ├── recherche-datenmodell-ecommerce.md
│   ├── recherche-shopify-vergleich.md
│   ├── recherche-top-shops.md
│   ├── recherche-trust-ux.md
│   └── recherche-legal-payment.md
│
├── README.md                     # ← Diese Datei
└── SETUP.md                      # Detail-Setup-Guide
```

---

## Compliance-Pflichten (DE, 2026)

Vollständige Recherche: [`docs/recherche-legal-payment.md`](docs/recherche-legal-payment.md)

**Schon im Code adressiert:**
- ✅ BGB § 312j Button-Lösung (via Stripe Checkout)
- ✅ AGB/Datenschutz/Widerruf-Versionierung (ConsentLog)
- ✅ PII-Snapshots auf Order (10-Jahre AO §147)
- ✅ DSGVO-Soft-Delete (Customer.deletedAt + anonymizedAt)
- ✅ PCI-DSS SAQ-A (Karten-Daten gehen nie durch unseren Server)
- ✅ Tax-Mode konfigurierbar (Kleinunternehmer § 19 UStG ↔ Standard 19%)

**Hagi-Aufgaben vor Live-Schaltung:**
- 📋 USt-ID beim BZSt beantragen (4-8 Wochen Wartezeit)
- 📋 LUCID + duales System anmelden
- 📋 Stripe-Konto KYC-Aktivierung
- 📋 Resend-Domain SPF/DKIM/DMARC
- 📋 Stammdaten für Impressum (siehe [`docs/pflicht-seiten-hagi.md`](docs/pflicht-seiten-hagi.md))
- 📋 IT-Recht-Kanzlei-Abo für AGB-Pflege (~10 €/Monat)
- 📋 Steuerberater: Kleinunternehmer vs Regelbesteuerung entscheiden

**Wichtige rechtliche Änderungen die viele übersehen:**
- ⚠️ **OS-Plattform-Link abgeschafft** seit 20.7.2025 — NICHT in Footer
- ⚠️ **§ 5 DDG** ersetzt seit 2024 § 5 TMG im Impressum
- ⚠️ **Sonderanfertigung = kein Widerruf** (EuGH 2026)
- ⚠️ **Sofortüberweisung** aufgegangen in Klarna seit 31.3.2025

---

## Was bewusst NICHT im Stack ist

- ❌ Shopify (Vergleich: [`docs/recherche-shopify-vergleich.md`](docs/recherche-shopify-vergleich.md))
- ❌ GraphQL (Server Actions + REST reichen)
- ❌ Microservices (eine App, kein Bedarf)
- ❌ Kubernetes (Coolify reicht)
- ❌ Edge-Runtime (instabil mit Prisma)
- ❌ Headless CMS (Sanity/Strapi) — Storytelling-Content im Code
- ❌ Supabase/Neon (Vendor-Lock-In + DSGVO-Fragezeichen)

---

## Wer ist beteiligt

- **Ilias** (Inhaber DRVN) — Produkt-Owner, Tech-Lead, Frontend, Schreibt mit Claude Code
- **Claude** (Anthropic) — Coding-Partner, Recherche, Code-Review, Security-Audits
- **Kollege** (du, der das hier liest) — Code-Review, Second-Pair-of-Eyes, Quality-Check
- **Hagi** — Inhaber des realen Teppich-Shops in Stuttgart (Kunde + Domain-Experte, liefert Stammdaten + Bilder)

**Wie wir arbeiten:**
- Bauen erst, dann auditieren. Nicht endlos planen.
- Jede Stage hat Smoke-Tests die grün sein müssen
- Security-Audits durch separates Agent vor "Done"
- Workflows + Risiken werden im Playbook permanent gepflegt

---

## Lizenz + Vertraulichkeit

**Privat.** Dieser Code enthält Geschäfts-Logik, Strategie-Dokumente und Hagi-spezifische Daten. Nicht öffentlich teilen.

Pull Requests + Issues + Reviews willkommen — aber nicht Forks publizieren.
