# Recherche: Premium-Teppich-Datenmodell

**Datum:** 2026-06-12
**Ziel:** Aktuelles Hagi-Prisma-Schema (12 Felder) auf Premium-Niveau erweitern
**Quellen:** Nain Trading, RugVista (ehem. CarpetVista), Mischioff, Morgenland, TEPGO, Orientteppich-Lexikon, Otto/CABBEL, Gallery Jarrodi

---

## TL;DR (3-Satz-Zusammenfassung)

1. **Premium-Shops fuehren 25–35 Produktfelder** — wir haben aktuell 12. Die wichtigsten Luecken sind: Knotendichte, Knuepftechnik, Provenienz (Stadt/Region), Florhoehe, Alter, Form, Hauptfarbe, Gewicht, Zertifikate.
2. **Filter-Sidebar entscheidet ueber Datenmodell** — alles was filterbar sein soll muss als Enum oder strukturiertes Feld in der DB liegen (nicht im Beschreibungstext).
3. **Produktbeschreibungen sind hybrid**: 150–400 Woerter, Storytelling-Lead (1–2 Saetze) + technisches Datenblatt (Tabelle) + Pflege/Verwendung.

---

## A) Vollstaendige Felder-Liste

Sortiert nach Wichtigkeit. **Pflicht** = bei Premium-Shops immer angegeben. **Optional** = nur bei bestimmten Teppichtypen.

### 1. Identifikation & Basis

| Feld DE | Feld EN | Datentyp | Pflicht | Beispielwerte | Wofuer |
|---|---|---|---|---|---|
| Artikelnummer / SKU | `sku` | String (unique) | **Pflicht** | "HAGI-NAI-0042" | Bestellung, Lagerbestand, Echtheits-Tracking |
| Name | `name` | String | **Pflicht** | "Nain 6la Royal Toudeshk" | SEO, Anzeige |
| Slug | `slug` | String | **Pflicht** | "nain-6la-royal-toudeshk" | URL |
| Produkttyp | `carpetType` | Enum | **Pflicht** | Persisch, Tuerkisch, Kelim, Berber, Gabbeh, Modern Designer | Hauptkategorisierung |

### 2. Masse & Form (Pflicht-Filter)

| Feld DE | Feld EN | Datentyp | Pflicht | Beispiel | Wofuer |
|---|---|---|---|---|---|
| Breite | `widthCm` | Float | **Pflicht** | 195 | Filter, Anzeige |
| Laenge | `lengthCm` | Float | **Pflicht** | 295 | Filter, Anzeige |
| Form | `shape` | Enum | **Pflicht** | rechteckig, quadratisch, rund, oval, laeufer | Filter |
| Florhoehe | `pileHeightMm` | Float | **Pflicht** | 8 | Quality-Signal (3–6 mm = Premium) |
| Gesamthoehe | `totalHeightMm` | Float | Optional | 12 | Versandberechnung |
| Gewicht | `weightKg` | Float | Optional | 14.5 | Versandkosten, Quality-Signal |
| Gewicht/m² | `weightPerSqmKg` | Float | Optional | 3.2 | Dichte-Indikator (Profi-Info) |
| Groessenkategorie | `sizeCategory` | Enum | Optional | klein (<150cm), mittel (150–229), gross (230–349), xl (>350) | Schnellfilter |

### 3. Material (Pflicht-Filter)

| Feld DE | Feld EN | Datentyp | Pflicht | Beispiel | Wofuer |
|---|---|---|---|---|---|
| Hauptmaterial Flor | `pileMaterial` | Enum | **Pflicht** | Schurwolle, Seide, Bambusseide, Baumwolle, Viskose, Mischfaser | Filter, Preisindikator |
| Anteil Wolle | `woolPercent` | Int | Optional | 85 | Material-Mix-Transparenz |
| Anteil Seide | `silkPercent` | Int | Optional | 15 | Preisbegruendung |
| Anteil Baumwolle | `cottonPercent` | Int | Optional | 0 | — |
| Kettmaterial | `warpMaterial` | Enum | Optional | Baumwolle, Seide, Wolle | Echtheitsnachweis |
| Schussmaterial | `weftMaterial` | Enum | Optional | Baumwolle, Wolle | Echtheitsnachweis |
| Fransen-Material | `fringeMaterial` | String | Optional | "Baumwolle, in Knuepfung integriert" | Echtheits-Pflicht (nicht aufgenaeht!) |

