import { requireAdmin } from "@/lib/services/admin-auth";
import { ProductEditForm } from "./ProductEditForm";

export const dynamic = "force-dynamic";

export default async function ProduktBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Server-seitiger Guard vor jedem Render.
  await requireAdmin();
  const { id } = await params;
  return <ProductEditForm id={id} />;
}
