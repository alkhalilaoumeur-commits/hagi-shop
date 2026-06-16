"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { WORKFLOWS } from "@/lib/playbook/data";
import type {
  Workflow,
  WorkflowCategory,
  RiskLevel,
  ImplementationStatus,
} from "@/lib/playbook/types";

const CATEGORY_LABEL: Record<WorkflowCategory, string> = {
  customer: "Customer",
  admin: "Admin",
  system: "System",
  compliance: "Compliance",
};

const STATUS_LABEL: Record<ImplementationStatus, string> = {
  done: "Done",
  "in-progress": "In Progress",
  planned: "Planned",
  blocked: "Blocked",
};

const STATUS_COLOR: Record<ImplementationStatus, string> = {
  done: "#5C7A4B",
  "in-progress": "#A33B2A",
  planned: "#8A7866",
  blocked: "#7E2A1D",
};

const RISK_COLOR: Record<RiskLevel, string> = {
  high: "#A33B2A",
  medium: "#B89968",
  low: "#5A4A3A",
  none: "#8A7866",
};

const RISK_LABEL: Record<RiskLevel, string> = {
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
  none: "Keins",
};

const STAGE_LABEL: Record<Workflow["stage"], string> = {
  "stage-1": "Stage 1 · Foundation",
  "stage-2": "Stage 2 · Checkout",
  "stage-3": "Stage 3 · Post-Checkout",
  "stage-4": "Stage 4 · Admin",
  "stage-5": "Stage 5 · Compliance",
  "stage-6": "Stage 6 · Premium",
  operations: "Operations",
};

