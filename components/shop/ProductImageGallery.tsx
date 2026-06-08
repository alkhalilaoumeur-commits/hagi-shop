"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  name: string;
}

const PLACEHOLDER = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800";

export function ProductImageGallery({ images, name }: Props) {
  const imgs = images.length > 0 ? images : [PLACEHOLDER];
  const [selected, setSelected] = useState(0);

  return (
    <div>
      {/* Hauptbild */}
      <div className="relative aspect-[4/5] bg-surface rounded-sm overflow-hidden mb-3">
        <Image
          src={imgs[selected] ?? PLACEHOLDER}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      {/* Thumbnails */}
      {imgs.length > 1 && (
        <div className="flex gap-2">
          {imgs.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`relative w-16 h-20 rounded-sm overflow-hidden flex-shrink-0 border-2 transition-colors ${
                i === selected ? "border-gold" : "border-border hover:border-muted"
              }`}
            >
              <Image src={img} alt={`${name} Bild ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
