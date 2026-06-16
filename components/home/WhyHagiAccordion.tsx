"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export interface WhyItem {
  title: string;
  description: string;
  image: string;
}

interface Props {
  items: WhyItem[];
}

export function WhyHagiAccordion({ items }: Props) {
  const [active, setActive] = useState(0);
  if (items.length === 0) return null;

  return (
    <section className="relative overflow-hidden py-20 md:py-28" style={{ background: "#0F0A06" }}>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 15% 30%, rgba(184,153,104,0.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 70%, rgba(163,59,42,0.12) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-page mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.45fr] gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] mb-5" style={{ color: "#B89968" }}>
              ✦ Darum Hagi
            </p>
            <h2
              className="font-serif leading-[0.95] mb-8"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)", color: "#FAFAF7", letterSpacing: "-0.01em" }}
            >
              Was uns von <em style={{ color: "#B89968", fontStyle: "italic" }}>anderen</em> trennt.
            </h2>
            <p className="text-base md:text-lg leading-relaxed mb-10" style={{ color: "#D2C9B5", maxWidth: "42ch" }}>
              Fünf konkrete Gründe — keine Marketing-Phrasen, sondern Dinge, die der Großhandel um die Ecke nicht leistet. Fahren Sie mit der Maus über ein Bild.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <Link
                href="/ueber-uns"
                className="inline-flex items-center gap-3 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ background: "#FAFAF7", color: "#0F0A06" }}
              >
                Unsere Geschichte
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/showroom"
                className="text-[11px] uppercase tracking-[0.18em] font-semibold pb-1"
                style={{ color: "#FAFAF7", borderBottom: "1px solid rgba(250,250,247,0.4)" }}
              >
                Showroom besuchen →
              </Link>
            </div>
          </div>

          <div
            className="flex flex-row items-stretch gap-2 md:gap-3 overflow-x-auto"
            style={{ height: "min(520px, 70vh)" }}
            role="tablist"
            aria-label="Was Hagi besonders macht"
          >
            {items.map((item, i) => {
              const isActive = i === active;
              return (
                <button
                  key={i}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`why-panel-${i}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className="relative h-full cursor-pointer text-left overflow-hidden"
                  style={{
                    transition: "flex-grow 0.7s cubic-bezier(0.16,1,0.3,1), outline-color 0.5s ease",
                    flex: isActive ? "5 1 0" : "0.6 1 0",
                    minWidth: isActive ? "min(72vw, 380px)" : "56px",
                    background: "#1A1208",
                    outline: isActive ? "1px solid rgba(184,153,104,0.45)" : "1px solid transparent",
                    outlineOffset: "-1px",
                  }}
                >
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    style={{
                      opacity: isActive ? 0.9 : 0.42,
                      transition: "opacity 0.7s ease, transform 0.9s cubic-bezier(0.16,1,0.3,1)",
                      transform: isActive ? "scale(1.0)" : "scale(1.15)",
                    }}
                    sizes="(max-width: 768px) 80vw, 400px"
                  />

                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: isActive
                        ? "linear-gradient(to top, rgba(15,10,6,0.92) 0%, rgba(15,10,6,0.35) 50%, rgba(15,10,6,0.45) 100%)"
                        : "linear-gradient(to bottom, rgba(15,10,6,0.4) 0%, rgba(15,10,6,0.75) 100%)",
                      transition: "background 0.7s ease",
                    }}
                  />

                  {!isActive && (
                    <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
                      <span
                        className="text-[10px] uppercase tracking-[0.3em] font-semibold whitespace-nowrap"
                        style={{
                          color: "#D2C9B5",
                          transform: "rotate(-90deg)",
                          transformOrigin: "center",
                        }}
                      >
                        {item.title}
                      </span>
                    </div>
                  )}

                  <div
                    id={`why-panel-${i}`}
                    className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end pointer-events-none"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transition: "opacity 0.5s ease 0.15s",
                    }}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
                      {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                    </p>
                    <h3
                      className="font-serif text-2xl md:text-3xl leading-tight mb-3"
                      style={{ color: "#FAFAF7" }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm md:text-base leading-relaxed" style={{ color: "#D2C9B5", maxWidth: "32ch" }}>
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
