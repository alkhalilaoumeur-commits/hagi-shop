import * as React from "react";
import { Page, Document, Text, View, StyleSheet } from "@react-pdf/renderer";

/**
 * Muster-Widerrufsformular nach EGBGB Anlage 2 zu Art. 246a § 1 Abs. 2 S. 1 Nr. 1.
 *
 * Text 1:1 aus der gesetzlichen Vorlage (BGB-Anhang).
 * Hagi-spezifisch sind nur Empfänger-Daten + Layout.
 *
 * Static PDF — wird über die API-Route /widerruf-formular gerendert.
 */

const COLORS = {
  ink: "#0F0A06",
  inkMuted: "#5A4A3A",
  muted: "#8A7866",
  border: "#D9CDB8",
  brass: "#B89968",
  sienna: "#A33B2A",
};

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10.5,
    color: COLORS.ink,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    lineHeight: 1.5,
  },
  header: { marginBottom: 28, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 16 },
  logo: { fontSize: 22, fontWeight: 700, letterSpacing: 3, color: COLORS.ink },
  logoDot: { color: COLORS.sienna },
  eyebrow: { fontSize: 7, letterSpacing: 2, color: COLORS.brass, textTransform: "uppercase", marginBottom: 6 },
  h1: { fontSize: 18, fontWeight: 400, color: COLORS.ink, marginBottom: 8 },
  subtitle: { fontSize: 9, color: COLORS.muted, marginBottom: 20 },

  recipient: { marginBottom: 24, padding: 14, backgroundColor: "#FAFAF7", border: `1px solid ${COLORS.border}` },
  recipientLabel: { fontSize: 7, letterSpacing: 1.5, color: COLORS.brass, textTransform: "uppercase", marginBottom: 4 },
  recipientLine: { fontSize: 11, color: COLORS.ink, marginBottom: 2 },

  intro: { marginBottom: 16, fontSize: 10.5 },
  bold: { fontWeight: 700 },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 10, color: COLORS.ink, marginBottom: 6 },
  fieldLine: { borderBottom: `1px solid ${COLORS.muted}`, height: 16, marginBottom: 4 },
  fieldHint: { fontSize: 8, color: COLORS.muted, fontStyle: "italic" },

  signature: { marginTop: 28, flexDirection: "row", gap: 20 },
  signatureCol: { flex: 1 },
  signatureLine: { borderBottom: `1px solid ${COLORS.muted}`, height: 18, marginBottom: 4 },
  signatureLabel: { fontSize: 8, color: COLORS.muted },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 50,
    right: 50,
    fontSize: 7.5,
    color: COLORS.muted,
    textAlign: "center",
    borderTop: `1px solid ${COLORS.border}`,
    paddingTop: 10,
  },

  legalNote: {
    marginTop: 28,
    padding: 12,
    backgroundColor: "#F0EAD8",
    border: `1px solid ${COLORS.border}`,
    fontSize: 8.5,
    color: COLORS.inkMuted,
  },
  legalNoteTitle: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: COLORS.brass,
    textTransform: "uppercase",
    marginBottom: 4,
  },
});

interface CompanyData {
  name: string;
  street: string;
  city: string;
  email: string;
  phone: string;
}

export function WithdrawalFormPDF({ company }: { company: CompanyData }) {
  return (
    <Document
      title="Muster-Widerrufsformular — Hagi Teppiche"
      author={company.name}
      subject="Widerrufsformular nach EGBGB Anlage 2"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            HAGI<Text style={styles.logoDot}>.</Text>
          </Text>
          <Text style={styles.eyebrow}>Stuttgarter Direktimporteur seit 2003</Text>
        </View>

        <Text style={styles.eyebrow}>EGBGB Anlage 2 · Art. 246a § 1 Abs. 2 S. 1 Nr. 1</Text>
        <Text style={styles.h1}>Muster-Widerrufsformular</Text>
        <Text style={styles.subtitle}>
          Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.
        </Text>

        <View style={styles.recipient}>
          <Text style={styles.recipientLabel}>An</Text>
          <Text style={styles.recipientLine}>{company.name}</Text>
          <Text style={styles.recipientLine}>{company.street}</Text>
          <Text style={styles.recipientLine}>{company.city}</Text>
          <Text style={[styles.recipientLine, { marginTop: 4 }]}>E-Mail: {company.email}</Text>
          <Text style={styles.recipientLine}>Telefon: {company.phone}</Text>
        </View>

        <Text style={styles.intro}>
          Hiermit widerrufe(n) ich/wir (<Text style={styles.bold}>*</Text>) den von mir/uns (
          <Text style={styles.bold}>*</Text>) abgeschlossenen Vertrag über den Kauf der folgenden Waren (
          <Text style={styles.bold}>*</Text>) / die Erbringung der folgenden Dienstleistung (
          <Text style={styles.bold}>*</Text>):
        </Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Bestellte Waren / Bestellnummer</Text>
          <View style={styles.fieldLine} />
          <View style={styles.fieldLine} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Bestellt am (*) / erhalten am (*)</Text>
          <View style={styles.fieldLine} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Name des/der Verbraucher(s)</Text>
          <View style={styles.fieldLine} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Anschrift des/der Verbraucher(s)</Text>
          <View style={styles.fieldLine} />
          <View style={styles.fieldLine} />
        </View>

        <View style={styles.signature}>
          <View style={styles.signatureCol}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Unterschrift (nur bei Mitteilung auf Papier)</Text>
          </View>
          <View style={styles.signatureCol}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Datum</Text>
          </View>
        </View>

        <View style={styles.legalNote}>
          <Text style={styles.legalNoteTitle}>Hinweis</Text>
          <Text>
            (*) Unzutreffendes streichen. Die Verwendung dieses Formulars ist nicht zwingend — Sie können Ihren Widerruf
            auch formlos per E-Mail, Brief oder über das Online-Formular auf unserer Website erklären. Die
            14-Tage-Widerrufsfrist beginnt mit dem Tag, an dem Sie oder ein von Ihnen benannter Dritter die Ware in
            Besitz genommen haben.
          </Text>
        </View>

        <Text style={styles.footer}>
          {company.name} · {company.street} · {company.city} · {company.email} · {company.phone}
        </Text>
      </Page>
    </Document>
  );
}
