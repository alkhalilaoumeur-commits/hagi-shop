import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type { Prisma } from "@prisma/client";
import { validateCart, totalWeightGrams } from "./cart";
import { quoteShipping } from "./shipping";
import { redeemDiscount, releaseDiscount } from "./discount";
import { applicableTaxRate, taxFromGross, shouldApplyReverseCharge } from "./tax";
import { nextOrderNumber } from "./order-numbering";
import { generateToken } from "@/lib/security/tokens";
import { normalizeEmailOrThrow } from "@/lib/security/email";
import { CONSENT_VERSIONS } from "./consent";
import { logAudit } from "./audit";
import { APP_URL } from "@/lib/config";

export interface OrderCreateInput {
  items: { productId: string; quantity: number }[];

  email: string;
  phone?: string | null;

  isBusinessCustomer: boolean;
  companyName?: string | null;
  vatId?: string | null;

  shipping: {
    firstName: string;
    lastName: string;
    company?: string | null;
    street1: string;
    street2?: string | null;
    city: string;
    state?: string | null;
    postalCode: string;
    countryCode: string;
    phone?: string | null;
  };
  billing?: OrderCreateInput["shipping"] | null;
  billingSameAsShipping: boolean;

  shippingRateId: string;
  deliveryType: "SHIPPING" | "PICKUP" | "LOCAL_DELIVERY";

  discountCode?: string | null;

  customerNote?: string | null;
  newsletterConsent?: boolean;

  ipAddress?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
}

export interface OrderCreateResult {
  orderId: string;
  orderNumber: string;
  publicToken: string;
  stripeSessionId: string;
  stripeUrl: string;
  totalCents: number;
}


function idempotencyKeyFor(email: string, items: OrderCreateInput["items"]): string {
  const sig = items
    .map((i) => `${i.productId}:${i.quantity}`)
    .sort()
    .join("|");
  return createHash("sha256").update(`${email.toLowerCase()}|${sig}`).digest("hex").slice(0, 48);
}

