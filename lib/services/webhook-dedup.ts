import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Webhook-Dedup-Helper. Race-safe via UNIQUE constraint + create-first pattern.
 *
 * Stripe sendet jeden Event bis zu 30x bei Retries. Ohne Dedup verarbeiten wir
 * Bestellungen mehrfach.
 */

const MAX_PAYLOAD_BYTES = 100_000;
const MAX_SIGNATURE_LENGTH = 512;

export interface WebhookRecord {
  alreadyProcessed: boolean;
  recordId: string;
}

interface RecordReceiveInput {
  provider: string;
  providerEventId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  signature?: string;
}

function isUniqueViolation(err: unknown): boolean {
  return Boolean(
    err && typeof err === "object" && "code" in err && (err as { code?: unknown }).code === "P2002",
  );
}

export async function recordReceive(input: RecordReceiveInput): Promise<WebhookRecord> {
  const payloadBytes = Buffer.byteLength(JSON.stringify(input.payload), "utf8");
  if (payloadBytes > MAX_PAYLOAD_BYTES) {
    throw new Error("WEBHOOK_PAYLOAD_TOO_LARGE");
  }

  if (
    typeof input.provider !== "string" ||
    !input.provider ||
    input.provider.length > 32
  ) {
    throw new Error("INVALID_PROVIDER");
  }

  if (
    typeof input.providerEventId !== "string" ||
    !input.providerEventId ||
    input.providerEventId.length > 255
  ) {
    throw new Error("INVALID_PROVIDER_EVENT_ID");
  }

  const signature = input.signature?.slice(0, MAX_SIGNATURE_LENGTH);

  try {
    const created = await prisma.paymentEvent.create({
      data: {
        provider: input.provider,
        providerEventId: input.providerEventId,
        eventType: input.eventType.slice(0, 128),
        payload: input.payload,
        signature,
      },
      select: { id: true },
    });
    return { alreadyProcessed: false, recordId: created.id };
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // Concurrent insert just happened — load existing record
    const existing = await prisma.paymentEvent.findUnique({
      where: { providerEventId: input.providerEventId },
      select: { id: true, processedAt: true },
    });
    if (!existing) {
      throw new Error("WEBHOOK_RECORD_NOT_FOUND_AFTER_CONFLICT");
    }
    return {
      alreadyProcessed: existing.processedAt !== null,
      recordId: existing.id,
    };
  }
}

export async function markProcessed(recordId: string, orderId?: string): Promise<void> {
  await prisma.paymentEvent.update({
    where: { id: recordId },
    data: {
      processedAt: new Date(),
      orderId: orderId ?? null,
      lastError: null,
    },
  });
}

export async function markError(recordId: string, error: string): Promise<void> {
  await prisma.paymentEvent.update({
    where: { id: recordId },
    data: {
      retryCount: { increment: 1 },
      lastError: error.slice(0, 1000),
    },
  });
}
