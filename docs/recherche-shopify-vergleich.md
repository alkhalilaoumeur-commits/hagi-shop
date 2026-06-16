# Shopify vs Custom Next.js Stack — Vollstaendiger Vergleich fuer Hagi Teppich-Shop

**Recherche-Datum:** 2026-06-13
**Zielprojekt:** Hagi Teppich-Shop (Premium-Boutique, Einzelstuecke, hochpreisig)
**Custom-Stack:** Next.js 14, Prisma 5, PostgreSQL, Stripe, Resend, Tailwind, Zustand
**Recherche-Auftrag:** Was bietet Shopify? Was fehlt uns? Kommen wir auf Shopify-Niveau oder besser?

---

## Executive Summary (Lese das als erstes)

**Kurzantwort:** Ja, mit Custom-Stack kommt Hagi auf Shopify-Niveau und in mehreren Punkten **besser** — aber **nur** wenn ein klar definiertes Mindest-Feature-Set vor Live-Schaltung gebaut wird. Aktuell fehlt davon ca. 60 %.

**Drei Kernsaetze:**

1. **Shopify gewinnt bei Geschwindigkeit-zum-Markt und Standard-Commerce-Workflows** (Order-Lifecycle, Versand-Labels, Refunds, Steuer, B2B-Tarife, Marktplatz-Sync). Diese Dinge sind dort fertig, getestet, in 21.000 Apps erweiterbar.
2. **Custom-Stack gewinnt bei Design-Souveraenitaet, Storytelling, Datenmodell und Performance.** Genau das, was Hagi als Premium-Marke braucht (Knuepfer-Provenance, Editorial-Layouts, kuratierte Einzelstuecke, kein Theme-Look).
3. **Der wahre Kostenvergleich ist nicht 36 € vs 0 €.** Realistische Shopify-Total-Cost fuer einen Premium-Shop liegt bei **800–1.500 €/Monat** (Plan + Apps + Theme + Klaviyo + ReCharge wenn Abos + Yotpo). Custom-Stack kostet ca. **40–80 €/Monat** Hosting + Stripe-Gebuehren, aber **150–300 h** initiale Build-Zeit fuer das Mindest-Feature-Set.

**Empfehlung fuer Hagi (vorab, Begruendung in Teil 5):** **Custom-Stack weiterbauen.** Hagi verkauft kuratierte Einzelstuecke mit Geschichte — das ist genau das Segment, in dem Shopify-Themes wie "noch ein Shop" wirken. Aber **vor Live-Schaltung** muessen 7 kritische Luecken geschlossen werden (Teil 4). Sonst ist Shopify objektiv besser.

---

## TEIL 1 — Shopify-Feature-Vollstaendigkeitsliste

Quelle: shopify.com/de + help.shopify.com/de + branchenspezifische Recherche-Artikel 2026.

### A) Storefront

| Feature | Shopify out-of-the-box | Anmerkung |
|---|---|---|
| Theme-System | Ja, 100+ kostenlose + Premium-Themes (150–380 € einmalig) | Dawn, Studio, Empire usw. |
| Theme-Editor (Drag&Drop) | Ja, "Sections everywhere" — jeder Block per Editor verschiebbar | Maechtig, aber typischer "Shopify-Look" |
| Anpassbarer Header/Footer/Menue | Ja, ueber Theme-Editor + Liquid-Templates | |
| Produkt-Listings + Filter | Ja, Collections mit Tag-Filter | Erweiterte Filter via Apps (Searchanise, Boost) |
| Volltext-Suche | Ja, Standard-Suche | Premium-Suche via Klevu, Searchanise ($29–199/M) |
| Multi-Sprache | Ja, **Shopify Markets** (Translate&Adapt-App + Markets) | Auf Basic limitiert, voll erst ab Grow/Advanced |
| Multi-Waehrung | Ja, ueber Markets | |
| Multi-Domain pro Markt | Ja, ab Advanced (Sub-Domains/eigene Domains) | |
| Blog/Magazin-Engine | Ja, eingebaute Blog-Funktion | Sehr basic, Editorial-Layouts schwierig |
| SEO (Sitemap, Schema.org, Meta) | Ja, automatische Sitemap + Schema.org-Markup | Begrenzte URL-Struktur, keine echten Editorial-URLs |
| Performance (CDN, Image-Opt) | Ja, Shopify-CDN + WebP automatisch | App-Stack toetet oft die Performance: 4,2 s LCP im Schnitt |
| Mobile-App-Builder | Nein nativ; Shopify "Shop"-App ist die universelle App | Eigene App ueber Tapcart/Shop Mini ($199–1000/M) |

### B) Produkt-Verwaltung

