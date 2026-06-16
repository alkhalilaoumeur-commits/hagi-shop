import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Kasse | Hagi Teppiche",
  description: "Sichere Bestellung bei Hagi Teppiche — Direktimporteur Stuttgart.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <main style={{ background: "#FAFAF7" }}>
      <CheckoutForm />
    </main>
  );
}
