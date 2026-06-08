import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY fehlt in den Umgebungsvariablen.");
    _resend = new Resend(key);
  }
  return _resend;
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
          Bei Fragen: <a href="mailto:kontakt@hagi-shop.de" style="color:#8B6914">kontakt@hagi-shop.de</a>
        </p>
        <p style="color:#7A6E65;font-size:12px">
          Hagi Teppiche · Stuttgart<br>
          Alle Preise inkl. 19% MwSt.
        </p>
      </div>
    `,
  });
}
