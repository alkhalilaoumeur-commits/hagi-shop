/**
 * Stage 3.4 — PDF-Generation Smoke-Test
 */

import { writeFileSync } from "node:fs";
import { generateInvoicePDF, generateDeliveryNotePDF } from "../lib/pdf/generate";

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

const fakeOrder = {
  orderNumber: "HAG-2026-000042",
  customerEmail: "test@example.com",
  billingFirstName: "Anna",
  billingLastName: "Schmidt",
  billingCompany: null,
  billingStreet1: "Königstr. 12",
  billingStreet2: null,
  billingCity: "Stuttgart",
  billingPostalCode: "70173",
  billingCountryCode: "DE",
  shippingFirstName: "Anna",
  shippingLastName: "Schmidt",
  shippingStreet1: "Königstr. 12",
  shippingStreet2: null,
  shippingCity: "Stuttgart",
  shippingPostalCode: "70173",
  shippingCountryCode: "DE",
  subtotalCents: 129900,
  shippingCents: 0,
  discountCents: 0,
  taxCents: 20725,
  totalCents: 129900,
  taxRatePercent: 19,
  isReverseCharge: false,
  vatIdSnapshot: null,
  shippingMethodName: "DHL Standard",
  paidAt: new Date("2026-06-16T10:00:00Z"),
  createdAt: new Date("2026-06-16T09:55:00Z"),
  items: [
    {
      productTitle: "Täbris Medaillon 240×170",
      productSku: "HAGI-NAI-0042",
      quantity: 1,
      unitPriceCents: 129900,
      subtotalCents: 129900,
      taxRatePercent: 19,
    },
  ],
};

async function run() {
  console.log("\n=== STAGE 3.4 — PDF GENERATION ===\n");

  const invoiceBuf = await generateInvoicePDF(fakeOrder);
  check("Invoice-PDF generiert (Buffer > 1000 bytes)", invoiceBuf.length > 1000);
  check("Invoice startet mit %PDF Header", invoiceBuf.slice(0, 4).toString() === "%PDF");
  writeFileSync("/tmp/hagi-test-invoice.pdf", invoiceBuf);
  console.log("   → /tmp/hagi-test-invoice.pdf");

  const deliveryBuf = await generateDeliveryNotePDF(fakeOrder);
  check("Delivery-Note-PDF generiert", deliveryBuf.length > 1000);
  check("Delivery startet mit %PDF Header", deliveryBuf.slice(0, 4).toString() === "%PDF");
  writeFileSync("/tmp/hagi-test-delivery.pdf", deliveryBuf);
  console.log("   → /tmp/hagi-test-delivery.pdf");

  // Kleinunternehmer-Variante
  const smallBusinessOrder = { ...fakeOrder, taxRatePercent: 0, taxCents: 0 };
  const smallBusinessBuf = await generateInvoicePDF(smallBusinessOrder);
  check("Kleinunternehmer-Invoice generiert", smallBusinessBuf.length > 1000);

  // Reverse-Charge B2B
  const reverseChargeOrder = {
    ...fakeOrder,
    taxRatePercent: 0,
    taxCents: 0,
    isReverseCharge: true,
    vatIdSnapshot: "ATU12345678",
    billingCountryCode: "AT",
  };
  const rcBuf = await generateInvoicePDF(reverseChargeOrder);
  check("Reverse-Charge-Invoice generiert", rcBuf.length > 1000);

  console.log(`\n=== RESULT: ${pass} ✓ / ${fail} ✗ ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
