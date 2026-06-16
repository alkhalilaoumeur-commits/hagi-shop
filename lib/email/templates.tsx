import * as React from "react";
import { Section } from "@react-email/components";
import {
  EmailFrame,
  Eyebrow,
  Heading,
  Body1,
  CTA,
  Divider,
  ItemList,
  SummaryTable,
  formatCents,
  APP_URL,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  type OrderItemRow,
  COLORS,
} from "./shared";

export interface OrderConfirmationProps {
  customerFirstName: string;
  orderNumber: string;
  publicToken: string;
  items: OrderItemRow[];
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  shippingMethodName: string;
  estimatedDeliveryRange: string;
  isPickup: boolean;
}

export function OrderConfirmationEmail(props: OrderConfirmationProps) {
  return (
    <EmailFrame preview={`Bestellung ${props.orderNumber} bestätigt — danke!`}>
      <Section style={{ padding: "32px 40px 16px" }}>
        <Eyebrow>Bestellung bestätigt</Eyebrow>
        <Heading>Danke, {props.customerFirstName}.</Heading>
        <Body1>
          Ihre Bestellung <strong style={{ color: COLORS.ink, fontFamily: "monospace" }}>{props.orderNumber}</strong>{" "}
          ist bei uns eingegangen und die Zahlung bestätigt. Hagi prüft den Teppich persönlich vor Versand.
        </Body1>
      </Section>

      <Section style={{ padding: "0 40px" }}>
        <Eyebrow>Ihre Stücke</Eyebrow>
        <ItemList items={props.items} />
        <Divider />
        <SummaryTable
          rows={[
            { label: "Zwischensumme", value: formatCents(props.subtotalCents) },
            {
              label: "Versand · " + props.shippingMethodName,
              value: props.shippingCents === 0 ? "Gratis" : formatCents(props.shippingCents),
            },
            ...(props.discountCents > 0
              ? [{ label: "Rabatt", value: `-${formatCents(props.discountCents)}` }]
              : []),
            { label: "Gesamt", value: formatCents(props.totalCents), accent: true },
          ]}
        />
        <Divider />
      </Section>

      <Section style={{ padding: "0 40px 16px" }}>
        <Eyebrow>Voraussichtliche Lieferung</Eyebrow>
        <Body1>
          {props.isPickup
            ? "Wir melden uns sobald Ihr Teppich im Showroom abholbereit ist."
            : `${props.estimatedDeliveryRange} (Werktage). Sie erhalten eine Tracking-Mail, sobald der Teppich auf dem Weg ist.`}
        </Body1>
        <CTA href={`${APP_URL}/bestellung/status/${props.publicToken}`} label="Status verfolgen" />
      </Section>

      <Section style={{ padding: "0 40px 32px" }}>
        <Eyebrow>Sie haben 31 Tage Probestellung</Eyebrow>
        <Body1>
          Sollte der Teppich nicht passen — kostenlose Rücksendung, keine Diskussion. Schreiben Sie uns an{" "}
          {CONTACT_EMAIL} oder rufen Sie unter {CONTACT_PHONE} an.
        </Body1>
      </Section>
    </EmailFrame>
  );
}

export interface ShippingNotificationProps {
  customerFirstName: string;
  orderNumber: string;
  publicToken: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  carrier: string;
  estimatedDeliveryRange: string;
}

