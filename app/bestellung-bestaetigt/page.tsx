import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { CONTACT_EMAIL } from "@/lib/shop-config";
import { ClearCartOnSuccess } from "@/components/shop/ClearCartOnSuccess";
import { PendingRefresh } from "@/components/shop/PendingRefresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bestellung bestätigt | Hagi Teppiche",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string; canceled?: string }>;
}

export default async function ConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;

  if (params.canceled) {
    return <CanceledView />;
  }

  if (!token || token.length < 16 || token.length > 64) {
    return <NotFoundView />;
  }

  const order = await prisma.order.findUnique({
    where: { publicToken: token },
    include: { items: true },
  });

  if (!order) {
    return <NotFoundView />;
  }

  const customerName = `${order.billingFirstName} ${order.billingLastName}`.trim();
  const isPaid = order.paymentStatus === "PAID";
  const isPending = order.paymentStatus === "PENDING" || order.paymentStatus === "AUTHORIZED";

  return (
    <main style={{ background: "#FAFAF7" }}>
      <ClearCartOnSuccess />
      {isPending && <PendingRefresh />}

      <section className="pt-32 pb-12" style={{ background: "linear-gradient(180deg, #F6EEDB 0%, #FAFAF7 100%)" }}>
        <div className="max-w-page mx-auto px-6 md:px-12">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
            ✦ Schritt 3 von 3 · {isPaid ? "Bestätigt" : "Eingegangen"}
          </p>
          <h1
            className="font-serif leading-[0.95] mb-6"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", color: "#0F0A06" }}
          >
            Danke, {customerName.split(" ")[0] || "danke"}.<br />
            <em style={{ color: "#A33B2A", fontStyle: "italic" }}>
              {isPaid ? "Ihre Bestellung ist bestätigt." : "Wir prüfen die Zahlung."}
            </em>
          </h1>
          <p className="text-base md:text-lg max-w-2xl" style={{ color: "#5A4A3A" }}>
            {isPaid
              ? "Sie erhalten gleich eine Bestätigung per E-Mail. Sobald wir Ihren Teppich versandfertig machen, melden wir uns mit der Tracking-Nummer."
              : "Sobald die Zahlung verbucht ist, bestätigen wir Ihre Bestellung per E-Mail. Das dauert bei manchen Zahlungsarten ein paar Minuten."}
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-page mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] mb-1" style={{ color: "#B89968" }}>
              ✦ Bestellnummer
            </p>
            <p className="font-mono text-xl mb-8" style={{ color: "#0F0A06" }}>
              {order.orderNumber}
            </p>

            <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "#B89968" }}>
              ✦ Versand an
            </p>
            <p className="text-base mb-8" style={{ color: "#0F0A06" }}>
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
            </p>

            <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "#B89968" }}>
              ✦ Voraussichtliche Lieferung
            </p>
            <p className="text-base mb-8" style={{ color: "#0F0A06" }}>
              {order.shippingMethodName ?? "Versand"} ·{" "}
              {order.estimatedDeliveryMinDays && order.estimatedDeliveryMaxDays
                ? order.estimatedDeliveryMinDays === order.estimatedDeliveryMaxDays
                  ? `${order.estimatedDeliveryMaxDays} Werktage`
                  : `${order.estimatedDeliveryMinDays}–${order.estimatedDeliveryMaxDays} Werktage`
                : "Wir melden uns mit Termin"}
            </p>

            <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "#B89968" }}>
              ✦ Nächste Schritte
            </p>
            <ol className="space-y-3 text-sm md:text-base" style={{ color: "#5A4A3A" }}>
              <li className="flex gap-3">
                <span className="font-mono text-xs" style={{ color: "#B89968" }}>
                  01
                </span>
                Bestätigungs-Mail mit Rechnungs-PDF in Kürze
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs" style={{ color: "#B89968" }}>
                  02
                </span>
                Hagi prüft den Teppich persönlich vor Versand
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs" style={{ color: "#B89968" }}>
                  03
                </span>
                Tracking-Mail mit Sendungs-Nr. bei Versand
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs" style={{ color: "#B89968" }}>
                  04
                </span>
                31 Tage Probestellung — ohne Risiko zurückschicken
              </li>
            </ol>

            <div className="mt-10 p-6" style={{ background: "#F0EAD8", border: "1px solid #E5DCC8" }}>
              <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "#B89968" }}>
                Fragen? Direkt zu Hagi.
              </p>
              <p className="font-serif text-xl mb-4" style={{ color: "#0F0A06" }}>
                +49 711 12 34 56 78
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[11px] uppercase tracking-[0.15em] pb-1 inline-block"
                style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
              >
                {CONTACT_EMAIL} →
              </a>
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="p-6 md:p-8" style={{ background: "#0F0A06", color: "#FAFAF7" }}>
              <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
                ✦ Ihre Bestellung
              </p>
              <ul className="divide-y mb-6" style={{ borderColor: "rgba(250,250,247,0.12)" }}>
                {order.items.map((item) => (
                  <li key={item.id} className="flex gap-3 py-3">
                    {item.productImageUrl && (
                      <div className="relative w-14 h-16 flex-shrink-0 overflow-hidden" style={{ background: "#1A1208" }}>
                        <Image src={item.productImageUrl} alt={item.productTitle} fill className="object-cover" sizes="64px" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-sm leading-tight truncate" style={{ color: "#FAFAF7" }}>
                        {item.productTitle}
                      </p>
                      <p className="text-[11px] font-mono mt-1" style={{ color: "#D2C9B5" }}>
                        {item.quantity} × {formatPrice(item.unitPriceCents)}
                      </p>
                    </div>
                    <p className="font-mono text-sm" style={{ color: "#FAFAF7" }}>
                      {formatPrice(item.subtotalCents)}
                    </p>
                  </li>
                ))}
              </ul>

              <dl className="space-y-2 text-sm pt-4" style={{ borderTop: "1px solid rgba(250,250,247,0.18)" }}>
                <SummaryRow label="Zwischensumme" value={formatPrice(order.subtotalCents)} />
                <SummaryRow
                  label="Versand"
                  value={order.shippingCents === 0 ? "Gratis" : formatPrice(order.shippingCents)}
                />
                {order.discountCents > 0 && (
                  <SummaryRow
                    label={`Rabatt (${order.discountCode})`}
                    value={`-${formatPrice(order.discountCents)}`}
                    accent="#C9A06E"
                  />
                )}
              </dl>

              <div
                className="flex items-baseline justify-between pt-4 mt-4 mb-2"
                style={{ borderTop: "1px solid rgba(250,250,247,0.18)" }}
              >
                <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#D2C9B5" }}>
                  Gesamt
                </span>
                <span className="font-serif text-2xl" style={{ color: "#FAFAF7" }}>
                  {formatPrice(order.totalCents)}
                </span>
              </div>

              {isPending && (
                <p className="text-[11px] mt-4" style={{ color: "#D2C9B5" }}>
                  Zahlungsstatus: {order.paymentStatus}
                </p>
              )}
            </div>

            <Link
              href={`/bestellung/status/${order.publicToken}`}
              className="block mt-4 text-center text-[11px] uppercase tracking-[0.15em] pb-1"
              style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
            >
              Status verfolgen →
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt style={{ color: "#D2C9B5" }}>{label}</dt>
      <dd className="font-mono" style={{ color: accent ?? "#FAFAF7" }}>
        {value}
      </dd>
    </div>
  );
}

function NotFoundView() {
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
          Der Bestätigungs-Link ist ungültig oder veraltet. Bei Fragen schreiben Sie uns direkt.
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

function CanceledView() {
  return (
    <main style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto px-6 md:px-12 py-32 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
          ✦ Bestellung abgebrochen
        </p>
        <h1 className="font-serif text-3xl md:text-4xl mb-6" style={{ color: "#0F0A06" }}>
          Kein Problem.
        </h1>
        <p className="text-base md:text-lg mb-10" style={{ color: "#5A4A3A" }}>
          Ihr Warenkorb ist noch da. Sie können die Bestellung jederzeit fortsetzen.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/warenkorb"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ background: "#0F0A06", color: "#FAFAF7" }}
          >
            Warenkorb öffnen
          </Link>
          <Link
            href="/produkte"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-[11px] uppercase tracking-[0.15em]"
            style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
          >
            Weiter stöbern
          </Link>
        </div>
      </div>
    </main>
  );
}
