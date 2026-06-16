import * as React from "react";
import {
  Body,
  Container,
  Hr,
  Html,
  Img,
  Section,
  Tailwind,
  Text,
  Head,
  Preview,
} from "@react-email/components";

export const COLORS = {
  bg: "#FAFAF7",
  card: "#FFFFFF",
  ink: "#0F0A06",
  inkMuted: "#5A4A3A",
  muted: "#8A7866",
  border: "#E5DCC8",
  sand: "#F0EAD8",
  sienna: "#A33B2A",
  brass: "#B89968",
};

import { APP_URL as CONFIG_APP_URL } from "@/lib/config";

export const APP_URL = CONFIG_APP_URL;
export const SHOP_NAME = "Hagi Teppiche";
export const CONTACT_EMAIL = process.env.COMPANY_EMAIL ?? "info@hagi-shop.de";
export const CONTACT_PHONE = "+49 711 12 34 56 78";
export const SHOWROOM_ADDRESS = "Egilolfstraße 41, 70599 Stuttgart";

interface FrameProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailFrame({ preview, children }: FrameProps) {
  return (
    <Html lang="de">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body
          style={{
            backgroundColor: COLORS.bg,
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: COLORS.ink,
            margin: 0,
            padding: "32px 0",
          }}
        >
          <Container
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              backgroundColor: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Section style={{ padding: "32px 40px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <Text
                style={{
                  fontSize: "24px",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  color: COLORS.ink,
                  margin: 0,
                }}
              >
                HAGI<span style={{ color: COLORS.sienna }}>.</span>
              </Text>
              <Text
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: COLORS.brass,
                  margin: "4px 0 0",
                }}
              >
                Stuttgarter Direktimporteur seit 2003
              </Text>
            </Section>

            {children}

            <Section style={{ padding: "32px 40px", backgroundColor: COLORS.sand }}>
              <Text
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: COLORS.brass,
                  margin: "0 0 8px",
                }}
              >
                ✦ Kontakt
              </Text>
              <Text style={{ fontSize: "13px", color: COLORS.inkMuted, margin: 0, lineHeight: 1.6 }}>
                {SHOP_NAME} · {SHOWROOM_ADDRESS}
                <br />
                {CONTACT_PHONE} · {CONTACT_EMAIL}
              </Text>
              <Text style={{ fontSize: "10px", color: COLORS.muted, margin: "16px 0 0" }}>
                Sie haben diese E-Mail erhalten, weil Sie eine Bestellung bei {SHOP_NAME} aufgegeben haben.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: "10px",
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        color: COLORS.brass,
        margin: "0 0 12px",
      }}
    >
      ✦ {children}
    </Text>
  );
}

export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: "32px",
        fontWeight: 400,
        lineHeight: 1.1,
        color: COLORS.ink,
        margin: "0 0 16px",
      }}
    >
      {children}
    </Text>
  );
}

export function Body1({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: "15px", lineHeight: 1.65, color: COLORS.inkMuted, margin: "0 0 16px" }}>
      {children}
    </Text>
  );
}

export function CTA({ href, label }: { href: string; label: string }) {
  return (
    <Section style={{ margin: "24px 0" }}>
      <a
        href={href}
        style={{
          display: "inline-block",
          backgroundColor: COLORS.sienna,
          color: "#FAFAF7",
          padding: "14px 28px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          textDecoration: "none",
        }}
      >
        {label} →
      </a>
    </Section>
  );
}

export function Divider() {
  return <Hr style={{ border: 0, borderTop: `1px solid ${COLORS.border}`, margin: "24px 0" }} />;
}

export interface OrderItemRow {
  title: string;
  sku?: string | null;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  imageUrl?: string | null;
}

export function ItemList({ items }: { items: OrderItemRow[] }) {
  return (
    <Section style={{ margin: "16px 0" }}>
      {items.map((item, idx) => (
        <table key={idx} cellPadding={0} cellSpacing={0} style={{ width: "100%", marginBottom: "12px" }}>
          <tbody>
            <tr>
              {item.imageUrl && (
                <td style={{ width: "70px", paddingRight: "16px", verticalAlign: "top" }}>
                  <Img src={item.imageUrl} alt={item.title} width="64" height="80" style={{ objectFit: "cover", border: `1px solid ${COLORS.border}` }} />
                </td>
              )}
              <td style={{ verticalAlign: "top" }}>
                <Text style={{ fontSize: "14px", color: COLORS.ink, margin: 0, fontWeight: 500 }}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: "11px", color: COLORS.muted, margin: "4px 0 0", fontFamily: "monospace" }}>
                  {item.quantity} × {formatCents(item.unitPriceCents)}
                  {item.sku ? ` · ${item.sku}` : ""}
                </Text>
              </td>
              <td style={{ verticalAlign: "top", textAlign: "right", fontFamily: "monospace", fontSize: "14px", color: COLORS.ink }}>
                {formatCents(item.totalCents)}
              </td>
            </tr>
          </tbody>
        </table>
      ))}
    </Section>
  );
}

export function SummaryTable({ rows }: { rows: Array<{ label: string; value: string; accent?: boolean }> }) {
  return (
    <table cellPadding={0} cellSpacing={0} style={{ width: "100%", marginTop: "16px" }}>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>
            <td style={{ padding: "6px 0", color: COLORS.inkMuted, fontSize: "13px" }}>{row.label}</td>
            <td
              style={{
                padding: "6px 0",
                textAlign: "right",
                color: row.accent ? COLORS.sienna : COLORS.ink,
                fontSize: row.accent ? "16px" : "13px",
                fontFamily: "monospace",
                fontWeight: row.accent ? 600 : 400,
              }}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function formatCents(cents: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
