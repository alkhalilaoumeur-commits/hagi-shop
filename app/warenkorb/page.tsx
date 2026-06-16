import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "Warenkorb | Hagi Teppiche",
  description: "Ihr Warenkorb bei Hagi Teppiche — handgeknüpfte Premium-Teppiche aus Stuttgart.",
  robots: { index: false, follow: false },
};

export default function WarenkorbPage() {
  return (
    <main style={{ background: "#FAFAF7" }}>
      <CartView />
    </main>
  );
}
