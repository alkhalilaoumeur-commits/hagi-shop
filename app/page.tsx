import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import prisma from "@/lib/prisma";

export const revalidate = 3600; // ISR: stündlich aktualisieren

async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { featured: true, inStock: true },
    include: { category: true },
    take: 6,
    orderBy: { createdAt: "desc" },
  });
}

async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export default async function Home() {
  const [featured, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  return (
    <>
      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {/* Hintergrund — warmes Muster-Overlay */}
        <div
          className="absolute inset-0 bg-surface"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, rgba(139,105,20,0.08) 0%, transparent 60%)",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold mb-4">
              Handgeknüpft · Stuttgart
            </p>
            <h1 className="font-serif text-5xl md:text-6xl text-ink font-medium leading-[1.1] mb-6">
              Teppiche mit<br />
              <span className="italic text-gold">Geschichte.</span>
            </h1>
            <p className="text-muted text-lg leading-relaxed mb-8 max-w-[42ch]">
              Direkt vom Importeur — orientalische Unikate, moderne Klassiker und
              handgewebte Kelim-Teppiche aus Afghanistan, Iran und der Türkei.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/produkte"
                className="inline-block bg-green text-white px-8 py-3.5 text-sm font-medium hover:bg-green/90 transition-colors"
              >
                Zur Kollektion
              </Link>
              <Link
                href="/kontakt"
                className="inline-block border border-border text-ink px-8 py-3.5 text-sm font-medium hover:bg-surface transition-colors"
              >
                Beratung anfragen
              </Link>
            </div>
          </div>

          {/* Placeholder-Bild rechts */}
          <div className="hidden md:block aspect-[4/5] bg-surface rounded-sm overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">
              {/* TODO: Hero-Bild mit echtem Teppich-Foto ersetzen */}
              <span className="font-serif italic">Hero-Bild folgt</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── KATEGORIEN ───────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="font-serif text-2xl text-ink mb-8">Kollektion</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/produkte?kategorie=${cat.slug}`}
                className="group border border-border p-6 text-center hover:border-gold hover:bg-surface transition-all"
              >
                <p className="font-serif text-lg text-ink group-hover:text-gold transition-colors">
                  {cat.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── FEATURED PRODUCTS ─────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-2xl text-ink">Ausgewählte Stücke</h2>
            <Link href="/produkte" className="text-sm text-gold hover:underline">
              Alle ansehen →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
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
            ))}
          </div>
        </section>
      )}

      {/* ── TRUST SECTION ─────────────────────────────────────────── */}
      <section className="bg-surface border-y border-border py-12">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: "🇩🇪", title: "Stuttgart", sub: "Vor Ort ansehen möglich" },
            { icon: "🤝", title: "Direkt-Import", sub: "Kein Zwischenhändler" },
            { icon: "🚚", title: "Versand DE", sub: "Schnell & versichert" },
            { icon: "↩️", title: "14 Tage", sub: "Rückgaberecht" },
          ].map((item) => (
            <div key={item.title}>
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="font-semibold text-ink text-sm">{item.title}</p>
              <p className="text-xs text-muted mt-1">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
