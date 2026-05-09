import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type {
  AllowlistEntry,
  AllowlistKind,
  AllowlistStatus,
  AgentMessage,
  AgentArtifact,
  AgentOrchestrationRun,
  AgentRunReview,
  AgentRunReviewStatus,
  ApprovalRequest,
  ApprovalDecisionRecord,
  ApprovalStatus,
  Experiment,
  ExperimentAnalysis,
  MarketIntelligenceReport,
  OpenClawApprovalPayload,
  OpenClawCommand,
  ObsidianNote,
  ProductionAsset,
  ProductionPack,
  RealPilotRun,
  RiskLevel,
  Task,
  UserSettings,
} from "../types";
import { renderMarkdownNote } from "../utils/markdown";
import { safetyPolicyService } from "../services/safetyPolicyService";
import {
  initialAppDataState,
  persistenceService,
  type AppDataState,
  type StorageAdapter,
} from "../services/persistenceService";
import { runSafeSimulationTick } from "../services/simulationService";
import {
  applyProfilesToAgents,
  openclawService,
  type ChannelMessageInput,
  type OpenClawBridgeResult,
  type UrlResearchInput,
} from "../services/openclawService";

type ExportResult = {
  ok: boolean;
  mode: "tauri-file" | "browser-download" | "preview";
  path?: string;
  message: string;
};

export type RealPilotDraftInput = {
  questId: string;
  purpose: string;
  approvedUrls: string[];
  extractionGoal: string;
  validationChecklistSummary: string;
  riskReview: string;
  minimumTestPlan: string;
  successCriteria: string;
  killCriteria: string;
  budgetCap: number;
};

export type AgentOrchestrationInput = {
  questId: string;
  objective: string;
};

export type ExperimentPlanInput = {
  questId: string;
  title: string;
  hypothesis: string;
  budgetCap: number;
  successMetricLabel: string;
  successMetricTarget: number;
  failureMetricLabel: string;
};

type AppDataContextValue = {
  data: AppDataState;
  adapter: StorageAdapter;
  isLoading: boolean;
  simulationEnabled: boolean;
  lastExportResult: ExportResult | null;
  refresh: () => Promise<void>;
  resetLocalData: () => Promise<void>;
  updateApprovalStatus: (approvalId: string, status: ApprovalStatus) => Promise<void>;
  updateSettings: (settings: UserSettings) => Promise<void>;
  recordSystemLog: (input: { title: string; detail: string; severity?: "info" | "success" | "warning" | "danger" }) => Promise<void>;
  runSimulationNow: () => Promise<void>;
  setSimulationEnabled: (enabled: boolean) => void;
  selectObsidianVault: () => Promise<void>;
  exportObsidianNote: (note: ObsidianNote) => Promise<ExportResult>;
  revealExportedPath: (path: string) => Promise<void>;
  refreshOpenClawStatus: () => Promise<void>;
  syncOpenClawAgents: () => Promise<void>;
  requestGatewayStart: () => Promise<void>;
  requestTeamLeaderTurn: (message: string) => Promise<void>;
  requestUrlResearch: (input: UrlResearchInput) => Promise<void>;
  requestChannelMessage: (input: ChannelMessageInput) => Promise<void>;
  createRealPilotRun: (input: RealPilotDraftInput) => Promise<string>;
  updateRealPilotRun: (runId: string, patch: Partial<RealPilotRun>) => Promise<void>;
  requestPilotUrlResearch: (runId: string) => Promise<void>;
  requestPilotTeamLeaderReview: (runId: string) => Promise<void>;
  exportRealPilotReport: (runId: string) => Promise<ExportResult>;
  cancelOpenClawCommand: (commandId: string) => Promise<void>;
  markOpenClawCommandFailed: (commandId: string) => Promise<void>;
  retryOpenClawCommand: (commandId: string) => Promise<void>;
  addAllowlistEntry: (kind: AllowlistKind, value: string, label?: string) => Promise<{ ok: boolean; message: string }>;
  updateAllowlistEntryStatus: (entryId: string, status: AllowlistStatus) => Promise<void>;
  removeAllowlistEntry: (entryId: string) => Promise<void>;
  createAgentOrchestrationRun: (input: AgentOrchestrationInput) => Promise<string>;
  completeAgentTask: (taskId: string) => Promise<void>;
  reviewAgentRun: (runId: string, status: AgentRunReviewStatus) => Promise<void>;
  createMarketIntelligenceReport: (questId: string) => Promise<string>;
  createExperimentPlan: (input: ExperimentPlanInput) => Promise<string>;
  analyzeExperiment: (experimentId: string) => Promise<string>;
  createProductionPack: (questId: string) => Promise<string>;
  advanceProductionAsset: (assetId: string) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function isTauriRuntime() {
  return isTauri() || (typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window));
}

function filenameSafe(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, "-").replace(/\s+/g, " ").trim();
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function decisionRecord(input: Omit<ApprovalDecisionRecord, "id" | "createdAt" | "actor"> & { actor?: ApprovalDecisionRecord["actor"] }) {
  return {
    id: id("approval-decision"),
    createdAt: new Date().toISOString(),
    ...input,
    actor: input.actor ?? "TeamLeader1A",
  };
}

const phase5BlockedBehaviors = [
  "No uncontrolled spending",
  "No external publishing",
  "No --deliver agent replies",
  "No broadcast or spam",
  "No fake reviews or misleading claims",
  "No login automation, form submission, CAPTCHA bypass, or purchases",
  "No scraping outside approved URLs or against website terms",
];

function payloadSummary(payload: OpenClawApprovalPayload) {
  if (payload.actionKind === "gateway_start") return "Start the local loopback OpenClaw gateway.";
  if (payload.actionKind === "agent_turn") return payload.message;
  if (payload.actionKind === "url_research") return `${payload.purpose} / ${payload.urls.join(", ")}`;
  return `${payload.channel} -> ${payload.target}: ${payload.message}`;
}

function commandForPayload(payload: OpenClawApprovalPayload) {
  if (payload.actionKind === "gateway_start") return "openclaw.cmd gateway start";
  if (payload.actionKind === "agent_turn") return "openclaw.cmd agent --agent main --message <approved> --json";
  if (payload.actionKind === "url_research") return "openclaw.cmd agent --agent main --message <approved-url-research> --json";
  return `openclaw.cmd message send --channel ${payload.channel} --target ${payload.target} --message <approved>${payload.dryRun ? " --dry-run" : ""} --json`;
}

function executionSummary(result: OpenClawBridgeResult) {
  const output = result.stdout.trim() || result.stderr.trim();
  if (result.timedOut) return "OpenClaw command timed out before completing.";
  if (!output) return result.ok ? "OpenClaw command completed." : "OpenClaw command failed without output.";
  return output.length > 700 ? `${output.slice(0, 700)}...` : output;
}

function requestTitle(payload: OpenClawApprovalPayload) {
  if (payload.actionKind === "gateway_start") return "Start local OpenClaw gateway";
  if (payload.actionKind === "agent_turn") return "Run approved TeamLeader1A local turn";
  if (payload.actionKind === "url_research") return "Run approved URL research";
  return payload.dryRun ? "Dry-run approved channel message" : "Send approved channel message";
}

function riskForPayload(payload: OpenClawApprovalPayload): RiskLevel {
  if (payload.actionKind === "gateway_start") return "medium";
  if (payload.actionKind === "agent_turn") return "medium";
  if (payload.actionKind === "url_research") return "high";
  return payload.dryRun ? "medium" : "high";
}

function realPilotStatusLabel(status: RealPilotRun["status"]) {
  return status.replace(/_/g, " ");
}

function buildRealPilotNote(run: RealPilotRun, state: AppDataState): ObsidianNote {
  const quest = state.quests.find((item) => item.id === run.questId);
  const validation = state.validationReports.find((item) => item.questId === run.questId);
  const commandSummaries = state.openClawCommands
    .filter((command) => run.commandIds.includes(command.id))
    .map((command) => `- ${command.command}: ${command.status}${command.resultSummary ? ` - ${command.resultSummary}` : ""}`)
    .join("\n");
  const reportLines = [
    `## Pilot Status`,
    `Status: ${realPilotStatusLabel(run.status)}`,
    `Quest: ${quest?.title ?? run.questId}`,
    `Budget cap: $${run.budgetCap}`,
    "",
    `## Purpose`,
    run.purpose,
    "",
    `## Approved Research URLs`,
    ...run.approvedUrls.map((url) => `- ${url}`),
    "",
    `## Extraction Goal`,
    run.extractionGoal,
    "",
    `## Validation Snapshot`,
    run.validationChecklistSummary,
    validation ? `Validation score: ${validation.score} / status: ${validation.status}` : "Validation report: not attached",
    "",
    `## Risk Review`,
    run.riskReview,
    "",
    `## Minimum Test Plan`,
    run.minimumTestPlan,
    "",
    `## Success Criteria`,
    run.successCriteria,
    "",
    `## Kill Criteria`,
    run.killCriteria,
    "",
    `## TeamLeader1A Summary`,
    run.lastTeamLeaderSummary ?? "No live TeamLeader1A review has completed yet.",
    "",
    `## OpenClaw Command History`,
    commandSummaries || "No approved OpenClaw commands are linked yet.",
    "",
    `## Safety Boundary`,
    "This pilot report records local research and planning only. It does not authorize spending, publishing, launching, purchases, form submission, login automation, or outbound messaging.",
  ];

  return {
    id: run.artifactNoteIds[0] ?? id("note-real-pilot"),
    title: `Real Pilot - ${quest?.title ?? run.title}`,
    type: "quest_summary",
    folder: state.userSettings.obsidianDefaultFolders.reports ?? "OpenClaw/Reports",
    frontmatter: {
      type: "real_pilot",
      system: "openclaw",
      quest_id: run.questId,
      status: run.status,
      approved_urls: run.approvedUrls,
      budget_cap: run.budgetCap,
      approval_status: run.approvalStatus,
      created_at: run.createdAt,
      updated_at: run.updatedAt,
    },
    body: reportLines.join("\n"),
    linkedQuestId: run.questId,
  };
}

const orchestrationAgentOrder = [
  "teamleader1a",
  "agent-researcher",
  "agent-seo",
  "agent-writer",
  "agent-content",
  "agent-production",
  "agent-publish",
  "agent-action",
  "teamleader1a",
];

function artifactTypeForAgent(agentId: string, taskTitle: string): AgentArtifact["type"] {
  if (agentId === "agent-researcher") return "research_brief";
  if (agentId === "agent-seo") return "seo_map";
  if (agentId === "agent-writer") return "draft";
  if (agentId === "agent-content") return "content_brief";
  if (agentId === "agent-production") return "asset_plan";
  if (agentId === "agent-publish") return "publish_checklist";
  if (agentId === "agent-action") return "ops_checklist";
  if (taskTitle.toLowerCase().includes("final")) return "teamleader_summary";
  return "mission_brief";
}

