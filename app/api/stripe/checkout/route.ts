import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { z } from "zod";

const CheckoutSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1).max(10),
    })
  ).min(1).max(9), // Stripe metadata-Wert hat 500-Zeichen-Limit — 9 Items max sicher
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  deliveryType: z.enum(["SHIPPING", "PICKUP"]),
  shippingStreet: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingZip: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CheckoutSchema.parse(body);

    // Produkte aus DB laden und Preise verifizieren
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, inStock: true },
    });

    if (products.length !== data.items.length) {
      return NextResponse.json(
        { error: "Ein oder mehrere Produkte sind nicht verfügbar." },
        { status: 400 }
      );
    }

    // Server-Side: Adressfelder bei Versand prüfen
    if (data.deliveryType === "SHIPPING" && (!data.shippingStreet || !data.shippingCity || !data.shippingZip)) {
      return NextResponse.json(
        { error: "Lieferadresse unvollständig." },
        { status: 400 }
      );
    }

    // Versandkosten
    const shippingCost = data.deliveryType === "SHIPPING" ? 995 : 0; // 9,95 € Versand

    // Stripe Checkout Session erstellen
    const stripe = getStripe();
    type LineItem = {
      price_data: {
        currency: string;
        product_data: { name: string; images: string[]; metadata?: Record<string, string> };
        unit_amount: number;
      };
      quantity: number;
    };
    const lineItems: LineItem[] = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: product.name,
            images: product.images.slice(0, 1),
            metadata: { productId: product.id },
          },
          unit_amount: product.price,
        },
        quantity: item.quantity,
      };
    });

    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: "Versandkosten", images: [] },
          unit_amount: shippingCost,
        },
        quantity: 1,
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${appUrl}/bestellung-bestaetigt?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/warenkorb`,
      customer_email: data.customerEmail,
      metadata: {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone ?? "",
        deliveryType: data.deliveryType,
        shippingStreet: data.shippingStreet ?? "",
        shippingCity: data.shippingCity ?? "",
        shippingZip: data.shippingZip ?? "",
        itemsJson: JSON.stringify(data.items),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/checkout] Fehler:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ungültige Eingabedaten." }, { status: 400 });
    }
    return NextResponse.json({ error: "Checkout-Fehler." }, { status: 500 });
  }
}
