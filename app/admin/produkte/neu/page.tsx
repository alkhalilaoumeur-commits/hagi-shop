import { requireAdmin } from "@/lib/services/admin-auth";
import { ProductCreateForm } from "./ProductCreateForm";

export const dynamic = "force-dynamic";

export default async function NeuesProduktPage() {
  // Server-seitiger Guard: ohne gültige Session → Redirect zum Login,
  // bevor überhaupt etwas gerendert wird (kein Verlass auf Client-State).
  await requireAdmin();
  return <ProductCreateForm />;
}
