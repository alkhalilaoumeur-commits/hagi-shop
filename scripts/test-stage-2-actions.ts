/**
 * Stage 2 — Server Actions Smoke-Test
 * `npx tsx scripts/test-stage-2-actions.ts`
 */

import prisma from "../lib/prisma";
import {
  validateCartAction,
  previewShippingAction,
  previewDiscountAction,
} from "../app/actions/cart";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean | undefined, detail?: string) {
  if (ok) {
    console.log(`✓ ${name}`);
    pass++;
  } else {
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
    fail++;
  }
}

async function run() {
  console.log("\n=== STAGE 2.1 — SERVER ACTIONS ===\n");

  const product = await prisma.product.findFirst({ where: { inStock: true } });
  if (!product) {
    console.error("Kein Produkt in DB");
    process.exit(1);
  }

  console.log("--- validateCartAction ---");
  const okCart = await validateCartAction({
    items: [{ productId: product.id, quantity: 1 }],
  });
  check("Valider Cart wird angenommen", okCart.items.length === 1);
  check("Preis kommt aus DB", okCart.items[0].unitPriceCents === product.price);
  check("weightGrams berechnet", okCart.weightGrams >= 0);

  const badShape = await validateCartAction("not an object" as unknown);
  check("Non-object Input wird abgelehnt", badShape.errors.includes("INVALID_INPUT"));

  const tooMany = await validateCartAction({
    items: Array.from({ length: 30 }).map(() => ({ productId: product.id, quantity: 1 })),
  });
  check("> 25 Items abgelehnt (Zod max)", tooMany.errors.includes("INVALID_INPUT"));

  const negQuantity = await validateCartAction({
    items: [{ productId: product.id, quantity: -5 }],
  });
  check("Negative Quantity → Zod blockt", negQuantity.errors.includes("INVALID_INPUT"));

  console.log("\n--- previewShippingAction ---");
  const shipDe = await previewShippingAction({
    items: [{ productId: product.id, quantity: 1 }],
    countryCode: "DE",
    deliveryType: "SHIPPING",
  });
  check("DE Shipping-Quotes vorhanden", shipDe.quotes.length > 0);
  check("Subtotal mit gesendet", shipDe.subtotalCents > 0);

  const pickup = await previewShippingAction({
    items: [{ productId: product.id, quantity: 1 }],
    countryCode: "DE",
    deliveryType: "PICKUP",
  });
  check("PICKUP-Quote ist gratis", pickup.quotes[0]?.cents === 0);

  const badCountry = await previewShippingAction({
    items: [{ productId: product.id, quantity: 1 }],
    countryCode: "de", // lowercase fails Zod
    deliveryType: "SHIPPING",
  });
  check("Lowercase country abgelehnt", badCountry.errors.includes("INVALID_INPUT"));

  const unsupportedCountry = await previewShippingAction({
    items: [{ productId: product.id, quantity: 1 }],
    countryCode: "ZZ",
    deliveryType: "SHIPPING",
  });
  check("Unbekanntes Land → leere Quotes", unsupportedCountry.quotes.length === 0);

  console.log("\n--- previewDiscountAction ---");
  const goodDiscount = await previewDiscountAction({
    code: "WILLKOMMEN10",
    items: [{ productId: product.id, quantity: 1 }],
    shippingCents: 1490,
    customerEmail: "test@example.com",
  });
  check("Gültiger Discount wird erkannt", (goodDiscount.result?.discountCents ?? 0) > 0);

  const sqlInject = await previewDiscountAction({
    code: "' OR '1'='1",
    items: [{ productId: product.id, quantity: 1 }],
    shippingCents: 0,
    customerEmail: "ok@ok.com",
  });
  check("SQL-Injection-Code abgelehnt", sqlInject.result?.errors?.includes("INVALID"));

  const longCode = await previewDiscountAction({
    code: "X".repeat(100),
    items: [{ productId: product.id, quantity: 1 }],
    shippingCents: 0,
    customerEmail: "ok@ok.com",
  });
  check("Code > 64 chars von Zod abgelehnt", longCode.errors.includes("INVALID_INPUT"));

  const badEmail = await previewDiscountAction({
    code: "WILLKOMMEN10",
    items: [{ productId: product.id, quantity: 1 }],
    shippingCents: 0,
    customerEmail: "x".repeat(300) + "@a.com",
  });
  check("Lange Email von Zod abgelehnt", badEmail.errors.includes("INVALID_INPUT"));

  console.log(`\n=== RESULT: ${pass} ✓ / ${fail} ✗ ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
