"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/lib/cart-store";

interface Props {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    image: string;
  };
  inStock: boolean;
}

export function AddToCartButton({ product, inStock }: Props) {
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);

  const handleAdd = () => {
    if (!inStock) return;
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!inStock) {
    return (
      <button
        disabled
        className="w-full py-4 text-sm font-medium bg-border text-muted cursor-not-allowed"
      >
        Ausverkauft
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      className={`w-full py-4 text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
        added
          ? "bg-green/20 text-green border border-green"
          : "bg-green text-white hover:bg-green/90"
      }`}
    >
      {added ? (
        <>
          <Check className="w-4 h-4" />
          Im Warenkorb
        </>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4" />
          In den Warenkorb
        </>
      )}
    </button>
  );
}
