import prisma from "@/lib/prisma";

/**
 * DATEV-kompatibler CSV-Export für Steuerberater.
 * Format: Semikolon-getrennt, Quotes um Strings mit Komma, CRLF Zeilenende.
 * Spalten DATEV-Std: Datum, Belegnr, Buchungstext, Soll, Haben, USt%, Betrag-Brutto, Betrag-Netto, USt-Betrag.
 *
 * Wir liefern eine DATEV-orientierte Form, der Steuerberater muss noch
 * die internen Kontonummern setzen.
 */

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // CSV-Formula-Injection-Schutz (CWE-1236):
  // Wenn Zelle mit =, +, -, @ oder Tab/CR beginnt → Apostroph davor.
  // So interpretiert Excel/LibreOffice die Zelle als Text, nicht als Formel.
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  if (/[;"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export async function exportOrdersCSV(params: {
  from: Date;
  to: Date;
  onlyPaid?: boolean;
}): Promise<string> {
  const orders = await prisma.order.findMany({
    where: {
      ...(params.onlyPaid !== false ? { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } } : {}),
      paidAt: { gte: params.from, lte: params.to },
    },
    orderBy: { paidAt: "asc" },
    select: {
      orderNumber: true,
      paidAt: true,
      createdAt: true,
      customerEmail: true,
      billingFirstName: true,
      billingLastName: true,
      billingCompany: true,
      billingCity: true,
      billingCountryCode: true,
      subtotalCents: true,
      shippingCents: true,
      discountCents: true,
      taxCents: true,
      totalCents: true,
      refundedCents: true,
      taxRatePercent: true,
      isB2B: true,
      isReverseCharge: true,
      vatIdSnapshot: true,
      paymentMethodType: true,
      orderStatus: true,
      paymentStatus: true,
    },
  });

  const header = [
    "Belegdatum",
    "Belegnummer",
    "Kunde",
    "Firma",
    "Stadt",
    "Land",
    "USt-IdNr",
    "B2B",
    "Reverse-Charge",
    "Netto",
    "Versand",
    "Rabatt",
    "USt-Satz",
    "USt-Betrag",
    "Brutto-Gesamt",
    "Refund",
    "Zahlungsart",
    "Status",
  ].join(";");

  const rows = orders.map((o) => {
    const date = o.paidAt ?? o.createdAt;
    const taxRate = typeof o.taxRatePercent === "object" && o.taxRatePercent !== null
      ? parseFloat(o.taxRatePercent.toString())
      : Number(o.taxRatePercent ?? 0);
    return [
      csvEscape(formatDate(date)),
      csvEscape(o.orderNumber),
      csvEscape(`${o.billingFirstName} ${o.billingLastName} <${o.customerEmail}>`),
      csvEscape(o.billingCompany ?? ""),
      csvEscape(o.billingCity),
      csvEscape(o.billingCountryCode),
      csvEscape(o.vatIdSnapshot ?? ""),
      csvEscape(o.isB2B ? "ja" : "nein"),
      csvEscape(o.isReverseCharge ? "ja" : "nein"),
      csvEscape(formatAmount(o.subtotalCents - o.taxCents)),
      csvEscape(formatAmount(o.shippingCents)),
      csvEscape(formatAmount(o.discountCents)),
      csvEscape(`${taxRate.toFixed(2).replace(".", ",")}%`),
      csvEscape(formatAmount(o.taxCents)),
      csvEscape(formatAmount(o.totalCents)),
      csvEscape(formatAmount(o.refundedCents)),
      csvEscape(o.paymentMethodType ?? ""),
      csvEscape(`${o.orderStatus}/${o.paymentStatus}`),
    ].join(";");
  });

  return [header, ...rows].join("\r\n") + "\r\n";
}