export function PlaybookBoard() {
  const [category, setCategory] = useState<WorkflowCategory | "all">("all");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const total = WORKFLOWS.length;
    const done = WORKFLOWS.filter((w) => w.status === "done").length;
    const inProgress = WORKFLOWS.filter((w) => w.status === "in-progress").length;
    const planned = WORKFLOWS.filter((w) => w.status === "planned").length;
    const allRisks = WORKFLOWS.flatMap((w) => w.risks);
    const highRisks = allRisks.filter((r) => r.level === "high").length;
    const mitigated = allRisks.filter((r) => r.mitigationStatus === "done").length;
    return { total, done, inProgress, planned, highRisks, totalRisks: allRisks.length, mitigated };
  }, []);

  const filtered = useMemo(() => {
    return WORKFLOWS.filter((w) => {
      if (category !== "all" && w.category !== category) return false;
      if (riskFilter !== "all") {
        const hasMatchingRisk = w.risks.some((r) => r.level === riskFilter);
        if (!hasMatchingRisk) return false;
      }
      return true;
    });
  }, [category, riskFilter]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  return (
    <div>
      <section
        className="relative pt-32 pb-12 md:pt-36 md:pb-16 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 15% 20%, #F6EEDB 0%, #EFE6D2 45%, #E8DEC4 100%)",
        }}
      >
        <div className="max-w-page mx-auto px-6 md:px-12">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-4" style={{ color: "#B89968" }}>
            ✦ Operations Playbook · Intern
          </p>
          <h1
            className="font-serif leading-[0.95] mb-8"
            style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)", color: "#0F0A06", letterSpacing: "-0.015em" }}
          >
            Workflows, Risiken,<br />
            <span style={{ color: "#A33B2A" }}>Maßnahmen.</span>
          </h1>
          <p className="text-base md:text-lg max-w-2xl" style={{ color: "#5A4A3A" }}>
            Operations-Board für den Hagi-Shop. Jeder Workflow mit konkreten Risiken, Security-Status,
            Code-Refs und Frontend-Auswirkungen. Filter unten — Klick auf Karte für Details.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-10 pt-8" style={{ borderTop: "1px solid #D9CDB8" }}>
            <Stat label="Workflows" value={String(counts.total)} />
            <Stat label="Done" value={String(counts.done)} accent="#5C7A4B" />
            <Stat label="In Progress" value={String(counts.inProgress)} accent="#A33B2A" />
            <Stat label="Risiken (hoch)" value={`${counts.highRisks} / ${counts.totalRisks}`} accent="#A33B2A" />
            <Stat label="Gefixt" value={`${counts.mitigated} / ${counts.totalRisks}`} accent="#5C7A4B" />
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-20 py-4" style={{ background: "rgba(250,250,247,0.92)", borderBottom: "1px solid #D9CDB8", backdropFilter: "blur(14px)" }}>
        <div className="max-w-page mx-auto px-6 md:px-12 flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: "#8A7866" }}>Kategorie</span>
          <FilterPill active={category === "all"} onClick={() => setCategory("all")}>Alle</FilterPill>
          <FilterPill active={category === "customer"} onClick={() => setCategory("customer")}>Customer</FilterPill>
          <FilterPill active={category === "admin"} onClick={() => setCategory("admin")}>Admin</FilterPill>
          <FilterPill active={category === "system"} onClick={() => setCategory("system")}>System</FilterPill>
          <FilterPill active={category === "compliance"} onClick={() => setCategory("compliance")}>Compliance</FilterPill>

          <span className="mx-3 hidden md:inline" style={{ color: "#D9CDB8" }}>|</span>

          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: "#8A7866" }}>Risiko</span>
          <FilterPill active={riskFilter === "all"} onClick={() => setRiskFilter("all")}>Alle</FilterPill>
          <FilterPill active={riskFilter === "high"} onClick={() => setRiskFilter("high")} accent="#A33B2A">Hoch</FilterPill>
          <FilterPill active={riskFilter === "medium"} onClick={() => setRiskFilter("medium")} accent="#B89968">Mittel</FilterPill>
          <FilterPill active={riskFilter === "low"} onClick={() => setRiskFilter("low")}>Niedrig</FilterPill>

          <span className="ml-auto text-[11px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>
            {filtered.length} Workflows
          </span>
        </div>
      </section>

      <section className="py-12 md:py-16" style={{ background: "#FAFAF7" }}>
        <div className="max-w-page mx-auto px-6 md:px-12 space-y-4">
          {filtered.map((w) => {
            const isOpen = expanded.has(w.id);
            const highRisks = w.risks.filter((r) => r.level === "high").length;
            const mediumRisks = w.risks.filter((r) => r.level === "medium").length;
            return (
              <article
                key={w.id}
                style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}
              >
                <button
                  onClick={() => toggle(w.id)}
                  className="w-full text-left px-6 md:px-8 py-6 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 md:gap-8 items-center"
                  aria-expanded={isOpen}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span
                        className="text-[10px] uppercase tracking-[0.2em] font-semibold px-2 py-0.5"
                        style={{ background: STATUS_COLOR[w.status], color: "#FAFAF7" }}
                      >
                        {STATUS_LABEL[w.status]}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "#B89968" }}>
                        {CATEGORY_LABEL[w.category]} · {STAGE_LABEL[w.stage]}
                      </span>
                    </div>
                    <h2 className="font-serif text-2xl md:text-3xl leading-tight mb-2" style={{ color: "#0F0A06" }}>
                      {w.title}
                    </h2>
                    <p className="text-sm md:text-base" style={{ color: "#5A4A3A", maxWidth: "60ch" }}>
                      {w.summary}
                    </p>
                  </div>

                  <div className="hidden md:flex flex-col items-end gap-2 text-right">
                    {highRisks > 0 && (
                      <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: RISK_COLOR.high }}>
                        {highRisks} hoch
                      </span>
                    )}
                    {mediumRisks > 0 && (
                      <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: RISK_COLOR.medium }}>
                        {mediumRisks} mittel
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "#8A7866" }}>
                      {w.risks.length} Risiken
                    </span>
                  </div>

                  <div className="font-mono text-xs uppercase tracking-[0.15em] flex items-center gap-2" style={{ color: "#0F0A06" }}>
                    {isOpen ? "Schließen" : "Details"}
                    <span aria-hidden style={{ transform: isOpen ? "rotate(45deg)" : "none", transition: "transform 0.3s" }}>+</span>
                  </div>
                </button>

                {isOpen && <WorkflowDetail workflow={w} />}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent = "#0F0A06" }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="font-serif" style={{ fontSize: "clamp(2rem, 3.5vw, 2.8rem)", color: accent, lineHeight: 1 }}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-[0.18em] mt-2" style={{ color: "#8A7866" }}>
        {label}
      </p>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-medium border transition-colors"
      style={{
        background: active ? (accent ?? "#0F0A06") : "transparent",
        color: active ? "#FAFAF7" : "#0F0A06",
        borderColor: active ? (accent ?? "#0F0A06") : "#D9CDB8",
      }}
    >
      {children}
    </button>
  );
}

