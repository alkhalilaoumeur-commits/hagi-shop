import { describe, it, expect, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import {
  findOverdueWithdrawalRefunds,
  groupByStage,
  REMINDER_DAY,
  URGENT_DAY,
  OVERDUE_DAY,
  REFUND_DEADLINE_DAYS,
} from "@/lib/services/refund-reminders";
import { makeOrder, cleanupOrder } from "./_helpers/factory";

async function setWithdrawalAge(orderId: string, daysAgo: number) {
  const withdrawalRequestedAt = new Date(Date.now() - daysAgo * 86400 * 1000);
  await prisma.order.update({
    where: { id: orderId },
    data: { withdrawalRequestedAt },
  });
}

describe("Refund-Reminder — Stage-Klassifikation", () => {
  const ids: string[] = [];

  afterEach(async () => {
    for (const id of ids) await cleanupOrder(id);
    ids.length = 0;
  });

  it("Order < 9d alt: nicht in der Liste", async () => {
    const { order } = await makeOrder({ paymentStatus: "PAID" });
    ids.push(order.id);
    await setWithdrawalAge(order.id, 5);
    const all = await findOverdueWithdrawalRefunds();
    expect(all.find((r) => r.orderId === order.id)).toBeUndefined();
  });

  it("Order 9d alt: REMINDER", async () => {
    const { order } = await makeOrder({ paymentStatus: "PAID" });
    ids.push(order.id);
    await setWithdrawalAge(order.id, REMINDER_DAY);
    const all = await findOverdueWithdrawalRefunds();
    const found = all.find((r) => r.orderId === order.id);
    expect(found?.stage).toBe("REMINDER");
    expect(found?.daysRemaining).toBe(REFUND_DEADLINE_DAYS - REMINDER_DAY);
  });

  it("Order 12d alt: URGENT", async () => {
    const { order } = await makeOrder({ paymentStatus: "PAID" });
    ids.push(order.id);
    await setWithdrawalAge(order.id, URGENT_DAY);
    const all = await findOverdueWithdrawalRefunds();
    expect(all.find((r) => r.orderId === order.id)?.stage).toBe("URGENT");
  });

  it("Order 15d alt: OVERDUE + daysRemaining=0", async () => {
    const { order } = await makeOrder({ paymentStatus: "PAID" });
    ids.push(order.id);
    await setWithdrawalAge(order.id, OVERDUE_DAY + 1);
    const all = await findOverdueWithdrawalRefunds();
    const found = all.find((r) => r.orderId === order.id);
    expect(found?.stage).toBe("OVERDUE");
    expect(found?.daysRemaining).toBe(0);
  });

  it("Voll refundierte Order: nicht in der Liste", async () => {
    const { order } = await makeOrder({ paymentStatus: "REFUNDED", totalCents: 1000 });
    ids.push(order.id);
    await prisma.order.update({
      where: { id: order.id },
      data: { withdrawalRequestedAt: new Date(Date.now() - 10 * 86400 * 1000), refundedCents: 1000 },
    });
    const all = await findOverdueWithdrawalRefunds();
    expect(all.find((r) => r.orderId === order.id)).toBeUndefined();
  });

  it("Order ohne Widerruf-Antrag: nicht in der Liste", async () => {
    const { order } = await makeOrder({ paymentStatus: "PAID" });
    ids.push(order.id);
    // kein setWithdrawalAge → withdrawalRequestedAt bleibt null
    const all = await findOverdueWithdrawalRefunds();
    expect(all.find((r) => r.orderId === order.id)).toBeUndefined();
  });

  it("Teil-Refund: bleibt in Liste mit offenem Restbetrag", async () => {
    const { order } = await makeOrder({ paymentStatus: "PARTIALLY_REFUNDED", totalCents: 100000 });
    ids.push(order.id);
    await setWithdrawalAge(order.id, REMINDER_DAY);
    await prisma.order.update({ where: { id: order.id }, data: { refundedCents: 30000 } });

    const all = await findOverdueWithdrawalRefunds();
    const found = all.find((r) => r.orderId === order.id);
    expect(found).toBeDefined();
    expect(found?.totalCents).toBe(100000);
    expect(found?.refundedCents).toBe(30000);
  });
});

describe("Refund-Reminder — Sortierung + Gruppierung", () => {
  const ids: string[] = [];

  afterEach(async () => {
    for (const id of ids) await cleanupOrder(id);
    ids.length = 0;
  });

  it("Sortiert nach daysSinceWithdrawal absteigend (älteste zuerst)", async () => {
    const [a, b, c] = await Promise.all([
      makeOrder({ paymentStatus: "PAID" }),
      makeOrder({ paymentStatus: "PAID" }),
      makeOrder({ paymentStatus: "PAID" }),
    ]);
    ids.push(a.order.id, b.order.id, c.order.id);
    await setWithdrawalAge(a.order.id, 10);
    await setWithdrawalAge(b.order.id, 14);
    await setWithdrawalAge(c.order.id, 9);

    const all = await findOverdueWithdrawalRefunds();
    const ours = all.filter((r) => ids.includes(r.orderId));
    expect(ours[0].orderId).toBe(b.order.id); // 14d
    expect(ours[1].orderId).toBe(a.order.id); // 10d
    expect(ours[2].orderId).toBe(c.order.id); // 9d
  });

  it("groupByStage liefert alle 3 Buckets, leere als []", () => {
    const refunds = [
      { stage: "REMINDER" as const } as never,
      { stage: "OVERDUE" as const } as never,
      { stage: "OVERDUE" as const } as never,
    ];
    const g = groupByStage(refunds);
    expect(g.REMINDER.length).toBe(1);
    expect(g.URGENT.length).toBe(0);
    expect(g.OVERDUE.length).toBe(2);
  });
});

describe("Refund-Reminder — Cron-Endpoint", () => {
  let orderId: string;

  beforeEach(async () => {
    const { order } = await makeOrder({ paymentStatus: "PAID" });
    orderId = order.id;
    await setWithdrawalAge(orderId, REMINDER_DAY);
  });

  afterEach(async () => {
    await cleanupOrder(orderId);
  });

  async function callEndpoint(headers: Record<string, string> = {}) {
    const { GET } = await import("@/app/api/cron/refund-reminder/route");
    const req = new Request("http://localhost/api/cron/refund-reminder", {
      method: "GET",
      headers,
    });
    const res = await GET(req as unknown as Parameters<typeof GET>[0]);
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  }

  it("Ohne Authorization-Header → 401", async () => {
    process.env.CRON_SECRET = "test-secret-aaa";
    const r = await callEndpoint();
    expect(r.status).toBe(401);
  });

  it("Mit falschem Bearer → 401", async () => {
    process.env.CRON_SECRET = "test-secret-aaa";
    const r = await callEndpoint({ authorization: "Bearer wrong" });
    expect(r.status).toBe(401);
  });

  it("Ohne CRON_SECRET in env → 503 cron_disabled", async () => {
    delete process.env.CRON_SECRET;
    const r = await callEndpoint();
    expect(r.status).toBe(503);
    expect(r.body.error).toBe("cron_disabled");
  });

  it("Mit korrektem Bearer + pending refund → 200, pending > 0", async () => {
    process.env.CRON_SECRET = "test-secret-aaa";
    const r = await callEndpoint({ authorization: "Bearer test-secret-aaa" });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(Number(r.body.pending)).toBeGreaterThanOrEqual(1);
  });

  it("AuditLog 'cron.refund_reminder_sent' wenn refunds gefunden", async () => {
    process.env.CRON_SECRET = "test-secret-aaa";
    await callEndpoint({ authorization: "Bearer test-secret-aaa" });
    const audit = await prisma.auditLog.findFirst({
      where: { action: "cron.refund_reminder_sent" },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
  });
});
