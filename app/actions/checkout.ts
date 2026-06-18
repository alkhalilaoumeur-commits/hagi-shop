"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createDraftOrderAndStripeSession } from "@/lib/services/order-create";
import { getCurrentCustomer } from "@/lib/services/customer-auth";

const cartItemSchema = z.object({
  productId: z.string().min(1).max(128),
  quantity: z.number().int().min(1).max(50),
});

const addressSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  company: z.string().max(120).optional().nullable(),
  street1: z.string().min(1).max(120),
  street2: z.string().max(120).optional().nullable(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional().nullable(),
  postalCode: z.string().min(1).max(20),
  countryCode: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/),
  phone: z.string().max(40).optional().nullable(),
});

export const checkoutInputSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(25),

  email: z.string().email().max(254),
  phone: z.string().max(40).optional().nullable(),

  isBusinessCustomer: z.boolean(),
  companyName: z.string().max(120).optional().nullable(),
  vatId: z.string().max(40).optional().nullable(),

  shipping: addressSchema,
  billingSameAsShipping: z.boolean(),
  billing: addressSchema.optional().nullable(),

  shippingRateId: z.string().max(64),
  deliveryType: z.enum(["SHIPPING", "PICKUP", "LOCAL_DELIVERY"]),

  discountCode: z.string().max(64).optional().nullable(),

  customerNote: z.string().max(2000).optional().nullable(),

  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  withdrawalAccepted: z.literal(true),
  newsletterConsent: z.boolean().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export interface CheckoutSubmissionResult {
  ok: boolean;
  redirectUrl?: string;
  orderNumber?: string;
  errors?: { field: string; code: string }[];
}

export async function createCheckoutSessionAction(
  rawInput: unknown,
): Promise<CheckoutSubmissionResult> {
  const parsed = checkoutInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => ({ field: i.path.join("."), code: i.code })),
    };
  }
  const input = parsed.data;

  if (input.isBusinessCustomer && (!input.companyName || !input.vatId)) {
    return { ok: false, errors: [{ field: "companyName", code: "REQUIRED_FOR_B2B" }] };
  }
  if (!input.billingSameAsShipping && !input.billing) {
    return { ok: false, errors: [{ field: "billing", code: "REQUIRED_WHEN_DIFFERENT" }] };
  }

  const h = await headers();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent")?.slice(0, 500) ?? null;
  const referrer = h.get("referer")?.slice(0, 500) ?? null;

  // Eingeloggter Kunde? Dann Bestellung direkt dem Konto zuordnen.
  const currentCustomer = await getCurrentCustomer();

  try {
    const result = await createDraftOrderAndStripeSession({
      items: input.items,
      email: input.email,
      customerId: currentCustomer?.id ?? null,
      phone: input.phone ?? null,
      isBusinessCustomer: input.isBusinessCustomer,
      companyName: input.companyName ?? null,
      vatId: input.vatId ?? null,
      shipping: input.shipping,
      billing: input.billing ?? null,
      billingSameAsShipping: input.billingSameAsShipping,
      shippingRateId: input.shippingRateId,
      deliveryType: input.deliveryType,
      discountCode: input.discountCode ?? null,
      customerNote: input.customerNote ?? null,
      newsletterConsent: input.newsletterConsent ?? false,
      ipAddress,
      userAgent,
      referrer,
    });

    return {
      ok: true,
      redirectUrl: result.stripeUrl,
      orderNumber: result.orderNumber,
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    console.error("[checkout] failed", err);
    const safeErrors = new Set([
      "CART_EMPTY",
      "CART_INVALID",
      "INVALID_EMAIL",
      "SHIPPING_RATE_INVALID",
      "ORDER_NOT_CREATED",
      "INVALID",
      "NOT_YET_ACTIVE",
      "EXPIRED",
      "LIMIT_REACHED",
      "MIN_ORDER_NOT_MET",
      "ALREADY_USED",
    ]);
    const code = safeErrors.has(raw.split(":")[0]) ? raw.split(":")[0] : "INTERNAL_ERROR";
    return {
      ok: false,
      errors: [{ field: "_root", code }],
    };
  }
}
