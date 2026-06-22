"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Linke Navigations-Sidebar des Admin (Desktop) bzw. Top-Leiste (Mobil).
 * Client-Component, weil sie via usePathname den aktiven Menüpunkt hervorhebt.
 * Auth + Logout-Action kommen als Props vom Server-Layout.
 */

export type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminSidebar({
  nav,
  adminName,
  logoutAction,
}: {
  nav: NavItem[];
  adminName: string;
  logoutAction: () => void | Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <aside className="lg:fixed lg:inset-y-0 lg:left-0 lg:w-[240px] lg:flex lg:flex-col bg-ink text-bone z-30">
      {/* Logo + Admin-Badge */}
      <div className="px-6 py-5 flex items-center gap-3 border-b border-[#2A1E12]">
        <Link href="/admin" className="font-serif text-xl font-semibold tracking-[0.18em] text-bone">
          HAGI<span className="text-sienna">.</span>
        </Link>
        <span className="text-[9px] uppercase tracking-[0.22em] px-2 py-0.5 bg-sienna text-bone">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex lg:flex-col gap-1 px-3 py-4 overflow-x-auto lg:overflow-visible lg:flex-1">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap px-3 py-2.5 text-[11px] uppercase tracking-[0.15em] transition-colors ${
                active
                  ? "bg-[#1C140C] text-bone border-l-2 border-sienna"
                  : "text-[#D2C9B5] hover:text-bone hover:bg-[#1C140C] border-l-2 border-transparent"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Admin-Identität + Logout (unten) */}
      <div className="px-5 py-4 border-t border-[#2A1E12] flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.12em] text-[#8A7866] truncate">
          {adminName}
        </span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-[10px] uppercase tracking-[0.18em] pb-0.5 text-brass border-b border-brass hover:opacity-70 transition-opacity"
          >
            Abmelden
          </button>
        </form>
      </div>
    </aside>
  );
}
