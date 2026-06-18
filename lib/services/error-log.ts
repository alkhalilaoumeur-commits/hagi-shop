import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Zentrales Fehler-Logging. Schreibt jeden API-/Service-Fehler DAUERHAFT in die
 * DB (`ErrorLog`) UND auf die Konsole (Coolify-Logs, live).
 *
 * Spiegelt das Verhalten von logAudit: wirft NIE selbst — Logging darf einen
 * Request niemals zum Absturz bringen. So ist garantiert, dass kein Fehler
 * stillschweigend verschwindet und später per SQL nachvollziehbar ist:
 *
 *   SELECT createdAt, source, message FROM "ErrorLog" ORDER BY createdAt DESC LIMIT 50;
 */
export async function logError(params: {
  source: string;
  error: unknown;
  context?: Prisma.InputJsonValue | null;
}): Promise<void> {
  const message = params.error instanceof Error ? params.error.message : String(params.error);
  const stack = params.error instanceof Error ? params.error.stack ?? null : null;

  // Immer auch live in die Konsole, mit Source-Tag zum Filtern.
  console.error(`[${params.source}]`, message);

  try {
    await prisma.errorLog.create({
      data: {
        source: params.source.slice(0, 200),
        message: message.slice(0, 2000),
        stack: stack?.slice(0, 8000) ?? null,
        context: params.context ?? Prisma.DbNull,
      },
    });
  } catch (err) {
    // Niemals werfen — wenn sogar das Fehler-Logging scheitert, nur Konsole.
    console.error("[error-log] persist failed", err);
  }
}

/**
 * Cleanup für alte Fehler-Einträge (via Cron). Default: älter als 90 Tage.
 */
export async function cleanupErrorLogs(olderThanDays = 90): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await prisma.errorLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}
