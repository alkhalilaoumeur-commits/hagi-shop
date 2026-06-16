import { PrismaClient, Prisma } from "@prisma/client";
import { slugify } from "../lib/format";

const prisma = new PrismaClient();

const categories = [
  { name: "Oriental", slug: "oriental" },
  { name: "Modern", slug: "modern" },
  { name: "Kelim", slug: "kelim" },
  { name: "Vintage", slug: "vintage" },
];

type SeedProduct = Omit<Prisma.ProductCreateInput, "category"> & {
  categorySlug: string;
};

const products: SeedProduct[] = [
  {
    sku: "HAGI-NAI-0042",
    name: "Täbris Medaillon 240×170",
    slug: "taebris-medaillon-240-170",
    categorySlug: "oriental",
    price: 129900,
    comparePrice: 179900,

    shortDescription:
      "Klassischer Täbris mit zentralem Medaillon — fein geknüpft in Nordwest-Iran, das Resultat von 11 Monaten Handarbeit.",
    description:
      "Persischer Täbris mit zentralem Medaillon-Muster. Hochlandwolle auf Baumwoll-Kette, 6 La (≈ 900.000 Knoten/m²). Senneh-Knoten. Florhöhe 8 mm, Eigengewicht ca. 18 kg. Geeignet für Wohnzimmer mit Fußbodenheizung.",
    storyDescription:
      "Aus den Werkstätten von Täbris im äußersten Nordwesten des Iran — der Stadt, die in der Teppich-Welt seit dem 16. Jahrhundert als Maßstab gilt. Dieses Stück knüpfte die Familie Roshan in elf Monaten Handarbeit. Die Hochlandwolle stammt aus den Bergen Aserbaidschans, das Indigo aus Isfahan, das satte Rot aus Wurzeln der Krapppflanze. Wir haben den Teppich im April 2024 vor Ort gekauft — direkt vom Knüpfer, ohne Zwischenhändler. Genau das, was Hagi seit zwei Jahrzehnten ausmacht.",

    images: [
      "https://d8j0ntlcm91z4.cloudfront.net/user_3DLtbSogHYzmeSbGcEUYM2aw2ja/hf_20260610_140543_e6a3c7dd-9eeb-4ad6-b122-bdd5640b51f4.png",
    ],

    sizeWidth: 170,
    sizeLength: 240,
    shape: "RECHTECKIG",
    pileHeightMm: 8,
    weightKg: 18,
    shippingWeightKg: 22,

    pileMaterial: "HOCHLANDWOLLE",
    woolPercent: 100,
    silkPercent: 0,
    warpMaterial: "Baumwolle",
    weftMaterial: "Baumwolle",
    material: "Hochlandwolle auf Baumwolle",

    manufacturingType: "HANDGEKNUEPFT",
    knotTechnique: "SENNEH",
    knotsPerSqm: 900000,
    knottingDurationMonths: 11,

    origin: "Iran",
    originCountry: "IRAN",
    originRegion: "Aserbaidschan-Provinz",
    originCity: "Täbris",
    workshop: "Familie Roshan, Täbris",
    weaverName: "Reza Roshan",
    weaverStory:
      "Reza führt die Werkstatt seines Großvaters in dritter Generation. Wir kennen Reza seit 2011 — jeder neue Täbris-Auftrag läuft direkt über ihn.",
    isSigned: true,

    ageCategory: "MODERN",
    yearMade: 2024,
    condition: "NEU",

    pattern: "Medaillon",
    patternType: ["MEDAILLON", "ALLOVER"],
    patternMotif: ["Herati-Bordüre", "Zentralmedaillon"],
    style: "KLASSISCH",
    mainColor: "ROT",
    accentColors: ["Indigo", "Creme", "Antikgold"],

    recommendedRoom: ["WOHNZIMMER", "ESSZIMMER", "BUERO"],
    underfloorHeating: true,
    careInstructions:
      "Wöchentlich mit niedriger Saugleistung absaugen. Flecken sofort mit lauwarmem Wasser tupfen, nie reiben. Alle 2-3 Jahre professionelle Reinigung — bei uns im Showroom möglich.",

    hasCertificate: true,
    certificateType: ["Hagi-Echtheitszertifikat", "Hagi-Provenienzbestätigung"],

    isUnique: true,
    tags: ["bestseller", "klassisch", "medaillon"],
    seoTitle: "Täbris Medaillon 240×170 — handgeknüpft aus Nordwest-Iran | Hagi Teppiche Stuttgart",
    seoDescription:
      "Persischer Täbris-Teppich mit Medaillon-Muster, 900.000 Knoten/m². Direkt vom Knüpfer, Echtheitszertifikat, Showroom Stuttgart.",

    inStock: true,
    featured: true,
  },
  {
    sku: "HAGI-KEL-0008",
    name: "Kelim Anatolisch 200×140",
    slug: "kelim-anatolisch-200-140",
    categorySlug: "kelim",
    price: 49900,
    comparePrice: null,

    shortDescription:
      "Handgewebter Kelim aus Anatolien — geometrische Tribalmuster in erdigen Naturtönen.",
    description:
      "Anatolischer Flachgewebe-Kelim aus den Bergregionen Ostanatoliens. Reine Schafwolle, naturgefärbt mit Krapp, Indigo und Walnussschalen. Geometrisches Stammesmuster, kein Flor. Beidseitig nutzbar.",
    storyDescription:
      "Kelims wurden seit Jahrhunderten von den Frauen der Yörük-Nomaden Anatoliens gewebt — als Mitgift, als Decken, als Sitzunterlagen für die Jurte. Dieser Kelim entstand in einem kleinen Dorf nahe Erzurum, im Hochland zwischen Schwarzem Meer und Türkisch-Persien-Grenze. Die Wolle stammt von den eigenen Schafen, die Pflanzenfarben aus den umliegenden Tälern. Jeder Kelim erzählt die Geschichte einer Frau — über die Symbole, die sie in ihre Bahn webt.",

    images: [
      "https://d8j0ntlcm91z4.cloudfront.net/user_3DLtbSogHYzmeSbGcEUYM2aw2ja/hf_20260610_140545_08048a68-1b23-4ad6-86cf-bbd239e133aa.png",
    ],

    sizeWidth: 140,
    sizeLength: 200,
    shape: "RECHTECKIG",
    pileHeightMm: 4,
    weightKg: 8,
    shippingWeightKg: 11,

    pileMaterial: "SCHURWOLLE",
    woolPercent: 100,
    silkPercent: 0,
    warpMaterial: "Wolle",
    weftMaterial: "Wolle",
    material: "Naturgefärbte Schurwolle",

    manufacturingType: "HANDGEWEBT",
    knotTechnique: "KELIM_FLACHGEWEBE",
    knotsPerSqm: null,
    knottingDurationMonths: 4,

    origin: "Türkei",
    originCountry: "TUERKEI",
    originRegion: "Ostanatolien",
    originCity: "Erzurum",
    workshop: "Yörük-Familie Karaoğlu",
    weaverName: "Ayşe Karaoğlu",
    weaverStory:
      "Ayşe webt seit ihrer Jugend zusammen mit ihrer Mutter und Schwester. Die drei beliefern uns seit 2018 mit anatolischen Kelims.",
    isSigned: false,

    ageCategory: "MODERN",
    yearMade: 2024,
    condition: "NEU",

    pattern: "Geometrisch",
    patternType: ["GEOMETRISCH", "RAUTEN", "HEXAGON"],
    patternMotif: ["Tribal-Symbole", "Eli-Belinde (Fruchtbarkeit)"],
    style: "TRIBAL",
    mainColor: "ROSTBRAUN",
    accentColors: ["Indigo", "Creme", "Olivgrün"],

    recommendedRoom: ["WOHNZIMMER", "ESSZIMMER", "FLUR", "SCHLAFZIMMER"],
    underfloorHeating: true,
    careInstructions:
      "Wegen Flachgewebe-Struktur extrem pflegeleicht. Absaugen mit niedriger Stufe. Kelims sind beidseitig — bei Verschleiß einfach umdrehen. Empfindlich gegenüber dauerhafter Sonneneinstrahlung.",

    hasCertificate: true,
    certificateType: ["Hagi-Echtheitszertifikat"],

    isUnique: true,
    tags: ["bestseller", "tribal", "naturfarben"],
    seoTitle: "Anatolischer Kelim 200×140 — handgewebt, naturgefärbt | Hagi Teppiche Stuttgart",
    seoDescription:
      "Handgewebter Kelim aus Ostanatolien. Naturfarben, Flachgewebe, beidseitig nutzbar. Direkt von der Knüpferin.",

    inStock: true,
    featured: true,
  },
  {
    sku: "HAGI-MOD-0015",
    name: "Moderner Teppich Grau 300×200",
    slug: "moderner-teppich-grau-300-200",
    categorySlug: "modern",
    price: 89900,
    comparePrice: null,

    shortDescription:
      "Zeitloser Designer-Teppich in gedämpftem Grau — handgeknüpft in Nepal mit Hochlandwolle und Bambusseide.",
    description:
      "Reduziertes Design in zwei Grauflächen mit feinem Übergang. Nepali-Knoten (Tibet-Stil), Hochlandwolle gemischt mit Bambusseide. 150.000 Knoten/m². Schmaler Flor.",
    storyDescription:
      "Genoknüpft in der Werkstatt eines unserer Partner-Ateliers in Kathmandu. Bewusst reduziert — kein Muster, sondern zwei changierende Graustufen, die je nach Lichteinfall ineinander gleiten. Hochlandwolle aus den Bergen Tibets gibt dem Teppich Tiefe, der Bambusseide-Anteil das matte Schimmern. Für moderne Wohnräume, Loft-Architektur, skandinavisch geprägte Einrichtungen.",

    images: [
      "https://d8j0ntlcm91z4.cloudfront.net/user_3DLtbSogHYzmeSbGcEUYM2aw2ja/hf_20260610_140638_3174ef88-9e09-4f71-aef0-ab334f9e47bf.png",
    ],

    sizeWidth: 200,
    sizeLength: 300,
    shape: "RECHTECKIG",
    pileHeightMm: 7,
    weightKg: 22,
    shippingWeightKg: 27,

    pileMaterial: "MIX_WOLLE_SEIDE",
    woolPercent: 70,
    silkPercent: 30,
    warpMaterial: "Baumwolle",
    weftMaterial: "Baumwolle",
    material: "Hochlandwolle (70%) + Bambusseide (30%)",

    manufacturingType: "HANDGEKNUEPFT",
    knotTechnique: "SENNEH",
    knotsPerSqm: 150000,
    knottingDurationMonths: 7,

    origin: "Nepal",
    originCountry: "NEPAL",
    originRegion: "Kathmandu-Tal",
    originCity: "Kathmandu",
    workshop: "Partnerwerkstatt Bouddha, Kathmandu",
    isSigned: false,

    ageCategory: "MODERN",
    yearMade: 2024,
    condition: "NEU",

    pattern: "Unifarben Gradient",
    patternType: [],
    patternMotif: ["Verlauf", "Plain"],
    style: "MODERN",
    mainColor: "ANTHRAZIT",
    accentColors: ["Hellgrau", "Anthrazit"],

    recommendedRoom: ["WOHNZIMMER", "SCHLAFZIMMER", "BUERO"],
    underfloorHeating: true,
    careInstructions:
      "Mit niedriger Saugleistung absaugen. Bambusseide-Anteil mag keine Feuchtigkeit — Flecken trocken absaugen, nicht reiben. Alle 3-4 Jahre professionelle Reinigung.",

    hasCertificate: true,
    certificateType: ["Hagi-Echtheitszertifikat", "GoodWeave-Standards"],

    isUnique: true,
    tags: ["modern", "designer", "skandinavisch"],
    seoTitle: "Designer-Teppich Grau 300×200 — handgeknüpft Nepal | Hagi Teppiche Stuttgart",
    seoDescription:
      "Moderner Designer-Teppich, handgeknüpft in Nepal aus Hochlandwolle und Bambusseide. Reduziertes Grau, 150.000 Knoten/m².",

    inStock: true,
    featured: true,
  },
  {
    sku: "HAGI-ISF-0023",
    name: "Isfahan Blumenmuster 160×110",
    slug: "isfahan-blumenmuster-160-110",
    categorySlug: "oriental",
    price: 79900,
    comparePrice: 99900,

    shortDescription:
      "Feinster Isfahan mit floralem Garten-Muster — 250.000 Knoten/m², Hochlandwolle auf Baumwolle.",
    description:
      "Klassischer Isfahan-Teppich mit feinem Blumenmuster. 250.000 Knoten/m². Hochlandwolle auf Baumwoll-Kette, Senneh-Knoten. Florhöhe 6 mm.",
    storyDescription:
      "Isfahan — die Stadt der Brücken und Moscheen, das ästhetische Herz Persiens. Seit dem 16. Jahrhundert gilt Isfahan als das Knüpfzentrum für feinste Wollteppiche. Dieses Stück trägt das klassische Garten-Motiv (Bagh-i-Bahesht, der Garten des Paradieses): symmetrische Blütenranken um ein zentrales Medaillon. Aus der Werkstatt von Ahmad Sherafati, einem Knüpfer, dessen Familie wir seit über 15 Jahren kennen.",

    images: [
      "https://d8j0ntlcm91z4.cloudfront.net/user_3DLtbSogHYzmeSbGcEUYM2aw2ja/hf_20260610_140543_8eb997d3-89cd-44c7-98a8-70949dd782bc.png",
    ],

    sizeWidth: 110,
    sizeLength: 160,
    shape: "RECHTECKIG",
    pileHeightMm: 6,
    weightKg: 6,
    shippingWeightKg: 9,

    pileMaterial: "HOCHLANDWOLLE",
    woolPercent: 100,
    silkPercent: 0,
    warpMaterial: "Baumwolle",
    weftMaterial: "Baumwolle",
    material: "Hochlandwolle auf Baumwolle",

    manufacturingType: "HANDGEKNUEPFT",
    knotTechnique: "SENNEH",
    knotsPerSqm: 250000,
    knottingDurationMonths: 9,

    origin: "Iran",
    originCountry: "IRAN",
    originRegion: "Isfahan-Provinz",
    originCity: "Isfahan",
    workshop: "Ahmad Sherafati, Isfahan",
    weaverName: "Ahmad Sherafati",
    weaverStory:
      "Ahmad knüpft seit über 30 Jahren feine Isfahans. Wir beziehen seit 2009 direkt von ihm — kein Importeur dazwischen.",
    isSigned: true,

    ageCategory: "MODERN",
    yearMade: 2023,
    condition: "NEU",

    pattern: "Floral",
    patternType: ["MEDAILLON", "FIGURAL"],
    patternMotif: ["Garten-Motiv", "Bagh-i-Bahesht", "Blütenranken"],
    style: "KLASSISCH",
    mainColor: "CREME",
    accentColors: ["Indigo", "Rot", "Antikgold"],

    recommendedRoom: ["WOHNZIMMER", "ESSZIMMER", "BUERO", "SCHLAFZIMMER"],
    underfloorHeating: true,
    careInstructions:
      "Wöchentlich mit niedriger Saugleistung absaugen. Direkte Sonneneinstrahlung vermeiden (Farben bleichen sonst aus). Bei Flecken sofort mit lauwarmem Wasser tupfen.",

    hasCertificate: true,
    certificateType: ["Hagi-Echtheitszertifikat", "Hagi-Provenienzbestätigung"],

    isUnique: true,
    tags: ["fein", "isfahan", "garten"],
    seoTitle: "Isfahan 160×110 — feiner Perser, 250.000 Knoten/m² | Hagi Teppiche Stuttgart",
    seoDescription:
      "Feinster Isfahan-Teppich mit Garten-Motiv, 250.000 Knoten/m². Direkt vom Knüpfer Ahmad Sherafati.",

    inStock: true,
    featured: false,
  },
  {
    sku: "HAGI-VIN-0011",
    name: "Vintage Patchwork 230×160",
    slug: "vintage-patchwork-230-160",
    categorySlug: "vintage",
    price: 149900,
    comparePrice: 199900,

    shortDescription:
      "Einzigartiges Patchwork aus restaurierten Vintage-Teppichen — jedes Stück ein Unikat ohne Wiederholung.",
    description:
      "Patchwork aus 24 quadratischen Fragmenten alter Perser- und Anatolien-Teppiche (1960-1990). Naturwolle. Jedes Quadrat ein anderes Muster und eine andere Farbpalette.",
    storyDescription:
      "Patchwork-Teppiche entstehen aus Fragmenten alter Stücke, die sonst entsorgt würden — Bordüren, Eck-Stücke, beschädigte Mittelfelder. Eine spezielle Werkstatt in Pakistan nimmt diese Fragmente, wäscht sie nach, schneidet sie zu Quadraten und vernäht sie zu neuen Teppichen. Das Ergebnis: kein Stück gleicht dem anderen, jedes Quadrat hat seine eigene Geschichte. Wir haben dieses Stück direkt in der Werkstatt ausgewählt.",

    images: [
      "https://d8j0ntlcm91z4.cloudfront.net/user_3DLtbSogHYzmeSbGcEUYM2aw2ja/hf_20260610_140545_839933e4-522a-46fd-989e-c75e88d3ffea.png",
    ],

    sizeWidth: 160,
    sizeLength: 230,
    shape: "RECHTECKIG",
    pileHeightMm: 7,
    weightKg: 15,
    shippingWeightKg: 18,

    pileMaterial: "SCHURWOLLE",
    woolPercent: 100,
    silkPercent: 0,
    warpMaterial: "Baumwolle",
    weftMaterial: "Baumwolle",
    material: "Schurwolle (rezykliert)",

    manufacturingType: "HANDGEKNUEPFT",
    knotTechnique: "GHIORDES",
    knotsPerSqm: 120000,
    knottingDurationMonths: 6,

    origin: "Pakistan",
    originCountry: "PAKISTAN",
    originRegion: "Punjab",
    originCity: "Lahore",
    workshop: "Recycling-Werkstatt Lahore",
    isSigned: false,

    ageCategory: "MODERN",
    yearMade: 2023,
    condition: "RESTAURIERT",

    pattern: "Patchwork",
    patternType: ["ALLOVER", "GEOMETRISCH"],
    patternMotif: ["Patchwork-Quadrate", "Mix verschiedener Originale"],
    style: "VINTAGE",
    mainColor: "MULTICOLOR",
    accentColors: ["Rot", "Türkis", "Beige", "Anthrazit"],

    recommendedRoom: ["WOHNZIMMER", "SCHLAFZIMMER", "FLUR"],
    underfloorHeating: false,
    careInstructions:
      "Absaugen ohne Bürstrolle. Vorsicht bei den Nähten — keine schweren rollenden Lasten. Flecken trocken absaugen.",

    hasCertificate: true,
    certificateType: ["Hagi-Echtheitszertifikat"],

    isUnique: true,
    tags: ["vintage", "patchwork", "unikat"],
    seoTitle: "Vintage Patchwork 230×160 — Unikat aus restaurierten Teppichen | Hagi Teppiche Stuttgart",
    seoDescription:
      "Patchwork-Teppich aus 24 Fragmenten alter Perser. Jedes Stück ein Unikat, kein zweites gleicht ihm.",

    inStock: true,
    featured: false,
  },
];

async function main() {
  console.log("🌱 Seed-Daten werden eingefügt...");

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
    console.log(`  ✓ Kategorie: ${cat.name}`);
  }

  for (const p of products) {
    const { categorySlug, ...productData } = p;
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) continue;

    await prisma.product.upsert({
      where: { slug: p.slug! },
      update: { ...productData, categoryId: category.id },
      create: { ...productData, categoryId: category.id },
    });
    console.log(`  ✓ Produkt: ${p.name}`);
  }

  console.log("✅ Seed abgeschlossen.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