function artifactContentForAgent(agentName: string, task: Task, questTitle: string, objective: string) {
  const sharedSafetyBoundary =
    "Local artifact only. This does not authorize spending, publishing, outreach, scraping, browser automation, form submission, purchases, or live OpenClaw commands.";
  return [
    `## ${task.title}`,
    `Agent: ${agentName}`,
    `Quest: ${questTitle}`,
    "",
    `## Objective`,
    objective,
    "",
    `## Local Output`,
    `${agentName} completed a safe internal pass for this assignment. The output is intentionally review-first: evidence, assumptions, risks, and next-step recommendations are captured for TeamLeader1A before any risky action can move forward.`,
    "",
    `## Evidence And Checks`,
    "- Identify what is known, what is assumed, and what still needs validation.",
    "- Prefer small reversible tests with explicit success and failure criteria.",
    "- Escalate missing capability needs as improvement proposals instead of improvising risky automation.",
    "",
    `## Safety Boundary`,
    sharedSafetyBoundary,
  ].join("\n");
}

function createOrchestrationTasks(runId: string, questId: string, questTitle: string): Task[] {
  const firstTaskId = id("task-orchestration");
  const researchTaskId = id("task-orchestration");
  const seoTaskId = id("task-orchestration");
  const writerTaskId = id("task-orchestration");
  const contentTaskId = id("task-orchestration");
  const productionTaskId = id("task-orchestration");
  const publishTaskId = id("task-orchestration");
  const actionTaskId = id("task-orchestration");
  const reviewTaskId = id("task-orchestration");

  return [
    {
      id: firstTaskId,
      questId,
      title: `TeamLeader1A mission brief for ${questTitle}`,
      assignedAgentId: orchestrationAgentOrder[0],
      status: "in_progress",
      priority: "urgent",
      dependencyIds: [],
    },
    {
      id: researchTaskId,
      questId,
      title: "Demand proof, risks, and competitor evidence",
      assignedAgentId: "agent-researcher",
      status: "queued",
      priority: "high",
      dependencyIds: [firstTaskId],
    },
    {
      id: seoTaskId,
      questId,
      title: "Search intent map and keyword opportunity scan",
      assignedAgentId: "agent-seo",
      status: "queued",
      priority: "high",
      dependencyIds: [researchTaskId],
    },
    {
      id: writerTaskId,
      questId,
      title: "Positioning draft and buyer-facing copy angles",
      assignedAgentId: "agent-writer",
      status: "queued",
      priority: "normal",
      dependencyIds: [researchTaskId, seoTaskId],
    },
    {
      id: contentTaskId,
      questId,
      title: "Content pipeline and asset sequence",
      assignedAgentId: "agent-content",
      status: "queued",
      priority: "normal",
      dependencyIds: [seoTaskId, writerTaskId],
    },
    {
      id: productionTaskId,
      questId,
      title: "Production asset plan and build checklist",
      assignedAgentId: "agent-production",
      status: "queued",
      priority: "normal",
      dependencyIds: [contentTaskId, writerTaskId],
    },
    {
      id: publishTaskId,
      questId,
      title: "Publishing approval checklist with blocked actions",
      assignedAgentId: "agent-publish",
      status: "queued",
      priority: "high",
      dependencyIds: [productionTaskId, contentTaskId],
    },
    {
      id: actionTaskId,
      questId,
      title: "Operations checklist for approved-only next steps",
      assignedAgentId: "agent-action",
      status: "queued",
      priority: "high",
      dependencyIds: [publishTaskId, productionTaskId],
    },
    {
      id: reviewTaskId,
      questId,
      title: `TeamLeader1A final review for ${runId}`,
      assignedAgentId: "teamleader1a",
      status: "blocked",
      priority: "urgent",
      dependencyIds: [researchTaskId, seoTaskId, writerTaskId, contentTaskId, productionTaskId, publishTaskId, actionTaskId],
    },
  ];
}

function canTaskStart(task: Task, tasks: Task[]) {
  return task.dependencyIds.every((dependencyId) => tasks.find((item) => item.id === dependencyId)?.status === "done");
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function marketReportFromQuest(state: AppDataState, questId: string): MarketIntelligenceReport {
  const quest = state.quests.find((item) => item.id === questId);
  const idea = quest ? state.businessIdeas.find((item) => item.id === quest.businessIdeaId) : null;
  if (!quest) throw new Error("Quest not found for market intelligence report.");

  const now = new Date().toISOString();
  const evidenceCount = quest.validationEvidence.length + (idea?.evidenceOfDemand.length ?? 0);
  const evidenceScore = clampScore(35 + evidenceCount * 8 - (quest.riskLevel === "high" ? 12 : quest.riskLevel === "critical" ? 22 : 0));
  return {
    id: id("market-report"),
    questId: quest.id,
    title: `${quest.title} market intelligence`,
    status: evidenceScore >= 65 ? "ready" : "needs_more_sources",
    sourceUrls: [],
    demandSignals: [
      {
        id: id("demand"),
        source: "Mission Control validation evidence",
        signal: quest.validationEvidence[0] ?? idea?.evidenceOfDemand[0] ?? "Demand signal still needs approved research.",
        strength: evidenceScore >= 65 ? "strong" : "moderate",
      },
      {
        id: id("demand"),
        source: "Business idea profile",
        signal: idea?.problemSolved ?? "Problem statement needs refinement.",
        strength: evidenceScore >= 70 ? "strong" : "weak",
      },
    ],
    competitorSnapshots: [
      {
        id: id("competitor"),
        name: "Known alternatives",
        positioning: `Alternatives compete for ${idea?.targetAudience ?? "the target audience"}.`,
        pricing: idea?.monetizationMethod,
        gap: quest.bottleneck ?? "Need a sharper evidence-backed gap before launch.",
        riskNotes: "Live competitor research requires approved URLs; this local report uses stored quest evidence only.",
      },
    ],
    keywordOpportunities: [
      {
        id: id("keyword"),
        keyword: quest.businessIdea.toLowerCase(),
        intent: quest.type === "SEO quest" ? "informational" : "commercial",
        difficulty: evidenceScore >= 70 ? "medium" : "high",
        confidence: evidenceScore,
        contentAngle: idea?.trafficPlan ?? "Build a content angle only after validation evidence improves.",
      },
    ],
    evidenceScore,
    citationNotes: ["Local report generated from stored app data. Use approved URL research for live citations."],
    risks: [
      "No external scraping or browser automation ran.",
      "Evidence must be reviewed before production or launch.",
      quest.riskLevel === "high" || quest.riskLevel === "critical" ? "High-risk quest needs extra policy review." : "Standard validation gate still applies.",
    ],
    recommendedNextStep:
      evidenceScore >= 65
        ? "Convert this evidence into a bounded experiment plan with explicit kill criteria."
        : "Collect more approved research evidence before production or launch planning.",
    teamLeaderSummary:
      "TeamLeader1A generated a local market intelligence pass. This is planning evidence only and does not authorize live research, publishing, spending, or outreach.",
    createdAt: now,
    updatedAt: now,
  };
}

function experimentAnalysisFromExperiment(experiment: Experiment): ExperimentAnalysis {
  const now = new Date().toISOString();
  const numericMetrics = experiment.metrics.filter((metric) => typeof metric.value === "number" && typeof metric.target === "number");
  const metricProgress =
    numericMetrics.length === 0
      ? 0
      : numericMetrics.reduce((total, metric) => total + Math.min(Number(metric.value) / Math.max(Number(metric.target), 1), 1), 0) / numericMetrics.length;
  const confidenceScore = clampScore(metricProgress * 75 + (experiment.status === "complete" ? 15 : experiment.status === "running" ? 8 : 0));
  const recommendation: ExperimentAnalysis["recommendation"] =
    confidenceScore >= 75 ? "scale_later" : confidenceScore >= 50 ? "continue" : experiment.status === "failed" ? "kill" : "revise";
  return {
    id: id("experiment-analysis"),
    experimentId: experiment.id,
    questId: experiment.questId,
    confidenceScore,
    recommendation,
    conversionRate: numericMetrics[0] ? Number(numericMetrics[0].value) / Math.max(Number(numericMetrics[0].target), 1) : 0,
    breakEvenProgress: experiment.budgetCap === 0 ? 0 : clampScore(metricProgress * 100),
    revenue: 0,
    cost: 0,
    evidenceStrength: confidenceScore >= 70 ? "strong" : confidenceScore >= 45 ? "directional" : "thin",
    notes:
      recommendation === "scale_later"
        ? "Promising, but scaling still needs a separate approval and budget review."
        : recommendation === "continue"
          ? "Keep the test running within its current local constraints."
          : recommendation === "kill"
            ? "Failure criteria appear stronger than success evidence; archive or redesign before more work."
            : "Revise the test design before requesting launch, publishing, or spend.",
    createdAt: now,
  };
}

function productionPackForQuest(state: AppDataState, questId: string): { pack: ProductionPack; assets: ProductionAsset[] } {
  const quest = state.quests.find((item) => item.id === questId);
  const report = state.marketIntelligenceReports.find((item) => item.questId === questId);
  if (!quest) throw new Error("Quest not found for production pack.");

  const now = new Date().toISOString();
  const packId = id("production-pack");
  const baseChecks = [
    "Validation evidence attached",
    "No income guarantees or misleading claims",
    "External publishing and spending remain approval-gated",
    "Claims include limitations, assumptions, and source notes",
  ];
  const assets: ProductionAsset[] = [
    {
      id: id("production-asset"),
      questId,
      packId,
      title: `${quest.title} landing page draft`,
      type: "landing_page",
      status: "claim_review",
      sourceReportIds: report ? [report.id] : [],
      claims: ["Describe the problem clearly", "Present a minimum test offer without guaranteed outcomes"],
      policyChecks: baseChecks,
      localPreview: `Hero draft for ${quest.businessIdea}. CTA remains local-only until launch approval. Include risk, assumptions, and transparent next step.`,
      exportFolder: "OpenClaw/Production",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: id("production-asset"),
      questId,
      packId,
      title: `${quest.title} content brief`,
      type: "content_brief",
      status: "draft",
      sourceReportIds: report ? [report.id] : [],
      claims: ["Evidence-first content brief", "Clear failure criteria before promotion"],
      policyChecks: baseChecks,
      localPreview: `Brief: target audience, problem, evidence, objections, safe claims, and review checklist for ${quest.businessIdea}.`,
      exportFolder: "OpenClaw/Production",
      createdAt: now,
      updatedAt: now,
    },
  ];
  return {
    pack: {
      id: packId,
      questId,
      title: `${quest.title} production pack`,
      status: "draft",
      assetIds: assets.map((asset) => asset.id),
      reviewChecklist: baseChecks,
      teamLeaderSummary:
        "TeamLeader1A prepared a local production pack. It is a draft review package only; public launch, spend, and publishing still require separate approvals.",
      createdAt: now,
      updatedAt: now,
    },
    assets,
  };
}

function approvalDecisionDetail(status: ApprovalStatus, request?: ApprovalRequest) {
  if (!request?.payload) {
    return `TeamLeader1A recorded a local ${status} decision. No external action was executed.`;
  }
  if (status === "approved") {
    return `TeamLeader1A recorded approval for ${request.title}. The action will run once through the strict OpenClaw allowlist and be logged locally.`;
  }
  if (status === "rejected") {
    return `TeamLeader1A recorded rejection for ${request.title}. No OpenClaw command was executed.`;
  }
  return `TeamLeader1A recorded a local ${status} decision for ${request.title}.`;
}

async function saveBrowserDownload(note: ObsidianNote, markdown: string): Promise<ExportResult> {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filenameSafe(note.title)}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return {
    ok: true,
    mode: "browser-download",
    message: "Markdown downloaded through the browser fallback. Tauri exports write directly to the selected vault.",
  };
}

