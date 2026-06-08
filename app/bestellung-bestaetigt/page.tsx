import { CheckCircle } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function BestellungBestaetigtPage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  let order = null;
  if (session_id) {
    try {
      order = await prisma.order.findUnique({
        where: { stripeSessionId: session_id },
        include: { items: { include: { product: { select: { name: true, images: true } } } } },
      });
    } catch {
      // DB nicht erreichbar — zeige generische Seite
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Erfolgs-Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green" />
        </div>
        <h1 className="font-serif text-3xl text-ink mb-3">Vielen Dank!</h1>
        <p className="text-muted leading-relaxed max-w-md mx-auto">
          {order
            ? `Ihre Bestellung wurde erfolgreich entgegengenommen, ${order.customerName.split(" ")[0]}. Eine Bestätigungs-E-Mail wurde an ${order.customerEmail} gesendet.`
            : "Ihre Bestellung wurde erfolgreich entgegengenommen. Sie erhalten eine Bestätigungs-E-Mail mit allen Details."}
        </p>
      </div>

      {/* Bestelldetails */}
      {order && (
        <div className="bg-surface border border-border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg text-ink">Bestellübersicht</h2>
            <span className="text-xs text-muted font-mono">
              #{order.id.slice(-8).toUpperCase()}
            </span>
          </div>

          {/* Artikel */}
          <div className="space-y-4 mb-6">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                {item.product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-16 h-20 object-cover rounded-sm flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-20 bg-border rounded-sm flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{item.product.name}</p>
                  <p className="text-xs text-muted">Menge: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-ink flex-shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          {/* Lieferinfo */}
          <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-1">Lieferung</p>
              <p className="text-ink">
                {order.deliveryType === "PICKUP"
                  ? "Selbstabholung Stuttgart"
                  : order.shippingStreet
                  ? `${order.shippingStreet}, ${order.shippingZip} ${order.shippingCity}`
                  : "Versand"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-1">Gesamtbetrag</p>
              <p className="text-gold font-bold text-lg">{formatPrice(order.totalAmount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Weitere Infos */}
      <div className="text-sm text-muted text-center space-y-2 mb-8">
        <p>Wir bereiten Ihre Teppiche sorgfältig für den Versand vor.</p>
        <p>
          Fragen?{" "}
          <a href="mailto:kontakt@hagi-shop.de" className="text-gold hover:underline">
            kontakt@hagi-shop.de
          </a>
        </p>
      </div>

      <div className="flex justify-center">
        <Link
          href="/produkte"
          className="inline-block bg-green text-white px-8 py-3 text-sm font-medium hover:bg-green/90 transition-colors"
        >
          Weitere Teppiche entdecken
        </Link>
      </div>
    </div>
  );
}
