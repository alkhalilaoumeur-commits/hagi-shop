import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { submitWithdrawal } from "@/app/actions/withdrawal";
import { isWithdrawalEligible } from "@/lib/services/withdrawal";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Widerruf bestätigen — Hagi Teppiche",
  robots: { index: false, follow: false },
};

const REJECT_REASONS: Record<string, string> = {
  ORDER_NOT_PAID: "Diese Bestellung wurde noch nicht bezahlt — ein Widerruf ist nicht nötig.",
  ORDER_ALREADY_CANCELLED: "Diese Bestellung wurde bereits storniert.",
  ORDER_ALREADY_WITHDRAWN: "Für diese Bestellung wurde bereits ein Widerruf eingereicht.",
  WITHDRAWAL_PERIOD_EXPIRED: "Die 14-Tage-Widerrufsfrist ist abgelaufen.",
};

export default async function WiderrufFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;

  if (!token || token.length < 16 || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      orderNumber: true,
      orderStatus: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      totalCents: true,
      paidAt: true,
      deliveredAt: true,
      cancelledAt: true,
      withdrawalRequestedAt: true,
      withdrawalNoticeGiven: true,
      internalNote: true,
      billingFirstName: true,
      billingLastName: true,
      items: { select: { productTitle: true, quantity: true, totalCents: true } },
    },
  });
  if (!order) notFound();

  const eligibility = isWithdrawalEligible(order);
  const errorMsg = sp.error ? REJECT_REASONS[sp.error] ?? null : null;

  return (
    <main
      className="min-h-[100dvh] px-6 py-24"
      style={{ background: "radial-gradient(ellipse at 15% 20%, #F6EEDB 0%, #EFE6D2 60%, #E8DEC4 100%)" }}
    >
      <div className="max-w-2xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
          ✦ Bestellung Nr. {order.orderNumber}
        </p>
        <h1
          className="font-serif leading-[0.95] mb-6"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#0F0A06", letterSpacing: "-0.015em" }}
        >
          Widerruf{" "}
          <em style={{ color: "#A33B2A", fontStyle: "italic" }}>bestätigen.</em>
        </h1>

        <div
          className="mb-10 p-6"
          style={{ background: "#FAFAF7", border: "1px solid #D9CDB8" }}
        >
          <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "#5A4A3A" }}>
            Ihre Bestellung
          </p>
          <p className="font-serif text-lg mb-4" style={{ color: "#0F0A06" }}>
            {order.billingFirstName} {order.billingLastName}
          </p>
          <ul className="text-sm space-y-2 mb-4" style={{ color: "#5A4A3A" }}>
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {item.quantity}× {item.productTitle}
                </span>
                <span className="font-mono">{formatPrice(item.totalCents)}</span>
              </li>
            ))}
          </ul>
          <div
            className="flex justify-between pt-3 font-mono text-sm font-bold"
            style={{ borderTop: "1px solid #D9CDB8", color: "#0F0A06" }}
          >
            <span>Gesamt</span>
            <span>{formatPrice(order.totalCents)}</span>
          </div>
        </div>

        {!eligibility.eligible && (
          <div
            className="mb-8 px-5 py-4"
            style={{ background: "#FAEDE9", border: "1px solid #A33B2A", color: "#A33B2A" }}
          >
            <p className="font-bold mb-1">Widerruf nicht möglich</p>
            <p className="text-sm">{REJECT_REASONS[eligibility.reason] ?? eligibility.reason}</p>
          </div>
        )}
        {errorMsg && (
          <div
            className="mb-8 px-5 py-4"
            style={{ background: "#FAEDE9", border: "1px solid #A33B2A", color: "#A33B2A" }}
          >
            {errorMsg}
          </div>
        )}

        {eligibility.eligible && (
          <form action={submitWithdrawal} className="space-y-5">
            <input type="hidden" name="token" value={token} />
            <div>
              <label
                htmlFor="reason"
                className="block text-[10px] uppercase tracking-[0.22em] mb-2"
                style={{ color: "#5A4A3A" }}
              >
                Begründung (optional)
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={5}
                maxLength={2000}
                placeholder="Sie müssen keine Begründung angeben. Falls Sie eine Rückmeldung geben möchten, hilft sie uns, besser zu werden."
                className="w-full px-4 py-3 text-base"
                style={{ background: "#FAFAF7", border: "1px solid #D9CDB8", color: "#0F0A06" }}
              />
            </div>

            <div
              className="text-sm p-4"
              style={{ background: "#F0EAD8", color: "#5A4A3A" }}
            >
              <p className="mb-2 font-semibold" style={{ color: "#0F0A06" }}>
                Nächste Schritte
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Widerruf jetzt absenden — Sie erhalten eine Bestätigungs-E-Mail.</li>
                <li>Wir melden uns mit Rücksendeanweisungen binnen 1-2 Werktagen.</li>
                <li>
                  Rückerstattung des Kaufpreises inkl. Hin-Versand binnen 14 Tagen nach Erhalt
                  der Ware. Rückversand zahlt der Käufer (§ 357 Abs. 6 BGB).
                </li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 px-7 py-4 text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ background: "#0F0A06", color: "#FAFAF7" }}
              >
                Widerruf jetzt absenden →
              </button>
              <Link
                href={`/bestellung/status/${token}`}
                className="flex-1 text-center px-7 py-4 text-[11px] uppercase tracking-[0.18em]"
                style={{ background: "transparent", border: "1px solid #0F0A06", color: "#0F0A06" }}
              >
                Doch nicht — zurück
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
