import Link from "next/link";
import type { Metadata } from "next";
import { requireCustomer } from "@/lib/services/customer-auth";
import { listAddresses } from "@/lib/services/customer-address";
import { AddressBook, type AddressView } from "@/components/konto/AddressBook";

export const metadata: Metadata = { title: "Meine Adressen — Hagi Teppiche", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdressenPage() {
  const customer = await requireCustomer();
  const rows = await listAddresses(customer.id);
  const addresses: AddressView[] = rows.map((a) => ({
    id: a.id,
    label: a.label,
    firstName: a.firstName,
    lastName: a.lastName,
    company: a.company,
    street1: a.street1,
    street2: a.street2,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    countryCode: a.countryCode,
    phone: a.phone,
    isDefaultBilling: a.isDefaultBilling,
    isDefaultShipping: a.isDefaultShipping,
  }));

  return (
    <main style={{ background: "#FAFAF7", minHeight: "70vh" }} className="px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/konto" className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#8A7866" }}>
          ← Mein Konto
        </Link>
        <h1 className="font-serif text-4xl mt-4 mb-10" style={{ color: "#0F0A06" }}>
          Meine Adressen
        </h1>
        <AddressBook addresses={addresses} />
      </div>
    </main>
  );
}
