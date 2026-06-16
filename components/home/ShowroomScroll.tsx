"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface ShowroomItem {
  slug: string;
  name: string;
  origin?: string | null;
  sizeWidth?: number | null;
  sizeLength?: number | null;
  material?: string | null;
  image: string;
}

interface ShowroomScrollProps {
  items: ShowroomItem[];
}

export function ShowroomScroll({ items }: ShowroomScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const drag = useRef({ active: false, startX: 0, startScroll: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setScrollProgress(max > 0 ? el.scrollLeft / max : 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    drag.current.active = true;
    drag.current.startX = e.pageX;
    drag.current.startScroll = el.scrollLeft;
    el.classList.add("is-dragging");
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const delta = e.pageX - drag.current.startX;
    el.scrollLeft = drag.current.startScroll - delta * 1.5;
  };
  const stopDrag = () => {
    const el = scrollRef.current;
    drag.current.active = false;
    el?.classList.remove("is-dragging");
  };

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 520, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="drag-scroll flex gap-6 pb-6 px-6 md:px-12"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        {items.map((item, i) => (
          <Link
            key={item.slug + i}
            href={`/produkte/${item.slug}`}
            className="tilt-card flex-shrink-0 relative group block"
            style={{
              width: "min(78vw, 460px)",
              height: "min(96vw, 580px)",
              background: "#FFFFFF",
            }}
            draggable={false}
          >
            <div className="relative w-full h-[70%] overflow-hidden">
              <div className="tilt-img absolute inset-0">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 80vw, 460px"
                  draggable={false}
                />
              </div>
              <div
                className="absolute top-4 left-4 px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-semibold"
                style={{ background: "#FAFAF7", color: "#0F0A06" }}
              >
                Nr. {String(i + 1).padStart(2, "0")}
              </div>
            </div>

            <div className="p-6 h-[30%] flex flex-col justify-between">
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] mb-2"
                  style={{ color: "#B89968" }}
                >
                  {item.origin ?? "Handgeknüpft"}
                </p>
                <h3
                  className="font-serif text-xl leading-tight"
                  style={{ color: "#0F0A06" }}
                >
                  {item.name}
                </h3>
              </div>
              <div
                className="flex gap-4 text-[11px] font-mono pt-3 mt-3"
                style={{ borderTop: "1px solid #E5DCC8", color: "#5A4A3A" }}
              >
                {item.sizeWidth && item.sizeLength && (
                  <span>{item.sizeWidth}×{item.sizeLength} cm</span>
                )}
                {item.material && <span>{item.material}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-6 px-6 md:px-12 mt-8">
        <div
          className="flex-1 h-[1px] relative overflow-hidden"
          style={{ background: "#E5DCC8" }}
        >
          <div
            className="absolute top-0 left-0 h-full transition-all duration-300"
            style={{
              width: `${Math.max(8, scrollProgress * 100)}%`,
              background: "#A33B2A",
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollBy(-1)}
            className="w-10 h-10 flex items-center justify-center transition-all hover:bg-ink hover:text-bg"
            style={{ border: "1px solid #E5DCC8", color: "#0F0A06" }}
            aria-label="Zurück"
          >
            ←
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="w-10 h-10 flex items-center justify-center transition-all hover:bg-ink hover:text-bg"
            style={{ border: "1px solid #E5DCC8", color: "#0F0A06" }}
            aria-label="Vor"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
