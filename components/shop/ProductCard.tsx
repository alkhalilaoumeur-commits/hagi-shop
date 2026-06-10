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
    <Link href={`/produkte/${slug}`} className="group block">
      <div
        className="relative aspect-[3/4] overflow-hidden"
        style={{ background: "#141009" }}
      >
        <Image
          src={image || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600"}
          alt={name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(to top, rgba(11,9,5,0.6) 0%, transparent 50%)" }}
        />
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(11,9,5,0.55)" }}>
            <span className="text-xs font-semibold px-3 py-1.5 tracking-[0.1em] uppercase" style={{ background: "#141009", color: "#C8B89A", border: "1px solid #28211A" }}>
              Ausverkauft
            </span>
          </div>
        )}
        {discount && inStock && (
          <div className="absolute top-3 left-3 bg-signal text-white text-[11px] font-bold px-2 py-1 tracking-wide">
            -{discount}%
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1.5" style={{ borderTop: "1px solid #28211A", paddingTop: "14px" }}>
        <p className="text-[11px] text-muted uppercase tracking-[0.1em]">{origin ?? "Handgeknüpft"}</p>
        <h3 className="font-serif text-cream font-medium leading-snug group-hover:text-gold transition-colors duration-200">
          {name}
        </h3>
        {sizeWidth && sizeLength && (
          <p className="text-xs text-muted">{sizeWidth} × {sizeLength} cm</p>
        )}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-gold font-medium">{formatPrice(price)}</span>
          {comparePrice && (
            <span className="text-xs text-muted line-through">{formatPrice(comparePrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