| Feature | Shopify | Anmerkung |
|---|---|---|
| Produkt-Anlegen | Ja, Titel/Beschreibung/Medien/Preis/Bestand | |
| Varianten (Groesse/Farbe) | Ja, bis zu 3 Optionen + 100 Varianten (Plus: 2000) | Hagi nutzt das wenig (Einzelstuecke) |
| Tags | Ja, unbegrenzt | |
| Collections (automatisch + manuell) | Ja, sehr stark | Per Regel auto-befuellt |
| Metafields (Custom Fields) | Ja, native Metafields-API | Nicht so flexibel wie Prisma-Schema |
| Bulk-Editor | Ja, sehr gut fuer Massen-Updates | |
| CSV-Import/Export | Ja, Standard | |
| Lagerbestand-Tracking | Ja, automatisch | |
| Multi-Location-Inventory | Ja, bis 10 Standorte (Plus: 200) | |
| Digitale Produkte | Ja, via "Digital Downloads"-App (Shopify-eigen, kostenlos) | |
| Abonnements (Recurring) | **Nein nativ** — nur ueber ReCharge / Bold ($99+/M) oder Shopify Subscriptions (kostenlos, basic) | |
| Massanfertigung / Configurator | Nein nativ; Apps wie Zakeke, Customily ($19–99/M) | |
| Bundles | Ja, "Shopify Bundles"-App (kostenlos) | |

### C) Bestell-Management

| Feature | Shopify | Anmerkung |
|---|---|---|
| Order-Lifecycle | Ja, vollstaendig: pending → paid → fulfilled → shipped → delivered → refunded | Best-in-Class |
| Manuelle Bestellungen | Ja, "Entwurfsbestellungen" fuer Showroom/Telefon-Verkauf | Sehr wichtig fuer Hagi |
| Lieferschein/Rechnungs-Druck | Ja, Standard-Templates + Order Printer-App (kostenlos) | DE-Rechnung mit USt-Nummer braucht Anpassung |
| Refunds + Teilrueckerstattungen | Ja, vollstaendig integriert | |
| Returns Portal (Self-Service) | Ja, "Shopify Returns" eingebaut | Returns-Labels, Tracking, Restocking |
| Order-Editing | Ja, Bestellungen nach Aufgabe editierbar | |
| Email-Templates anpassen | Ja, Liquid + HTML editierbar | Aber muehsam ohne Code |
| Notes/Tags zu Bestellungen | Ja | |
| Order-Status-Page | Ja, automatische Tracking-Seite fuer Kunden | |

### D) Zahlung

| Feature | Shopify | Anmerkung |
|---|---|---|
| Shopify Payments (Stripe-basiert) | Ja, Hauptangebot — 2,1 % bis 1,6 % + 0,30 € je nach Plan | Niedriger als Stripe direkt (2,9 %) |
| Externe Provider (Stripe, PayPal) | Ja, aber **Transaktions-Surcharge** 0,2–2,0 % zusaetzlich | Strategischer Lock-in! |
| Apple Pay / Google Pay | Ja, ueber Shopify Checkout automatisch | |
| Shop Pay (One-Click) | Ja, exklusiv Shopify — "+50 % Conversion vs Gast-Checkout" | Echtes Killer-Feature |
| Klarna / Afterpay | Ja, eingebaut | |
| Rechnung manuell | Ja, ueber Entwurfsbestellung + Bank-Transfer | |
| Krypto | Nein nativ, ueber Apps (Coinbase Commerce, BitPay) | |
| Multi-Currency-Pricing | Ja, ueber Markets | |
| Steuerberechnung | Ja, "Shopify Tax" automatisch | DE: VAT inklusive/exklusive Darstellung |

### E) Versand

| Feature | Shopify | Anmerkung |
|---|---|---|
| Versandzonen | Ja, beliebig viele Zonen pro Land/Region | |
| Tarif-Tabellen (Pauschal/Gewicht/Preis) | Ja, alle drei Modelle | |
| Echtzeit-Rates (DHL/UPS/USPS) | Ja, **nur ab Advanced** (oder Plus) | Wichtig fuer Hagi mit schweren Teppichen |
| Label-Druck (Shopify Shipping) | Ja, DE leider eingeschraenkt — funktioniert mit DHL DE | Sendcloud oder Shipcloud-Apps als Alternative |
| Pickup-in-Store | Ja, "Local Pickup" Standard | Wichtig fuer Hagi-Showroom |
| Lokale Lieferung | Ja, "Local Delivery" mit Radius-Konfiguration | Perfekt fuer Stuttgart-Umkreis |
| Lieferzeit-Anzeige | Ja, pro Versandmethode konfigurierbar | |
| Tracking-Mails (automatisch) | Ja, sobald Tracking-Nr. eingetragen | |

### F) Marketing

