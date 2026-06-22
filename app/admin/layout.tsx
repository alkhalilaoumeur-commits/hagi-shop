import type { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/services/admin-auth";
import { logoutAdminAction } from "@/app/actions/admin-auth";
import { AdminSidebar, type NavItem } from "@/components/admin/ui/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin | Hagi",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NAV: NavItem[] = [
  { href: "/admin", label: "Übersicht" },
  { href: "/admin/bestellungen", label: "Bestellungen" },
  { href: "/admin/produkte", label: "Produkte" },
  { href: "/admin/bestellung-anlegen", label: "Showroom-Verkauf" },
  { href: "/admin/audit", label: "Audit-Log" },
  { href: "/admin/export", label: "CSV-Export" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();

  // Auf /admin/login zeigt das Layout NUR die Page (kein Chrome)
  if (!admin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <AdminSidebar
        nav={NAV}
        adminName={admin.displayName ?? admin.email}
        logoutAction={logoutAdminAction}
      />
      <main className="lg:pl-[240px]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-10">{children}</div>
      </main>
    </div>
  );
}
