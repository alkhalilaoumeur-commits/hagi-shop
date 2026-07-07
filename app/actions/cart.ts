"use server";

import { z } from "zod";
import { validateCart, totalWeightGrams, type ValidatedCart } from "@/lib/services/cart";
import { quoteShipping, type ShippingQuote } from "@/lib/services/shipping";
import { previewDiscount, type DiscountResult } from "@/lib/services/discount";
import { normalizeEmail } from "@/lib/security/email";

const cartItemSchema = z.object({
  productId: z.string().min(1).max(128),
  quantity: z.number().int().min(1).max(50),
});

const cartArraySchema = z.array(cartItemSchema).max(25);

const cartInputSchema = z.object({
  items: cartArraySchema,
});

export interface CartSnapshot {
  items: ValidatedCart["items"];
  itemCount: number;
  subtotalCents: number;
  taxCents: number;
  errors: string[];
  weightGrams: number;
}

export async function validateCartAction(rawInput: unknown): Promise<CartSnapshot> {
  const parsed = cartInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { items: [], itemCount: 0, subtotalCents: 0, taxCents: 0, errors: ["INVALID_INPUT"], weightGrams: 0 };
  }
  const cart = await validateCart(parsed.data.items);
  return {
    ...cart,
    weightGrams: totalWeightGrams(cart.items),
  };
}

const countryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/);

const deliveryTypeSchema = z.enum(["SHIPPING", "PICKUP", "LOCAL_DELIVERY"]);

const shippingInputSchema = z.object({
  items: cartArraySchema,
  countryCode: countryCodeSchema,
  deliveryType: deliveryTypeSchema,
});

export interface ShippingPreview {
  quotes: ShippingQuote[];
  subtotalCents: number;
  taxCents: number;
  weightGrams: number;
  errors: string[];
}

export async function previewShippingAction(rawInput: unknown): Promise<ShippingPreview> {
  const parsed = shippingInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { quotes: [], subtotalCents: 0, taxCents: 0, weightGrams: 0, errors: ["INVALID_INPUT"] };
  }
  const { items, countryCode, deliveryType } = parsed.data;
  const cart = await validateCart(items);
  if (cart.items.length === 0) {
    return { quotes: [], subtotalCents: 0, taxCents: 0, weightGrams: 0, errors: cart.errors };
  }
  const weightGrams = totalWeightGrams(cart.items);
  const quotes = await quoteShipping({
    countryCode,
    subtotalCents: cart.subtotalCents,
    weightGrams,
    deliveryType,
  });
  return {
    quotes,
    subtotalCents: cart.subtotalCents,
    taxCents: cart.taxCents,
    weightGrams,
    errors: cart.errors,
  };
}

const discountInputSchema = z.object({
  code: z.string().min(1).max(64),
  items: cartArraySchema,
  shippingCents: z.number().int().min(0).max(100000),
  customerEmail: z.string().max(254).optional().nullable(),
});

export interface DiscountPreview {
  result: DiscountResult | null;
  subtotalCents: number;
  errors: string[];
}

export async function previewDiscountAction(rawInput: unknown): Promise<DiscountPreview> {
  const parsed = discountInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { result: null, subtotalCents: 0, errors: ["INVALID_INPUT"] };
  }
  const { code, items, shippingCents, customerEmail } = parsed.data;
  const cart = await validateCart(items);
  if (cart.items.length === 0) {
    return { result: null, subtotalCents: 0, errors: cart.errors };
  }
  const email = customerEmail ? normalizeEmail(customerEmail) : null;
  const result = await previewDiscount({
    code,
    subtotalCents: cart.subtotalCents,
    shippingCents,
    customerEmail: email,
    items: cart.items.map((i) => ({
      productId: i.productId,
      categoryId: i.categoryId,
      lineSubtotalCents: i.subtotalCents,
    })),
  });
  return { result, subtotalCents: cart.subtotalCents, errors: cart.errors };
}
