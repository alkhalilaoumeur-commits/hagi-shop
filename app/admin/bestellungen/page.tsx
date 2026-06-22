import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/services/admin-auth";
import { formatPrice } from "@/lib/format";
import type { OrderStatus, PaymentStatus, FulfillmentStatus } from "@prisma/client";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Pagination } from "@/components/admin/ui/Pagination";
import { fieldClass } from "@/components/admin/ui/Field";
import {
  ORDER_STATUS,
  FULFILLMENT_STATUS,
  deliveryLabel,
  metaOf,
} from "@/lib/admin/status-labels";

export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  payment?: string;
  fulfillment?: string;
  q?: string;
  page?: string;
  [key: string]: string | undefined;
}

const PAGE_SIZE = 25;

export default async function OrdersListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};
  if (params.status && isOrderStatus(params.status)) where.orderStatus = params.status;
  if (params.payment && isPaymentStatus(params.payment)) where.paymentStatus = params.payment;
  if (params.fulfillment && isFulfillmentStatus(params.fulfillment)) where.fulfillmentStatus = params.fulfillment;
  if (params.q) {
    const q = params.q.trim().slice(0, 80);
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { billingLastName: { contains: q, mode: "insensitive" } },
      { shippingLastName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      select: {
        id: true,
        orderNumber: true,
        customerEmail: true,
        billingFirstName: true,
        billingLastName: true,
        totalCents: true,
        orderStatus: true,
        paymentStatus: true,
        fulfillmentStatus: true,
        deliveryType: true,
        createdAt: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Bestellungen"
        title={`${total} ${total === 1 ? "Bestellung" : "Bestellungen"}`}
      />

      <form
        method="get"
        className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 p-5 bg-bg-elevated border border-border"
      >
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Suche: Bestellnummer, Email, Name…"
          className={fieldClass}
          maxLength={80}
        />
        <select name="status" defaultValue={params.status ?? ""} className={fieldClass}>
          <option value="">Alle Status</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <select name="payment" defaultValue={params.payment ?? ""} className={fieldClass}>
          <option value="">Alle Zahlungen</option>
          <option value="PENDING">Ausstehend</option>
          <option value="PAID">Bezahlt</option>
          <option value="REFUNDED">Erstattet</option>
          <option value="FAILED">Fehlgeschlagen</option>
        </select>
        <select name="fulfillment" defaultValue={params.fulfillment ?? ""} className={fieldClass}>
          <option value="">Alle Versand</option>
          {Object.entries(FULFILLMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <AdminButton type="submit" variant="primary" size="sm">
          Filtern
        </AdminButton>
      </form>

      {orders.length === 0 ? (
        <p className="text-ink-muted">Keine Bestellungen gefunden.</p>
      ) : (
        <Card className="divide-y divide-border">
          {orders.map((order) => {
            const meta = metaOf(ORDER_STATUS, order.orderStatus);
            return (
              <Link
                key={order.id}
                href={`/admin/bestellungen/${order.id}`}
                className="grid grid-cols-[90px_1fr_auto_auto_auto] gap-4 px-5 py-4 items-center transition-colors hover:bg-bg-sand"
              >
                <StatusBadge label={meta.label} tone={meta.tone} className="text-center" />
                <div className="min-w-0">
                  <p className="font-mono text-sm text-ink">{order.orderNumber}</p>
                  <p className="text-[11px] text-muted truncate">
                    {order.billingFirstName} {order.billingLastName} · {order.customerEmail}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.15em] hidden md:inline-block text-ink-muted">
                  {metaOf(FULFILLMENT_STATUS, order.fulfillmentStatus).label}
                </span>
                <p className="text-[10px] uppercase tracking-[0.15em] font-mono hidden md:block text-muted">
                  {new Intl.DateTimeFormat("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(order.createdAt)}
                </p>
                <p className="font-mono text-sm text-right text-ink">{formatPrice(order.totalCents)}</p>
              </Link>
            );
          })}
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        unit="Bestellungen"
        params={params}
      />
    </div>
  );
}

function isOrderStatus(s: string): s is OrderStatus {
  return ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(s);
}
function isPaymentStatus(s: string): s is PaymentStatus {
  return ["PENDING", "AUTHORIZED", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "FAILED", "EXPIRED"].includes(s);
}
function isFulfillmentStatus(s: string): s is FulfillmentStatus {
  return ["UNFULFILLED", "PARTIALLY_FULFILLED", "FULFILLED", "RETURNED"].includes(s);
}
