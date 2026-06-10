import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import prisma from "@/lib/prisma";

export const revalidate = 300; // 5 Minuten Cache — Startseite ändert sich selten

async function getFeaturedProducts() {
  try {
    return await prisma.product.findMany({
      where: { featured: true, inStock: true },
      include: { category: true },
      take: 6,
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

async function getCategories() {
  try {
    return await prisma.category.findMany({ orderBy: { name: "asc" } });
  } catch {
    return [];
  }
}

export default async function Home() {
  const [featured, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  return (
    <>
      {/* ── HERO ── */}
      <section
        className="relative min-h-screen flex items-end overflow-hidden"
        style={{ background: "#0B0905" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url(https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&auto=format&fit=crop&q=80)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.35,
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(11,9,5,0.95) 0%, rgba(11,9,5,0.4) 60%, rgba(11,9,5,0.2) 100%)" }}
        />

        <div className="relative max-w-6xl mx-auto px-6 pb-20 pt-40 w-full">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold mb-5">
            Handgeknüpft · Direkt-Import · Stuttgart
          </p>
          <h1 className="font-serif text-5xl md:text-7xl font-medium leading-[1.05] text-cream mb-6 max-w-3xl">
            Teppiche mit<br />
            <span className="italic text-gold">Geschichte.</span>
          </h1>
          <p className="text-cream-muted text-lg leading-relaxed mb-10 max-w-[46ch]">
            Orientalische Unikate, moderne Klassiker und handgewebte Kelim-Teppiche
            — direkt vom Importeur, ohne Zwischenhändler.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link
              href="/produkte"
              className="inline-block px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.1em] bg-gold hover:bg-gold-light transition-colors"
              style={{ color: "#0B0905" }}
            >
              Zur Kollektion
            </Link>
            <Link
              href="/kontakt"
              className="inline-block px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-cream-muted transition-colors hover:text-gold"
              style={{ border: "1px solid #352C22" }}
            >
              Beratung anfragen
            </Link>
          </div>
        </div>
      </section>

      {/* ── KATEGORIEN ── */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-serif text-3xl text-cream font-medium">Unsere Kollektionen</h2>
            <Link href="/produkte" className="text-[12px] uppercase tracking-[0.1em] text-gold hover:text-gold-light transition-colors">
              Alle ansehen →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/produkte?kategorie=${cat.slug}`}
                className="group relative aspect-square overflow-hidden"
                style={{ background: "#141009" }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "rgba(201,165,83,0.08)" }}
                />
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ border: "1px solid #28211A" }}
                >
                  <p className="font-serif text-xl text-cream group-hover:text-gold transition-colors duration-200">
                    {cat.name}
                  </p>
                  <div
                    className="mt-2 h-px w-8 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    style={{ background: "#C9A553" }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── FEATURED PRODUCTS ── */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-serif text-3xl text-cream font-medium">Ausgewählte Stücke</h2>
            <Link href="/produkte" className="text-[12px] uppercase tracking-[0.1em] text-gold hover:text-gold-light transition-colors">
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

      {/* ── TRUST SECTION ── */}
      <section style={{ background: "#141009", borderTop: "1px solid #28211A", borderBottom: "1px solid #28211A" }} className="py-14">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Stuttgart", sub: "Vor Ort ansehen möglich" },
            { label: "Direkt-Import", sub: "Kein Zwischenhändler" },
            { label: "Versand DE", sub: "Schnell & versichert" },
            { label: "14 Tage", sub: "Rückgaberecht" },
          ].map((item) => (
            <div key={item.label} style={{ borderRight: "1px solid #28211A" }} className="last:border-r-0 px-4">
              <p className="font-serif text-xl text-gold mb-1">{item.label}</p>
              <p className="text-xs text-muted">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