### 4. Herstellung & Knotendichte (Echtheits-Kern)

| Feld DE | Feld EN | Datentyp | Pflicht | Beispiel | Wofuer |
|---|---|---|---|---|---|
| Herstellungsart | `manufacturingType` | Enum | **Pflicht** | handgeknuepft, handgewebt, handgetuftet, Webstuhl, maschinell | Filter, Preis |
| Knuepftechnik | `knotTechnique` | Enum | Optional | Senneh (persisch/asymmetrisch), Ghiordes (tuerkisch/symmetrisch), Jufti, Tibetisch | Echtheitsnachweis |
| Knoten pro m² | `knotsPerSqm` | Int | **Pflicht** bei handgeknuepft | 380.000 | Quality-Hauptsignal |
| Knoten pro cm² | `knotsPerSqcm` | Int | Optional (berechnet) | 38 | Anzeige-Variante |
| Knotenzahl-Kategorie | `knotDensityClass` | Enum | Optional | sehr-grob (40–80k), grob (80–120k), mittel (120–240k), fein (240–360k), sehr-fein (360–500k), extrem-fein (500k–1M), meisterwerk (>1M) | Quality-Badge |
| Knuepfdauer | `knottingDurationMonths` | Int | Optional | 14 | Storytelling, Preisbegruendung |

### 5. Herkunft & Provenienz (SEO-kritisch)

| Feld DE | Feld EN | Datentyp | Pflicht | Beispiel | Wofuer |
|---|---|---|---|---|---|
| Herkunftsland | `originCountry` | Enum | **Pflicht** | Iran, Tuerkei, Afghanistan, Pakistan, Indien, Nepal, Marokko, China | Filter |
| Region | `originRegion` | String | Optional | "Zentral-Iran", "Anatolien" | SEO |
| Stadt / Provenienz | `originCity` | String | **Pflicht** bei Perser | "Nain", "Taebriz", "Isfahan", "Ghom", "Bidjar", "Keschan", "Moud", "Kerman", "Maschhad", "Sarough" | SEO-Hauptkeyword, Filter |
| Knuepferfamilie / Werkstatt | `workshop` | String | Optional | "Werkstatt Habibian", "Toudeshk Kollektiv" | Provenienz-Beleg, Preisbegruendung |
| Signiert | `isSigned` | Bool | Optional | true | Echtheits-Plus |
| Signatur-Text | `signature` | String | Optional | "Habibian" | Sammler-relevant |

### 6. Alter & Zustand

| Feld DE | Feld EN | Datentyp | Pflicht | Beispiel | Wofuer |
|---|---|---|---|---|---|
| Alters-Kategorie | `ageCategory` | Enum | **Pflicht** | neu (0–20), alt (20–50), semi-antik (50–100), antik (100+) | Filter |
| Herstellungsjahr (ca.) | `yearMade` | Int | Optional | 1995 | Praezision bei Antik/Semi-Antik |
| Zustand | `condition` | Enum | **Pflicht** | neuwertig, sehr-gut, gut, getragen, restauriert | Vertrauen |
| Restauriert | `isRestored` | Bool | Optional | false | Transparenz |
| Patina | `hasPatina` | Bool | Optional | true | Vintage-Verkaufsargument |

### 7. Muster & Design (Filter-Pflicht)