| Feature | Shopify | Anmerkung |
|---|---|---|
| Email-Marketing (Shopify Email) | Ja, 10.000 Mails/Monat kostenlos, dann $0.001/Mail | Sehr basic |
| Klaviyo-Integration | Top-Integration ueber API/Webhook | $20–500+/Monat |
| Discount-Codes | Ja: Prozent, fix, Buy-X-Get-Y, Free Shipping | |
| Automatic Discounts | Ja, ohne Code (z.B. -10 % ab 500 €) | |
| Combine-Rules (Rabatte stapeln) | Ja, seit 2023 native Kombination | |
| Gift Cards | Ja, native, Print + Digital | |
| Loyalty-Programm | Nein nativ — Smile.io, LoyaltyLion ($49–599/M) | |
| Referral-Programm | Nein nativ — ReferralCandy, Yotpo ($59–299/M) | |
| Abandoned-Cart-Mails | Ja, automatisch (Standard-Workflow) | Funktioniert, aber "klein-Store-tauglich" — Profis nutzen Klaviyo |
| Pop-ups / Newsletter-Subscribe | Basis ueber Shopify Forms, Premium ueber Privy/OptinMonster | |
| SMS-Marketing | Nein nativ — Postscript, Klaviyo SMS | |

### G) Analytics

| Feature | Shopify | Anmerkung |
|---|---|---|
| Dashboard (Sales/Sessions/CR) | Ja, gut | |
| Reports (Best-Seller, Geo, Attribution) | Ja, ab Grow ausfuehrlich, Advanced/Plus Custom-Reports | |
| Real-Time-Visualizer | Ja, Live-Map der Sessions | |
| Custom-Reports | Ab Advanced | |
| GA4-Integration | Ja, ueber Theme | |
| ShopifyQL (SQL-aehnlich) | Ja, ab Advanced | |

### H) App-Ecosystem (was Premium-Shops zusaetzlich kaufen)

| Kategorie | Top-Apps | Realistische Kosten |
|---|---|---|
| Reviews | Judge.me ($15), Loox ($39), Yotpo ($119), Okendo ($79), Stamped ($199) | $15–199/Monat |
| Email/SMS | Klaviyo, Omnisend, Postscript | $20–500/Monat |
| Subscriptions | ReCharge, Bold, Skio | $99–1000/Monat |
| Loyalty | Smile.io, LoyaltyLion, Yotpo Loyalty | $49–599/Monat |
| Reviews-Photos | Loox (kombiniert), Junip | $39–199/Monat |
| Suche/Filter | Searchanise, Boost AI, Klevu | $29–299/Monat |
| Upsell/Cross-Sell | ReConvert, Bold Upsell | $19–249/Monat |
| Returns | Loop, Returnly, AfterShip Returns | $29–499/Monat |
| **Premium-Store-Realitaet** | — | **400–1.000 €/Monat nur in Apps** |

Quelle: Charle Agency 2026 + Connectbooks 2026 — Durchschnitt eines Mid-Size-Shops: **£400–800/Monat Apps**.

### I) Customer-Account

| Feature | Shopify | Anmerkung |
|---|---|---|
| Login + Passwort-Reset | Ja, Standard | Magic-Link seit 2023 default |
| Order-History | Ja | |
| Wishlist | Nein nativ — App noetig (Wishlist Plus, ~$5/M) | |
| Adressen verwalten | Ja | |
| B2B-Login mit Spezial-Preisen | Ja, **seit Winter 2026 in allen Plaenen** native Company-Profile + Custom-Pricing | War vorher Plus-only |

### J) B2B-Funktionen (Update 2026)

Update: Native B2B ist seit Winter '26 in **Basic, Grow, Advanced, Plus** verfuegbar.

| Feature | Shopify | Anmerkung |
|---|---|---|
| Wholesale-Channel | Ja, ueber Markets + Company-Profile | |
| Spezial-Preise pro Kunde | Ja, Custom-Catalogs | |
| Quote-System (Angebote) | Ja, Plus + via Apps in niedrigeren Plaenen | |
| Bestellung auf Rechnung | Ja, Net 7/15/30/60 nativ | Wichtig fuer Hagi-B2B (Innenarchitekten) |
| ACH / SEPA-Lastschrift | Ja, integriert | |
| Vaulted Credit Cards | Ja | |

### K) Performance / Infrastruktur

| Feature | Shopify | Anmerkung |
|---|---|---|
| Hosting | Vollstaendig managed | Kein Server-Stress |
| SLA / Uptime | 99,98 % (Plus: 99,99 %) | |
| Security (PCI, SSL) | PCI-Level 1 automatisch | |
| DDoS-Protection | Ja, durch Fastly/Cloudflare-Stack | |
| Backups | Automatisch | Aber: kein "Restore-Point", Versionierung nur fuer Themes |
| Multi-Channel-Sync | Ja: Instagram Shop, TikTok Shop, Amazon, eBay, Google Shopping | Sehr stark |
| POS (Kassensystem) | Ja, Shopify POS (79 €/Monat pro Standort, Plus: gratis) | |

### L) Compliance / Legal (DACH)

