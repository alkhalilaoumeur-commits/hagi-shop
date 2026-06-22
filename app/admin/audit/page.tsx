import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/services/admin-auth";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { SectionLabel } from "@/components/admin/ui/Field";
import { Pagination } from "@/components/admin/ui/Pagination";
import type { Tone } from "@/lib/admin/status-labels";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface SearchParams {
  actorType?: string;
  action?: string;
  entityType?: string;
  page?: string;
  [key: string]: string | undefined;
}

const ACTOR_TONE: Record<string, Tone> = {
  admin: "dark",
  customer: "warning",
  system: "success",
  webhook: "danger",
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
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip }),
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
      <PageHeader
        eyebrow="Audit-Log"
        title="Aktivität"
        description="Jede Admin-Aktion + System-Event + Webhook wird geloggt. Pflicht für DSGVO + Compliance."
      />

      <section className="space-y-3">
        <SectionLabel>Top-Aktionen</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {actionsTop.map((a) => {
            const active = params.action === a.action;
            return (
              <Link
                key={a.action}
                href={`?action=${encodeURIComponent(a.action)}`}
                className={`px-3 py-1.5 text-[11px] font-mono border border-border transition-colors ${
                  active ? "bg-ink text-bone" : "bg-bg-elevated text-ink hover:bg-bg-sand"
                }`}
              >
                {a.action} <span className="opacity-60">({a._count._all})</span>
              </Link>
            );
          })}
          {params.action && (
            <Link href="?" className="px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] text-sienna">
              ✕ Filter aufheben
            </Link>
          )}
        </div>
      </section>

      <section>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-elevated">
                {["Zeit", "Akteur", "Aktion", "Entity", "IP"].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-[10px] uppercase tracking-[0.15em] text-ink-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="px-4 py-2 font-mono text-[11px] whitespace-nowrap text-muted">
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
                    <StatusBadge label={log.actorType} tone={ACTOR_TONE[log.actorType] ?? "neutral"} />
                  </td>
                  <td className="px-4 py-2 font-mono text-[12px] text-ink">{log.action}</td>
                  <td className="px-4 py-2 text-[11px] text-ink-muted">
                    {log.entityType === "Order" ? (
                      <Link href={`/admin/bestellungen/${log.entityId}`} className="underline text-sienna">
                        {log.entityType} · {log.entityId.slice(-8)}
                      </Link>
                    ) : (
                      `${log.entityType} · ${log.entityId.slice(-8)}`
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-[11px] text-muted">{log.ipAddress ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Pagination page={page} totalPages={totalPages} total={total} unit="Einträge" params={params} />
      </section>
    </div>
  );
}
