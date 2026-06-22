import Link from "next/link";
import { requireAdminAuth } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { AdminLink } from "@/components/admin/ui/AdminButton";

export const dynamic = "force-dynamic";

export default async function AdminProduktListePage() {
  await requireAdminAuth();

  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Sortiment"
        title={`Produkte (${products.length})`}
        action={
          <AdminLink href="/admin/produkte/neu" variant="primary" size="sm">
            + Neues Produkt
          </AdminLink>
        }
      />

      <Card className="divide-y divide-border">
        {products.length === 0 && (
          <p className="px-5 py-6 text-muted text-sm">Noch keine Produkte. Lege das erste Produkt an.</p>
        )}
        {products.map((product) => (
          <div key={product.id} className="px-5 py-4 flex items-center gap-4">
            {/* Bild */}
            <div className="w-12 h-14 bg-bg-sand flex-shrink-0 overflow-hidden">
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-border" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{product.name}</p>
              <p className="text-xs text-muted">{product.category.name}</p>
              {product.sizeWidth && product.sizeLength && (
                <p className="text-xs text-muted">{product.sizeWidth}×{product.sizeLength} cm</p>
              )}
            </div>

            {/* Status */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <p className="text-sm font-semibold font-mono text-ink">{formatPrice(product.price)}</p>
              <div className="flex gap-1.5">
                {product.featured && <StatusBadge label="Featured" tone="neutral" />}
                <StatusBadge
                  label={product.inStock ? "Verfügbar" : "Ausverkauft"}
                  tone={product.inStock ? "success" : "danger"}
                />
              </div>
            </div>

            {/* Aktionen */}
            <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
              <Link
                href={`/admin/produkte/${product.id}`}
                className="text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink border border-border px-3 py-1.5 transition-colors"
              >
                Bearbeiten
              </Link>
              <DeleteProductButton productId={product.id} productName={product.name} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
