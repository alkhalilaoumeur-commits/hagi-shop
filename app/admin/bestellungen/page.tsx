import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/services/admin-auth";
import { formatPrice } from "@/lib/format";
import type { OrderStatus, PaymentStatus, FulfillmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Eingegangen",
  CONFIRMED: "Bezahlt",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Storniert",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: "#B89968",
  CONFIRMED: "#5C7A4B",
  COMPLETED: "#0F0A06",
  CANCELLED: "#7E2A1D",
};

const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  UNFULFILLED: "Offen",
  PARTIALLY_FULFILLED: "Teilversand",
  FULFILLED: "Versendet",
  RETURNED: "Retourniert",
};

interface SearchParams {
  status?: string;
  payment?: string;
  fulfillment?: string;
  q?: string;
  page?: string;
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
      <header>
        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
          ✦ Bestellungen
        </p>
        <h1 className="font-serif" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#0F0A06" }}>
          {total} {total === 1 ? "Bestellung" : "Bestellungen"}
        </h1>
      </header>

      <form
        method="get"
        className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 p-5"
        style={{ background: "#F0EAD8", border: "1px solid #E5DCC8" }}
      >
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Suche: Bestellnummer, Email, Name…"
          className="px-3 py-2.5 text-sm bg-transparent focus:outline-none"
          style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
          maxLength={80}
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="px-3 py-2.5 text-sm bg-transparent focus:outline-none"
          style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
        >
          <option value="">Alle Status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          name="payment"
          defaultValue={params.payment ?? ""}
          className="px-3 py-2.5 text-sm bg-transparent focus:outline-none"
          style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
        >
          <option value="">Alle Zahlungen</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Bezahlt</option>
          <option value="REFUNDED">Refunded</option>
          <option value="FAILED">Failed</option>
        </select>
        <select
          name="fulfillment"
          defaultValue={params.fulfillment ?? ""}
          className="px-3 py-2.5 text-sm bg-transparent focus:outline-none"
          style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
        >
          <option value="">Alle Versand</option>
          {Object.entries(FULFILLMENT_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em]"
          style={{ background: "#0F0A06", color: "#FAFAF7" }}
        >
          Filtern
        </button>
      </form>

      {orders.length === 0 ? (
        <p style={{ color: "#5A4A3A" }}>Keine Bestellungen gefunden.</p>
      ) : (
        <div className="divide-y" style={{ borderColor: "#E5DCC8", background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/bestellungen/${order.id}`}
              className="grid grid-cols-[80px_1fr_auto_auto_auto] gap-4 px-5 py-4 items-center transition-colors hover:bg-[#FAFAF7]"
            >
              <span
                className="text-[9px] uppercase tracking-[0.22em] font-bold px-2 py-0.5 text-center"
                style={{ background: STATUS_COLOR[order.orderStatus], color: "#FAFAF7" }}
              >
                {STATUS_LABEL[order.orderStatus]}
              </span>
              <div>
                <p className="font-mono text-sm" style={{ color: "#0F0A06" }}>
                  {order.orderNumber}
                </p>
                <p className="text-[11px]" style={{ color: "#8A7866" }}>
                  {order.billingFirstName} {order.billingLastName} · {order.customerEmail}
                </p>
              </div>
              <span
                className="text-[10px] uppercase tracking-[0.15em] hidden md:inline-block"
                style={{ color: "#5A4A3A" }}
              >
                {FULFILLMENT_LABEL[order.fulfillmentStatus]}
              </span>
              <p
                className="text-[10px] uppercase tracking-[0.15em] font-mono hidden md:block"
                style={{ color: "#8A7866" }}
              >
                {new Intl.DateTimeFormat("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(order.createdAt)}
              </p>
              <p className="font-mono text-sm text-right" style={{ color: "#0F0A06" }}>
                {formatPrice(order.totalCents)}
              </p>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>
          <span>
            Seite {page} von {totalPages} · {total} Bestellungen
          </span>
          <div className="flex gap-3">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
                className="pb-0.5"
                style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
              >
                ← Zurück
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
                className="pb-0.5"
                style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
              >
                Vor →
              </Link>
            )}
          </div>
        </div>
      )}
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
