import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { WhatsAppBerater } from "@/components/layout/WhatsAppBerater";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { APP_URL } from "@/lib/config";

// TODO: Domain + Shopname nach Klärungsgespräch anpassen
export const metadata: Metadata = {
  title: {
    default: "Hagi Teppiche — Orientalische Teppiche Stuttgart",
    template: "%s | Hagi Teppiche",
  },
  description:
    "Hochwertige orientalische und moderne Teppiche in Stuttgart. Direkt vom Importeur — Kelim, Persian, Handgeknüpft. Versand oder Selbstabholung.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Hagi Teppiche",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <AnnouncementBar />
        <Navbar />
        <main>{children}</main>
        <Footer />
        <WhatsAppBerater />
        <CookieBanner />
      </body>
    </html>
  );
}