| Feld DE | Feld EN | Datentyp | Pflicht | Beispiel | Wofuer |
|---|---|---|---|---|---|
| Muster-Typ | `patternType` | Enum (multi) | **Pflicht** | medaillon, allover, floral, geometrisch, figural, nomadisch, baum-des-lebens, jagdszene, spiegel, uni, gestreift, abstrakt, minimalistisch | Filter |
| Motiv-Detail | `patternMotif` | String[] | Optional | ["Boteh", "Herati", "Mina-Khani", "Shah-Abbasi"] | SEO, Kennerwissen |
| Stil-Richtung | `style` | Enum | **Pflicht** | klassisch, modern, tribal, vintage, designer, kelim, gabbeh | Filter |

### 8. Farben (Filter-Pflicht)

| Feld DE | Feld EN | Datentyp | Pflicht | Beispiel | Wofuer |
|---|---|---|---|---|---|
| Hauptfarbe | `mainColor` | Enum | **Pflicht** | rot, blau, beige, gruen, braun, grau, schwarz, weiss, gold, rosa, multicolor | Filter (Top-3-Filter neben Groesse + Preis) |
| Nebenfarben | `accentColors` | String[] | Optional | ["elfenbein", "anthrazit", "rost"] | Detail, SEO |
| Farb-Familie | `colorFamily` | Enum | Optional | warm, kuehl, neutral, kontrast | UX-Filter |

### 9. Zertifikate & Ethik

| Feld DE | Feld EN | Datentyp | Pflicht | Beispiel | Wofuer |
|---|---|---|---|---|---|
| Echtheitszertifikat | `hasCertificate` | Bool | **Pflicht** | true | Vertrauenssignal |
| Zertifikat-Typ | `certificateType` | String[] | Optional | ["Care & Fair", "GoodWeave", "Label STEP"] | Ethik-Kaeufer |
| Kinderarbeit-frei | `childLaborFree` | Bool | Optional | true | DSGVO-aehnliche Pflichtinfo seit LkSG |
| Vegan | `isVegan` | Bool | Optional | false | Mikro-Zielgruppe |
| Natuerliche Faerbung | `naturalDyes` | Bool | Optional | true | Premium-Signal |

### 10. Pflege & Eignung

| Feld DE | Feld EN | Datentyp | Pflicht | Beispiel | Wofuer |
|---|---|---|---|---|---|
| Empfohlener Raum | `recommendedRoom` | Enum (multi) | Optional | wohnzimmer, schlafzimmer, esszimmer, flur, kueche, kinderzimmer | Filter |
| Beanspruchbarkeit | `durabilityClass` | Enum | Optional | leicht, mittel, stark, extrem | UX |
| Fussbodenheizung-geeignet | `underfloorHeating` | Bool | Optional | true | DACH-Pflichtinfo |
| Allergiker-geeignet | `allergyFriendly` | Bool | Optional | false | Mikro-Zielgruppe |
| Pflegehinweis | `careInstructions` | Text | **Pflicht** | "Regelmaessig saugen ohne Buerstwalze..." | Verpflichtung |

### 11. Logistik & Lieferung

| Feld DE | Feld EN | Datentyp | Pflicht | Beispiel | Wofuer |
|---|---|---|---|---|---|
| Versandgewicht | `shippingWeightKg` | Float | **Pflicht** | 17.5 | Versandkosten |
| Versand-Verpackung | `packagingType` | String | Optional | "Rolle, in Folie + Karton" | UX |
| Lieferzeit (Tage) | `deliveryDaysMin` / `deliveryDaysMax` | Int | **Pflicht** | 3 / 5 | Conversion |
| Verfuegbarkeit | `availabilityStatus` | Enum | **Pflicht** | sofort-lieferbar, auf-lager, einzelstueck, vorbestellung | UX |
| Einzelstueck | `isUnique` | Bool | Optional | true | "Unikat"-Badge fuer Marketing |

### 12. SEO & Marketing

