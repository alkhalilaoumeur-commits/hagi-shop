import * as React from "react";
import { Page, Document, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const COLORS = {
  ink: "#0F0A06",
  inkMuted: "#5A4A3A",
  muted: "#8A7866",
  border: "#D9CDB8",
  brass: "#B89968",
  sienna: "#A33B2A",
  bg: "#FAFAF7",
  card: "#F0EAD8",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: COLORS.ink,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  logo: { fontSize: 22, fontWeight: 700, letterSpacing: 3, color: COLORS.ink },
  logoDot: { color: COLORS.sienna },
  eyebrow: { fontSize: 7, letterSpacing: 2, color: COLORS.brass, textTransform: "uppercase", marginBottom: 2 },
  meta: { textAlign: "right" },
  metaLabel: { fontSize: 7, letterSpacing: 1.5, color: COLORS.muted, textTransform: "uppercase" },
  metaValue: { fontSize: 11, color: COLORS.ink, marginBottom: 6 },
  h1: { fontSize: 22, fontWeight: 400, color: COLORS.ink, marginBottom: 16 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: COLORS.border, marginVertical: 14 },
  twoCol: { flexDirection: "row", gap: 24, marginBottom: 18 },
  col: { flex: 1 },
  colLabel: { fontSize: 7, letterSpacing: 1.5, color: COLORS.brass, textTransform: "uppercase", marginBottom: 4 },
  colBody: { fontSize: 10, color: COLORS.ink, lineHeight: 1.5 },
  table: { marginTop: 14, marginBottom: 14 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.3,
    borderBottomColor: COLORS.border,
  },
  th: { fontSize: 7, color: COLORS.muted, letterSpacing: 1, textTransform: "uppercase" },
  td: { fontSize: 10, color: COLORS.ink },
  colDesc: { flex: 3 },
  colQty: { flex: 0.6, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  totalsBox: { marginLeft: "auto", width: 260, marginTop: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalLabel: { fontSize: 10, color: COLORS.inkMuted },
  totalValue: { fontSize: 10, color: COLORS.ink },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    marginTop: 4,
  },
  grandTotalValue: { fontSize: 13, color: COLORS.ink, fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    fontSize: 7,
    color: COLORS.muted,
    lineHeight: 1.4,
  },
  note: { fontSize: 9, color: COLORS.inkMuted, marginTop: 14, padding: 10, backgroundColor: COLORS.card, borderRadius: 2 },
});

export interface InvoiceData {
  orderNumber: string;
  invoiceDate: string;
  customerEmail: string;

  billingFirstName: string;
  billingLastName: string;
  billingCompany?: string | null;
  billingStreet1: string;
  billingStreet2?: string | null;
  billingCity: string;
  billingPostalCode: string;
  billingCountryCode: string;

  shippingFirstName: string;
  shippingLastName: string;
  shippingStreet1: string;
  shippingStreet2?: string | null;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountryCode: string;

  items: Array<{
    title: string;
    sku?: string | null;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    taxRatePercent: number;
  }>;

  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;

  taxRatePercent: number;
  isReverseCharge: boolean;
  isSmallBusiness: boolean;
  vatId?: string | null;

  shippingMethodName?: string | null;
  paymentMethodLabel?: string;
}

interface CompanyData {
  name: string;
  street: string;
  city: string;
  vatId?: string | null;
  taxNumber?: string | null;
  email: string;
  phone: string;
  iban?: string;
}

const HAGI_COMPANY: CompanyData = {
  name: process.env.COMPANY_NAME ?? "Hagi Teppiche",
  street: process.env.COMPANY_STREET ?? "Egilolfstraße 41",
  city: process.env.COMPANY_CITY ?? "70599 Stuttgart",
  vatId: process.env.COMPANY_VAT_ID,
  taxNumber: process.env.COMPANY_TAX_NUMBER,
  email: process.env.COMPANY_EMAIL ?? "info@hagi-teppiche.de",
  phone: process.env.COMPANY_PHONE ?? "+49 711 12 34 56 78",
  iban: process.env.COMPANY_IBAN,
};

function formatCents(c: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);
}

