import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/services/admin-auth";
import { formatPrice } from "@/lib/format";
import { OrderActions } from "@/components/admin/OrderActions";
import { Card } from "@/components/admin/ui/Card";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { SectionLabel } from "@/components/admin/ui/Field";
import { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS, metaOf } from "@/lib/admin/status-labels";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

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

  const orderMeta = metaOf(ORDER_STATUS, order.orderStatus);
  const payMeta = metaOf(PAYMENT_STATUS, order.paymentStatus);
  const fulfillMeta = metaOf(FULFILLMENT_STATUS, order.fulfillmentStatus);

  return (
    <div className="space-y-10">
      <header>
        <Link href="/admin/bestellungen" className="text-[11px] uppercase tracking-[0.15em] inline-block mb-4 text-muted hover:text-ink transition-colors">
          ← Alle Bestellungen
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <SectionLabel className="mb-2">Bestellung</SectionLabel>
            <h1 className="font-mono text-3xl md:text-4xl text-ink">{order.orderNumber}</h1>
            <p className="text-sm mt-2 text-ink-muted">
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
            <StatusBadge label={orderMeta.label} tone={orderMeta.tone} />
            <StatusBadge label={`Zahlung: ${payMeta.label}`} tone={payMeta.tone} />
            <StatusBadge label={`Versand: ${fulfillMeta.label}`} tone={fulfillMeta.tone} />
            {order.isB2B && <StatusBadge label="B2B" tone="info" />}
          </div>
        </div>
      </header>

      <OrderActions
        orderId={order.id}
        orderStatus={order.orderStatus}
        paymentStatus={order.paymentStatus}
        fulfillmentStatus={order.fulfillmentStatus}
        totalCents={order.totalCents}
        refundedCents={order.refundedCents}
        withdrawalRequestedAt={order.withdrawalRequestedAt}
        returnReceivedAt={order.returnReceivedAt}
      />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <InfoCard title="Lieferanschrift" eyebrow="Versand an">
          <p className="text-sm leading-relaxed text-ink">
            {order.shippingFirstName} {order.shippingLastName}
            {order.shippingCompany && (<><br />{order.shippingCompany}</>)}
            <br />
            {order.shippingStreet1}
            {order.shippingStreet2 && (<><br />{order.shippingStreet2}</>)}
            <br />
            {order.shippingPostalCode} {order.shippingCity}
            <br />
            {order.shippingCountryCode}
            {order.shippingPhone && (<><br />Tel: {order.shippingPhone}</>)}
          </p>
          <p className="text-[11px] uppercase tracking-[0.15em] mt-4 text-muted">
            {order.shippingMethodName ?? "Versand"}
            {order.estimatedDeliveryMinDays && order.estimatedDeliveryMaxDays
              ? ` · ${order.estimatedDeliveryMinDays}–${order.estimatedDeliveryMaxDays} Werktage`
              : ""}
          </p>
        </InfoCard>

        <InfoCard title="Rechnungsanschrift" eyebrow="Kunde">
          <p className="text-sm leading-relaxed text-ink">
            {order.billingFirstName} {order.billingLastName}
            {order.billingCompany && (<><br />{order.billingCompany}</>)}
            <br />
            {order.billingStreet1}
            <br />
            {order.billingPostalCode} {order.billingCity}
            <br />
            {order.billingCountryCode}
          </p>
          <p className="text-[11px] mt-4 text-ink-muted">
            <a href={`mailto:${order.customerEmail}`} className="text-sienna">{order.customerEmail}</a>
            {order.customerPhone && (<><br />Tel: {order.customerPhone}</>)}
            {order.vatIdSnapshot && (<><br />USt-IdNr.: {order.vatIdSnapshot}</>)}
            {order.isReverseCharge && (<><br />Reverse-Charge aktiv</>)}
          </p>
        </InfoCard>
      </section>

      <section>
        <SectionLabel className="mb-4">Stücke</SectionLabel>
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-elevated">
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-ink-muted">Stück</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-ink-muted">SKU</th>
                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-ink-muted">Menge</th>
                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-ink-muted">Einzel</th>
                <th className="text-right px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-ink-muted">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3 text-ink">{item.productTitle}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{item.productSku}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink">{formatPrice(item.unitPriceCents)}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink">{formatPrice(item.subtotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8">
        <div>
          {order.fulfillments.length > 0 && (
            <>
              <SectionLabel className="mb-3">Versand-Historie</SectionLabel>
              <ul className="space-y-3 mb-8">
                {order.fulfillments.map((f) => (
                  <li key={f.id} className="p-4 bg-bg-card border border-border">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm text-ink">
                        {f.carrier ?? "Versand"} · <span className="font-mono">{f.trackingNumber ?? "-"}</span>
                      </p>
                      <p className="text-[11px] font-mono text-muted">
                        {f.shippedAt
                          ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(f.shippedAt)
                          : "—"}
                      </p>
                    </div>
                    {f.trackingUrl && (
                      <a href={f.trackingUrl} target="_blank" rel="noopener" className="text-[11px] mt-2 inline-block text-sienna">
                        Tracking-Link →
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <SectionLabel className="mb-3">Interne Notiz</SectionLabel>
          <div className="p-4 text-sm whitespace-pre-wrap bg-bg-elevated border border-border text-ink-muted" style={{ minHeight: "80px" }}>
            {order.internalNote || <span className="text-muted italic">Keine Notiz.</span>}
          </div>
        </div>

        <aside>
          <SectionLabel className="mb-3">Summen</SectionLabel>
          <dl className="space-y-2 text-sm p-5 bg-bg-card border border-border">
            <Row label="Zwischensumme" value={formatPrice(order.subtotalCents)} />
            <Row label="Versand" value={order.shippingCents === 0 ? "Gratis" : formatPrice(order.shippingCents)} />
            {order.discountCents > 0 && (
              <Row label={`Rabatt (${order.discountCode ?? ""})`} value={`-${formatPrice(order.discountCents)}`} />
            )}
            <Row label="Steuer" value={formatPrice(order.taxCents)} />
            <div className="flex items-baseline justify-between pt-3 mt-3 border-t border-border">
              <span className="text-[11px] uppercase tracking-[0.15em] text-ink-muted">Gesamt</span>
              <span className="font-serif text-xl text-ink">{formatPrice(order.totalCents)}</span>
            </div>
            {order.refundedCents > 0 && (
              <div className="text-[11px] mt-2 text-sienna">Refund: {formatPrice(order.refundedCents)}</div>
            )}
          </dl>

          <SectionLabel className="mt-8 mb-3">Dokumente</SectionLabel>
          <div className="space-y-2">
            {(order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED" || order.paymentStatus === "PARTIALLY_REFUNDED") && (
              <>
                <a href={`/api/invoice/${order.publicToken}`} target="_blank" rel="noopener" className="block px-4 py-3 text-[11px] uppercase tracking-[0.15em] text-center bg-ink text-bone hover:bg-sienna transition-colors">
                  Rechnung PDF
                </a>
                <a href={`/api/invoice/${order.publicToken}?variant=lieferschein`} target="_blank" rel="noopener" className="block px-4 py-3 text-[11px] uppercase tracking-[0.15em] text-center border border-ink text-ink hover:bg-ink hover:text-bone transition-colors">
                  Lieferschein PDF
                </a>
              </>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function InfoCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <SectionLabel className="mb-1">{eyebrow}</SectionLabel>
      <p className="font-serif text-lg mb-4 text-ink">{title}</p>
      {children}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="font-mono text-ink">{value}</span>
    </div>
  );
}
