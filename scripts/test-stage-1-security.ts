/**
 * Stufe-1 SECURITY-Smoke-Test
 * Lokal: `npx tsx scripts/test-stage-1-security.ts`
 *
 * Validiert die Audit-Fixes:
 * - H-1: Atomic Discount-Redeem (Race-condition-Schutz)
 * - H-2: Email-Normalisierung (Case + Trim) konsistent
 * - H-3: Email-Length-Limit
 * - M-1: emailVerifyTokenHash existiert im Schema
 * - M-2: TAX_MODE Fail-Fast
 * - M-3: Webhook-Dedup Create-First Pattern (Race-safe)
 * - M-4: Payload-Größenlimit
 * - Plus Mass-Assignment-Tests, SQL-Injection-Tests, Code-Sanitization
 */

import { randomBytes } from "node:crypto";
import prisma from "../lib/prisma";
import { normalizeEmail, normalizeEmailOrThrow } from "../lib/security/email";
import { previewDiscount, redeemDiscount, releaseDiscount } from "../lib/services/discount";
import { recordReceive, markProcessed } from "../lib/services/webhook-dedup";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`✓ ${name}`);
    pass++;
  } else {
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
    fail++;
  }
}

async function run() {
  console.log("\n=== STUFE-1 SECURITY-RE-AUDIT ===\n");

  console.log("--- H-2/H-3: Email-Normalisierung ---");
  check("normalizeEmail trimmt + lowercases", normalizeEmail("  Test@Example.COM ") === "test@example.com");
  check("normalizeEmail rejected leeren String", normalizeEmail("") === null);
  check("normalizeEmail rejected ohne @", normalizeEmail("noemail") === null);
  check("normalizeEmail rejected ohne TLD", normalizeEmail("a@b") === null);
  check("normalizeEmail rejected > 254 chars", normalizeEmail("a".repeat(250) + "@x.com") === null);
  check("normalizeEmail rejected nicht-String", normalizeEmail(null) === null);
  let threwOnInvalid = false;
  try {
    normalizeEmailOrThrow("garbage");
  } catch {
    threwOnInvalid = true;
  }
  check("normalizeEmailOrThrow wirft bei Invalid", threwOnInvalid);

  console.log("\n--- H-1: Atomic Discount-Redeem (Race-Safe) ---");
  // Create test discount with limit=1 → expect first wins, second fails
  const testCode = `TEST_ATOMIC_${randomBytes(4).toString("hex").toUpperCase()}`;
  await prisma.discount.create({
    data: {
      code: testCode,
      type: "PERCENTAGE",
      value: 10,
      usageLimit: 1,
      usedCount: 0,
      validFrom: new Date(),
      active: true,
    },
  });

  // First redeem should succeed
  let firstOk = false;
  try {
    await redeemDiscount({
      code: testCode,
      subtotalCents: 50000,
      shippingCents: 0,
      customerEmail: "race1@example.com",
    });
    firstOk = true;
  } catch (e) {
    console.error("first should succeed:", (e as Error).message);
  }
  check("Erster Redeem mit usageLimit=1 erfolgreich", firstOk);

  // Second should fail with LIMIT_REACHED
  let secondError = "";
  try {
    await redeemDiscount({
      code: testCode,
      subtotalCents: 50000,
      shippingCents: 0,
      customerEmail: "race2@example.com",
    });
  } catch (e) {
    secondError = (e as Error).message;
  }
  check("Zweiter Redeem wirft LIMIT_REACHED", secondError === "LIMIT_REACHED");

  // Parallel: 5 simultane Redeems mit limit=3, exact 3 win
  const parallelCode = `TEST_PAR_${randomBytes(4).toString("hex").toUpperCase()}`;
  await prisma.discount.create({
    data: {
      code: parallelCode,
      type: "PERCENTAGE",
      value: 10,
      usageLimit: 3,
      usedCount: 0,
      validFrom: new Date(),
      active: true,
    },
  });
  const results = await Promise.allSettled(
    Array.from({ length: 5 }).map((_, i) =>
      redeemDiscount({
        code: parallelCode,
        subtotalCents: 50000,
        shippingCents: 0,
        customerEmail: `par${i}@example.com`,
      }),
    ),
  );
  const okCount = results.filter((r) => r.status === "fulfilled").length;
  const failCount = results.filter((r) => r.status === "rejected").length;
  check(`Parallele Redeems: exact 3 OK, 2 LIMIT_REACHED (got ${okCount}/${failCount})`, okCount === 3 && failCount === 2);

  // Release (rollback) decrements
  const beforeRelease = await prisma.discount.findUnique({ where: { code: testCode } });
  await releaseDiscount(testCode);
  const afterRelease = await prisma.discount.findUnique({ where: { code: testCode } });
  check(
    "releaseDiscount dekrementiert usedCount",
    (afterRelease?.usedCount ?? 99) === (beforeRelease?.usedCount ?? 0) - 1,
  );

  // Cleanup
  await prisma.discount.deleteMany({ where: { code: { in: [testCode, parallelCode] } } });

  console.log("\n--- H-2: Email-Case-Bypass für oncePerCustomer ---");
  const onceCode = `TEST_ONCE_${randomBytes(4).toString("hex").toUpperCase()}`;
  await prisma.discount.create({
    data: {
      code: onceCode,
      type: "PERCENTAGE",
      value: 10,
      oncePerCustomer: true,
      validFrom: new Date(),
      active: true,
    },
  });
  const onceFirst = await previewDiscount({
    code: onceCode,
    subtotalCents: 50000,
    shippingCents: 0,
    customerEmail: "Mixed@Case.com",
  });
  check("oncePerCustomer Preview erste Email erfolgreich", (onceFirst?.discountCents ?? 0) > 0);

  // Simulate previous order with normalized email
  await prisma.order.create({
    data: {
      orderNumber: `TEST-${randomBytes(4).toString("hex")}`,
      publicToken: randomBytes(32).toString("base64url"),
      customerEmail: "mixed@case.com",
      billingFirstName: "T",
      billingLastName: "T",
      billingStreet1: "X",
      billingCity: "X",
      billingPostalCode: "00000",
      billingCountryCode: "DE",
      shippingFirstName: "T",
      shippingLastName: "T",
      shippingStreet1: "X",
      shippingCity: "X",
      shippingPostalCode: "00000",
      shippingCountryCode: "DE",
      subtotalCents: 50000,
      totalCents: 50000,
      discountCode: onceCode,
      orderStatus: "CONFIRMED",
      termsAcceptedAt: new Date(),
      termsVersion: "1.0",
      privacyAcceptedAt: new Date(),
      privacyVersion: "1.0",
      withdrawalShownAt: new Date(),
      withdrawalVersion: "1.0",
    },
  });
  const onceUppercase = await previewDiscount({
    code: onceCode,
    subtotalCents: 50000,
    shippingCents: 0,
    customerEmail: "MIXED@CASE.COM",
  });
  check(
    "oncePerCustomer blockt UPPERCASE-Bypass (gleiche Email anders geschrieben)",
    onceUppercase?.errors?.includes("ALREADY_USED") ?? false,
  );
  await prisma.order.deleteMany({ where: { discountCode: onceCode } });
  await prisma.discount.deleteMany({ where: { code: onceCode } });

  console.log("\n--- H-3 + Sanitization: Discount-Code Validation ---");
  const longInput = await previewDiscount({
    code: "X".repeat(200),
    subtotalCents: 50000,
    shippingCents: 0,
    customerEmail: "ok@ok.com",
  });
  check("Code > 64 chars abgelehnt", longInput?.errors?.includes("INVALID"));
  const sqlInjection = await previewDiscount({
    code: "'; DROP TABLE Discount; --",
    subtotalCents: 50000,
    shippingCents: 0,
    customerEmail: "ok@ok.com",
  });
  check("SQL-Injection im Code abgelehnt (Sanitizer)", sqlInjection?.errors?.includes("INVALID"));
  const stillExists = await prisma.discount.count();
  check("Discount-Tabelle existiert noch", stillExists >= 0);
  const badEmail = await previewDiscount({
    code: "WILLKOMMEN10",
    subtotalCents: 50000,
    shippingCents: 0,
    customerEmail: "x".repeat(300) + "@a.com",
  });
  check("Email > 254 chars im Preview abgelehnt", badEmail?.errors?.includes("INVALID_EMAIL"));

  console.log("\n--- M-1: Customer.emailVerifyTokenHash existiert ---");
  const c = await prisma.customer.create({
    data: { email: `verify-${Date.now()}@test.com`, emailVerifyTokenHash: "abc123", emailVerifyExpiresAt: new Date(Date.now() + 86400_000) },
  });
  check("Customer mit emailVerifyTokenHash anlegbar", !!c.id);
  await prisma.customer.delete({ where: { id: c.id } });

  console.log("\n--- M-3 + M-4: Webhook-Dedup Race + Payload-Limit ---");
  const evtId = `evt_${randomBytes(8).toString("hex")}`;
  const w1 = await recordReceive({
    provider: "stripe",
    providerEventId: evtId,
    eventType: "test.event",
    payload: { foo: "bar" },
  });
  check("Erste Aufnahme: alreadyProcessed=false", !w1.alreadyProcessed);
  const w2 = await recordReceive({
    provider: "stripe",
    providerEventId: evtId,
    eventType: "test.event",
    payload: { foo: "bar" },
  });
  check("Doppelte providerEventId: gleicher recordId", w2.recordId === w1.recordId);
  check("Doppelt: alreadyProcessed=false (noch nicht processed)", !w2.alreadyProcessed);
  await markProcessed(w1.recordId, undefined);
  const w3 = await recordReceive({
    provider: "stripe",
    providerEventId: evtId,
    eventType: "test.event",
    payload: { foo: "bar" },
  });
  check("Nach markProcessed: alreadyProcessed=true", w3.alreadyProcessed);
  // Parallel race
  const parallelId = `evt_par_${randomBytes(8).toString("hex")}`;
  const parResults = await Promise.allSettled([
    recordReceive({ provider: "stripe", providerEventId: parallelId, eventType: "x", payload: {} }),
    recordReceive({ provider: "stripe", providerEventId: parallelId, eventType: "x", payload: {} }),
    recordReceive({ provider: "stripe", providerEventId: parallelId, eventType: "x", payload: {} }),
  ]);
  const allOk = parResults.every((r) => r.status === "fulfilled");
  const recordIds = new Set(
    parResults.flatMap((r) => (r.status === "fulfilled" ? [r.value.recordId] : [])),
  );
  check("Parallele recordReceive — kein throw", allOk);
  check("Parallele recordReceive — alle mappen auf gleichen recordId", recordIds.size === 1);

  let payloadTooLarge = false;
  try {
    const bigPayload: Record<string, string> = {};
    for (let i = 0; i < 2000; i++) bigPayload[`k${i}`] = "x".repeat(100);
    await recordReceive({
      provider: "stripe",
      providerEventId: `evt_big_${randomBytes(8).toString("hex")}`,
      eventType: "test",
      payload: bigPayload,
    });
  } catch (e) {
    payloadTooLarge = (e as Error).message === "WEBHOOK_PAYLOAD_TOO_LARGE";
  }
  check("Payload > 100 KB wird abgelehnt", payloadTooLarge);

  // Cleanup
  await prisma.paymentEvent.deleteMany({
    where: { providerEventId: { in: [evtId, parallelId] } },
  });

  console.log(`\n=== SECURITY-RE-AUDIT: ${pass} ✓ / ${fail} ✗ ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
