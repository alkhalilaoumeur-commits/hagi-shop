# Hagi Shop — Workflows, Risiken, Security-Maßnahmen

**Letztes Update:** 2026-06-16
**Quelle:** `lib/playbook/data.ts` · **Live-Board:** [/playbook](http://localhost:3002/playbook)

Diese Datei wird automatisch generiert. **Nicht direkt editieren.**
Änderungen in `lib/playbook/data.ts` und `npx tsx scripts/export-playbook.ts` ausführen.

## Übersicht

| Metrik | Wert |
|---|---|
| Workflows total | 17 |
| Done | 3 |
| In Progress | 3 |
| Planned | 11 |
| Risiken total | 45 |
| Risiken hoch | 19 |
| Risiken gefixt | 9 / 45 |

## Workflow-Verzeichnis

| # | Titel | Kategorie | Stage | Status | Risiken |
|---|---|---|---|---|---|
| 01 | [Tech-Stack-Foundation](#tech-stack-foundation) | System | Operations | ✅ Done | 1🔴 |
| 02 | [Datenbank-Härtung (7 Schichten)](#datenbank-hartung-7-schichten) | Compliance | Operations | 🚧 In Progress | 3🔴 |
| 03 | [Browse & Discovery](#browse-discovery) | Customer | Stage 1 · Foundation | ✅ Done | 1🟡 |
| 04 | [Produkt-Detail-View](#produkt-detail-view) | Customer | Stage 1 · Foundation | ✅ Done | 2🟡 |
| 05 | [Cart-Hinzufügen](#cart-hinzufugen) | Customer | Stage 2 · Checkout | 🚧 In Progress | 1🔴 |
| 06 | [Checkout (Adresse + Versand + Discount)](#checkout-adresse-versand-discount) | Customer | Stage 2 · Checkout | 📋 Planned | 2🔴 |
| 07 | [Stripe-Zahlung + Webhook](#stripe-zahlung-webhook) | System | Stage 2 · Checkout | 📋 Planned | 3🔴 |
| 08 | [Order-Confirmation (Page + Mail)](#order-confirmation-page-mail) | Customer | Stage 3 · Post-Checkout | 📋 Planned | 2🔴 |
| 09 | [Tracking-Status-Page](#tracking-status-page) | Customer | Stage 3 · Post-Checkout | 📋 Planned | 2🟢 |
| 10 | [PDF-Rechnung + Lieferschein](#pdf-rechnung-lieferschein) | System | Stage 3 · Post-Checkout | 📋 Planned | 2🔴 |
| 11 | [Widerruf / Rückgabe](#widerruf-ruckgabe) | Customer | Stage 4 · Admin | 📋 Planned | 2🟡 |
| 12 | [Admin-Dashboard Orders](#admin-dashboard-orders) | Admin | Stage 4 · Admin | 📋 Planned | 1🔴 |
| 13 | [Manuelle Order (Showroom-Walk-in)](#manuelle-order-showroom-walk-in) | Admin | Stage 4 · Admin | 📋 Planned | 1🔴 |
| 14 | [Email-Versand (Resend)](#email-versand-resend) | System | Stage 3 · Post-Checkout | 🚧 In Progress | 1🔴 |
| 15 | [Spedition für Großteppiche](#spedition-fur-grossteppiche) | Admin | Operations | 📋 Planned | 1🔴 |
| 16 | [DSGVO Auskunft + Löschung](#dsgvo-auskunft-loschung) | Compliance | Stage 5 · Compliance | 📋 Planned | 1🔴 |
| 17 | [Background-Jobs (Cron)](#background-jobs-cron) | System | Stage 5 · Compliance | 📋 Planned | 2🟡 |

---

# Workflows im Detail

## Tech-Stack-Foundation

**ID:** `w-tech-stack` · **Slug:** `tech-stack` · **Kategorie:** System · **Stage:** Operations · **Status:** ✅ Done

> Vollständiger Tech-Stack des Hagi-Shops. Entschieden durch 7-Achsen-Methodik (Snyk, Maintenance, Bus-Faktor, DSGVO, Lock-In, Kosten, Ecosystem). Dokumentiert in ADR-001.

**Trigger:** Foundation-Entscheidung (permanent gültig bis Revision)

### Schritte
1. Hosting: Hetzner CX32 + Coolify (~15€/Monat, EU-DE, Docker-Standard)
2. CDN: Cloudflare Free (WAF + Bandwidth Alliance mit Backblaze = 0€ Egress)
3. DB: Postgres 15 self-hosted (volle Kontrolle, 0€, Standard-SQL kein Lock-In)
4. ORM: Prisma 5 (Snyk 96, TypeScript-Types, Migration-Tool)
5. Auth: Auth.js v5 (Snyk 87, Vercel-backed, DB-Sessions in unserer Postgres)
6. Payment: Stripe (BGB § 312j konform, Klarna/SEPA/Apple Pay/Google Pay)
7. Email: Resend (EU-Region Irland, React-Email-native)
8. PDF: @react-pdf/renderer (pure React, klein, kein Chrome-Overhead)
9. Storage: Backblaze B2 + Cloudflare CDN (S3-API, EU Amsterdam)
10. Search: Postgres Full-Text-Search (GIN-Index + pg_trgm, reicht für 10k+ Produkte)
11. Analytics: Plausible Cloud 9€/Monat (DSGVO-konform, kein Cookie-Banner)
12. Error-Monitoring: Sentry EU (Frankfurt, Free bis 5k Events)
13. Rate-Limiting: Cloudflare WAF + Upstash Redis (gestuft)
14. Background-Jobs: Coolify Cron + Postgres-Queue
15. Validation: Zod 3 (TypeScript-Standard)
16. Testing: Vitest + Playwright

### Risiken (4)

#### 🟡 Mittel · Coolify Bus-Faktor mittelmäßig
**Mitigation-Status:** 📋 Planned

Coolify hat einen Haupt-Maintainer (Andras Bacsai). Wenn er aufhört, langfristige Maintenance unsicher.

- **Konsequenz:** Coolify-UI evtl. nicht mehr supported in 2-3 Jahren.
- **Maßnahme:** Fallback: plain Docker-Compose-Setup vorbereiten. Coolify ist UI, nicht Runtime — App läuft auch ohne weiter.

#### 🟢 Niedrig · Externe Vendor-Shutdowns
**Mitigation-Status:** ✅ Done · `docs/adr/adr-001-tech-stack.md`

Resend, Backblaze, Plausible — alles SaaS. Bei Shutdown brauchen wir Migration-Plan.

- **Konsequenz:** Service-Unterbrechung 1-3 Tage bei Notfall-Migration.
- **Maßnahme:** ADR-001 'Migrationspfade weg' definiert Plan B für jede Schicht. Alle nutzen Standard-APIs (S3, SMTP, REST).

#### 🟢 Niedrig · Kosten-Cliff bei Volumen-Skalierung
**Mitigation-Status:** ✅ Done · `docs/adr/adr-001-tech-stack.md`

Bei 1000+ Orders/Monat: Sentry 26€, Resend 20$, Upstash 10$ etc. = ~95€/Monat fix.

- **Konsequenz:** Kosten verdreifachen sich. Trotzdem 95% günstiger als Shopify.
- **Maßnahme:** Volumen-getriebene Re-Evaluation. ADR-001 dokumentiert 'Wann revisten'.

#### 🔴 Hoch · Selbst-Betrieb = unsere Verantwortung
**Mitigation-Status:** 📋 Planned

Backups, Updates, Monitoring, Security-Patches müssen wir selbst betreiben.

- **Konsequenz:** Bei Schlamperei: Datenverlust, Downtime, DSGVO-Verstoß.
- **Maßnahme:** Pflicht: täglicher pg_dump, GitHub Actions CI, Coolify Health-Checks, Sentry Release-Tracking. Plus Runbook für Incidents.

### Security-Maßnahmen (4)

- **✅ Done** · Alle Services EU-Region · `docs/adr/adr-001-tech-stack.md`
  Kein US-Provider für PII-Daten.
- **✅ Done** · Niedriger Lock-In pro Schicht · `docs/adr/adr-001-tech-stack.md`
  Jede Schicht hat dokumentierten Migrationspfad Plan B.
- **📋 Planned** · Snyk-Scores aller Pakete > 80
  Audit pro Quartal. Bei < 80: Alternative evaluieren.
- **📋 Planned** · GitHub Security Advisories aktiv
  Dependabot-Alerts für alle kritischen Pakete.

### Frontend-Auswirkungen (2)

- **✅ Done** · ADR-001 Tech-Stack
  Komplette Begründung pro Schicht inkl. Snyk-Scores und Migrationspfaden
- **✅ Done** · Stack-Evaluation-Template
  Wiederverwendbar für Future-Entscheidungen (vault)

### Code-Refs
- `docs/adr/adr-001-tech-stack.md`
- `~/vault/agency/intern/stack-evaluation-template.md`

### Offene Fragen
- ❓ Cloudinary statt Backblaze wenn Bilder-Volumen > 5 GB?
- ❓ Meilisearch self-host wenn Hagi > 1000 Produkte hat?

---

## Datenbank-Härtung (7 Schichten)

**ID:** `w-db-security` · **Slug:** `db-security-haertung` · **Kategorie:** Compliance · **Stage:** Operations · **Status:** 🚧 In Progress

> Single-Postgres-DB ist OK — aber nur mit Defense-in-Depth. 7 Härtungsschichten gegen DB-Breach. Industry-Standard bei Premium-Shops, nicht separate Auth-DB.

**Trigger:** Bei Production-Deployment + bei jeder Postgres-Konfig-Änderung

### Schritte
1. Schicht 1: Network-Isolation — Postgres lauscht nur auf 127.0.0.1, Cloudflare WAF davor
2. Schicht 2: Application-Isolation — Next.js als non-root, Least-Privilege DB-User (app/migrate/readonly getrennt)
3. Schicht 3: Encryption-at-Rest — Hetzner LUKS Disk-Encryption + pgcrypto für sensitive Felder
4. Schicht 4: Encryption-in-Transit — Postgres TLS Pflicht (keine Cleartext-Verbindungen)
5. Schicht 5: Backup-Encryption — pg_dump GPG-verschlüsselt + separater Backblaze-Bucket
6. Schicht 6: Audit-Trail — AuditLog für alle Admin-Aktionen + Postgres log_connections
7. Schicht 7: Secrets-Management — Coolify ENV-Vars + 90-Tage Password-Rotation

### Risiken (6)

#### 🔴 Hoch · Externer Zugriff auf Postgres-Port 5432
**Mitigation-Status:** 📋 Planned

Wenn Postgres öffentlich erreichbar, kann jeder Brute-Force versuchen.

- **Konsequenz:** Komplett-Kompromittierung möglich.
- **Maßnahme:** Schicht 1: Postgres bind 127.0.0.1, Firewall blockt Port 5432 extern.

#### 🔴 Hoch · App-User hat zu viele Rechte
**Mitigation-Status:** 📋 Planned

Wenn Prisma als 'postgres'-superuser läuft: SQL-Injection-Bug = DROP TABLE möglich.

- **Konsequenz:** Datenverlust + Buchhaltungs-Gap (10-Jahre AO §147).
- **Maßnahme:** Schicht 2: Eigener User 'hagi_app' mit nur SELECT/INSERT/UPDATE/DELETE. Migrationen via separatem 'hagi_migrate'-User.

#### 🔴 Hoch · Backup-Datei unverschlüsselt geleaked
**Mitigation-Status:** 📋 Planned

pg_dump.sql liegt auf Backup-Storage. Wenn Storage kompromittiert: alle PII liegen offen.

- **Konsequenz:** Massiver DSGVO-Verstoß. Bußgeld bis 4% Jahresumsatz.
- **Maßnahme:** Schicht 5: GPG-Verschlüsselung mit Master-Key offline. Backup-Bucket separater Backblaze-Account.

#### 🟡 Mittel · Postgres-Verbindung ohne TLS
**Mitigation-Status:** 📋 Planned

Wenn DB lokal aber TLS nicht erzwungen: Man-in-the-Middle möglich bei Container-Network.

- **Konsequenz:** Passwörter + Daten im Klartext auf Wire.
- **Maßnahme:** Schicht 4: Postgres ssl=on, hostssl in pg_hba.conf, DATABASE_URL mit sslmode=require.

#### 🟡 Mittel · DB-Password versehentlich im Code committed
**Mitigation-Status:** 📋 Planned

Junior-Fehler: Password in .env.example oder Dockerfile.

- **Konsequenz:** GitHub-Public: Bots scannen sofort, Postgres binnen Minuten kompromittiert.
- **Maßnahme:** Schicht 7: Pre-commit-Hook mit gitleaks. .env strikt gitignored. Coolify ENV-Vars.

#### 🟡 Mittel · Kein Audit bei DB-Änderungen
**Mitigation-Status:** 🚧 In Progress · `lib/services/audit.ts`

Wenn Hagi versehentlich (oder bewusst) Order ändert: kein Beweis was war.

- **Konsequenz:** Streitfälle nicht beweisbar. DSGVO-Auskunfts-Pflicht verletzt.
- **Maßnahme:** Schicht 6: AuditLog für alle Admin-Aktionen (schon implementiert). Plus log_statement=mod auf DB-Level.

### Security-Maßnahmen (13)

- **📋 Planned** · Schicht 1: Postgres bind 127.0.0.1
  Lauscht nicht auf öffentlichen Interfaces. Coolify-internes Docker-Network.
- **📋 Planned** · Schicht 2: Least-Privilege DB-User
  3 User: hagi_app (CRUD), hagi_migrate (DDL), hagi_readonly (Reports/Steuerberater).
- **📋 Planned** · Schicht 3: LUKS Disk-Encryption
  Hetzner Volume mit Full-Disk-Encryption. Schutz bei physischem Disk-Diebstahl.
- **🚧 In Progress** · Schicht 3b: pgcrypto für sensitive Felder · `lib/security/tokens.ts`
  passwordHash und passwordResetTokenHash sind bereits gehasht (argon2id geplant).
- **📋 Planned** · Schicht 4: Postgres TLS Pflicht
  ssl=on + hostssl in pg_hba.conf + sslmode=require in App.
- **📋 Planned** · Schicht 5: GPG-verschlüsselte Backups
  Daily pg_dump | gpg --encrypt → Backblaze separater Bucket. 30-Tage-Retention.
- **✅ Done** · Schicht 6: AuditLog im App-Code · `lib/services/audit.ts`
  Alle Admin-Aktionen via logAudit() — bereits implementiert.
- **📋 Planned** · Schicht 6b: Postgres log_connections + log_statement=mod
  DB-Level Audit zusätzlich zu App-Level.
- **📋 Planned** · Schicht 7: Secrets in Coolify ENV-Vars
  Nicht im Code, nicht in .env-Files. Coolify encrypted at rest.
- **📋 Planned** · Schicht 7b: 90-Tage Password-Rotation
  DB-Passwords + API-Keys + Webhook-Secrets alle 90 Tage rotieren.
- **📋 Planned** · Schicht 7c: Pre-commit gitleaks
  Verhindert versehentliches Committen von Secrets.
- **📋 Planned** · Bonus: argon2id für Passwörter
  Statt bcrypt — moderner, gegen GPU-Cracking gehärtet.
- **📋 Planned** · Bonus: 2FA Pflicht für Admin
  TOTP für Hagi-Admin-Login.

### Frontend-Auswirkungen (2)

- **📋 Planned** · ADR-002 Database Security
  Schicht-für-Schicht Implementierungs-Guide
- **📋 Planned** · Runbook: DB-Härtung
  Schritt-für-Schritt für Production-Deploy

### Code-Refs
- `docs/adr/adr-001-tech-stack.md`
- `docs/adr/adr-002-database-security.md (geplant)`
- `lib/security/tokens.ts`
- `lib/services/audit.ts`

### Offene Fragen
- ❓ Hardware-Security-Module für Master-Backup-Key (overkill für jetzt)?
- ❓ Read-Replica für Reports — Aufwand vs Wert?
- ❓ Postgres-Container vs Hetzner-Managed-Postgres (Add-On 25€/Monat)?

---

## Browse & Discovery

**ID:** `w-browse` · **Slug:** `browse-discovery` · **Kategorie:** Customer · **Stage:** Stage 1 · Foundation · **Status:** ✅ Done

> Kunde landet auf Startseite, scrollt durch Editorial-Sections, navigiert zur Kollektion.

**Trigger:** Direkter Aufruf, Google-Search, Social-Link

### Schritte
1. Hero mit 3D-Coverflow auto-rotiert
2. Trust-Strip + Bestseller mit Progressive-Blur-Hover
3. Why-Hagi-Accordion (5 USP-Panels) expandiert per Hover
4. Klick auf Bestseller → Produkt-Detail
5. Klick auf 'Zum Shop' → /produkte mit Filter

### Risiken (2)

#### 🟡 Mittel · Performance bei großen Bildern
**Mitigation-Status:** 🚧 In Progress

Higgsfield-CDN-Bilder sind unkomprimiert, 1-3 MB pro Bild. Mobile Daten teuer.

- **Konsequenz:** Lighthouse < 70, Mobile-Bounce-Rate steigt.
- **Maßnahme:** next/image AVIF + sizes-Attribut + lazy loading. Vor Live: alle Bilder auf 200 KB komprimieren.

#### 🟢 Niedrig · CSP blockt Bilder von neuer CDN
**Mitigation-Status:** 📋 Planned · `next.config.mjs`

Wenn Hagi später eigene Bilder hostet (S3/Cloudinary), CSP-Hosts müssen erweitert werden.

- **Konsequenz:** Bilder broken nach Migration.
- **Maßnahme:** CSP-Liste in next.config.mjs als ENV-Variable konfigurierbar machen.

### Security-Maßnahmen (2)

- **✅ Done** · CSP-Header strikt · `next.config.mjs`
  unsafe-eval nur in Dev, Strict in Prod.
- **📋 Planned** · robots.txt erlaubt nur Storefront · `app/robots.ts`
  /admin, /playbook, /api ausgeschlossen.

### Frontend-Auswirkungen (3)

- **✅ Done** · Start ([/](/))
  Editorial-Hero + Carousel + Trust-Strip
- **✅ Done** · Bestseller-Section
  Progressive-Blur-Hover
- **✅ Done** · Why-Hagi
  5-Panel-Accordion

### Code-Refs
- `app/page.tsx`
- `components/home/HeroCarousel.tsx`
- `components/home/WhyHagiAccordion.tsx`

---

## Produkt-Detail-View

**ID:** `w-product-detail` · **Slug:** `produkt-detail` · **Kategorie:** Customer · **Stage:** Stage 1 · Foundation · **Status:** ✅ Done

> Vollständige Datenblatt-Page mit Story, Knüpfer-Portrait, Pflege, Echtheits-Zertifikat.

**Trigger:** Klick auf Produktkarte

### Schritte
1. Lazy-load Galerie mit Zoom
2. Story + 30+ Datenblatt-Felder + Knüpfer-Portrait + Pflege + Zertifikat
3. Klick 'In den Warenkorb' (kommt in Stage 2)
4. WhatsApp-Berater Floating

### Risiken (2)

#### 🟡 Mittel · comparePrice rechtswidrig (PAngV § 11)
**Mitigation-Status:** 📋 Planned · `app/produkte/[slug]/page.tsx`

Streichpreise müssen 30 Tage vorher tatsächlich verlangt worden sein. Bei Direktimport nicht beweisbar.

- **Konsequenz:** Abmahnung durch Verbraucherzentrale, ~500-1500 € Schadensersatz.
- **Maßnahme:** comparePrice umlabeln auf 'Vergleichswert im Fachhandel' ODER weg.

#### 🟡 Mittel · Race-Condition bei Unikat-Cart-Add
**Mitigation-Status:** 📋 Planned

2 Kunden klicken gleichzeitig 'In Cart' für dasselbe Stück. Beide gehen zu Stripe.

- **Konsequenz:** Doppelverkauf, manueller Storno, Vertrauensverlust.
- **Maßnahme:** Cart-Reservation 15min beim Add-to-Cart. SELECT FOR UPDATE beim Commit-Order.

### Security-Maßnahmen (2)

- **✅ Done** · OrderItem snapshottet alles · `prisma/schema.prisma`
  Preis, Bild, Titel, Steuer eingefroren — auch wenn Produkt später gelöscht.
- **✅ Done** · Schema.org JSON-LD · `app/produkte/[slug]/page.tsx`
  Product Markup für SEO + Snippets.

### Frontend-Auswirkungen (1)

- **✅ Done** · Produkt-Detail ([/produkte/taebris-medaillon-240-170](/produkte/taebris-medaillon-240-170))
  Editorial-Hybrid Story+Datenblatt

### Offene Fragen
- ❓ comparePrice: weg oder umlabeln?
- ❓ Cart-Reservation jetzt oder in Stage 6?

---

## Cart-Hinzufügen

**ID:** `w-cart-add` · **Slug:** `cart-hinzufuegen` · **Kategorie:** Customer · **Stage:** Stage 2 · Checkout · **Status:** 🚧 In Progress

> Add-to-Cart Logik mit Server-Side-Validation, LocalStorage-Persistence, Unikat-Limit.

**Trigger:** Klick 'In den Warenkorb' auf Produkt-Detail

### Schritte
1. Client schickt { productId, quantity } via Server-Action
2. validateCart() lädt Preise + Steuer aus DB
3. Bei Unikat: max 1 forced
4. Bei MAX_QUANTITY_PER_ITEM (5) Überschreitung: Error
5. LocalStorage cart-store.ts speichert IDs+Quantities
6. Cart-Badge im Header aktualisiert

### Risiken (2)

#### 🔴 Hoch · Client manipuliert Preis im Cart
**Mitigation-Status:** ✅ Done · `lib/services/cart.ts`

DevTools-User ändert Cart-LocalStorage zu price=1.

- **Konsequenz:** Bestellung über 1 Cent für 1.299 € Teppich. Stripe akzeptiert!
- **Maßnahme:** validateCart() ignoriert ALLE Client-Preise, lädt aus DB neu. Mass-Assignment-Schutz: nur productId+quantity extrahieren.

#### 🟢 Niedrig · User füllt Cart mit 10.000 Items
**Mitigation-Status:** ✅ Done · `lib/services/cart.ts`

Bot oder Trottel adds 999x jeden Teppich.

- **Konsequenz:** DB-Load + LocalStorage-Bloat.
- **Maßnahme:** MAX_ITEMS_IN_CART=20, MAX_QUANTITY_PER_ITEM=5

### Security-Maßnahmen (3)

- **✅ Done** · Input-Sanitization
  Nur productId (string) + quantity (int) akzeptiert.
- **✅ Done** · Server-Side-Truth
  Preis/Steuer/Snapshots IMMER aus DB.
- **📋 Planned** · Rate-Limit auf Cart-API
  30/min pro IP.

### Frontend-Auswirkungen (2)

- **📋 Planned** · Cart-Page ([/warenkorb](/warenkorb))
  Editorial-Redesign in Stage 2
- **✅ Done** · Cart-Badge im Header
  Live-Update bei Add

---

## Checkout (Adresse + Versand + Discount)

**ID:** `w-checkout` · **Slug:** `checkout` · **Kategorie:** Customer · **Stage:** Stage 2 · Checkout · **Status:** 📋 Planned

> Single-Page-Checkout mit Adress-Form, Versandauswahl, Pickup-Option, Discount, AGB-Checkbox.

**Trigger:** Klick 'Zur Kasse' im Warenkorb

### Schritte
1. Adresse eingeben (Billing + Shipping toggleable)
2. Versandzone via Country-Code → ShippingRates anzeigen
3. Pickup-im-Showroom als Option (cents=0)
4. Discount-Code optional eingeben → previewDiscount()
5. AGB + Widerruf + Datenschutz Checkboxen (jeweils Version snapshot)
6. Bei Sonderanfertigung: extra Checkbox 'kein Widerruf'
7. B2B: USt-ID + Firmen-Feld
8. Klick 'Zahlungspflichtig bestellen' → Stripe Checkout Session

### Risiken (4)

#### 🔴 Hoch · BGB § 312j Button-Lösung verletzt
**Mitigation-Status:** 📋 Planned

Button-Text falsch ('Bestellen' statt 'Zahlungspflichtig bestellen').

- **Konsequenz:** Vertrag unwirksam. Kunde kann kostenlos zurücktreten.
- **Maßnahme:** Stripe Checkout Sessions sind out-of-the-box konform. Plus eigener Button-Text validiert.

#### 🔴 Hoch · AGB-Akzeptanz nicht beweisbar
**Mitigation-Status:** ✅ Done · `lib/services/consent.ts`

Kunde klagt: 'Habe nie zugestimmt'. Wir haben keinen Beweis.

- **Konsequenz:** Streitfall verloren, AGB unwirksam.
- **Maßnahme:** ConsentLog mit Versionierung + IP + Timestamp. AGB-Version auf Order snapshotted.

#### 🟡 Mittel · VAT-ID nicht validiert bei B2B
**Mitigation-Status:** 📋 Planned

Kunde gibt FAKE-USt-ID an → Reverse-Charge fälschlicherweise angewendet → wir schulden Steuer.

- **Konsequenz:** Nachforderung Finanzamt + Strafe.
- **Maßnahme:** VIES-API-Check vor Reverse-Charge.

#### 🟡 Mittel · Hohe Cart-Abandonment-Rate
**Mitigation-Status:** 📋 Planned

Premium-E-Commerce: 70% Abbruch vor Bezahlen.

- **Konsequenz:** Umsatz-Verlust.
- **Maßnahme:** Apple Pay + Klarna + Express-Checkout. Abandoned-Cart-Mails. Trust-Strip prominent.

### Security-Maßnahmen (3)

- **✅ Done** · Server Actions CSRF-protected
  Next.js Server Actions haben CSRF-Schutz built-in.
- **📋 Planned** · Honeypot gegen Bots
  Hidden Field das nur Bots ausfüllen.
- **✅ Done** · Stripe HTTPS-only
  Card-Daten gehen NIE durch unseren Server.

### Frontend-Auswirkungen (1)

- **📋 Planned** · Checkout-Page ([/checkout](/checkout))
  Editorial-Single-Page-Checkout

### Offene Fragen
- ❓ Single-Page vs Multi-Step?
- ❓ Express Apple-Pay-Button oben?

---

## Stripe-Zahlung + Webhook

**ID:** `w-stripe-payment` · **Slug:** `stripe-payment` · **Kategorie:** System · **Stage:** Stage 2 · Checkout · **Status:** 📋 Planned

> Stripe Checkout Session erzeugt, Kunde bezahlt, Webhook triggert Order-Anlage + Mail.

**Trigger:** Stripe sendet payment_intent.succeeded an /api/webhooks/stripe

### Schritte
1. Webhook empfängt Event
2. Signature-Verify via STRIPE_WEBHOOK_SECRET
3. recordReceive() — Dedup-Check
4. Wenn neu: Transaction { Order anlegen + redeemDiscount + Lagerbestand }
5. markProcessed()
6. Auto-Trigger: sendOrderConfirmation()
7. Auto-Trigger: logAudit()

### Risiken (4)

#### 🔴 Hoch · Webhook-Ausfall (Stripe oder unser System)
**Mitigation-Status:** 📋 Planned

Kunde bezahlt, Webhook kommt nicht an. Keine Order, kein Mail.

- **Konsequenz:** Kunde wartet auf Bestätigung. Customer-Support-Eskalation.
- **Maßnahme:** Stripe Retries 30x. Plus Page nach Stripe-Redirect zeigt Status. Plus daily Cron der Stripe-Sessions abgleicht.

#### 🔴 Hoch · Doppelte Order durch Webhook-Retries
**Mitigation-Status:** ✅ Done · `lib/services/webhook-dedup.ts`

Stripe retries → unser System verarbeitet 2x.

- **Konsequenz:** Doppel-Bestellung, Doppel-Mail.
- **Maßnahme:** providerEventId UNIQUE + recordReceive create-first-pattern.

#### 🔴 Hoch · Forged Webhook ohne Signature-Check
**Mitigation-Status:** 📋 Planned

Angreifer schickt fake payment_intent.succeeded → wir legen kostenlose Order an.

- **Konsequenz:** Massive Bestellungen ohne Bezahlung.
- **Maßnahme:** stripe.webhooks.constructEvent() mit secret. raw-body Parsing (Next.js bodyParser: false).

#### 🟡 Mittel · Stripe-Calls ohne Idempotency-Key
**Mitigation-Status:** 📋 Planned

Retry erzeugt 2 Payment Intents.

- **Konsequenz:** Buchhaltungs-Mismatch.
- **Maßnahme:** Idempotency-Key pro Order-Versuch (Hash aus Cart + Customer).

### Security-Maßnahmen (3)

- **📋 Planned** · Webhook-Signature-Verify
  Stripe-Library prüft HMAC-SHA256.
- **✅ Done** · Webhook-Dedup race-safe · `lib/services/webhook-dedup.ts`
  Create-First mit P2002-Catch.
- **✅ Done** · Payload max 100 KB · `lib/services/webhook-dedup.ts`
  DoS-Schutz.

### Frontend-Auswirkungen (1)

- **📋 Planned** · Stripe-Success-Redirect ([/bestellung-bestaetigt](/bestellung-bestaetigt))
  Editorial-Confirmation-Page

---

## Order-Confirmation (Page + Mail)

**ID:** `w-confirmation` · **Slug:** `order-confirmation` · **Kategorie:** Customer · **Stage:** Stage 3 · Post-Checkout · **Status:** 📋 Planned

> Erfolgsseite + automatische Bestellbestätigungs-Mail.

**Trigger:** Stripe-Webhook → markProcessed + sendOrderConfirmation

### Schritte
1. Page liest Stripe-Session-ID aus URL
2. Lädt Order via session_id (NICHT Order-ID)
3. Zeigt: Bestellnummer HAG-2026-000042, Total, Items, Schätz-Lieferzeit
4. Email-Trigger: HTML-Mail mit Bestellinhalt
5. Tracking-URL für später (publicToken)

### Risiken (2)

#### 🔴 Hoch · Bestellbestätigung im Spam-Ordner
**Mitigation-Status:** 📋 Planned

SPF/DKIM/DMARC nicht sauber → Mail landet in Junk.

- **Konsequenz:** Kunde denkt Bestellung kaputt. Anruf-Volumen steigt.
- **Maßnahme:** DNS-Records sauber setzen. mail-tester.com vor Live. Plus: Confirmation-Page zeigt auch alle Infos.

#### 🔴 Hoch · Order-Details über URL leakable
**Mitigation-Status:** ✅ Done · `lib/security/tokens.ts`

Wenn /bestellung-bestaetigt nur Order-ID nutzt, kann jeder /bestellung/123 raten.

- **Konsequenz:** PII-Leak. DSGVO-Verstoß.
- **Maßnahme:** publicToken (32 bytes base64url) statt Order-ID in URL.

### Security-Maßnahmen (2)

- **✅ Done** · Token-basierte URLs
  Crypto-Random 256-bit für Gast-Zugriff.
- **📋 Planned** · /bestellung-* noindex
  Robots-Meta.

### Frontend-Auswirkungen (1)

- **📋 Planned** · Confirmation-Page
  Editorial mit Order-Summary + nächste Schritte

---

## Tracking-Status-Page

**ID:** `w-tracking` · **Slug:** `tracking-status` · **Kategorie:** Customer · **Stage:** Stage 3 · Post-Checkout · **Status:** 📋 Planned

> Kunde verfolgt Order-Status über Token-URL aus Mail.

**Trigger:** Link aus Bestätigungs-Mail oder Versand-Mail

### Schritte
1. URL /bestellung/status/[token]
2. Token-Lookup → Order
3. Zeigt Status (PENDING → PAID → SHIPPED → DELIVERED)
4. Bei SHIPPED: Tracking-Link zu DHL/Spedition
5. Bei DELIVERED: 'Wie war's?' → Bewertungsformular

### Risiken (2)

#### 🟢 Niedrig · IDOR über Order-ID-Brute-Force
**Mitigation-Status:** ✅ Done · `lib/security/tokens.ts`

Angreifer rät publicToken — 256-bit-Token ist aber nicht ratebar.

- **Konsequenz:** Theoretisch PII-Leak, praktisch nicht möglich.
- **Maßnahme:** 32-byte cryptographic random Token + DB-Index.

#### 🟢 Niedrig · Token läuft nicht ab
**Mitigation-Status:** 📋 Planned

Jahre alte Tokens funktionieren noch.

- **Konsequenz:** Nach Account-Verlust durch User: Ex könnte Token nutzen.
- **Maßnahme:** Token-Ablauf nach 2 Jahren (Aufbewahrungsfrist).

### Security-Maßnahmen (1)

- **📋 Planned** · Token-Lookup Rate-Limit
  10/min pro IP gegen Brute-Force.

### Frontend-Auswirkungen (1)

- **📋 Planned** · Tracking-Page
  Status-Timeline + Tracking-Link

---

## PDF-Rechnung + Lieferschein

**ID:** `w-pdf-rechnung` · **Slug:** `pdf-rechnung` · **Kategorie:** System · **Stage:** Stage 3 · Post-Checkout · **Status:** 📋 Planned

> React-PDF generiert § 14 UStG-konforme Rechnung + DHL-Lieferschein.

**Trigger:** Order-Status → PAID

### Schritte
1. React-PDF rendert Rechnung mit Hagi-Stammdaten
2. Pflicht-Angaben § 14 UStG: USt-ID, fortlaufende Rechnungsnummer, Datum, Leistung
3. Kleinunternehmer-Hinweis falls TAX_MODE=small_business
4. B2B-Variante: Reverse-Charge-Vermerk
5. PDF in S3/Storage → Link in Mail
6. Lieferschein separat für Versanddienstleister

### Risiken (2)

#### 🔴 Hoch · Rechnungsfehler § 14 UStG
**Mitigation-Status:** 📋 Planned

Pflichtangaben fehlen → Finanzamt verweigert Vorsteuer-Abzug bei B2B-Käufern.

- **Konsequenz:** Reklamationen von B2B-Käufern. Korrekturen.
- **Maßnahme:** Template gegen § 14 UStG-Checkliste validieren. Plus Steuerberater-Review.

#### 🔴 Hoch · PDF-URL ratbar / public
**Mitigation-Status:** 📋 Planned

Wenn /rechnung/123.pdf einfach erratbar — PII-Leak.

- **Konsequenz:** DSGVO + Wettbewerbs-Daten leaken.
- **Maßnahme:** PDFs hinter publicToken + Auth-Check.

### Security-Maßnahmen (2)

- **📋 Planned** · PDF nur per Token zugänglich
  URL = /rechnung/[publicToken].pdf.
- **📋 Planned** · GoBD-konforme Archivierung
  10 Jahre unveränderlich speichern.

### Frontend-Auswirkungen (1)

- **📋 Planned** · Bestellbestätigung
  PDF-Download-Link

---

## Widerruf / Rückgabe

**ID:** `w-widerruf` · **Slug:** `widerruf-portal` · **Kategorie:** Customer · **Stage:** Stage 4 · Admin · **Status:** 📋 Planned

> Self-Service-Portal für Widerrufserklärung mit Anlage-2-Formular.

**Trigger:** Kunde klickt Link aus Mail oder navigiert zu /widerruf/[token]

### Schritte
1. Token-Lookup
2. Zeigt Order-Details + Rückgabe-Formular
3. Anlage 2 als PDF zum Ausdrucken
4. Online-Widerruf direkt absendbar
5. Bei Sonderanfertigung: 'Widerruf ausgeschlossen' (vorher Checkbox)
6. Foto-Upload für Schadensdokumentation
7. Trigger: Refund-Workflow im Admin

### Risiken (2)

#### 🟡 Mittel · Sperrgut-Rücksendung Kosten
**Mitigation-Status:** 📋 Planned

Großteppich zurück = 89 €. Wer zahlt?

- **Konsequenz:** Streit über Kosten. Negative Reviews.
- **Maßnahme:** AGB klar regeln: Händler trägt bis 200 € Warenwert, darüber Kunde. Oder pauschal Händler.

#### 🟡 Mittel · 14-Tage-Frist falsch berechnet
**Mitigation-Status:** 📋 Planned

Kunde widerruft am Tag 15 → wir lehnen ab → war aber innerhalb der Frist (DHL-Verzögerung).

- **Konsequenz:** Rechtsstreit verloren.
- **Maßnahme:** Frist beginnt mit Lieferung (deliveredAt) NICHT mit Bestellung.

### Security-Maßnahmen (1)

- **📋 Planned** · Foto-Upload MIME-Validation
  Nur JPG/PNG, max 5 MB, EXIF stripped.

### Frontend-Auswirkungen (1)

- **📋 Planned** · Widerruf-Portal
  Editorial-Form mit Foto-Upload

---

## Admin-Dashboard Orders

**ID:** `w-admin-orders` · **Slug:** `admin-orders` · **Kategorie:** Admin · **Stage:** Stage 4 · Admin · **Status:** 📋 Planned

> Hagi sieht alle Bestellungen, Status-Updates, Tracking-Nummer eingeben.

**Trigger:** Admin-Login → /admin/orders

### Schritte
1. Liste aller Orders (paginiert, gefiltert)
2. Filter: Status, Datum, Zahlungsart, B2B
3. Click → Order-Detail
4. Status-Update Buttons (Confirmed → Shipped → Delivered)
5. Tracking-Nummer eingeben → Auto-Trigger sendShippingNotification()
6. Refund-Button für Storno

### Risiken (2)

#### 🔴 Hoch · Admin-Auth umgangen
**Mitigation-Status:** 📋 Planned

Wenn /admin nicht properly geschützt → jeder hat Zugriff auf alle Orders.

- **Konsequenz:** Massiver PII-Leak. DSGVO-GAU.
- **Maßnahme:** argon2id Passwort + Session-Cookie + IP-Allowlist optional.

#### 🟡 Mittel · Mass-Refund per Klick
**Mitigation-Status:** 📋 Planned

Hagi klickt versehentlich 'Alle stornieren'.

- **Konsequenz:** Unwiderrufliche Stornierungen.
- **Maßnahme:** Bulk-Actions hinter 2-Faktor-Bestätigung.

### Security-Maßnahmen (3)

- **✅ Done** · CSRF auf Admin-Routes
  Next.js Server Actions built-in.
- **✅ Done** · Alle Admin-Aktionen auditiert · `lib/services/audit.ts`
  logAudit() bei jedem Status-Change.
- **📋 Planned** · 2FA für Hagi-Admin
  TOTP oder Magic-Link.

### Frontend-Auswirkungen (1)

- **📋 Planned** · Admin-Dashboard ([/admin](/admin))
  Komplett neu, Editorial-Utilitarian

---

## Manuelle Order (Showroom-Walk-in)

**ID:** `w-manual-order` · **Slug:** `manual-order` · **Kategorie:** Admin · **Stage:** Stage 4 · Admin · **Status:** 📋 Planned

> Hagi verkauft im Showroom → Order im Admin manuell anlegen → Inventar sync.

**Trigger:** Showroom-Verkauf

### Schritte
1. Hagi: 'Neue Order' im Admin
2. Produkt auswählen (Unikat: inStock=true noch?)
3. Customer eintragen (Name, Adresse, Email optional)
4. Zahlungsart: Bar, EC-Karte, Überweisung
5. Order anlegen mit paymentStatus=PAID manuell
6. Auto: Inventar inStock=false bei Unikat
7. Optional: Rechnung an Kundenmail

### Risiken (2)

#### 🔴 Hoch · Hagi vergisst Showroom-Verkauf einzutragen
**Mitigation-Status:** 📋 Planned

Online wird das Stück als verfügbar gezeigt.

- **Konsequenz:** Online-Doppelverkauf, manueller Storno, Vertrauensverlust.
- **Maßnahme:** Sofort-Eintrag-Verpflichtung. Plus täglicher Inventur-Check.

#### 🟡 Mittel · Bar-Verkauf steuerlich nicht erfasst
**Mitigation-Status:** 📋 Planned

Hagi vergisst manuelle Order anzulegen.

- **Konsequenz:** Steuerstrafe.
- **Maßnahme:** POS-Pflicht oder manuelle Order zwingend.

### Security-Maßnahmen (1)

- **✅ Done** · Manuelle Orders im AuditLog
  actorType='admin' separiert.

### Frontend-Auswirkungen (1)

- **📋 Planned** · /admin/orders/new
  Quick-Form für Showroom-Verkauf

---

## Email-Versand (Resend)

**ID:** `w-emails` · **Slug:** `email-versand` · **Kategorie:** System · **Stage:** Stage 3 · Post-Checkout · **Status:** 🚧 In Progress

> Transaktional: Bestellbestätigung, Tracking, Lieferung, Storno, Widerruf, Newsletter.

**Trigger:** Order-Lifecycle-Event oder Cron

### Schritte
1. Order-Status-Change triggert Mail
2. React-Email Template rendert HTML
3. Resend API sendet via verifizierter Domain
4. Webhook → unsere DB: Mail-Status (sent/bounced/spam)
5. Bei Bounce: AuditLog + Retry-Logic

### Risiken (3)

#### 🔴 Hoch · Mails landen im Spam
**Mitigation-Status:** 📋 Planned

Domain-Reputation niedrig in ersten Wochen.

- **Konsequenz:** Kunde glaubt nicht bestellt zu haben.
- **Maßnahme:** SPF + DKIM + DMARC sauber. Warmup-Phase. Plus: Confirmation-Page als Backup.

#### 🟡 Mittel · Header-Injection über Customer-Name
**Mitigation-Status:** ✅ Done

Customer-Name mit CR/LF könnte Mail-Header manipulieren.

- **Konsequenz:** Spam-Versand über unsere Domain → Domain-Blacklist.
- **Maßnahme:** Resend sanitized automatisch. Plus: Name-Validation in Schema.

#### 🟡 Mittel · RESEND_API_KEY fehlt in Prod
**Mitigation-Status:** 📋 Planned

App startet, Order kommt, Mail-Send wirft.

- **Konsequenz:** Order liegt ohne Mail, Customer ratlos.
- **Maßnahme:** Fail-Fast bei Boot in Production wenn KEY fehlt. Plus: Order trotzdem anlegen, Mail-Retry in Queue.

### Security-Maßnahmen (1)

- **✅ Done** · Templates escaped HTML
  React-Email escaped automatisch.

### Frontend-Auswirkungen (1)

- **📋 Planned** · Email-Preview-Page (intern)
  /admin/emails/preview für Testing

---

## Spedition für Großteppiche

**ID:** `w-spedition` · **Slug:** `spedition-grossteppich` · **Kategorie:** Admin · **Stage:** Operations · **Status:** 📋 Planned

> Manueller Workflow: Spedition organisieren bei Sperrgut-Versand.

**Trigger:** Order mit shippingRate='Spedition'

### Schritte
1. Order eingehend mit shippingRate='spedition'
2. Order-Status: awaiting_spedition_confirmation (custom)
3. Auto-Mail an Hagi: 'Spedition organisieren'
4. Hagi ruft Kunde an, vereinbart Termin
5. Hagi bucht Spedition (extern, nicht in App)
6. Hagi trägt Spedition-Tracking-Nummer ein
7. Status: SHIPPED

### Risiken (2)

#### 🟡 Mittel · Spedition teurer als pauschale 89 €
**Mitigation-Status:** 📋 Planned

Berlin = 150 €.

- **Konsequenz:** Hagi zahlt drauf.
- **Maßnahme:** Spedition-Pauschale gestaffelt nach PLZ-Bereich. Oder transparent abrechnen.

#### 🔴 Hoch · Schaden während Spedition
**Mitigation-Status:** 📋 Planned

Häufiger als bei DHL.

- **Konsequenz:** Komplexer Schadensprozess, Versicherungsstreit.
- **Maßnahme:** Versicherung beim Spediteur. Pflicht-Foto-Dokumentation bei Lieferung.

### Security-Maßnahmen (1)

- **📋 Planned** · Telefon Pflicht für Spedition
  Sonst kann Spedition nicht ausliefern.

### Frontend-Auswirkungen (1)

- **📋 Planned** · Checkout
  Bei Spedition: Telefon Pflichtfeld

---

## DSGVO Auskunft + Löschung

**ID:** `w-dsgvo` · **Slug:** `dsgvo-loeschung` · **Kategorie:** Compliance · **Stage:** Stage 5 · Compliance · **Status:** 📋 Planned

> Customer-Recht auf Auskunft + Löschung. Orders bleiben (Buchhaltungs-Pflicht 10 Jahre).

**Trigger:** Customer-Email an datenschutz@hagi-teppiche.de

### Schritte
1. Hagi erhält Anfrage per Mail
2. Admin-Dashboard: 'Customer suchen'
3. Auskunft: Export aller Daten als JSON+PDF
4. Löschung: Customer.deletedAt + anonymizedAt + Customer-Felder NULL
5. Order-Snapshots bleiben (10 Jahre AO §147)
6. ConsentLog bleibt als Beweis
7. Innerhalb 30 Tagen erledigen (DSGVO Art. 12)

### Risiken (2)

#### 🔴 Hoch · 30-Tage-Frist verpasst
**Mitigation-Status:** 📋 Planned

Hagi vergisst Anfragen.

- **Konsequenz:** Bußgeld bis 20 Mio. €.
- **Maßnahme:** Auto-Reminder im Admin. Ticket-System für DSGVO-Anfragen.

#### 🟡 Mittel · PII bleibt in Backups
**Mitigation-Status:** 📋 Planned

Postgres-Backup von vor Löschung enthält noch alles.

- **Konsequenz:** Wenn Backup restored: PII zurück.
- **Maßnahme:** Backup-Retention max 30 Tage. Restore-Process inkl. Re-Anonymization.

### Security-Maßnahmen (3)

- **✅ Done** · Soft-Delete für Customer · `prisma/schema.prisma`
  deletedAt + anonymizedAt im Schema.
- **✅ Done** · PII auf Order snapshotted
  Buchhaltung bleibt, Customer kann weg.
- **✅ Done** · ConsentLog versioniert · `lib/services/consent.ts`
  AGB-Version snapshotted.

### Frontend-Auswirkungen (2)

- **📋 Planned** · /admin/customers/search
  Suche + Auskunft + Löschung
- **🚧 In Progress** · Datenschutz-Page
  Rechte des Betroffenen klar

---

## Background-Jobs (Cron)

**ID:** `w-cron` · **Slug:** `background-jobs` · **Kategorie:** System · **Stage:** Stage 5 · Compliance · **Status:** 📋 Planned

> Tägliche/stündliche Aufgaben: Abandoned-Cart, PII-Retention, Stripe-Reconciliation.

**Trigger:** Cron via Vercel/Coolify

### Schritte
1. Hourly: Stripe-Sessions vs DB reconcile (fehlende Webhooks fangen)
2. Daily: Abandoned-Cart-Reminder 4h/24h/72h
3. Daily: PII-Retention (PII auf Orders > 10 Jahre alt anonymisieren)
4. Weekly: AuditLog-Old-Records archivieren
5. Daily: Inventur-Check (Unikate Out-of-Stock)

### Risiken (2)

#### 🟡 Mittel · Cron-Failure unentdeckt
**Mitigation-Status:** 📋 Planned

Cron läuft nicht, niemand merkt es.

- **Konsequenz:** Abandoned-Cart-Mails fehlen, Reconciliation kaputt.
- **Maßnahme:** Heartbeat-Logging + Alert bei Ausfall.

#### 🟡 Mittel · Cron läuft 2x → Doppel-Mails
**Mitigation-Status:** 📋 Planned

Vercel-Cron + lokaler Cron beide aktiv.

- **Konsequenz:** Spam für Kunden.
- **Maßnahme:** Idempotency: jede Cart-Recovery-Mail mit lastReminderAt-Marker.

### Security-Maßnahmen (1)

- **📋 Planned** · Cron-Endpoints mit Secret-Header
  CRON_SECRET in ENV.

### Frontend-Auswirkungen (1)

- **📋 Planned** · /admin/jobs
  Cron-Status-Dashboard

---
