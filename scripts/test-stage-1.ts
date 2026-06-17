/**
 * Stufe-1 Smoke-Test
 * Lokal: `npx tsx scripts/test-stage-1.ts`
 *
 * Validiert:
 * - Token-Generierung (Crypto-Random + Hash)
 * - Order-Number-Counter (race-condition-frei)
 * - Tax-Service (small_business vs standard)
 * - Cart-Validation (Anti-Tampering)
 * - Discount-Preview (Limit, Min-Order, Once-per-Customer)
 * - Shipping-Quote (Zonen + Free-Shipping)
 */

import {
  generateToken,
  hashToken,
  safeCompare,
  verifyTokenHash,
} from "../lib/security/tokens";
import { nextOrderNumber } from "../lib/services/order-numbering";
import { taxFromGross, applicableTaxRate, shouldApplyReverseCharge } from "../lib/services/tax";
import { validateCart, totalWeightGrams } from "../lib/services/cart";
import { previewDiscount } from "../lib/services/discount";
import { quoteShipping } from "../lib/services/shipping";
import prisma from "../lib/prisma";

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
  console.log("\n=== STUFE-1 SMOKE-TEST ===\n");

  console.log("--- 1) Token Service ---");
  const t1 = generateToken(32);
  const t2 = generateToken(32);
  check("Token 32 bytes → ≥43 chars base64url", t1.length >= 43);
  check("Tokens sind eindeutig", t1 !== t2);
  check("Tokens enthalten nur URL-sichere Zeichen", /^[A-Za-z0-9_-]+$/.test(t1));

  const hash1 = hashToken(t1);
  const hash2 = hashToken(t1);
  check("Hash determinitisch", hash1 === hash2);
  check("Hash unterscheidet sich von Plaintext", hash1 !== t1);
  check("verifyTokenHash matched korrekt", verifyTokenHash(t1, hash1));
  check("verifyTokenHash blockt falsche Tokens", !verifyTokenHash(t2, hash1));
  check("safeCompare gleiche Strings", safeCompare("abc", "abc"));
  check("safeCompare ungleiche Strings", !safeCompare("abc", "abd"));
  check("safeCompare ungleiche Länge", !safeCompare("abc", "abcdef"));

  console.log("\n--- 2) Order Numbering ---");
  const n1 = await nextOrderNumber();
  const n2 = await nextOrderNumber();
  const n3 = await nextOrderNumber();
  check("Order-Number Format HAG-YYYY-NNNNNN", /^HAG-\d{4}-\d{6}$/.test(n1), n1);
  check("Order-Numbers monoton aufsteigend", n1 < n2 && n2 < n3, `${n1} < ${n2} < ${n3}`);
  const parallel = await Promise.all([nextOrderNumber(), nextOrderNumber(), nextOrderNumber()]);
  const unique = new Set(parallel).size === parallel.length;
  check("Parallele nextOrderNumber() race-condition-frei (eindeutig)", unique, parallel.join(","));

  console.log("\n--- 3) Tax Service ---");
  const taxStd = taxFromGross(11900, 19);
  check("Tax aus Brutto 119,00€ @ 19% → 19,00€ Steuer", taxStd.taxCents === 1900, `got ${taxStd.taxCents}`);
  check("Tax-Base bei 119,00€ → 100,00€", taxStd.baseCents === 10000);
  const taxZero = taxFromGross(10000, 0);
  check("Tax 0% → 0 Steuer", taxZero.taxCents === 0 && taxZero.baseCents === 10000);
  check("applicableTaxRate respektiert TAX_MODE env", typeof applicableTaxRate("oriental") === "number");
  check("Reverse-Charge DE-Sender → DE-B2B → false", !shouldApplyReverseCharge({ isB2B: true, customerCountryCode: "DE", customerVatId: "DE123" }));

  console.log("\n--- 4) Cart Validation (Anti-Tampering) ---");
  const product = await prisma.product.findFirst({ where: { inStock: true } });
  if (!product) {
    check("Cart-Test setup", false, "Kein Produkt in DB");
  } else {
    const valid = await validateCart([{ productId: product.id, quantity: 1 }]);
    check("Valider Cart wird angenommen", valid.items.length === 1);
    check("Preis kommt aus DB, nicht aus Input", valid.items[0].unitPriceCents === product.price);
    const invalid = await validateCart([{ productId: "GHOST-ID-NONEXISTENT", quantity: 1 }]);
    check("Phantom-Produkt wird abgelehnt", invalid.items.length === 0);
    check("Phantom-Produkt erzeugt Error-Code", invalid.errors.some((e) => e.startsWith("PRODUCT_UNAVAILABLE")));
    const overflow = await validateCart([{ productId: product.id, quantity: 999 }]);
    check("Quantity > Limit wird abgelehnt", overflow.errors.some((e) => e.startsWith("QUANTITY_LIMIT")));
    const negative = await validateCart([{ productId: product.id, quantity: -5 }]);
    check("Negative Quantity wird verworfen", negative.items.length === 0);
    const fakeInput = await validateCart([
      { productId: product.id, quantity: 1, fakePrice: 1, name: "Fake" } as any,
    ]);
    check("Extra-Felder im Input werden ignoriert (Mass-Assignment-Schutz)", fakeInput.items[0].unitPriceCents === product.price);
    const weight = totalWeightGrams(valid.items);
    check("totalWeightGrams berechnet", weight >= 0);
  }

  console.log("\n--- 5) Discount Preview ---");
  const goodDiscount = await previewDiscount({
    code: "WILLKOMMEN10",
    subtotalCents: 50000,
    shippingCents: 1490,
    customerEmail: "test@example.com",
  });
  check("Gültiger Discount wird erkannt", goodDiscount?.discountCents === 5000);
  const tooSmall = await previewDiscount({
    code: "WILLKOMMEN10",
    subtotalCents: 1000,
    shippingCents: 1490,
    customerEmail: "test@example.com",
  });
  check("Min-Order-Check funktioniert", tooSmall?.errors?.includes("MIN_ORDER_NOT_MET"));
  const ghost = await previewDiscount({
    code: "NICHTEXISTENT",
    subtotalCents: 50000,
    shippingCents: 0,
    customerEmail: "test@example.com",
  });
  check("Ungültiger Code wird abgelehnt", ghost?.errors?.includes("INVALID"));
  const freeShipCode = await previewDiscount({
    code: "GRATISVERSAND",
    subtotalCents: 30000,
    shippingCents: 1490,
    customerEmail: "test@example.com",
  });
  check("Free-Shipping-Discount Wert = Versandkosten", freeShipCode?.discountCents === 1490);
  const sqlInject = await previewDiscount({
    code: "' OR '1'='1",
    subtotalCents: 50000,
    shippingCents: 0,
    customerEmail: "test@example.com",
  });
  check("SQL-Injection im Code wirft kein Crash", sqlInject !== undefined);

  console.log("\n--- 6) Shipping Quote ---");
  const dachQuotes = await quoteShipping({
    countryCode: "DE",
    subtotalCents: 30000,
    weightGrams: 5000,
    deliveryType: "SHIPPING",
  });
  check("DE Shipping-Quotes vorhanden", dachQuotes.length > 0);
  check("DE Quotes sortiert (cheapest first)", dachQuotes.every((q, i, a) => i === 0 || a[i - 1].cents <= q.cents));
  const freeShipping = await quoteShipping({
    countryCode: "DE",
    subtotalCents: 60000,
    weightGrams: 3000,
    deliveryType: "SHIPPING",
  });
  check("Free-Shipping ab Threshold", freeShipping.some((q) => q.freeShippingApplied && q.cents === 0));
  const pickup = await quoteShipping({
    countryCode: "DE",
    subtotalCents: 30000,
    weightGrams: 3000,
    deliveryType: "PICKUP",
  });
  check("PICKUP Quote = 0 €", pickup[0]?.cents === 0);
  const unsupported = await quoteShipping({
    countryCode: "ZZ",
    subtotalCents: 30000,
    weightGrams: 3000,
    deliveryType: "SHIPPING",
  });
  check("Unbekanntes Land → leere Quote-Liste", unsupported.length === 0);

  console.log(`\n=== RESULT: ${pass} ✓ / ${fail} ✗ ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
