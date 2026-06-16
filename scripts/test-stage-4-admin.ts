/**
 * Stage 4 — Admin-Auth + Admin-Actions Smoke-Test
 */

import prisma from "../lib/prisma";
import { hashPassword, verifyPassword, isStrongPassword } from "../lib/security/password";
import { exportOrdersCSV } from "../lib/services/csv-export";

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
  console.log("\n=== STAGE 4 — ADMIN ===\n");

  console.log("--- Passwort-Helpers ---");
  const weak = isStrongPassword("kurz");
  check("Schwaches Passwort abgelehnt", weak.ok === false && weak.reason === "MIN_12_CHARS");
  const noUpper = isStrongPassword("ohnegrossstelle1");
  check("Ohne Großbuchstabe abgelehnt", noUpper.ok === false && noUpper.reason === "NEEDS_UPPER");
  const ok = isStrongPassword("StarkesPasswort2026");
  check("Starkes Passwort akzeptiert", ok.ok === true);

  const hash = await hashPassword("MyStrongPassword123!");
  check("Hash startet mit argon2id", hash.startsWith("$argon2id$"));
  check("Hash != Plaintext", hash !== "MyStrongPassword123!");

  const verifyOk = await verifyPassword("MyStrongPassword123!", hash);
  check("verifyPassword erfolgreich", verifyOk === true);
  const verifyBad = await verifyPassword("WrongPassword", hash);
  check("Falsches Passwort abgelehnt", verifyBad === false);

  let throwOnShort = false;
  try {
    await hashPassword("short");
  } catch {
    throwOnShort = true;
  }
  check("hashPassword throws bei zu kurz", throwOnShort);

  console.log("\n--- Admin in DB ---");
  const admin = await prisma.admin.findFirst();
  check("Mindestens ein Admin existiert", !!admin);

  console.log("\n--- Account-Lock-Logik (Simulation) ---");
  if (admin) {
    const lockedUntilFuture = new Date(Date.now() + 60_000);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: 5, lockedUntil: lockedUntilFuture },
    });
    const locked = await prisma.admin.findUnique({ where: { id: admin.id } });
    check("Lock setzen funktioniert", (locked?.lockedUntil ?? new Date(0)) > new Date());

    // Reset für andere Tests
    await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  console.log("\n--- AdminSession ---");
  if (admin) {
    const session = await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        tokenHash: "test-hash-" + Date.now(),
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    check("AdminSession anlegbar", !!session.id);

    await prisma.adminSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    const revoked = await prisma.adminSession.findUnique({ where: { id: session.id } });
    check("Session revoke funktioniert", !!revoked?.revokedAt);

    await prisma.adminSession.delete({ where: { id: session.id } });
  }

  console.log("\n--- CSV-Export ---");
  const csv = await exportOrdersCSV({
    from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    to: new Date(),
    onlyPaid: true,
  });
  check("CSV header present", csv.startsWith("Belegdatum;"));
  check("CSV ends with CRLF", csv.endsWith("\r\n"));
  const lines = csv.split("\r\n").filter((l) => l.length > 0);
  check("CSV has at least header row", lines.length >= 1);

  // CSV-Injection-Test: kein =FORMULA als ersten Char in einer Zelle ausgeben
  const dangerousCsv = csv.split("\r\n").filter((l) => /^=|^@|^\+|^-/.test(l));
  check("Kein CSV-Injection-Pattern im Output", dangerousCsv.length === 0);

  console.log(`\n=== RESULT: ${pass} ✓ / ${fail} ✗ ===\n`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
