import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Audit-Trail.
 * Pflicht für DSGVO + Buchhaltung. Wer hat wann was an einer Bestellung gemacht?
 */

export type ActorType = "customer" | "admin" | "system" | "webhook";

export interface AuditEvent {
  actorType: ActorType;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAudit(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: event.actorType,
        actorId: event.actorId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        beforeData: event.before ?? Prisma.DbNull,
        afterData: event.after ?? Prisma.DbNull,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent?.slice(0, 500) ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] write failed", err);
  }
}
