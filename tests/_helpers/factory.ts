import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/security/tokens";

let _categoryId: string | null = null;
let _productId: string | null = null;

export async function ensureProduct(): Promise<{ categoryId: string; productId: string }> {
  if (_categoryId && _productId) return { categoryId: _categoryId, productId: _productId };
  let cat = await prisma.category.findFirst();
  if (!cat) {
    cat = await prisma.category.create({
      data: { name: "Test-Kategorie", slug: "test-kategorie-" + Date.now() },
    });
  }
  _categoryId = cat.id;
  let prod = await prisma.product.findFirst({ where: { categoryId: cat.id } });
  if (!prod) {
    prod = await prisma.product.create({
      data: {
        name: "Test-Teppich",
        slug: "test-teppich-" + Date.now(),
        description: "Faktor-Produkt",
        price: 189900,
        sku: "TEST-" + Date.now(),
        categoryId: cat.id,
        images: ["https://example.com/img.jpg"],
        inStock: true,
      },
    });
  }
  _productId = prod.id;
  return { categoryId: cat.id, productId: prod.id };
}

interface OrderFactoryOpts {
  orderStatus?: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  paymentStatus?: "PENDING" | "AUTHORIZED" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "FAILED" | "EXPIRED";
  fulfillmentStatus?: "UNFULFILLED" | "FULFILLED";
  totalCents?: number;
  customerEmail?: string;
  deliveredAt?: Date | null;
  paidAt?: Date | null;
  confirmedAt?: Date | null;
  stripePaymentIntentId?: string | null;
}

export async function makeOrder(opts: OrderFactoryOpts = {}) {
  const { productId } = await ensureProduct();
  const publicToken = generateToken(32);
  const orderNumber = `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const email = opts.customerEmail ?? `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const total = opts.totalCents ?? 189900;
  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    orderNumber,
    publicToken,
    customerEmail: email,
    orderStatus: opts.orderStatus ?? "PENDING",
    paymentStatus: opts.paymentStatus ?? "PENDING",
    fulfillmentStatus: opts.fulfillmentStatus ?? "UNFULFILLED",
    subtotalCents: total,
    shippingCents: 0,
    discountCents: 0,
    taxCents: 0,
    totalCents: total,
    currency: "EUR",
    taxIncluded: true,
    paidAt: opts.paidAt ?? null,
    confirmedAt: opts.confirmedAt ?? null,
    deliveredAt: opts.deliveredAt ?? null,
    stripePaymentIntentId: opts.stripePaymentIntentId ?? null,
    billingFirstName: "Test",
    billingLastName: "User",
    billingStreet1: "Teststraße 1",
    billingPostalCode: "12345",
    billingCity: "Teststadt",
    billingCountryCode: "DE",
    shippingFirstName: "Test",
    shippingLastName: "User",
    shippingStreet1: "Teststraße 1",
    shippingPostalCode: "12345",
    shippingCity: "Teststadt",
    shippingCountryCode: "DE",
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
    termsVersion: "v1",
    privacyVersion: "v1",
    withdrawalVersion: "v1",
    withdrawalShownAt: now,
    items: {
      create: [
        {
          productId,
          productTitle: "Test-Teppich",
          productSku: "TEST-SKU",
          quantity: 1,
          unitPriceCents: total,
          subtotalCents: total,
          taxCents: 0,
          totalCents: total,
          taxRatePercent: 0,
        },
      ],
    },
  };
  data.taxRatePercent = 0;

  const order = await prisma.order.create({ data, include: { items: true } });
  return { order, publicToken };
}

export async function cleanupOrder(orderId: string) {
  await prisma.refundItem.deleteMany({ where: { refund: { orderId } } }).catch(() => {});
  await prisma.refund.deleteMany({ where: { orderId } }).catch(() => {});
  await prisma.fulfillmentItem.deleteMany({ where: { fulfillment: { orderId } } }).catch(() => {});
  await prisma.fulfillment.deleteMany({ where: { orderId } }).catch(() => {});
  await prisma.auditLog.deleteMany({ where: { entityType: "Order", entityId: orderId } }).catch(() => {});
  await prisma.consentLog.deleteMany({ where: { orderId } }).catch(() => {});
  await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
  await prisma.order.deleteMany({ where: { id: orderId } }).catch(() => {});
}

export async function cleanupAdmin(email: string) {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (admin) {
    await prisma.adminSession.deleteMany({ where: { adminId: admin.id } });
    await prisma.admin.delete({ where: { id: admin.id } });
  }
}

interface CustomerFactoryOpts {
  email?: string;
  password?: string;
  verified?: boolean;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Erzeugt einen echten Customer (mit gehashtem Passwort). Default: verifiziert.
 * Rückgabe enthält das Klartext-Passwort für Login-Tests.
 */
export async function makeCustomer(opts: CustomerFactoryOpts = {}) {
  const { hashPassword } = await import("@/lib/security/password");
  const email =
    opts.email ?? `cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = opts.password ?? "Sehr-Sicher-123";
  const passwordHash = await hashPassword(password);
  const verified = opts.verified ?? true;

  const customer = await prisma.customer.create({
    data: {
      email,
      passwordHash,
      firstName: opts.firstName ?? "Test",
      lastName: opts.lastName ?? "Kunde",
      emailVerifiedAt: verified ? new Date() : null,
    },
  });
  return { customer, email, password };
}

export async function cleanupCustomer(email: string) {
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) return;
  await prisma.customerSession.deleteMany({ where: { customerId: customer.id } }).catch(() => {});
  await prisma.customerAddress.deleteMany({ where: { customerId: customer.id } }).catch(() => {});
  await prisma.auditLog
    .deleteMany({ where: { entityType: "Customer", entityId: customer.id } })
    .catch(() => {});
  // Bestellungen entkoppeln (nicht löschen — Aufbewahrungspflicht).
  await prisma.order
    .updateMany({ where: { customerId: customer.id }, data: { customerId: null } })
    .catch(() => {});
  await prisma.customer.delete({ where: { id: customer.id } }).catch(() => {});
}
