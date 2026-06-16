import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { VAT_NOTICE } from "@/lib/shop-config";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { ProductImageGallery } from "@/components/shop/ProductImageGallery";
import { ProductCard } from "@/components/shop/ProductCard";
import { TrustStrip } from "@/components/home/TrustStrip";
import {
  COUNTRY_LABEL,
  SHAPE_LABEL,
  MATERIAL_LABEL,
  MANUFACTURING_LABEL,
  KNOT_LABEL,
  AGE_LABEL,
  CONDITION_LABEL,
  STYLE_LABEL,
  COLOR_LABEL,
  ROOM_LABEL,
  PATTERN_LABEL,
} from "@/lib/format-enums";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { name: true, seoTitle: true, seoDescription: true, shortDescription: true, description: true, images: true },
  });
  if (!product) return { title: "Nicht gefunden" };

  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription ?? product.description ?? `${product.name} — Handgeknüpfter Teppich aus Stuttgart`,
    openGraph: { images: product.images.slice(0, 1) },
  };
}

export async function generateStaticParams() {
  try {
    const products = await prisma.product.findMany({ select: { slug: true }, where: { inStock: true } });
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

  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, id: { not: product.id }, inStock: true },
    include: { category: true },
    take: 3,
  });

  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://hagi-shop.de";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.name,
        description: product.description ?? undefined,
        image: product.images,
        sku: product.sku ?? product.id,
        brand: { "@type": "Brand", name: "Hagi Teppiche" },
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: (product.price / 100).toFixed(2),
          availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: `${appUrl}/produkte/${product.slug}`,
          seller: { "@type": "Organization", name: "Hagi Teppiche" },
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ background: "#FAFAF7" }} className="pt-32 pb-12">
        <div className="max-w-page mx-auto px-6 md:px-12">
          <nav className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.15em] mb-12" style={{ color: "#8A7866" }}>
            <Link href="/" className="hover:opacity-70 transition-opacity">Start</Link>
            <span>/</span>
            <Link href="/produkte" className="hover:opacity-70 transition-opacity">Kollektion</Link>
            <span>/</span>
            <Link href={`/produkte?kategorie=${product.category.slug}`} className="hover:opacity-70 transition-opacity">
              {product.category.name}
            </Link>
            <span>/</span>
            <span style={{ color: "#0F0A06" }}>{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 lg:gap-16">
            <div>
              <ProductImageGallery images={product.images} name={product.name} />
            </div>

            <div className="flex flex-col">
              {product.isUnique && (
                <div
                  className="inline-flex items-center gap-2 self-start px-3 py-1 mb-6"
                  style={{ background: "#0F0A06", color: "#FAFAF7" }}
                >
                  <span className="live-dot" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">
                    Unikat · nur einmal verfügbar
                  </span>
                </div>
              )}

              <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
                {product.originCity ? `${product.originCity}, ` : ""}
                {product.originCountry ? COUNTRY_LABEL[product.originCountry] : product.origin ?? "Direktimport"}
                {product.workshop ? ` · Werkstatt ${product.workshop}` : ""}
              </p>

              <h1 className="font-serif leading-[1] mb-6" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", color: "#0F0A06" }}>
                {product.name}
              </h1>

              {product.shortDescription && (
                <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: "#5A4A3A", maxWidth: "44ch" }}>
                  {product.shortDescription}
                </p>
              )}

              <div className="flex items-baseline gap-3 mb-2 pt-6" style={{ borderTop: "1px solid #E5DCC8" }}>
                <span className="font-serif text-4xl" style={{ color: "#A33B2A" }}>
                  {formatPrice(product.price)}
                </span>
                {product.comparePrice && (
                  <>
                    <span className="text-xl line-through" style={{ color: "#8A7866" }}>
                      {formatPrice(product.comparePrice)}
                    </span>
                    <span className="text-xs font-bold px-2 py-1" style={{ background: "#A33B2A", color: "#FAFAF7" }}>
                      -{discount}%
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] mb-6" style={{ color: "#8A7866" }}>{VAT_NOTICE}</p>

              {(product.sizeWidth || product.knotsPerSqm || product.pileMaterial) && (
                <div className="grid grid-cols-3 gap-4 mb-8 pb-8" style={{ borderBottom: "1px solid #E5DCC8" }}>
                  {product.sizeWidth && product.sizeLength && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "#8A7866" }}>Maße</p>
                      <p className="font-mono text-sm" style={{ color: "#0F0A06" }}>
                        {product.sizeWidth} × {product.sizeLength}
                        <span className="text-[10px] ml-1" style={{ color: "#8A7866" }}>cm</span>
                      </p>
                    </div>
                  )}
                  {product.knotsPerSqm && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "#8A7866" }}>Knoten/m²</p>
                      <p className="font-mono text-sm" style={{ color: "#0F0A06" }}>
                        {product.knotsPerSqm.toLocaleString("de-DE")}
                      </p>
                    </div>
                  )}
                  {product.pileMaterial && (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: "#8A7866" }}>Material</p>
                      <p className="font-mono text-sm" style={{ color: "#0F0A06" }}>
                        {MATERIAL_LABEL[product.pileMaterial]}
                      </p>
                    </div>
                  )}
                </div>
              )}

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

              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]" style={{ color: "#5A4A3A" }}>
                <div className="flex items-start gap-2">
                  <span style={{ color: "#A33B2A" }}>✓</span>
                  <span>Echtheitszertifikat inklusive</span>
                </div>
                <div className="flex items-start gap-2">
                  <span style={{ color: "#A33B2A" }}>✓</span>
                  <span>Gratis Versand &amp; Rückversand</span>
                </div>
                <div className="flex items-start gap-2">
                  <span style={{ color: "#A33B2A" }}>✓</span>
                  <span>31 Tage Rückgabe</span>
                </div>
                <div className="flex items-start gap-2">
                  <span style={{ color: "#A33B2A" }}>✓</span>
                  <span>Selbstabholung Showroom</span>
                </div>
              </div>

              <div
                className="mt-6 p-5"
                style={{ background: "#F0EAD8", border: "1px solid #E5DCC8" }}
              >
                <p className="text-[11px] uppercase tracking-[0.15em] mb-2" style={{ color: "#B89968" }}>
                  Persönliche Beratung
                </p>
                <p className="font-serif text-lg mb-3" style={{ color: "#0F0A06" }}>
                  Diesen Teppich vor Ort sehen?
                </p>
                <p className="text-sm mb-4" style={{ color: "#5A4A3A" }}>
                  Wir reservieren ihn 48 Stunden für Sie. Im Showroom Stuttgart oder per Video-Termin.
                </p>
                <Link
                  href="/kontakt"
                  className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] font-semibold pb-1"
                  style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
                >
                  Termin anfragen →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {product.storyDescription && (
        <section className="py-20 md:py-28" style={{ background: "#F0EAD8", borderTop: "1px solid #E5DCC8" }}>
          <div className="max-w-page mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
                  ✦ Herkunft &amp; Geschichte
                </p>
                <h2 className="font-serif text-3xl md:text-4xl leading-tight" style={{ color: "#0F0A06" }}>
                  Aus
                  {product.originCity && (
                    <span className="font-script block" style={{ fontSize: "clamp(3rem, 6vw, 5rem)", color: "#A33B2A", lineHeight: "0.9", marginTop: "0.1em" }}>
                      {product.originCity}.
                    </span>
                  )}
                </h2>
              </div>
              <div>
                <p className="text-base md:text-lg leading-relaxed" style={{ color: "#5A4A3A" }}>
                  {product.storyDescription}
                </p>
                {product.weaverName && product.weaverStory && (
                  <div
                    className="mt-8 p-6"
                    style={{ background: "#FAFAF7", border: "1px solid #E5DCC8" }}
                  >
                    <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "#B89968" }}>
                      Der Knüpfer
                    </p>
                    <p className="font-serif text-xl mb-2" style={{ color: "#0F0A06" }}>
                      {product.weaverName}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "#5A4A3A" }}>
                      {product.weaverStory}
                    </p>
                    {product.knottingDurationMonths && (
                      <p className="text-[11px] mt-4 pt-4 font-mono" style={{ color: "#8A7866", borderTop: "1px solid #E5DCC8" }}>
                        Knüpfdauer: {product.knottingDurationMonths} Monate Handarbeit
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-20 md:py-28" style={{ background: "#FAFAF7" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <div className="mb-12">
            <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
              ✦ Datenblatt
            </p>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight" style={{ color: "#0F0A06" }}>
              Alle Details auf einen Blick.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-0">
            <Spec label="SKU" value={product.sku} />
            <Spec label="Maße" value={product.sizeWidth && product.sizeLength ? `${product.sizeWidth} × ${product.sizeLength} cm` : null} />
            <Spec label="Form" value={product.shape ? SHAPE_LABEL[product.shape] : null} />
            <Spec label="Florhöhe" value={product.pileHeightMm ? `${product.pileHeightMm} mm` : null} />
            <Spec label="Gewicht" value={product.weightKg ? `${product.weightKg} kg` : null} />
            <Spec label="Material Flor" value={product.pileMaterial ? MATERIAL_LABEL[product.pileMaterial] : null} />
            <Spec label="Material Kette" value={product.warpMaterial} />
            <Spec label="Material Schuss" value={product.weftMaterial} />
            <Spec label="Wollanteil" value={product.woolPercent ? `${product.woolPercent} %` : null} />
            <Spec label="Seidenanteil" value={product.silkPercent ? `${product.silkPercent} %` : null} />
            <Spec label="Herstellung" value={product.manufacturingType ? MANUFACTURING_LABEL[product.manufacturingType] : null} />
            <Spec label="Knüpftechnik" value={product.knotTechnique ? KNOT_LABEL[product.knotTechnique] : null} />
            <Spec label="Knoten/m²" value={product.knotsPerSqm ? product.knotsPerSqm.toLocaleString("de-DE") : null} />
            <Spec label="Knüpfdauer" value={product.knottingDurationMonths ? `${product.knottingDurationMonths} Monate` : null} />
            <Spec label="Herkunftsland" value={product.originCountry ? COUNTRY_LABEL[product.originCountry] : product.origin} />
            <Spec label="Region" value={product.originRegion} />
            <Spec label="Stadt" value={product.originCity} />
            <Spec label="Werkstatt" value={product.workshop} />
            <Spec label="Signiert" value={product.isSigned ? "Ja" : null} />
            <Spec label="Alter" value={product.ageCategory ? AGE_LABEL[product.ageCategory] : null} />
            <Spec label="Baujahr" value={product.yearMade ? String(product.yearMade) : null} />
            <Spec label="Zustand" value={product.condition ? CONDITION_LABEL[product.condition] : null} />
            <Spec
              label="Muster"
              value={
                product.patternType && product.patternType.length > 0
                  ? product.patternType.map((p) => PATTERN_LABEL[p]).join(" · ")
                  : product.pattern
              }
            />
            <Spec label="Motiv" value={product.patternMotif?.join(", ") || null} />
            <Spec label="Stil" value={product.style ? STYLE_LABEL[product.style] : null} />
            <Spec label="Hauptfarbe" value={product.mainColor ? COLOR_LABEL[product.mainColor] : null} />
            <Spec label="Nebenfarben" value={product.accentColors?.join(", ") || null} />
            <Spec label="Geeignet für" value={product.recommendedRoom?.map((r) => ROOM_LABEL[r]).join(", ") || null} />
            <Spec label="Fußbodenheizung" value={product.underfloorHeating ? "Geeignet" : null} />
          </div>
        </div>
      </section>

      {(product.careInstructions || (product.hasCertificate && product.certificateType.length > 0)) && (
        <section className="py-20 md:py-28" style={{ background: "#F0EAD8", borderTop: "1px solid #E5DCC8" }}>
          <div className="max-w-page mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12">
            {product.careInstructions && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
                  ✦ Pflege &amp; Werterhalt
                </p>
                <h2 className="font-serif text-2xl md:text-3xl mb-6 leading-tight" style={{ color: "#0F0A06" }}>
                  So bleibt er ein Erbstück.
                </h2>
                <p className="text-base leading-relaxed mb-6" style={{ color: "#5A4A3A" }}>
                  {product.careInstructions}
                </p>
                <Link
                  href="/pflege"
                  className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] font-semibold pb-1"
                  style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
                >
                  Vollständige Pflege-Anleitung →
                </Link>
              </div>
            )}

            {product.hasCertificate && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
                  ✦ Echtheit garantiert
                </p>
                <h2 className="font-serif text-2xl md:text-3xl mb-6 leading-tight" style={{ color: "#0F0A06" }}>
                  Mit Echtheitszertifikat.
                </h2>
                <p className="text-base leading-relaxed mb-6" style={{ color: "#5A4A3A" }}>
                  Jeder Teppich kommt mit unserem schriftlichen Echtheitszertifikat — inklusive Herkunft, Material, Knotendichte und Provenienzkette vom Knüpfer bis Stuttgart.
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.certificateType.map((c) => (
                    <span
                      key={c}
                      className="px-3 py-1.5 text-[11px] font-medium"
                      style={{ background: "#FAFAF7", border: "1px solid #D2B889", color: "#0F0A06" }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <TrustStrip />

      {related.length > 0 && (
        <section className="py-20 md:py-28" style={{ background: "#FAFAF7" }}>
          <div className="max-w-page mx-auto px-6 md:px-12">
            <div className="flex items-end justify-between mb-12">
              <h2 className="font-serif text-2xl md:text-4xl leading-tight" style={{ color: "#0F0A06" }}>
                Weitere aus {product.category.name}
              </h2>
              <Link
                href={`/produkte?kategorie=${product.category.slug}`}
                className="text-[11px] uppercase tracking-[0.15em] font-semibold pb-1"
                style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
              >
                Alle ansehen →
              </Link>
            </div>
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
          </div>
        </section>
      )}
    </>
  );
}

function Spec({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between py-4" style={{ borderBottom: "1px solid #E5DCC8" }}>
      <span className="text-[11px] uppercase tracking-[0.15em]" style={{ color: "#8A7866" }}>
        {label}
      </span>
      <span className="font-mono text-sm text-right ml-4" style={{ color: "#0F0A06" }}>
        {value}
      </span>
    </div>
  );
}
