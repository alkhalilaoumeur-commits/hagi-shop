import Link from "next/link";
import type { Metadata } from "next";
import { Package, MapPin, UserCog } from "lucide-react";
import { requireCustomer } from "@/lib/services/customer-auth";
import prisma from "@/lib/prisma";
import { LogoutButton } from "@/components/konto/LogoutButton";

export const metadata: Metadata = { title: "Mein Konto — Hagi Teppiche", robots: { index: false } };
export const dynamic = "force-dynamic";

const TILES = [
  { href: "/konto/bestellungen", icon: Package, label: "Bestellungen", desc: "Status & Historie" },
  { href: "/konto/adressen", icon: MapPin, label: "Adressen", desc: "Liefer- & Rechnungsadressen" },
  { href: "/konto/profil", icon: UserCog, label: "Profil", desc: "Passwort ändern" },
];

export default async function KontoDashboard() {
  const customer = await requireCustomer();
  const orderCount = await prisma.order.count({ where: { customerId: customer.id } });
  const name = customer.firstName ?? customer.email;

  return (
    <main style={{ background: "#FAFAF7", minHeight: "70vh" }} className="px-6 py-16">
      <div className="max-w-page mx-auto">
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
              ✦ Mein Konto
            </p>
            <h1 className="font-serif text-4xl" style={{ color: "#0F0A06" }}>
              Willkommen, {name}.
            </h1>
            <p className="text-sm mt-2" style={{ color: "#5A4A3A" }}>
              {orderCount === 0
                ? "Sie haben noch keine Bestellungen."
                : `${orderCount} Bestellung${orderCount === 1 ? "" : "en"} in Ihrer Historie.`}
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {TILES.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="p-6 block transition-colors hover:bg-white"
                style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}
              >
                <Icon className="w-6 h-6 mb-4" style={{ color: "#A33B2A" }} />
                <p className="font-serif text-xl" style={{ color: "#0F0A06" }}>
                  {t.label}
                </p>
                <p className="text-sm mt-1" style={{ color: "#8A7866" }}>
                  {t.desc}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
