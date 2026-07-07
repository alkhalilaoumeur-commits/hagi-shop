import { describe, it, expect } from "vitest";
import { redactStripeEvent } from "@/lib/services/stripe-redact";
import type Stripe from "stripe";

/**
 * Regressionstest für B4-F2 (HIGH): PaymentEvent.payload speicherte den kompletten
 * Stripe-Event inkl. customer_details (E-Mail/Name/Adresse/Telefon). Nach dem Fix
 * enthält der persistierte Payload KEINE PII mehr.
 */
describe("Stripe-Redact — Datenminimierung für PaymentEvent.payload", () => {
  const event = {
    id: "evt_123",
    type: "checkout.session.completed",
    created: 1720000000,
    data: {
      object: {
        id: "cs_test_123",
        object: "checkout.session",
        status: "complete",
        payment_status: "paid",
        amount_total: 189900,
        currency: "eur",
        payment_intent: "pi_abc",
        client_reference_id: "order_1",
        metadata: { orderId: "order_1" },
        customer_details: {
          email: "kunde@example.com",
          name: "Max Mustermann",
          phone: "+49 170 1234567",
          address: { line1: "Musterstr. 1", city: "Stuttgart", postal_code: "70173" },
        },
        customer_email: "kunde@example.com",
      },
    },
  } as unknown as Stripe.Event;

  it("behält Debug-Felder (id, type, amount, payment_intent, metadata)", () => {
    const r = redactStripeEvent(event) as Record<string, unknown>;
    expect(r.id).toBe("evt_123");
    expect(r.type).toBe("checkout.session.completed");
    const obj = r.object as Record<string, unknown>;
    expect(obj.amount_total).toBe(189900);
    expect(obj.payment_intent).toBe("pi_abc");
    expect(obj.metadata).toEqual({ orderId: "order_1" });
  });

  it("entfernt JEGLICHE PII aus dem Payload", () => {
    const json = JSON.stringify(redactStripeEvent(event));
    expect(json).not.toContain("customer_details");
    expect(json).not.toContain("kunde@example.com");
    expect(json).not.toContain("Max Mustermann");
    expect(json).not.toContain("170 1234567");
    expect(json).not.toContain("Musterstr");
  });
});
