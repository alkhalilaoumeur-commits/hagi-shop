import Link from "next/link";
import Image from "next/image";
import { MarqueeBar } from "@/components/home/MarqueeBar";
import { TrustStrip } from "@/components/home/TrustStrip";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { WhyHagiAccordion } from "@/components/home/WhyHagiAccordion";
import { ProgressiveBlur } from "@/components/ui/ProgressiveBlur";
import { Reviews } from "@/components/home/Reviews";
import { ShopFilter } from "@/components/shop/ShopFilter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { formatPrice } from "@/lib/format";
import prisma from "@/lib/prisma";

export const revalidate = 300;

async function getBestsellers() {
  try {
    return await prisma.product.findMany({
      where: { featured: true, inStock: true },
      include: { category: true },
      take: 3,
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

async function getAllProducts() {
  try {
    return await prisma.product.findMany({
      where: { inStock: true },
      include: { category: true },
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
  const [bestsellers, allProducts, categories] = await Promise.all([
    getBestsellers(),
    getAllProducts(),
    getCategories(),
  ]);

  const mainProduct = bestsellers[0] ?? null;

  return (
    <>
      {/* ── HERO — EDITORIAL SPLIT ── */}
      <section
        className="relative pt-24 pb-10 md:pt-24 md:pb-14 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 15% 20%, #F6EEDB 0%, #EFE6D2 45%, #E8DEC4 100%)",
        }}
      >
        <div className="relative max-w-page mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center">

            <div className="order-1 lg:order-1">
              <div
                className="inline-flex items-center gap-3 rounded-full px-4 py-1.5 mb-5"
                style={{ background: "#FAF5E6", border: "1px solid #D9CDB8" }}
              >
                <span className="live-dot" />
                <span
                  className="text-[10px] uppercase tracking-[0.22em] font-medium"
                  style={{ color: "#5A4A3A" }}
                >
                  Stuttgart · Direktimport seit 2003
                </span>
              </div>

              <h1
                className="font-serif leading-[0.92] mb-5"
                style={{ fontSize: "clamp(2.5rem, 5.2vw, 5rem)", color: "#0F0A06", letterSpacing: "-0.015em" }}
              >
                Direkt vom<br />
                <span style={{ color: "#A33B2A" }}>Knüpfer.</span>
              </h1>

              <p
                className="text-base md:text-lg leading-snug mb-7"
                style={{ color: "#5A4A3A", maxWidth: "32ch" }}
              >
                Kein Großhandel. Kein Mittler. Kein Aufschlag.
                Stuttgarter Showroom seit zwanzig Jahren.
              </p>

              <div
                className="grid grid-cols-3 gap-6 mb-7 pt-5 pb-5"
                style={{ borderTop: "1px solid #D9CDB8", borderBottom: "1px solid #D9CDB8" }}
              >
                <div>
                  <p className="font-serif" style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", color: "#0F0A06", lineHeight: "1" }}>
                    47
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.18em] mt-1.5" style={{ color: "#8A7866" }}>
                    Knüpfer-<br />Familien
                  </p>
                </div>
                <div>
                  <p className="font-serif" style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", color: "#0F0A06", lineHeight: "1" }}>
                    8
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.18em] mt-1.5" style={{ color: "#8A7866" }}>
                    Herkunfts-<br />länder
                  </p>
                </div>
                <div>
                  <p className="font-serif" style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", color: "#0F0A06", lineHeight: "1" }}>
                    20<span style={{ color: "#A33B2A" }}>+</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.18em] mt-1.5" style={{ color: "#8A7866" }}>
                    Jahre<br />Direktimport
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <Link
                  href="#bestseller"
                  className="inline-flex items-center gap-3 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ background: "#0F0A06", color: "#FAFAF7" }}
                >
                  Bestseller entdecken
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/showroom"
                  className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-semibold pb-1"
                  style={{ color: "#0F0A06", borderBottom: "1px solid #0F0A06" }}
                >
                  Showroom-Termin →
                </Link>
              </div>
            </div>

            <div className="order-2 lg:order-2 relative">
              <HeroCarousel
                items={allProducts.slice(0, 5).map((p) => ({
                  slug: p.slug,
                  name: p.name,
                  image: p.images[0] ?? "",
                  originCity: p.originCity,
                  origin: p.origin,
                  yearMade: p.yearMade,
                  knotsPerSqm: p.knotsPerSqm,
                  knottingDurationMonths: p.knottingDurationMonths,
                }))}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <MarqueeBar />

      {/* ── TRUST STRIP ── */}
      <TrustStrip />

      {/* ── BESTSELLER ── */}
      <section id="bestseller" className="py-14 md:py-20" style={{ background: "#FAFAF7" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <ScrollReveal>
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
                  ✦ Aus dem Showroom
                </p>
                <h2 className="font-serif text-3xl md:text-5xl leading-tight" style={{ color: "#0F0A06" }}>
                  Unsere <em style={{ color: "#A33B2A", fontStyle: "italic" }}>Bestseller.</em>
                </h2>
              </div>
              <Link
                href="#shop"
                className="hidden md:inline-block text-[11px] uppercase tracking-[0.15em] font-semibold pb-1"
                style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
              >
                Ganzen Shop ansehen →
              </Link>
            </div>
          </ScrollReveal>

          {bestsellers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {bestsellers.map((product, i) => (
                <ScrollReveal key={product.id} delay={i * 120}>
                  <Link
                    href={`/produkte/${product.slug}`}
                    className="group relative block overflow-hidden bestseller-card"
                    style={{ aspectRatio: "4/5", background: "#0F0A06" }}
                  >
                    <Image
                      src={product.images[0] || ""}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />

                    <div
                      className="absolute top-4 left-4 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] z-20"
                      style={{ background: "#FAFAF7", color: "#0F0A06" }}
                    >
                      Nr. {String(i + 1).padStart(2, "0")} · Bestseller
                    </div>
                    {product.comparePrice && (
                      <div
                        className="absolute top-4 right-4 px-2.5 py-1 text-[10px] font-bold text-white z-20"
                        style={{ background: "#A33B2A" }}
                      >
                        -{Math.round((1 - product.price / product.comparePrice) * 100)}%
                      </div>
                    )}

                    <div
                      aria-hidden
                      className="bestseller-tint pointer-events-none absolute bottom-0 left-0 right-0"
                      style={{
                        height: "70%",
                        background:
                          "linear-gradient(to top, rgba(15,10,6,0.85) 0%, rgba(15,10,6,0.55) 35%, rgba(15,10,6,0.2) 65%, transparent 100%)",
                      }}
                    />
                    <ProgressiveBlur
                      direction="bottom"
                      layers={6}
                      intensity={0.35}
                      className="bestseller-blur bestseller-blur-base"
                    />
                    <ProgressiveBlur
                      direction="bottom"
                      layers={10}
                      intensity={0.7}
                      className="bestseller-blur bestseller-blur-hover"
                    />

                    <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                      <p
                        className="text-[10px] uppercase tracking-[0.2em] mb-1.5"
                        style={{ color: "rgba(250,250,247,0.75)" }}
                      >
                        {product.origin ?? "Handgeknüpft"}
                        {product.sizeWidth && product.sizeLength && ` · ${product.sizeWidth}×${product.sizeLength} cm`}
                      </p>
                      <h3
                        className="font-serif text-xl leading-tight"
                        style={{ color: "#FAFAF7" }}
                      >
                        {product.name}
                      </h3>

                      <div className="bestseller-reveal">
                        <div className="pt-4 mt-4 flex items-baseline justify-between" style={{ borderTop: "1px solid rgba(250,250,247,0.18)" }}>
                          <div className="flex items-baseline gap-2">
                            <span className="font-serif text-xl" style={{ color: "#FAFAF7" }}>
                              {formatPrice(product.price)}
                            </span>
                            {product.comparePrice && (
                              <span className="text-xs line-through" style={{ color: "rgba(250,250,247,0.5)" }}>
                                {formatPrice(product.comparePrice)}
                              </span>
                            )}
                          </div>
                          <span
                            className="text-[10px] uppercase tracking-[0.18em] font-semibold pb-0.5 inline-flex items-center gap-1"
                            style={{ color: "#FAFAF7", borderBottom: "1px solid #FAFAF7" }}
                          >
                            Ansehen
                            <span aria-hidden>→</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── WARUM HAGI — Accordion ── */}
      <WhyHagiAccordion
        items={[
          {
            title: "Direktimport seit 2003",
            description:
              "Viermal pro Jahr reisen wir in den Orient — Iran, Türkei, Afghanistan, Pakistan. Wir kaufen direkt beim Knüpfer, ohne Großhandels-Stationen, ohne Importeur-Marge.",
            image: allProducts[0]?.images[0] ?? "",
          },
          {
            title: "Echtheitszertifikat inklusive",
            description:
              "Jeder Teppich kommt mit schriftlichem Echtheitszertifikat: Herkunft, Knoten/m², Material, Knüpfer-Familie und Datum dokumentiert.",
            image: allProducts[1]?.images[0] ?? allProducts[0]?.images[0] ?? "",
          },
          {
            title: "47 Knüpfer-Familien persönlich",
            description:
              "Wir kennen jeden Knüpfer namentlich. Faire Preise, langfristige Beziehungen, dokumentierte Werkstätten — keine anonyme Lieferkette.",
            image: allProducts[2]?.images[0] ?? allProducts[0]?.images[0] ?? "",
          },
          {
            title: "Stuttgarter Showroom",
            description:
              "Über 200 Teppiche zum Anfassen in der Egilolfstraße. Persönliche Beratung durch Hagi selbst — Termin meist in 24 Stunden bestätigt.",
            image: allProducts[3]?.images[0] ?? allProducts[0]?.images[0] ?? "",
          },
          {
            title: "31 Tage Probestellung",
            description:
              "Zuhause testen, ohne Risiko. Versand frei Haus. Rückversand kostenlos. Keine Diskussion, kein Kleingedrucktes — wir wollen, dass er passt.",
            image: allProducts[4]?.images[0] ?? allProducts[0]?.images[0] ?? "",
          },
        ]}
      />

      {/* ── SHOP MIT FILTER ── */}
      <section id="shop" className="py-20 md:py-28" style={{ background: "#FAFAF7" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <ScrollReveal>
            <div className="mb-12">
              <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
                ✦ Vollständige Kollektion
              </p>
              <h2 className="font-serif text-3xl md:text-5xl leading-tight" style={{ color: "#0F0A06" }}>
                Der ganze Shop —<br />
                <em style={{ color: "#A33B2A", fontStyle: "italic" }}>nach Kollektion gefiltert.</em>
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={120}>
            <ShopFilter products={allProducts} categories={categories} />
          </ScrollReveal>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <Reviews />

      {/* ── STATS ── */}
      <section
        style={{ background: "#F0EAD8", borderTop: "1px solid #E5DCC8" }}
        className="py-20 md:py-28"
      >
        <div className="max-w-page mx-auto px-6 md:px-12">
          <ScrollReveal>
            <p className="text-[10px] uppercase tracking-[0.25em] mb-16" style={{ color: "#B89968" }}>
              ✦ Warum Hagi Teppiche
            </p>
          </ScrollReveal>

          <div className="divide-y" style={{ borderColor: "#E5DCC8" }}>
            {[
              {
                num: "01",
                title: "Kein Zwischenhändler",
                text: "Wir kaufen direkt beim Produzenten in Iran, Türkei und Afghanistan. Keine Importeur-Marge, kein Großhandels-Aufschlag.",
              },
              {
                num: "02",
                title: "Über 20 Jahre Erfahrung",
                text: "Seit mehr als zwei Jahrzehnten kennen wir unsere Lieferanten persönlich. Qualitätssicherung beginnt am Webstuhl, nicht im Lager.",
              },
              {
                num: "03",
                title: "Gratis Versand & 30 Tage Rückgabe",
                text: "Bestellen Sie ohne Risiko. Lieferung frei Haus, Rückgabe kostenlos — ohne Fragen, ohne Formulare.",
              },
              {
                num: "04",
                title: "Showroom Stuttgart",
                text: "Teppiche müssen Sie fühlen. Besuchen Sie uns in Stuttgart und erleben Sie die Qualität vor Ort.",
              },
            ].map((item, i) => (
              <ScrollReveal key={item.num} delay={i * 100}>
                <div className="grid md:grid-cols-[100px_1fr_2fr] gap-6 py-10 group">
                  <span
                    className="font-serif text-3xl"
                    style={{ color: "#0F0A06" }}
                  >
                    {item.num}
                  </span>
                  <h3
                    className="font-serif text-xl md:text-2xl leading-tight"
                    style={{ color: "#0F0A06" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-base leading-relaxed"
                    style={{ color: "#5A4A3A" }}
                  >
                    {item.text}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
