export type WorkflowCategory = "customer" | "admin" | "system" | "compliance";

export type RiskLevel = "high" | "medium" | "low" | "none";

export type ImplementationStatus = "done" | "in-progress" | "planned" | "blocked";

export interface Risk {
  id: string;
  title: string;
  description: string;
  level: RiskLevel;
  consequence: string;
  mitigation: string;
  mitigationStatus: ImplementationStatus;
  codeRef?: string;
}

export interface SecurityMeasure {
  id: string;
  title: string;
  description: string;
  status: ImplementationStatus;
  codeRef?: string;
}

export interface FrontendImpact {
  page: string;
  pageHref?: string;
  change: string;
  status: ImplementationStatus;
}

export interface Workflow {
  id: string;
  slug: string;
  title: string;
  category: WorkflowCategory;
  stage: "stage-1" | "stage-2" | "stage-3" | "stage-4" | "stage-5" | "stage-6" | "operations";
  status: ImplementationStatus;
  summary: string;
  trigger: string;
  steps: string[];
  risks: Risk[];
  security: SecurityMeasure[];
  frontend: FrontendImpact[];
  codeRefs?: string[];
  openQuestions?: string[];
}