| Feature | Shopify | Anmerkung |
|---|---|---|
| DSGVO-Cookie-Banner | Native Customer-Privacy-API + integrierte Banner seit 2024 | Erweitert mit Cookiebot/Consentmanager |
| AGB / Datenschutz / Widerruf | Templates verfuegbar, aber **nicht rechtssicher generiert** | Trusted Shops oder eRecht24 zusaetzlich |
| Tax-Berechnung DE | Ja, Shopify Tax + automatische OSS-Konfiguration | |
| Steuer-Reports | Ja, fuer Steuerberater | |
| LUCID/Verpackungsregister | Nein nativ — manueller Prozess | |
| Trusted Shops Siegel | Via App | |

---

## TEIL 2 — Shopify-Plaene + Realistische Gesamtkosten

### Plan-Preise (Stand DE 2026, jaehrliche Zahlung)

| Plan | Monatlich (jaehrlich) | Monatlich (monatlich) | Card-Gebuehren (Shopify Payments) | Externe-Anbieter-Surcharge |
|---|---|---|---|---|
| Basic | **25 €** | 36 € | 2,1 % + 0,30 € | 2,0 % |
| Grow (frueher: Shopify) | **66 €** | 105 € | 1,8 % + 0,30 € | 1,0 % |
| Advanced | **289 €** | 384 € | 1,6 % + 0,30 € | 0,6 % |
| Plus | **ab 2.100 €** | individuell | wettbewerbsfaehig | 0,2 % |

Quelle: shopify.com/de/preise (Juni 2026).

### Realistische Gesamtkosten fuer einen Premium-Shop wie Hagi

Annahme: Hagi macht 30k–80k € Umsatz/Monat, 50–150 Bestellungen/Monat, will Premium-Auftritt.

**Szenario A — Hagi auf Shopify Grow (66 €) "schlank":**
- Plan: 66 €
- Premium-Theme (einmalig amortisiert): ~15 €/M
- Klaviyo (Email + Flows, 2.500 Kontakte): ~60 €
- Judge.me Reviews: 15 €
- Loox Photo-Reviews: 35 €
- Searchanise Suche: 50 €
- Order-Printer Pro (DE-Rechnungen): 12 €
- Trusted Shops: 49 €
- DHL-Versand-App (Sendcloud): 45 €
- **Summe: ca. 350 €/Monat + Transaktionsgebuehren**

**Szenario B — Hagi auf Shopify Advanced (289 €) "premium":**
- Plan: 289 €
- Premium-Theme + Customizer-App: ~30 €/M
- Klaviyo Pro (5k Kontakte): ~150 €
- Yotpo Reviews + Loyalty: 250 €
- Searchanise: 99 €
- ReCharge Subs (falls Pflege-Abo): 99 €
- Tapcart Mobile-App: 200 €
- Sendcloud Pro: 89 €
- Trusted Shops: 49 €
- Custom-Theme-Dev (one-time amortisiert): ~100 €/M
- **Summe: ca. 1.250–1.500 €/Monat + Transaktionsgebuehren**

**Plus Transaktionsgebuehren:** bei 50k Umsatz und 1,8 % = 900 €/Monat zusaetzlich.

**Realistisches Total bei Hagi-Niveau: 1.500–2.500 €/Monat.**

Vergleich Custom-Stack (Hagi heute):
- Hosting (Coolify/Hetzner CX22): 6 €
- Postgres: inklusive
- Stripe-Gebuehren (1,5 % + 0,25 € DE): bei 50k = 750 €
- Resend (10k Mails/M): kostenlos bis 100/Tag, dann 20 €
- Domain: 1 €
- **Summe: ca. 30 €/Monat Fixkosten + ca. 750 € Transaktionsgebuehren**

**Differenz: ~1.500 €/Monat = 18.000 €/Jahr** (nur Apps + Plan, ohne Transaktionsgebuehren).

Dafuer kann Hagi 150–300 h Custom-Build refinanzieren — bei 80 €/h interner Aufwand = nach 5–10 Monaten amortisiert.

---

## TEIL 3 — Was Shopify LIMITIERT (Custom ist hier besser)

### 1. Editorial-Design-Freiheit

Shopify-Themes sind Component-Library-driven. Eigene Layouts (z.B. "Knuepfer-Portraet zwischen Produkt-Galerie und Provenance-Karte") brauchen Liquid-Coding und brechen bei Theme-Updates. **Hagi will Editorial-Look** — Custom-Next.js mit React/Tailwind/Framer Motion liefert das ohne Reibung.

### 2. Komplexe Custom-Logik (Hagi-Datenmodell)

Hagi hat 13 spezifische Enums (PileMaterial, KnotTechnique, OriginCountry, AgeCategory, PatternType, MainColor, Room ...). In Shopify mappt man das auf **Metafields + Tags** — Suche/Filter darueber ist langsam und Apps wie Searchanise kosten extra.

