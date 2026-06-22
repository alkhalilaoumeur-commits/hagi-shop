import { requireAdmin } from "@/lib/services/admin-auth";
import { isTotpEnabled } from "@/lib/services/admin-2fa";
import { TwoFactorPanel } from "./TwoFactorPanel";

export const dynamic = "force-dynamic";

export default async function SicherheitPage() {
  const admin = await requireAdmin();
  const enabled = await isTotpEnabled(admin.id);
  return <TwoFactorPanel enabled={enabled} />;
}
