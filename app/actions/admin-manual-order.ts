"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/services/admin-auth";
import { nextOrderNumber } from "@/lib/services/order-numbering";
import { generateToken } from "@/lib/security/tokens";
import { CONSENT_VERSIONS } from "@/lib/services/consent";
import { normalizeEmailOrThrow } from "@/lib/security/email";
import { extractIp } from "@/lib/services/rate-limit";
import { logAudit } from "@/lib/services/audit";
import { applicableTaxRate, taxFromGross } from "@/lib/services/tax";
import { claimUniqueStock } from "@/lib/services/stock";

const manualOrderSchema = z.object({
  productId: z.string().min(1).max(128),
  quantity: z.number().int().min(1).max(50),

  customerEmail: z.string().email().max(254),
  customerPhone: z.string().max(40).optional().nullable(),
  customerFirstName: z.string().min(1).max(80),
  customerLastName: z.string().min(1).max(80),
  customerStreet: z.string().min(1).max(120),
  customerCity: z.string().min(1).max(80),
  customerPostalCode: z.string().min(1).max(20),
  customerCountryCode: z.string().length(2).regex(/^[A-Z]{2}$/),

  paymentMethod: z.enum(["CASH", "CARD_TERMINAL", "BANK_TRANSFER"]),
  internalNote: z.string().max(2000).optional().nullable(),
});

export async function createManualOrderAction(rawInput: unknown): Promise<
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; error: string }
> {
  const admin = await requireAdmin();
  const parsed = manualOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT" };
  }
  const input = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { category: { select: { slug: true, name: true } } },
  });
  if (!product || !product.inStock) {
    return { ok: false, error: "PRODUCT_UNAVAILABLE" };
  }
  if (product.isUnique && input.quantity > 1) {
    return { ok: false, error: "UNIQUE_PRODUCT_LIMIT" };
  }

  const email = normalizeEmailOrThrow(input.customerEmail);
  const h = await headers();
  const ip = extractIp(h);
  const ua = h.get("user-agent")?.slice(0, 500) ?? null;

  const orderNumber = await nextOrderNumber();
  const publicToken = generateToken(32);

  const unitPrice = product.price;
  const subtotal = unitPrice * input.quantity;
  const taxRate = applicableTaxRate(product.category?.slug ?? null);
  const taxLine = taxFromGross(subtotal, taxRate);

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      // Unikat atomar im selben Transaktions-Scope claimen (verhindert Doppelverkauf
      // gegen parallele Manual-Orders ODER einen zeitgleichen Online-Kauf).
      if (product.isUnique) {
        const { unavailable } = await claimUniqueStock(tx, [product.id]);
        if (unavailable.length > 0) {
          throw new Error("PRODUCT_UNAVAILABLE");
        }
      }
      return tx.order.create({
      data: {
        orderNumber,
        publicToken,
        customerEmail: email,
        customerPhone: input.customerPhone ?? undefined,

        billingFirstName: input.customerFirstName,
        billingLastName: input.customerLastName,
        billingStreet1: input.customerStreet,
        billingCity: input.customerCity,
        billingPostalCode: input.customerPostalCode,
        billingCountryCode: input.customerCountryCode,

        shippingFirstName: input.customerFirstName,
        shippingLastName: input.customerLastName,
        shippingStreet1: input.customerStreet,
        shippingCity: input.customerCity,
        shippingPostalCode: input.customerPostalCode,
        shippingCountryCode: input.customerCountryCode,

        currency: "EUR",
        subtotalCents: subtotal,
        shippingCents: 0,
        taxCents: taxLine.taxCents,
        totalCents: subtotal,
        paidCents: subtotal,
        taxIncluded: true,
        taxRatePercent: taxRate,

        orderStatus: "COMPLETED",
        paymentStatus: "PAID",
        fulfillmentStatus: "FULFILLED",
        deliveryType: "PICKUP",

        paymentProvider: "manual",
        paymentMethodType: input.paymentMethod.toLowerCase(),

        confirmedAt: new Date(),
        paidAt: new Date(),
        fulfilledAt: new Date(),
        deliveredAt: new Date(),

        termsAcceptedAt: new Date(),
        termsVersion: CONSENT_VERSIONS.TERMS,
        privacyAcceptedAt: new Date(),
        privacyVersion: CONSENT_VERSIONS.PRIVACY,
        withdrawalShownAt: new Date(),
        withdrawalVersion: CONSENT_VERSIONS.WITHDRAWAL,

        internalNote: `Showroom-Verkauf durch ${admin.email}${input.internalNote ? `\n${input.internalNote}` : ""}`,
        tags: ["showroom-walk-in"],

        items: {
          create: [
            {
              productId: product.id,
              productTitle: product.name,
              productSlug: product.slug,
              productSku: product.sku ?? product.id,
              productImageUrl: product.images[0] ?? undefined,
              productCategory: product.category?.name ?? undefined,
              quantity: input.quantity,
              unitPriceCents: unitPrice,
              taxRatePercent: taxRate,
              taxClass: "standard",
              taxCents: taxLine.taxCents,
              subtotalCents: subtotal,
              totalCents: subtotal,
              fulfilledQuantity: input.quantity,
            },
          ],
        },
      },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "PRODUCT_UNAVAILABLE") {
      return { ok: false, error: "PRODUCT_UNAVAILABLE" };
    }
    throw err;
  }

  await logAudit({
    actorType: "admin",
    actorId: admin.id,
    action: "order.manual_created",
    entityType: "Order",
    entityId: order.id,
    after: {
      orderNumber: order.orderNumber,
      productId: product.id,
      paymentMethod: input.paymentMethod,
    },
    ipAddress: ip,
    userAgent: ua,
  });

  revalidatePath("/admin/bestellungen");
  return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
}

export async function createManualOrderAndRedirect(rawInput: unknown): Promise<void> {
  const result = await createManualOrderAction(rawInput);
  if (result.ok) {
    redirect(`/admin/bestellungen/${result.orderId}`);
  }
  throw new Error(result.error);
}