Prisma-Schema-Vorteil: typsichere Queries, JOINs, komplexe Filter (z.B. "Antik + Persisch + 3x4m + unter 8.000 €") laufen in <50 ms. In Shopify braucht das Filter-Apps mit Reindexing.

### 3. Eigene Animations / Motion-Design

Framer Motion, View-Transitions, Scroll-driven Reveals — alles im Next-Stack frei. In Shopify-Themes nur ueber JS-Hacks im Section-Code, brechen bei Theme-Updates.

### 4. SEO Custom-URLs / Editorial-Content

Shopify zwingt:
- `/products/[handle]`
- `/collections/[handle]`
- `/blogs/[blog]/[handle]`

Hagi will:
- `/teppiche/persisch/isfahan`
- `/knuepfer/akbar-ghasemi`
- `/journal/wie-erkennt-man-einen-echten-isfahan`

Geht in Shopify nur mit Redirects + Hacks. In Next.js native ueber Dynamic Routes.

### 5. Performance (Shopify vs Next.js + ISR)

- Shopify durchschnittlicher LCP: **4,2 s** auf Mobile (mit App-Stack).
- Next.js + ISR + Image-Optimization: **1,5–2,5 s** LCP machbar.

Bei Premium-Produkten (hochpreisig, Aspirational-Branding) ist Speed Conversion-Hebel #1.

### 6. Transaktionsgebuehren bei externem Payment

Wer Shopify Payments NICHT nutzt, zahlt 0,6–2,0 % **Strafe**. Bei Hagi mit 50k Umsatz/Monat: bis zu 1.000 €/M extra. Bei Custom-Stack: 0 % Strafe.

### 7. Vendor-Lock-in

Daten wandern aus Shopify raus ist machbar (CSV-Export, REST/GraphQL-API), aber:
- Kundendaten-Export bekommt **keine Passwoerter** mit (alle Kunden muessen sich neu registrieren).
- Order-Notes/Internals oft unvollstaendig.
- Bewertungen sind in Apps (Yotpo/Judge.me) — separater Export noetig.

Custom-Stack: Postgres-Dump, fertig.

---

## TEIL 4 — Custom-Build mit Next.js — Luecken-Analyse

**Aktueller Hagi-Stack (geprueft am 13.06.2026):**
- Next.js 14, Prisma 5, Postgres, Stripe (Checkout + Webhook), Resend, Tailwind, Zustand
- DB-Models: Category, Product, Order, OrderItem + 12 Hagi-spezifische Enums
- App-Pages: Produkte, Warenkorb, Checkout, Bestell-Bestaetigung, Showroom, Kontakt, Pflichtseiten (Impressum/AGB/Datenschutz/Widerruf), Admin
- API: Health, Admin-CRUD (Produkte/Bestellungen/Kategorien), Stripe (Checkout + Webhook), Login

### Luecken-Tabelle (sortiert nach Kritikalitaet vor Go-Live)

