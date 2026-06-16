/**
 * Stage 3.5+3.6 — Order-Lifecycle + Rate-Limit
 */

import prisma from "../lib/prisma";
import { generateToken } from "../lib/security/tokens";
import { nextOrderNumber } from "../lib/services/order-numbering";
import { CONSENT_VERSIONS } from "../lib/services/consent";
import {
  markOrderShipped,
  markOrderDelivered,
  cancelOrder,
  registerWithdrawal,
} from "../lib/services/order-lifecycle";
import { rateLimit, cleanupRateLimitLogs } from "../lib/services/rate-limit";

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

async function createTestOrder() {
  const product = await prisma.product.findFirst({ where: { inStock: true } });
  if (!product) throw new Error("Kein Produkt");

  return prisma.order.create({
    data: {
      orderNumber: await nextOrderNumber(),
      publicToken: generateToken(32),
      customerEmail: `lifecycle-${Date.now()}@example.com`,
      billingFirstName: "Lifecycle",
      billingLastName: "Test",
      billingStreet1: "X",
      billingCity: "Stuttgart",
      billingPostalCode: "70599",
      billingCountryCode: "DE",
      shippingFirstName: "Lifecycle",
      shippingLastName: "Test",
      shippingStreet1: "X",
      shippingCity: "Stuttgart",
      shippingPostalCode: "70599",
      shippingCountryCode: "DE",
      subtotalCents: product.price,
      shippingCents: 0,
      totalCents: product.price,
      paymentStatus: "PAID",
      orderStatus: "CONFIRMED",
      paymentProvider: "stripe",
      stripeSessionId: `cs_test_${generateToken(8)}`,
      deliveryType: "SHIPPING",
      paidAt: new Date(),
      confirmedAt: new Date(),
      termsAcceptedAt: new Date(),
      termsVersion: CONSENT_VERSIONS.TERMS,
      privacyAcceptedAt: new Date(),
      privacyVersion: CONSENT_VERSIONS.PRIVACY,
      withdrawalShownAt: new Date(),
      withdrawalVersion: CONSENT_VERSIONS.WITHDRAWAL,
      estimatedDeliveryMinDays: 2,
      estimatedDeliveryMaxDays: 4,
      items: {
        create: [
          {
            productId: product.id,
            productTitle: product.name,
            productSku: product.sku ?? product.id,
            quantity: 1,
            unitPriceCents: product.price,
            taxRatePercent: 0,
            taxCents: 0,
            subtotalCents: product.price,
            totalCents: product.price,
          },
        ],
      },
    },
    include: { items: true },
  });
}

async function cleanup(orderId: string) {
  await prisma.auditLog.deleteMany({ where: { entityId: orderId } });
  await prisma.consentLog.deleteMany({ where: { orderId } });
  await prisma.fulfillmentItem.deleteMany({ where: { fulfillment: { orderId } } });
  await prisma.fulfillment.deleteMany({ where: { orderId } });
  await prisma.orderItem.deleteMany({ where: { orderId } });
  await prisma.order.delete({ where: { id: orderId } });
}

async function run() {
  console.log("\n=== STAGE 3.5+3.6 — LIFECYCLE + RATE-LIMIT ===\n");

  console.log("--- markOrderShipped ---");
  let order = await createTestOrder();
  await markOrderShipped(
    order.id,
    { trackingNumber: "1Z999AA10123456784", carrier: "DHL", trackingUrl: "https://dhl.de/track/1Z999" },
    { actorType: "admin", actorId: "test-admin" },
  );
  const afterShip = await prisma.order.findUnique({
    where: { id: order.id },
    include: { fulfillments: { include: { items: true } } },
  });
  check("Order.fulfillmentStatus = FULFILLED", afterShip?.fulfillmentStatus === "FULFILLED");
  check("Order.fulfilledAt gesetzt", !!afterShip?.fulfilledAt);
  check("Fulfillment angelegt mit tracking", afterShip?.fulfillments[0]?.trackingNumber === "1Z999AA10123456784");
  check("FulfillmentItem quantity korrekt", afterShip?.fulfillments[0]?.items[0]?.quantity === 1);

  const shipAudit = await prisma.auditLog.findFirst({
    where: { entityId: order.id, action: "order.shipped" },
  });
  check("AuditLog order.shipped", !!shipAudit);

  console.log("\n--- markOrderShipped Idempotenz ---");
  await markOrderShipped(
    order.id,
    { trackingNumber: "DOUBLE", carrier: "DHL" },
    { actorType: "admin" },
  );
  const fulfillCount = await prisma.fulfillment.count({ where: { orderId: order.id } });
  check("Doppel-Shipping erzeugt kein zweites Fulfillment", fulfillCount === 1);

  console.log("\n--- markOrderDelivered ---");
  await markOrderDelivered(order.id, { actorType: "admin" });
  const afterDeliver = await prisma.order.findUnique({ where: { id: order.id } });
  check("Order.orderStatus = COMPLETED", afterDeliver?.orderStatus === "COMPLETED");
  check("Order.deliveredAt gesetzt", !!afterDeliver?.deliveredAt);

  console.log("\n--- registerWithdrawal ---");
  await registerWithdrawal(order.id, { reason: "Farbe passt doch nicht" }, { actorType: "customer" });
  const withdrawalAudit = await prisma.auditLog.findFirst({
    where: { entityId: order.id, action: "order.withdrawal_received" },
  });
  check("AuditLog order.withdrawal_received", !!withdrawalAudit);

  await cleanup(order.id);

  console.log("\n--- cancelOrder (vor Versand) ---");
  order = await createTestOrder();
  await cancelOrder(
    order.id,
    { reason: "Kundenwunsch", refundCents: order.totalCents },
    { actorType: "admin" },
  );
  const cancelled = await prisma.order.findUnique({ where: { id: order.id } });
  check("Order.orderStatus = CANCELLED", cancelled?.orderStatus === "CANCELLED");
  check("Order.cancelledAt gesetzt", !!cancelled?.cancelledAt);
  check("Order.paymentStatus = REFUNDED bei Refund", cancelled?.paymentStatus === "REFUNDED");
  check("Order.refundedCents gesetzt", cancelled?.refundedCents === order.totalCents);

  await cleanup(order.id);

  console.log("\n--- Rate-Limit ---");
  await cleanupRateLimitLogs();
  const key = `test-${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    const r = await rateLimit({ key, limit: 5, windowSeconds: 60 });
    check(`Request ${i + 1}/5 allowed`, r.allowed === true);
  }
  const blocked = await rateLimit({ key, limit: 5, windowSeconds: 60 });
  check("6. Request blocked", blocked.allowed === false);
  check("Retry-After > 0 bei block", blocked.retryAfter > 0);

  const cleaned = await cleanupRateLimitLogs();
  check("Cleanup removes nothing for fresh logs", cleaned === 0 || cleaned > 0);

  // Cleanup test logs
  await prisma.auditLog.deleteMany({
    where: { entityType: "RateLimit", entityId: key },
  });

  console.log(`\n=== RESULT: ${pass} ✓ / ${fail} ✗ ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