| Feld DE | Feld EN | Datentyp | Pflicht | Beispiel | Wofuer |
|---|---|---|---|---|---|
| SEO-Titel | `seoTitle` | String | Optional | "Nain 6la Perserteppich 195x295 cm | Hagi Stuttgart" | Google |
| SEO-Beschreibung | `seoDescription` | String | Optional | 160 Zeichen | Google-Snippet |
| Kurzbeschreibung | `shortDescription` | String | **Pflicht** | 1–2 Saetze fuer Kategorieseite | UX |
| Story-Beschreibung | `storyDescription` | Text | Optional | 200–400 Woerter Editorial | Premium-Positionierung |
| Tags | `tags` | String[] | Optional | ["luxus", "investment", "sammlerstueck"] | Filter, Cross-Sell |

---

## B) Produktbeschreibung-Pattern

Auswertung von Nain Trading, Morgenland, TEPGO, Mischioff, Otto-CABBEL, Gallery Jarrodi.

### Laenge
- **Otto / Massenmarkt:** 50–120 Woerter (Bullet-Points dominieren)
- **Nain Trading / Spezialist:** 150–250 Woerter (technisch + neutral)
- **Mischioff / Editorial-Luxury:** 200–400 Woerter (Storytelling stark)
- **TEPGO:** 200–300 Woerter (kulturell + technisch)

**Sweet Spot fuer Hagi: 200–300 Woerter.**

### Struktur (das Pattern, das ueberall wiederkehrt)

```
1. LEAD (1–2 Saetze) — emotionaler Einstieg, Hook
2. HERKUNFTS-STORY (2–4 Saetze) — Region, Tradition, Handwerk
3. DESIGN-BESCHREIBUNG (2–4 Saetze) — Muster, Farben, Stilrichtung
4. DATENBLATT (Tabelle) — alle technischen Felder
5. PFLEGE & RAUM-EMPFEHLUNG (2–3 Saetze) — praktisch
6. EINZELSTUECK-HINWEIS (1 Satz) — "Jeder Teppich ist ein Unikat..."
```

### Tonalitaet: Editorial-Luxury vs. Nuechtern

- **Nain Trading:** nuechtern, faktenorientiert ("Der Teppich misst 195x295 cm, wurde in Nain handgeknuepft, Knotendichte 380.000/m².")
- **Mischioff:** poetisch ("Aus Hochlandwolle des Himalaya und feiner chinesischer Seide entsteht ein Stueck Zeit.")
- **TEPGO:** kulturell ("Berberteppiche sind weit mehr als einfache Bodenbelaege – sie sind lebendige Handwerkskunst aus dem Herzen Nordafrikas.")
- **CABBEL/Otto:** Mischung ("Der Premium Perser Gabbeh Teppich vereint traditionelle Handwerkskunst mit zeitloser Eleganz. Jeder Teppich wird in Persien in aufwendiger Handarbeit gefertigt...")

**Empfehlung Hagi: Editorial-Luxury mit Storytelling-Lead + sachlichem Datenblatt.** Differenziert von Otto/Amazon, passt zur Stuttgarter Galerie-Positionierung.

### 3 echte Beispieltexte (zitiert)

**Beispiel 1 — Morgenland (Casa-Kollektion):**
> "Dieser handgeknuepfte Teppich verbindet zeitlosen Minimalismus mit sanften Naturtoenen. Aus hochwertiger Wolle gefertigt, besticht er durch reduzierte Muster und elegante Schlichtheit – ideal fuer ruhige, moderne Wohnraeume, die Aesthetik und Langlebigkeit vereinen."

**Beispiel 2 — TEPGO (Berber):**
> "Berberteppiche sind weit mehr als einfache Bodenbelaege – sie sind lebendige Handwerkskunst aus dem Herzen Nordafrikas. Seit Jahrhunderten knuepfen die Berberstaemme Marokkos und des Atlasgebirges ihre Teppiche von Hand, aus Schurwolle, mit und ohne Mustern, die kulturelle Bedeutung tragen."

**Beispiel 3 — CABBEL via Otto:**
> "Der Premium Perser Gabbeh Teppich vereint traditionelle Handwerkskunst mit zeitloser Eleganz. Jeder Teppich wird in Persien in aufwendiger Handarbeit gefertigt und besteht aus hochwertiger, natuerlicher Wolle."

