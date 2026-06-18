import Link from "next/link";
import type { Metadata } from "next";
import { requireCustomer } from "@/lib/services/customer-auth";
import { ChangePasswordForm } from "@/components/konto/ChangePasswordForm";

export const metadata: Metadata = { title: "Profil — Hagi Teppiche", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const customer = await requireCustomer();
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—";

  return (
    <main style={{ background: "#FAFAF7", minHeight: "70vh" }} className="px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/konto" className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#8A7866" }}>
          ← Mein Konto
        </Link>
        <h1 className="font-serif text-4xl mt-4 mb-10" style={{ color: "#0F0A06" }}>
          Profil
        </h1>

        <div className="p-6 mb-6" style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
          <p className="text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: "#B89968" }}>
            Kontodaten
          </p>
          <dl className="text-sm space-y-2" style={{ color: "#5A4A3A" }}>
            <div className="flex justify-between">
              <dt>Name</dt>
              <dd style={{ color: "#0F0A06" }}>{fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt>E-Mail</dt>
              <dd className="font-mono" style={{ color: "#0F0A06" }}>{customer.email}</dd>
            </div>
          </dl>
        </div>

        <div className="p-6" style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
          <p className="text-[10px] uppercase tracking-[0.18em] mb-4" style={{ color: "#B89968" }}>
            Passwort ändern
          </p>
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
