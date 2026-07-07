import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { normalizeEmail } from "@/lib/security/email";

export interface DiscountResult {
  code: string;
  discountCents: number;
  appliesToShipping: boolean;
  description?: string | null;
  errors?: string[];
}

export interface DiscountRedeemed {
  code: string;
  discountId: string;
  discountCents: number;
  appliesToShipping: boolean;
  snapshot: Prisma.InputJsonValue;
}

export interface DiscountLineItem {
  productId: string | null;
  categoryId: string | null;
  lineSubtotalCents: number;
}

interface PreviewInput {
  code: string;
  subtotalCents: number;
  shippingCents: number;
  customerId?: string | null;
  customerEmail?: string | null;
  /** Positionen des Warenkorbs — nötig, damit Produkt-/Kategorie-Ausschlüsse greifen. */
  items?: DiscountLineItem[];
}

/**
 * Rabattfähige Zwischensumme: schließt Positionen aus, deren Produkt-/Kategorie-ID
 * in `excludedProductIds`/`excludedCategoryIds` steht. Ohne Ausschlüsse oder ohne
 * Item-Liste = volle Zwischensumme (unverändertes Verhalten).
 */
function discountableSubtotal(
  d: { excludedProductIds: string[]; excludedCategoryIds: string[] },
  items: DiscountLineItem[] | undefined,
  fallbackSubtotal: number,
): number {
  const hasExclusions = d.excludedProductIds.length > 0 || d.excludedCategoryIds.length > 0;
  if (!hasExclusions || !items || items.length === 0) return fallbackSubtotal;
  const excludedProducts = new Set(d.excludedProductIds);
  const excludedCategories = new Set(d.excludedCategoryIds);
  return items.reduce((sum, it) => {
    if (it.productId && excludedProducts.has(it.productId)) return sum;
    if (it.categoryId && excludedCategories.has(it.categoryId)) return sum;
    return sum + it.lineSubtotalCents;
  }, 0);
}

interface RedeemInput extends PreviewInput {
  tx?: Prisma.TransactionClient;
}

const MAX_CODE_LENGTH = 64;

function sanitizeCode(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_CODE_LENGTH) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

function calcDiscount(d: {
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  maxDiscountCents: number | null;
}, subtotalCents: number, shippingCents: number): { discountCents: number; appliesToShipping: boolean } {
  let discountCents = 0;
  let appliesToShipping = false;

  if (d.type === "PERCENTAGE") {
    discountCents = Math.floor((subtotalCents * d.value) / 100);
    if (d.maxDiscountCents !== null) discountCents = Math.min(discountCents, d.maxDiscountCents);
  } else if (d.type === "FIXED_AMOUNT") {
    discountCents = Math.min(d.value, subtotalCents);
  } else if (d.type === "FREE_SHIPPING") {
    discountCents = shippingCents;
    appliesToShipping = true;
  }

  if (discountCents < 0) discountCents = 0;
  return { discountCents, appliesToShipping };
}

/**
 * NUR Vorschau. Reserviert NICHT. Vor Commit-Order nochmal `redeemDiscount`
 * aufrufen, das prüft + zählt atomar hoch.
 */
export async function previewDiscount(input: PreviewInput): Promise<DiscountResult | null> {
  const code = sanitizeCode(input.code);
  if (!code) return { code: input.code, discountCents: 0, appliesToShipping: false, errors: ["INVALID"] };

  const email = input.customerEmail ? normalizeEmail(input.customerEmail) : null;
  if (input.customerEmail && !email) {
    return { code, discountCents: 0, appliesToShipping: false, errors: ["INVALID_EMAIL"] };
  }

  const d = await prisma.discount.findUnique({ where: { code } });
  if (!d || !d.active) return { code, discountCents: 0, appliesToShipping: false, errors: ["INVALID"] };

  const now = new Date();
  if (d.validFrom > now) return { code, discountCents: 0, appliesToShipping: false, errors: ["NOT_YET_ACTIVE"] };
  if (d.validUntil && d.validUntil < now) return { code, discountCents: 0, appliesToShipping: false, errors: ["EXPIRED"] };

  if (d.usageLimit !== null && d.usedCount >= d.usageLimit) {
    return { code, discountCents: 0, appliesToShipping: false, errors: ["LIMIT_REACHED"] };
  }

  if (d.minOrderCents !== null && input.subtotalCents < d.minOrderCents) {
    return { code, discountCents: 0, appliesToShipping: false, errors: ["MIN_ORDER_NOT_MET"] };
  }

  if (d.oncePerCustomer && email) {
    const previousUse = await prisma.order.findFirst({
      where: {
        customerEmail: email,
        discountCode: code,
        orderStatus: { not: "CANCELLED" },
      },
      select: { id: true },
    });
    if (previousUse) {
      return { code, discountCents: 0, appliesToShipping: false, errors: ["ALREADY_USED"] };
    }
  }

  const base = discountableSubtotal(d, input.items, input.subtotalCents);
  const { discountCents, appliesToShipping } = calcDiscount(d, base, input.shippingCents);
  return { code, discountCents, appliesToShipping, description: d.description };
}