**Beispiel 4 — Mischioff (Material-Story):**
> "Hochlandwolle aus dem Himalaya und feine Seide aus China – jeder Mischioff-Teppich ist ein handgefertigtes Unikat."

**Beispiel 5 — Markanto (Kulturkontext):**
> "Tradition und Kunsthandwerk greifen in der Teppich-Herstellung ineinander. Wandteppiche, wie der orientalische Wirkteppich, erzaehlen uns mit ihren bildlichen Darstellungen Geschichten von fernen Kulturen und Zeiten."

---

## C) Empfehlung Hagi Prisma-Schema

### Prioritaeten

- **MUSS-Erweiterung (Migration 1, jetzt):** SKU, Form, Florhoehe, Hauptmaterial-Enum, Knotendichte, Knuepftechnik, Herstellungsart, Stadt/Provenienz, Alters-Kategorie, Zustand, Muster-Typ, Stil, Hauptfarbe, Nebenfarben, Pflegehinweis, Versandgewicht, Verfuegbarkeit, Kurzbeschreibung, Story-Beschreibung, isUnique, hasCertificate
- **SOLLTE-Erweiterung (Migration 2, naechste Woche):** Werkstatt, Signiert, Anteile (Wolle/Seide/Baumwolle), Empfohlener Raum, Fussbodenheizung, Knuepfdauer, Tags, SEO-Felder
- **KANN-Erweiterung (spaeter):** Allergiker, Vegan, Restauriert, Natuerliche-Faerbung, Zertifikat-Typ-Liste

### Prisma-Code (Migration-ready) — Migration 1

