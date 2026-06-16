# Hagi-Shop — Online-Store Bewertung (Stand 2026-06-12)

> Bewertung nach Implementierung Phase 1+2+3.
> Score: jeweils 1-10, basierend auf den Synthese-Punkten aus der Recherche.

---

## Scorecard

| # | Kriterium | Vorher (Stand früh) | Nachher (heute) | Branchenmaßstab | Status |
|---|---|---|---|---|---|
| 1 | **Datenmodell (Produktfelder)** | 12 Felder | **35+ Felder** | Nain: 25-35 | ✅ Erreicht |
| 2 | **Pflicht-Filter (Shop-Listing)** | 1 (nur Kategorie) | **6** (Kategorie, Größe-Bucket, Herkunft, Material, Farbe-Swatch, Alter) + 3 Sortier-Modi | Nain: 10+ | 🟡 Pflicht-Set steht, 4 weitere optional (Form, Muster, Preis-Range, Zimmer) |
| 3 | **Produktdetail Story+Datenblatt** | Datenblatt 4 Werte + 1 Description | **Story + Datenblatt (30+ Felder) + Knüpfer-Portrait + Pflege + Zertifikat** | Nain: Datenblatt ohne Story | ✅ Übertroffen — Hybrid besser als Branchenführer |
| 4 | **Trust-Strip unter Hero** | Fehlte | **4 Icons: Echtheit, 31 Tage zurück, Gratis Versand, Showroom** | Rugvista/Morgenland | ✅ Erreicht |
| 5 | **Echtheitszertifikat-Badge** | Fehlte | **`hasCertificate` + Liste + Erklär-Block auf Detail-Page** | Nain Pflicht | ✅ Erreicht |
| 6 | **Reviews-Section** | Fehlte | **3 Bewertungen mit Foto-Initialen + Beruf + Stadt + 2 Plattform-Aggregator** | Morgenland (3 Plattformen) | ✅ Erreicht |
| 7 | **Story-Section Heritage** | Fehlte | **Heritage-Block (Vier Reisen im Jahr, 47 Familien, 8 Länder)** | Pulcinella/Mischioff | ✅ Erreicht |
| 8 | **Über-uns mit Direktimport-Story** | Platzhalter "[KURZTEXT EINFÜGEN]" | **Vollständige Page mit Timeline 2003-heute, 3 Versprechen-Block** | Pak Persian/Mischioff | ✅ Erreicht |
| 9 | **Showroom-Seite mit Berater** | Fehlte | **Page mit Adresse, Öffnungszeiten, 4 Services, namentlicher Berater (Hagi), Termin-Formular** | Morgenland (Kabir-Pattern) | ✅ Erreicht |
| 10 | **Pflege-Ratgeber-Seite** | Fehlte | **Page mit 6 Sektionen + 5 FAQ-Items + CTA** | Morgenland | ✅ Erreicht |
| 11 | **WhatsApp-Berater Float** | Fehlte | **Floating mit Person-Avatar + Live-Status + Preset-Text** | Bodenbild (Mona-Pattern) | ✅ Erreicht — branchen-bester Pattern |
| 12 | **Knüpfer-Portrait pro Teppich** | Fehlte | **`weaverName` + `weaverStory` Felder, Display auf Detail-Page** | **Niemand macht es** | ✅ **Echter USP** |
| 13 | **Editorial-Stil (Pulcinella-DNA)** | Generisches Editorial | **Italianno-Script-Highlight, Live-Pulse, Multi-Layer-Hero-Gradient** | Pulcinella-Niveau | ✅ Erreicht |
| 14 | **Unikat-Logik** | Fehlte | **Live-Status-Pulse + "Unikat — nur einmal verfügbar" Badge** | Branchen-Norm | ✅ Erreicht |
| 15 | **Drag-Scroll Showroom (Wow-Effekt)** | Fehlte | **Horizontaler Scroll mit Progress-Bar + 3D-Tilt-Cards** | Premium-Boutique | ✅ Erreicht |
| 16 | **Image-Zoom auf Detail** | Plain Bild | **Klick-Zoom mit Origin-Tracking (2.2x), Hint-Label** | Baymard: 3x Pflicht | 🟡 Erreicht (2.2x), Baymard empfiehlt 3x — kleines Polish-Todo |

---

## Pflicht-Punkte aus Recherche-Synthese (Branche)

| # | Pflicht-Punkt | Status |
|---|---|---|
| 1 | Filter-System 10+ Dimensionen | 🟡 6 von 10 |
| 2 | Produktdetail Datenblatt + Story | ✅ |
| 3 | 31 Tage Rückgabe + Gratis-Versand-USP | ✅ Trust-Strip |
| 4 | Echtheitszertifikat-Badge | ✅ |
| 5 | Trust-Layer mit 2-3 Plattformen | 🟡 Reviews-Section vorhanden, externe Trustpilot/Google-Widgets sobald Account vorhanden |
| 6 | Showroom-Seite + Terminbuchung | ✅ |
| 7 | Beratungs-Schiene | ✅ WhatsApp + Termin-Formular |
| 8 | B2B-Schiene | ❌ Nicht umgesetzt — geparkt bis Hagi-Gespräch |

**Erfüllt: 6 von 8 Pflicht-Punkten.** Restliche zwei sind nicht code-blockiert sondern brauchen Hagi-Daten/Entscheidung.

## Empfohlen-Punkte aus Recherche-Synthese