export async function createDraftOrderAndStripeSession(
  input: OrderCreateInput,
): Promise<OrderCreateResult> {
  const email = normalizeEmailOrThrow(input.email);

  const cart = await validateCart(input.items);
  if (cart.items.length === 0) throw new Error("CART_EMPTY");
  if (cart.errors.length > 0 && cart.items.length === 0)
    throw new Error(`CART_INVALID:${cart.errors.join(",")}`);

  const weightGrams = totalWeightGrams(cart.items);

  const shippingQuotes = await quoteShipping({
    countryCode: input.shipping.countryCode,
    subtotalCents: cart.subtotalCents,
    weightGrams,
    deliveryType: input.deliveryType,
  });
  const shippingRate = shippingQuotes.find((q) => q.rateId === input.shippingRateId);
  if (!shippingRate) throw new Error("SHIPPING_RATE_INVALID");

  let shippingCents = shippingRate.cents;

  let discountRedeemed: Awaited<ReturnType<typeof redeemDiscount>> | null = null;
  let discountSnapshot: Prisma.InputJsonValue | undefined;

  const taxRate = applicableTaxRate(cart.items[0]?.productCategory ?? null);
  const isReverseCharge = shouldApplyReverseCharge({
    isB2B: input.isBusinessCustomer,
    customerCountryCode: input.shipping.countryCode,
    customerVatId: input.vatId ?? null,
  });
  const effectiveTaxRate = isReverseCharge ? 0 : taxRate;

  const orderNumber = await nextOrderNumber();
  const publicToken = generateToken(32);

  const billing = input.billingSameAsShipping ? input.shipping : input.billing!;

  let order: Awaited<ReturnType<typeof prisma.order.create>> | null = null;

  try {
    order = await prisma.$transaction(async (tx) => {
      if (input.discountCode) {
        discountRedeemed = await redeemDiscount({
          code: input.discountCode,
          subtotalCents: cart.subtotalCents,
          shippingCents,
          customerEmail: email,
          tx,
        });
        if (discountRedeemed.appliesToShipping) {
          shippingCents = Math.max(0, shippingCents - discountRedeemed.discountCents);
        }
        discountSnapshot = discountRedeemed.snapshot;
      }

      const discountCents = discountRedeemed?.appliesToShipping ? 0 : discountRedeemed?.discountCents ?? 0;
      const effectiveSubtotal = Math.max(0, cart.subtotalCents - discountCents);
      const taxLine = taxFromGross(effectiveSubtotal, effectiveTaxRate);
      const totalCents = Math.max(0, effectiveSubtotal + shippingCents);

      const consentRows = [
        { type: "TERMS" as const, version: CONSENT_VERSIONS.TERMS },
        { type: "PRIVACY" as const, version: CONSENT_VERSIONS.PRIVACY },
        { type: "WITHDRAWAL" as const, version: CONSENT_VERSIONS.WITHDRAWAL },
      ];
      if (input.newsletterConsent) {
        consentRows.push({ type: "NEWSLETTER" as const, version: CONSENT_VERSIONS.NEWSLETTER });
      }

      const created = await tx.order.create({
        data: {
          orderNumber,
          publicToken,
          customerEmail: email,
          customerPhone: input.phone ?? undefined,

          billingFirstName: billing.firstName,
          billingLastName: billing.lastName,
          billingCompany: billing.company ?? undefined,
          billingStreet1: billing.street1,
          billingStreet2: billing.street2 ?? undefined,
          billingCity: billing.city,
          billingState: billing.state ?? undefined,
          billingPostalCode: billing.postalCode,
          billingCountryCode: billing.countryCode,
          billingPhone: billing.phone ?? undefined,

          shippingFirstName: input.shipping.firstName,
          shippingLastName: input.shipping.lastName,
          shippingCompany: input.shipping.company ?? undefined,
          shippingStreet1: input.shipping.street1,
          shippingStreet2: input.shipping.street2 ?? undefined,
          shippingCity: input.shipping.city,
          shippingState: input.shipping.state ?? undefined,
          shippingPostalCode: input.shipping.postalCode,
          shippingCountryCode: input.shipping.countryCode,
          shippingPhone: input.shipping.phone ?? undefined,

          currency: "EUR",
          subtotalCents: cart.subtotalCents,
          shippingCents,
          taxCents: taxLine.taxCents,
          discountCents,
          totalCents,
          taxIncluded: true,
          taxRatePercent: effectiveTaxRate,

          orderStatus: "PENDING",
          paymentStatus: "PENDING",
          fulfillmentStatus: "UNFULFILLED",
          deliveryType: input.deliveryType,

          discountCode: discountRedeemed?.code ?? undefined,
          discountSnapshot: discountSnapshot ?? Prisma.JsonNull,

          shippingMethodName: shippingRate.name,
          shippingMethodId: shippingRate.rateId === "pickup" ? undefined : shippingRate.rateId,
          estimatedDeliveryMinDays: shippingRate.minDays,
          estimatedDeliveryMaxDays: shippingRate.maxDays,

          paymentProvider: "stripe",

          isB2B: input.isBusinessCustomer,
          vatIdSnapshot: input.vatId ?? undefined,
          isReverseCharge,

          browserIp: input.ipAddress ?? undefined,
          userAgent: input.userAgent ?? undefined,
          referrer: input.referrer ?? undefined,

          termsAcceptedAt: new Date(),
          termsVersion: CONSENT_VERSIONS.TERMS,
          privacyAcceptedAt: new Date(),
          privacyVersion: CONSENT_VERSIONS.PRIVACY,
          withdrawalShownAt: new Date(),
          withdrawalVersion: CONSENT_VERSIONS.WITHDRAWAL,

          customerNote: input.customerNote ?? undefined,

          consentLogs: {
            create: consentRows.map((c) => ({
              consentType: c.type,
              consentVersion: c.version,
              granted: true,
              ipAddress: input.ipAddress ?? undefined,
              userAgent: input.userAgent?.slice(0, 500) ?? undefined,
            })),
          },
          items: {
            create: cart.items.map((i) => ({
              productId: i.productId,
              productTitle: i.productTitle,
              productSlug: i.productSlug,
              productSku: i.productSku,
              productImageUrl: i.productImageUrl ?? undefined,
              productCategory: i.productCategory ?? undefined,
              quantity: i.quantity,
              unitPriceCents: i.unitPriceCents,
              unitWeightGrams: i.unitWeightGrams ?? undefined,
              taxRatePercent: effectiveTaxRate,
              taxClass: "standard",
              taxCents: Math.round((i.subtotalCents * effectiveTaxRate) / (100 + effectiveTaxRate)),
              subtotalCents: i.subtotalCents,
              totalCents: i.subtotalCents,
              discountCents: 0,
            })),
          },
        },
      });

      return created;
    });
  } catch (err) {
    if (discountRedeemed) {
      await releaseDiscount(discountRedeemed.code);
    }
    throw err;
  }

  if (!order) throw new Error("ORDER_NOT_CREATED");

  let stripeSessionId = "";
  let stripeUrl = "";

  try {
    const stripe = getStripe();
    const idempotencyKey = `order_${order.id}_${idempotencyKeyFor(email, input.items)}`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        currency: "eur",
        customer_email: email,
        client_reference_id: order.id,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
        success_url: `${APP_URL}/bestellung-bestaetigt?token=${publicToken}`,
        cancel_url: `${APP_URL}/checkout?canceled=1`,
        line_items: cart.items.map((i) => ({
          quantity: i.quantity,
          price_data: {
            currency: "eur",
            unit_amount: i.unitPriceCents,
            product_data: {
              name: i.productTitle,
              description: i.productCategory ?? undefined,
              metadata: { productId: i.productId, sku: i.productSku },
            },
          },
        })),
        shipping_options:
          order.shippingCents > 0
            ? [
                {
                  shipping_rate_data: {
                    type: "fixed_amount",
                    fixed_amount: { amount: order.shippingCents, currency: "eur" },
                    display_name: shippingRate.name,
                  },
                },
              ]
            : undefined,
        consent_collection: { terms_of_service: "none" },
      },
      { idempotencyKey },
    );

    stripeSessionId = session.id;
    stripeUrl = session.url ?? "";

    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      },
    });
  } catch (err) {
    if (discountRedeemed) {
      const code = (discountRedeemed as { code: string }).code;
      await releaseDiscount(code);
    }
    await prisma.order.update({
      where: { id: order.id },
      data: {
        orderStatus: "CANCELLED",
        cancelReason: "stripe_session_failed",
        cancelledAt: new Date(),
      },
    });
    throw err;
  }

  await logAudit({
    actorType: "system",
    action: "order.created",
    entityType: "Order",
    entityId: order.id,
    after: { orderNumber: order.orderNumber, totalCents: order.totalCents, stripeSessionId },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    publicToken,
    stripeSessionId,
    stripeUrl,
    totalCents: order.totalCents,
  };
}