```prisma
// Teppich-Produkt — erweitert fuer Premium-Positionierung
model Product {
  id          String      @id @default(cuid())
  sku         String?     @unique                    // NEU: "HAGI-NAI-0042"
  name        String
  slug        String      @unique

  // Beschreibungen (3 Ebenen)
  shortDescription String?                            // NEU: 1–2 Saetze fuer Kategorieseite
  description     String?                             // bestehend = Datenblatt-Text
  storyDescription String?    @db.Text                // NEU: 200–400 Woerter Editorial

  // Preis
  price        Int
  comparePrice Int?
  images       String[]

  // Beziehung
  categoryId   String
  category     Category    @relation(fields: [categoryId], references: [id])

  // Masse & Form
  sizeWidth    Float?      // bestehend = widthCm
  sizeLength   Float?      // bestehend = lengthCm
  shape        Shape?                                 // NEU
  pileHeightMm Float?                                 // NEU
  weightKg     Float?                                 // NEU
  shippingWeightKg Float?                             // NEU

  // Material
  pileMaterial PileMaterial?                          // NEU (Enum statt String)
  woolPercent  Int?                                   // NEU
  silkPercent  Int?                                   // NEU
  warpMaterial String?                                // NEU
  weftMaterial String?                                // NEU

  // Herstellung & Knoten
  manufacturingType ManufacturingType?                // NEU
  knotTechnique     KnotTechnique?                    // NEU
  knotsPerSqm       Int?                              // NEU — Quality-Hauptsignal
  knottingDurationMonths Int?                         // NEU

  // Herkunft (bestehend origin -> aufgeteilt)
  originCountry OriginCountry?                        // NEU (Enum)
  originRegion  String?                               // NEU
  originCity    String?                               // NEU — z.B. "Nain", "Taebriz"
  workshop      String?                               // NEU
  isSigned      Boolean   @default(false)             // NEU

  // Alter & Zustand
  ageCategory   AgeCategory?                          // NEU
  yearMade      Int?                                  // NEU
  condition     Condition?                            // NEU

  // Muster, Stil, Farbe
  patternType   PatternType[]                         // NEU (multi)
  patternMotif  String[]                              // NEU
  style         Style?                                // NEU
  mainColor     MainColor?                            // NEU
  accentColors  String[]                              // NEU

  // Pflege & Eignung
  recommendedRoom    Room[]                           // NEU (multi)
  underfloorHeating  Boolean @default(false)          // NEU
  careInstructions   String?                          // NEU

  // Zertifikate
  hasCertificate Boolean @default(false)              // NEU
  certificateType String[]                            // NEU

  // Marketing
  isUnique     Boolean    @default(true)              // NEU — Premium-Badge
  tags         String[]                               // NEU
  seoTitle     String?                                // NEU
  seoDescription String?                              // NEU

  // Bestand
  inStock      Boolean    @default(true)
  featured     Boolean    @default(false)

  orderItems   OrderItem[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

enum Shape {
  RECHTECKIG
  QUADRATISCH
  RUND
  OVAL
  LAEUFER
}

enum PileMaterial {
  SCHURWOLLE
  SEIDE
  BAMBUSSEIDE
  BAUMWOLLE
  VISKOSE
  MISCHFASER
  SYNTHETIK
}

enum ManufacturingType {
  HANDGEKNUEPFT
  HANDGEWEBT
  HANDGETUFTET
  WEBSTUHL
  MASCHINELL
}

enum KnotTechnique {
  SENNEH       // persisch / asymmetrisch
  GHIORDES     // tuerkisch / symmetrisch
  JUFTI
  TIBETISCH
}

enum OriginCountry {
  IRAN
  TUERKEI
  AFGHANISTAN
  PAKISTAN
  INDIEN
  NEPAL
  MAROKKO
  CHINA
}

enum AgeCategory {
  NEU             // 0–20 Jahre
  ALT             // 20–50 Jahre
  SEMI_ANTIK      // 50–100 Jahre
  ANTIK           // 100+ Jahre
}

enum Condition {
  NEUWERTIG
  SEHR_GUT
  GUT
  GETRAGEN
  RESTAURIERT
}

enum PatternType {
  MEDAILLON
  ALLOVER
  FLORAL
  GEOMETRISCH
  FIGURAL
  NOMADISCH
  BAUM_DES_LEBENS
  JAGDSZENE
  SPIEGEL
  UNI
  GESTREIFT
  ABSTRAKT
  MINIMALISTISCH
}

enum Style {
  KLASSISCH
  MODERN
  TRIBAL
  VINTAGE
  DESIGNER
  KELIM
  GABBEH
}

enum MainColor {
  ROT
  BLAU
  BEIGE
  GRUEN
  BRAUN
  GRAU
  SCHWARZ
  WEISS
  GOLD
  ROSA
  MULTICOLOR
}

enum Room {
  WOHNZIMMER
  SCHLAFZIMMER
  ESSZIMMER
  FLUR
  KUECHE
  KINDERZIMMER
}
```

### Beispieldaten (Hagi-Test-Produkt)

```ts
{
  sku: "HAGI-NAI-0001",
  name: "Nain 6la Perserteppich Toudeshk",
  slug: "nain-6la-perserteppich-toudeshk",
  shortDescription: "Klassischer Nain mit Medaillon-Muster aus zentraliranischer Werkstatt, 380.000 Knoten/m².",
  price: 289000,  // 2.890 €
  comparePrice: 349000,
  sizeWidth: 195,
  sizeLength: 295,
  shape: "RECHTECKIG",
  pileHeightMm: 8,
  weightKg: 14.5,
  shippingWeightKg: 17.5,
  pileMaterial: "SCHURWOLLE",
  woolPercent: 90,
  silkPercent: 10,
  warpMaterial: "Baumwolle",
  weftMaterial: "Baumwolle",
  manufacturingType: "HANDGEKNUEPFT",
  knotTechnique: "SENNEH",
  knotsPerSqm: 380000,
  knottingDurationMonths: 14,
  originCountry: "IRAN",
  originRegion: "Zentral-Iran",
  originCity: "Nain",
  workshop: "Toudeshk Kollektiv",
  isSigned: false,
  ageCategory: "NEU",
  yearMade: 2022,
  condition: "NEUWERTIG",
  patternType: ["MEDAILLON", "FLORAL"],
  patternMotif: ["Shah-Abbasi", "Boteh"],
  style: "KLASSISCH",
  mainColor: "BEIGE",
  accentColors: ["elfenbein", "kobaltblau", "rost"],
  recommendedRoom: ["WOHNZIMMER", "ESSZIMMER"],
  underfloorHeating: true,
  careInstructions: "Regelmaessig saugen ohne Buerstwalze. Bei Flecken sofort mit lauwarmem Wasser tupfen. Alle 3–5 Jahre professionelle Reinigung empfohlen.",
  hasCertificate: true,
  certificateType: ["Care & Fair"],
  isUnique: true,
  tags: ["sammlerstueck", "investment", "klassisch"],
  inStock: true,
  featured: true
}
```

