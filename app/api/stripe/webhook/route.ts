import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { sendOrderConfirmation } from "@/lib/resend";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Webhook-Signatur fehlt." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Webhook-Signatur ungültig." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};

    try {
      const rawItems: Array<{ productId: string; quantity: number }> = JSON.parse(
        meta.itemsJson ?? "[]"
      );

      // Produkte laden
      const products = await prisma.product.findMany({
        where: { id: { in: rawItems.map((i) => i.productId) } },
      });

      const totalAmount = session.amount_total ?? 0;

      // Bestellung in DB anlegen
      const order = await prisma.order.create({
        data: {
          stripeSessionId: session.id,
          stripePaymentIntent: session.payment_intent as string | null,
          customerName: meta.customerName,
          customerEmail: meta.customerEmail,
          customerPhone: meta.customerPhone || null,
          deliveryType: meta.deliveryType as "SHIPPING" | "PICKUP",
          shippingStreet: meta.shippingStreet || null,
          shippingCity: meta.shippingCity || null,
          shippingZip: meta.shippingZip || null,
          status: "PAID",
          totalAmount,
          items: {
            create: rawItems.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: product.price,
              };
            }),
          },
        },
        include: { items: { include: { product: true } } },
      });

      // Bestätigungsmail senden
      await sendOrderConfirmation({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        orderTotal: order.totalAmount,
        orderItems: order.items.map((item) => ({
          name: item.product.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      console.log(`[webhook] Bestellung ${order.id} angelegt — ${order.customerEmail}`);
    } catch (err) {
      console.error("[webhook] Bestellverarbeitung fehlgeschlagen:", err);
    }
  }

  return NextResponse.json({ received: true });
}
