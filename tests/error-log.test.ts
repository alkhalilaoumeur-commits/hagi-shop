import { describe, it, expect, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import { logError, cleanupErrorLogs } from "@/lib/services/error-log";

const TEST_SOURCE = "test/error-log";

afterEach(async () => {
  await prisma.errorLog.deleteMany({ where: { source: TEST_SOURCE } });
});

describe("logError", () => {
  it("persistiert Error mit Message + Stack (Happy)", async () => {
    await logError({ source: TEST_SOURCE, error: new Error("Boom kaputt"), context: { op: "x" } });

    const row = await prisma.errorLog.findFirst({
      where: { source: TEST_SOURCE },
      orderBy: { createdAt: "desc" },
    });
    expect(row).not.toBeNull();
    expect(row!.message).toBe("Boom kaputt");
    expect(row!.stack).toContain("Error: Boom kaputt");
    expect(row!.context).toEqual({ op: "x" });
  });

  it("verarbeitet Nicht-Error-Werte (String-Fallback)", async () => {
    await logError({ source: TEST_SOURCE, error: "nur ein String" });
    const row = await prisma.errorLog.findFirst({ where: { source: TEST_SOURCE } });
    expect(row!.message).toBe("nur ein String");
    expect(row!.stack).toBeNull();
  });

  it("wirft NIE — Logging darf den Request nicht killen", async () => {
    // Übergroße/ungewöhnliche Eingaben dürfen nicht zum Throw führen.
    await expect(
      logError({ source: "x".repeat(500), error: new Error("y".repeat(5000)) }),
    ).resolves.toBeUndefined();
    await prisma.errorLog.deleteMany({ where: { source: { startsWith: "xxxx" } } });
  });
});

describe("cleanupErrorLogs", () => {
  it("löscht Einträge älter als der Schwellwert", async () => {
    await prisma.errorLog.create({
      data: { source: TEST_SOURCE, message: "alt", createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) },
    });
    await prisma.errorLog.create({ data: { source: TEST_SOURCE, message: "neu" } });

    const removed = await cleanupErrorLogs(90);
    expect(removed).toBeGreaterThanOrEqual(1);

    const remaining = await prisma.errorLog.findMany({ where: { source: TEST_SOURCE } });
    expect(remaining.every((r) => r.message !== "alt")).toBe(true);
  });
});