---

## D) Content-Templates — 3 Beispiel-Produktbeschreibungen

Stil: **Editorial-Luxury** — Storytelling-Lead + Daten + Pflege.

### Template 1: Klassischer Perser (Beispiel: Nain 6la)

**Titel:** Nain 6la Perserteppich — Toudeshk Werkstatt, 195 × 295 cm

**Kurzbeschreibung (Card):**
> Klassischer Nain mit feinem Medaillon, geknuepft in der zentraliranischen Toudeshk-Werkstatt. 380.000 Knoten pro Quadratmeter, vierzehn Monate Handarbeit.

**Story-Beschreibung (Detail):**
> In den Werkstaetten von Nain, einer kleinen Oasenstadt im Herzen Irans, entstand dieser Teppich in vierzehn Monaten reiner Handarbeit. Die Region ist seit den 1920er Jahren beruehmt fuer eine der feinsten Knuepfschulen der Welt — und dieses Stueck zeigt warum.
>
> Das zentrale Medaillon in zartem Elfenbein wird von einem floralen Allover-Muster aus Shah-Abbasi-Bluete und Boteh getragen. 90 Prozent feinste Schurwolle, 10 Prozent Naturseide fuer den charakteristischen Glanz. Die Knotendichte von 380.000 Knoten pro Quadratmeter macht den Teppich nicht nur extrem strapazierfaehig, sondern auch zu einer wertstabilen Anlage.
>
> Geeignet fuer Wohn- und Esszimmer, kompatibel mit Fussbodenheizung. Jeder Hagi-Teppich kommt mit Echtheitszertifikat und ist ein Einzelstueck — kein zweiter dieser Welt sieht exakt so aus.
>
> **Pflege:** Regelmaessig ohne Buerstwalze saugen. Bei Flecken sofort mit lauwarmem Wasser tupfen. Alle 3–5 Jahre Profi-Reinigung.

---

### Template 2: Vintage / Semi-Antik (Beispiel: Taebriz 50 Jahre)

**Titel:** Taebriz Vintage-Perserteppich — ca. 1975, 240 × 340 cm

**Kurzbeschreibung (Card):**
> Semi-antiker Taebriz mit Jagdszene und tiefer Patina. Ca. 1975 geknuepft, ein Halb-Jahrhundert Wohnkultur in einem Stueck.

**Story-Beschreibung (Detail):**
> Taebriz im Nordwest-Iran gilt seit dem 16. Jahrhundert als Hauptstadt der persischen Knuepfkunst. Dieser Teppich entstand vor rund fuenfzig Jahren in einer der traditionsreichen Werkstaetten der Stadt — und traegt jedes Jahr seiner Geschichte sichtbar.
>
> Die Jagdszene mit reitenden Figuren, Vogeldarstellungen und stilisierten Baeumen wird von einer doppelten Bordur eingefasst. Die Farben — gedeckter Indigoblau, warmer Granatrot, Elfenbein — haben jene tiefe Patina entwickelt, die nur Jahrzehnte echten Gebrauchs schaffen.
>
> Reine Schurwolle auf Baumwoll-Kette, asymmetrische Senneh-Knuepfung, 320.000 Knoten pro Quadratmeter. Zustand: gut, mit charaktervollen Gebrauchsspuren, die seinen Wert nicht mindern, sondern definieren.
>
> Ein Stueck fuer Sammler und Liebhaber, die das Echte dem Neuen vorziehen. Inkl. Echtheits- und Altersgutachten.

