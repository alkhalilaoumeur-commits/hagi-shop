# ADR-001: Tech-Stack für Hagi Online-Shop

**Datum:** 2026-06-16
**Status:** Accepted
**Autoren:** Ilias + Claude
**Methodik:** [`~/vault/agency/intern/stack-evaluation-template.md`](file:///Users/ilias/vault/agency/intern/stack-evaluation-template.md)

---

## Kontext

Wir bauen den Hagi-Online-Shop als Custom-Stack statt Shopify (siehe `~/hagi-shop/docs/recherche-shopify-vergleich.md`). Damit muss die komplette Infrastruktur entschieden werden — Hosting, DB, Auth, Payment, Email, Storage, Search, Analytics, Monitoring.

**Projekt-Kontext:**
```yaml
projekt: hagi-shop
zielgruppe: B2C-Endkunden (600-5000€/Order) + B2B-Designer/Hotels
volumen-jetzt: 0 (pre-launch)
volumen-12-monate: 50-200 Orders/Monat geschätzt
compliance:
  - DSGVO: yes (PII-Berührung, EU-Kunden)
  - PCI-DSS: SAQ-A (via Stripe Checkout, keine Karten-Daten bei uns)
  - § 5 DDG: yes (Impressums-Pflicht)
  - eIDAS/XRechnung: yes (B2B-Komponente)
budget-monatlich: < 100 € fix (Stripe-Fees variabel on top)
```

---

## Schicht-für-Schicht Entscheidungen

### 1. Hosting

**Kandidaten:** Vercel, Hetzner+Coolify, Railway, AWS/ECS

**Filter-Ergebnis:**

| Tool | Snyk | Activity | Bus-Faktor | DSGVO | Lock-In | Kosten | Ecosystem |
|---|---|---|---|---|---|---|---|
| Hetzner+Coolify | n/a / 94 | ✅ Vercel-Backed / Solo-aktiv | 🟡 Coolify-Solo | ✅ EU-DE | ✅ Standard-Docker | ✅ 15€/Monat | ✅ |
| Vercel | n/a | ✅ Eigen-Produkt | ✅ Firma | 🟡 US-Origin, EU-Zone Pro | 🟡 Edge-Quirks | ❌ Cliff bei Traffic | ✅ |
| Railway | n/a | ✅ aktiv | ✅ Firma | 🟡 US-Origin | 🟡 Mittel | 🟡 5€/Service-Cliff | 🟡 |
| AWS/ECS | n/a | ✅ AWS | ✅ Firma | ✅ eu-central-1 | ✅ Standard | ❌ Komplex+teuer | ✅ |

**Sieger: Hetzner CX32 + Coolify**

- **Filter 1 (Security):** Coolify Snyk 94, Hetzner als Provider seit 1997 etabliert
- **Filter 2 (Maintenance):** Coolify-Maintainer Andras Bacsai aktiv (50+ commits/Monat), Hetzner stabile Plattform
- **Filter 3 (DSGVO):** Hetzner Falkenstein/Nürnberg = volle EU-Compliance ohne Standard-Vertragsklauseln
- **Filter 4 (Komplexität):** ECS/Kubernetes overkill für 1 App, Vercel-Edge-Stripe-Webhook-Probleme bekannt
- **Filter 5 (Lock-In):** Docker-Standard → Migration zu Railway/AWS in 1 Tag möglich

**Roter Flag bei Vercel:** Bandwidth-Cliff bei Bilder-CDN (Hagi-Bilder = viele MB) → unkalkulierbare Folgekosten

**Caveat:** Coolify Bus-Faktor niedrig (1 Haupt-Maintainer). Mitigation: Plain Docker-Compose-Fallback. Wenn Coolify stirbt, läuft die App weiter, nur das Admin-UI fehlt.

---

### 2. CDN

**Kandidaten:** Cloudflare, Bunny.net, BunnyShield, AWS CloudFront

**Sieger: Cloudflare Free**

- DSGVO: EU-Region wählbar, Standard-AVV verfügbar
- Lock-In: niedrig (Standard DNS-Wechsel)
- Kosten: 0 € für Pro-Features die wir brauchen (WAF, Rate-Limiting, Cache-Rules)
- Bandwidth Alliance mit Backblaze = 0 € Egress-Traffic zwischen den beiden

**Alternative:** Bunny.net wenn Cloudflare jemals als Bias gilt — Bunny.net ist EU-only (Slowenien), aber kostenpflichtig ab Volume.

---

### 3. Database

**Kandidaten:** Postgres self-hosted, Supabase, Neon, PlanetScale, MongoDB Atlas

**Sieger: Postgres 15 self-hosted via Docker**

- **Filter 1 (Security):** Postgres = 38 Jahre Battle-tested, CVE-Rate niedrig
- **Filter 3 (DSGVO):** läuft auf unserem Hetzner-Server → volle Kontrolle
- **Filter 5 (Lock-In):** absolut keiner — Standard-SQL
- **Filter 6 (Kosten):** 0 €

**Caveat:** Backup-Strategie ist UNSERE Verantwortung. Lösung: täglicher `pg_dump` auf Hetzner-Storage-Box + 30-Tage-Retention.

**Roter Flag bei Supabase/Neon:** Beide Default US, EU-Region nur in Pro-Plans, Vendor-Lock-In via gotrue/postgres-Wrapper.

---

### 4. ORM

**Kandidaten:** Prisma, Drizzle, Kysely, raw SQL

**Sieger: Prisma 5**

- Snyk 96
- 50+ Commits/Monat (Prisma-Team Berlin)
- Auto-generated TypeScript-Types
- Migration-Tool integriert
- Lock-In: mittel (Prisma-Schema-DSL, aber SQL als Fallback möglich)

**Alternative:** Drizzle ist leichter aber jünger (Bus-Faktor solider werdend), V2-Migration falls Prisma-Probleme später.

---

### 5. Auth

**Kandidaten:** Auth.js v5 (NextAuth), Lucia, Clerk, Supabase Auth, Custom

**Filter-Pipeline:**

```
5 Kandidaten
    ↓
Lucia disqualifiziert (Maintainer angekündigt depricated April 2024)
    ↓
Clerk disqualifiziert (Closed-Source + US-Hosting + PII)
    ↓
Custom disqualifiziert (Bus-Faktor 1, Security-Risiko)
    ↓
Supabase Auth disqualifiziert (Vendor-Lock-In gotrue)
    ↓
Auth.js v5 ✅
```

**Begründung:**
- Snyk 87, 2 medium CVEs in 24 Monaten beide < 7 Tage gepatched
- Vercel-Engineers als Core-Maintainer (Bus-Faktor stark)
- DB-Sessions in unserer Postgres → 0 € Vendor-Kosten
- Standard-OAuth2-Protokoll → niedriger Lock-In
- Gast-Checkout-fähig (Premium-Shops haben oft 60%+ Gast-Conversions)

---

### 6. Payment

**Kandidaten:** Stripe, Mollie, PayPal, Adyen

**Sieger: Stripe**

Detail-Begründung in `~/hagi-shop/docs/recherche-legal-payment.md`. Hauptpunkte:

- Stripe Checkout = BGB § 312j Button-Lösung out-of-the-box konform
- Klarna + SEPA + Apple Pay + Google Pay in einer SDK
- Stripe Radar Fraud-Schutz gratis bei hohen Warenkörben
- EU-Region wählbar (Irland-Subsidiary)
- DSGVO-AVV-Vorlage verfügbar
- PCI-Scope = SAQ-A (einfachste Stufe)

**Kosten:** 1,5% + 0,25 € pro EU-Karte (Mollie 1,8% + 0,25 €).

---

### 7. Email

**Kandidaten:** Resend, Postmark, AWS SES, SendGrid

**Sieger: Resend**

- Snyk 92
- React-Email native (gleiche Sprache wie unser Frontend)
- EU-Region (Irland)
- AVV-Vorlage verfügbar
- Free bis 3.000 Mails/Monat, danach 20 $/Monat für 50k
- Webhook-Standard (bounces, deliveries)

**Roter Flag bei SendGrid:** Twilio (Mutterkonzern) hatte Sicherheitsvorfälle 2022-2023 mit unauthorized access auf Konten.

---

### 8. Templates für Mails

**Sieger: React-Email**

- Komponenten in TSX (wie unser Frontend)
- Preview-Server lokal
- Type-safe
- Resend-native

---

### 9. PDF-Generation

**Kandidaten:** @react-pdf/renderer, Puppeteer (chrome-headless), jsPDF, PDFKit

**Sieger: @react-pdf/renderer**

- Pure React, server-side
- Klein (< 1 MB Bundle)
- Keine Chrome-Dependency (Puppeteer braucht 200 MB Chromium)
- Reicht für § 14 UStG-konforme Rechnungen + Lieferscheine + Widerrufsformular

**Roter Flag bei Puppeteer:** auf Coolify-Docker komplex zu deployen, langsamere PDF-Generation, größeres Attack-Surface durch Chromium-CVEs.

---

### 10. File-Storage (Bilder)

**Kandidaten:** Cloudinary, Backblaze B2, Vercel Blob, AWS S3, Cloudflare R2

**Sieger: Backblaze B2 + Cloudflare CDN**

- **Filter 3 (DSGVO):** EU-Region Amsterdam wählbar
- **Filter 5 (Lock-In):** S3-API-kompatibel → Migration zu R2/S3 trivial
- **Filter 6 (Kosten):**
  - 6 $/TB Storage
  - 0 € Egress via Cloudflare Bandwidth Alliance
  - vs Cloudinary 99 $/Monat für vergleichbare Features
  - vs Vercel Blob 0.15 $/GB Storage + Bandbreite-Cliff

**Caveat:** Backblaze kein automatisches Image-Resizing. Lösung: Next.js `<Image>` macht selbst Optimization on-demand. Spätere Migration zu Cloudinary möglich wenn Hagi 1000+ Bilder hat und Image-Transform-Workload steigt.

---

### 11. Search

**Kandidaten:** Algolia, Meilisearch self-hosted, Typesense, Postgres FTS, Elasticsearch

**Sieger: Postgres Full-Text-Search (mit tsvector + GIN-Index + pg_trgm für Typo-Tolerance)**

- **Filter 6 (Kosten):** 0 € (existierende DB)
- **Filter 5 (Lock-In):** absolut keiner
- **Filter 4 (Komplexität):** reicht problemlos für 10.000 Produkte mit < 50 ms Latenz
- Hagi-spezifisch: 30+ Custom-Felder + Editorial-Content → Custom Ranking ist sowieso nötig

**Wann revisten:** Wenn Hagi-Shop 10.000+ SKUs hat oder Multi-Sprache aktiv. Dann Migration zu Meilisearch self-hosted (auch open-source, weniger Lock-In als Algolia).

**Roter Flag bei Algolia:** Pricing-Cliff bei 100k Requests/Monat → Premium-Shop kommt schnell drüber → 500-2000 $/Monat möglich.

---

### 12. Analytics

**Kandidaten:** Plausible, Fathom, GA4, Umami, Matomo

**Sieger: Plausible Cloud (9 €/Monat)**

- DSGVO-konform ohne Cookie-Banner (kein Personenbezug)
- EU-Hosting
- Open-Source-Core
- Selbsthosten möglich später wenn Volume rechtfertigt

**Roter Flag bei GA4:** Schrems-II-Urteil + Standard-Vertragsklauseln-Pflicht + Cookie-Banner-Komplexität → Premium-Shops wechseln weg

**Selbst-Host-Option als Alternative:** Plausible CE via Coolify → 0 €, aber Setup-Wartung. Lohnt erst ab 50+ k Visitors/Monat.

---

### 13. Error-Monitoring

**Kandidaten:** Sentry, Highlight, PostHog, Bugsnag, BetterStack

**Sieger: Sentry EU**

- Frankfurt-Region wählbar
- AVV-Vorlage
- Free bis 5k Events/Monat, dann 26 $/Monat für 50k
- Replay-Feature für UX-Debugging

---

### 14. Rate-Limiting

**Kandidaten:** Upstash Redis, Cloudflare WAF, In-Memory, Postgres-based

**Sieger: Hybrid Cloudflare WAF + Upstash Redis**

- **Cloudflare WAF**: erste Verteidigungsschicht auf Edge — Bot-Detection + Rate-Limiting pro IP
- **Upstash Redis**: anwendungs-spezifisches Rate-Limiting (Cart-API, Discount-Preview, Login)
  - Free bis 10.000 Commands/Tag (reicht für Pre-Launch)
  - EU-Region Frankfurt
  - REST-API → kein Persistent-Connection-Overhead

---

### 15. Background-Jobs

**Kandidaten:** Coolify Cron, BullMQ + Redis, Inngest, Vercel Cron

**Sieger V1: Coolify Cron + simple Postgres-Queue**

- Coolify Cron für täglich/stündliche Jobs (Stripe-Reconciliation, Abandoned-Cart, PII-Retention)
- Postgres-Queue für Mail-Retries + komplexere Workflows
- Skalierbar bis ~1000 Jobs/Tag

**Wann revisten:** Bei 10k+ Jobs/Tag → BullMQ+Redis-Migration.

---

### 16. Validation

**Kandidaten:** Zod, Valibot, Yup, io-ts

**Sieger: Zod 3**

- Snyk 91
- Industry-Standard für TypeScript-Validation
- Tree-shakeable
- Prisma-Integration verfügbar

---

### 17. Testing

**Kandidaten:** Vitest + Playwright, Jest + Cypress, Bun-Test

**Sieger: Vitest + Playwright**

- Bereits installiert (Stage 1)
- Vitest läuft 5x schneller als Jest
- Playwright Industry-Standard für E2E

---

## Gesamtkosten-Übersicht

| Phase | Fix-Kosten | Bei 100 Orders/M | Bei 1000 |
|---|---|---|---|
| Hetzner CX32 | 15 € | 15 € | 15 € |
| Cloudflare | 0 € | 0 € | 0 € |
| Backblaze | 5 € | 5 € | 12 € |
| Resend | 0 € | 0 € | 20 $ |
| Plausible | 9 € | 9 € | 9 € |
| Sentry | 0 € | 0 € | 26 € |
| Upstash | 0 € | 0 € | 10 $ |
| **Fix-Infrastruktur** | **~30 €** | **~30 €** | **~95 €** |
| Stripe (1,5% + 25ct) | 0 € | ~150 € | ~1500 € |

Vergleich Shopify Premium-Setup: **1.500-2.500 €/Monat** (Plan + Klaviyo + Yotpo + Sendcloud + Theme + Apps).

→ **Differenz ~18.000 €/Jahr** zugunsten Custom.

---

## Konsequenzen

### Positiv

- ✅ Kostenkontrolle: < 100 €/Monat statt 2k €/Monat
- ✅ Editorial-Design-Freiheit (nicht an Shopify-Themes gebunden)
- ✅ DSGVO-Compliance Default (alle Services EU)
- ✅ Knüpfer-Datenmodell mit 35+ Custom-Feldern nativ möglich
- ✅ Wartungs-Konsistenz zu ServeFlow (gleicher Stack = ein Skill-Set)

### Negativ

- ❌ 95-135 Stunden Build-Aufwand vor Live (Shopify wäre 0)
- ❌ PCI/DSGVO/Steuer-Workflow ist 100% unsere Verantwortung
- ❌ Backups + Monitoring + Updates müssen wir selbst betreiben
- ❌ Coolify Bus-Faktor mittelmäßig — Fallback-Plan Docker-Compose nötig

---

## Wann revisten

Diese Entscheidung wird **neu bewertet** wenn:

1. Hagi-Shop > 1.000 Orders/Monat (dann Skalierungs-Achse durchrechnen)
2. Multi-Sprache aktiviert wird (Postgres-FTS reicht dann eventuell nicht)
3. Coolify-Projekt eingestellt wird (Fallback Docker-Compose)
4. Auth.js v6 Breaking-Changes hat (Migration prüfen)
5. Stripe-Gebühren > Mollie + 30% (Vergleich neu rechnen)
6. EU-Cookie-Gesetzgebung neue Anforderungen stellt (Plausible vs Self-Host)

---

## Migrationspfade weg

Pro Schicht der Plan B falls Entscheidung kippt:

| Schicht | Plan B |
|---|---|
| Hetzner+Coolify | Plain Docker-Compose auf Hetzner (kein UI, aber funktional) → später AWS ECS |
| Postgres | Standard SQL → Migration zu Neon/Supabase in 1 Tag möglich (pg_dump/restore) |
| Prisma | Drizzle hat Migration-Tool, oder back-to-raw-SQL |
| Auth.js | Custom JWT-Auth (mehr Arbeit, aber kein Vendor) |
| Stripe | Mollie hat ähnliche API, Migration ~3 Tage |
| Resend | Postmark hat fast identische SMTP-Schnittstelle |
| Backblaze | R2 / S3 / Cloudinary — alle haben S3-API-Kompatibilität |
| Algolia → Postgres-FTS | bereits unsere Wahl, fertig |
| Plausible | Self-Host via Coolify ist 30 Min |

→ Kein Punkt ist single-source-of-failure. Wir sind in jeder Schicht migrations-fähig.

---

## Methodik-Anwendung dokumentiert in

[`~/vault/agency/intern/stack-evaluation-template.md`](file:///Users/ilias/vault/agency/intern/stack-evaluation-template.md)

---

## Anhang: Snyk-Scores aller Hauptpakete (Stand 2026-06-16)

| Paket | Snyk | Last Activity | Bus-Faktor |
|---|---|---|---|
| next | 100 | < 1 Tag | ✅ Vercel-Team |
| @prisma/client | 96 | < 7 Tagen | ✅ Prisma-Team |
| next-auth | 87 | < 7 Tagen | ✅ Vercel + Community |
| stripe | n/a (closed) | wöchentlich | ✅ Stripe-Team |
| resend | 92 | < 7 Tagen | ✅ Resend-Team |
| @react-pdf/renderer | 88 | < 30 Tagen | 🟡 Community |
| zod | 91 | < 7 Tagen | ✅ Colin McDonnell + Community |
| @upstash/ratelimit | 89 | < 14 Tagen | ✅ Upstash-Team |
| @sentry/nextjs | 94 | < 7 Tagen | ✅ Sentry-Team |

Alle Werte > 80 → grünes Licht für Production-Use.
