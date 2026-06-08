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
      <div className="relative aspect-[3/4] overflow-hidden bg-surface rounded-sm">
        <Image
          src={image || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600"}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {!inStock && (
          <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
            <span className="bg-bg text-ink text-xs font-semibold px-3 py-1.5 rounded-sm">
              Ausverkauft
            </span>
          </div>
        )}
        {discount && inStock && (
          <div className="absolute top-3 left-3 bg-signal text-white text-xs font-bold px-2 py-1 rounded-sm">
            -{discount}%
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs text-muted uppercase tracking-wider">{origin ?? "Handgeknüpft"}</p>
        <h3 className="font-serif text-ink font-medium leading-snug group-hover:text-gold transition-colors">
          {name}
        </h3>
        {sizeWidth && sizeLength && (
          <p className="text-xs text-muted">{sizeWidth} × {sizeLength} cm</p>
        )}
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-ink">{formatPrice(price)}</span>
          {comparePrice && (
            <span className="text-sm text-muted line-through">{formatPrice(comparePrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
