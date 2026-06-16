"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

export interface HeroCarouselItem {
  slug: string;
  name: string;
  image: string;
  originCity?: string | null;
  origin?: string | null;
  yearMade?: number | null;
  knotsPerSqm?: number | null;
  knottingDurationMonths?: number | null;
}

interface Props {
  items: HeroCarouselItem[];
}

export function HeroCarousel({ items }: Props) {
  const [current, setCurrent] = useState(Math.floor(items.length / 2));
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((p) => (p + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setCurrent((p) => (p - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next, paused, items.length]);

  if (items.length === 0) return null;
  const active = items[current];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hidden lg:flex absolute -top-2 left-0 right-0 z-30 justify-between items-baseline pointer-events-none">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: "#B89968" }}>
          Nr. {String(current + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: "#B89968" }}>
          Aus der Kollektion
        </p>
      </div>

      <div
        className="relative w-full h-[440px] md:h-[560px] flex items-center justify-center"
        style={{ perspective: "1400px" }}
      >
        {items.map((item, i) => {
          const total = items.length;
          let pos = i - current;
          if (pos > total / 2) pos -= total;
          if (pos < -total / 2) pos += total;

          const abs = Math.abs(pos);
          const isCenter = pos === 0;
          const isAdjacent = abs === 1;
          const isHidden = abs > 2;

          return (
            <Link
              key={item.slug}
              href={`/produkte/${item.slug}`}
              className="absolute"
              style={{
                width: "min(72%, 340px)",
                height: "92%",
                transform: `translateX(${pos * 48}%) scale(${isCenter ? 1 : isAdjacent ? 0.78 : 0.6}) rotateY(${pos * -12}deg)`,
                zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                opacity: isCenter ? 1 : isAdjacent ? 0.45 : 0.18,
                filter: isCenter ? "blur(0)" : isAdjacent ? "blur(2px)" : "blur(5px)",
                visibility: isHidden ? "hidden" : "visible",
                pointerEvents: isCenter ? "auto" : "none",
                transition:
                  "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease, filter 0.6s ease",
                transformStyle: "preserve-3d",
              }}
              aria-label={item.name}
              tabIndex={isCenter ? 0 : -1}
            >
              <div
                className="relative w-full h-full overflow-hidden"
                style={{
                  background: "#EAE1D2",
                  borderRadius: "10px",
                  boxShadow: isCenter
                    ? "0 50px 100px -40px rgba(15,10,6,0.45), 0 0 0 1px #E5DCC8"
                    : "0 20px 40px -20px rgba(15,10,6,0.25), 0 0 0 1px #E5DCC8",
                }}
              >
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 70vw, 340px"
                  priority={isCenter}
                />
              </div>
            </Link>
          );
        })}

        {items.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-0 md:left-2 top-1/2 -translate-y-1/2 w-11 h-11 z-20 flex items-center justify-center text-lg transition-colors hover:bg-ink hover:text-bg focus:outline-none focus-visible:ring-2"
              style={{ background: "rgba(250,250,247,0.92)", border: "1px solid #D9CDB8", color: "#0F0A06", backdropFilter: "blur(8px)" }}
              aria-label="Vorheriger Teppich"
            >
              ←
            </button>
            <button
              onClick={next}
              className="absolute right-0 md:right-2 top-1/2 -translate-y-1/2 w-11 h-11 z-20 flex items-center justify-center text-lg transition-colors hover:bg-ink hover:text-bg focus:outline-none focus-visible:ring-2"
              style={{ background: "rgba(250,250,247,0.92)", border: "1px solid #D9CDB8", color: "#0F0A06", backdropFilter: "blur(8px)" }}
              aria-label="Nächster Teppich"
            >
              →
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-4 mt-8 items-end">
        <div key={active.slug} style={{ animation: "captionIn 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>
          <p className="text-[10px] uppercase tracking-[0.2em] mb-1.5" style={{ color: "#B89968" }}>
            {active.originCity ?? active.origin ?? "Direktimport"}
            {active.yearMade ? ` · ${active.yearMade}` : ""}
          </p>
          <p className="font-serif text-xl md:text-2xl leading-tight" style={{ color: "#0F0A06" }}>
            {active.name}
          </p>
          {active.knotsPerSqm && (
            <p className="font-mono text-[11px] mt-2" style={{ color: "#5A4A3A" }}>
              {active.knotsPerSqm.toLocaleString("de-DE")} Knoten/m²
              {active.knottingDurationMonths ? ` · ${active.knottingDurationMonths} Mon. Handarbeit` : ""}
            </p>
          )}
        </div>
        <Link
          href={`/produkte/${active.slug}`}
          className="text-[10px] uppercase tracking-[0.2em] font-semibold pb-1 whitespace-nowrap"
          style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
        >
          Ansehen →
        </Link>
      </div>

      <div className="flex gap-2 justify-center mt-8">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="h-[2px] transition-all duration-500"
            style={{
              width: i === current ? "32px" : "12px",
              background: i === current ? "#A33B2A" : "#D9CDB8",
            }}
            aria-label={`Springe zu Bild ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