export function InvoicePDF({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Stuttgarter Direktimporteur seit 2003</Text>
            <Text style={styles.logo}>
              HAGI<Text style={styles.logoDot}>.</Text>
            </Text>
            <Text style={[styles.colBody, { marginTop: 6 }]}>
              {HAGI_COMPANY.name}
              {"\n"}
              {HAGI_COMPANY.street}
              {"\n"}
              {HAGI_COMPANY.city}
            </Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>Rechnungsnummer</Text>
            <Text style={styles.metaValue}>{data.orderNumber}</Text>
            <Text style={styles.metaLabel}>Datum</Text>
            <Text style={styles.metaValue}>{data.invoiceDate}</Text>
            {HAGI_COMPANY.vatId && (
              <>
                <Text style={styles.metaLabel}>USt-IdNr.</Text>
                <Text style={styles.metaValue}>{HAGI_COMPANY.vatId}</Text>
              </>
            )}
            {!HAGI_COMPANY.vatId && HAGI_COMPANY.taxNumber && (
              <>
                <Text style={styles.metaLabel}>Steuernummer</Text>
                <Text style={styles.metaValue}>{HAGI_COMPANY.taxNumber}</Text>
              </>
            )}
          </View>
        </View>

        <Text style={styles.h1}>Rechnung</Text>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Rechnungsadresse</Text>
            <Text style={styles.colBody}>
              {data.billingCompany && (
                <>
                  {data.billingCompany}
                  {"\n"}
                </>
              )}
              {data.billingFirstName} {data.billingLastName}
              {"\n"}
              {data.billingStreet1}
              {data.billingStreet2 ? `\n${data.billingStreet2}` : ""}
              {"\n"}
              {data.billingPostalCode} {data.billingCity}
              {"\n"}
              {data.billingCountryCode}
              {data.vatId && (
                <>
                  {"\n"}USt-IdNr.: {data.vatId}
                </>
              )}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Lieferadresse</Text>
            <Text style={styles.colBody}>
              {data.shippingFirstName} {data.shippingLastName}
              {"\n"}
              {data.shippingStreet1}
              {data.shippingStreet2 ? `\n${data.shippingStreet2}` : ""}
              {"\n"}
              {data.shippingPostalCode} {data.shippingCity}
              {"\n"}
              {data.shippingCountryCode}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Bezeichnung</Text>
            <Text style={[styles.th, styles.colQty]}>Menge</Text>
            <Text style={[styles.th, styles.colPrice]}>Einzelpreis</Text>
            <Text style={[styles.th, styles.colTotal]}>Gesamt</Text>
          </View>
          {data.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.td}>{item.title}</Text>
                {item.sku && (
                  <Text style={[styles.td, { fontSize: 8, color: COLORS.muted, marginTop: 2 }]}>SKU: {item.sku}</Text>
                )}
              </View>
              <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.td, styles.colPrice]}>{formatCents(item.unitPriceCents)}</Text>
              <Text style={[styles.td, styles.colTotal]}>{formatCents(item.totalCents)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Zwischensumme (netto)</Text>
            <Text style={styles.totalValue}>{formatCents(data.subtotalCents - data.taxCents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Versand{data.shippingMethodName ? ` (${data.shippingMethodName})` : ""}
            </Text>
            <Text style={styles.totalValue}>
              {data.shippingCents === 0 ? "Gratis" : formatCents(data.shippingCents)}
            </Text>
          </View>
          {data.discountCents > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Rabatt</Text>
              <Text style={[styles.totalValue, { color: COLORS.sienna }]}>-{formatCents(data.discountCents)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {data.isSmallBusiness || data.isReverseCharge
                ? "USt"
                : `Enthaltene USt (${data.taxRatePercent}%)`}
            </Text>
            <Text style={styles.totalValue}>
              {data.isSmallBusiness || data.isReverseCharge ? "0,00 €" : formatCents(data.taxCents)}
            </Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.totalLabel}>Rechnungsbetrag</Text>
            <Text style={styles.grandTotalValue}>{formatCents(data.totalCents)}</Text>
          </View>
        </View>

        {data.isSmallBusiness && (
          <Text style={styles.note}>
            Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen (Kleinunternehmer-Regelung).
          </Text>
        )}
        {data.isReverseCharge && (
          <Text style={styles.note}>
            Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge nach § 13b UStG). Keine Umsatzsteuer
            ausgewiesen, da innergemeinschaftliche Lieferung an Unternehmen mit gültiger USt-IdNr.
          </Text>
        )}

        <View style={styles.footer}>
          <Text>
            {HAGI_COMPANY.name} · {HAGI_COMPANY.street}, {HAGI_COMPANY.city} · {HAGI_COMPANY.phone} ·{" "}
            {HAGI_COMPANY.email}
            {HAGI_COMPANY.vatId ? ` · USt-IdNr.: ${HAGI_COMPANY.vatId}` : ""}
            {HAGI_COMPANY.iban ? `\nBankverbindung: ${HAGI_COMPANY.iban}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function DeliveryNotePDF({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Stuttgarter Direktimporteur seit 2003</Text>
            <Text style={styles.logo}>
              HAGI<Text style={styles.logoDot}>.</Text>
            </Text>
            <Text style={[styles.colBody, { marginTop: 6 }]}>
              {HAGI_COMPANY.name}
              {"\n"}
              {HAGI_COMPANY.street}
              {"\n"}
              {HAGI_COMPANY.city}
            </Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>Lieferschein zu</Text>
            <Text style={styles.metaValue}>{data.orderNumber}</Text>
            <Text style={styles.metaLabel}>Datum</Text>
            <Text style={styles.metaValue}>{data.invoiceDate}</Text>
          </View>
        </View>

        <Text style={styles.h1}>Lieferschein</Text>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Lieferadresse</Text>
            <Text style={styles.colBody}>
              {data.shippingFirstName} {data.shippingLastName}
              {"\n"}
              {data.shippingStreet1}
              {"\n"}
              {data.shippingPostalCode} {data.shippingCity}
              {"\n"}
              {data.shippingCountryCode}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.colLabel}>Versandart</Text>
            <Text style={styles.colBody}>{data.shippingMethodName ?? "Versand"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colDesc]}>Stück</Text>
            <Text style={[styles.th, styles.colQty]}>Menge</Text>
          </View>
          {data.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.td}>{item.title}</Text>
                {item.sku && (
                  <Text style={[styles.td, { fontSize: 8, color: COLORS.muted, marginTop: 2 }]}>SKU: {item.sku}</Text>
                )}
              </View>
              <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.note, { marginTop: 30 }]}>
          Bitte prüfen Sie den Teppich bei Erhalt auf sichtbare Beschädigungen. Bei Schäden bitte den Empfang
          mit Vermerk auf dem Lieferschein bestätigen und uns innerhalb von 24 Stunden informieren.
        </Text>
      </Page>
    </Document>
  );
}
