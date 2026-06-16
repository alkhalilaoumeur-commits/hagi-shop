/**
 * Erstellt den ersten Admin-Account.
 *
 * Nutzung:
 *   ADMIN_EMAIL=hagi@example.com ADMIN_PASSWORD=StarkesPasswort123 npx tsx scripts/create-admin.ts
 *
 * Fehlt der Admin? Dann ist niemand eingeloggt und das Backend ist gesperrt.
 */

import prisma from "../lib/prisma";
import { hashPassword, isStrongPassword } from "../lib/security/password";
import { normalizeEmailOrThrow } from "../lib/security/email";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_NAME ?? "Hagi";

  if (!email || !password) {
    console.error("✗ ADMIN_EMAIL und ADMIN_PASSWORD müssen gesetzt sein.");
    process.exit(1);
  }

  let normalizedEmail: string;
  try {
    normalizedEmail = normalizeEmailOrThrow(email);
  } catch {
    console.error("✗ Email-Format ungültig.");
    process.exit(1);
  }

  const strength = isStrongPassword(password);
  if (!strength.ok) {
    console.error(`✗ Passwort zu schwach: ${strength.reason}`);
    console.error("  Mindestens 12 Zeichen, Groß/Klein/Ziffer.");
    process.exit(1);
  }

  const existing = await prisma.admin.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    console.error("✗ Admin mit dieser E-Mail existiert bereits.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.admin.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      displayName,
      isActive: true,
    },
  });

  console.log("✓ Admin erstellt:");
  console.log(`  ID:      ${admin.id}`);
  console.log(`  E-Mail:  ${admin.email}`);
  console.log(`  Name:    ${admin.displayName ?? "(nicht gesetzt)"}`);
  console.log("\nLogin: http://localhost:3002/admin/login");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
