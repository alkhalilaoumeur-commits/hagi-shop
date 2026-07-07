import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";

/**
 * Reduziert einen Stripe-Event auf die für Debug/Audit nötigen, NICHT-personenbezogenen
 * Felder, bevor er in `PaymentEvent.payload` persistiert wird (DSGVO-Datenminimierung,
 * Art. 5 Abs. 1 c). `customer_details`, E-Mail, Name, Adresse, Telefon werden verworfen.
 */
export function redactStripeEvent(event: Stripe.Event): Prisma.InputJsonValue {
  const obj = event.data?.object as unknown as Record<string, unknown> | undefined;
  return {
    id: event.id,
    type: event.type,
    created: event.created,
    object: obj
      ? {
          id: obj.id ?? null,
          object: obj.object ?? null,
          status: obj.status ?? null,
          payment_status: obj.payment_status ?? null,
          amount_total: obj.amount_total ?? null,
          currency: obj.currency ?? null,
          payment_intent: typeof obj.payment_intent === "string" ? obj.payment_intent : null,
          client_reference_id: obj.client_reference_id ?? null,
          metadata: obj.metadata ?? null,
        }
      : null,
  } as Prisma.InputJsonValue;
}
