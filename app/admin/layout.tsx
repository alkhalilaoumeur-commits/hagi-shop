import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentAdmin } from "@/lib/services/admin-auth";
import { logoutAdminAction } from "@/app/actions/admin-auth";

export const metadata: Metadata = {
  title: "Admin | Hagi",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Übersicht" },
  { href: "/admin/bestellungen", label: "Bestellungen" },
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
    <div style={{ background: "#FAFAF7", minHeight: "100vh" }}>
      <header
        className="sticky top-0 z-30"
        style={{ background: "#0F0A06", color: "#FAFAF7", borderBottom: "1px solid #2A1E12" }}
      >
        <div className="max-w-page mx-auto px-6 md:px-10 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link
              href="/admin"
              className="font-serif text-xl font-semibold tracking-[0.18em]"
              style={{ color: "#FAFAF7" }}
            >
              HAGI<span style={{ color: "#A33B2A" }}>.</span>
            </Link>
            <span
              className="text-[10px] uppercase tracking-[0.22em] hidden md:inline-block px-2 py-0.5"
              style={{ background: "#A33B2A", color: "#FAFAF7" }}
            >
              Admin
            </span>
            <nav className="hidden md:flex items-center gap-5">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[11px] uppercase tracking-[0.15em] transition-opacity hover:opacity-70"
                  style={{ color: "#D2C9B5" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <form action={logoutAdminAction} className="flex items-center gap-3">
            <span
              className="hidden md:inline-block text-[11px] uppercase tracking-[0.15em]"
              style={{ color: "#8A7866" }}
            >
              {admin.displayName ?? admin.email}
            </span>
            <button
              type="submit"
              className="text-[10px] uppercase tracking-[0.18em] pb-0.5 transition-opacity hover:opacity-70"
              style={{ color: "#B89968", borderBottom: "1px solid #B89968" }}
            >
              Abmelden
            </button>
          </form>
        </div>

        <nav className="md:hidden flex items-center gap-4 max-w-page mx-auto px-6 pb-3 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[11px] uppercase tracking-[0.15em] whitespace-nowrap"
              style={{ color: "#D2C9B5" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-page mx-auto px-6 md:px-10 py-10">{children}</main>
    </div>
  );
}
