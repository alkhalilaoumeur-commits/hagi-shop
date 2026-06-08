"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";

export function ClearCartOnSuccess() {
  const clear = useCart((s) => s.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}
