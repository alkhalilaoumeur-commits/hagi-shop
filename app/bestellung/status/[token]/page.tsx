import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { CONTACT_EMAIL } from "@/lib/shop-config";
import { rateLimit, extractIp } from "@/lib/services/rate-limit";
import { withdrawalDaysRemaining } from "@/lib/services/withdrawal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bestellstatus | Hagi Teppiche",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

type StatusStep = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

const STEPS: { key: StatusStep; label: string; description: string }[] = [
  { key: "pending", label: "Eingegangen", description: "Wir haben Ihre Bestellung erhalten." },
  { key: "confirmed", label: "Bezahlt", description: "Zahlung bestätigt, Vorbereitung läuft." },
  { key: "shipped", label: "Versendet", description: "Ihr Teppich ist auf dem Weg." },
  { key: "delivered", label: "Zugestellt", description: "Wir hoffen, er passt zu Ihrem Raum." },
];

export default async function TrackingPage({ params }: Props) {
  const { token } = await params;

  if (!token || token.length < 16 || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return <NotFound />;
  }

  const h = await headers();
  const ip = extractIp(h);
  const rl = await rateLimit({ key: `ip:${ip}:tracking`, limit: 30, windowSeconds: 60 });
  if (!rl.allowed) {
    return <RateLimited retryAfter={rl.retryAfter} />;
  }

  const order = await prisma.order.findUnique({
    where: { publicToken: token },
    include: {
      items: { select: { id: true, productTitle: true, productSku: true, productImageUrl: true, quantity: true, unitPriceCents: true, subtotalCents: true } },
      fulfillments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!order) return <NotFound />;

  const currentStep = deriveCurrentStep(order.orderStatus, order.paymentStatus, order.fulfillmentStatus);
  const isCancelled = order.orderStatus === "CANCELLED";
  const fulfillment = order.fulfillments[0] ?? null;

  // Live-Countdown der gesetzlichen Widerrufsfrist (force-dynamic → pro Aufruf frisch).
  const alreadyWithdrawn = order.withdrawalRequestedAt !== null;
  const countdown = isCancelled ? null : withdrawalDaysRemaining(order.deliveredAt, order.withdrawalNoticeGiven);

  return (
    <main style={{ background: "#FAFAF7" }}>
      <section className="pt-32 pb-12" style={{ background: "linear-gradient(180deg, #F6EEDB 0%, #FAFAF7 100%)" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
            ✦ Bestellung {order.orderNumber}
          </p>
          <h1
            className="font-serif leading-[0.95] mb-6"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", color: "#0F0A06" }}
          >
            {isCancelled ? (
              <>
                <em style={{ color: "#A33B2A", fontStyle: "italic" }}>Storniert.</em>
              </>
            ) : currentStep === "delivered" ? (
              <>
                <em style={{ color: "#5C7A4B", fontStyle: "italic" }}>Angekommen.</em>
              </>
            ) : (
              <>
                Wo Ihr Teppich<br />
                <em style={{ color: "#A33B2A", fontStyle: "italic" }}>gerade ist.</em>
              </>
            )}
          </h1>
          <p className="text-base md:text-lg max-w-2xl" style={{ color: "#5A4A3A" }}>
            {isCancelled
              ? `Die Bestellung wurde storniert${order.cancelReason ? ` (${order.cancelReason})` : ""}.`
              : "Aktueller Stand Ihrer Bestellung. Sobald sich was ändert, schicken wir Ihnen eine Mail."}
          </p>
        </div>
      </section>

      {!isCancelled && (
        <section className="py-12 md:py-16">
          <div className="max-w-page mx-auto px-6 md:px-12">
            <p className="text-[10px] uppercase tracking-[0.22em] mb-6" style={{ color: "#B89968" }}>
              ✦ Lieferstand
            </p>
            <ol className="relative">
              {STEPS.map((step, idx) => {
                const stepIndex = STEPS.findIndex((s) => s.key === currentStep);
                const isComplete = idx <= stepIndex;
                const isCurrent = idx === stepIndex;
                return (
                  <li key={step.key} className="grid grid-cols-[60px_1fr] gap-4 pb-10 relative">
                    {idx < STEPS.length - 1 && (
                      <div
                        className="absolute left-[29px] top-9 bottom-0 w-px"
                        style={{ background: idx < stepIndex ? "#A33B2A" : "#D9CDB8" }}
                      />
                    )}
                    <div
                      className="w-12 h-12 flex items-center justify-center font-mono text-sm relative z-10"
                      style={{
                        background: isComplete ? "#A33B2A" : "#FAFAF7",
                        color: isComplete ? "#FAFAF7" : "#8A7866",
                        border: "1px solid",
                        borderColor: isComplete ? "#A33B2A" : "#D9CDB8",
                      }}
                    >
                      {isComplete ? "✓" : String(idx + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <p
                        className="font-serif text-xl md:text-2xl mb-1"
                        style={{ color: isComplete ? "#0F0A06" : "#8A7866" }}
                      >
                        {step.label}
                      </p>
                      <p className="text-sm" style={{ color: "#5A4A3A" }}>
                        {step.description}
                      </p>
                      {isCurrent && step.key === "shipped" && fulfillment?.trackingNumber && (
                        <div
                          className="mt-3 p-4"
                          style={{ background: "#F0EAD8", border: "1px solid #E5DCC8" }}
                        >
                          <p className="text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: "#8A7866" }}>
                            Sendungsnummer
                          </p>
                          <p className="font-mono text-lg mb-2" style={{ color: "#0F0A06" }}>
                            {fulfillment.trackingNumber}
                          </p>
                          {fulfillment.trackingUrl && (
                            <a
                              href={fulfillment.trackingUrl}
                              target="_blank"
                              rel="noopener"
                              className="text-[11px] uppercase tracking-[0.15em] pb-0.5 inline-block"
                              style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
                            >
                              Bei {fulfillment.carrier ?? "Dienstleister"} verfolgen →
                            </a>
                          )}
                        </div>
                      )}
                      {isCurrent && order.estimatedDeliveryMinDays && order.estimatedDeliveryMaxDays && step.key !== "delivered" && (
                        <p className="text-[11px] mt-2 font-mono" style={{ color: "#8A7866" }}>
                          Voraussichtlich {order.estimatedDeliveryMinDays}–{order.estimatedDeliveryMaxDays} Werktage
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      <section className="py-12 md:py-16" style={{ background: "#F0EAD8", borderTop: "1px solid #E5DCC8" }}>
        <div className="max-w-page mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "#B89968" }}>
              ✦ Lieferanschrift
            </p>
            <p className="text-base leading-relaxed" style={{ color: "#0F0A06" }}>
              {order.shippingFirstName} {order.shippingLastName}
              {order.shippingCompany && (
                <>
                  <br />
                  {order.shippingCompany}
                </>
              )}
              <br />
              {order.shippingStreet1}
              <br />
              {order.shippingPostalCode} {order.shippingCity}
              <br />
              {order.shippingCountryCode}
            </p>

            <p className="text-[10px] uppercase tracking-[0.22em] mt-8 mb-3" style={{ color: "#B89968" }}>
              ✦ Versandart
            </p>
            <p className="text-base" style={{ color: "#0F0A06" }}>
              {order.shippingMethodName ?? "Versand"}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "#B89968" }}>
              ✦ Bestellung
            </p>
            <ul className="space-y-3 mb-6">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span style={{ color: "#0F0A06" }}>
                    {item.quantity} × {item.productTitle}
                  </span>
                  <span className="font-mono whitespace-nowrap" style={{ color: "#5A4A3A" }}>
                    {formatPrice(item.subtotalCents)}
                  </span>
                </li>
              ))}
            </ul>
            <div
              className="flex items-baseline justify-between pt-3"
              style={{ borderTop: "1px solid #D9CDB8" }}
            >
              <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#5A4A3A" }}>
                Gesamt
              </span>
              <span className="font-serif text-xl" style={{ color: "#0F0A06" }}>
                {formatPrice(order.totalCents)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {!isCancelled && currentStep === "delivered" && (
        <section className="py-12 md:py-16">
          <div className="max-w-page mx-auto px-6 md:px-12 text-center">
            <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
              ✦ 31 Tage Probestellung läuft
            </p>
            <h2 className="font-serif text-3xl mb-4" style={{ color: "#0F0A06" }}>
              Sollte er nicht passen — kein Problem.
            </h2>
            <p className="text-base mb-8" style={{ color: "#5A4A3A", maxWidth: "60ch", margin: "0 auto 32px" }}>
              Rücksendung jederzeit innerhalb 31 Tagen. Wir holen den Teppich kostenlos bei Ihnen ab.
            </p>
            <Link
              href={`/widerruf/${token}`}
              className="inline-flex items-center gap-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ background: "#0F0A06", color: "#FAFAF7" }}
            >
              Rücksendung anmelden →
            </Link>
          </div>
        </section>
      )}

      <section className="py-12" style={{ background: "#0F0A06", color: "#FAFAF7" }}>
        <div className="max-w-page mx-auto px-6 md:px-12 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
            ✦ Fragen?
          </p>
          <p className="font-serif text-xl mb-4">+49 711 12 34 56 78</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-[11px] uppercase tracking-[0.15em] pb-0.5 inline-block"
            style={{ color: "#B89968", borderBottom: "1px solid #B89968" }}
          >
            {CONTACT_EMAIL} →
          </a>
          <div className="mt-8 pt-8" style={{ borderTop: "1px solid #5A4A3A" }}>
            {alreadyWithdrawn ? (
              <p className="text-[12px]" style={{ color: "#B89968" }}>
                ✓ Ihr Widerruf ist eingegangen — wir bearbeiten ihn.
              </p>
            ) : countdown && countdown.daysRemaining <= 0 ? (
              <p className="text-[12px]" style={{ color: "#8A7866" }}>
                Die gesetzliche Widerrufsfrist ist am{" "}
                {countdown.deadline.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}{" "}
                abgelaufen.
              </p>
            ) : (
              <>
                {countdown && (
                  <p
                    className="text-[11px] uppercase tracking-[0.18em] mb-3"
                    style={{ color: countdown.daysRemaining <= 3 ? "#E8A87C" : "#8A7866" }}
                  >
                    Widerrufsrecht — noch {countdown.daysRemaining}{" "}
                    {countdown.daysRemaining === 1 ? "Tag" : "Tage"} (bis{" "}
                    {countdown.deadline.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })})
                  </p>
                )}
                <Link
                  href={`/widerruf-antrag/${token}`}
                  className="text-[11px] uppercase tracking-[0.18em] pb-0.5 inline-block"
                  style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
                >
                  Bestellung widerrufen →
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function deriveCurrentStep(
  orderStatus: string,
  paymentStatus: string,
  fulfillmentStatus: string,
): StatusStep {
  if (orderStatus === "CANCELLED") return "cancelled";
  if (fulfillmentStatus === "FULFILLED") {
    if (orderStatus === "COMPLETED") return "delivered";
    return "shipped";
  }
  if (fulfillmentStatus === "PARTIALLY_FULFILLED") return "shipped";
  if (paymentStatus === "PAID" || orderStatus === "CONFIRMED") return "confirmed";
  return "pending";
}

function RateLimited({ retryAfter }: { retryAfter: number }) {
  return (
    <main style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto px-6 md:px-12 py-32 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
          ✦ Zu viele Anfragen
        </p>
        <h1 className="font-serif text-3xl md:text-4xl mb-6" style={{ color: "#0F0A06" }}>
          Bitte einen Moment.
        </h1>
        <p className="text-base md:text-lg mb-10" style={{ color: "#5A4A3A" }}>
          Bitte versuchen Sie es in {retryAfter} Sekunden erneut.
        </p>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <main style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto px-6 md:px-12 py-32 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
          ✦ Bestellung
        </p>
        <h1 className="font-serif text-3xl md:text-4xl mb-6" style={{ color: "#0F0A06" }}>
          Bestellung nicht gefunden.
        </h1>
        <p className="text-base md:text-lg mb-10" style={{ color: "#5A4A3A" }}>
          Der Link ist ungültig oder veraltet. Bei Fragen schreiben Sie uns direkt.
        </p>
        <Link
          href="/produkte"
          className="inline-flex items-center gap-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ background: "#0F0A06", color: "#FAFAF7" }}
        >
          Zur Kollektion
        </Link>
      </div>
    </main>
  );
}