async function exportWithTauri(note: ObsidianNote, vaultPath: string, markdown: string): Promise<ExportResult | null> {
  if (!isTauriRuntime()) return null;

  try {
    const fs = await import("@tauri-apps/plugin-fs");
    const pathApi = await import("@tauri-apps/api/path");
    const folderPath = await pathApi.join(vaultPath, ...note.folder.split(/[\\/]/g));
    const filePath = await pathApi.join(folderPath, `${filenameSafe(note.title)}.md`);

    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeTextFile(filePath, markdown);

    return {
      ok: true,
      mode: "tauri-file",
      path: filePath,
      message: `Exported ${note.title} to ${filePath}`,
    };
  } catch (error) {
    return {
      ok: false,
      mode: "preview",
      message: `Tauri export failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppDataState>(initialAppDataState);
  const [adapter, setAdapter] = useState<StorageAdapter>("browser-local-storage");
  const [isLoading, setIsLoading] = useState(true);
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [lastExportResult, setLastExportResult] = useState<ExportResult | null>(null);
  const intervalRef = useRef<number | null>(null);
  const dataRef = useRef<AppDataState>(initialAppDataState);
  const executeApprovedActionRef = useRef<((approval: ApprovalRequest) => Promise<void>) | null>(null);

  const persist = useCallback(async (next: AppDataState) => {
    const nextAdapter = await persistenceService.saveState(next);
    dataRef.current = next;
    setData(next);
    setAdapter(nextAdapter);
  }, []);

  const persistOptimistic = useCallback(async (next: AppDataState) => {
    dataRef.current = next;
    setData(next);
    const nextAdapter = await persistenceService.saveState(next);
    setAdapter(nextAdapter);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await persistenceService.loadState();
      dataRef.current = result.state;
      setData(result.state);
      setAdapter(result.adapter);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetLocalData = useCallback(async () => {
    const next = await persistenceService.resetState();
    dataRef.current = next;
    setData(next);
  }, []);

  const updateApprovalStatus = useCallback(
    async (approvalId: string, status: ApprovalStatus) => {
      const current = dataRef.current;
      const existingApproval = current.approvalRequests.find((request) => request.id === approvalId);
      if (!existingApproval) return;
      const now = new Date().toISOString();
      const safetyEvaluation = existingApproval.payload
        ? safetyPolicyService.evaluateOpenClawPayload(existingApproval.payload, {
            allowlistEntries: current.allowlistEntries,
            userSettings: current.userSettings,
          })
        : existingApproval.safetyEvaluation;
      if (status === "approved" && existingApproval.payload && safetyEvaluation && !safetyEvaluation.allowed) {
        const blockedDetail = safetyEvaluation.blockedReasons.join(" ");
        const blockedState: AppDataState = {
          ...current,
          approvalRequests: current.approvalRequests.map((request) =>
            request.id === approvalId
              ? {
                  ...request,
                  status: "blocked",
                  safetyEvaluation,
                  blockedExplanation: blockedDetail,
                }
              : request,
          ),
          openClawCommands: current.openClawCommands.map((command) =>
            command.id === existingApproval.commandId
              ? {
                  ...command,
                  status: "blocked",
                  completedAt: now,
                  safetyEvaluation,
                  resultSummary: `Blocked by safety policy: ${blockedDetail}`,
                }
              : command,
          ),
          approvalDecisionRecords: [
            decisionRecord({
              approvalId,
              commandId: existingApproval.commandId,
              decision: "blocked",
              actor: "system",
              reason: `Execution blocked during approval re-check: ${blockedDetail}`,
              payloadSummary: safetyEvaluation.normalizedPayloadSummary,
            }),
            ...current.approvalDecisionRecords,
          ],
          activityLogs: [
            {
              id: `approval-log-${Date.now()}`,
              category: "approval",
              title: "Approval blocked by safety policy",
              detail: `No OpenClaw command was executed. ${blockedDetail}`,
              severity: "danger",
              createdAt: now,
              relatedQuestId: existingApproval.questId,
            },
            ...current.activityLogs,
          ],
        };
        await persist(blockedState);
        return;
      }
      const next: AppDataState = {
        ...current,
        approvalRequests: current.approvalRequests.map((request) =>
          request.id === approvalId ? { ...request, status, safetyEvaluation: safetyEvaluation ?? request.safetyEvaluation } : request,
        ),
        approvalDecisionRecords: [
          decisionRecord({
            approvalId,
            commandId: existingApproval.commandId,
            decision: status === "approved" ? "approved" : status === "rejected" ? "rejected" : status === "blocked" ? "blocked" : "created",
            actor: "user",
            reason: approvalDecisionDetail(status, existingApproval),
            payloadSummary: safetyEvaluation?.normalizedPayloadSummary ?? existingApproval.reason,
          }),
          ...current.approvalDecisionRecords,
        ],
        activityLogs: [
          {
            id: `approval-log-${Date.now()}`,
            category: "approval",
            title: `Approval ${status}`,
            detail: approvalDecisionDetail(status, existingApproval),
            severity: status === "approved" ? "success" : status === "rejected" ? "warning" : "info",
            createdAt: now,
            relatedQuestId: existingApproval?.questId,
          },
          ...current.activityLogs,
        ],
      };
      await persist(next);
      if (status === "approved" && existingApproval?.payload && !existingApproval.executionResult) {
        await executeApprovedActionRef.current?.({ ...existingApproval, status: "approved" });
      }
    },
    [persist],
  );

  const updateSettings = useCallback(
    async (settings: UserSettings) => {
      const current = dataRef.current;
      const next: AppDataState = {
        ...current,
        userSettings: settings,
        dashboardSummary: {
          ...current.dashboardSummary,
          totalStartingCapital: settings.totalStartingCapital,
          remainingCapital: Math.max(settings.totalStartingCapital - current.dashboardSummary.allocatedCapital, 0),
        },
      };
      await persistOptimistic(next);
    },
    [persistOptimistic],
  );

  const recordSystemLog = useCallback(
    async (input: { title: string; detail: string; severity?: "info" | "success" | "warning" | "danger" }) => {
      const current = dataRef.current;
      const next: AppDataState = {
        ...current,
        activityLogs: [
          {
            id: id("log-system"),
            category: "system",
            title: input.title,
            detail: input.detail,
            severity: input.severity ?? "info",
            createdAt: new Date().toISOString(),
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
    },
    [persistOptimistic],
  );

  const runSimulationNow = useCallback(async () => {
    const next = runSafeSimulationTick(dataRef.current);
    await persist(next);
  }, [persist]);

  const refreshOpenClawStatus = useCallback(async () => {
    const port = dataRef.current.userSettings.openClawGatewayPort;
    const { result, runtimeStatus } = await openclawService.probeGateway(port);
    const now = new Date().toISOString();
    const current = dataRef.current;
    const next: AppDataState = {
      ...current,
      openClawRuntimeStatus: runtimeStatus,
      openClawEvents: [
        {
          id: id("event-openclaw-status"),
          type: "runtime",
          title: result.ok ? "Gateway status refreshed" : "Gateway status check failed",
          detail: runtimeStatus.notes,
          createdAt: now,
          severity: runtimeStatus.status === "online" ? "success" : runtimeStatus.status === "offline" ? "warning" : "danger",
        },
        ...current.openClawEvents,
      ],
      activityLogs: [
        {
          id: id("log-openclaw-status"),
          category: "openclaw",
          title: "OpenClaw status refreshed",
          detail: `${runtimeStatus.status}: ${runtimeStatus.notes}`,
          severity: runtimeStatus.status === "online" ? "success" : runtimeStatus.status === "offline" ? "warning" : "danger",
          createdAt: now,
        },
        ...current.activityLogs,
      ],
    };
    await persist(next);
  }, [persist]);

  const syncOpenClawAgents = useCallback(async () => {
    const { result, profiles } = await openclawService.syncAgents();
    const now = new Date().toISOString();
    const current = dataRef.current;
    const nextAgents = applyProfilesToAgents(current.agents, profiles, current.userSettings);
    const mappedCount = nextAgents.filter((agent) => agent.openClawProfileId).length;
    const next: AppDataState = {
      ...current,
      agents: nextAgents,
      openClawEvents: [
        {
          id: id("event-agent-sync"),
          type: "agent",
          title: result.ok ? "OpenClaw agents synced" : "OpenClaw agent sync failed",
          detail: result.ok
            ? `${mappedCount} Mission Control roles linked to local OpenClaw profiles.`
            : executionSummary(result),
          createdAt: now,
          severity: result.ok ? "success" : "warning",
        },
        ...current.openClawEvents,
      ],
      activityLogs: [
        {
          id: id("log-agent-sync"),
          category: "openclaw",
          title: "OpenClaw profile sync",
          detail: result.ok
            ? `${mappedCount} roles linked from ${profiles.length} local profiles.`
            : executionSummary(result),
          severity: result.ok ? "success" : "warning",
          createdAt: now,
        },
        ...current.activityLogs,
      ],
    };
    await persist(next);
  }, [persist]);

  const createOpenClawApproval = useCallback(
    async (
      payload: OpenClawApprovalPayload,
      options: { questId?: string; pilotRunId?: string; parentApprovalId?: string; retryOfCommandId?: string } = {},
    ) => {
      const current = dataRef.current;
      const now = new Date().toISOString();
      const commandId = id("cmd-openclaw");
      const approvalId = id("approval-openclaw");
      const safetyEvaluation = safetyPolicyService.evaluateOpenClawPayload(payload, {
        allowlistEntries: current.allowlistEntries,
        userSettings: current.userSettings,
      });
      const isBlocked = !safetyEvaluation.allowed;
      const command: OpenClawCommand = {
        id: commandId,
        command: commandForPayload(payload),
        targetAgentId: payload.actionKind === "agent_turn" || payload.actionKind === "url_research" ? "teamleader1a" : "openclaw-runtime",
        status: isBlocked ? "blocked" : "requires_approval",
        riskLevel: riskForPayload(payload),
        approvalRequired: true,
        resultSummary: isBlocked
          ? `Blocked by safety policy: ${safetyEvaluation.blockedReasons.join(" ")}`
          : "Waiting for user approval. No real OpenClaw action has run.",
        createdAt: now,
        actionKind: payload.actionKind,
        executionMode: payload.actionKind === "channel_message" && payload.dryRun ? "dry_run" : "real_local",
        retryOfCommandId: options.retryOfCommandId,
        safetyEvaluation,
      };
      const approval: ApprovalRequest = {
        id: approvalId,
        type:
          payload.actionKind === "gateway_start"
            ? "Start OpenClaw gateway"
            : payload.actionKind === "agent_turn"
              ? "Run OpenClaw local agent turn"
              : payload.actionKind === "url_research"
                ? "Run approved URL research"
                : "Send approved channel message",
        title: requestTitle(payload),
        questId: options.questId,
        pilotRunId: options.pilotRunId,
        parentApprovalId: options.parentApprovalId,
        retryOfCommandId: options.retryOfCommandId,
        requestedBy: "TeamLeader1A",
        riskLevel: command.riskLevel,
        reason: payloadSummary(payload),
        safetyChecklist: safetyEvaluation.safetyChecklist,
        blockedBehaviors: phase5BlockedBehaviors,
        status: isBlocked ? "blocked" : "pending",
        createdAt: now,
        payload,
        payloadSnapshot: payload,
        commandId,
        safetyEvaluation,
        blockedExplanation: isBlocked ? safetyEvaluation.blockedReasons.join(" ") : undefined,
      };
      const next: AppDataState = {
        ...current,
        approvalRequests: [approval, ...current.approvalRequests],
        openClawCommands: [command, ...current.openClawCommands],
        approvalDecisionRecords: [
          decisionRecord({
            approvalId,
            commandId,
            decision: isBlocked ? "blocked" : options.retryOfCommandId ? "retry_created" : "created",
            reason: isBlocked
              ? `Blocked by safety policy: ${safetyEvaluation.blockedReasons.join(" ")}`
              : options.retryOfCommandId
                ? `Retry approval created from command ${options.retryOfCommandId}.`
                : "Approval request created. No external action has run.",
            payloadSummary: safetyEvaluation.normalizedPayloadSummary,
            relatedApprovalId: options.parentApprovalId,
            relatedCommandId: options.retryOfCommandId,
          }),
          ...current.approvalDecisionRecords,
        ],
        activityLogs: [
          {
            id: id("log-openclaw-approval"),
            category: "approval",
            title: isBlocked ? `${approval.title} blocked by safety policy` : `${approval.title} requires approval`,
            detail: isBlocked
              ? `Nothing executed. ${safetyEvaluation.blockedReasons.join(" ")}`
              : "No real OpenClaw action has run. Approval is required before execution.",
            severity: isBlocked ? "danger" : "warning",
            createdAt: now,
            relatedQuestId: options.questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return { approvalId, commandId, blocked: isBlocked, safetyEvaluation };
    },
    [persistOptimistic],
  );

  const executeApprovedOpenClawAction = useCallback(
    async (approval: ApprovalRequest) => {
      if (!approval.payload || !approval.commandId) return;

      const startedAt = new Date().toISOString();
      const runningState = dataRef.current;
      const safetyEvaluation = safetyPolicyService.evaluateOpenClawPayload(approval.payload, {
        allowlistEntries: runningState.allowlistEntries,
        userSettings: runningState.userSettings,
      });
      if (!safetyEvaluation.allowed) {
        const blockedDetail = safetyEvaluation.blockedReasons.join(" ");
        await persist({
          ...runningState,
          approvalRequests: runningState.approvalRequests.map((request) =>
            request.id === approval.id
              ? {
                  ...request,
                  status: "blocked",
                  safetyEvaluation,
                  blockedExplanation: blockedDetail,
                }
              : request,
          ),
          openClawCommands: runningState.openClawCommands.map((command) =>
            command.id === approval.commandId
              ? {
                  ...command,
                  status: "blocked",
                  completedAt: startedAt,
                  safetyEvaluation,
                  resultSummary: `Blocked by safety policy: ${blockedDetail}`,
                }
              : command,
          ),
          approvalDecisionRecords: [
            decisionRecord({
              approvalId: approval.id,
              commandId: approval.commandId,
              decision: "blocked",
              actor: "system",
              reason: `Execution blocked by final policy check: ${blockedDetail}`,
              payloadSummary: safetyEvaluation.normalizedPayloadSummary,
            }),
            ...runningState.approvalDecisionRecords,
          ],
          activityLogs: [
            {
              id: id("log-policy-block"),
              category: "approval",
              title: "Approved action blocked before execution",
              detail: `No OpenClaw command was executed. ${blockedDetail}`,
              severity: "danger",
              createdAt: startedAt,
              relatedQuestId: approval.questId,
            },
            ...runningState.activityLogs,
          ],
        });
        return;
      }
      await persist({
        ...runningState,
        openClawCommands: runningState.openClawCommands.map((command) =>
          command.id === approval.commandId
            ? {
                ...command,
                status: "running",
                startedAt,
                safetyEvaluation,
                resultSummary: "Approved command is running through the OpenClaw allowlist.",
              }
            : command,
        ),
      });

      let result: OpenClawBridgeResult;
      if (approval.payload.actionKind === "gateway_start") {
        result = await openclawService.startGateway();
      } else if (approval.payload.actionKind === "agent_turn") {
        result = await openclawService.runTeamLeaderTurn(approval.payload.message);
      } else if (approval.payload.actionKind === "url_research") {
        result = await openclawService.runUrlResearch({
          purpose: approval.payload.purpose,
          urls: approval.payload.urls,
          extractionGoal: approval.payload.extractionGoal,
          riskNotes: approval.payload.riskNotes,
          successCriteria: approval.payload.successCriteria,
        });
      } else {
        result = await openclawService.sendChannelMessage({
          channel: approval.payload.channel,
          target: approval.payload.target,
          message: approval.payload.message,
          dryRun: approval.payload.dryRun,
        });
      }

      const completedAt = new Date().toISOString();
      const current = dataRef.current;
      const summary = executionSummary(result);
      const updatedCommandStatus = result.ok ? "complete" : "failed";
      const maybeRuntimeStatus =
        approval.payload.actionKind === "gateway_start"
          ? (await openclawService.probeGateway(current.userSettings.openClawGatewayPort)).runtimeStatus
          : current.openClawRuntimeStatus;
      const message =
        approval.payload.actionKind === "agent_turn" || approval.payload.actionKind === "url_research"
          ? {
              id: id("msg-openclaw-teamleader"),
              fromAgentId: "teamleader1a",
              toAgentId: "TeamLeader1A" as const,
              summary: result.ok ? "Approved OpenClaw action completed." : "Approved OpenClaw action failed.",
              details: summary,
              createdAt: completedAt,
              visibility: "user_summary" as const,
            }
          : null;
      const nextPilotRuns = current.realPilotRuns.map((run) => {
        if (run.id !== approval.pilotRunId) return run;
        const nextStatus =
          result.ok && approval.payload?.actionKind === "url_research"
            ? "research_complete"
            : result.ok && approval.payload?.actionKind === "agent_turn"
              ? "test_plan_ready"
              : "failed";
        return {
          ...run,
          status: nextStatus as RealPilotRun["status"],
          updatedAt: completedAt,
          lastTeamLeaderSummary: summary,
          commandIds: approval.commandId && !run.commandIds.includes(approval.commandId) ? [approval.commandId, ...run.commandIds] : run.commandIds,
        };
      });

      const next: AppDataState = {
        ...current,
        openClawRuntimeStatus: maybeRuntimeStatus,
        realPilotRuns: nextPilotRuns,
        approvalDecisionRecords: [
          decisionRecord({
            approvalId: approval.id,
            commandId: approval.commandId,
            decision: result.ok ? "approved" : "failed_safe",
            actor: "system",
            reason: result.ok ? "Approved command completed through the allowlist." : `Approved command failed safely: ${summary}`,
            payloadSummary: approval.payload ? commandForPayload(approval.payload) : undefined,
          }),
          ...current.approvalDecisionRecords,
        ],
        approvalRequests: current.approvalRequests.map((request) =>
          request.id === approval.id
            ? {
                ...request,
                executionResult: {
                  ok: result.ok,
                  summary,
                  completedAt,
                },
              }
            : request,
        ),
        openClawCommands: current.openClawCommands.map((command) =>
          command.id === approval.commandId
            ? {
                ...command,
                status: updatedCommandStatus,
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode,
                completedAt,
                resultSummary: summary,
              }
            : command,
        ),
        openClawEvents: [
          {
            id: id("event-openclaw-exec"),
            type: "command",
            title: result.ok ? "Approved OpenClaw command completed" : "Approved OpenClaw command failed",
            detail: `${commandForPayload(approval.payload)} / ${summary}`,
            createdAt: completedAt,
            severity: result.ok ? "success" : "danger",
          },
          ...current.openClawEvents,
        ],
        activityLogs: [
          {
            id: id("log-openclaw-exec"),
            category: "openclaw",
            title: result.ok ? "Approved OpenClaw action completed" : "Approved OpenClaw action failed",
            detail: summary,
            severity: result.ok ? "success" : "danger",
            createdAt: completedAt,
          },
          ...current.activityLogs,
        ],
        agentMessages: message ? [message, ...current.agentMessages].slice(0, 24) : current.agentMessages,
      };
      await persist(next);
    },
    [persist],
  );

  useEffect(() => {
    executeApprovedActionRef.current = executeApprovedOpenClawAction;
  }, [executeApprovedOpenClawAction]);

  const requestGatewayStart = useCallback(async () => {
    await createOpenClawApproval({
      actionKind: "gateway_start",
      expectedResult: "OpenClaw loopback gateway starts locally.",
    });
  }, [createOpenClawApproval]);

  const requestTeamLeaderTurn = useCallback(
    async (message: string) => {
      if (!message.trim()) return;
      await createOpenClawApproval({
        actionKind: "agent_turn",
        agentProfileId: "main",
        message: message.trim(),
        expectedResult: "TeamLeader1A returns a local planning or research summary.",
      });
    },
    [createOpenClawApproval],
  );

  const requestUrlResearch = useCallback(
    async (input: UrlResearchInput) => {
      await createOpenClawApproval({
        actionKind: "url_research",
        purpose: input.purpose.trim(),
        urls: input.urls.map((url) => url.trim()).filter(Boolean),
        extractionGoal: input.extractionGoal.trim(),
        riskNotes: input.riskNotes.trim(),
        successCriteria: input.successCriteria.trim(),
        expectedResult: "TeamLeader1A reports findings from the approved URL research task or fails safely.",
      });
    },
    [createOpenClawApproval],
  );

  const requestChannelMessage = useCallback(
    async (input: ChannelMessageInput) => {
      await createOpenClawApproval({
        actionKind: "channel_message",
        channel: input.channel.trim(),
        target: input.target.trim(),
        message: input.message.trim(),
        dryRun: input.dryRun,
        expectedResult: input.dryRun ? "OpenClaw validates the message payload without sending." : "OpenClaw sends the approved text message to the explicit target.",
      });
    },
    [createOpenClawApproval],
  );

  const createRealPilotRun = useCallback(
    async (input: RealPilotDraftInput) => {
      const current = dataRef.current;
      const quest = current.quests.find((item) => item.id === input.questId);
      if (!quest) throw new Error("Quest not found for real pilot run.");

      const now = new Date().toISOString();
      const runId = id("pilot-run");
      const decisionId = id("decision-real-pilot");
      const logId = id("log-real-pilot");
      const run: RealPilotRun = {
        id: runId,
        questId: quest.id,
        title: `${quest.title} real pilot`,
        status: "draft",
        purpose: input.purpose.trim(),
        approvedUrls: input.approvedUrls.map((url) => url.trim()).filter(Boolean),
        extractionGoal: input.extractionGoal.trim(),
        validationChecklistSummary: input.validationChecklistSummary.trim(),
        riskReview: input.riskReview.trim(),
        minimumTestPlan: input.minimumTestPlan.trim(),
        successCriteria: input.successCriteria.trim(),
        killCriteria: input.killCriteria.trim(),
        budgetCap: Math.max(0, input.budgetCap),
        approvalStatus: "not_required",
        createdAt: now,
        updatedAt: now,
        artifactNoteIds: [],
        commandIds: [],
        activityLogIds: [logId],
      };

      const next: AppDataState = {
        ...current,
        realPilotRuns: [run, ...current.realPilotRuns],
        quests: current.quests.map((item) =>
          item.id === quest.id
            ? {
                ...item,
                stage: item.stage === "Idea discovered" ? "Researching" : item.stage,
                progress: Math.max(item.progress, 38),
                nextAction: "Run approved real-pilot URL research, then request TeamLeader1A review.",
                decisionLogIds: [decisionId, ...item.decisionLogIds],
              }
            : item,
        ),
        decisionLogs: [
          {
            id: decisionId,
            questId: quest.id,
            title: "Real pilot opened",
            decision: "Run a local-only pilot workbench flow before any launch, publishing, spending, or external automation.",
            rationale: "The quest needs approved research, validation evidence, risk review, a minimum test plan, and explicit kill criteria.",
            risk: quest.riskLevel,
            createdBy: "TeamLeader1A",
            createdAt: now,
          },
          ...current.decisionLogs,
        ],
        activityLogs: [
          {
            id: logId,
            category: "quest",
            title: "Real pilot workbench opened",
            detail: `${quest.title} now has a local-only pilot plan. No external action has run.`,
            severity: "info",
            createdAt: now,
            relatedQuestId: quest.id,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return runId;
    },
    [persistOptimistic],
  );

  const updateRealPilotRun = useCallback(
    async (runId: string, patch: Partial<RealPilotRun>) => {
      const current = dataRef.current;
      const updatedAt = new Date().toISOString();
      const next: AppDataState = {
        ...current,
        realPilotRuns: current.realPilotRuns.map((run) =>
          run.id === runId ? { ...run, ...patch, id: run.id, questId: run.questId, updatedAt } : run,
        ),
      };
      await persistOptimistic(next);
    },
    [persistOptimistic],
  );

  const requestPilotUrlResearch = useCallback(
    async (runId: string) => {
      const current = dataRef.current;
      const run = current.realPilotRuns.find((item) => item.id === runId);
      if (!run) throw new Error("Real pilot run not found.");
      const result = await createOpenClawApproval(
        {
          actionKind: "url_research",
          purpose: run.purpose,
          urls: run.approvedUrls,
          extractionGoal: run.extractionGoal,
          riskNotes: `${run.riskReview} Approved URL research only. No login, form submission, purchase, PII harvesting, or terms bypass.`,
          successCriteria: run.successCriteria,
          expectedResult: "TeamLeader1A records evidence from the approved URLs and identifies the next safe validation step.",
        },
        { questId: run.questId, pilotRunId: run.id },
      );

      const now = new Date().toISOString();
      const nextCurrent = dataRef.current;
      const logId = id("log-pilot-url-research");
      const next: AppDataState = {
        ...nextCurrent,
        realPilotRuns: nextCurrent.realPilotRuns.map((item) =>
          item.id === run.id
            ? {
                ...item,
                status: result.blocked ? "failed" : "research_requested",
                updatedAt: now,
                commandIds: [result.commandId, ...item.commandIds.filter((commandId) => commandId !== result.commandId)],
                activityLogIds: [logId, ...item.activityLogIds],
              }
            : item,
        ),
        quests: nextCurrent.quests.map((quest) =>
          quest.id === run.questId
            ? {
                ...quest,
                openClawCommandIds: [result.commandId, ...quest.openClawCommandIds.filter((commandId) => commandId !== result.commandId)],
                nextAction: "Approve the URL research request, review the result, then request TeamLeader1A pilot review.",
              }
            : quest,
        ),
        activityLogs: [
          {
            id: logId,
            category: "approval",
            title: result.blocked ? "Real pilot URL research blocked" : "Real pilot URL research approval requested",
            detail: result.blocked
              ? `No browser research ran. ${result.safetyEvaluation.blockedReasons.join(" ")}`
              : "Approved URL research is queued behind a user approval. No browser research has run yet.",
            severity: result.blocked ? "danger" : "warning",
            createdAt: now,
            relatedQuestId: run.questId,
          },
          ...nextCurrent.activityLogs,
        ],
      };
      await persistOptimistic(next);
    },
    [createOpenClawApproval, persistOptimistic],
  );

  const requestPilotTeamLeaderReview = useCallback(
    async (runId: string) => {
      const current = dataRef.current;
      const run = current.realPilotRuns.find((item) => item.id === runId);
      const quest = run ? current.quests.find((item) => item.id === run.questId) : null;
      if (!run || !quest) throw new Error("Real pilot run not found.");
      const message = [
        `Review this real pilot for "${quest.title}".`,
        `Purpose: ${run.purpose}`,
        `Validation snapshot: ${run.validationChecklistSummary}`,
        `Risk review: ${run.riskReview}`,
        `Minimum test plan: ${run.minimumTestPlan}`,
        `Success criteria: ${run.successCriteria}`,
        `Kill criteria: ${run.killCriteria}`,
        "Do not browse, publish, send messages, spend money, launch, submit forms, or use --deliver. Summarize evidence, gaps, next safe action, and whether the pilot is ready for a controlled test plan.",
      ].join("\n");
      const result = await createOpenClawApproval(
        {
          actionKind: "agent_turn",
          agentProfileId: "main",
          message,
          expectedResult: "TeamLeader1A returns a local pilot review and recommended next safe step.",
        },
        { questId: run.questId, pilotRunId: run.id },
      );

      const now = new Date().toISOString();
      const nextCurrent = dataRef.current;
      const logId = id("log-pilot-review");
      const next: AppDataState = {
        ...nextCurrent,
        realPilotRuns: nextCurrent.realPilotRuns.map((item) =>
          item.id === run.id
            ? {
                ...item,
                status: result.blocked ? "failed" : "teamleader_review_requested",
                updatedAt: now,
                commandIds: [result.commandId, ...item.commandIds.filter((commandId) => commandId !== result.commandId)],
                activityLogIds: [logId, ...item.activityLogIds],
              }
            : item,
        ),
        quests: nextCurrent.quests.map((item) =>
          item.id === run.questId
            ? {
                ...item,
                openClawCommandIds: [result.commandId, ...item.openClawCommandIds.filter((commandId) => commandId !== result.commandId)],
                nextAction: "Approve the TeamLeader1A pilot review, then export the pilot report.",
              }
            : item,
        ),
        activityLogs: [
          {
            id: logId,
            category: "approval",
            title: result.blocked ? "TeamLeader1A pilot review blocked" : "TeamLeader1A pilot review approval requested",
            detail: result.blocked
              ? `No local agent turn ran. ${result.safetyEvaluation.blockedReasons.join(" ")}`
              : "A local TeamLeader1A review is queued behind approval. The prompt blocks browsing, publishing, messaging, launch, and spending.",
            severity: result.blocked ? "danger" : "warning",
            createdAt: now,
            relatedQuestId: run.questId,
          },
          ...nextCurrent.activityLogs,
        ],
      };
      await persistOptimistic(next);
    },
    [createOpenClawApproval, persistOptimistic],
  );

  const createAgentOrchestrationRun = useCallback(
    async (input: AgentOrchestrationInput) => {
      const current = dataRef.current;
      const quest = current.quests.find((item) => item.id === input.questId);
      if (!quest) throw new Error("Quest not found for agent orchestration run.");

      const now = new Date().toISOString();
      const runId = id("agent-run");
      const tasks = createOrchestrationTasks(runId, quest.id, quest.title);
      const logId = id("log-agent-orchestration");
      const messageId = id("msg-agent-orchestration");
      const objective =
        input.objective.trim() ||
        `Coordinate ${quest.title} through research, validation evidence, asset planning, approval checklist, and TeamLeader1A review.`;
      const run: AgentOrchestrationRun = {
        id: runId,
        questId: quest.id,
        title: `${quest.title} agent orchestration`,
        objective,
        status: "assigned",
        taskIds: tasks.map((task) => task.id),
        artifactIds: [],
        reviewIds: [],
        skillGaps: [
          "Evidence synthesis evaluator",
          "Artifact quality scorer",
          "Policy-aware launch checklist",
          quest.bottleneck ? `Bottleneck resolver: ${quest.bottleneck}` : "Experiment confidence scoring",
        ],
        teamLeaderSummary:
          "TeamLeader1A opened a local-only orchestration run. Agents will report internally; no spending, publishing, browser automation, outreach, or live OpenClaw command is authorized by this run.",
        createdAt: now,
        updatedAt: now,
      };

      const next: AppDataState = {
        ...current,
        agentOrchestrationRuns: [run, ...current.agentOrchestrationRuns],
        tasks: [...tasks, ...current.tasks],
        quests: current.quests.map((item) =>
          item.id === quest.id
            ? {
                ...item,
                progress: Math.max(item.progress, 42),
                currentStatus: "Agent orchestration run assigned",
                nextAction: "Complete local agent tasks, then let TeamLeader1A accept, reject, or request revision.",
              }
            : item,
        ),
        agents: current.agents.map((agent) =>
          tasks.some((task) => task.assignedAgentId === agent.id)
            ? {
                ...agent,
                status: agent.id === "teamleader1a" ? "active" : agent.status,
                currentTask:
                  agent.id === "teamleader1a"
                    ? `Briefing ${quest.title}`
                    : agent.currentTask,
                assignedQuestIds: agent.assignedQuestIds.includes(quest.id)
                  ? agent.assignedQuestIds
                  : [quest.id, ...agent.assignedQuestIds],
              }
            : agent,
        ),
        agentMessages: [
          {
            id: messageId,
            fromAgentId: "teamleader1a",
            toAgentId: "TeamLeader1A" as const,
            questId: quest.id,
            summary: "Agent orchestration run assigned.",
            details: run.teamLeaderSummary,
            createdAt: now,
            visibility: "user_summary" as const,
          },
          ...current.agentMessages,
        ].slice(0, 32),
        activityLogs: [
          {
            id: logId,
            category: "agent",
            title: "Agent orchestration run created",
            detail: `${tasks.length} local tasks were assigned for ${quest.title}. External actions still require separate approvals.`,
            severity: "success",
            createdAt: now,
            relatedQuestId: quest.id,
          },
          ...current.activityLogs,
        ],
      };

      await persistOptimistic(next);
      return runId;
    },
    [persistOptimistic],
  );

  const completeAgentTask = useCallback(
    async (taskId: string) => {
      const current = dataRef.current;
      const task = current.tasks.find((item) => item.id === taskId);
      const run = current.agentOrchestrationRuns.find((item) => item.taskIds.includes(taskId));
      if (!task || !run) return;

      const runTasks = current.tasks.filter((item) => run.taskIds.includes(item.id));
      if (!canTaskStart(task, runTasks) && task.status !== "in_progress" && task.status !== "review") {
        const now = new Date().toISOString();
        await persistOptimistic({
          ...current,
          tasks: current.tasks.map((item) => (item.id === task.id ? { ...item, status: "blocked" } : item)),
          activityLogs: [
            {
              id: id("log-task-blocked"),
              category: "agent",
              title: "Agent task blocked by dependencies",
              detail: `${task.title} cannot complete until required upstream artifacts are done.`,
              severity: "warning",
              createdAt: now,
              relatedQuestId: task.questId,
            },
            ...current.activityLogs,
          ],
        });
        return;
      }

      const now = new Date().toISOString();
      const quest = current.quests.find((item) => item.id === run.questId);
      const agent = current.agents.find((item) => item.id === task.assignedAgentId);
      const artifactId = id("agent-artifact");
      const artifact: AgentArtifact = {
        id: artifactId,
        runId: run.id,
        questId: run.questId,
        taskId: task.id,
        agentId: task.assignedAgentId,
        type: artifactTypeForAgent(task.assignedAgentId, task.title),
        title: `${agent?.name ?? task.assignedAgentId}: ${task.title}`,
        summary: `${agent?.name ?? task.assignedAgentId} completed a local internal artifact for TeamLeader1A review.`,
        content: artifactContentForAgent(agent?.name ?? task.assignedAgentId, task, quest?.title ?? run.title, run.objective),
        status: "ready_for_teamleader_review",
        createdAt: now,
        updatedAt: now,
      };
      const doneIds = new Set(runTasks.filter((item) => item.status === "done").map((item) => item.id));
      doneIds.add(task.id);
      const updatedTasks = current.tasks.map((item) => {
        if (item.id === task.id) return { ...item, status: "done" as const };
        if (!run.taskIds.includes(item.id)) return item;
        const dependenciesDone = item.dependencyIds.every((dependencyId) => doneIds.has(dependencyId));
        if (!dependenciesDone || item.status === "done") return item;
        if (item.assignedAgentId === "teamleader1a" && item.title.toLowerCase().includes("final")) {
          return { ...item, status: "review" as const };
        }
        if (item.status === "queued" || item.status === "blocked") return { ...item, status: "in_progress" as const };
        return item;
      });
      const updatedRunTasks = updatedTasks.filter((item) => run.taskIds.includes(item.id));
      const finalTask = updatedRunTasks.find((item) => item.assignedAgentId === "teamleader1a" && item.title.toLowerCase().includes("final"));
      const nextRunStatus =
        finalTask?.status === "review" || finalTask?.status === "done" ? "teamleader_review" : "in_progress";
      const message: AgentMessage = {
        id: id("msg-agent-artifact"),
        fromAgentId: task.assignedAgentId,
        toAgentId: "TeamLeader1A",
        questId: run.questId,
        summary:
          task.assignedAgentId === "teamleader1a"
            ? "TeamLeader1A completed a review-stage orchestration artifact."
            : `${agent?.name ?? task.assignedAgentId} submitted an internal report to TeamLeader1A.`,
        details: artifact.summary,
        createdAt: now,
        visibility: task.assignedAgentId === "teamleader1a" ? "user_summary" : "internal_report",
      };

      const next: AppDataState = {
        ...current,
        tasks: updatedTasks,
        agentArtifacts: [artifact, ...current.agentArtifacts],
        agentOrchestrationRuns: current.agentOrchestrationRuns.map((item) =>
          item.id === run.id
            ? {
                ...item,
                status: nextRunStatus,
                artifactIds: [artifact.id, ...item.artifactIds],
                teamLeaderSummary:
                  nextRunStatus === "teamleader_review"
                    ? "All dependency artifacts are ready. TeamLeader1A can now accept, reject, or request revision."
                    : `${agent?.name ?? task.assignedAgentId} completed ${task.title}. Next eligible agent tasks were activated.`,
                updatedAt: now,
              }
            : item,
        ),
        agents: current.agents.map((item) =>
          item.id === task.assignedAgentId
            ? {
                ...item,
                status: nextRunStatus === "teamleader_review" && item.id === "teamleader1a" ? "reviewing" : item.status,
                currentTask: nextRunStatus === "teamleader_review" ? "Review orchestration artifacts" : item.currentTask,
                recentContribution: artifact.summary,
                xp: Math.min(item.xpToNext, item.xp + 35),
                workload: Math.max(10, item.workload - 8),
              }
            : item,
        ),
        agentMessages: [message, ...current.agentMessages].slice(0, 32),
        activityLogs: [
          {
            id: id("log-agent-task"),
            category: "agent",
            title: "Agent task completed locally",
            detail: `${artifact.title} is ready for TeamLeader1A review.`,
            severity: "success",
            createdAt: now,
            relatedQuestId: run.questId,
          },
          ...current.activityLogs,
        ],
      };

      await persistOptimistic(next);
    },
    [persistOptimistic],
  );

  const reviewAgentRun = useCallback(
    async (runId: string, status: AgentRunReviewStatus) => {
      const current = dataRef.current;
      const run = current.agentOrchestrationRuns.find((item) => item.id === runId);
      if (!run) return;

      const now = new Date().toISOString();
      const quest = current.quests.find((item) => item.id === run.questId);
      const reviewId = id("agent-run-review");
      const requestedChanges =
        status === "needs_revision"
          ? [
              "Tighten evidence links to success metrics.",
              "Clarify assumptions that remain unproven.",
              "Make the next test smaller and easier to kill safely.",
            ]
          : [];
      const review: AgentRunReview = {
        id: reviewId,
        runId: run.id,
        questId: run.questId,
        reviewedBy: "TeamLeader1A",
        status,
        summary:
          status === "accepted"
            ? "TeamLeader1A accepted the internal agent run. The quest can move into a validation-safe pilot plan, but launch, publishing, spending, and external automation still require separate approvals."
            : status === "needs_revision"
              ? "TeamLeader1A requested revisions before this quest can move forward."
              : "TeamLeader1A rejected this orchestration pass. The idea should be redesigned, paused, or killed before further work.",
        requestedChanges,
        createdAt: now,
      };
      const revisionTask: Task | null =
        status === "needs_revision"
          ? {
              id: id("task-revision"),
              questId: run.questId,
              title: "TeamLeader1A coordinate revision pass",
              assignedAgentId: "teamleader1a",
              status: "in_progress",
              priority: "urgent",
              dependencyIds: [],
            }
          : null;
      const nextStatus: AgentOrchestrationRun["status"] =
        status === "accepted" ? "accepted" : status === "needs_revision" ? "needs_revision" : "rejected";
      const artifactStatus = status === "accepted" ? "accepted" : status === "needs_revision" ? "needs_revision" : "rejected";

      const next: AppDataState = {
        ...current,
        agentRunReviews: [review, ...current.agentRunReviews],
        agentArtifacts: current.agentArtifacts.map((artifact) =>
          artifact.runId === run.id
            ? {
                ...artifact,
                status: artifactStatus,
                updatedAt: now,
              }
            : artifact,
        ),
        agentOrchestrationRuns: current.agentOrchestrationRuns.map((item) =>
          item.id === run.id
            ? {
                ...item,
                status: nextStatus,
                reviewIds: [review.id, ...item.reviewIds],
                taskIds: revisionTask ? [revisionTask.id, ...item.taskIds] : item.taskIds,
                teamLeaderSummary: review.summary,
                updatedAt: now,
              }
            : item,
        ),
        tasks: [
          ...(revisionTask ? [revisionTask] : []),
          ...current.tasks.map((task) =>
            run.taskIds.includes(task.id) && task.assignedAgentId === "teamleader1a" && task.title.toLowerCase().includes("final")
              ? { ...task, status: "done" as const }
              : task,
          ),
        ],
        quests: current.quests.map((item) =>
          item.id === run.questId
            ? {
                ...item,
                currentStatus:
                  status === "accepted"
                    ? "Agent orchestration accepted by TeamLeader1A"
                    : status === "needs_revision"
                      ? "Agent orchestration needs revision"
                      : "Agent orchestration rejected",
                nextAction:
                  status === "accepted"
                    ? "Convert accepted artifacts into a validation report or real pilot plan. Risky actions still require approval."
                    : status === "needs_revision"
                      ? "Complete the revision pass, then ask TeamLeader1A to review again."
                      : "Pause or redesign this quest before allocating more work.",
                progress: status === "accepted" ? Math.max(item.progress, 62) : item.progress,
              }
            : item,
        ),
        agentMessages: [
          {
            id: id("msg-agent-review"),
            fromAgentId: "teamleader1a",
            toAgentId: "TeamLeader1A" as const,
            questId: run.questId,
            summary: `TeamLeader1A ${status.replace(/_/g, " ")} the orchestration run.`,
            details: review.summary,
            createdAt: now,
            visibility: "user_summary" as const,
          },
          ...current.agentMessages,
        ].slice(0, 32),
        activityLogs: [
          {
            id: id("log-agent-review"),
            category: "agent",
            title: "TeamLeader1A reviewed agent run",
            detail: `${quest?.title ?? run.title}: ${review.summary}`,
            severity: status === "accepted" ? "success" : status === "needs_revision" ? "warning" : "danger",
            createdAt: now,
            relatedQuestId: run.questId,
          },
          ...current.activityLogs,
        ],
      };

      await persistOptimistic(next);
    },
    [persistOptimistic],
  );

  const createMarketIntelligenceReport = useCallback(
    async (questId: string) => {
      const current = dataRef.current;
      const report = marketReportFromQuest(current, questId);
      const now = new Date().toISOString();
      const next: AppDataState = {
        ...current,
        marketIntelligenceReports: [report, ...current.marketIntelligenceReports],
        quests: current.quests.map((quest) =>
          quest.id === questId
            ? {
                ...quest,
                stage: quest.stage === "Idea discovered" ? "Researching" : quest.stage,
                progress: Math.max(quest.progress, report.evidenceScore >= 65 ? 58 : 44),
                currentStatus: report.status === "ready" ? "Market intelligence ready for experiment planning" : "Market intelligence needs more approved sources",
                nextAction: report.recommendedNextStep,
              }
            : quest,
        ),
        agentMessages: [
          {
            id: id("msg-market-intel"),
            fromAgentId: "teamleader1a",
            toAgentId: "TeamLeader1A" as const,
            questId,
            summary: "Market intelligence report prepared.",
            details: report.teamLeaderSummary,
            createdAt: now,
            visibility: "user_summary" as const,
          },
          ...current.agentMessages,
        ].slice(0, 32),
        activityLogs: [
          {
            id: id("log-market-intel"),
            category: "quest",
            title: "Market intelligence report generated",
            detail: `${report.title} scored ${report.evidenceScore}/100. No live scraping, publishing, or spend occurred.`,
            severity: report.status === "ready" ? "success" : "warning",
            createdAt: now,
            relatedQuestId: questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return report.id;
    },
    [persistOptimistic],
  );

  const createExperimentPlan = useCallback(
    async (input: ExperimentPlanInput) => {
      const current = dataRef.current;
      const quest = current.quests.find((item) => item.id === input.questId);
      if (!quest) throw new Error("Quest not found for experiment plan.");
      const now = new Date().toISOString();
      const experiment: Experiment = {
        id: id("experiment"),
        questId: input.questId,
        title: input.title.trim() || `${quest.title} bounded validation test`,
        hypothesis: input.hypothesis.trim() || `A small reversible test can validate ${quest.businessIdea} without risky external action.`,
        status: "planned",
        budgetCap: Math.max(0, input.budgetCap),
        metrics: [
          {
            id: id("metric"),
            label: input.successMetricLabel.trim() || "Primary validation signal",
            value: 0,
            target: Math.max(1, input.successMetricTarget),
            trend: "flat",
            status: "watch",
          },
          {
            id: id("metric"),
            label: input.failureMetricLabel.trim() || "Kill signal",
            value: 0,
            target: 1,
            trend: "flat",
            status: "watch",
          },
        ],
        startDate: now,
        learning: "Experiment created locally. Launch, publishing, spend, and external traffic require separate approval.",
      };
      const next: AppDataState = {
        ...current,
        experiments: [experiment, ...current.experiments],
        experimentQueue: [experiment.title, ...current.experimentQueue.filter((item) => item !== experiment.title)].slice(0, 8),
        quests: current.quests.map((item) =>
          item.id === input.questId
            ? {
                ...item,
                stage: "Test campaign",
                progress: Math.max(item.progress, 64),
                experimentIds: [experiment.id, ...item.experimentIds.filter((experimentId) => experimentId !== experiment.id)],
                nextAction: "Run local analysis or request separate approval before any external launch/spend.",
              }
            : item,
        ),
        activityLogs: [
          {
            id: id("log-experiment-plan"),
            category: "experiment",
            title: "Experiment plan created",
            detail: `${experiment.title} has a ${experiment.budgetCap === 0 ? "no-spend" : `$${experiment.budgetCap}`} cap and remains local until approved.`,
            severity: experiment.budgetCap === 0 ? "success" : "warning",
            createdAt: now,
            relatedQuestId: input.questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return experiment.id;
    },
    [persistOptimistic],
  );

  const analyzeExperiment = useCallback(
    async (experimentId: string) => {
      const current = dataRef.current;
      const experiment = current.experiments.find((item) => item.id === experimentId);
      if (!experiment) throw new Error("Experiment not found for analysis.");
      const analysis = experimentAnalysisFromExperiment(experiment);
      const now = new Date().toISOString();
      const nextStatus =
        analysis.recommendation === "kill"
          ? "failed"
          : analysis.recommendation === "scale_later"
            ? "complete"
            : experiment.status === "planned"
              ? "running"
              : experiment.status;
      const next: AppDataState = {
        ...current,
        experimentAnalyses: [analysis, ...current.experimentAnalyses],
        experiments: current.experiments.map((item) =>
          item.id === experiment.id
            ? {
                ...item,
                status: nextStatus as Experiment["status"],
                learning: analysis.notes,
              }
            : item,
        ),
        quests: current.quests.map((quest) =>
          quest.id === experiment.questId
            ? {
                ...quest,
                nextAction:
                  analysis.recommendation === "scale_later"
                    ? "Review evidence and request a separate scaling approval only if budget/risk checks pass."
                    : analysis.recommendation === "kill"
                      ? "Archive, redesign, or return to research before more work."
                      : "Continue or revise the bounded experiment locally.",
              }
            : quest,
        ),
        activityLogs: [
          {
            id: id("log-experiment-analysis"),
            category: "experiment",
            title: "Experiment analysis generated",
            detail: `${experiment.title}: ${analysis.recommendation.replace(/_/g, " ")} with ${analysis.confidenceScore}/100 confidence.`,
            severity: analysis.recommendation === "kill" ? "danger" : analysis.recommendation === "scale_later" ? "success" : "info",
            createdAt: now,
            relatedQuestId: experiment.questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return analysis.id;
    },
    [persistOptimistic],
  );

  const createProductionPack = useCallback(
    async (questId: string) => {
      const current = dataRef.current;
      const { pack, assets } = productionPackForQuest(current, questId);
      const now = new Date().toISOString();
      const next: AppDataState = {
        ...current,
        productionPacks: [pack, ...current.productionPacks],
        productionAssets: [...assets, ...current.productionAssets],
        quests: current.quests.map((quest) =>
          quest.id === questId
            ? {
                ...quest,
                stage: "Production",
                progress: Math.max(quest.progress, 70),
                currentStatus: "Local production pack drafted",
                nextAction: "Review claims and policy checks. Publishing or launch still requires approval.",
              }
            : quest,
        ),
        activityLogs: [
          {
            id: id("log-production-pack"),
            category: "quest",
            title: "Production pack created",
            detail: `${pack.title} contains ${assets.length} local assets. Nothing was published or deployed.`,
            severity: "success",
            createdAt: now,
            relatedQuestId: questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return pack.id;
    },
    [persistOptimistic],
  );

  const advanceProductionAsset = useCallback(
    async (assetId: string) => {
      const current = dataRef.current;
      const now = new Date().toISOString();
      const asset = current.productionAssets.find((item) => item.id === assetId);
      if (!asset) return;
      const nextStatus: ProductionAsset["status"] =
        asset.status === "draft"
          ? "claim_review"
          : asset.status === "claim_review"
            ? "ready_for_user_review"
            : asset.status === "ready_for_user_review"
              ? "approved_local"
              : asset.status;
      const nextAssets = current.productionAssets.map((item) =>
        item.id === assetId
          ? {
              ...item,
              status: nextStatus,
              updatedAt: now,
            }
          : item,
      );
      const nextPacks = current.productionPacks.map((pack) => {
        if (!pack.assetIds.includes(assetId)) return pack;
        const packAssets = nextAssets.filter((item) => pack.assetIds.includes(item.id));
        const allReady = packAssets.every((item) => item.status === "approved_local" || item.status === "ready_for_user_review");
        return {
          ...pack,
          status: allReady ? "ready_for_review" : pack.status,
          updatedAt: now,
          teamLeaderSummary: allReady
            ? "All assets are locally reviewable. This still does not authorize external publishing, spending, or launch."
            : pack.teamLeaderSummary,
        } satisfies ProductionPack;
      });
      await persistOptimistic({
        ...current,
        productionAssets: nextAssets,
        productionPacks: nextPacks,
        activityLogs: [
          {
            id: id("log-production-asset"),
            category: "quest",
            title: "Production asset advanced",
            detail: `${asset.title} moved to ${nextStatus.replace(/_/g, " ")}.`,
            severity: nextStatus === "approved_local" ? "success" : "info",
            createdAt: now,
            relatedQuestId: asset.questId,
          },
          ...current.activityLogs,
        ],
      });
    },
    [persistOptimistic],
  );

  const cancelOpenClawCommand = useCallback(
    async (commandId: string) => {
      const current = dataRef.current;
      const now = new Date().toISOString();
      const command = current.openClawCommands.find((item) => item.id === commandId);
      if (!command || ["complete", "failed", "cancelled"].includes(command.status)) return;
      const next: AppDataState = {
        ...current,
        openClawCommands: current.openClawCommands.map((item) =>
          item.id === commandId
            ? {
                ...item,
                status: "cancelled",
                completedAt: now,
                cancelReason: "Cancelled locally by the user before execution.",
                resultSummary: "Cancelled locally. No external action will be executed from this command record.",
              }
            : item,
        ),
        approvalRequests: current.approvalRequests.map((request) =>
          request.commandId === commandId && request.status === "pending" ? { ...request, status: "rejected" } : request,
        ),
        approvalDecisionRecords: [
          decisionRecord({
            approvalId: current.approvalRequests.find((request) => request.commandId === commandId)?.id,
            commandId,
            decision: "cancelled",
            actor: "user",
            reason: "Command record cancelled locally. No external action executed.",
            payloadSummary: command.command,
          }),
          ...current.approvalDecisionRecords,
        ],
        activityLogs: [
          {
            id: id("log-command-cancelled"),
            category: "openclaw",
            title: "OpenClaw command cancelled",
            detail: `${command.command} was cancelled locally.`,
            severity: "warning",
            createdAt: now,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
    },
    [persistOptimistic],
  );

  const markOpenClawCommandFailed = useCallback(
    async (commandId: string) => {
      const current = dataRef.current;
      const now = new Date().toISOString();
      const command = current.openClawCommands.find((item) => item.id === commandId);
      if (!command || ["complete", "failed", "cancelled"].includes(command.status)) return;
      const next: AppDataState = {
        ...current,
        openClawCommands: current.openClawCommands.map((item) =>
          item.id === commandId
            ? {
                ...item,
                status: "failed",
                completedAt: now,
                stderr: item.stderr ?? "Marked failed safely by the user before any further action.",
                resultSummary: "Marked failed safely. Retry requires a fresh approval.",
              }
            : item,
        ),
        approvalDecisionRecords: [
          decisionRecord({
            approvalId: current.approvalRequests.find((request) => request.commandId === commandId)?.id,
            commandId,
            decision: "failed_safe",
            actor: "user",
            reason: "Command marked failed safely. Retry requires a fresh approval.",
            payloadSummary: command.command,
          }),
          ...current.approvalDecisionRecords,
        ],
        activityLogs: [
          {
            id: id("log-command-failed"),
            category: "openclaw",
            title: "OpenClaw command marked failed safely",
            detail: `${command.command} was closed without executing any additional action.`,
            severity: "warning",
            createdAt: now,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
    },
    [persistOptimistic],
  );

  const retryOpenClawCommand = useCallback(
    async (commandId: string) => {
      const approval = dataRef.current.approvalRequests.find((request) => request.commandId === commandId && request.payload);
      if (!approval?.payload) return;
      await createOpenClawApproval(approval.payload, {
        questId: approval.questId,
        pilotRunId: approval.pilotRunId,
        parentApprovalId: approval.id,
        retryOfCommandId: commandId,
      });
    },
    [createOpenClawApproval],
  );

  const addAllowlistEntry = useCallback(
    async (kind: AllowlistKind, value: string, label?: string) => {
      const validation = safetyPolicyService.validateAllowlistEntry(kind, value);
      if (validation.blockedReasons.length > 0) {
        return { ok: false, message: validation.blockedReasons.join(" ") };
      }
      const current = dataRef.current;
      const duplicate = current.allowlistEntries.some(
        (entry) => entry.kind === kind && entry.value.toLowerCase() === validation.normalized.toLowerCase() && entry.status !== "removed",
      );
      if (duplicate) return { ok: false, message: "That allowlist entry already exists." };

      const entry = safetyPolicyService.makeAllowlistEntry(kind, validation.normalized, "user", label);
      const next: AppDataState = {
        ...current,
        allowlistEntries: [entry, ...current.allowlistEntries],
        userSettings: {
          ...current.userSettings,
          approvedResearchDomains:
            kind === "research_domain"
              ? [entry.value, ...current.userSettings.approvedResearchDomains.filter((item) => item !== entry.value)]
              : current.userSettings.approvedResearchDomains,
          approvedChannelTargets:
            kind === "channel_target"
              ? [entry.value, ...current.userSettings.approvedChannelTargets.filter((item) => item !== entry.value)]
              : current.userSettings.approvedChannelTargets,
        },
        approvalDecisionRecords: [
          decisionRecord({
            decision: "created",
            actor: "user",
            reason: `Allowlist entry added: ${entry.kind} / ${entry.value}`,
            payloadSummary: entry.value,
          }),
          ...current.approvalDecisionRecords,
        ],
      };
      await persistOptimistic(next);
      return { ok: true, message: "Allowlist entry added." };
    },
    [persistOptimistic],
  );

  const updateAllowlistEntryStatus = useCallback(
    async (entryId: string, status: AllowlistStatus) => {
      const current = dataRef.current;
      const now = new Date().toISOString();
      const entry = current.allowlistEntries.find((item) => item.id === entryId);
      if (!entry) return;
      const next: AppDataState = {
        ...current,
        allowlistEntries: current.allowlistEntries.map((item) => (item.id === entryId ? { ...item, status, updatedAt: now } : item)),
        approvalDecisionRecords: [
          decisionRecord({
            decision: status === "removed" ? "cancelled" : "created",
            actor: "user",
            reason: `Allowlist entry ${status}: ${entry.kind} / ${entry.value}`,
            payloadSummary: entry.value,
          }),
          ...current.approvalDecisionRecords,
        ],
      };
      await persistOptimistic(next);
    },
    [persistOptimistic],
  );

  const removeAllowlistEntry = useCallback(
    async (entryId: string) => {
      await updateAllowlistEntryStatus(entryId, "removed");
    },
    [updateAllowlistEntryStatus],
  );

  useEffect(() => {
    if (!simulationEnabled) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setData((current) => {
        const next = runSafeSimulationTick(current);
        dataRef.current = next;
        void persistenceService.saveState(next).then(setAdapter);
        return next;
      });
    }, 60_000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [simulationEnabled]);

  const selectObsidianVault = useCallback(async () => {
    if (!isTauriRuntime()) {
      setLastExportResult({
        ok: false,
        mode: "preview",
        message: "Folder picker requires the Tauri desktop shell. The browser fallback can still download Markdown files.",
      });
      return;
    }

    try {
      const dialog = await import("@tauri-apps/plugin-dialog");
      const selected = await dialog.open({
        directory: true,
        multiple: false,
        title: "Select Obsidian vault folder",
      });

      if (typeof selected === "string") {
        await updateSettings({ ...dataRef.current.userSettings, obsidianVaultPath: selected });
      }
    } catch (error) {
      setLastExportResult({
        ok: false,
        mode: "preview",
        message: `Vault picker failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }, [updateSettings]);

  const exportObsidianNote = useCallback(
    async (note: ObsidianNote) => {
      const current = dataRef.current;
      const markdown = renderMarkdownNote(note);
      const tauriResult = await exportWithTauri(note, current.userSettings.obsidianVaultPath, markdown);
      const result = tauriResult ?? (await saveBrowserDownload(note, markdown));

      const exportedNote = {
        ...note,
        lastExportPreviewAt: new Date().toISOString(),
      };
      const next: AppDataState = {
        ...current,
        obsidianNotes: current.obsidianNotes.map((item) => (item.id === note.id ? exportedNote : item)),
        activityLogs: [
          {
            id: `obsidian-export-${Date.now()}`,
            category: "obsidian",
            title: result.ok ? "Markdown export completed" : "Markdown export failed",
            detail: result.message,
            severity: result.ok ? "success" : "warning",
            createdAt: new Date().toISOString(),
            relatedQuestId: note.linkedQuestId,
          },
          ...current.activityLogs,
        ],
      };

      setLastExportResult(result);
      await persist(next);
      return result;
    },
    [persist],
  );

  const exportRealPilotReport = useCallback(
    async (runId: string) => {
      const current = dataRef.current;
      const run = current.realPilotRuns.find((item) => item.id === runId);
      if (!run) {
        return {
          ok: false,
          mode: "preview" as const,
          message: "Real pilot run not found.",
        };
      }

      const now = new Date().toISOString();
      const note = buildRealPilotNote(run, current);
      const noteExists = current.obsidianNotes.some((item) => item.id === note.id);
      const logId = id("log-pilot-export");
      const next: AppDataState = {
        ...current,
        obsidianNotes: noteExists
          ? current.obsidianNotes.map((item) => (item.id === note.id ? note : item))
          : [note, ...current.obsidianNotes],
        realPilotRuns: current.realPilotRuns.map((item) =>
          item.id === run.id
            ? {
                ...item,
                status: "exported",
                updatedAt: now,
                artifactNoteIds: [note.id, ...item.artifactNoteIds.filter((noteId) => noteId !== note.id)],
                activityLogIds: [logId, ...item.activityLogIds],
              }
            : item,
        ),
        quests: current.quests.map((quest) =>
          quest.id === run.questId
            ? {
                ...quest,
                relatedObsidianNoteIds: [note.id, ...quest.relatedObsidianNoteIds.filter((noteId) => noteId !== note.id)],
                nextAction: "Review the exported pilot report, then decide whether to revise, kill, or request approval for a controlled test.",
              }
            : quest,
        ),
        activityLogs: [
          {
            id: logId,
            category: "obsidian",
            title: "Real pilot report prepared",
            detail: `${note.title} was assembled with validation, risk, test plan, command history, and safety boundary.`,
            severity: "info",
            createdAt: now,
            relatedQuestId: run.questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return exportObsidianNote(note);
    },
    [exportObsidianNote, persistOptimistic],
  );

  const revealExportedPath = useCallback(async (path: string) => {
    if (!isTauriRuntime()) {
      setLastExportResult({
        ok: false,
        mode: "preview",
        message: "Opening a file location requires the Tauri desktop shell.",
      });
      return;
    }

    const opener = (await import("@tauri-apps/plugin-opener")) as {
      revealItemInDir?: (path: string) => Promise<void>;
      openPath: (path: string) => Promise<void>;
    };
    if (opener.revealItemInDir) {
      await opener.revealItemInDir(path);
      return;
    }
    await opener.openPath(path);
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      adapter,
      isLoading,
      simulationEnabled,
      lastExportResult,
      refresh,
      resetLocalData,
      updateApprovalStatus,
      updateSettings,
      recordSystemLog,
      runSimulationNow,
      setSimulationEnabled,
      selectObsidianVault,
      exportObsidianNote,
      revealExportedPath,
      refreshOpenClawStatus,
      syncOpenClawAgents,
      requestGatewayStart,
      requestTeamLeaderTurn,
      requestUrlResearch,
      requestChannelMessage,
      createRealPilotRun,
      updateRealPilotRun,
      requestPilotUrlResearch,
      requestPilotTeamLeaderReview,
      exportRealPilotReport,
      cancelOpenClawCommand,
      markOpenClawCommandFailed,
      retryOpenClawCommand,
      addAllowlistEntry,
      updateAllowlistEntryStatus,
      removeAllowlistEntry,
      createAgentOrchestrationRun,
      completeAgentTask,
      reviewAgentRun,
      createMarketIntelligenceReport,
      createExperimentPlan,
      analyzeExperiment,
      createProductionPack,
      advanceProductionAsset,
    }),
    [
      data,
      adapter,
      isLoading,
      simulationEnabled,
      lastExportResult,
      refresh,
      resetLocalData,
      updateApprovalStatus,
      updateSettings,
      recordSystemLog,
      runSimulationNow,
      selectObsidianVault,
      exportObsidianNote,
      revealExportedPath,
      refreshOpenClawStatus,
      syncOpenClawAgents,
      requestGatewayStart,
      requestTeamLeaderTurn,
      requestUrlResearch,
      requestChannelMessage,
      createRealPilotRun,
      updateRealPilotRun,
      requestPilotUrlResearch,
      requestPilotTeamLeaderReview,
      exportRealPilotReport,
      cancelOpenClawCommand,
      markOpenClawCommandFailed,
      retryOpenClawCommand,
      addAllowlistEntry,
      updateAllowlistEntryStatus,
      removeAllowlistEntry,
      createAgentOrchestrationRun,
      completeAgentTask,
      reviewAgentRun,
      createMarketIntelligenceReport,
      createExperimentPlan,
      analyzeExperiment,
      createProductionPack,
      advanceProductionAsset,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
}
