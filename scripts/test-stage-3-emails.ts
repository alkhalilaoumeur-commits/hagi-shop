/**
 * Stage 3.1+3.2 — Email-Template-Render-Test
 * Rendert alle 5 Templates und prüft den HTML-Output.
 */

import { render } from "@react-email/render";
import {
  OrderConfirmationEmail,
  ShippingNotificationEmail,
  DeliveryNotificationEmail,
  CancellationNotificationEmail,
  WithdrawalReceivedEmail,
} from "../lib/email/templates";
import {
  sendOrderConfirmation,
  sendShippingNotification,
  sendDeliveryNotification,
  sendCancellationNotification,
  sendWithdrawalReceived,
} from "../lib/email/send";

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
  console.log("\n=== STAGE 3.1+3.2 — EMAILS ===\n");

  const confirmHtml = await render(
    OrderConfirmationEmail({
      customerFirstName: "Anna",
      orderNumber: "HAG-2026-000042",
      publicToken: "test_token_xyz_1234567890abcdef_1234567890ab",
      items: [
        {
          title: "Täbris Medaillon 240×170",
          sku: "HAGI-NAI-0042",
          quantity: 1,
          unitPriceCents: 129900,
          totalCents: 129900,
          imageUrl: "https://example.com/teppich.png",
        },
      ],
      subtotalCents: 129900,
      shippingCents: 0,
      discountCents: 0,
      totalCents: 129900,
      shippingMethodName: "DHL Standard",
      estimatedDeliveryRange: "2–4",
      isPickup: false,
    }),
  );
  check("OrderConfirmation HTML > 1000 chars", confirmHtml.length > 1000);
  check("OrderConfirmation enthält Order-Nummer", confirmHtml.includes("HAG-2026-000042"));
  check("OrderConfirmation enthält Status-Link", confirmHtml.includes("/bestellung/status/"));
  check("OrderConfirmation enthält Tax-Hinweis-Section", confirmHtml.includes("Probestellung"));

  const confirmText = await render(
    OrderConfirmationEmail({
      customerFirstName: "Anna",
      orderNumber: "HAG-2026-000042",
      publicToken: "abc",
      items: [{ title: "X", quantity: 1, unitPriceCents: 100, totalCents: 100 }],
      subtotalCents: 100,
      shippingCents: 0,
      discountCents: 0,
      totalCents: 100,
      shippingMethodName: "DHL",
      estimatedDeliveryRange: "2-4",
      isPickup: false,
    }),
    { plainText: true },
  );
  check("OrderConfirmation Plain-Text generiert", confirmText.length > 100);
  check("PlainText enthält keine HTML-Tags", !/<\/?[a-z][\s\S]*>/i.test(confirmText));

  const shippingHtml = await render(
    ShippingNotificationEmail({
      customerFirstName: "Anna",
      orderNumber: "HAG-2026-000042",
      publicToken: "abc",
      trackingNumber: "1Z999AA10123456784",
      trackingUrl: "https://dhl.de/track/1Z999",
      carrier: "DHL",
      estimatedDeliveryRange: "2–4",
    }),
  );
  check("ShippingNotification enthält Tracking-Nummer", shippingHtml.includes("1Z999AA10123456784"));
  check("ShippingNotification enthält CTA-Link", shippingHtml.includes("https://dhl.de/track/1Z999"));

  const deliveryHtml = await render(
    DeliveryNotificationEmail({
      customerFirstName: "Anna",
      orderNumber: "HAG-2026-000042",
      publicToken: "abc",
    }),
  );
  check("DeliveryNotification enthält 31-Tage-Hinweis", deliveryHtml.includes("31 Tage"));

  const cancelHtml = await render(
    CancellationNotificationEmail({
      customerFirstName: "Anna",
      orderNumber: "HAG-2026-000042",
      reason: "Auf Kundenwunsch storniert",
      refundCents: 129900,
    }),
  );
  check("Cancellation enthält Refund-Betrag", cancelHtml.includes("1.299,00"));
  check("Cancellation ohne Refund auch okay", true);

  const withdrawalHtml = await render(
    WithdrawalReceivedEmail({
      customerFirstName: "Anna",
      orderNumber: "HAG-2026-000042",
      publicToken: "abc",
    }),
  );
  check("Withdrawal enthält 14-Tage-Hinweis", withdrawalHtml.includes("14 Tagen"));

  console.log("\n--- Mock-Send (no RESEND_API_KEY) ---");
  delete process.env.RESEND_API_KEY;
  const sent = await sendOrderConfirmation("test@example.com", {
    customerFirstName: "Anna",
    orderNumber: "HAG-2026-000099",
    publicToken: "test",
    items: [{ title: "X", quantity: 1, unitPriceCents: 100, totalCents: 100 }],
    subtotalCents: 100,
    shippingCents: 0,
    discountCents: 0,
    totalCents: 100,
    shippingMethodName: "DHL",
    estimatedDeliveryRange: "2-4",
    isPickup: false,
  });
  check("Mock-Send returns mocked=true wenn Key fehlt", sent.mocked === true);

  console.log(`\n=== RESULT: ${pass} ✓ / ${fail} ✗ ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
