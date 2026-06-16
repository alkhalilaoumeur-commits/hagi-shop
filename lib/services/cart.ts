import prisma from "@/lib/prisma";
import { applicableTaxRate, taxFromGross } from "./tax";

/**
 * Server-Side Cart-Validation.
 *
 * KRITISCH: Der Client darf NIE Preise oder Steuer diktieren.
 * Der Client schickt nur { productId, quantity }. Alles andere
 * (price, taxRate, productName, image) wird hier aus der DB neu geladen.
 *
 * Schutz gegen:
 * - Preis-Manipulation (Client sendet 1 € statt 1.299 €)
 * - Quantity-Overflow (negative oder unrealistische Werte)
 * - Phantom-Items (Client fügt nicht-existente Produkte hinzu)
 * - Out-of-stock Bypass
 */

export interface CartInput {
  productId: string;
  quantity: number;
}

export interface ValidatedCartItem {
  productId: string;
  productSlug: string;
  productSku: string;
  productTitle: string;
  productImageUrl: string | null;
  productCategory: string | null;
  quantity: number;
  unitPriceCents: number;
  unitWeightGrams: number | null;
  subtotalCents: number;
  taxRatePercent: number;
  taxCents: number;
}

export interface ValidatedCart {
  items: ValidatedCartItem[];
  itemCount: number;
  subtotalCents: number;
  taxCents: number;
  errors: string[];
}

const MAX_QUANTITY_PER_ITEM = 5;
const MAX_ITEMS_IN_CART = 20;

export async function validateCart(input: CartInput[]): Promise<ValidatedCart> {
  const errors: string[] = [];
  const items: ValidatedCartItem[] = [];

  if (!Array.isArray(input)) {
    return { items: [], itemCount: 0, subtotalCents: 0, taxCents: 0, errors: ["INVALID_CART_FORMAT"] };
  }

  if (input.length > MAX_ITEMS_IN_CART) {
    errors.push("CART_TOO_LARGE");
    return { items: [], itemCount: 0, subtotalCents: 0, taxCents: 0, errors };
  }

  const sanitized: CartInput[] = [];
  for (const raw of input) {
    const productId = typeof raw?.productId === "string" ? raw.productId.trim() : "";
    const quantity = Math.floor(Number(raw?.quantity));
    if (!productId || !Number.isFinite(quantity) || quantity < 1) continue;
    if (quantity > MAX_QUANTITY_PER_ITEM) {
      errors.push(`QUANTITY_LIMIT:${productId}`);
      continue;
    }
    sanitized.push({ productId, quantity });
  }

  if (sanitized.length === 0) {
    return { items: [], itemCount: 0, subtotalCents: 0, taxCents: 0, errors };
  }

  const productIds = Array.from(new Set(sanitized.map((i) => i.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, inStock: true },
    include: { category: { select: { slug: true, name: true } } },
  });

  const byId = new Map(products.map((p) => [p.id, p]));

  let subtotalCents = 0;
  let taxCents = 0;

  for (const cartItem of sanitized) {
    const p = byId.get(cartItem.productId);
    if (!p) {
      errors.push(`PRODUCT_UNAVAILABLE:${cartItem.productId}`);
      continue;
    }

    // Unikate: max. 1 erlaubt
    const effectiveQty = p.isUnique && cartItem.quantity > 1 ? 1 : cartItem.quantity;

    const unitPriceCents = p.price;
    const itemSubtotal = unitPriceCents * effectiveQty;
    const taxRate = applicableTaxRate(p.category?.slug ?? null);
    const tax = taxFromGross(itemSubtotal, taxRate);

    items.push({
      productId: p.id,
      productSlug: p.slug,
      productSku: p.sku ?? p.id,
      productTitle: p.name,
      productImageUrl: p.images[0] ?? null,
      productCategory: p.category?.name ?? null,
      quantity: effectiveQty,
      unitPriceCents,
      unitWeightGrams: p.shippingWeightKg ? Math.round(p.shippingWeightKg * 1000) : null,
      subtotalCents: itemSubtotal,
      taxRatePercent: tax.ratePercent,
      taxCents: tax.taxCents,
    });

    subtotalCents += itemSubtotal;
    taxCents += tax.taxCents;
  }

  return {
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    subtotalCents,
    taxCents,
    errors,
  };
}

/**
 * Berechnet das Versand-Gewicht aus den validierten Items.
 */
export function totalWeightGrams(items: ValidatedCartItem[]): number {
  return items.reduce((s, i) => s + (i.unitWeightGrams ?? 0) * i.quantity, 0);
}
