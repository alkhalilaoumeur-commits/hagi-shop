import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/services/admin-auth";
import { ManualOrderForm } from "@/components/admin/ManualOrderForm";

export const dynamic = "force-dynamic";

export default async function ManualOrderPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    where: { inStock: true },
    select: { id: true, name: true, sku: true, price: true, isUnique: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
          ✦ Showroom-Verkauf
        </p>
        <h1 className="font-serif" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#0F0A06" }}>
          Manuelle Bestellung anlegen
        </h1>
        <p className="text-base mt-3" style={{ color: "#5A4A3A" }}>
          Walk-in-Kunde im Showroom. Stück wird sofort aus dem Online-Lager genommen (bei Unikaten:
          inStock = false). Rechnung kann später als PDF runtergeladen werden.
        </p>
      </header>

      <ManualOrderForm products={products} />
    </div>
  );
}
