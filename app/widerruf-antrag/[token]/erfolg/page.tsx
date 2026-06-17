import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Widerruf eingegangen — Hagi Teppiche",
  robots: { index: false, follow: false },
};

export default async function WiderrufErfolgPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16 || token.length > 64 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    notFound();
  }
  const order = await prisma.order.findUnique({
    where: { publicToken: token },
    select: { orderNumber: true, customerEmail: true, withdrawalRequestedAt: true },
  });
  if (!order || !order.withdrawalRequestedAt) notFound();

  return (
    <main
      className="min-h-[100dvh] px-6 py-24"
      style={{ background: "radial-gradient(ellipse at 15% 20%, #F6EEDB 0%, #EFE6D2 60%, #E8DEC4 100%)" }}
    >
      <div className="max-w-xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
          ✦ Widerruf eingegangen
        </p>
        <h1
          className="font-serif leading-[0.95] mb-6"
          style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)", color: "#0F0A06", letterSpacing: "-0.015em" }}
        >
          Erhalten —<br />
          <em style={{ color: "#A33B2A", fontStyle: "italic" }}>vielen Dank.</em>
        </h1>
        <p className="text-base md:text-lg leading-relaxed mb-10" style={{ color: "#5A4A3A" }}>
          Wir haben Ihren Widerruf für Bestellung{" "}
          <span className="font-mono">{order.orderNumber}</span> erhalten.
          Eine Bestätigung haben wir an{" "}
          <span style={{ color: "#0F0A06" }}>{order.customerEmail}</span> gesendet.
        </p>

        <div
          className="p-6 mb-10"
          style={{ background: "#FAFAF7", border: "1px solid #D9CDB8" }}
        >
          <p className="text-[10px] uppercase tracking-[0.22em] mb-4" style={{ color: "#5A4A3A" }}>
            Was jetzt passiert
          </p>
          <ol className="space-y-4 text-sm" style={{ color: "#5A4A3A" }}>
            <li className="flex gap-4">
              <span
                className="font-serif"
                style={{ fontSize: "1.6rem", color: "#A33B2A", lineHeight: "1" }}
              >
                01
              </span>
              <div>
                <p className="font-semibold mb-1" style={{ color: "#0F0A06" }}>
                  Rücksendeanweisungen
                </p>
                <p>
                  Wir melden uns binnen 1-2 Werktagen per E-Mail mit der Adresse + Anleitung
                  zum Rückversand.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span
                className="font-serif"
                style={{ fontSize: "1.6rem", color: "#A33B2A", lineHeight: "1" }}
              >
                02
              </span>
              <div>
                <p className="font-semibold mb-1" style={{ color: "#0F0A06" }}>
                  Rücksendung
                </p>
                <p>
                  Versand zahlt der Käufer (§ 357 Abs. 6 BGB). Bitte gut verpacken — der
                  Teppich ist wertvoll.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span
                className="font-serif"
                style={{ fontSize: "1.6rem", color: "#A33B2A", lineHeight: "1" }}
              >
                03
              </span>
              <div>
                <p className="font-semibold mb-1" style={{ color: "#0F0A06" }}>
                  Rückerstattung
                </p>
                <p>
                  Sobald der Teppich bei uns angekommen ist, läuft die Rückzahlung innerhalb von
                  14 Tagen auf Ihr ursprüngliches Zahlungsmittel — Kaufpreis inklusive
                  Hin-Versand.
                </p>
              </div>
            </li>
          </ol>
        </div>

        <Link
          href={`/bestellung/status/${token}`}
          className="inline-block text-[11px] uppercase tracking-[0.18em] font-semibold pb-1"
          style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
        >
          Bestellstatus ansehen →
        </Link>
      </div>
    </main>
  );
}
