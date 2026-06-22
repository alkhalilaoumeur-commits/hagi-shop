"use server";

import { headers } from "next/headers";
import { createDraftOrderAndStripeSession } from "@/lib/services/order-create";
import { getCurrentCustomer } from "@/lib/services/customer-auth";
import { checkoutInputSchema, type CheckoutSubmissionResult } from "./checkout-schema";

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
