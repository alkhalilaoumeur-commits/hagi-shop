/**
 * Stage 2.4 — Order-Create Smoke-Test
 * Testet, dass Service kompiliert + Validation greift.
 * Vollständiger Test inkl. Stripe wird im Audit-Step gemacht.
 */

import prisma from "../lib/prisma";
import { createDraftOrderAndStripeSession } from "../lib/services/order-create";

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
  console.log("\n=== STAGE 2.4 — ORDER-CREATE ===\n");

  const product = await prisma.product.findFirst({ where: { inStock: true } });
  if (!product) {
    console.error("Kein Produkt in DB");
    process.exit(1);
  }

  console.log("--- Input-Validation (vor Stripe-Call) ---");

  let didThrow = false;
  try {
    await createDraftOrderAndStripeSession({
      items: [],
      email: "test@example.com",
      isBusinessCustomer: false,
      shipping: {
        firstName: "T",
        lastName: "T",
        street1: "X",
        city: "X",
        postalCode: "00000",
        countryCode: "DE",
      },
      billingSameAsShipping: true,
      shippingRateId: "rate-dach-standard",
      deliveryType: "SHIPPING",
    });
  } catch (e) {
    didThrow = (e as Error).message.includes("CART");
  }
  check("Leerer Cart → CART_EMPTY-Error", didThrow);

  let didThrowEmail = false;
  try {
    await createDraftOrderAndStripeSession({
      items: [{ productId: product.id, quantity: 1 }],
      email: "not-an-email",
      isBusinessCustomer: false,
      shipping: {
        firstName: "T",
        lastName: "T",
        street1: "X",
        city: "X",
        postalCode: "00000",
        countryCode: "DE",
      },
      billingSameAsShipping: true,
      shippingRateId: "rate-dach-standard",
      deliveryType: "SHIPPING",
    });
  } catch (e) {
    didThrowEmail = (e as Error).message === "INVALID_EMAIL";
  }
  check("Invalid Email → throw", didThrowEmail);

  let didThrowShippingInvalid = false;
  try {
    await createDraftOrderAndStripeSession({
      items: [{ productId: product.id, quantity: 1 }],
      email: "test@example.com",
      isBusinessCustomer: false,
      shipping: {
        firstName: "T",
        lastName: "T",
        street1: "X",
        city: "X",
        postalCode: "00000",
        countryCode: "DE",
      },
      billingSameAsShipping: true,
      shippingRateId: "GHOST-RATE",
      deliveryType: "SHIPPING",
    });
  } catch (e) {
    didThrowShippingInvalid = (e as Error).message === "SHIPPING_RATE_INVALID";
  }
  check("Phantom Shipping-Rate → SHIPPING_RATE_INVALID", didThrowShippingInvalid);

  console.log(`\n=== RESULT: ${pass} ✓ / ${fail} ✗ ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
