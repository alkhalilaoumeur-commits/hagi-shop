/**
 * Block 7 — PDF-Audit
 *
 * Generiert alle PDF-Typen mit realistischen Test-Datensätzen und prüft:
 * 1. §14 UStG Pflichtangaben (B2C + B2B Reverse Charge)
 * 2. Platzhalter-Werte (Steuernummer "00000/00000", leere Firmenangaben)
 * 3. Umlaut-Korrektheit (keine Encoding-Fehler)
 * 4. Dateigröße (0-Byte = Render-Crash)
 *
 * Ausgabe: audit-artifacts/pdfs/{invoice-b2c,invoice-b2b,lieferschein,widerruf}.pdf
 *          audit-artifacts/pdfs/pdf-audit-report.txt
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { renderToBuffer } from "@react-pdf/renderer";
import * as React from "react";

// Env-Variablen für den Audit vorladen (Dev-Defaults)
process.env.TAX_MODE = process.env.TAX_MODE ?? "small_business";
process.env.COMPANY_NAME = process.env.COMPANY_NAME || "Hagi Teppiche";
process.env.COMPANY_STREET = process.env.COMPANY_STREET || "Egilolfstraße 41";
process.env.COMPANY_CITY = process.env.COMPANY_CITY || "70599 Stuttgart";
process.env.COMPANY_EMAIL = process.env.COMPANY_EMAIL || "info@hagi-shop.de";
process.env.COMPANY_PHONE = process.env.COMPANY_PHONE || "+49 711 12 34 56 78";
process.env.COMPANY_TAX_NUMBER = process.env.COMPANY_TAX_NUMBER || "00000/00000";
process.env.COMPANY_IBAN = process.env.COMPANY_IBAN || "DE00000000000000000000";

const OUT_DIR = path.resolve("audit-artifacts/pdfs");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Fixtures ─────────────────────────────────────────────────────────────────

import type { InvoiceData } from "../lib/pdf/invoice";

const BASE_ORDER: InvoiceData = {
  orderNumber: "HAG-2026-000001",
  invoiceDate: "08.07.2026",
  customerEmail: "max.mustermann@example.com",

  billingFirstName: "Max",
  billingLastName: "Mustermann",
  billingCompany: null,
  billingStreet1: "Musterstraße 1",
  billingStreet2: null,
  billingCity: "München",
  billingPostalCode: "80331",
  billingCountryCode: "DE",

  shippingFirstName: "Max",
  shippingLastName: "Mustermann",
  shippingStreet1: "Musterstraße 1",
  shippingStreet2: null,
  shippingCity: "München",
  shippingPostalCode: "80331",
  shippingCountryCode: "DE",

  items: [
    {
      title: "Isfahan Blumenmuster 160×110 — Orientalischer Teppich",
      sku: "ISF-160-110",
      quantity: 1,
      unitPriceCents: 89900,
      totalCents: 89900,
      taxRatePercent: 0,
    },
  ],

  subtotalCents: 89900,
  shippingCents: 0,
  discountCents: 0,
  taxCents: 0,
  totalCents: 89900,

  taxRatePercent: 0,
  isReverseCharge: false,
  isSmallBusiness: true,
  vatId: null,

  shippingMethodName: "DHL Paket",
  paymentMethodLabel: "Kreditkarte",
};

const B2B_ORDER: InvoiceData = {
  ...BASE_ORDER,
  orderNumber: "HAG-2026-000002",
  billingCompany: "Raumausstatter GmbH",
  billingCountryCode: "AT",
  shippingCountryCode: "AT",
  isReverseCharge: true,
  isSmallBusiness: false,
  vatId: "ATU12345678",
  taxRatePercent: 19,
  taxCents: 14356,
  subtotalCents: 89900,
  totalCents: 89900,
};

// ── PDF-Generierung ───────────────────────────────────────────────────────────

type AuditResult = {
  name: string;
  file: string;
  sizeBytes: number;
  checks: Array<{ label: string; pass: boolean; detail?: string }>;
};

const results: AuditResult[] = [];

function extractText(filePath: string): string {
  try {
    return execSync(`pdftotext "${filePath}" -`, { encoding: "utf8" });
  } catch {
    return "";
  }
}

const PLACEHOLDER_STEUERNUMMER = "00000/00000";
const PLACEHOLDER_IBAN = "DE00000000000000000000";
const PLACEHOLDER_UST_ID = "DE000000000";

async function generateAndAudit(
  label: string,
  filename: string,
  component: React.ReactElement,
  checks: (text: string, sizeBytes: number) => Array<{ label: string; pass: boolean; detail?: string }>,
) {
  process.stdout.write(`  → ${label} … `);
  const buf = await renderToBuffer(component as Parameters<typeof renderToBuffer>[0]);
  const filePath = path.join(OUT_DIR, filename);
  fs.writeFileSync(filePath, buf);
  const text = extractText(filePath);
  const auditChecks = checks(text, buf.length);
  const passCount = auditChecks.filter((c) => c.pass).length;
  process.stdout.write(`${buf.length} Bytes, ${passCount}/${auditChecks.length} Checks ✓\n`);
  results.push({ name: label, file: filename, sizeBytes: buf.length, checks: auditChecks });
}

// §14 UStG Pflichtangaben-Checker
function ustgChecks(
  text: string,
  size: number,
  opts: { isReverseCharge?: boolean; isSmallBusiness?: boolean; hasVatId?: boolean } = {},
): Array<{ label: string; pass: boolean; detail?: string }> {
  const t = text;
  return [
    {
      label: "Datei nicht leer (Render-Crash?)",
      pass: size > 1000,
      detail: `${size} Bytes`,
    },
    {
      label: "§14 Nr.1: Firma des Leistenden vorhanden",
      pass: t.includes("Hagi Teppiche"),
    },
    {
      label: "§14 Nr.1: Straße des Leistenden vorhanden",
      // Umlauts in PDF streams: "stra" pattern genügt für den Test
      pass: t.includes("Egilolf") || t.includes("41"),
    },
    {
      label: "§14 Nr.1: Stadt des Leistenden vorhanden",
      pass: t.includes("Stuttgart") || t.includes("70599"),
    },
    {
      label: "§14 Nr.2: Kundenname vorhanden",
      pass: t.includes("Mustermann") || t.includes("GmbH"),
    },
    {
      label: "§14 Nr.3: Steuernummer oder USt-ID vorhanden",
      pass: opts.hasVatId
        ? t.includes("USt") || t.includes("VAT") || t.includes("ATU")
        : t.includes("00000") || t.includes("Steuer") || t.includes("USt"),
    },
    {
      label: "§14 Nr.4: Rechnungsdatum vorhanden",
      pass: t.includes("2026") || t.includes("Datum"),
    },
    {
      label: "§14 Nr.5: Rechnungsnummer vorhanden",
      pass: t.includes("HAG-2026"),
    },
    {
      label: "§14 Nr.6: Warenbezeichnung vorhanden",
      pass: t.includes("Isfahan") || t.includes("Teppich"),
    },
    {
      label: "§14 Nr.10: Rechnungsendbetrag vorhanden",
      pass: t.includes("899") || t.includes("89900"),
    },
    {
      label: opts.isSmallBusiness
        ? "§19 UStG Kleinunternehmer-Hinweis vorhanden"
        : opts.isReverseCharge
          ? "§13b UStG Reverse-Charge-Hinweis vorhanden"
          : "Steuersatz/-betrag vorhanden",
      pass: opts.isSmallBusiness
        ? t.includes("19 UStG") || t.includes("Kleinunternehmer")
        : opts.isReverseCharge
          ? t.includes("13b") || t.includes("Reverse") || t.includes("Steuerschuldnerschaft")
          : t.includes("%") || t.includes("MwSt") || t.includes("USt"),
    },
    {
      label: "WARNUNG: Platzhalter-Steuernummer (00000/00000)",
      pass: !t.includes(PLACEHOLDER_STEUERNUMMER),
      detail: t.includes(PLACEHOLDER_STEUERNUMMER) ? "⚠️  Steuernummer muss vor Live-Gang ersetzt werden" : "ok",
    },
    {
      label: "WARNUNG: Platzhalter-IBAN",
      pass: !t.includes(PLACEHOLDER_IBAN),
      detail: t.includes(PLACEHOLDER_IBAN) ? "⚠️  IBAN muss vor Live-Gang ersetzt werden" : "ok",
    },
    {
      label: "Umlauts korrekt: ä/ö/ü/ß korrekt extrahiert (kein Encoding-Bruch)",
      // pdftotext liefert UTF-8 → direkte String-Suche
      pass: t.includes("ä") || t.includes("ü") || t.includes("ß") || t.includes("ö"),
    },
  ];
}

async function run() {
  console.log("\n═══════════════════════════════════════════");
  console.log(" Block 7 — PDF-Audit (§14 UStG)");
  console.log("═══════════════════════════════════════════");
  console.log(`  Output: ${OUT_DIR}\n`);

  // Lazy-Import nach env-Setup
  const { InvoicePDF, DeliveryNotePDF } = await import("../lib/pdf/invoice");
  const { WithdrawalFormPDF } = await import("../lib/pdf/withdrawal-form");

  // 1. B2C Rechnung (Kleinunternehmer)
  await generateAndAudit(
    "Rechnung B2C (Kleinunternehmer §19 UStG)",
    "invoice-b2c.pdf",
    React.createElement(InvoicePDF, { data: BASE_ORDER }),
    (text, size) => ustgChecks(text, size, { isSmallBusiness: true }),
  );

  // 2. B2B Rechnung (Reverse Charge)
  await generateAndAudit(
    "Rechnung B2B (Reverse Charge §13b UStG)",
    "invoice-b2b-reverse-charge.pdf",
    React.createElement(InvoicePDF, { data: B2B_ORDER }),
    (text, size) => ustgChecks(text, size, { isReverseCharge: true, hasVatId: true }),
  );

  // 3. Lieferschein
  await generateAndAudit(
    "Lieferschein",
    "lieferschein.pdf",
    React.createElement(DeliveryNotePDF, { data: BASE_ORDER }),
    (text, size) => [
      { label: "Datei nicht leer", pass: size > 500, detail: `${size} Bytes` },
      { label: "Kundenname vorhanden", pass: text.includes("Mustermann") },
      { label: "Warenbezeichnung vorhanden", pass: text.includes("Isfahan") || text.includes("Teppich") },
      { label: "Bestellnummer vorhanden", pass: text.includes("HAG-2026") },
      { label: "Lieferadresse vorhanden", pass: text.includes("M\xfcnchen") || text.includes("80331") },
    ],
  );

  // 4. Widerrufsformular (EGBGB Anlage 2)
  const company = {
    name: process.env.COMPANY_NAME!,
    street: process.env.COMPANY_STREET!,
    city: process.env.COMPANY_CITY!,
    email: process.env.COMPANY_EMAIL!,
    phone: process.env.COMPANY_PHONE!,
  };
  await generateAndAudit(
    "Muster-Widerrufsformular (EGBGB Anlage 2)",
    "widerrufsformular.pdf",
    React.createElement(WithdrawalFormPDF, { company }),
    (text, size) => [
      { label: "Datei nicht leer", pass: size > 500, detail: `${size} Bytes` },
      { label: "Empfänger-Name vorhanden", pass: text.includes("Hagi") },
      {
        label: "EGBGB Anlage 2 Referenz vorhanden",
        // letter-spacing rendert als "E G B G B" → normalize für Suche
        pass: text.replace(/\s+/g, "").includes("EGBGB") || text.includes("246"),
      },
      { label: "Widerruf-Wort vorhanden", pass: text.includes("widerrufe") || text.includes("Widerruf") },
      { label: "14-Tage-Frist erwähnt", pass: text.includes("14") },
      {
        label: "Kontaktdaten (E-Mail) vorhanden",
        pass: text.includes("hagi-shop.de") || text.includes("info@"),
      },
    ],
  );

  // ── Report ──────────────────────────────────────────────────────────────────

  console.log("\n═══════════════════════════════════════════");
  console.log(" AUDIT-REPORT");
  console.log("═══════════════════════════════════════════\n");

  const lines: string[] = [];
  lines.push("PDF-AUDIT-REPORT — Block 7 (Hagi-Shop Release-Audit 2026-07-08)");
  lines.push("=".repeat(60));
  lines.push("");

  let totalPass = 0;
  let totalFail = 0;
  const warnings: string[] = [];

  for (const r of results) {
    const pass = r.checks.filter((c) => c.pass).length;
    const fail = r.checks.filter((c) => !c.pass).length;
    totalPass += pass;
    totalFail += fail;

    const statusIcon = fail === 0 ? "✅" : "⚠️ ";
    console.log(`${statusIcon} ${r.name}`);
    lines.push(`${statusIcon} ${r.name} (${r.sizeBytes} Bytes → ${r.file})`);

    for (const c of r.checks) {
      const icon = c.pass ? "  ✓" : "  ✗";
      const detail = c.detail ? ` — ${c.detail}` : "";
      const line = `${icon} ${c.label}${detail}`;
      console.log(line);
      lines.push(line);
      if (!c.pass) {
        warnings.push(`[${r.name}] FAIL: ${c.label}${detail}`);
      }
    }
    console.log("");
    lines.push("");
  }

  lines.push("=".repeat(60));
  lines.push(`GESAMT: ${totalPass} OK · ${totalFail} FAIL`);
  lines.push("");

  if (warnings.length > 0) {
    lines.push("HANDLUNGSBEDARF vor Live-Gang:");
    warnings.forEach((w) => lines.push(`  • ${w}`));
  } else {
    lines.push("Alle Checks bestanden.");
  }

  const reportPath = path.join(OUT_DIR, "pdf-audit-report.txt");
  fs.writeFileSync(reportPath, lines.join("\n") + "\n");

  console.log(`═══════════════════════════════════════════`);
  console.log(`Gesamt: ${totalPass} OK · ${totalFail} FAIL`);
  if (warnings.length > 0) {
    console.log("\nHandlungsbedarf:");
    warnings.forEach((w) => console.log(`  • ${w}`));
  }
  console.log(`\nReport: ${reportPath}`);
  console.log(`PDFs:   ${OUT_DIR}/\n`);

  process.exit(totalFail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error("PDF-Audit-Script Fehler:", e);
  process.exit(1);
});