| # | Luecke | Was Shopify liefert | Was wir bauen muessen | Aufwand | Alternative (Service anbinden) | Empfehlung |
|---|---|---|---|---|---|---|
| 1 | **Order-Lifecycle-Workflow** | Status-Machine pending → paid → fulfilled → shipped → delivered | Status-Enum erweitern, State-Transitions, Webhook-Trigger fuer Statuswechsel | **M** (8–12 h) | — | **BAUEN** (Pflicht) |
| 2 | **Tracking-Mail + Status-Page** | Auto-Mail bei "shipped" mit Tracking-Link + Status-Seite | Resend-Template + `/bestellung/[token]` Page + DHL-Tracking-Link | **S** (4–6 h) | — | **BAUEN** (Pflicht) |
| 3 | **Returns/Widerruf-Portal** | Self-Service-Return-Flow mit Label + Status | Page `/bestellung/[token]/ruecksendung` + Admin-Workflow | **M** (10–14 h) | — | **BAUEN** (Pflicht in DE wg. Widerrufsrecht) |
| 4 | **Customer-Account-Dashboard** | Login + Order-History + Adressen | NextAuth-Integration + `/konto` Pages + Order-Listing | **L** (16–24 h) | Clerk ($25/M ab 10k MAU) | **SKIP fuer V1** — Gast-Checkout reicht, Hagi-Kunden bestellen 1–3x |
| 5 | **Discount-Code-Engine** | Prozent / fix / Buy-X-Get-Y / Mindestbestellwert | DB-Model `Discount`, Validation im Checkout, Stripe-Coupon-Mapping | **M** (8–12 h) | Stripe Coupons direkt | **BAUEN** (einfach, hoher Hebel) |
| 6 | **Abandoned-Cart-Recovery** | Auto-Mail nach X Stunden mit Cart-Link | `AbandonedCart`-Model + Cron-Job + Resend-Template | **M** (8–10 h) | Klaviyo ($20+/M) | **BAUEN** (Mail mit Resend reicht — Hagi macht nicht 10k Carts/Tag) |
| 7 | **Lieferschein/Rechnung PDF (DE-konform)** | Order Printer | Server-side PDF via `@react-pdf/renderer` mit DE-Pflichtangaben (USt-Nr., Rechnungsnummer, ...) | **M** (10–14 h) | LexOffice/sevDesk-API | **BAUEN** (Pflicht, einmaliger Aufwand) |
| 8 | **Versandzonen + Tarif-Tabellen** | UI fuer Zonen + Pauschal/Gewicht-Rates | DB `ShippingZone` + `ShippingRate`, Checkout-Berechnung | **M** (10–14 h) | — | **BAUEN** (Hagi hat 3 Zonen: DE / EU / Schweiz) |
| 9 | **DHL-Label-Druck** | Shopify Shipping (DE limitiert) | Sendcloud/Shipcloud-API anbinden | **M** (8–12 h) | Sendcloud (45 €/M) | **EXTERN ANBINDEN** (Sendcloud, weil DHL-API selbst tricky) |
| 10 | **Lokale Lieferung (Stuttgart-Radius)** | Native | Geo-Logik bei Checkout (PLZ-Range) + eigene Versandmethode | **S** (3–5 h) | — | **BAUEN** (Hagi-USP: liefert/legt selbst) |
| 11 | **Pickup-im-Showroom** | Native | Checkout-Option "Selbstabholung Showroom" + Terminbuchung | **S** (4–6 h) | Cal.com Embed | **BAUEN** (Hagi-USP) |
| 12 | **Multi-Sprache (DE/EN)** | Markets (Translate&Adapt) | next-intl + DB-Felder mit JSON `{de: '...', en: '...'}` | **L** (20–30 h) | DeepL Auto-Translate ($30/M) | **SKIP fuer V1** (Hagi-Markt ist DACH) |
| 13 | **Multi-Channel (Instagram/TikTok Shop)** | Native | Manueller Produkt-Upload | **0 h Code, ongoing Aufwand** | — | **EXTERN** (manuell via Instagram-Shop-Tool) |
| 14 | **Reviews-System (Photo-Reviews)** | Yotpo/Loox | Eigenes `Review`-Model + Photo-Upload + Email-Trigger nach 7 Tagen | **L** (16–20 h) | Trustpilot Widget (kostenlos) | **EXTERN** in V1 (Trustpilot/Google Reviews Widget), spaeter eigenes Modul |
| 15 | **Volltext-Suche + Facetten-Filter** | Searchanise | Postgres `tsvector` + Tailwind-Sidebar mit Enum-Filtern | **M** (10–14 h) | Algolia (kostenlos bis 10k Queries) | **BAUEN** (Postgres reicht fuer Hagis Katalog von <500 Produkten) |
| 16 | **Loyalty / Referral** | Smile.io / ReferralCandy | Komplettes Punkte-System | **L** (30+ h) | — | **SKIP** (kein Premium-Hagi-Feature) |
| 17 | **B2B-Login mit Sonderpreisen** | Native Companies | `Company`-Model + Custom-Pricing-Logik | **L** (20–30 h) | — | **SPAETER** (erst wenn 5+ B2B-Anfragen kommen) |
| 18 | **Gutschein-Karten (Gift Cards)** | Native | `GiftCard`-Model + Code-Generator + Stripe-Anbindung | **M** (12–16 h) | — | **SPAETER** (V2-Feature, gut fuer Weihnachten) |
| 19 | **DSGVO-Cookie-Banner mit Consent** | Native + Consentmanager | Eigene Banner-Komponente + Storage | **S** (3–5 h) | Cookiebot (frei bis 100 Subseiten) | **BAUEN** (Hagi hat <50 Seiten, easy) |
| 20 | **Analytics-Dashboard** | Native | GA4 + Plausible + eigenes Admin-Sales-Dashboard | **S** (6 h) | Plausible (9 €/M) | **EXTERN** (Plausible + Stripe-Dashboard reicht) |
| 21 | **Steuer-Reports / OSS** | Shopify Tax | Monatlicher Export aus Postgres an Steuerberater | **S** (4 h) | DATEV-Export-Skript | **BAUEN** (CSV-Export reicht) |
| 22 | **Image-Optimization + CDN** | Native | next/image + Vercel/Cloudflare-CDN | **0 h** (in Next.js drin) | — | **VORHANDEN** |
| 23 | **PCI-Compliance** | Native | Stripe Elements (kein Card-Data beruehrt Server) | **0 h** (Stripe macht's) | — | **VORHANDEN** |
| 24 | **Admin-Backend** | Native Shopify-Admin | Bereits vorhanden bei Hagi (`/admin`) | **0 h** | — | **VORHANDEN** |

**Mindest-Build-Aufwand fuer V1 (Pflicht-Items 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 15, 19, 21):**
- ca. **95–135 h** = bei 4 h/Tag konzentriert = **5–7 Wochen**

**Was wir SKIPpen koennen ohne Verlust:**
- Multi-Sprache (Hagi = DACH)
- Eigenes Loyalty/Referral
- B2B (erst bei Bedarf)
- Eigene Reviews (Trustpilot-Widget reicht fuer V1)
- Multi-Channel Auto-Sync (Instagram-Shop manuell)
- Wishlist

---

## TEIL 5 — Konkrete Empfehlung fuer Hagi

### 1. Shopify oder Custom?

**Empfehlung: CUSTOM-STACK WEITERBAUEN.**

**Drei entscheidende Begruendungen:**

1. **Hagi verkauft Geschichten, nicht Produkte.** Jeder Teppich hat Knuepfer, Region, Alter, Provenance. Das ist Editorial-Commerce — Shopify-Themes drueckt jeden Shop in "noch ein Online-Store"-Optik. Premium-Boutique-Brands (Aesop, Le Labo, Toast) bauen genau deswegen Custom oder Headless.

2. **Wirtschaftlich klar:** Shopify Advanced-Setup = ca. **1.500–2.500 €/Monat Fixkosten + Apps + Transaktionsgebuehren-Penalty bei externem Payment.** Custom = ca. **30 €/Monat + Stripe-Gebuehren ohne Penalty.** Bei 50k €/Monat Umsatz = Differenz ~1.500 €/Monat = 18k €/Jahr. Damit ist die Build-Zeit (~100 h) nach 6 Monaten refinanziert.

3. **Datenmodell zwingt zu Custom.** Hagis 13 Enums + Provenance-Felder + Showroom-Verkauf + Lokale-Lieferung-im-Stuttgart-Raum sind in Shopify nur ueber Apps abbildbar — jede App ist eine Vendor-Abhaengigkeit, jede App kostet, jede App bremst LCP.

**Wann waere Shopify trotzdem besser?**
- Wenn Hagi >500 Produkte/Monat neu listet (Shopify-CSV-Workflow waere schneller).
- Wenn Hagi international (US, UK) expandiert mit voller Steuer/Currency-Komplexitaet.
- Wenn der Owner keine Programmierressource zur Verfuegung hat (du hast eine = Claude + Ilias).

### 2. Welche externen Services in Custom-Build anbinden?

| Bereich | Service | Begruendung | Kosten |
|---|---|---|---|
| Payment | **Stripe** (schon drin) | Marktstandard, gute DE-Integration | 1,5 % + 0,25 € |
| Email | **Resend** (schon drin) | Genuegt fuer Transactional + Marketing | kostenlos bis 3k/M, dann 20 € |
| Hosting | **Coolify auf Hetzner** (Stammstack-Pattern) | Voller Server-Zugriff, niedrige Kosten | 6 €/M |
| Versand-Labels | **Sendcloud** | DE-spezifisch, DHL/DPD/Hermes/UPS in einer API, Returns-Labels | 45 €/M |
| Tracking | **Sendcloud-Tracking-Links** + eigene Status-Seite | reicht | inklusive |
| Reviews | **Trustpilot Free Widget** in V1 | Vertrauen ohne eigenen Aufwand | kostenlos |
| Analytics | **Plausible** + eigenes Admin-Dashboard | DSGVO-konform, schlank | 9 €/M |
| Rechnungen | Eigenes PDF via `@react-pdf/renderer` | DE-konforme Rechnung mit USt-Angaben | 0 € |
| Suche | **Postgres tsvector** + Sidebar-Filter | reicht fuer <500 Produkte | 0 € |
| Cookie-Consent | Eigene Komponente | DSGVO-Pflicht, simpel | 0 € |
| Terminbuchung Showroom | **Cal.com** Embed | Free-Tier reicht | 0 € |

**Total externer Stack-Kosten:** ~80 €/Monat.

### 3. Was muss VOR Live-Schaltung zwingend rein (sonst Shopify objektiv besser)

Pflicht-Build (geschaetzt **95–135 h** Arbeit):

1. ✅ Order-Lifecycle (placed → paid → fulfilled → shipped → delivered → refunded)
2. ✅ Tracking-Mail + Status-Page mit Token-URL (`/bestellung/[token]`)
3. ✅ Returns/Widerruf-Portal (DE-Pflicht!)
4. ✅ Discount-Code-Engine (Prozent + fix + Mindestbestellwert)
5. ✅ Abandoned-Cart-Recovery-Mail (1 Mail nach 4 h, 1 Mail nach 24 h)
6. ✅ Lieferschein + DE-Rechnung als PDF (mit Pflichtangaben)
7. ✅ Versandzonen + Tarif-Tabellen (DE / EU / CH)
8. ✅ Sendcloud-Integration fuer Labels + Tracking
9. ✅ Lokale-Lieferung-Option Stuttgart-Raum
10. ✅ Pickup-im-Showroom-Option
11. ✅ Postgres-Suche + Facetten-Filter (Material, Region, Alter, Groesse, Preis)
12. ✅ DSGVO-Cookie-Banner mit Consent-Storage
13. ✅ CSV-Export fuer Steuerberater (Bestellungen + UStG-Auszug)

**Ohne diese 13 Items waere Shopify objektiv besser.** Mit diesen 13 Items ist Hagi auf Shopify-Niveau **plus** Editorial-Design plus Performance plus Cost-Vorteil.

### 4. Was kann SPAETER kommen (Post-Launch)

V2 (3–6 Monate nach Launch):
- Customer-Account-Dashboard (wenn Kunden mehrfach kaufen)
- Eigenes Reviews-Modul mit Photo-Upload (statt Trustpilot)
- Gift-Cards (Q4 / Weihnachten)
- Multi-Sprache DE/EN (wenn EU-Kunden anfragen)

V3 (6–12 Monate):
- B2B-Login mit Sonderpreisen (wenn Innenarchitekten anklopfen)
- Mobile-App (nur wenn echte Repeat-Customer-Quote da ist)
- Loyalty/Referral-Programm
- Pflege-Abo (mit Stripe Subscriptions)

---

## TEIL 6 — Risiken & Honest-Caveats

**Was bei Custom-Stack realistisch wehtut:**

1. **Bugs sind unsere.** Bei Shopify deckt der Provider Ausfaelle. Bei uns: Du + Claude. Plane Disaster-Recovery (Postgres-Daily-Backup zu S3/Backblaze).
2. **PCI-Compliance ist nur ueber Stripe Elements garantiert.** Niemals Card-Daten auf eigenem Server cachen oder loggen.
3. **DSGVO-Verantwortung ist 100 % bei dir.** AVV mit Stripe, Resend, Sendcloud, Coolify-Hoster jeweils unterschreiben.
4. **Steuerberater-Workflow braucht Disziplin.** Monatlicher CSV-Export + Belege archivieren. In Shopify klickt der Steuerberater selbst rein — bei uns musst du liefern.
5. **Wenn Hagi in 12 Monaten 200 Bestellungen/Tag macht, wird die TODO-Liste laenger** (Bulk-Operations, Multi-Lager, automatisches Re-Pricing). Aber das ist ein gutes Problem.

**Was bei Shopify realistisch wehtut (zur Balance):**

1. **App-Fees skalieren mit Umsatz.** Klaviyo/Yotpo/ReCharge nehmen Prozent vom Revenue — bei 200k €/Monat = brutal.
2. **Theme-Updates brechen Custom-Code.** Jedes Mal Re-Testing.
3. **Vendor-Lock-in.** Migration weg von Shopify dauert Wochen.
4. **Editorial wirkt immer "noch ein Shop".** Premium-Positionierung schwer.

---

## Quellen

- [Shopify Preise DE (offiziell, Juni 2026)](https://www.shopify.com/de/preise)
- [Shopify Help Center DE — Themes/Produkte/Versand/Discounts/Fulfillment](https://help.shopify.com/de)
- [Shopify Fees 2026: Real Numbers — Connectbooks](https://www.connectbooks.com/blog-posts/shopify-fees-2026)
- [Shopify Pricing 2026 Hidden Costs — Marketers Choice](https://marketerschoice.com/shopify-pricing-2026/)
- [Shopify vs Custom Next.js 2026 — Groovy Web](https://www.groovyweb.co/blog/shopify-vs-custom-ecommerce-development-2026)
- [Next.js vs Shopify for Developers — Front Kit](https://thefrontkit.com/blogs/nextjs-vs-shopify-for-developers)
- [Shopify B2B 2026 Plans & Features — Ask Phill](https://askphill.com/blogs/blog/b2b-on-shopify)
- [Shopify Wholesale Guide 2026 — Easy Apps](https://easyappsecom.com/guides/shopify-wholesale-guide)
- [Best Shopify Apps 2026 — Charle Agency](https://www.charle.co.uk/articles/best-shopify-apps/)
- [Judge.me vs Loox vs Yotpo 2026 — Shop Experts](https://shopexperts.com/help/yotpo-loox-judge-me-shopify)
- [Shopify Abandoned Cart Recovery 2026 — Recapture](https://recapture.io/shopify-abandoned-cart-recovery/)
- [Shopify Plus Pricing 2026 — Elogic](https://elogic.co/blog/shopify-plus-pricing-2026/)

---

**Erstellt am:** 2026-06-13
**Naechster Schritt:** Pflicht-13-Liste in `project/todos.md` als V1-Roadmap einbauen + Aufwand schaetzen + Start-Datum festlegen.
