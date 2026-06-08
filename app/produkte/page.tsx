import { Suspense } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kollektion — Orientalische & Moderne Teppiche",
  description:
    "Unsere Kollektion handgeknüpfter Teppiche: Oriental, Modern, Kelim. Direkt vom Importeur in Stuttgart.",
};

async function getProducts(kategorie?: string) {
  return prisma.product.findMany({
    where: {
      inStock: true,
      ...(kategorie ? { category: { slug: kategorie } } : {}),
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
}

async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export default async function ProduktePage({
  searchParams,
}: {
  searchParams: Promise<{ kategorie?: string; sortBy?: string }>;
}) {
  const { kategorie, sortBy } = await searchParams;
  const [products, categories] = await Promise.all([
    getProducts(kategorie),
    getCategories(),
  ]);

  const sorted = [...products].sort((a, b) => {
    if (sortBy === "preis-asc") return a.price - b.price;
    if (sortBy === "preis-desc") return b.price - a.price;
    return 0;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-serif text-4xl text-ink mb-2">
          {kategorie
            ? categories.find((c) => c.slug === kategorie)?.name ?? "Kollektion"
            : "Alle Teppiche"}
        </h1>
        <p className="text-muted">{sorted.length} Artikel</p>
      </div>

      {/* Kategorien-Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <a
          href="/produkte"
          className={`px-4 py-2 text-sm border transition-colors ${
            !kategorie
              ? "border-ink bg-ink text-bg"
              : "border-border text-muted hover:border-gold hover:text-gold"
          }`}
        >
          Alle
        </a>
        {categories.map((cat) => (
          <a
            key={cat.slug}
            href={`/produkte?kategorie=${cat.slug}`}
            className={`px-4 py-2 text-sm border transition-colors ${
              kategorie === cat.slug
                ? "border-ink bg-ink text-bg"
                : "border-border text-muted hover:border-gold hover:text-gold"
            }`}
          >
            {cat.name}
          </a>
        ))}
      </div>

      {/* Produkte-Grid */}
      {sorted.length === 0 ? (
        <div className="text-center py-24 text-muted">
          <p className="font-serif text-2xl mb-2">Keine Teppiche gefunden</p>
          <p className="text-sm">Probiere eine andere Kategorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {sorted.map((product) => (
            <Suspense key={product.id} fallback={<div className="aspect-[3/4] bg-surface animate-pulse" />}>
              <ProductCard
                id={product.id}
                slug={product.slug}
                name={product.name}
                price={product.price}
                comparePrice={product.comparePrice}
                image={product.images[0] ?? ""}
                origin={product.origin}
                sizeWidth={product.sizeWidth}
                sizeLength={product.sizeLength}
                inStock={product.inStock}
              />
            </Suspense>
          ))}
        </div>
      )}
    </div>
  );
}