export function ShippingNotificationEmail(props: ShippingNotificationProps) {
  return (
    <EmailFrame preview={`Bestellung ${props.orderNumber} ist unterwegs`}>
      <Section style={{ padding: "32px 40px 16px" }}>
        <Eyebrow>Versandbestätigung</Eyebrow>
        <Heading>Ihr Teppich ist unterwegs, {props.customerFirstName}.</Heading>
        <Body1>
          Wir haben Ihre Bestellung <strong style={{ color: COLORS.ink, fontFamily: "monospace" }}>{props.orderNumber}</strong>{" "}
          heute mit {props.carrier} verschickt. Voraussichtlich bei Ihnen in {props.estimatedDeliveryRange} Werktagen.
        </Body1>
      </Section>

      <Section style={{ padding: "0 40px" }}>
        <Eyebrow>Sendungsnummer</Eyebrow>
        <table cellPadding={0} cellSpacing={0} style={{ width: "100%", margin: "0 0 24px" }}>
          <tbody>
            <tr>
              <td
                style={{
                  padding: "16px",
                  backgroundColor: COLORS.sand,
                  border: `1px solid ${COLORS.border}`,
                  fontFamily: "monospace",
                  fontSize: "20px",
                  color: COLORS.ink,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}
              >
                {props.trackingNumber}
              </td>
            </tr>
          </tbody>
        </table>
        {props.trackingUrl ? (
          <CTA href={props.trackingUrl} label="Direkt verfolgen" />
        ) : (
          <Body1>
            Tracking-Link: Bitte geben Sie diese Sendungsnummer auf der Webseite von {props.carrier} ein.
          </Body1>
        )}
        <Divider />
        <Body1>
          Status jederzeit hier:{" "}
          <a
            href={`${APP_URL}/bestellung/status/${props.publicToken}`}
            style={{ color: COLORS.sienna, textDecoration: "underline" }}
          >
            Bestellung verfolgen
          </a>
        </Body1>
      </Section>
    </EmailFrame>
  );
}

export interface DeliveryNotificationProps {
  customerFirstName: string;
  orderNumber: string;
  publicToken: string;
}

export function DeliveryNotificationEmail(props: DeliveryNotificationProps) {
  return (
    <EmailFrame preview={`Bestellung ${props.orderNumber} zugestellt`}>
      <Section style={{ padding: "32px 40px 16px" }}>
        <Eyebrow>Zugestellt</Eyebrow>
        <Heading>Ihr Teppich ist angekommen, {props.customerFirstName}.</Heading>
        <Body1>
          Bestellung <strong style={{ color: COLORS.ink, fontFamily: "monospace" }}>{props.orderNumber}</strong>{" "}
          wurde laut Spedition heute zugestellt. Hoffentlich passt er zu Ihrem Raum.
        </Body1>
      </Section>

      <Section style={{ padding: "0 40px 16px" }}>
        <Eyebrow>So legen Sie ihn richtig</Eyebrow>
        <Body1>
          Wenn der Teppich Falten wirft, lassen Sie ihn 24-48 Stunden ausgerollt liegen. Er pendelt sich ein.
          Bei Fragen zur Pflege:{" "}
          <a href={`${APP_URL}/pflege`} style={{ color: COLORS.sienna, textDecoration: "underline" }}>
            Pflege-Ratgeber
          </a>
          .
        </Body1>
      </Section>

      <Section style={{ padding: "0 40px 32px" }}>
        <Eyebrow>31 Tage Probezeit beginnt jetzt</Eyebrow>
        <Body1>
          Lassen Sie sich Zeit. Wenn er nicht passt — Rücksendung jederzeit kostenlos möglich.
        </Body1>
        <CTA href={`${APP_URL}/bestellung/status/${props.publicToken}`} label="Rücksendung anmelden" />
      </Section>
    </EmailFrame>
  );
}

export interface CancellationNotificationProps {
  customerFirstName: string;
  orderNumber: string;
  reason: string;
  refundCents?: number;
}

export function CancellationNotificationEmail(props: CancellationNotificationProps) {
  return (
    <EmailFrame preview={`Bestellung ${props.orderNumber} storniert`}>
      <Section style={{ padding: "32px 40px 16px" }}>
        <Eyebrow>Stornierung bestätigt</Eyebrow>
        <Heading>Stornierung erledigt, {props.customerFirstName}.</Heading>
        <Body1>
          Ihre Bestellung <strong style={{ color: COLORS.ink, fontFamily: "monospace" }}>{props.orderNumber}</strong>{" "}
          wurde storniert. Grund: {props.reason}.
        </Body1>
        {props.refundCents && props.refundCents > 0 ? (
          <Body1>
            Erstattung über <strong>{formatCents(props.refundCents)}</strong> wurde veranlasst — Sie sehen sie
            innerhalb von 5-10 Werktagen auf Ihrer ursprünglichen Zahlungsmethode.
          </Body1>
        ) : null}
      </Section>

      <Section style={{ padding: "0 40px 32px" }}>
        <Body1>
          Bei Fragen melden Sie sich gern direkt unter {CONTACT_EMAIL} oder {CONTACT_PHONE}.
        </Body1>
        <CTA href={`${APP_URL}/produkte`} label="Andere Stücke entdecken" />
      </Section>
    </EmailFrame>
  );
}

export interface WithdrawalReceivedProps {
  customerFirstName: string;
  orderNumber: string;
  publicToken: string;
}

export function WithdrawalReceivedEmail(props: WithdrawalReceivedProps) {
  return (
    <EmailFrame preview={`Widerruf ${props.orderNumber} erhalten`}>
      <Section style={{ padding: "32px 40px 16px" }}>
        <Eyebrow>Widerruf eingegangen</Eyebrow>
        <Heading>Wir kümmern uns, {props.customerFirstName}.</Heading>
        <Body1>
          Ihr Widerruf zur Bestellung{" "}
          <strong style={{ color: COLORS.ink, fontFamily: "monospace" }}>{props.orderNumber}</strong> ist bei uns
          eingegangen. Innerhalb von 24 Stunden melden wir uns mit den Rücksendung-Details.
        </Body1>
      </Section>

      <Section style={{ padding: "0 40px 16px" }}>
        <Eyebrow>So geht es weiter</Eyebrow>
        <Body1>
          1. Wir senden Ihnen ein vorfrankiertes Rücksende-Etikett (DHL) oder vereinbaren eine Spedition.
          <br />
          2. Sie verpacken den Teppich möglichst wieder im Original-Karton oder gerollt.
          <br />
          3. Nach Eingang prüfen wir das Stück, dann wird die Erstattung innerhalb von 14 Tagen ausgezahlt.
        </Body1>
        <CTA href={`${APP_URL}/bestellung/status/${props.publicToken}`} label="Status einsehen" />
      </Section>
    </EmailFrame>
  );
}
