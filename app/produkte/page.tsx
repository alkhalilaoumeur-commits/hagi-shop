import { Suspense } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { SearchInput } from "@/components/shop/SearchInput";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kollektion — Orientalische & Moderne Teppiche",
  description:
    "Unsere Kollektion handgeknüpfter Teppiche: Oriental, Modern, Kelim. Direkt vom Importeur in Stuttgart.",
};

async function getProducts(kategorie?: string, suche?: string) {
  return prisma.product.findMany({
    where: {
      inStock: true,
      ...(kategorie ? { category: { slug: kategorie } } : {}),
      ...(suche
        ? {
            OR: [
              { name: { contains: suche, mode: "insensitive" } },
              { origin: { contains: suche, mode: "insensitive" } },
              { material: { contains: suche, mode: "insensitive" } },
              { pattern: { contains: suche, mode: "insensitive" } },
              { description: { contains: suche, mode: "insensitive" } },
            ],
          }
        : {}),
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
  searchParams: Promise<{ kategorie?: string; sortBy?: string; suche?: string }>;
}) {
  const { kategorie, sortBy, suche } = await searchParams;
  const [products, categories] = await Promise.all([
    getProducts(kategorie, suche),
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
        <p className="text-muted">
        {sorted.length} Artikel{suche ? ` für „${suche}"` : ""}
      </p>
      </div>

      {/* Suche */}
      <div className="mb-6">
        <SearchInput defaultValue={suche} />
      </div>

      {/* Filter + Sortierung */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        {/* Kategorien-Filter */}
        <div className="flex flex-wrap gap-2">
          <a
            href={sortBy ? `/produkte?sortBy=${sortBy}` : "/produkte"}
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
              href={`/produkte?kategorie=${cat.slug}${sortBy ? `&sortBy=${sortBy}` : ""}`}
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

        {/* Sortierung */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sortieren:</span>
          {[
            { value: "", label: "Neueste" },
            { value: "preis-asc", label: "Preis ↑" },
            { value: "preis-desc", label: "Preis ↓" },
          ].map((opt) => (
            <a
              key={opt.value}
              href={`/produkte?${kategorie ? `kategorie=${kategorie}&` : ""}${opt.value ? `sortBy=${opt.value}` : ""}`}
              className={`px-3 py-1.5 border text-xs transition-colors ${
                sortBy === opt.value || (!sortBy && !opt.value)
                  ? "border-gold text-gold"
                  : "border-border text-muted hover:text-ink hover:border-ink"
              }`}
            >
              {opt.label}
            </a>
          ))}
        </div>
      </div>

      {/* Produkte-Grid */}
      {sorted.length === 0 ? (
        <div className="text-center py-24 text-muted">
          <p className="font-serif text-2xl mb-2">Keine Teppiche gefunden</p>
          <p className="text-sm">
            {suche
              ? `Keine Ergebnisse für „${suche}". Probiere einen anderen Suchbegriff.`
              : "Probiere eine andere Kategorie."}
          </p>
          {suche && (
            <a href="/produkte" className="text-sm text-gold hover:underline mt-3 inline-block">
              Alle Teppiche zeigen →
            </a>
          )}
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
