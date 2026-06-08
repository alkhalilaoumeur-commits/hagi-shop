import { notFound } from "next/navigation";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { ProductImageGallery } from "@/components/shop/ProductImageGallery";
import { ProductCard } from "@/components/shop/ProductCard";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { name: true, description: true, images: true },
  });
  if (!product) return { title: "Nicht gefunden" };

  return {
    title: product.name,
    description: product.description ?? `${product.name} — Handgeknüpfter Teppich aus Stuttgart`,
    openGraph: {
      images: product.images.slice(0, 1),
    },
  };
}

export async function generateStaticParams() {
  try {
    const products = await prisma.product.findMany({
      select: { slug: true },
      where: { inStock: true },
    });
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export const revalidate = 3600;

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!product) notFound();

  // Ähnliche Produkte aus gleicher Kategorie
  const related = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      inStock: true,
    },
    include: { category: true },
    take: 3,
  });

  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted mb-8 flex gap-2 items-center">
        <a href="/" className="hover:text-gold transition-colors">Home</a>
        <span>›</span>
        <a href="/produkte" className="hover:text-gold transition-colors">Kollektion</a>
        <span>›</span>
        <a
          href={`/produkte?kategorie=${product.category.slug}`}
          className="hover:text-gold transition-colors"
        >
          {product.category.name}
        </a>
        <span>›</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      {/* Hauptinhalt */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
        {/* Bild-Galerie */}
        <ProductImageGallery images={product.images} name={product.name} />

        {/* Produkt-Info */}
        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold mb-2">
            {product.category.name} · {product.origin ?? "Handgeknüpft"}
          </p>
          <h1 className="font-serif text-3xl text-ink font-medium mb-4">{product.name}</h1>

          {/* Preis */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold text-ink">{formatPrice(product.price)}</span>
            {product.comparePrice && (
              <>
                <span className="text-xl text-muted line-through">
                  {formatPrice(product.comparePrice)}
                </span>
                <span className="text-sm font-bold text-signal bg-signal/10 px-2 py-0.5 rounded">
                  -{discount}%
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-muted mb-6">Alle Preise inkl. 19% MwSt.</p>

          {/* Spezifikationen */}
          <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
            {product.sizeWidth && product.sizeLength && (
              <div className="bg-surface p-3 rounded-sm">
                <p className="text-muted text-xs mb-0.5">Maße</p>
                <p className="text-ink font-medium">
                  {product.sizeWidth} × {product.sizeLength} cm
                </p>
              </div>
            )}
            {product.material && (
              <div className="bg-surface p-3 rounded-sm">
                <p className="text-muted text-xs mb-0.5">Material</p>
                <p className="text-ink font-medium">{product.material}</p>
              </div>
            )}
            {product.origin && (
              <div className="bg-surface p-3 rounded-sm">
                <p className="text-muted text-xs mb-0.5">Herkunft</p>
                <p className="text-ink font-medium">{product.origin}</p>
              </div>
            )}
            {product.pattern && (
              <div className="bg-surface p-3 rounded-sm">
                <p className="text-muted text-xs mb-0.5">Muster</p>
                <p className="text-ink font-medium">{product.pattern}</p>
              </div>
            )}
          </div>

          {/* Beschreibung */}
          {product.description && (
            <p className="text-muted text-sm leading-relaxed mb-6">{product.description}</p>
          )}

          {/* In den Warenkorb */}
          <AddToCartButton
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              image: product.images[0] ?? "",
            }}
            inStock={product.inStock}
          />

          {/* Vertrauen */}
          <div className="mt-6 pt-6 border-t border-border space-y-2 text-xs text-muted">
            <p>✓ Kostenloser Versand ab 500 € Bestellwert</p>
            <p>✓ Selbstabholung in Stuttgart möglich</p>
            <p>✓ 14 Tage Rückgaberecht</p>
            <p>✓ Direkter Kontakt zum Händler</p>
          </div>
        </div>
      </div>

      {/* Ähnliche Produkte */}
      {related.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl text-ink mb-6">Weitere Teppiche aus der Kategorie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                slug={p.slug}
                name={p.name}
                price={p.price}
                comparePrice={p.comparePrice}
                image={p.images[0] ?? ""}
                origin={p.origin}
                sizeWidth={p.sizeWidth}
                sizeLength={p.sizeLength}
                inStock={p.inStock}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
