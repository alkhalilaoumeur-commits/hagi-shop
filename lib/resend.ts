import { Resend } from "resend";
import { VAT_NOTICE, CONTACT_EMAIL, SHOP_NAME } from "./shop-config";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY fehlt in den Umgebungsvariablen.");
    _resend = new Resend(key);
  }
  return _resend;
}

export async function sendShippingNotification(opts: {
  customerEmail: string;
  customerName: string;
  trackingNumber: string;
  orderId: string;
}) {
  const resend = getResend();
  const from = process.env.RESEND_FROM ?? `${SHOP_NAME} <bestellungen@hagi-shop.de>`;

  await resend.emails.send({
    from,
    to: opts.customerEmail,
    subject: `Ihre Bestellung ist unterwegs — Sendungsnummer ${opts.trackingNumber}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1A1614">
        <h1 style="color:#8B6914;font-size:24px">Ihre Bestellung ist auf dem Weg, ${opts.customerName.split(" ")[0]}!</h1>
        <p style="color:#4A4340;line-height:1.6">Ihr Teppich wurde heute versendet. Sie können Ihre Sendung mit der untenstehenden Nummer verfolgen.</p>
        <div style="background:#FAF7F2;border-left:3px solid #8B6914;padding:16px;margin:20px 0">
          <p style="margin:0;font-size:12px;color:#7A6E65;text-transform:uppercase;letter-spacing:0.1em">Sendungsnummer</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#1A1614;font-family:monospace">${opts.trackingNumber}</p>
          <p style="margin:8px 0 0;font-size:11px;color:#7A6E65">Bestellnummer: #${opts.orderId.slice(-8).toUpperCase()}</p>
        </div>
        <p style="color:#7A6E65;font-size:13px">
          Tracking-Link: Bitte geben Sie Ihre Sendungsnummer auf der Webseite Ihres Paketdienstleisters (DHL: dhl.de oder DPD: dpd.de) ein.
        </p>
        <p style="color:#7A6E65;font-size:14px;margin-top:24px">
          Bei Fragen: <a href="mailto:${CONTACT_EMAIL}" style="color:#8B6914">${CONTACT_EMAIL}</a>
        </p>
        <p style="color:#7A6E65;font-size:12px">
          ${SHOP_NAME} · Stuttgart<br>
          ${VAT_NOTICE}
        </p>
      </div>
    `,
  });
}

export async function sendOrderConfirmation(opts: {
  customerEmail: string;
  customerName: string;
  orderTotal: number;
  orderItems: Array<{ name: string; price: number; quantity: number }>;
}) {
  const resend = getResend();
  const from = process.env.RESEND_FROM ?? "Hagi Teppiche <bestellungen@hagi-shop.de>";

  const itemsHtml = opts.orderItems
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0">${item.name}</td>
          <td style="padding:8px 0;text-align:right">${item.quantity}x</td>
          <td style="padding:8px 0;text-align:right">${(item.price / 100).toFixed(2)} €</td>
        </tr>`
    )
    .join("");

  await resend.emails.send({
    from,
    to: opts.customerEmail,
    subject: "Ihre Bestellung bei Hagi Teppiche — Bestätigung",
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1A1614">
        <h1 style="color:#8B6914;font-size:24px">Vielen Dank für Ihre Bestellung, ${opts.customerName}!</h1>
        <p>Wir haben Ihre Zahlung erhalten und bereiten Ihre Bestellung vor.</p>
        <table style="width:100%;border-top:1px solid #E2D9CC;margin-top:16px">
          ${itemsHtml}
          <tr style="border-top:1px solid #E2D9CC;font-weight:bold">
            <td colspan="2" style="padding:12px 0">Gesamtbetrag</td>
            <td style="padding:12px 0;text-align:right">${(opts.orderTotal / 100).toFixed(2)} €</td>
          </tr>
        </table>
        <p style="color:#7A6E65;font-size:14px;margin-top:24px">
          Bei Fragen: <a href="mailto:${CONTACT_EMAIL}" style="color:#8B6914">${CONTACT_EMAIL}</a>
        </p>
        <p style="color:#7A6E65;font-size:12px">
          ${SHOP_NAME} · Stuttgart<br>
          ${VAT_NOTICE}
        </p>
      </div>
    `,
  });
}
