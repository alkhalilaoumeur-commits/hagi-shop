import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/services/admin-auth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface SearchParams {
  actorType?: string;
  action?: string;
  entityType?: string;
  page?: string;
}

const ACTOR_COLORS: Record<string, string> = {
  admin: "#0F0A06",
  customer: "#B89968",
  system: "#5C7A4B",
  webhook: "#A33B2A",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const where: Record<string, unknown> = {};
  // Rate-Limit-Logs ausblenden (sonst Bloat) — Default-Filter
  if (params.actorType) where.actorType = params.actorType;
  else where.NOT = { action: "rate.hit" };
  if (params.action) where.action = params.action;
  if (params.entityType) where.entityType = params.entityType;

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [logs, total, actionsTop] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({
      by: ["action"],
      _count: { _all: true },
      orderBy: { _count: { action: "desc" } },
      take: 12,
      where: { NOT: { action: "rate.hit" } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
          ✦ Audit-Log
        </p>
        <h1 className="font-serif" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#0F0A06" }}>
          Aktivität
        </h1>
        <p className="text-base mt-3" style={{ color: "#5A4A3A" }}>
          Jede Admin-Aktion + System-Event + Webhook wird geloggt. Pflicht für DSGVO + Compliance.
        </p>
      </header>

      <section>
        <p className="text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: "#B89968" }}>
          ✦ Top-Aktionen
        </p>
        <div className="flex flex-wrap gap-2">
          {actionsTop.map((a) => (
            <Link
              key={a.action}
              href={`?action=${encodeURIComponent(a.action)}`}
              className="px-3 py-1.5 text-[11px] font-mono"
              style={{
                background: params.action === a.action ? "#0F0A06" : "#F0EAD8",
                color: params.action === a.action ? "#FAFAF7" : "#0F0A06",
                border: "1px solid #E5DCC8",
              }}
            >
              {a.action} <span className="opacity-60">({a._count._all})</span>
            </Link>
          ))}
          {params.action && (
            <Link
              href="?"
              className="px-3 py-1.5 text-[11px] uppercase tracking-[0.15em]"
              style={{ color: "#A33B2A" }}
            >
              ✕ Filter aufheben
            </Link>
          )}
        </div>
      </section>

      <section>
        <div className="overflow-x-auto" style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F0EAD8" }}>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>Zeit</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>Akteur</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>Aktion</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>Entity</th>
                <th className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderTop: "1px solid #E5DCC8" }}>
                  <td className="px-4 py-2 font-mono text-[11px] whitespace-nowrap" style={{ color: "#8A7866" }}>
                    {new Intl.DateTimeFormat("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(log.createdAt)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className="text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5"
                      style={{ background: ACTOR_COLORS[log.actorType] ?? "#8A7866", color: "#FAFAF7" }}
                    >
                      {log.actorType}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-[12px]" style={{ color: "#0F0A06" }}>{log.action}</td>
                  <td className="px-4 py-2 text-[11px]" style={{ color: "#5A4A3A" }}>
                    {log.entityType === "Order" ? (
                      <Link href={`/admin/bestellungen/${log.entityId}`} className="underline" style={{ color: "#A33B2A" }}>
                        {log.entityType} · {log.entityId.slice(-8)}
                      </Link>
                    ) : (
                      `${log.entityType} · ${log.entityId.slice(-8)}`
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-[11px]" style={{ color: "#8A7866" }}>
                    {log.ipAddress ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.15em] mt-4" style={{ color: "#5A4A3A" }}>
            <span>Seite {page} von {totalPages} · {total} Einträge</span>
            <div className="flex gap-3">
              {page > 1 && (
                <Link
                  href={`?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
                  style={{ color: "#A33B2A" }}
                >
                  ← Zurück
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
                  style={{ color: "#A33B2A" }}
                >
                  Vor →
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