---

### Template 3: Modern Designer / Berber (Beispiel: Beni Ourain)

**Titel:** Beni Ourain Berberteppich — Marokko, 200 × 300 cm

**Kurzbeschreibung (Card):**
> Handgeknuepfter Beni Ourain aus dem Atlasgebirge. Naturweisse Schurwolle, schwarze Rauten — minimalistisches Statement.

**Story-Beschreibung (Detail):**
> Die Beni-Ourain-Staemme leben seit Jahrhunderten in den Hochlagen des marokkanischen Mittleren Atlas. Ihre Teppiche werden traditionell zur Hochzeit der Toechter geknuepft — als Mitgift, als Erinnerung, als Schutz. Jede Raute, jede Linie hat ihre Bedeutung.
>
> Reine, ungefaerbte Hochlandwolle in ihrer natuerlichen Cremefarbe traegt die charakteristischen schwarzen Rauten, die wie ein archaisches Schriftbild wirken. Knuepftechnik: Ghiordes (symmetrisch), Florhoehe 20 mm, Gewicht 3,5 kg pro Quadratmeter — der typische dicke, weiche Charakter eines echten Beni Ourain.
>
> Perfekt fuer moderne, minimalistische Wohnraeume — Bauhaus, Skandinavisch, Japandi. Kein Designer-Imitat, sondern ein Original aus dem Dorf, das diesen Stil definiert hat.
>
> Inkl. Care & Fair-Zertifikat — fair entlohnte Frauen-Knuepfkooperative.

---

## Quellen

- [Nain Trading — Traditionelle Perserteppiche](https://www.naintrading.com/orientteppiche/traditionelle-perserteppiche-c-106.html) — Filter-Sidebar als Goldstandard
- [Orientteppich-Lexikon — Knuepfung](https://www.orientteppich-lexikon.de/fertigung/knuepfung/) — Knotendichte-Klassifikation
- [Orientteppich-Lexikon — Echtheits-Merkmale](https://www.orientteppich-lexikon.de/echte-orientteppiche-erkennen) — Quality-Signale
- [RugVista (CarpetVista Nachfolger)](https://www.rugvista.de/exklusive-teppiche) — Premium-Filter
- [Mischioff](https://www.mischioff.com) — Editorial-Sprachstil
- [Morgenland Teppiche](https://www.morgenland-teppiche.de/collections/designer-teppiche) — Designer-Beschreibungen
- [TEPGO Berberteppiche](https://www.tepgo.de/Berberteppiche) — Storytelling + Datenblatt
- [Otto / CABBEL Premium Gabbeh](https://www.otto.de/p/cabbel-wollteppich-premium-perser-gabbeh-teppich-blau-68x140-cm-laeufer-hoehe-20-mm-handgeknuepftes-unikat-aus-100-wolle-langlebig-und-natuerlich-S0LGD0KC/) — Massenmarkt-Vergleich
- [Teppich-Toensmann — Werterkennung](https://www.teppich-toensmann.de/echte-wertvolle-teppiche-erkennen/) — Echtheits-Checkliste
- [Teppique — Originale erkennen](https://teppique.com/blogs/news/woran-erkennt-man-einen-handgeknupften-teppich) — Echtheits-Vergleich
- [Markanto Designer-Teppiche](https://www.markanto.de/warengruppen/textilien/teppiche/) — Editorial-Beispiele
- [Gallery Jarrodi — Meshad](https://galleryjarrodi.com/products/perser-teppich-orientteppich-perserteppich-meshad-handgeknupft-fein-344x249cm) — Direkte Datenblatt-Referenz

---

## Naechster Schritt fuer Hagi

**Konkret:** Migration 1 (siehe Prisma-Snippet oben) erstellen, in `prisma/migrations/` ablegen, `npx prisma migrate dev --name premium-data-model` ausfuehren, dann `seed.ts` mit 4–5 echten Hagi-Produkten befuellen unter Verwendung der drei Content-Templates.
