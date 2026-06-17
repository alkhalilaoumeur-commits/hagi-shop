import { Resend } from "resend";
import { render } from "@react-email/render";
import {
  OrderConfirmationEmail,
  ShippingNotificationEmail,
  DeliveryNotificationEmail,
  CancellationNotificationEmail,
  WithdrawalReceivedEmail,
  type OrderConfirmationProps,
  type ShippingNotificationProps,
  type DeliveryNotificationProps,
  type CancellationNotificationProps,
  type WithdrawalReceivedProps,
} from "./templates";
import { SHOP_NAME } from "./shared";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY_MISSING");
    _resend = new Resend(key);
  }
  return _resend;
}

function fromAddress(): string {
  return process.env.RESEND_FROM ?? `${SHOP_NAME} <bestellungen@hagi-shop.de>`;
}

/**
 * Wenn RESEND_API_KEY fehlt:
 *  - Dev: Mock-Mode (Log statt Send)
 *  - Production: Fail-Fast (Mail muss zuverlässig laufen)
 */
function isMockMode(): boolean {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY must be set in production. Refusing to send via mock-mode.",
      );
    }
    return true;
  }
  return false;
}

async function safeSend(
  to: string,
  subject: string,
  html: string,
  text: string,
  tag: string,
): Promise<{ id?: string; mocked: boolean }> {
  if (isMockMode()) {
    // PII-bewusstes Log: nur Domain, nicht Local-Part der Email
    const masked = to.replace(/^([^@]{1,3})[^@]*@/, "$1***@");
    console.log(`[email:mock] → ${masked} · "${subject}" · tag=${tag}`);
    return { mocked: true };
  }
  const resend = getResend();
  const res = await resend.emails.send({
    from: fromAddress(),
    to,
    subject,
    html,
    text,
    tags: [{ name: "type", value: tag }],
  });
  return { id: res.data?.id, mocked: false };
}

export async function sendOrderConfirmation(to: string, props: OrderConfirmationProps) {
  const subject = `Bestellung ${props.orderNumber} bestätigt — danke!`;
  const html = await render(OrderConfirmationEmail(props));
  const text = await render(OrderConfirmationEmail(props), { plainText: true });
  return safeSend(to, subject, html, text, "order.confirmation");
}

export async function sendShippingNotification(to: string, props: ShippingNotificationProps) {
  const subject = `Ihr Teppich ist unterwegs — Sendungsnummer ${props.trackingNumber}`;
  const html = await render(ShippingNotificationEmail(props));
  const text = await render(ShippingNotificationEmail(props), { plainText: true });
  return safeSend(to, subject, html, text, "order.shipped");
}

export async function sendDeliveryNotification(to: string, props: DeliveryNotificationProps) {
  const subject = `Bestellung ${props.orderNumber} ist angekommen`;
  const html = await render(DeliveryNotificationEmail(props));
  const text = await render(DeliveryNotificationEmail(props), { plainText: true });
  return safeSend(to, subject, html, text, "order.delivered");
}

export async function sendCancellationNotification(to: string, props: CancellationNotificationProps) {
  const subject = `Bestellung ${props.orderNumber} storniert`;
  const html = await render(CancellationNotificationEmail(props));
  const text = await render(CancellationNotificationEmail(props), { plainText: true });
  return safeSend(to, subject, html, text, "order.cancelled");
}

export async function sendWithdrawalReceived(to: string, props: WithdrawalReceivedProps) {
  const subject = `Widerruf ${props.orderNumber} eingegangen`;
  const html = await render(WithdrawalReceivedEmail(props));
  const text = await render(WithdrawalReceivedEmail(props), { plainText: true });
  return safeSend(to, subject, html, text, "order.withdrawal");
}

/**
 * Admin-internal Refund-Reminder (kein Customer-facing Mail).
 * Plain HTML — keine Template-Komponente nötig.
 */
