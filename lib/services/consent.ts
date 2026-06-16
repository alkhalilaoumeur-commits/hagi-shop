import prisma from "@/lib/prisma";
import type { ConsentType } from "@prisma/client";

/**
 * Consent-Versionen.
 * Wenn AGB/Datenschutz geändert werden, hier hochzählen → Customer
 * muss neu zustimmen.
 */
export const CONSENT_VERSIONS = {
  TERMS: "1.0",
  PRIVACY: "1.0",
  WITHDRAWAL: "1.0",
  NEWSLETTER: "1.0",
  COOKIES_ANALYTICS: "1.0",
  COOKIES_MARKETING: "1.0",
} as const;

export interface ConsentEvent {
  customerId?: string | null;
  orderId?: string | null;
  consentType: ConsentType;
  granted: boolean;
  text?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logConsent(event: ConsentEvent): Promise<void> {
  await prisma.consentLog.create({
    data: {
      customerId: event.customerId ?? null,
      orderId: event.orderId ?? null,
      consentType: event.consentType,
      consentVersion: CONSENT_VERSIONS[event.consentType],
      granted: event.granted,
      text: event.text ?? null,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent?.slice(0, 500) ?? null,
    },
  });
}
