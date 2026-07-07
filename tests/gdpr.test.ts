import { describe, it, expect, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import { anonymizeCustomer } from "@/lib/services/gdpr";
import { generateToken, hashToken } from "@/lib/security/tokens";

/**
 * Regressionstest für B4-F1 (HIGH): DSGVO Art. 17 Anonymisierung existierte nicht.
 * Nach `anonymizeCustomer` darf keine Konto-PII mehr auffindbar sein; Bestellungen
 * werden vom Konto entkoppelt (Rechnungsdaten bleiben für §147 AO erhalten).
 */
describe("GDPR — anonymizeCustomer (Art. 17)", () => {
  let customerId: string;
  let orderId: string;

  afterEach(async () => {
    if (orderId) await prisma.order.deleteMany({ where: { id: orderId } }).catch(() => {});
    if (customerId) {
      await prisma.customerAddress.deleteMany({ where: { customerId } }).catch(() => {});
      await prisma.customerSession.deleteMany({ where: { customerId } }).catch(() => {});
      await prisma.consentLog.deleteMany({ where: { customerId } }).catch(() => {});
      await prisma.customer.deleteMany({ where: { id: customerId } }).catch(() => {});
    }
  });

  async function seed() {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const customer = await prisma.customer.create({
      data: {
        email: `max-${stamp}@example.com`,
        passwordHash: "argon2-hash",
        firstName: "Max",
        lastName: "Mustermann",
        phone: "+49 170 1234567",
        lastLoginIp: "1.2.3.4",
        companyName: "Muster GmbH",
        vatId: "DE123456789",
      },
    });
    customerId = customer.id;
    await prisma.customerAddress.create({
      data: {
        customerId, firstName: "Max", lastName: "Mustermann",
        street1: "Musterstr. 1", city: "Stuttgart", postalCode: "70173", countryCode: "DE",
      },
    });
    const token = generateToken(32);
    await prisma.customerSession.create({
      data: { customerId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600_000) },
    });
    await prisma.consentLog.create({
      data: { customerId, consentType: "PRIVACY", consentVersion: "1.0", granted: true, ipAddress: "1.2.3.4", userAgent: "Mozilla" },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `ANON-${stamp}`, publicToken: generateToken(32), customerId,
        customerEmail: customer.email, orderStatus: "COMPLETED", paymentStatus: "PAID",
        fulfillmentStatus: "FULFILLED", subtotalCents: 1000, shippingCents: 0, discountCents: 0,
        taxCents: 0, totalCents: 1000, currency: "EUR", taxIncluded: true,
        billingFirstName: "Max", billingLastName: "Mustermann", billingStreet1: "Musterstr. 1",
        billingCity: "Stuttgart", billingPostalCode: "70173", billingCountryCode: "DE",
        shippingFirstName: "Max", shippingLastName: "Mustermann", shippingStreet1: "Musterstr. 1",
        shippingCity: "Stuttgart", shippingPostalCode: "70173", shippingCountryCode: "DE",
        termsAcceptedAt: new Date(), termsVersion: "1.0",
        privacyAcceptedAt: new Date(), privacyVersion: "1.0",
        withdrawalShownAt: new Date(), withdrawalVersion: "1.0",
      },
    });
    orderId = order.id;
    return customer.email;
  }

  it("entfernt Konto-PII, löscht Adressen, widerruft Sessions, entkoppelt Orders", async () => {
    const originalEmail = await seed();
    const res = await anonymizeCustomer(customerId, { actorId: "admin-test" });
    expect(res.anonymized).toBe(true);

    const c = await prisma.customer.findUnique({ where: { id: customerId } });
    expect(c?.firstName).toBeNull();
    expect(c?.lastName).toBeNull();
    expect(c?.phone).toBeNull();
    expect(c?.passwordHash).toBeNull();
    expect(c?.lastLoginIp).toBeNull();
    expect(c?.vatId).toBeNull();
    expect(c?.email).not.toBe(originalEmail);
    expect(c?.email).not.toContain("@example.com");
    expect(c?.anonymizedAt).not.toBeNull();
    expect(c?.deletedAt).not.toBeNull();

    expect(await prisma.customerAddress.count({ where: { customerId } })).toBe(0);

    const session = await prisma.customerSession.findFirst({ where: { customerId } });
    expect(session?.revokedAt).not.toBeNull();

    const consent = await prisma.consentLog.findFirst({ where: { customerId } });
    expect(consent?.ipAddress).toBeNull();
    expect(consent?.userAgent).toBeNull();

    // Order bleibt (Steuer-Aufbewahrung), ist aber vom Konto entkoppelt
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order).not.toBeNull();
    expect(order?.customerId).toBeNull();
  });

  it("ist idempotent — zweiter Aufruf tut nichts", async () => {
    await seed();
    await anonymizeCustomer(customerId);
    const res = await anonymizeCustomer(customerId);
    expect(res.anonymized).toBe(false);
  });

  it("wirft bei unbekanntem Kunden", async () => {
    await expect(anonymizeCustomer("nonexistent-id")).rejects.toThrow("CUSTOMER_NOT_FOUND");
  });
});
