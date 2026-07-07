import prisma from "@/lib/prisma";
import { logAudit } from "./audit";

/**
 * DSGVO Art. 17 — Anonymisierung eines Kundenkontos ("Recht auf Löschung").
 *
 * Entfernt alle Konto-bezogenen personenbezogenen Daten (Login, Adressbuch,
 * Sessions, Consent-IP/UA). Bestellungen werden vom Konto ENTKOPPELT, aber ihre
 * Rechnungs-Snapshots bleiben erhalten: § 147 AO / § 257 HGB verpflichten zur
 * 10-jährigen Aufbewahrung von Rechnungsdaten (Art. 17 Abs. 3 lit. b DSGVO —
 * Ausnahme vom Löschanspruch bei rechtlicher Aufbewahrungspflicht).
 *
 * Idempotent: bereits anonymisierte Konten werden übersprungen.
 */
export async function anonymizeCustomer(
  customerId: string,
  opts: { actorId?: string } = {},
): Promise<{ anonymized: boolean }> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, anonymizedAt: true },
  });
  if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
  if (customer.anonymizedAt) return { anonymized: false };

  const now = new Date();
  const placeholder = `anonymisiert-${customerId}@deleted.invalid`;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: {
        email: placeholder,
        emailVerifyTokenHash: null,
        passwordHash: null,
        passwordResetTokenHash: null,
        firstName: null,
        lastName: null,
        phone: null,
        lastLoginIp: null,
        companyName: null,
        vatId: null,
        deletedAt: now,
        anonymizedAt: now,
      },
    }),
    // Adressbuch = reine PII, nicht steuerrelevant → löschen
    prisma.customerAddress.deleteMany({ where: { customerId } }),
    // Aktive Sessions serverseitig widerrufen
    prisma.customerSession.updateMany({
      where: { customerId, revokedAt: null },
      data: { revokedAt: now },
    }),
    // Consent-Nachweis bleibt, aber IP/UA (PII) entfernen
    prisma.consentLog.updateMany({
      where: { customerId },
      data: { ipAddress: null, userAgent: null },
    }),
    // Bestellungen vom Konto entkoppeln — Rechnungsdaten bleiben für Steuer-Aufbewahrung
    prisma.order.updateMany({
      where: { customerId },
      data: { customerId: null },
    }),
  ]);

  await logAudit({
    actorType: opts.actorId ? "admin" : "system",
    actorId: opts.actorId,
    action: "customer.anonymized",
    entityType: "Customer",
    entityId: customerId,
  });

  return { anonymized: true };
}
