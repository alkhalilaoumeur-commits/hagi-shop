/**
 * Exportiert lib/playbook/data.ts → docs/WORKFLOWS.md
 *
 * Nutzung:
 *   npx tsx scripts/export-playbook.ts
 *
 * Die generierte Markdown ist autoritativ für Kollegen-Lesbarkeit + Claude-Code-Konsum.
 * Quelle bleibt data.ts — Markdown wird nur regeneriert.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { WORKFLOWS } from "../lib/playbook/data";
import type {
  RiskLevel,
  ImplementationStatus,
  WorkflowCategory,
  Workflow,
} from "../lib/playbook/types";

const RISK_LABEL: Record<RiskLevel, string> = {
  high: "🔴 Hoch",
  medium: "🟡 Mittel",
  low: "🟢 Niedrig",
  none: "⚪ Keins",
};

const STATUS_LABEL: Record<ImplementationStatus, string> = {
  done: "✅ Done",
  "in-progress": "🚧 In Progress",
  planned: "📋 Planned",
  blocked: "⛔ Blocked",
};

const CATEGORY_LABEL: Record<WorkflowCategory, string> = {
  customer: "Customer",
  admin: "Admin",
  system: "System",
  compliance: "Compliance",
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

function formatRisk(r: Workflow["risks"][number]): string {
  const lines = [
    `#### ${RISK_LABEL[r.level]} · ${r.title}`,
    `**Mitigation-Status:** ${STATUS_LABEL[r.mitigationStatus]}${r.codeRef ? ` · \`${r.codeRef}\`` : ""}`,
    "",
    r.description,
    "",
    `- **Konsequenz:** ${r.consequence}`,
    `- **Maßnahme:** ${r.mitigation}`,
  ];
  return lines.join("\n");
}

function formatSecurity(s: Workflow["security"][number]): string {
  const ref = s.codeRef ? ` · \`${s.codeRef}\`` : "";
  return `- **${STATUS_LABEL[s.status]}** · ${s.title}${ref}\n  ${s.description}`;
}

function formatFrontend(f: Workflow["frontend"][number]): string {
  const link = f.pageHref ? ` ([${f.pageHref}](${f.pageHref}))` : "";
  return `- **${STATUS_LABEL[f.status]}** · ${f.page}${link}\n  ${f.change}`;
}

function formatWorkflow(w: Workflow): string {
  const sections: string[] = [];

  sections.push(`## ${w.title}\n`);
  sections.push(
    `**ID:** \`${w.id}\` · **Slug:** \`${w.slug}\` · **Kategorie:** ${CATEGORY_LABEL[w.category]} · **Stage:** ${STAGE_LABEL[w.stage]} · **Status:** ${STATUS_LABEL[w.status]}\n`,
  );
  sections.push(`> ${w.summary}\n`);
  sections.push(`**Trigger:** ${w.trigger}\n`);

  sections.push("### Schritte");
  sections.push(w.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
  sections.push("");

  if (w.risks.length > 0) {
    sections.push(`### Risiken (${w.risks.length})\n`);
    sections.push(w.risks.map(formatRisk).join("\n\n"));
    sections.push("");
  }

  if (w.security.length > 0) {
    sections.push(`### Security-Maßnahmen (${w.security.length})\n`);
    sections.push(w.security.map(formatSecurity).join("\n"));
    sections.push("");
  }

  if (w.frontend.length > 0) {
    sections.push(`### Frontend-Auswirkungen (${w.frontend.length})\n`);
    sections.push(w.frontend.map(formatFrontend).join("\n"));
    sections.push("");
  }

  if (w.codeRefs && w.codeRefs.length > 0) {
    sections.push("### Code-Refs");
    sections.push(w.codeRefs.map((c) => `- \`${c}\``).join("\n"));
    sections.push("");
  }

  if (w.openQuestions && w.openQuestions.length > 0) {
    sections.push("### Offene Fragen");
    sections.push(w.openQuestions.map((q) => `- ❓ ${q}`).join("\n"));
    sections.push("");
  }

  sections.push("---\n");
  return sections.join("\n");
}

function generateMarkdown(): string {
  const totalRisks = WORKFLOWS.flatMap((w) => w.risks);
  const highRisks = totalRisks.filter((r) => r.level === "high").length;
  const mitigated = totalRisks.filter((r) => r.mitigationStatus === "done").length;
  const done = WORKFLOWS.filter((w) => w.status === "done").length;
  const inProgress = WORKFLOWS.filter((w) => w.status === "in-progress").length;
  const planned = WORKFLOWS.filter((w) => w.status === "planned").length;

  const lines: string[] = [];

  lines.push("# Hagi Shop — Workflows, Risiken, Security-Maßnahmen");
  lines.push("");
  lines.push(`**Letztes Update:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(
    `**Quelle:** \`lib/playbook/data.ts\` · **Live-Board:** [/playbook](http://localhost:3002/playbook)`,
  );
  lines.push("");
  lines.push("Diese Datei wird automatisch generiert. **Nicht direkt editieren.**");
  lines.push("Änderungen in `lib/playbook/data.ts` und `npx tsx scripts/export-playbook.ts` ausführen.");
  lines.push("");

  lines.push("## Übersicht\n");
  lines.push("| Metrik | Wert |");
  lines.push("|---|---|");
  lines.push(`| Workflows total | ${WORKFLOWS.length} |`);
  lines.push(`| Done | ${done} |`);
  lines.push(`| In Progress | ${inProgress} |`);
  lines.push(`| Planned | ${planned} |`);
  lines.push(`| Risiken total | ${totalRisks.length} |`);
  lines.push(`| Risiken hoch | ${highRisks} |`);
  lines.push(`| Risiken gefixt | ${mitigated} / ${totalRisks.length} |`);
  lines.push("");

  lines.push("## Workflow-Verzeichnis\n");
  lines.push("| # | Titel | Kategorie | Stage | Status | Risiken |");
  lines.push("|---|---|---|---|---|---|");
  WORKFLOWS.forEach((w, i) => {
    const high = w.risks.filter((r) => r.level === "high").length;
    const med = w.risks.filter((r) => r.level === "medium").length;
    const riskCell = high > 0 ? `${high}🔴` : med > 0 ? `${med}🟡` : `${w.risks.length}🟢`;
    lines.push(
      `| ${String(i + 1).padStart(2, "0")} | [${w.title}](#${slugAnchor(w.title)}) | ${CATEGORY_LABEL[w.category]} | ${STAGE_LABEL[w.stage]} | ${STATUS_LABEL[w.status]} | ${riskCell} |`,
    );
  });
  lines.push("");

  lines.push("---\n");
  lines.push("# Workflows im Detail\n");
  WORKFLOWS.forEach((w) => lines.push(formatWorkflow(w)));

  return lines.join("\n");
}

function slugAnchor(s: string): string {
  return s
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: "a", ö: "o", ü: "u", ß: "ss" })[c] ?? c)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function main() {
  const md = generateMarkdown();
  const outPath = resolve(process.cwd(), "docs/WORKFLOWS.md");
  writeFileSync(outPath, md, "utf-8");
  console.log(`✅ WORKFLOWS.md geschrieben (${md.length} chars, ${WORKFLOWS.length} Workflows)`);
  console.log(`   → ${outPath}`);
}

main();