export async function sendRefundReminderToAdmin(opts: {
  to: string;
  stage: "REMINDER" | "URGENT" | "OVERDUE";
  refunds: Array<{
    orderNumber: string;
    customerEmail: string;
    daysSinceWithdrawal: number;
    daysRemaining: number;
    totalCents: number;
    refundedCents: number;
    returnReceivedAt: Date | null;
    orderId: string;
  }>;
}) {
  const STAGE_LABEL = {
    REMINDER: "Reminder",
    URGENT: "DRINGEND",
    OVERDUE: "BGB-FRIST GERISSEN",
  };
  const STAGE_COLOR = {
    REMINDER: "#B89968",
    URGENT: "#A33B2A",
    OVERDUE: "#7E2A1D",
  };
  const subject = `[${STAGE_LABEL[opts.stage]}] ${opts.refunds.length} Refund(s) — BGB § 357 Frist`;
  const rows = opts.refunds
    .map((r) => {
      const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://hagi-shop.de"}/admin/bestellungen/${r.orderId}`;
      const open = ((r.totalCents - r.refundedCents) / 100).toFixed(2);
      const returnStatus = r.returnReceivedAt ? "✓ Ware retour" : "✗ Ware noch nicht da";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #E5DCC8"><a href="${url}" style="color:#A33B2A">${r.orderNumber}</a></td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5DCC8;font-family:monospace">${r.customerEmail}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5DCC8;text-align:right">${r.daysSinceWithdrawal}d</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5DCC8;text-align:right">${r.daysRemaining}d</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5DCC8;text-align:right">${open}€</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E5DCC8">${returnStatus}</td>
      </tr>`;
    })
    .join("");

  const html = `<div style="font-family:Georgia,serif;max-width:760px;margin:0 auto;color:#0F0A06">
    <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${STAGE_COLOR[opts.stage]};margin:0 0 8px">${STAGE_LABEL[opts.stage]}</p>
    <h1 style="font-size:24px;margin:0 0 12px">${opts.refunds.length} ausstehende Refund${opts.refunds.length === 1 ? "" : "s"}</h1>
    <p style="font-size:14px;color:#5A4A3A;line-height:1.6">BGB § 357 Abs. 1 verlangt Rückerstattung binnen 14 Tagen nach Widerrufseingang. Nach Frist-Ende drohen Verzugszinsen (§ 288 BGB, 5% über Basiszinssatz).</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;background:#FAFAF7;border:1px solid #E5DCC8">
      <thead>
        <tr style="background:#F0EAD8">
          <th style="padding:10px 12px;text-align:left;font-size:10px;letter-spacing:0.15em;text-transform:uppercase">Bestellung</th>
          <th style="padding:10px 12px;text-align:left;font-size:10px;letter-spacing:0.15em;text-transform:uppercase">E-Mail</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;letter-spacing:0.15em;text-transform:uppercase">Seit</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;letter-spacing:0.15em;text-transform:uppercase">Übrig</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;letter-spacing:0.15em;text-transform:uppercase">Offen</th>
          <th style="padding:10px 12px;text-align:left;font-size:10px;letter-spacing:0.15em;text-transform:uppercase">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:12px;color:#8A7866">Hagi Teppiche Admin-System · Generiert ${new Date().toLocaleString("de-DE")}</p>
  </div>`;
  const text = `${STAGE_LABEL[opts.stage]} — ${opts.refunds.length} Refund(s)\n\n` +
    opts.refunds
      .map((r) =>
        `${r.orderNumber} · ${r.customerEmail} · seit ${r.daysSinceWithdrawal}d · ${r.daysRemaining}d übrig · ${((r.totalCents - r.refundedCents) / 100).toFixed(2)}€ offen · ${r.returnReceivedAt ? "Ware retour" : "Ware noch nicht da"}`,
      )
      .join("\n");

  return safeSend(opts.to, subject, html, text, "admin.refund_reminder");
}
