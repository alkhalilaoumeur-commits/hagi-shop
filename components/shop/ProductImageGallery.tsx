"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  name: string;
}

const PLACEHOLDER = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200";

export function ProductImageGallery({ images, name }: Props) {
  const imgs = images.length > 0 ? images : [PLACEHOLDER];
  const [selected, setSelected] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    if (!zoom || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x, y });
  };

  return (
    <div>
      <div
        ref={containerRef}
        className="relative aspect-[4/5] overflow-hidden mb-3 cursor-zoom-in"
        style={{ background: "#EAE1D2" }}
        onClick={() => setZoom(!zoom)}
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(false)}
      >
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{
            transform: zoom ? `scale(2.2)` : "scale(1)",
            transformOrigin: `${pos.x}% ${pos.y}%`,
          }}
        >
          <Image
            src={imgs[selected] ?? PLACEHOLDER}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>

        <div
          className="absolute bottom-4 right-4 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-medium"
          style={{
            background: "rgba(15,10,6,0.85)",
            color: "#FAFAF7",
            backdropFilter: "blur(8px)",
          }}
        >
          {zoom ? "Klick zum Verkleinern" : "Klick für Detail-Zoom"}
        </div>
      </div>

      {imgs.length > 1 && (
        <div className="flex gap-3">
          {imgs.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className="relative w-20 h-24 flex-shrink-0 transition-all"
              style={{
                outline: i === selected ? "2px solid #A33B2A" : "1px solid #E5DCC8",
                outlineOffset: i === selected ? "-2px" : "-1px",
                opacity: i === selected ? 1 : 0.6,
              }}
            >
              <Image
                src={img}
                alt={`${name} Bild ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
