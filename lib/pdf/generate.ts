import { renderToBuffer } from "@react-pdf/renderer";
import * as React from "react";
import { InvoicePDF, DeliveryNotePDF, type InvoiceData } from "./invoice";

function orderToInvoiceData(order: {
  orderNumber: string;
  customerEmail: string;
  billingFirstName: string;
  billingLastName: string;
  billingCompany: string | null;
  billingStreet1: string;
  billingStreet2: string | null;
  billingCity: string;
  billingPostalCode: string;
  billingCountryCode: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingStreet1: string;
  shippingStreet2: string | null;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountryCode: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  taxRatePercent: { toString(): string } | number | null;
  isReverseCharge: boolean;
  vatIdSnapshot: string | null;
  shippingMethodName: string | null;
  paidAt: Date | null;
  createdAt: Date;
  items: Array<{
    productTitle: string;
    productSku: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
    taxRatePercent: { toString(): string } | number | null;
  }>;
}): InvoiceData {
  const rate =
    typeof order.taxRatePercent === "number"
      ? order.taxRatePercent
      : order.taxRatePercent
        ? parseFloat(order.taxRatePercent.toString())
        : 0;

  return {
    orderNumber: order.orderNumber,
    invoiceDate: new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
      order.paidAt ?? order.createdAt,
    ),
    customerEmail: order.customerEmail,

    billingFirstName: order.billingFirstName,
    billingLastName: order.billingLastName,
    billingCompany: order.billingCompany,
    billingStreet1: order.billingStreet1,
    billingStreet2: order.billingStreet2,
    billingCity: order.billingCity,
    billingPostalCode: order.billingPostalCode,
    billingCountryCode: order.billingCountryCode,

    shippingFirstName: order.shippingFirstName,
    shippingLastName: order.shippingLastName,
    shippingStreet1: order.shippingStreet1,
    shippingStreet2: order.shippingStreet2,
    shippingCity: order.shippingCity,
    shippingPostalCode: order.shippingPostalCode,
    shippingCountryCode: order.shippingCountryCode,

    items: order.items.map((i) => ({
      title: i.productTitle,
      sku: i.productSku,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      totalCents: i.subtotalCents,
      taxRatePercent:
        typeof i.taxRatePercent === "number"
          ? i.taxRatePercent
          : i.taxRatePercent
            ? parseFloat(i.taxRatePercent.toString())
            : 0,
    })),

    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    discountCents: order.discountCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,

    taxRatePercent: rate,
    isReverseCharge: order.isReverseCharge,
    isSmallBusiness: rate === 0 && !order.isReverseCharge,
    vatId: order.vatIdSnapshot,

    shippingMethodName: order.shippingMethodName,
  };
}

export async function generateInvoicePDF(order: Parameters<typeof orderToInvoiceData>[0]): Promise<Buffer> {
  const data = orderToInvoiceData(order);
  return renderToBuffer(React.createElement(InvoicePDF, { data }));
}

export async function generateDeliveryNotePDF(order: Parameters<typeof orderToInvoiceData>[0]): Promise<Buffer> {
  const data = orderToInvoiceData(order);
  return renderToBuffer(React.createElement(DeliveryNotePDF, { data }));
}

export async function generateWithdrawalFormPDF(): Promise<Buffer> {
  const { WithdrawalFormPDF } = await import("./withdrawal-form");
  const company = {
    name: process.env.COMPANY_NAME ?? "Hagi Teppiche",
    street: process.env.COMPANY_STREET ?? "Egilolfstraße 41",
    city: process.env.COMPANY_CITY ?? "70599 Stuttgart",
    email: process.env.COMPANY_EMAIL ?? "info@hagi-shop.de",
    phone: process.env.COMPANY_PHONE ?? "+49 711 12 34 56 78",
  };
  return renderToBuffer(React.createElement(WithdrawalFormPDF, { company }));
}
