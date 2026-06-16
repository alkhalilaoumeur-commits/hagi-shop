import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/services/admin-auth";
import { formatPrice } from "@/lib/format";
import { OrderActions } from "@/components/admin/OrderActions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Eingegangen",
  CONFIRMED: "Bezahlt",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
};

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: "Ausstehend",
  AUTHORIZED: "Autorisiert",
  PAID: "Bezahlt",
  PARTIALLY_REFUNDED: "Teil-Refund",
  REFUNDED: "Refund",
  FAILED: "Fehlgeschlagen",
  EXPIRED: "Abgelaufen",
};

const FULFILLMENT_LABEL: Record<string, string> = {
  UNFULFILLED: "Offen",
  PARTIALLY_FULFILLED: "Teilversand",
  FULFILLED: "Versendet",
  RETURNED: "Retourniert",
};

export default async function OrderDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      fulfillments: { include: { items: true }, orderBy: { createdAt: "desc" } },
      consentLogs: { orderBy: { grantedAt: "desc" } },
      paymentEvents: { orderBy: { receivedAt: "desc" }, take: 5 },
    },
  });
  if (!order) notFound();

  return (
    <div className="space-y-10">
      <header>
        <Link
          href="/admin/bestellungen"
          className="text-[11px] uppercase tracking-[0.15em] inline-block mb-4"
          style={{ color: "#8A7866" }}
        >
          ← Alle Bestellungen
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: "#B89968" }}>
              ✦ Bestellung
            </p>
            <h1 className="font-mono text-3xl md:text-4xl" style={{ color: "#0F0A06" }}>
              {order.orderNumber}
            </h1>
            <p className="text-sm mt-2" style={{ color: "#5A4A3A" }}>
              {new Intl.DateTimeFormat("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(order.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge label={STATUS_LABEL[order.orderStatus]} accent="#0F0A06" />
            <Badge label={`Zahlung: ${PAYMENT_LABEL[order.paymentStatus]}`} accent="#5C7A4B" />
            <Badge label={`Versand: ${FULFILLMENT_LABEL[order.fulfillmentStatus]}`} accent="#B89968" />
            {order.isB2B && <Badge label="B2B" accent="#A33B2A" />}
          </div>
        </div>
      </header>

      <OrderActions
        orderId={order.id}
        orderStatus={order.orderStatus}
        paymentStatus={order.paymentStatus}
        fulfillmentStatus={order.fulfillmentStatus}
        totalCents={order.totalCents}
      />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="Lieferanschrift" eyebrow="Versand an">
          <p className="text-sm leading-relaxed" style={{ color: "#0F0A06" }}>
            {order.shippingFirstName} {order.shippingLastName}
            {order.shippingCompany && (
              <>
                <br />
                {order.shippingCompany}
              </>
            )}
            <br />
            {order.shippingStreet1}
            {order.shippingStreet2 && (
              <>
                <br />
                {order.shippingStreet2}
              </>
            )}
            <br />
            {order.shippingPostalCode} {order.shippingCity}
            <br />
            {order.shippingCountryCode}
            {order.shippingPhone && (
              <>
                <br />Tel: {order.shippingPhone}
              </>
            )}
          </p>
          <p className="text-[11px] uppercase tracking-[0.15em] mt-4" style={{ color: "#8A7866" }}>
            {order.shippingMethodName ?? "Versand"}
            {order.estimatedDeliveryMinDays && order.estimatedDeliveryMaxDays
              ? ` · ${order.estimatedDeliveryMinDays}–${order.estimatedDeliveryMaxDays} Werktage`
              : ""}
          </p>
        </Card>

        <Card title="Rechnungsanschrift" eyebrow="Kunde">
          <p className="text-sm leading-relaxed" style={{ color: "#0F0A06" }}>
            {order.billingFirstName} {order.billingLastName}
            {order.billingCompany && (
              <>
                <br />
                {order.billingCompany}
              </>
            )}
            <br />
            {order.billingStreet1}
            <br />
            {order.billingPostalCode} {order.billingCity}
            <br />
            {order.billingCountryCode}
          </p>
          <p className="text-[11px] mt-4" style={{ color: "#5A4A3A" }}>
            <a href={`mailto:${order.customerEmail}`} style={{ color: "#A33B2A" }}>
              {order.customerEmail}
            </a>
            {order.customerPhone && (
              <>
                <br />Tel: {order.customerPhone}
              </>
            )}
            {order.vatIdSnapshot && (
              <>
                <br />USt-IdNr.: {order.vatIdSnapshot}
              </>
            )}
            {order.isReverseCharge && (
              <>
                <br />Reverse-Charge aktiv
              </>
            )}
          </p>
        </Card>
      </section>

      <section>
        <p className="text-[10px] uppercase tracking-[0.22em] mb-4" style={{ color: "#B89968" }}>
          ✦ Stücke
        </p>
        <div style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F0EAD8" }}>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>
                  Stück
                </th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>
                  SKU
                </th>
                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>
                  Menge
                </th>
                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>
                  Einzel
                </th>
                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>
                  Gesamt
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #E5DCC8" }}>
                  <td className="px-4 py-3" style={{ color: "#0F0A06" }}>{item.productTitle}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#8A7866" }}>{item.productSku}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "#0F0A06" }}>{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "#0F0A06" }}>{formatPrice(item.unitPriceCents)}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: "#0F0A06" }}>{formatPrice(item.subtotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8">
        <div>
          {order.fulfillments.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "#B89968" }}>
                ✦ Versand-Historie
              </p>
              <ul className="space-y-3 mb-8">
                {order.fulfillments.map((f) => (
                  <li
                    key={f.id}
                    className="p-4"
                    style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm" style={{ color: "#0F0A06" }}>
                        {f.carrier ?? "Versand"} ·{" "}
                        <span className="font-mono">{f.trackingNumber ?? "-"}</span>
                      </p>
                      <p className="text-[11px] font-mono" style={{ color: "#8A7866" }}>
                        {f.shippedAt
                          ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(f.shippedAt)
                          : "—"}
                      </p>
                    </div>
                    {f.trackingUrl && (
                      <a
                        href={f.trackingUrl}
                        target="_blank"
                        rel="noopener"
                        className="text-[11px] mt-2 inline-block"
                        style={{ color: "#A33B2A" }}
                      >
                        Tracking-Link →
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "#B89968" }}>
            ✦ Interne Notiz
          </p>
          <div className="p-4 text-sm whitespace-pre-wrap" style={{ background: "#F0EAD8", border: "1px solid #E5DCC8", color: "#5A4A3A", minHeight: "80px" }}>
            {order.internalNote || <span style={{ color: "#8A7866", fontStyle: "italic" }}>Keine Notiz.</span>}
          </div>
        </div>

        <aside>
          <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "#B89968" }}>
            ✦ Summen
          </p>
          <dl className="space-y-2 text-sm p-5" style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
            <Row label="Zwischensumme" value={formatPrice(order.subtotalCents)} />
            <Row
              label="Versand"
              value={order.shippingCents === 0 ? "Gratis" : formatPrice(order.shippingCents)}
            />
            {order.discountCents > 0 && (
              <Row label={`Rabatt (${order.discountCode ?? ""})`} value={`-${formatPrice(order.discountCents)}`} />
            )}
            <Row label="Steuer" value={formatPrice(order.taxCents)} />
            <div
              className="flex items-baseline justify-between pt-3 mt-3"
              style={{ borderTop: "1px solid #E5DCC8" }}
            >
              <span className="text-[11px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>
                Gesamt
              </span>
              <span className="font-serif text-xl" style={{ color: "#0F0A06" }}>
                {formatPrice(order.totalCents)}
              </span>
            </div>
            {order.refundedCents > 0 && (
              <div className="text-[11px] mt-2" style={{ color: "#A33B2A" }}>
                Refund: {formatPrice(order.refundedCents)}
              </div>
            )}
          </dl>

          <p className="text-[10px] uppercase tracking-[0.22em] mt-8 mb-3" style={{ color: "#B89968" }}>
            ✦ Dokumente
          </p>
          <div className="space-y-2">
            {(order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED" || order.paymentStatus === "PARTIALLY_REFUNDED") && (
              <>
                <a
                  href={`/api/invoice/${order.publicToken}`}
                  target="_blank"
                  rel="noopener"
                  className="block px-4 py-3 text-[11px] uppercase tracking-[0.15em] text-center"
                  style={{ background: "#0F0A06", color: "#FAFAF7" }}
                >
                  Rechnung PDF
                </a>
                <a
                  href={`/api/invoice/${order.publicToken}?variant=lieferschein`}
                  target="_blank"
                  rel="noopener"
                  className="block px-4 py-3 text-[11px] uppercase tracking-[0.15em] text-center"
                  style={{ background: "transparent", color: "#0F0A06", border: "1px solid #0F0A06" }}
                >
                  Lieferschein PDF
                </a>
              </>
            )}
            <a
              href={`/bestellung/status/${order.publicToken}`}
              target="_blank"
              rel="noopener"
              className="block text-[11px] text-center pb-0.5 mt-2"
              style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
            >
              Customer-Status-Page →
            </a>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Badge({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      className="text-[10px] uppercase tracking-[0.22em] font-bold px-2 py-0.5"
      style={{ background: accent, color: "#FAFAF7" }}
    >
      {label}
    </span>
  );
}

function Card({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="p-6" style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
      <p className="text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: "#B89968" }}>
        ✦ {eyebrow}
      </p>
      <p className="font-serif text-lg mb-4" style={{ color: "#0F0A06" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span style={{ color: "#5A4A3A" }}>{label}</span>
      <span className="font-mono" style={{ color: "#0F0A06" }}>{value}</span>
    </div>
  );
}
