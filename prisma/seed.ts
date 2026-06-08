import { PrismaClient } from "@prisma/client";
import { slugify } from "../lib/format";

const prisma = new PrismaClient();

const categories = [
  { name: "Oriental", slug: "oriental" },
  { name: "Modern", slug: "modern" },
  { name: "Kelim", slug: "kelim" },
  { name: "Vintage", slug: "vintage" },
];

const products = [
  {
    name: "Täbris Medaillon 240×170",
    categorySlug: "oriental",
    price: 129900,
    comparePrice: 179900,
    description: "Klassischer persischer Täbris-Teppich mit zentralem Medaillon-Muster. Handgeknüpft aus hochwertiger Schurwolle.",
    images: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800"],
    sizeWidth: 170, sizeLength: 240,
    origin: "Iran", material: "Schurwolle", pattern: "Medaillon",
    inStock: true, featured: true,
  },
  {
    name: "Kelim Anatolisch 200×140",
    categorySlug: "kelim",
    price: 49900,
    comparePrice: null,
    description: "Handgewebter Kelim aus der Türkei. Charakteristische geometrische Muster in erdigen Farbtönen.",
    images: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"],
    sizeWidth: 140, sizeLength: 200,
    origin: "Türkei", material: "Wolle", pattern: "Geometrisch",
    inStock: true, featured: true,
  },
  {
    name: "Moderner Teppich Grau 300×200",
    categorySlug: "modern",
    price: 89900,
    comparePrice: null,
    description: "Zeitloser grauer Teppich im Skandinavischen Stil. Weiche Textur, pflegeleicht, für Wohnzimmer und Schlafzimmer.",
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
    sizeWidth: 200, sizeLength: 300,
    origin: "Indien", material: "Polypropylen", pattern: "Abstrakt",
    inStock: true, featured: true,
  },
  {
    name: "Isfahan Blumenmuster 160×110",
    categorySlug: "oriental",
    price: 79900,
    comparePrice: 99900,
    description: "Feinster Isfahan mit floralem Muster. Knüpfdichte 250.000 Knoten/m². Echte Wolle auf Baumwolle.",
    images: ["https://images.unsplash.com/photo-1550226891-ef816aed4a98?w=800"],
    sizeWidth: 110, sizeLength: 160,
    origin: "Iran", material: "Wolle/Baumwolle", pattern: "Floral",
    inStock: true, featured: false,
  },
  {
    name: "Vintage Patchwork 230×160",
    categorySlug: "vintage",
    price: 149900,
    comparePrice: 199900,
    description: "Einzigartiger Patchwork-Teppich aus recycelten Orientalteppichen. Jedes Stück ist ein Unikat.",
    images: ["https://images.unsplash.com/photo-1517428900423-a87975e23f92?w=800"],
    sizeWidth: 160, sizeLength: 230,
    origin: "Afghanistan", material: "Wolle", pattern: "Patchwork",
    inStock: false, featured: false,
  },
];

async function main() {
  console.log("🌱 Seed-Daten werden eingefügt...");

  // Kategorien anlegen
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
    console.log(`  ✓ Kategorie: ${cat.name}`);
  }

  // Produkte anlegen
  for (const p of products) {
    const { categorySlug, ...productData } = p;
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) continue;

    const slug = slugify(p.name);

    await prisma.product.upsert({
      where: { slug },
      update: productData,
      create: {
        ...productData,
        slug,
        categoryId: category.id,
      },
    });
    console.log(`  ✓ Produkt: ${p.name}`);
  }

  console.log("✅ Seed abgeschlossen.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