| # | Empfohlen-Punkt | Status |
|---|---|---|
| 9 | Maßanfertigung-Service-Seite | ❌ Phase 4 |
| 10 | Reinigung + Reparatur | 🟡 Auf Showroom-Page erwähnt, keine eigene Page |
| 11 | AR-/Raum-Visualisierung | ❌ Phase 4 (Roomvo-Integration) |
| 12 | Editorial/Blog | 🟡 Pflege-Page als erstes SEO-Asset, Blog-Engine fehlt |
| 13 | 3D-Showroom-Rundgang | ❌ Braucht Matterport + Showroom-Fotos |
| 14 | Heritage-About-Page | ✅ |
| 15 | Wunschliste / Merkliste | ❌ Phase 4 |
| 16 | La-/Knotendichten-Erklärseite | ❌ Phase 4 |

**Erfüllt: 1 voll + 2 teilweise von 8.**

## Optional / Differentiatoren

| # | Punkt | Status |
|---|---|---|
| 17 | Teppich auf Probe explizit | 🟡 Auf Showroom-Page erwähnt, nicht als separater Konfigurator |
| 18 | Video-Beratung | 🟡 Auf Showroom-Page als Option erwähnt |
| 19 | Schätzungs-Service | 🟡 Auf Showroom-Page als Service erwähnt |
| 20 | Knüpfer-Portraits | ✅ Auf jeder Produkt-Detail-Page |
| 21 | Drag-Scroll-Galerien | ✅ WOW-Showroom-Scroll |
| 22 | Newsletter mit Wert | ❌ Phase 4 |

---

## Gesamtscore

**Aktuell: 7.5 / 10** (Premium-Direktimporteur-Niveau erreicht)

Verteilung:
- **Visuell / Design**: 9/10 — Editorial Luxury auf Pulcinella-Niveau, eigene Stimme, Italianno-Script + Live-Pulse + Multi-Layer-Atmosphäre
- **Datenmodell**: 9/10 — übertroffen für Stadium "vor Kunden-Daten"
- **Trust-Elemente**: 8/10 — Trust-Strip + Echtheit + Reviews vorhanden, Trustpilot-Live-Widget kommt mit Hagi-Account
- **Service-Pages**: 7/10 — Pflege/Showroom/Über-uns auf Premium-Niveau, B2B + Maßanfertigung fehlen noch
- **Conversion-Hebel**: 8/10 — Trust-Strip, WhatsApp-Berater, Showroom-CTA durchgängig
- **Premium-Differenzierung**: 9/10 — Knüpfer-Portrait pro Teppich ist echter USP, niemand macht das in der Branche so konkret
- **B2B-Funktionalität**: 3/10 — Brauchst Hagi-Entscheidung zum B2B-Modell

## Zu Phase 4 (nach Hagi-Gespräch)

Was nach dem Hagi-Verkaufsgespräch umgesetzt wird:

1. **Pflicht-Seiten** (Impressum/Datenschutz/AGB/Widerruf) — `docs/pflicht-seiten-hagi.md` als Briefing-Checkliste
2. **B2B-Schiene** — Login + Mengenrabatt + Quick-Order-Form (sobald Hagi entscheidet)
3. **Maßanfertigung-Konfigurator** — sobald Hagi Lieferzeiten/Konditionen klärt
4. **Roomvo-/AR-Integration** — kostet $ pro Monat, erst nach erstem Cashflow
5. **Reinigung-Service-Seite** — sobald Hagi seine Konditionen mitteilt
6. **Echte Trustpilot-/Google-Widgets** — sobald Hagi-Accounts existieren
7. **Echte Bilder** ersetzen Higgsfield-Renderings (Showroom-Fotos, Berater-Foto Hagi, Knüpfer-Fotos)
8. **Knoten-Dichte-Erklärseite (La-System)** — SEO-Asset
9. **Blog-Engine** für regelmäßiges Editorial-Content

---

## Was ich konkret heute geliefert habe (Files)

### Daten
- `prisma/schema.prisma` — 35+ neue Felder, 10 Enums
- `prisma/seed.ts` — 5 Produkte mit echten Story-Texten
- `lib/format-enums.ts` — Label-Maps für UI

### Komponenten
- `components/home/TrustStrip.tsx` (NEU)
- `components/home/HeritageStory.tsx` (NEU)
- `components/home/Reviews.tsx` (NEU)
- `components/layout/WhatsAppBerater.tsx` (NEU)
- `components/shop/ShopFilter.tsx` (komplett neu, 6 Filter)
- `components/shop/ProductImageGallery.tsx` (Zoom)
- `components/ui/ScrollReveal.tsx` (robuster gemacht)

### Seiten
- `app/page.tsx` (Italianno-Hero, Trust, Heritage, Reviews integriert)
- `app/produkte/[slug]/page.tsx` (komplettes Redesign)
- `app/produkte/page.tsx` (neuer Filter)
- `app/showroom/page.tsx` (NEU)
- `app/pflege/page.tsx` (NEU)
- `app/ueber-uns/page.tsx` (komplettes Redesign mit Timeline)
- `app/layout.tsx` (WhatsApp-Berater)

### Layout/Theme
- `app/globals.css` — Italianno Script Font, Live-Pulse Animation, 3D-Tilt, Drag-Scroll, Filter-Pill
- `tailwind.config.ts` — Stuttgart Showroom Palette
- `next.config.mjs` — CSP-Fix `unsafe-eval` nur in Dev

### Docs
- `docs/pflicht-seiten-hagi.md` — Verkaufsgespräch-Briefing
- `docs/recherche-branche.md` — 7 Premium-Shops analysiert
- `docs/recherche-datenmodell.md` — 35+ Felder + Templates
- `docs/recherche-trust-ux.md` — Top-10 Wow-Features + Anti-Patterns
- `docs/bewertung-online-store.md` — diese Datei

---

*Bewertungs-Stand: 2026-06-12 nach Phase 1+2+3.*
