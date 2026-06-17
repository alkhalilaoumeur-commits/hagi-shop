"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/services/admin-auth";
import { markOrderShipped, markOrderDelivered, cancelOrder, markReturnReceived, refundWithdrawnOrder } from "@/lib/services/order-lifecycle";
import { extractIp } from "@/lib/services/rate-limit";

const shipSchema = z.object({
  orderId: z.string().min(1).max(128),
  trackingNumber: z.string().min(3).max(64),
  carrier: z.string().min(2).max(32),
  trackingUrl: z.string().url().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const orderIdSchema = z.object({
  orderId: z.string().min(1).max(128),
});

const cancelSchema = z.object({
  orderId: z.string().min(1).max(128),
  reason: z.string().min(2).max(200),
  refundCents: z.number().int().min(0).max(1_000_000).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

async function actorContext() {
  const admin = await requireAdmin();
  const h = await headers();
  return {
    admin,
    actorType: "admin" as const,
    actorId: admin.id,
    ipAddress: extractIp(h),
    userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
  };
}

export async function adminMarkShipped(rawInput: unknown): Promise<ActionResult> {
  const parsed = shipSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const ctx = await actorContext();
  try {
    await markOrderShipped(
      parsed.data.orderId,
      {
        trackingNumber: parsed.data.trackingNumber,
        carrier: parsed.data.carrier,
        trackingUrl: parsed.data.trackingUrl,
        notes: parsed.data.notes,
      },
      { actorType: ctx.actorType, actorId: ctx.actorId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
    );
    revalidatePath(`/admin/bestellungen/${parsed.data.orderId}`);
    revalidatePath("/admin/bestellungen");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 80) : "UNKNOWN" };
  }
}

export async function adminMarkDelivered(rawInput: unknown): Promise<ActionResult> {
  const parsed = orderIdSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const ctx = await actorContext();
  try {
    await markOrderDelivered(parsed.data.orderId, {
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    revalidatePath(`/admin/bestellungen/${parsed.data.orderId}`);
    revalidatePath("/admin/bestellungen");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 80) : "UNKNOWN" };
  }
}

export async function adminCancelOrder(rawInput: unknown): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const ctx = await actorContext();
  try {
    await cancelOrder(
      parsed.data.orderId,
      {
        reason: parsed.data.reason,
        refundCents: parsed.data.refundCents,
      },
      { actorType: ctx.actorType, actorId: ctx.actorId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
    );
    revalidatePath(`/admin/bestellungen/${parsed.data.orderId}`);
    revalidatePath("/admin/bestellungen");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 80) : "UNKNOWN" };
  }
}

const returnReceivedSchema = z.object({
  orderId: z.string().min(1).max(128),
  trackingNumber: z.string().max(200).optional().nullable(),
});

export async function adminMarkReturnReceived(rawInput: unknown): Promise<ActionResult> {
  const parsed = returnReceivedSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const ctx = await actorContext();
  try {
    await markReturnReceived(
      parsed.data.orderId,
      { trackingNumber: parsed.data.trackingNumber },
      { actorType: ctx.actorType, actorId: ctx.actorId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
    );
    revalidatePath(`/admin/bestellungen/${parsed.data.orderId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 80) : "UNKNOWN" };
  }
}

const refundWithdrawalSchema = z.object({
  orderId: z.string().min(1).max(128),
  refundCents: z.number().int().positive().max(10_000_000),
});

export async function adminRefundWithdrawal(rawInput: unknown): Promise<ActionResult> {
  const parsed = refundWithdrawalSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const ctx = await actorContext();
  try {
    await refundWithdrawnOrder(
      parsed.data.orderId,
      { refundCents: parsed.data.refundCents },
      { actorType: ctx.actorType, actorId: ctx.actorId, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
    );
    revalidatePath(`/admin/bestellungen/${parsed.data.orderId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 80) : "UNKNOWN" };
  }
}

const noteSchema = z.object({
  orderId: z.string().min(1).max(128),
  note: z.string().max(2000),
});

export async function adminUpdateInternalNote(rawInput: unknown): Promise<ActionResult> {
  const parsed = noteSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  await requireAdmin();
  const { default: prisma } = await import("@/lib/prisma");
  await prisma.order.update({
    where: { id: parsed.data.orderId },
    data: { internalNote: parsed.data.note || null },
  });
  revalidatePath(`/admin/bestellungen/${parsed.data.orderId}`);
  return { ok: true };
}
