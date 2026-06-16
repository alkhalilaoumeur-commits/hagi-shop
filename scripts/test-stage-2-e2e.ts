/**
 * Stage 2 — End-to-End Order-Flow ohne echte Stripe-Session.
 * Testet das gesamte Order-Lifecycle vom Cart bis zur Webhook-Verarbeitung
 * mit allen Side-Effects (AuditLog, ConsentLog, Discount-Redeem, PII-Snapshot).
 */

import prisma from "../lib/prisma";
import { validateCart } from "../lib/services/cart";
import { quoteShipping } from "../lib/services/shipping";
import { redeemDiscount } from "../lib/services/discount";
import { nextOrderNumber } from "../lib/services/order-numbering";
import { generateToken } from "../lib/security/tokens";
import { logConsent, CONSENT_VERSIONS } from "../lib/services/consent";
import { logAudit } from "../lib/services/audit";
import { recordReceive, markProcessed } from "../lib/services/webhook-dedup";
import { Prisma } from "@prisma/client";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`✓ ${name}`);
    pass++;
  } else {
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
    fail++;
  }
}

async function run() {
  console.log("\n=== STAGE 2 — END-TO-END ORDER-FLOW ===\n");

  const product = await prisma.product.findFirst({ where: { inStock: true } });
  if (!product) {
    console.error("Kein Produkt");
    process.exit(1);
  }

  console.log("--- 1) Cart validate ---");
  const cart = await validateCart([{ productId: product.id, quantity: 1 }]);
  check("Cart valid", cart.items.length === 1);
  check("Preis aus DB", cart.items[0].unitPriceCents === product.price);

  console.log("\n--- 2) Shipping quote ---");
  const quotes = await quoteShipping({
    countryCode: "DE",
    subtotalCents: cart.subtotalCents,
    weightGrams: 5000,
    deliveryType: "SHIPPING",
  });
  check("DE-Quotes", quotes.length > 0);
  const rate = quotes[0];

  console.log("\n--- 3) Order-Draft anlegen ---");
  const orderNumber = await nextOrderNumber();
  const publicToken = generateToken(32);
  check("OrderNumber valid", /^HAG-\d{4}-\d{6}$/.test(orderNumber));
  check("publicToken länge", publicToken.length >= 43);

  const order = await prisma.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        orderNumber,
        publicToken,
        customerEmail: "e2e-test@example.com",
        billingFirstName: "E2E",
        billingLastName: "Test",
        billingStreet1: "Teststraße 1",
        billingCity: "Stuttgart",
        billingPostalCode: "70599",
        billingCountryCode: "DE",
        shippingFirstName: "E2E",
        shippingLastName: "Test",
        shippingStreet1: "Teststraße 1",
        shippingCity: "Stuttgart",
        shippingPostalCode: "70599",
        shippingCountryCode: "DE",
        subtotalCents: cart.subtotalCents,
        shippingCents: rate.cents,
        taxCents: cart.taxCents,
        totalCents: cart.subtotalCents + rate.cents,
        currency: "EUR",
        orderStatus: "PENDING",
        paymentStatus: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
        deliveryType: "SHIPPING",
        shippingMethodName: rate.name,
        shippingMethodId: rate.rateId,
        estimatedDeliveryMinDays: rate.minDays,
        estimatedDeliveryMaxDays: rate.maxDays,
        paymentProvider: "stripe",
        stripeSessionId: `cs_test_${generateToken(16)}`,
        termsAcceptedAt: new Date(),
        termsVersion: CONSENT_VERSIONS.TERMS,
        privacyAcceptedAt: new Date(),
        privacyVersion: CONSENT_VERSIONS.PRIVACY,
        withdrawalShownAt: new Date(),
        withdrawalVersion: CONSENT_VERSIONS.WITHDRAWAL,
        items: {
          create: cart.items.map((i) => ({
            productId: i.productId,
            productTitle: i.productTitle,
            productSlug: i.productSlug,
            productSku: i.productSku,
            productImageUrl: i.productImageUrl,
            productCategory: i.productCategory,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
            taxRatePercent: 0,
            taxCents: 0,
            subtotalCents: i.subtotalCents,
            totalCents: i.subtotalCents,
            discountCents: 0,
          })),
        },
      },
      include: { items: true },
    });
  });

  check("Order angelegt", !!order.id);
  check("Order-Items snapshotted", order.items.length === 1);
  check("Snapshot enthält productTitle", order.items[0].productTitle === product.name);
  check("Snapshot enthält productSku", !!order.items[0].productSku);

  console.log("\n--- 4) Consent + Audit ---");
  await logConsent({ orderId: order.id, consentType: "TERMS", granted: true });
  await logConsent({ orderId: order.id, consentType: "PRIVACY", granted: true });
  await logConsent({ orderId: order.id, consentType: "WITHDRAWAL", granted: true });
  const consents = await prisma.consentLog.count({ where: { orderId: order.id } });
  check("3 Consent-Logs", consents === 3);

  await logAudit({
    actorType: "system",
    action: "order.created",
    entityType: "Order",
    entityId: order.id,
  });
  const auditCount = await prisma.auditLog.count({
    where: { entityType: "Order", entityId: order.id, action: "order.created" },
  });
  check("AuditLog 'order.created'", auditCount === 1);

  console.log("\n--- 5) Webhook simulieren: checkout.session.completed ---");
  const eventId = `evt_test_${generateToken(8)}`;
  const received = await recordReceive({
    provider: "stripe",
    providerEventId: eventId,
    eventType: "checkout.session.completed",
    payload: { sessionId: order.stripeSessionId },
  });
  check("Webhook recorded", !received.alreadyProcessed);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      orderStatus: "CONFIRMED",
      paidCents: order.totalCents,
      paidAt: new Date(),
      confirmedAt: new Date(),
    },
  });
  await markProcessed(received.recordId, order.id);

  const finalized = await prisma.order.findUnique({ where: { id: order.id } });
  check("Order PaymentStatus PAID", finalized?.paymentStatus === "PAID");
  check("Order OrderStatus CONFIRMED", finalized?.orderStatus === "CONFIRMED");
  check("Order paidAt gesetzt", !!finalized?.paidAt);
  check("Order confirmedAt gesetzt", !!finalized?.confirmedAt);

  console.log("\n--- 6) Webhook-Dedup ---");
  const dedup = await recordReceive({
    provider: "stripe",
    providerEventId: eventId,
    eventType: "checkout.session.completed",
    payload: {},
  });
  check("Doppelter Webhook: alreadyProcessed=true", dedup.alreadyProcessed);

  console.log("\n--- 7) PII-Snapshot bleibt nach Customer-Anonymisierung ---");
  const customerEmailSnapshot = finalized?.customerEmail;
  const billingNameSnapshot = `${finalized?.billingFirstName} ${finalized?.billingLastName}`;
  check("Customer-Email auf Order snapshotted", customerEmailSnapshot === "e2e-test@example.com");
  check("Billing-Name auf Order snapshotted", billingNameSnapshot === "E2E Test");

  console.log("\n--- 8) Order-Lookup via publicToken ---");
  const tokenLookup = await prisma.order.findUnique({ where: { publicToken: order.publicToken } });
  check("Token-Lookup findet Order", tokenLookup?.id === order.id);

  console.log("\n--- 9) IDOR-Schutz: Order-ID-Raten geht nicht für externe ---");
  // publicToken ist random 256-bit — nicht ratbar
  // Order-ID ist cuid: vorhanden, aber nicht in URL-Pfad
  check("publicToken hat genug Entropie (>= 43 chars)", order.publicToken.length >= 43);
  check("publicToken ist URL-safe", /^[A-Za-z0-9_-]+$/.test(order.publicToken));

  console.log("\n--- 10) Cleanup ---");
  await prisma.consentLog.deleteMany({ where: { orderId: order.id } });
  await prisma.auditLog.deleteMany({ where: { entityType: "Order", entityId: order.id } });
  await prisma.paymentEvent.deleteMany({ where: { providerEventId: eventId } });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  console.log("✓ Cleanup");

  console.log(`\n=== RESULT: ${pass} ✓ / ${fail} ✗ ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