/**
 * Atomic redeem — innerhalb einer Transaktion aufrufen (oder ohne tx läuft eigene mini-tx).
 *
 * Race-condition-sicher:
 *   updateMany({
 *     where: { id, active: true, OR: [{ usageLimit: null }, { usedCount: { lt: usageLimit } }] },
 *     data: { usedCount: { increment: 1 } }
 *   })
 *
 * Wenn count === 0 → Limit war gerade voll → throw INVALID. So kann genau ein
 * Caller die letzte Verwendung beanspruchen.
 *
 * Throws bei Fehler. Catcher müssen `INVALID` / `LIMIT_REACHED` etc behandeln.
 */
export async function redeemDiscount(input: RedeemInput): Promise<DiscountRedeemed> {
  const code = sanitizeCode(input.code);
  if (!code) throw new Error("INVALID");

  const email = input.customerEmail ? normalizeEmail(input.customerEmail) : null;
  if (input.customerEmail && !email) throw new Error("INVALID_EMAIL");

  const client = input.tx ?? prisma;

  const d = await client.discount.findUnique({ where: { code } });
  if (!d || !d.active) throw new Error("INVALID");

  const now = new Date();
  if (d.validFrom > now) throw new Error("NOT_YET_ACTIVE");
  if (d.validUntil && d.validUntil < now) throw new Error("EXPIRED");

  if (d.minOrderCents !== null && input.subtotalCents < d.minOrderCents) {
    throw new Error("MIN_ORDER_NOT_MET");
  }

  if (d.oncePerCustomer && email) {
    const previousUse = await client.order.findFirst({
      where: {
        customerEmail: email,
        discountCode: code,
        orderStatus: { not: "CANCELLED" },
      },
      select: { id: true },
    });
    if (previousUse) throw new Error("ALREADY_USED");
  }

  // ATOMARE Reservation: nur erhöhen wenn unter Limit
  if (d.usageLimit !== null) {
    const updated = await client.discount.updateMany({
      where: {
        id: d.id,
        active: true,
        usedCount: { lt: d.usageLimit },
      },
      data: { usedCount: { increment: 1 } },
    });
    if (updated.count === 0) throw new Error("LIMIT_REACHED");
  } else {
    await client.discount.update({
      where: { id: d.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  const base = discountableSubtotal(d, input.items, input.subtotalCents);
  const { discountCents, appliesToShipping } = calcDiscount(d, base, input.shippingCents);

  return {
    code,
    discountId: d.id,
    discountCents,
    appliesToShipping,
    snapshot: {
      code,
      type: d.type,
      value: d.value,
      description: d.description,
      appliesToShipping,
    } as Prisma.InputJsonValue,
  };
}

/**
 * Rollback bei Order-Abbruch (Stripe-Cancel, etc.). Counter dekrementieren.
 */
export async function releaseDiscount(code: string, tx?: Prisma.TransactionClient): Promise<void> {
  const sanitized = sanitizeCode(code);
  if (!sanitized) return;
  const client = tx ?? prisma;
  await client.discount.updateMany({
    where: { code: sanitized, usedCount: { gt: 0 } },
    data: { usedCount: { decrement: 1 } },
  });
}