function WorkflowDetail({ workflow }: { workflow: Workflow }) {
  return (
    <div className="px-6 md:px-8 pb-8 pt-2" style={{ borderTop: "1px solid #E5DCC8" }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6">
        <div>
          <SectionLabel>Trigger</SectionLabel>
          <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: "#5A4A3A" }}>
            {workflow.trigger}
          </p>

          <SectionLabel>Schritte</SectionLabel>
          <ol className="space-y-2 mb-8">
            {workflow.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm md:text-base" style={{ color: "#5A4A3A" }}>
                <span className="font-mono text-xs flex-shrink-0 mt-0.5" style={{ color: "#B89968" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {workflow.codeRefs && workflow.codeRefs.length > 0 && (
            <>
              <SectionLabel>Code</SectionLabel>
              <ul className="space-y-1 mb-6">
                {workflow.codeRefs.map((ref) => (
                  <li key={ref} className="font-mono text-xs" style={{ color: "#5A4A3A" }}>
                    {ref}
                  </li>
                ))}
              </ul>
            </>
          )}

          {workflow.openQuestions && workflow.openQuestions.length > 0 && (
            <>
              <SectionLabel>Offene Fragen</SectionLabel>
              <ul className="space-y-2">
                {workflow.openQuestions.map((q, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: "#A33B2A" }}>
                    <span>?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div>
          <SectionLabel>Risiken ({workflow.risks.length})</SectionLabel>
          <ul className="space-y-4 mb-8">
            {workflow.risks.map((r) => (
              <li
                key={r.id}
                className="p-4"
                style={{ background: "#FAFAF7", border: "1px solid #E5DCC8" }}
              >
                <div className="flex flex-wrap items-baseline gap-2 mb-2">
                  <span
                    className="text-[9px] uppercase tracking-[0.22em] font-bold px-1.5 py-0.5"
                    style={{ background: RISK_COLOR[r.level], color: "#FAFAF7" }}
                  >
                    {RISK_LABEL[r.level]}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-[0.15em] font-semibold"
                    style={{ color: STATUS_COLOR[r.mitigationStatus] }}
                  >
                    ✦ {STATUS_LABEL[r.mitigationStatus]}
                  </span>
                </div>
                <p className="font-serif text-base md:text-lg leading-tight mb-2" style={{ color: "#0F0A06" }}>
                  {r.title}
                </p>
                <p className="text-sm leading-relaxed mb-2" style={{ color: "#5A4A3A" }}>
                  {r.description}
                </p>
                <p className="text-xs leading-relaxed mb-2" style={{ color: "#7E2A1D" }}>
                  <strong>Konsequenz:</strong> {r.consequence}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#5C7A4B" }}>
                  <strong>Maßnahme:</strong> {r.mitigation}
                </p>
                {r.codeRef && (
                  <p className="font-mono text-[10px] mt-2 opacity-70" style={{ color: "#5A4A3A" }}>
                    {r.codeRef}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {workflow.security.length > 0 && (
            <>
              <SectionLabel>Security-Maßnahmen ({workflow.security.length})</SectionLabel>
              <ul className="space-y-2 mb-8">
                {workflow.security.map((s) => (
                  <li key={s.id} className="flex gap-3 items-start text-sm" style={{ color: "#5A4A3A" }}>
                    <span
                      className="text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 flex-shrink-0"
                      style={{ background: STATUS_COLOR[s.status], color: "#FAFAF7" }}
                    >
                      {STATUS_LABEL[s.status]}
                    </span>
                    <div>
                      <p className="font-medium" style={{ color: "#0F0A06" }}>{s.title}</p>
                      <p className="text-xs">{s.description}</p>
                      {s.codeRef && (
                        <p className="font-mono text-[10px] mt-1 opacity-70">{s.codeRef}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {workflow.frontend.length > 0 && (
            <>
              <SectionLabel>Frontend-Auswirkungen ({workflow.frontend.length})</SectionLabel>
              <ul className="space-y-2">
                {workflow.frontend.map((f, i) => (
                  <li key={i} className="flex gap-3 items-start text-sm" style={{ color: "#5A4A3A" }}>
                    <span
                      className="text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 flex-shrink-0"
                      style={{ background: STATUS_COLOR[f.status], color: "#FAFAF7" }}
                    >
                      {STATUS_LABEL[f.status]}
                    </span>
                    <div>
                      {f.pageHref ? (
                        <Link
                          href={f.pageHref}
                          className="font-medium pb-0.5 inline-block"
                          style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
                        >
                          {f.page} →
                        </Link>
                      ) : (
                        <p className="font-medium" style={{ color: "#0F0A06" }}>{f.page}</p>
                      )}
                      <p className="text-xs">{f.change}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.22em] font-bold mb-3" style={{ color: "#B89968" }}>
      ✦ {children}
    </p>
  );
}
