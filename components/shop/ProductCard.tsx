import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/format";

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  image: string;
  origin?: string | null;
  sizeWidth?: number | null;
  sizeLength?: number | null;
  inStock: boolean;
}

export function ProductCard({
  slug,
  name,
  price,
  comparePrice,
  image,
  origin,
  sizeWidth,
  sizeLength,
  inStock,
}: ProductCardProps) {
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : null;

  return (
    <Link href={`/produkte/${slug}`} className="group block product-card-hover" style={{ background: "#FFFFFF" }}>
      <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
        <Image
          src={image || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600"}
          alt={name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-104"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
          style={{ background: "linear-gradient(to top, rgba(20,14,8,0.4) 0%, transparent 55%)" }}
        />
        {!inStock && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(253,250,246,0.72)", backdropFilter: "blur(2px)" }}
          >
            <span
              className="text-[10px] font-bold px-4 py-2 uppercase tracking-[0.15em]"
              style={{ background: "#FAFAF7", color: "#8A7866", border: "1px solid #E5DCC8" }}
            >
              Ausverkauft
            </span>
          </div>
        )}
        {discount && inStock && (
          <div
            className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 tracking-wide text-white"
            style={{ background: "#A33B2A" }}
          >
            -{discount}%
          </div>
        )}
      </div>

      <div className="p-4" style={{ borderTop: "1px solid #E5DCC8" }}>
        <p className="text-[10px] uppercase tracking-[0.12em] mb-0.5" style={{ color: "#8A7866" }}>
          {origin ?? "Handgeknüpft"}
        </p>
        <h3
          className="font-serif text-base leading-snug mb-1 transition-colors duration-200 group-hover:text-red"
          style={{ color: "#0F0A06" }}
        >
          {name}
        </h3>
        {sizeWidth && sizeLength && (
          <p className="text-xs mb-2" style={{ color: "#8A7866" }}>{sizeWidth} × {sizeLength} cm</p>
        )}
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm" style={{ color: "#A33B2A" }}>{formatPrice(price)}</span>
          {comparePrice && (
            <span className="text-xs line-through" style={{ color: "#8A7866" }}>{formatPrice(comparePrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
