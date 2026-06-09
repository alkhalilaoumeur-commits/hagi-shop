import Link from "next/link";
import { requireAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";

export const dynamic = "force-dynamic";

export default async function AdminProduktListePage() {
  await requireAdminAuth();

  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-ink text-bg px-6 py-4 flex items-center justify-between">
        <h1 className="font-serif text-lg">
          Hagi <span className="text-gold">Admin</span>
        </h1>
        <nav className="flex gap-6 text-sm">
          <Link href="/admin" className="hover:text-gold">Dashboard</Link>
          <Link href="/admin/produkte" className="text-gold">Produkte</Link>
          <Link href="/admin/bestellungen" className="hover:text-gold">Bestellungen</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl text-ink">Produkte ({products.length})</h2>
          <Link
            href="/admin/produkte/neu"
            className="bg-green text-white px-5 py-2.5 text-sm font-medium hover:bg-green/90 transition-colors"
          >
            + Neues Produkt
          </Link>
        </div>

        <div className="bg-bg border border-border divide-y divide-border">
          {products.length === 0 && (
            <p className="px-4 py-6 text-muted text-sm">Noch keine Produkte. Lege das erste Produkt an.</p>
          )}
          {products.map((product) => (
            <div key={product.id} className="px-4 py-3 flex items-center gap-4">
              {/* Bild */}
              <div className="w-12 h-14 bg-surface rounded-sm flex-shrink-0 overflow-hidden">
                {product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-border" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">{product.name}</p>
                <p className="text-xs text-muted">{product.category.name}</p>
                {product.sizeWidth && product.sizeLength && (
                  <p className="text-xs text-muted">{product.sizeWidth}×{product.sizeLength} cm</p>
                )}
              </div>

              {/* Status */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <p className="text-sm font-semibold text-gold">{formatPrice(product.price)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-sm ${
                  product.inStock
                    ? "bg-green/10 text-green"
                    : "bg-signal/10 text-signal"
                }`}>
                  {product.inStock ? "Verfügbar" : "Ausverkauft"}
                </span>
                {product.featured && (
                  <span className="text-xs px-2 py-0.5 bg-gold/10 text-gold rounded-sm">
                    Featured
                  </span>
                )}
              </div>

              {/* Aktionen */}
              <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                <Link
                  href={`/admin/produkte/${product.id}`}
                  className="text-xs text-muted hover:text-ink border border-border px-2 py-1"
                >
                  Bearbeiten
                </Link>
                <Link
                  href={`/produkte/${product.slug}`}
                  target="_blank"
                  className="text-xs text-muted hover:text-gold border border-border px-2 py-1"
                >
                  Ansehen
                </Link>
                <DeleteProductButton productId={product.id} productName={product.name} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
