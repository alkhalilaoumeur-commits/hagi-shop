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
