import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type {
  ActivityLog,
  AllowlistEntry,
  AllowlistKind,
  AllowlistStatus,
  AgentMessage,
  AgentArtifact,
  AgentOrchestrationRun,
  AgentRunReview,
  AgentRunReviewStatus,
  AgentTurnResult,
  AgentWorkSession,
  ApprovedBusinessCockpit,
  ApprovedBusiness,
  ApprovalRequest,
  ApprovalDecisionRecord,
  ApprovalStatus,
  AffiliateOffer,
  AnalyticsSnapshot,
  AutopilotJob,
  AutonomousImprovementRun,
  BatchApprovalItem,
  BatchApprovalPackage,
  BudgetLedgerEntry,
  BusinessIteration,
  BusinessIdea,
  BusinessMetricSnapshot,
  BusinessOperatingRun,
  BusinessProposal,
  BusinessTask,
  BrowserResearchArtifact,
  BrowserResearchFetch,
  BrowserResearchRun,
  BrowserSafetyReceipt,
  CandidateBusinessIdea,
  CandidateScorecard,
  CommandLedgerEntry,
  ContentInventoryItem,
  ContentItem,
  DemandProofReport,
  Experiment,
  ExperimentDecision,
  ExperimentAnalysis,
  ExternalActionLockMode,
  ExternalPlatformRequirement,
  EvidenceQualityScore,
  EvidenceCitation,
  ExecutionReceipt,
  JobRun,
  GuildOfficeStation,
  MarketIntelligenceReport,
  LearningCard,
  LocalAssetFile,
  MissionArtifact,
  MissionAgentId,
  MissionAgentStep,
  MissionApprovalBatch,
  MissionBriefSection,
  MissionBriefSectionKind,
  MissionDraft,
  MissionDraftStepPlan,
  MissionRun,
  MissionTask,
  OpportunityHunt,
  OpportunityHuntDepth,
  OpportunityCandidate,
  OpenClawApprovalPayload,
  OfferClaimReview,
  OpenClawCommand,
  OpenClawMcpServer,
  ObsidianNote,
  ProductionAsset,
  ProductionPack,
  ProductionDestination,
  PlatformExecutionPackage,
  PublishingPackage,
  ProductBlueprint,
  ProductDraftApproval,
  ProductPreview,
  ProductPreviewSection,
  ProductRevisionRequest,
  PublishPayloadPreview,
  RenderedProductPreview,
  ApprovalGateState,
  PublicResearchFetch,
  PublicResearchRun,
  PublishingDiff,
  Quest,
  ResearchEvidence,
  ResearchQueryPlan,
  ResearchSourceCapture,
  RealPilotRun,
  RiskLevel,
  SeoKeywordCluster,
  SiteProject,
  Task,
  TeamLeaderChatMessage,
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
  type BrowserPublicReadResult,
  type OpenClawBridgeResult,
  type PublicResearchFetchResult,
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
  updateExternalActionLock: (mode: ExternalActionLockMode, reason: string) => Promise<void>;
  recordSystemLog: (input: { title: string; detail: string; severity?: "info" | "success" | "warning" | "danger" }) => Promise<void>;
  runSimulationNow: () => Promise<void>;
  setSimulationEnabled: (enabled: boolean) => void;
  selectObsidianVault: () => Promise<void>;
  exportObsidianNote: (note: ObsidianNote) => Promise<ExportResult>;
  revealExportedPath: (path: string) => Promise<void>;
  refreshOpenClawStatus: () => Promise<void>;
  syncOpenClawAgents: () => Promise<void>;
  refreshOpenClawMcpStatus: () => Promise<void>;
  installOpenClawMcpLocalKit: () => Promise<void>;
  runBrowserBrokerDiagnostic: () => Promise<void>;
  requestGatewayStart: () => Promise<void>;
  requestTeamLeaderTurn: (message: string) => Promise<void>;
  sendTeamLeaderChatMessage: (message: string, options?: { requestLiveTurn?: boolean; createMissionDraft?: boolean; questId?: string; opportunityHuntDepth?: OpportunityHuntDepth }) => Promise<void>;
  createOpportunityHuntFromMessage: (message: string, depth?: OpportunityHuntDepth) => Promise<string>;
  cleanupAcceptanceTestData: () => Promise<void>;
  approveBusinessProposal: (proposalId: string) => Promise<string>;
  runBusinessOperatingCycle: (businessId: string) => Promise<string>;
  addBusinessMetricSnapshot: (businessId: string, input: Partial<BusinessMetricSnapshot>) => Promise<string>;
  exportBusinessAssetPack: (businessId: string) => Promise<ExportResult>;
  exportProductProofPack: (previewId: string) => Promise<ExportResult>;
  operatingAutopilotEnabled: boolean;
  setOperatingAutopilotEnabled: (enabled: boolean) => void;
  updateBusinessProposalStatus: (proposalId: string, status: BusinessProposal["status"]) => Promise<void>;
  approveProductLocalDraft: (previewId: string) => Promise<void>;
  requestProductRevision: (previewId: string, reason?: string) => Promise<string>;
  prepareProductPublishApproval: (previewId: string) => Promise<string>;
  preparePlatformPublishApproval: (packageId: string) => Promise<string>;
  createMissionDraftFromMessage: (input: { message: string; questId: string }) => Promise<string>;
  requestMissionStart: (draftId: string) => Promise<string>;
  retryMissionStep: (stepId: string) => Promise<void>;
  skipMissionStep: (stepId: string) => Promise<void>;
  convertMissionStepToLocalDraft: (stepId: string) => Promise<void>;
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
  createSeoResearchPack: (questId: string) => Promise<string>;
  createExperimentPlan: (input: ExperimentPlanInput) => Promise<string>;
  analyzeExperiment: (experimentId: string) => Promise<string>;
  createProductionPack: (questId: string) => Promise<string>;
  advanceProductionAsset: (assetId: string) => Promise<void>;
  createSiteProject: (questId: string) => Promise<string>;
  createContentItemFromCluster: (clusterId: string) => Promise<string>;
  prepareStaticSiteDiff: (siteProjectId: string) => Promise<string>;
  createAffiliateOffer: (questId: string) => Promise<string>;
  reviewAffiliateOffer: (offerId: string) => Promise<string>;
  syncSearchConsoleReadOnly: (questId?: string) => Promise<string>;
  createLearningDecision: (questId: string) => Promise<string>;
  createBatchApprovalFromDiff: (diffId: string) => Promise<string>;
  runControlledJobNow: (scheduleId: string) => Promise<string>;
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

function buildTeamLeaderLocalReply(state: AppDataState, userMessage: string) {
  const pendingApprovals = state.approvalRequests.filter((request) => request.status === "pending");
  const blockedApprovals = state.approvalRequests.filter((request) => request.status === "blocked");
  const activeQuests = state.quests.filter((quest) => !["Archived", "Failed", "Retired"].includes(quest.stage));
  const topQuest = [...activeQuests].sort((a, b) => b.progress - a.progress)[0];
  const riskyCommands = state.openClawCommands.filter((command) => command.status === "requires_approval" || command.status === "queued");
  const bottlenecks = state.dashboardSummary.currentBottlenecks.slice(0, 2);
  const lower = userMessage.toLowerCase();

  const focus =
    lower.includes("approval") || lower.includes("approve")
      ? "approval desk"
      : lower.includes("quest") || lower.includes("business")
        ? "quest portfolio"
        : lower.includes("openclaw") || lower.includes("agent")
          ? "OpenClaw agent layer"
          : "mission status";

  return [
    `TeamLeader1A local reply (${focus}): I can help from the local control layer right now. This reply did not browse, publish, message anyone, spend money, launch anything, or run an external OpenClaw command.`,
    topQuest
      ? `Best current quest to inspect: ${topQuest.title}. Stage: ${topQuest.stage}. Progress: ${topQuest.progress}%. Next action: ${topQuest.nextAction}`
      : "No active quest is selected. Create or restore a quest before trying to launch any experiment.",
    pendingApprovals.length > 0
      ? `Pending approvals: ${pendingApprovals.length}. Review them before any risky action can move forward.`
      : "No pending approvals are currently blocking the local plan.",
    blockedApprovals.length > 0
      ? `Blocked records: ${blockedApprovals.length}. These should be revised instead of forced through.`
      : "No newly blocked approval records need attention.",
    riskyCommands.length > 0
      ? `OpenClaw commands waiting or queued: ${riskyCommands.length}. They remain locked behind approval gates.`
      : "No OpenClaw command is waiting to execute.",
    bottlenecks.length > 0
      ? `Current bottlenecks: ${bottlenecks.join("; ")}.`
      : "No major bottleneck is listed in the dashboard summary.",
    "Recommended next move: use a validation or pilot workflow to collect evidence, then ask for a live TeamLeader1A turn only if you want the local OpenClaw runtime to respond through the approval gate.",
  ].join("\n\n");
}

const opportunityAgentOrder: MissionAgentId[] = [
  "agent-researcher",
  "agent-seo",
  "agent-content",
  "agent-writer",
  "agent-production",
  "agent-publish",
  "agent-action",
  "teamleader1a",
];

const stationIdByAgentId: Record<MissionAgentId, string> = {
  teamleader1a: "station-teamleader",
  "agent-researcher": "station-research",
  "agent-seo": "station-seo",
  "agent-writer": "station-writer",
  "agent-content": "station-content",
  "agent-production": "station-production",
  "agent-publish": "station-publish",
  "agent-action": "station-action",
};

const taskBlueprints: Array<{
  agentId: MissionAgentId;
  title: string;
  objective: string;
  expectedOutput: string;
  artifact: string;
  source?: string;
}> = [
  {
    agentId: "agent-researcher",
    title: "Research zero-budget demand signals",
    objective: "Find a low-cost business angle with visible demand and competitor proof.",
    expectedOutput: "Demand brief, competitor evidence, audience pain, and source links.",
    artifact: "Demand proof brief",
    source: "public web, forums, product directories",
  },
  {
    agentId: "agent-seo",
    title: "Map SEO opportunity",
    objective: "Find reachable search intent clusters and content gaps for the strongest idea.",
    expectedOutput: "Keyword clusters, search intent, and ranking entry points.",
    artifact: "SEO opportunity map",
    source: "search signals and competitor pages",
  },
  {
    agentId: "agent-content",
    title: "Create content strategy",
    objective: "Turn evidence into a practical content engine that can validate without spend.",
    expectedOutput: "Content calendar, channel plan, and asset sequence.",
    artifact: "Content calendar",
  },
  {
    agentId: "agent-writer",
    title: "Draft first content assets",
    objective: "Draft sample copy that avoids unsupported claims and income guarantees.",
    expectedOutput: "Landing copy, article outlines, and newsletter issue draft.",
    artifact: "Claim-safe copy pack",
  },
  {
    agentId: "agent-production",
    title: "Propose MVP production pack",
    objective: "Define what can be built locally with zero budget and reviewed before publishing.",
    expectedOutput: "MVP asset checklist, local file plan, and launch-readiness gaps.",
    artifact: "Production proposal",
  },
  {
    agentId: "agent-publish",
    title: "Prepare publishing gate",
    objective: "Identify where the content could publish and what approval is needed.",
    expectedOutput: "Publishing destination options and approval checklist.",
    artifact: "Publishing checklist",
  },
  {
    agentId: "agent-action",
    title: "Build operations checklist",
    objective: "Define the safe next actions, blocked actions, and validation workflow.",
    expectedOutput: "Operations checklist and approval-gated action queue.",
    artifact: "Operations checklist",
  },
  {
    agentId: "teamleader1a",
    title: "Synthesize business proposal",
    objective: "Review every agent artifact and prepare the user-facing proposal.",
    expectedOutput: "Business proposal with evidence, risks, validation score, and next actions.",
    artifact: "TeamLeader1A business proposal",
  },
];

function agentLabel(agentId: MissionAgentId) {
  const labels: Record<MissionAgentId, string> = {
    teamleader1a: "TeamLeader1A",
    "agent-researcher": "AgentResearcher",
    "agent-seo": "AgentSeo",
    "agent-writer": "AgentWriter",
    "agent-content": "AgentContent",
    "agent-production": "AgentProduction",
    "agent-publish": "AgentPublish",
    "agent-action": "AgentAction",
  };
  return labels[agentId];
}

function shouldStartOpportunityHunt(message: string) {
  const lower = message.toLowerCase();
  const statusOrNavigationOnly = [
    "what are the agents doing",
    "what is happening",
    "where is",
    "where can i",
    "where do i",
    "show me",
    "how can i use",
    "how do i use",
    "status",
    "help",
  ].some((phrase) => lower.startsWith(phrase));
  if (statusOrNavigationOnly) return false;

  const delegationSignals = [
    "find",
    "research",
    "search",
    "browse",
    "scrape",
    "validate",
    "plan",
    "create",
    "build",
    "make",
    "propose",
    "analyze",
    "investigate",
    "compare",
    "improve",
    "write",
    "draft",
    "produce",
    "prepare",
    "start",
    "run",
    "generate",
    "choose",
    "recommend",
    "seo",
    "content",
    "production",
    "newsletter",
    "affiliate",
    "website",
    "product",
    "template",
  ];

  return (
    lower.includes("business idea") ||
    lower.includes("make money") ||
    lower.includes("zero budget") ||
    lower.includes("best online business") ||
    lower.includes("find me") ||
    lower.includes("proposal") ||
    delegationSignals.some((signal) => lower.includes(signal)) ||
    lower.split(/\s+/).filter(Boolean).length >= 4
  );
}

function money(value: number) {
  return `$${Math.max(0, value).toLocaleString()}`;
}

function isFiverrPrompt(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("fiverr") || lower.includes("gig") || lower.includes("marketplace service");
}

function depthFetchLimit(depth: OpportunityHuntDepth) {
  if (depth === "quick") return 4;
  if (depth === "deep") return 10;
  return 7;
}

function depthBrowserLimit(depth: OpportunityHuntDepth) {
  if (depth === "quick") return 2;
  if (depth === "deep") return 6;
  return 4;
}

function depthLabel(depth: OpportunityHuntDepth) {
  if (depth === "quick") return "Quick";
  if (depth === "deep") return "Deep";
  return "Fast";
}

function sourceTypeFromPack(packCategory: string): ResearchEvidence["sourceType"] {
  if (packCategory === "marketplace") return "marketplace";
  if (packCategory === "community") return "forum";
  if (packCategory === "production" || packCategory === "platform") return "directory";
  return "public_web";
}

function safeFetchSummary(result: PublicResearchFetchResult, fallbackTitle: string) {
  if (result.ok) {
    return result.excerpt?.slice(0, 240) || `Fetched ${result.title || fallbackTitle} as a public read-only source.`;
  }
  return `Fetch failed safely: ${result.error || "source unavailable"}. Source remains a candidate citation, not proof.`;
}

function safeBrowserSummary(result: BrowserPublicReadResult) {
  if (result.ok) {
    const screenshot = result.screenshotCaptured ? " Screenshot artifact captured." : " Screenshot artifact path was not available.";
    return `${result.excerpt?.slice(0, 220) || result.title || "Browser-rendered public page read completed."}${screenshot}`;
  }
  return `Browser public read failed safely: ${result.error || "source unavailable"}. No login, form, spend, publishing, or messaging occurred.`;
}

async function buildPublicResearchBundle(current: AppDataState, huntId: string, proposalId: string, message: string, depth: OpportunityHuntDepth) {
  const now = new Date().toISOString();
  const fiverrMode = isFiverrPrompt(message);
  const promptLower = message.toLowerCase();
  const runId = id("public-research-run");
  const enabledPacks = current.researchSourcePacks.filter((pack) => pack.enabled);
  const prioritizedPacks = enabledPacks
    .map((pack) => {
      let score = 0;
      if (pack.id.includes("ai-workflows")) score += promptLower.includes("ai") || promptLower.includes("workflow") || promptLower.includes("zero budget") ? 4 : 2;
      if (pack.id.includes("marketplaces")) score += fiverrMode || promptLower.includes("service") || promptLower.includes("template") ? 4 : 1;
      if (pack.id.includes("zero-budget-production")) score += promptLower.includes("zero budget") || promptLower.includes("free") ? 4 : 2;
      if (pack.id.includes("local-services")) score += promptLower.includes("lead") || promptLower.includes("local") ? 4 : 1;
      return { pack, score };
    })
    .sort((a, b) => b.score - a.score || a.pack.name.localeCompare(b.pack.name))
    .map((item) => item.pack);
  const sourcePacks = prioritizedPacks.slice(0, depth === "quick" ? 2 : depth === "deep" ? 4 : 3);
  const urls = sourcePacks.flatMap((pack) => pack.urls.map((source) => ({ pack, source }))).slice(0, depthFetchLimit(depth));
  const fetches: PublicResearchFetch[] = [];
  const citations: EvidenceCitation[] = [];
  const browserRunId = id("browser-research-run");
  const browserFetches: BrowserResearchFetch[] = [];
  const browserArtifacts: BrowserResearchArtifact[] = [];
  const browserSafetyReceipts: BrowserSafetyReceipt[] = [];
  const browserLimit = depthBrowserLimit(depth);

  for (const [index, { pack, source }] of urls.entries()) {
    const fetchId = id("public-research-fetch");
    const startedAt = new Date().toISOString();
    let result: PublicResearchFetchResult;
    try {
      result = await openclawService.fetchPublicResearch({ url: source.url, sourcePackId: pack.id, timeoutSeconds: depth === "quick" ? 8 : 12 });
    } catch (error) {
      result = {
        ok: false,
        url: source.url,
        sourcePackId: pack.id,
        statusCode: null,
        title: null,
        excerpt: null,
        contentType: null,
        error: error instanceof Error ? error.message : String(error),
        fetchedAt: new Date().toISOString(),
      };
    }
    let browserFetchId: string | undefined;
    let browserArtifactIds: string[] = [];
    let browserResult: BrowserPublicReadResult | null = null;
    if (index < browserLimit) {
      browserFetchId = id("browser-research-fetch");
      const browserStartedAt = new Date().toISOString();
      browserResult = await openclawService.readPublicBrowserSource({
        url: source.url,
        sourcePackId: pack.id,
        huntId,
        purpose: `Opportunity hunt evidence for: ${message.slice(0, 160)}`,
        timeoutSeconds: depth === "quick" ? 14 : 18,
        captureScreenshot: true,
      });
      const browserCompletedAt = new Date().toISOString();
      const receiptId = id("browser-safety-receipt");
      browserSafetyReceipts.push({
        id: receiptId,
        runId: browserRunId,
        url: source.url,
        allowed: browserResult.ok,
        blockedReasons: browserResult.ok ? [] : [browserResult.error || "Browser public read failed safely."],
        safetyChecklist: [
          "Exact public URL only",
          "GET/read-only page access",
          "No login or credential use",
          "No form submission",
          "No purchase or spend",
          "No publishing or messaging",
        ],
        receipt: browserResult.safetyReceipt,
        createdAt: browserCompletedAt,
      });
      browserFetches.push({
        id: browserFetchId,
        runId: browserRunId,
        sourcePackId: pack.id,
        url: source.url,
        status: browserResult.ok ? "captured" : "failed",
        title: browserResult.title ?? source.title,
        excerpt: browserResult.excerpt ?? undefined,
        screenshotPath: browserResult.screenshotPath ?? undefined,
        screenshotCaptured: browserResult.screenshotCaptured,
        basicLinks: browserResult.basicLinks,
        error: browserResult.error ?? undefined,
        safetyReceiptId: receiptId,
        startedAt: browserStartedAt,
        completedAt: browserCompletedAt,
      });
      const artifactId = id("browser-research-artifact");
      browserArtifactIds = [artifactId];
      browserArtifacts.push({
        id: artifactId,
        runId: browserRunId,
        fetchId: browserFetchId,
        huntId,
        proposalId,
        type: "page_summary",
        url: source.url,
        title: browserResult.title ?? result.title ?? source.title,
        summary: safeBrowserSummary(browserResult),
        screenshotPath: browserResult.screenshotPath ?? undefined,
        safetyReceiptId: receiptId,
        createdAt: browserCompletedAt,
      });
    }
    const completedAt = new Date().toISOString();
    fetches.push({
      id: fetchId,
      runId,
      sourcePackId: pack.id,
      url: source.url,
      status: result.ok ? "fetched" : "failed",
      httpStatus: result.statusCode ?? undefined,
      title: browserResult?.title ?? result.title ?? source.title,
      excerpt: browserResult?.excerpt ?? result.excerpt ?? undefined,
      error: result.error ?? undefined,
      browserResearchFetchId: browserFetchId,
      startedAt,
      completedAt,
    });
    citations.push({
      id: id("evidence-citation"),
      huntId,
      researchRunId: runId,
      sourcePackId: pack.id,
      fetchId,
      title: result.title || source.title,
      url: source.url,
      sourceType: source.sourceType || sourceTypeFromPack(pack.category),
      summary: browserResult?.ok
        ? `${safeFetchSummary(result, source.title)} Browser evidence: ${safeBrowserSummary(browserResult)}`
        : safeFetchSummary(result, source.title),
      excerpt: browserResult?.excerpt ?? result.excerpt ?? undefined,
      browserArtifactIds,
      confidence: result.ok || browserResult?.ok ? 76 : 45,
      capturedAt: completedAt,
    });
    await new Promise((resolve) => window.setTimeout(resolve, depth === "deep" ? 450 : 250));
  }

  const candidateBlueprints = fiverrMode
    ? [
        {
          key: "fiverr-ai-workflow-gig",
          title: "Fiverr AI Workflow Gig For Freelancers",
          model: "Online services" as const,
          audience: "Freelancers and solo service providers who want practical AI workflow setup help.",
          summary: "A zero-budget Fiverr service package drafted locally first, with manual login and a separate publish approval.",
          zeroBudgetPath: "Draft gig fields, scope, FAQ, and policy checks locally; no Fiverr publishing until a separate exact approval.",
          platformNeeds: ["Fiverr account", "Manual user login", "Separate publish approval"],
          scores: [78, 68, 96, 76, 58, 70],
        },
        {
          key: "ai-workflow-kit",
          title: "Practical AI Workflow Template Kit",
          model: "Templates" as const,
          audience: "Freelancers who want repeatable client-work templates.",
          summary: "A local template and checklist pack validated through content and free public evidence before monetization.",
          zeroBudgetPath: "Create template samples and a local landing page first; publish only after approval.",
          platformNeeds: ["Static site or Obsidian export", "Optional newsletter later"],
          scores: [75, 72, 98, 84, 82, 72],
        },
        {
          key: "local-service-leadgen",
          title: "Local Service Lead-Gen Research Site",
          model: "Lead generation" as const,
          audience: "Local service businesses with fragmented online discovery.",
          summary: "A no-spend research/content site that validates one niche before any outreach or paid data collection.",
          zeroBudgetPath: "Prepare local directory content and validation criteria; no outreach or scraping contact lists.",
          platformNeeds: ["Static website draft", "Manual compliance review"],
          scores: [70, 66, 88, 64, 70, 62],
        },
      ]
    : [
        {
          key: "ai-workflow-kit",
          title: "Practical AI Workflow Template Kit",
          model: "Templates" as const,
          audience: "Freelancers and solo operators who want repeatable client-work systems.",
          summary: "A zero-budget template/content business around AI-assisted client onboarding, meeting notes, proposals, and delivery checklists.",
          zeroBudgetPath: "Create local template samples, publish only after approval, and measure signup/save intent before spend.",
          platformNeeds: ["Static site draft", "Newsletter draft", "Obsidian export"],
          scores: [82, 74, 98, 86, 82, 76],
        },
        {
          key: "local-service-leadgen",
          title: "Local Service Lead-Gen Validation Site",
          model: "Lead generation" as const,
          audience: "Home-service providers and searchers in one narrow local niche.",
          summary: "A local-first SEO research site that tests commercial intent without buying ads or contacting businesses.",
          zeroBudgetPath: "Draft local pages and evidence map; no scraping contact lists, outreach, or paid ads.",
          platformNeeds: ["Static site draft", "Compliance checklist"],
          scores: [76, 69, 90, 68, 72, 68],
        },
        {
          key: "notion-template-pack",
          title: "Client Operations Notion Template Pack",
          model: "Templates" as const,
          audience: "Freelancers who need simple project intake and client delivery systems.",
          summary: "A no-spend digital template pack with local previews and marketplace requirements held behind approval.",
          zeroBudgetPath: "Build local template screenshots/copy first; marketplace listing requires separate approval.",
          platformNeeds: ["Template files", "Optional marketplace account later"],
          scores: [72, 71, 94, 80, 74, 66],
        },
      ];

  const citationIdsByHint = new Map<string, string[]>();
  for (const { pack, source } of urls) {
    const citation = citations.find((item) => item.url === source.url && item.sourcePackId === pack.id);
    if (!citation) continue;
    const hint = source.candidateHint ?? "ai-workflow-kit";
    citationIdsByHint.set(hint, [...(citationIdsByHint.get(hint) ?? []), citation.id]);
  }

  const scorecards: CandidateScorecard[] = [];
  const candidates: CandidateBusinessIdea[] = candidateBlueprints.map((candidate, index) => {
    const candidateId = id("candidate-business");
    const scorecardId = id("candidate-scorecard");
    const directCitationIds = citationIdsByHint.get(candidate.key) ?? [];
    const fallbackCitationIds = citations.slice(0, 3).map((item) => item.id);
    const evidenceCitationIds = (directCitationIds.length ? directCitationIds : fallbackCitationIds).slice(0, depth === "quick" ? 2 : 4);
    const [demandScore, seoScore, zeroBudgetScore, productionScore, platformRiskRaw, evidenceScore] = candidate.scores;
    const fetchedBonus = citations.filter((item) => evidenceCitationIds.includes(item.id) && item.confidence >= 70).length * 2;
    const totalScore = clampScore((demandScore + seoScore + zeroBudgetScore + productionScore + (100 - platformRiskRaw) + evidenceScore) / 6 + fetchedBonus);
    scorecards.push({
      id: scorecardId,
      huntId,
      candidateId,
      demandScore,
      seoScore,
      zeroBudgetScore,
      productionScore,
      platformRiskScore: platformRiskRaw,
      evidenceScore: clampScore(evidenceScore + fetchedBonus),
      totalScore,
      notes: [
        `${depthLabel(depth)} research used ${sourcePacks.length} curated source packs.`,
        "Scores are directional and require validation before launch.",
        candidate.platformNeeds.length ? `Platform needs: ${candidate.platformNeeds.join(", ")}.` : "No external platform needed for local draft.",
      ],
    });
    return {
      id: candidateId,
      huntId,
      researchRunId: runId,
      rank: index + 1,
      status: "candidate" as const,
      title: candidate.title,
      businessModel: candidate.model,
      audience: candidate.audience,
      summary: candidate.summary,
      zeroBudgetPath: candidate.zeroBudgetPath,
      platformNeeds: candidate.platformNeeds,
      evidenceCitationIds,
      scorecardId,
      whyItMightWin: [
        `Zero-budget fit scored ${zeroBudgetScore}/100.`,
        `Production path scored ${productionScore}/100.`,
        "Can be reviewed locally before any public action.",
      ],
      whyItMightLose: [
        platformRiskRaw >= 70 ? "Platform or compliance risk is meaningful." : "Needs sharper positioning to stand out.",
        "Evidence is directional until a real validation test runs.",
      ],
      nextValidationStep: "Prepare local assets and define one no-spend validation test before any external launch.",
      createdAt: now,
      updatedAt: now,
    };
  });

  const ranked = [...candidates].sort((a, b) => {
    const aScore = scorecards.find((item) => item.candidateId === a.id)?.totalScore ?? 0;
    const bScore = scorecards.find((item) => item.candidateId === b.id)?.totalScore ?? 0;
    return bScore - aScore;
  });
  const rankedCandidates = ranked.map((candidate, index) => ({ ...candidate, rank: index + 1, status: index === 0 ? "winner" as const : "candidate" as const }));
  const browserRun: BrowserResearchRun = {
    id: browserRunId,
    huntId,
    publicResearchRunId: runId,
    depth,
    status: browserFetches.some((item) => item.status === "captured") ? "completed" : browserFetches.length ? "failed" : "completed",
    fetchIds: browserFetches.map((item) => item.id),
    artifactIds: browserArtifacts.map((item) => item.id),
    safetyReceiptIds: browserSafetyReceipts.map((item) => item.id),
    startedAt: now,
    completedAt: new Date().toISOString(),
    summary: `Browser public read captured ${browserFetches.filter((item) => item.status === "captured").length}/${browserFetches.length} approved public pages with screenshots where the local browser was available.`,
    executionReceipt: `safe-browser-public-read:${browserRunId}:${depth}:${browserFetches.length}-urls:no-login:no-forms:no-spend:no-publish`,
  };
  const run: PublicResearchRun = {
    id: runId,
    huntId,
    depth,
    status: fetches.some((item) => item.status === "fetched") ? "completed" : "failed",
    sourcePackIds: sourcePacks.map((pack) => pack.id),
    fetchIds: fetches.map((item) => item.id),
    browserResearchRunId: browserRun.id,
    evidenceCitationIds: citations.map((item) => item.id),
    candidateIdeaIds: rankedCandidates.map((candidate) => candidate.id),
    startedAt: now,
    completedAt: new Date().toISOString(),
    summary: `Public research ${fetches.some((item) => item.status === "fetched") ? "completed" : "failed safely"} with ${fetches.filter((item) => item.status === "fetched").length}/${fetches.length} sources fetched.`,
    executionReceipt: `safe-public-research:${runId}:GET-only:${depth}:${fetches.length}-urls:browser-read-${browserFetches.length}:no-login:no-forms:no-spend:no-publish`,
  };
  return {
    run,
    fetches,
    citations,
    candidates: rankedCandidates,
    scorecards,
    browserResearch: {
      run: browserRun,
      fetches: browserFetches,
      artifacts: browserArtifacts,
      safetyReceipts: browserSafetyReceipts,
    },
  };
}

function buildBudgetPlan(current: AppDataState, proposalId: string, options: { requiredSpend: number; recommendedSpend: number; businessBudgetCap: number; zeroBudgetPath: string; assumptions: string[] }) {
  const starting = current.dashboardSummary.totalStartingCapital || current.userSettings.totalStartingCapital || 0;
  const remaining = current.dashboardSummary.remainingCapital ?? Math.max(starting - current.dashboardSummary.allocatedCapital, 0);
  const approvalBlockers = [
    options.requiredSpend > remaining ? `Required spend ${money(options.requiredSpend)} exceeds remaining capital ${money(remaining)}.` : "",
    options.requiredSpend > options.businessBudgetCap ? `Required spend ${money(options.requiredSpend)} exceeds proposal cap ${money(options.businessBudgetCap)}.` : "",
  ].filter(Boolean);
  return {
    id: `budget-plan-${proposalId}`,
    currency: "USD" as const,
    portfolioStartingCapital: starting,
    portfolioRemainingCapital: remaining,
    businessBudgetCap: options.businessBudgetCap,
    requiredSpend: options.requiredSpend,
    recommendedSpend: options.recommendedSpend,
    zeroBudgetPath: options.zeroBudgetPath,
    breakEvenEstimate:
      options.requiredSpend === 0
        ? "No paid break-even is required for the first validation pass because required spend is $0."
        : `Recover ${money(options.requiredSpend)} before any scale recommendation; spend still needs separate approval.`,
    spendApprovalRequired: options.requiredSpend > 0 || options.recommendedSpend > 0,
    budgetRisk:
      approvalBlockers.length > 0
        ? options.requiredSpend > remaining
          ? "over_remaining" as const
          : "over_cap" as const
        : options.requiredSpend > 0
          ? "needs_spend_approval" as const
          : "within_cap" as const,
    approvalBlockers,
    assumptions: options.assumptions,
  };
}

function proposalBudgetBlockers(proposal: BusinessProposal) {
  const plan = proposal.budgetPlan;
  if (!plan) return ["Budget plan is missing."];
  return [
    ...plan.approvalBlockers,
    plan.requiredSpend > plan.portfolioRemainingCapital ? `Required spend ${money(plan.requiredSpend)} exceeds remaining capital ${money(plan.portfolioRemainingCapital)}.` : "",
    plan.requiredSpend > plan.businessBudgetCap ? `Required spend ${money(plan.requiredSpend)} exceeds proposal cap ${money(plan.businessBudgetCap)}.` : "",
  ].filter(Boolean);
}

function buildProposalMarkdown(proposal: BusinessProposal, evidence: ResearchEvidence[], destinations: ProductionDestination[], contents: ContentInventoryItem[]) {
  return [
    `# ${proposal.title}`,
    "",
    `## Recommended Idea`,
    proposal.recommendedIdea,
    "",
    `## TeamLeader1A Recommendation`,
    proposal.teamLeaderRecommendation,
    "",
    `## Evidence`,
    ...evidence.map((item) => `- ${item.title}: ${item.summary} (${item.url})`),
    "",
    `## SEO Plan`,
    ...proposal.seoPlan.map((item) => `- ${item}`),
    "",
    `## Content Plan`,
    ...proposal.contentPlan.map((item) => `- ${item}`),
    "",
    `## Production Plan`,
    ...proposal.productionPlan.map((item) => `- ${item}`),
    "",
    `## Publishing Destinations`,
    ...destinations.map((item) => `- ${item.name}: ${item.description} (${item.status.replace(/_/g, " ")})`),
    "",
    `## Budget Plan`,
    `- Portfolio remaining capital: ${money(proposal.budgetPlan.portfolioRemainingCapital)}`,
    `- Business budget cap: ${money(proposal.budgetPlan.businessBudgetCap)}`,
    `- Required spend: ${money(proposal.budgetPlan.requiredSpend)}`,
    `- Recommended spend: ${money(proposal.budgetPlan.recommendedSpend)}`,
    `- Zero-budget path: ${proposal.budgetPlan.zeroBudgetPath}`,
    "",
    `## Content Inventory`,
    ...contents.map((item) => `- ${item.title}: ${item.summary}`),
    "",
    `## Validation Test`,
    proposal.zeroBudgetValidationTest,
    "",
    `## Risks`,
    ...proposal.risks.map((item) => `- ${item}`),
  ].join("\n");
}

const operatingPhases: Array<{ phase: BusinessIteration["phase"]; agentId: MissionAgentId; title: string; objective: string; output: string }> = [
  {
    phase: "research",
    agentId: "agent-researcher",
    title: "Refresh demand evidence",
    objective: "Check whether the approved business still has public demand signals and weak spots.",
    output: "Evidence refresh, competitor notes, and unsupported assumptions.",
  },
  {
    phase: "validate",
    agentId: "teamleader1a",
    title: "Re-score validation gate",
    objective: "Review proof, budget, assumptions, and kill criteria before any launch action.",
    output: "Validation score, blockers, and next decision.",
  },
  {
    phase: "produce",
    agentId: "agent-production",
    title: "Refresh local production assets",
    objective: "Prepare or improve local-only drafts and platform packages.",
    output: "Local asset file updates and publishing package notes.",
  },
  {
    phase: "review",
    agentId: "agent-action",
    title: "Review operating checklist",
    objective: "Convert agent work into safe next actions and approval-gated external actions.",
    output: "Operating checklist, receipts, and approval boundaries.",
  },
  {
    phase: "improve",
    agentId: "agent-content",
    title: "Improve content strategy",
    objective: "Turn evidence into better content and validation experiments.",
    output: "Content improvement plan and next safe tasks.",
  },
];

function artifactContentForBusinessAgent(agentId: MissionAgentId, proposal: BusinessProposal) {
  if (agentId === "agent-researcher") {
    return [
      "## Research Brief",
      proposal.whyMightWork.map((item) => `- ${item}`).join("\n"),
      "",
      "## Competitor And Evidence Notes",
      proposal.evidenceIds.length ? proposal.evidenceIds.map((item) => `- Evidence record: ${item}`).join("\n") : "- Needs more source-backed evidence before launch.",
    ].join("\n");
  }
  if (agentId === "agent-seo") {
    return ["## SEO Plan", ...proposal.seoPlan.map((item) => `- ${item}`), "", "## Search Intent", "- Prioritize practical, low-hype, beginner-friendly queries."].join("\n");
  }
  if (agentId === "agent-content") {
    return ["## Content Strategy", ...proposal.contentPlan.map((item) => `- ${item}`), "", "## Calendar", "- Draft one validation article, one checklist, and one offer explainer before publishing approval."].join("\n");
  }
  if (agentId === "agent-writer") {
    return [
      "## Draft Copy",
      `Headline: ${proposal.recommendedIdea}`,
      "Promise: practical help, no guaranteed income, validation first.",
      "CTA: join the waitlist or request the free draft after reviewing the proof.",
    ].join("\n");
  }
  if (agentId === "agent-production") {
    return ["## Production Proposal", ...proposal.productionPlan.map((item) => `- ${item}`), "", "## Launch Readiness Gaps", "- External publishing and platform submission require separate approval."].join("\n");
  }
  if (agentId === "agent-publish") {
    return ["## Publishing Checklist", "- Confirm destination.", "- Review claims.", "- Confirm user approval.", "- Do not publish automatically."].join("\n");
  }
  if (agentId === "agent-action") {
    return ["## Operations Checklist", "- Keep work local.", "- Track receipts.", "- Ask for approval only when an external action is required."].join("\n");
  }
  return ["## TeamLeader1A Synthesis", proposal.teamLeaderRecommendation, "", "External actions remain approval-gated."].join("\n");
}

function buildBusinessOperatingBundle(current: AppDataState, proposal: BusinessProposal, businessId: string, questId: string, now: string) {
  const cockpitId = id("business-cockpit");
  const operatingRunId = id("business-operating-run");
  const cycleNumber = current.businessOperatingRuns.filter((run) => run.businessId === businessId).length + 1;
  const taskIds = operatingPhases.map(() => id("business-task"));
  const iterationIds = operatingPhases.map(() => id("business-iteration"));
  const receiptIds = operatingPhases.map(() => id("execution-receipt"));
  const localAssetFileIds = ["fiverr", "landing", "article", "newsletter", "sop", "obsidian"].map(() => id("local-asset-file"));
  const publishingPackageId = id("publishing-package");
  const metricSnapshotId = id("business-metric");
  const ledgerEntryId = id("budget-ledger");
  const autopilotJobId = id("autopilot-job");
  const queryPlanId = id("research-query-plan");
  const opportunityCandidateId = id("opportunity-candidate");
  const evidenceQualityIds = proposal.evidenceIds.slice(0, 4).map(() => id("evidence-quality"));
  const agentArtifacts = opportunityAgentOrder.map((agentId) => {
    const type: AgentArtifact["type"] =
      agentId === "agent-researcher"
        ? "research_brief"
        : agentId === "agent-seo"
          ? "seo_map"
          : agentId === "agent-content"
            ? "content_brief"
            : agentId === "agent-writer"
              ? "draft"
              : agentId === "agent-production"
                ? "asset_plan"
                : agentId === "agent-publish"
                  ? "publish_checklist"
                  : agentId === "agent-action"
                    ? "ops_checklist"
                    : "teamleader_summary";
    return {
      id: id("agent-artifact"),
      runId: operatingRunId,
      questId,
      agentId,
      type,
      title: `${agentLabel(agentId)} artifact for ${proposal.recommendedIdea}`,
      summary: `${agentLabel(agentId)} produced a structured local artifact for the approved business operating loop.`,
      content: artifactContentForBusinessAgent(agentId, proposal),
      status: "accepted" as const,
      createdAt: now,
      updatedAt: now,
    } satisfies AgentArtifact;
  });
  const businessTasks: BusinessTask[] = operatingPhases.map((phase, index) => ({
    id: taskIds[index],
    huntId: proposal.huntId,
    proposalId: proposal.id,
    businessId,
    agentId: phase.agentId,
    title: phase.title,
    objective: phase.objective,
    status: index < 2 ? "now_working" : index === operatingPhases.length - 1 ? "queued" : "done",
    progress: index < 2 ? 64 : index === operatingPhases.length - 1 ? 25 : 100,
    currentArtifact: phase.output,
    currentSource: index === 0 ? "Safe public source refresh only" : undefined,
    expectedOutput: phase.output,
    approvalRequired: false,
    logs: [
      `Budget known: cap ${money(proposal.budgetPlan.businessBudgetCap)}, required spend ${money(proposal.budgetPlan.requiredSpend)}.`,
      "Safe autonomous lane only: research, planning, scoring, and local drafts.",
      "External publishing, messaging, spending, login, connector execution, and forms remain locked.",
    ],
    startedAt: now,
    updatedAt: now,
    completedAt: index > 1 && index < operatingPhases.length - 1 ? now : undefined,
  }));
  const iterations: BusinessIteration[] = operatingPhases.map((phase, index) => ({
    id: iterationIds[index],
    businessId,
    runId: operatingRunId,
    cycleNumber,
    phase: phase.phase,
    status: index < 2 ? "running" : index === operatingPhases.length - 1 ? "queued" : "complete",
    agentId: phase.agentId,
    objective: phase.objective,
    output: `${phase.output} No external action executed.`,
    evidenceIds: proposal.evidenceIds,
    artifactIds: agentArtifacts.filter((artifact) => artifact.agentId === phase.agentId).map((artifact) => artifact.id),
    receiptIds: [receiptIds[index]],
    startedAt: now,
    updatedAt: now,
    completedAt: index > 1 && index < operatingPhases.length - 1 ? now : undefined,
  }));
  const receipts: ExecutionReceipt[] = operatingPhases.map((phase, index) => ({
    id: receiptIds[index],
    businessId,
    proposalId: proposal.id,
    taskId: taskIds[index],
    agentId: phase.agentId,
    actionType: `safe_${phase.phase}`,
    title: `${phase.title} receipt`,
    summary: `${agentLabel(phase.agentId)} ran ${phase.phase} work locally. ${phase.output}`,
    source: index === 0 ? "Browser Research Broker / curated public source packs" : "Mission Control local operating loop",
    artifactIds: agentArtifacts.filter((artifact) => artifact.agentId === phase.agentId).map((artifact) => artifact.id),
    budgetEffect: "No spend. Budget ledger records $0 planned operating cost for this safe cycle.",
    externalAction: false,
    approvalRequired: false,
    status: "success",
    nextAction: index === operatingPhases.length - 1 ? "Review TeamLeader1A next recommendation." : operatingPhases[index + 1].title,
    createdAt: now,
  }));
  const localAssetFiles: LocalAssetFile[] = [
    {
      id: localAssetFileIds[0],
      businessId,
      title: `${proposal.recommendedIdea} Fiverr gig package`,
      type: "fiverr_gig",
      platform: "Fiverr",
      intendedPath: `OpenClaw/Businesses/${filenameSafe(proposal.recommendedIdea)}/fiverr-gig.md`,
      fileName: "fiverr-gig.md",
      content: ["# Fiverr Gig Draft", "", `Title: ${proposal.recommendedIdea}`, "", ...proposal.productionPlan.map((item) => `- ${item}`), "", "Publish status: local draft only. User login and a separate exact publish approval are required later."].join("\n"),
      status: "preview_only",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: localAssetFileIds[1],
      businessId,
      title: `${proposal.recommendedIdea} landing page draft`,
      type: "landing_page",
      platform: "Static website",
      intendedPath: `OpenClaw/Businesses/${filenameSafe(proposal.recommendedIdea)}/landing-page.md`,
      fileName: "landing-page.md",
      content: ["# Landing Page Draft", "", proposal.summary, "", "## Why this may help", ...proposal.whyMightWork.map((item) => `- ${item}`)].join("\n"),
      status: "preview_only",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: localAssetFileIds[2],
      businessId,
      title: "Validation article draft",
      type: "article",
      platform: "Blog/CMS",
      intendedPath: `OpenClaw/Businesses/${filenameSafe(proposal.recommendedIdea)}/article-draft.md`,
      fileName: "article-draft.md",
      content: ["# Article Draft", "", ...proposal.contentPlan.map((item) => `- ${item}`)].join("\n"),
      status: "preview_only",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: localAssetFileIds[3],
      businessId,
      title: "Newsletter issue draft",
      type: "newsletter",
      platform: "Newsletter",
      intendedPath: `OpenClaw/Businesses/${filenameSafe(proposal.recommendedIdea)}/newsletter-draft.md`,
      fileName: "newsletter-draft.md",
      content: ["# Newsletter Draft", "", "A practical update that asks readers to validate the idea before any paid product is offered."].join("\n"),
      status: "preview_only",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: localAssetFileIds[4],
      businessId,
      title: "Operating SOP",
      type: "sop",
      platform: "Local workflow",
      intendedPath: `OpenClaw/Businesses/${filenameSafe(proposal.recommendedIdea)}/sop.md`,
      fileName: "sop.md",
      content: ["# Operating SOP", "", "1. Review evidence.", "2. Improve local draft.", "3. Enter metrics.", "4. Ask for approval before external action."].join("\n"),
      status: "preview_only",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: localAssetFileIds[5],
      businessId,
      title: "Obsidian export pack outline",
      type: "obsidian_pack",
      platform: "Obsidian",
      intendedPath: `OpenClaw/Businesses/${filenameSafe(proposal.recommendedIdea)}/obsidian-pack.md`,
      fileName: "obsidian-pack.md",
      content: buildProposalMarkdown(proposal, current.researchEvidence.filter((item) => proposal.evidenceIds.includes(item.id)), current.productionDestinations.filter((item) => proposal.publishingDestinationIds.includes(item.id)), current.contentInventoryItems.filter((item) => proposal.contentInventoryIds.includes(item.id))),
      status: "preview_only",
      createdAt: now,
      updatedAt: now,
    },
  ];
  const publishingPackage: PublishingPackage = {
    id: publishingPackageId,
    businessId,
    destinationId: proposal.publishingDestinationIds[0],
    platform: proposal.externalPlatformRequirementIds.length ? "Fiverr / marketplace draft" : "Static website / newsletter draft",
    title: `${proposal.recommendedIdea} publishing package`,
    status: "local_draft",
    localAssetFileIds,
    approvalBoundary: "This package is a local draft. Publishing, connector execution, login automation, form submission, messaging, launch, and spending require separate approval.",
    requiredUserSteps: ["Review claims and evidence", "Confirm platform destination", "Approve exact external action only when ready"],
    connectorActionsBlocked: ["publish", "submit_form", "send_message", "purchase", "login_automation", "connector_execute"],
    createdAt: now,
    updatedAt: now,
  };
  const metricSnapshot: BusinessMetricSnapshot = {
    id: metricSnapshotId,
    businessId,
    traffic: 0,
    clicks: 0,
    leads: 0,
    conversions: 0,
    revenue: 0,
    cost: 0,
    timeSpentHours: 0,
    confidence: proposal.validationScore,
    notes: "Initial business cockpit snapshot. Add real manual metrics after validation activity.",
    createdAt: now,
  };
  const ledgerEntry: BudgetLedgerEntry = {
    id: ledgerEntryId,
    businessId,
    type: "planned_spend",
    amount: 0,
    currency: "USD",
    description: "Initial safe operating loop uses $0. Any future spend requires approval.",
    createdAt: now,
  };
  const operatingRun: BusinessOperatingRun = {
    id: operatingRunId,
    businessId,
    status: "running",
    currentCycle: "research",
    cycleNumber,
    iterationIds,
    taskIds,
    receiptIds,
    summary: "Safe business operating loop started: research, validate, produce local drafts, review, and improve.",
    nextAction: "Review receipts, then add manual metrics or run another safe local cycle.",
    startedAt: now,
    updatedAt: now,
  };
  const autopilotJob: AutopilotJob = {
    id: autopilotJobId,
    businessId,
    type: "research_refresh",
    status: "queued",
    safeAutonomous: true,
    approvalRequired: false,
    title: "Safe public research refresh",
    result: "Queued while app is open. No external action will execute.",
    runAt: now,
    updatedAt: now,
  };
  const cockpit: ApprovedBusinessCockpit = {
    id: cockpitId,
    businessId,
    objective: `Operate "${proposal.recommendedIdea}" as a validation-first business experiment.`,
    currentStage: "Safe operating loop active",
    operatingRunIds: [operatingRunId],
    iterationIds,
    agentArtifactIds: agentArtifacts.map((artifact) => artifact.id),
    executionReceiptIds: receiptIds,
    metricSnapshotIds: [metricSnapshotId],
    budgetLedgerEntryIds: [ledgerEntryId],
    productionAssetIds: [],
    localAssetFileIds,
    publishingPackageIds: [publishingPackageId],
    autopilotJobIds: [autopilotJobId],
    nextBestActions: [
      "Review the first operating-loop receipts.",
      "Add manual metrics after any user-run validation test.",
      "Request a separate approval before spending, publishing, messaging, or submitting a platform form.",
    ],
    healthScore: Math.round((proposal.validationScore + proposal.qualityScore) / 2),
    createdAt: now,
    updatedAt: now,
  };
  const queryPlan: ResearchQueryPlan = {
    id: queryPlanId,
    huntId: proposal.huntId,
    businessId,
    prompt: `Refresh evidence for ${proposal.recommendedIdea}`,
    depth: current.userSettings.defaultOpportunityHuntDepth ?? "fast",
    queries: [
      `${proposal.recommendedIdea} audience problem`,
      `${proposal.recommendedIdea} competitor examples`,
      `${proposal.recommendedIdea} zero budget validation`,
    ],
    sourcePackIds: current.researchSourcePacks.slice(0, 4).map((pack) => pack.id),
    blockedTerms: ["guaranteed income", "fake reviews", "spam", "scrape login", "auto purchase"],
    safeMode: "public_read_only",
    createdAt: now,
  };
  const opportunityCandidate: OpportunityCandidate = {
    id: opportunityCandidateId,
    huntId: proposal.huntId,
    businessId,
    title: proposal.recommendedIdea,
    summary: proposal.summary,
    score: proposal.validationScore,
    reasons: proposal.whyMightWork,
    riskFlags: proposal.risks,
    sourceIds: proposal.evidenceIds,
    status: "winner",
    createdAt: now,
  };
  const evidenceQualityScores: EvidenceQualityScore[] = proposal.evidenceIds.slice(0, 4).map((evidenceId, index) => ({
    id: evidenceQualityIds[index],
    evidenceId,
    source: current.researchEvidence.find((item) => item.id === evidenceId)?.url ?? "local evidence record",
    credibility: 72 + index * 3,
    freshness: 68,
    relevance: 78,
    confidence: Math.min(92, 72 + index * 5),
    grade: index === 0 ? "strong" : "moderate",
    notes: ["Source-backed enough for validation planning; not enough for income claims.", "Needs metric feedback after the first user-run test."],
    createdAt: now,
  }));
  return {
    cockpit,
    operatingRun,
    iterations,
    receipts,
    agentArtifacts,
    businessTasks,
    localAssetFiles,
    publishingPackage,
    metricSnapshot,
    ledgerEntry,
    autopilotJob,
    queryPlan,
    opportunityCandidate,
    evidenceQualityScores,
  };
}

function buildProductStudioRecords(
  current: AppDataState,
  proposal: BusinessProposal,
  businessId: string,
  now: string,
  localAssetFiles: LocalAssetFile[],
  publishingPackage: PublishingPackage,
) {
  const destination = current.productionDestinations.find((item) => proposal.publishingDestinationIds.includes(item.id));
  const platformPackage = current.platformExecutionPackages.find((item) => proposal.platformExecutionPackageIds.includes(item.id));
  const fiverrMode = platformPackage?.platform.toLowerCase().includes("fiverr") ?? false;
  const blueprintId = id("product-blueprint");
  const previewId = id("product-preview");
  const gateId = id("approval-gate");
  const exactFields = platformPackage?.exactFields ?? {
    "Product name": proposal.title.replace("Business Proposal: ", ""),
    Destination: destination?.name ?? publishingPackage.platform,
    "Local draft": proposal.contentPlan.join(" / "),
  };
  const fullDraft = localAssetFiles.map((file) => [`## ${file.title}`, file.content].join("\n\n")).join("\n\n---\n\n");
  const sectionBlueprints: Array<{
    kind: ProductPreviewSection["kind"];
    title: string;
    summary: string;
    content: string;
    fields?: Record<string, string>;
    status: ProductPreviewSection["status"];
  }> = [
    {
      kind: "overview",
      title: "Product overview",
      summary: "The product, buyer, problem, offer, destination, and current locks.",
      content: [
        `Product: ${fiverrMode ? "Fiverr gig draft" : "Local product draft"} for ${proposal.title.replace("Business Proposal: ", "")}`,
        `Buyer: ${proposal.targetAudience}`,
        `Problem solved: ${proposal.summary}`,
        `Offer/deliverable: ${proposal.productionPlan[0] ?? "Local draft package"}`,
        `Intended destination: ${destination?.name ?? publishingPackage.platform}`,
        `Locked actions: publish, spend, message, login automation, form submission, purchase, connector execution.`,
      ].join("\n"),
      status: "passed",
    },
    {
      kind: "full_draft",
      title: "Full local draft",
      summary: "Exact product content to inspect before any publish request.",
      content: fullDraft,
      status: fullDraft.trim() ? "passed" : "missing",
    },
    {
      kind: "platform_fields",
      title: fiverrMode ? "Fiverr platform fields" : "Platform fields",
      summary: "Exact fields that would later be submitted only after a separate approval.",
      content: Object.entries(exactFields).map(([key, value]) => `${key}: ${value}`).join("\n"),
      fields: exactFields,
      status: Object.keys(exactFields).length ? "passed" : "missing",
    },
    {
      kind: "assets",
      title: "Product Files",
      summary: "Local files and content created by agents.",
      content: localAssetFiles.map((file) => `- ${file.title}: ${file.intendedPath}`).join("\n"),
      status: localAssetFiles.length ? "passed" : "needs_review",
    },
    {
      kind: "claims_safety",
      title: "Claims & Safety Check",
      summary: "Claims, policy, and blocked behavior review.",
      content: [
        "- No guaranteed income claims.",
        "- No fake reviews, spam, hidden outreach, or misleading promises.",
        "- No purchases, paid promotion, login automation, form submission, or connector execution.",
        "- Manual platform terms review is still required before external use.",
        ...(platformPackage?.policyChecks.map((check) => `- ${check}`) ?? []),
      ].join("\n"),
      status: "needs_review",
    },
    {
      kind: "publishing_preview",
      title: "Publishing preview",
      summary: "What a later approval would ask for; nothing external happens here.",
      content: [
        `Destination: ${destination?.name ?? publishingPackage.platform}`,
        `User login required: ${platformPackage?.userLoginRequired ? "yes, manual login only" : "not configured"}`,
        "What the app will not do from local draft approval: publish, spend, message, log in, submit forms, purchase, execute connectors, or change external accounts.",
        publishingPackage.approvalBoundary,
      ].join("\n"),
      status: "needs_review",
    },
    {
      kind: "revision_requests",
      title: "Revision requests",
      summary: "Safe internal revisions requested before publishing.",
      content: "No revision requests yet.",
      status: "passed",
    },
  ];
  const sections = sectionBlueprints.map((section) => ({
    id: id("product-section"),
    previewId,
    kind: section.kind,
    title: section.title,
    summary: section.summary,
    content: section.content,
    fields: section.fields,
    status: section.status,
    createdAt: now,
    updatedAt: now,
  })) satisfies ProductPreviewSection[];
  const blueprint: ProductBlueprint = {
    id: blueprintId,
    businessId,
    proposalId: proposal.id,
    name: fiverrMode ? `${proposal.title.replace("Business Proposal: ", "")} Fiverr gig draft` : `${proposal.title.replace("Business Proposal: ", "")} product draft`,
    productType: fiverrMode ? "fiverr_gig" : "landing_page",
    audience: proposal.targetAudience,
    problemSolved: proposal.summary,
    offerDeliverable: proposal.productionPlan[0] ?? "Local draft package",
    valueProposition: proposal.whyMightWork[0] ?? "Validation-first local draft; results are not guaranteed.",
    intendedDestination: destination?.name ?? publishingPackage.platform,
    zeroBudgetDeliveryPath: proposal.budgetPlan.zeroBudgetPath,
    stage: "review",
    readinessScore: proposal.validationScore,
    requiredAssetIds: localAssetFiles.map((file) => file.id),
    blockedExternalActions: ["publish", "message", "spend", "login_automation", "submit_form", "purchase", "connector_execute"],
    nextProductionStep: "View the product, then approve the local draft or request revision.",
    createdAt: now,
    updatedAt: now,
  };
  const preview: ProductPreview = {
    id: previewId,
    blueprintId,
    businessId,
    proposalId: proposal.id,
    destinationId: destination?.id,
    platformPackageId: platformPackage?.id,
    publishingPackageId: publishingPackage.id,
    status: "needs_product_review",
    localDraftApproved: false,
    sectionIds: sections.map((section) => section.id),
    assetFileIds: localAssetFiles.map((file) => file.id),
    claimsSafetyStatus: "needs_review",
    missingItems: localAssetFiles.length ? [] : ["At least one local product file is required before a publish approval."],
    readinessScore: proposal.validationScore,
    renderedPreviewIds: [`rendered-${previewId}`],
    approvalGateStateId: gateId,
    createdAt: now,
    updatedAt: now,
  };
  const renderedPreview: RenderedProductPreview = {
    id: `rendered-${previewId}`,
    previewId,
    businessId,
    mode: fiverrMode ? "fiverr_mockup" : "landing_page",
    title: fiverrMode ? `${proposal.title.replace("Business Proposal: ", "")} Fiverr gig mockup` : `${proposal.title.replace("Business Proposal: ", "")} landing page preview`,
    summary: "Rendered local product preview for inspection before any publish approval can be requested.",
    textPreview: fiverrMode
      ? [
          "FIVERR GIG MOCKUP",
          "",
          `Title: ${exactFields["Gig title"] ?? exactFields.Title ?? proposal.title.replace("Business Proposal: ", "")}`,
          `Category: ${exactFields.Category ?? "Manual category review required"}`,
          `Tags: ${exactFields.Tags ?? "Add tags before publishing"}`,
          "",
          "Description",
          exactFields.Description ?? fullDraft,
          "",
          "Packages / Pricing Draft",
          exactFields.Packages ?? exactFields.Pricing ?? "Keep zero-budget validation path; pricing needs manual review.",
          "",
          "FAQ",
          exactFields.FAQ ?? "Add buyer-facing FAQ during local review.",
          "",
          "Buyer Requirements",
          exactFields["Buyer requirements"] ?? "Ask buyer for goals, examples, tone, and constraints.",
          "",
          "Safety Boundary",
          "Local preview only. No Fiverr login, form submission, publication, messaging, or purchase occurred.",
        ].join("\n")
      : [
          "LANDING PAGE PREVIEW",
          "",
          `Hero: ${exactFields.Headline ?? exactFields["Hero headline"] ?? proposal.title.replace("Business Proposal: ", "")}`,
          `Subheadline: ${proposal.whyMightWork[0] ?? "Validation-first offer."}`,
          "",
          "Offer Sections",
          fullDraft,
          "",
          "CTA",
          exactFields.CTA ?? "Join the waitlist / request details (manual review required).",
          "",
          "Footer / Disclosure",
          "Local draft only. Review claims, policies, and citations before publishing.",
        ].join("\n"),
    sourceSectionIds: sections.map((section) => section.id),
    status: "ready",
    createdAt: now,
    updatedAt: now,
  };
  const draftApproval: ProductDraftApproval = {
    id: id("product-draft-approval"),
    previewId,
    businessId,
    status: "not_reviewed",
    note: "Local draft has not been approved for the next step yet.",
    createdAt: now,
    updatedAt: now,
  };
  const gateState: ApprovalGateState = {
    id: gateId,
    businessId,
    previewId,
    gate: "publish",
    status: "needs_product_review",
    label: "Needs Product Review",
    reason: "Inspect and approve the local draft before requesting a publish approval.",
    actionLabel: "Open Product Studio",
    linkedPath: "/#/production",
    updatedAt: now,
  };
  return { blueprint, preview, renderedPreview, sections, draftApproval, gateState };
}

function buildPublishPayloadPreview(
  current: AppDataState,
  preview: ProductPreview,
  now: string,
): PublishPayloadPreview {
  const business = current.approvedBusinesses.find((item) => item.id === preview.businessId);
  const blueprint = current.productBlueprints.find((item) => item.id === preview.blueprintId);
  const platformPackage = preview.platformPackageId ? current.platformExecutionPackages.find((item) => item.id === preview.platformPackageId) : undefined;
  const destination = preview.destinationId ? current.productionDestinations.find((item) => item.id === preview.destinationId) : undefined;
  const platform = platformPackage?.platform ?? destination?.name ?? "Manual / no connector";
  const exactFields = platformPackage?.exactFields ?? Object.fromEntries(
    current.productPreviewSections
      .filter((section) => preview.sectionIds.includes(section.id) && section.fields)
      .flatMap((section) => Object.entries(section.fields ?? {})),
  );
  return {
    id: id("publish-payload-preview"),
    previewId: preview.id,
    businessId: preview.businessId,
    platform,
    destinationId: preview.destinationId,
    platformPackageId: preview.platformPackageId,
    exactFields: Object.keys(exactFields).length ? exactFields : {
      "Product name": blueprint?.name ?? business?.name ?? "Product draft",
      Destination: platform,
      "Local-only status": "Ready for exact publish approval request only after user review.",
    },
    contentSummary: blueprint
      ? `${blueprint.name} for ${blueprint.audience}. Deliverable: ${blueprint.offerDeliverable}.`
      : "Local product draft approved for the next approval request step.",
    userLoginRequired: platformPackage?.userLoginRequired ?? false,
    credentialsStored: false,
    whatWillNotHappen: [
      "No publishing until this exact approval is approved.",
      "No spending, paid promotion, purchases, messaging, login automation, form submission, or connector execution.",
      "No credentials are stored.",
      "No guaranteed income, fake reviews, spam, or misleading claims are allowed.",
    ],
    rollbackNotes: [
      "If anything looks wrong, reject the approval and request a Product Studio revision.",
      "Any external platform change must be manually reviewed after execution.",
    ],
    budgetBoundary: business
      ? `Budget cap ${money(business.budgetPlan.businessBudgetCap)}, required spend ${money(business.budgetPlan.requiredSpend)}, recommended spend ${money(business.budgetPlan.recommendedSpend)}.`
      : "No spend is included in this publish payload.",
    status: "frozen",
    createdAt: now,
    updatedAt: now,
  };
}

function buildOpportunityHuntState(
  current: AppDataState,
  message: string,
  chatMessageId: string,
  depth: OpportunityHuntDepth,
  ids?: { huntId: string; proposalId: string },
  publicResearch?: {
    run: PublicResearchRun;
    fetches: PublicResearchFetch[];
    citations: EvidenceCitation[];
    candidates: CandidateBusinessIdea[];
    scorecards: CandidateScorecard[];
    browserResearch?: {
      run: BrowserResearchRun;
      fetches: BrowserResearchFetch[];
      artifacts: BrowserResearchArtifact[];
      safetyReceipts: BrowserSafetyReceipt[];
    };
  },
) {
  const now = new Date().toISOString();
  const fiverrMode = isFiverrPrompt(message);
  const huntId = ids?.huntId ?? id("opportunity-hunt");
  const proposalId = ids?.proposalId ?? id("business-proposal");
  const destinationStaticId = id("production-destination");
  const destinationNewsletterId = id("production-destination");
  const destinationFiverrId = id("production-destination");
  const platformRequirementId = id("platform-requirement");
  const platformPackageId = id("platform-package");
  const contentLandingId = id("content-inventory");
  const contentArticleId = id("content-inventory");
  const contentFiverrGigId = id("content-inventory");
  const winningCandidate = publicResearch?.candidates.find((candidate) => candidate.status === "winner") ?? publicResearch?.candidates[0];
  const winningScorecard = winningCandidate ? publicResearch?.scorecards.find((scorecard) => scorecard.candidateId === winningCandidate.id) : undefined;
  const citationEvidence: ResearchEvidence[] = (publicResearch?.citations ?? []).slice(0, 8).map((citation) => ({
    id: id("research-evidence"),
    huntId,
    proposalId,
    agentId: "agent-researcher",
    title: citation.title,
    url: citation.url,
    sourceType: citation.sourceType,
    summary: citation.summary,
    confidence: citation.confidence,
    capturedAt: citation.capturedAt,
  }));
  const budgetPlan = buildBudgetPlan(current, proposalId, {
    requiredSpend: 0,
    recommendedSpend: 0,
    businessBudgetCap: 0,
    zeroBudgetPath: fiverrMode
      ? "Draft the Fiverr gig locally, research competing gigs with approved/safe read-only research, and publish only after a separate exact Fiverr approval. No paid tools, purchases, ads, or promoted listings."
      : "Create local drafts, free public research notes, and a no-spend validation package before asking for any publishing or connector approval.",
    assumptions: [
      "The user requested a zero-budget path or no spend was explicitly approved.",
      "Agents know remaining portfolio capital and must not spend any of it without a separate approval.",
      fiverrMode ? "Fiverr account login is manual; Mission Control does not store credentials." : "External publishing destinations remain draft-only until approved.",
    ],
  });
  const fallbackEvidence: ResearchEvidence[] = [
    {
      id: id("research-evidence"),
      huntId,
      proposalId,
      agentId: "agent-researcher",
      title: "Freelancers keep asking for practical AI workflow help",
      url: "https://www.reddit.com/search/?q=freelancer%20ai%20workflow",
      sourceType: "forum",
      summary: "Public discussion demand points toward practical workflow templates rather than hype or guaranteed outcomes.",
      confidence: 72,
      capturedAt: now,
    },
    {
      id: id("research-evidence"),
      huntId,
      proposalId,
      agentId: "agent-seo",
      title: "Beginner AI workflow content has clear search-intent clusters",
      url: "https://www.google.com/search?q=ai+workflow+templates+for+freelancers",
      sourceType: "search_signal",
      summary: "Search intent can be split into templates, checklists, client onboarding, proposal writing, and automation basics.",
      confidence: 68,
      capturedAt: now,
    },
    {
      id: id("research-evidence"),
      huntId,
      proposalId,
      agentId: "agent-production",
      title: "Zero-budget MVP can be produced as local templates and content",
      url: "https://docs.github.com/en/pages",
      sourceType: "directory",
      summary: "A static site, downloadable template samples, and newsletter signup flow can be prepared locally before publishing approval.",
      confidence: 76,
      capturedAt: now,
    },
    ...(fiverrMode
      ? [
          {
            id: id("research-evidence"),
            huntId,
            proposalId,
            agentId: "agent-researcher" as const,
            title: "Fiverr service marketplace requires clear gig scope and manual account readiness",
            url: "https://www.fiverr.com/",
            sourceType: "marketplace" as const,
            summary: "A Fiverr gig can be prepared as a local draft, but publishing requires user login, platform compliance review, and a separate exact approval.",
            confidence: 70,
            capturedAt: now,
          },
        ]
      : []),
  ];
  const evidence: ResearchEvidence[] = citationEvidence.length ? citationEvidence : fallbackEvidence;
  const destinations: ProductionDestination[] = [
    {
      id: destinationStaticId,
      proposalId,
      type: "static_website",
      name: "Static Website / Local Draft",
      connector: "static_site",
      status: "local_draft",
      approvalRequired: true,
      description: "A local static website draft for the business proposal, landing page, disclosure page, and first content cluster.",
      publishingRules: ["Local draft only until approval.", "No income guarantees.", "Affiliate or sponsor disclosure required if monetized."],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: destinationNewsletterId,
      proposalId,
      type: "newsletter",
      name: "Newsletter Draft / Manual Connector",
      connector: "newsletter",
      status: "needs_approval",
      approvalRequired: true,
      description: "A newsletter issue draft that can be reviewed locally before any real send or connector execution.",
      publishingRules: ["No auto-send.", "No imported recipients without consent.", "Every send requires approval."],
      createdAt: now,
      updatedAt: now,
    },
    ...(fiverrMode
      ? [
          {
            id: destinationFiverrId,
            proposalId,
            type: "marketplace_product_page" as const,
            name: "Fiverr Gig Draft / Manual Login Required",
            connector: "marketplace" as const,
            status: "needs_approval" as const,
            approvalRequired: true,
            description: "A local Fiverr gig draft package. The user must log in manually; Mission Control does not store credentials or publish without a separate exact approval.",
            publishingRules: [
              "User must log in to Fiverr manually.",
              "No credentials are stored in Mission Control.",
              "No publish, form submission, paid promotion, purchase, or messaging occurs from business approval.",
              "A separate Fiverr publish approval must show exact fields before any connector/browser action.",
            ],
            createdAt: now,
            updatedAt: now,
          },
        ]
      : []),
  ];
  const contentInventory: ContentInventoryItem[] = [
    {
      id: contentLandingId,
      proposalId,
      destinationId: destinationStaticId,
      title: "Landing page: Practical AI workflow kit for freelancers",
      type: "landing_page",
      status: "draft",
      summary: "A local landing page draft that validates demand for simple workflow templates.",
      draftContent: "Headline: Practical AI workflow templates for freelancers. Promise: save planning time with checklists and examples, not guaranteed income.",
      createdByAgentId: "agent-writer",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: contentArticleId,
      proposalId,
      destinationId: destinationStaticId,
      title: "Article brief: 7 client-work workflows to systemize with AI",
      type: "article",
      status: "brief",
      summary: "SEO article brief for a non-hype, practical workflow guide.",
      draftContent: "Sections: intake, proposal outline, meeting notes, research summary, task breakdown, follow-up email, project retrospective.",
      createdByAgentId: "agent-content",
      createdAt: now,
      updatedAt: now,
    },
    ...(fiverrMode
      ? [
          {
            id: contentFiverrGigId,
            proposalId,
            destinationId: destinationFiverrId,
            title: "Fiverr gig draft: AI workflow setup for freelancers",
            type: "product_page" as const,
            status: "draft" as const,
            summary: "Local Fiverr gig fields prepared for review; publishing is locked behind a separate exact approval.",
            draftContent:
              "Gig title: I will create a practical AI workflow checklist for your freelance service. Category: Business consulting / workflow support. Pricing: starter manual package only, no guaranteed results. Delivery scope: intake questions, workflow checklist, setup notes, and revision boundary.",
            createdByAgentId: "agent-writer" as const,
            createdAt: now,
            updatedAt: now,
          },
        ]
      : []),
  ];
  const externalPlatformRequirements: ExternalPlatformRequirement[] = fiverrMode
    ? [
        {
          id: platformRequirementId,
          proposalId,
          platform: "Fiverr",
          accountNeeded: true,
          userLoginRequired: true,
          credentialsStored: false,
          requiredAssets: ["Gig title", "Category", "Tags", "Pricing packages", "Delivery scope", "FAQ", "Gig description", "Policy/claims check", "Gig image brief"],
          publishStatus: "local_draft",
          approvalRequiredBeforePublish: true,
          blockedActions: ["Credential storage", "Login automation without user present", "Form submission", "Publishing", "Paid promotion", "Purchases", "Buyer messaging"],
          notes: "Business approval creates only a local Fiverr package. User login and a separate exact publish approval are required before any external action.",
          createdAt: now,
          updatedAt: now,
        },
      ]
    : [
        {
          id: platformRequirementId,
          proposalId,
          platform: "Manual publishing / static site",
          accountNeeded: false,
          userLoginRequired: false,
          credentialsStored: false,
          requiredAssets: ["Landing page draft", "Content brief", "Disclosure/policy notes", "Approval checklist"],
          publishStatus: "local_draft",
          approvalRequiredBeforePublish: true,
          blockedActions: ["External publishing", "Connector execution", "Paid promotion", "Form submission"],
          notes: "No external account is needed for the local draft; any public publishing remains a separate approval.",
          createdAt: now,
          updatedAt: now,
        },
      ];
  const platformExecutionPackages: PlatformExecutionPackage[] = fiverrMode
    ? [
        {
          id: platformPackageId,
          proposalId,
          platform: "Fiverr",
          title: "Fiverr gig publish package",
          status: "local_draft",
          actionLabel: "Prepare Fiverr Publish Approval",
          userLoginRequired: true,
          exactFields: {
            "Gig title": "I will create a practical AI workflow checklist for your freelance service",
            Category: "Business consulting or productivity support",
            Tags: "ai workflow, freelancer, checklist, productivity, client work",
            "Starter package": "$0 external spend to prepare; pricing recommendation is draft-only for user review",
            Description:
              "Draft copy explains practical workflow help without income guarantees, fake reviews, spam, or misleading claims.",
            FAQ: "Clarifies scope, delivery files, revision limit, and that results are not guaranteed.",
          },
          requiredAssets: ["Gig copy", "Package scope", "FAQ", "Gig image brief", "Policy and claim check"],
          policyChecks: ["No guaranteed income", "No fake reviews", "No spam/outreach", "No unsupported claims", "No paid promotion without approval"],
          approvalBoundary: "This package cannot publish by itself. User must log in manually, review exact fields, then approve one publish action.",
          createdAt: now,
          updatedAt: now,
        },
      ]
    : [];
  const firstFetchedSource = publicResearch?.fetches.find((fetch) => fetch.status === "fetched") ?? publicResearch?.fetches[0];
  const firstBrowserArtifact = publicResearch?.browserResearch?.artifacts[0];
  const browserArtifactCount = publicResearch?.browserResearch?.artifacts.length ?? 0;
  const tasks: BusinessTask[] = taskBlueprints.map((task, index) => ({
    id: id("business-task"),
    huntId,
    proposalId,
    agentId: task.agentId,
    title: task.title,
    objective: `${task.objective} Budget context: portfolio ${money(budgetPlan.portfolioStartingCapital)}, remaining ${money(budgetPlan.portfolioRemainingCapital)}, business cap ${money(budgetPlan.businessBudgetCap)}, required spend ${money(budgetPlan.requiredSpend)}. ${fiverrMode ? "Platform context: Fiverr requires manual user login and a separate publish approval." : ""}`,
    status: index < 3 ? "now_working" : "queued",
    progress: index < 3 ? 18 + index * 8 : 0,
    currentArtifact: index < 2 && browserArtifactCount ? `${task.artifact} + browser evidence receipt` : task.artifact,
    currentSource: index < 2 && firstBrowserArtifact ? firstBrowserArtifact.url : index < 2 && firstFetchedSource ? firstFetchedSource.url : task.source,
    dependency: index === 0 ? undefined : taskBlueprints[index - 1].title,
    expectedOutput: task.expectedOutput,
    approvalRequired: false,
    logs: [
      `${agentLabel(task.agentId)} accepted the task from TeamLeader1A.`,
      `Budget guard: cap ${money(budgetPlan.businessBudgetCap)}, required spend ${money(budgetPlan.requiredSpend)}, recommended spend ${money(budgetPlan.recommendedSpend)}.`,
      browserArtifactCount ? `Browser guard: ${browserArtifactCount} public read artifact(s) captured through the safe browser broker; no login, forms, publishing, messaging, or spend.` : "Browser guard: no browser artifact was required for this task.",
      fiverrMode ? "Platform guard: Fiverr publish/login/form submission are locked behind a separate approval." : "Platform guard: external publishing stays locked until approval.",
    ],
    startedAt: index < 3 ? now : undefined,
    updatedAt: now,
  }));
  const proposal: BusinessProposal = {
    id: proposalId,
    huntId,
    title: fiverrMode ? "Business Proposal: Fiverr AI Workflow Gig For Freelancers" : `Business Proposal: ${winningCandidate?.title ?? "Practical AI Workflow Kit for Freelancers"}`,
    recommendedIdea: fiverrMode
      ? "A zero-budget Fiverr service gig that sells a practical AI workflow checklist/setup package for freelancers, drafted locally first and published only after a separate exact Fiverr approval."
      : winningCandidate?.summary ?? "A zero-budget content and template business that teaches freelancers practical AI workflows through a static site, newsletter drafts, and downloadable checklist templates.",
    summary: fiverrMode
      ? "The team is validating a Fiverr gig concept with local gig copy, package scope, policy checks, and marketplace requirements before any login, form submission, publishing, messaging, or spend."
      : `TeamLeader1A compared the top 3 zero-budget candidates and selected "${winningCandidate?.title ?? "Practical AI Workflow Kit"}" because it had the strongest mix of demand, no-spend feasibility, and local production readiness.`,
    businessModel: fiverrMode ? "Online services" : winningCandidate?.businessModel ?? "Digital products",
    targetAudience: fiverrMode ? "Freelancers and solo service providers who want help turning repeated client work into practical AI-assisted workflows." : winningCandidate?.audience ?? "Freelancers, consultants, and solo service providers who want practical AI workflows for client work.",
    whyMightWork: fiverrMode
      ? [
          "The gig can be drafted and reviewed with zero external spend.",
          "Fiverr demand can be checked through marketplace/competitor research before publishing.",
          "The offer is service-based, so the first validation target can be profile views, saves, or messages rather than paid ads.",
        ]
      : [
          ...(winningCandidate?.whyItMightWin ?? ["The MVP can be created locally with no required spend."]),
          `It won the top-three comparison with a ${winningScorecard?.totalScore ?? 74}/100 total score.`,
        ],
    whyMightFail: fiverrMode
      ? [
          "Fiverr is competitive and new gigs may get little visibility without strong differentiation.",
          "Publishing requires account readiness, platform compliance, and user-approved form submission.",
          "Service scope could be too broad unless delivery boundaries are clear.",
        ]
      : [
          ...(winningCandidate?.whyItMightLose ?? ["The niche is crowded and may need a sharper positioning angle."]),
          "The evidence is directional until a no-spend validation test confirms real interest.",
        ],
    evidenceIds: evidence.map((item) => item.id),
    seoPlan: fiverrMode
      ? [
          "Research Fiverr gig titles and buyer language for AI workflow, virtual assistant, productivity, and freelance operations services.",
          "Create supporting content around practical AI workflow setup for client onboarding, proposals, meeting notes, and delivery checklists.",
          "Avoid claims about guaranteed ranking, orders, income, or platform results.",
        ]
      : [
          "Target long-tail intent around AI workflow templates for freelancers, client onboarding, meeting summaries, and proposal writing.",
          "Create a pillar page plus practical briefs that avoid hype and unsupported income claims.",
          "Use comparison/guide content only after claim and disclosure review.",
        ],
    contentPlan: fiverrMode
      ? [
          "Fiverr gig title, description, FAQ, tags, and three package scopes.",
          "Gig image brief and proof-of-work sample checklist.",
          "Optional local landing page that explains the same service without publishing.",
        ]
      : [
          "Landing page for the kit concept.",
          "Three practical tutorial articles.",
          "One newsletter issue draft.",
          "One downloadable checklist sample.",
        ],
    productionPlan: fiverrMode
      ? [
          "Create local Fiverr gig draft fields.",
          "Prepare service delivery checklist and revision boundary.",
          "Prepare policy/claim review and exact publish approval package.",
          "Keep Fiverr login, form submission, publishing, messaging, and paid promotion locked.",
        ]
      : [
          "Create local static-site draft.",
          "Create two downloadable template samples.",
          "Prepare newsletter draft and signup copy as local assets only.",
          "Prepare publishing checklist and approval package before any external action.",
        ],
    publishingDestinationIds: destinations.map((item) => item.id),
    contentInventoryIds: contentInventory.map((item) => item.id),
    budgetPlan,
    externalPlatformRequirementIds: externalPlatformRequirements.map((item) => item.id),
    platformExecutionPackageIds: platformExecutionPackages.map((item) => item.id),
    publicResearchRunId: publicResearch?.run.id,
    candidateIdeaIds: publicResearch?.candidates.map((candidate) => candidate.id) ?? [],
    winningCandidateId: winningCandidate?.id,
    evidenceCitationIds: publicResearch?.citations.map((citation) => citation.id) ?? [],
    readinessChecklist: [
      { label: "Budget", status: budgetPlan.approvalBlockers.length ? "blocked" : "passed", detail: `${money(budgetPlan.requiredSpend)} required spend, ${money(budgetPlan.businessBudgetCap)} cap, ${money(budgetPlan.portfolioRemainingCapital)} remaining.` },
      { label: "Evidence", status: evidence.length >= 3 ? "passed" : "needs_review", detail: `${evidence.length} evidence items and ${browserArtifactCount} browser artifact(s) are attached from ${depthLabel(depth)} curated public research.` },
      { label: "Platform", status: fiverrMode ? "needs_review" : "passed", detail: fiverrMode ? "Fiverr account/login and exact gig fields must be reviewed before publishing." : "Local draft destination is available." },
      { label: "Compliance", status: "needs_review", detail: "No guarantees, fake reviews, spam, paid promotion, or unsupported claims." },
      { label: "Approval", status: "needs_review", detail: "Business approval starts internal work only; external execution needs a separate approval." },
    ],
    qualityScore: fiverrMode ? winningScorecard?.totalScore ?? 76 : winningScorecard?.totalScore ?? 74,
    missingRequirements: fiverrMode ? ["User must manually log in to Fiverr before any future publish approval can execute."] : [],
    zeroBudgetValidationTest:
      fiverrMode
        ? "Create the Fiverr gig package locally, compare safe public marketplace positioning, then request a separate exact publish approval only after the user logs in manually. Success is measured by approved publish readiness and early platform signals, not guaranteed orders."
        : "Build local landing page and sample checklist, then seek approval for a no-spend publishing test. Success is measured by email/signup intent and qualitative feedback, not guaranteed revenue.",
    successMetrics: fiverrMode ? ["Gig package passes policy/claim review", "3 competitor positioning gaps identified", "User approves exact Fiverr fields before publish"] : ["20 qualified email signups or saves", "5 useful qualitative responses", "3 content topics with repeat demand evidence"],
    failureMetrics: fiverrMode ? ["No clear buyer pain", "Gig scope cannot avoid misleading claims", "Required platform action exceeds approval boundary"] : ["No clear audience response", "No low-competition content entry point", "Users reject the core template value"],
    risks: fiverrMode ? ["Fiverr competition", "Platform policy mistakes", "Overbroad delivery scope", "Publishing requires separate approval", "No guaranteed orders or income"] : ["Crowded AI niche", "Potential overclaiming", "Newsletter/publishing actions require explicit approval", "No guaranteed revenue"],
    validationScore: fiverrMode ? winningScorecard?.totalScore ?? 76 : winningScorecard?.totalScore ?? 74,
    nextActions: [
      `Review the Top 3 + Winner comparison from the ${depthLabel(depth)} public research pass.`,
      "Inspect the browser evidence receipts and screenshot paths before approving any business.",
      "Inspect citations, scorecards, risks, and budget guard in Mission Briefs.",
      "Approve as Business only if the validation test and boundaries make sense.",
    ],
    teamLeaderRecommendation:
      fiverrMode
        ? "Proceed to review after the agent tasks finish. This is a zero-spend Fiverr draft candidate, but business approval will only create local packages. Fiverr login, publishing, messaging, paid promotion, and form submission require a separate exact approval."
        : "Proceed to review after the agent tasks finish. This is a strong zero-budget validation candidate, but publishing and any connector action remain approval-gated.",
    status: "drafting",
    createdAt: now,
    updatedAt: now,
  };
  const hunt: OpportunityHunt = {
    id: huntId,
    title: fiverrMode ? "Zero-budget Fiverr opportunity hunt" : "Zero-budget opportunity hunt",
    objective: fiverrMode ? "Draft and validate a Fiverr gig concept with zero spend and no external action until separately approved." : "Find the best online business idea that can be validated quickly with zero budget.",
    sourcePrompt: message,
    status: "researching",
    currentPhase: fiverrMode
      ? `${depthLabel(depth)} public research completed; agents are drafting a Fiverr-ready local package with budget and platform constraints.`
      : `${depthLabel(depth)} public research completed; agents are comparing the Top 3 zero-budget candidates.`,
    depth,
    zeroBudget: true,
    sourcePack: "broad_public_web",
    assignedAgentIds: opportunityAgentOrder,
    businessProposalId: proposalId,
    publicResearchRunId: publicResearch?.run.id,
    candidateIdeaIds: publicResearch?.candidates.map((candidate) => candidate.id) ?? [],
    evidenceCitationIds: publicResearch?.citations.map((citation) => citation.id) ?? [],
    executionReceipt: publicResearch?.run.executionReceipt,
    taskIds: tasks.map((task) => task.id),
    evidenceIds: evidence.map((item) => item.id),
    createdFromChatMessageId: chatMessageId,
    startedAt: now,
    updatedAt: now,
  };
  const sessions: AgentWorkSession[] = tasks.map((task) => ({
    id: id("agent-work-session"),
    agentId: task.agentId,
    huntId,
    proposalId,
    taskId: task.id,
    stationId: stationIdByAgentId[task.agentId],
    status:
      task.status === "now_working"
        ? task.agentId === "agent-researcher"
          ? "researching"
          : task.agentId === "agent-writer"
            ? "writing"
            : task.agentId === "agent-production"
              ? "production"
              : "working"
        : "idle",
    motion:
      task.status === "now_working"
        ? task.agentId === "agent-researcher" || task.agentId === "agent-seo"
          ? "research_beam"
          : task.agentId === "agent-production"
            ? "forge"
            : "pulse"
        : "idle",
    currentTask: task.status === "now_working" ? task.title : "Queued by TeamLeader1A.",
    currentOutput: task.currentArtifact,
    currentSource: task.currentSource,
    progress: task.progress,
    startedAt: now,
    updatedAt: now,
  }));
  return {
    hunt,
    proposal,
    evidence,
    destinations,
    contentInventory,
    externalPlatformRequirements,
    platformExecutionPackages,
    tasks,
    sessions,
    publicResearch,
  };
}

function syncGuildStations(state: AppDataState) {
  const latestSessionsByAgent = new Map<MissionAgentId, AgentWorkSession>();
  for (const session of state.agentWorkSessions) {
    const existing = latestSessionsByAgent.get(session.agentId);
    if (!existing || existing.updatedAt < session.updatedAt) latestSessionsByAgent.set(session.agentId, session);
  }
  return state.guildOfficeStations.map((station) => {
    const session = latestSessionsByAgent.get(station.agentId);
    if (!session) return station;
    return {
      ...station,
      status: session.status,
      motion: session.motion,
      currentTask: session.currentTask,
      lastOutput: session.currentOutput,
      progress: session.progress,
      taskId: session.taskId,
      updatedAt: session.updatedAt,
    };
  });
}

function advanceOpportunityWorkState(current: AppDataState): AppDataState | null {
  const activeHunt = current.opportunityHunts.find((hunt) => !["ready_to_review", "approved_as_business", "rejected"].includes(hunt.status));
  if (!activeHunt) return null;
  const now = new Date().toISOString();
  let changed = false;
  let tasks = current.businessTasks.map((task) => {
    if (task.huntId !== activeHunt.id || task.status !== "now_working") return task;
    changed = true;
    const progress = Math.min(100, task.progress + 22);
    const done = progress >= 100;
    return {
      ...task,
      progress,
      status: done ? "done" as const : task.status,
      logs: done ? [`${agentLabel(task.agentId)} finished ${task.currentArtifact}.`, ...task.logs].slice(0, 6) : [`${agentLabel(task.agentId)} is working: ${progress}% complete.`, ...task.logs].slice(0, 6),
      completedAt: done ? now : task.completedAt,
      updatedAt: now,
    };
  });
  if (!changed) return null;
  const activeAfter = tasks.filter((task) => task.huntId === activeHunt.id && task.status === "now_working");
  if (activeAfter.length === 0) {
    let starters = 0;
    tasks = tasks.map((task) => {
      if (task.huntId !== activeHunt.id || task.status !== "queued" || starters >= 2) return task;
      starters += 1;
      return { ...task, status: "now_working", progress: 12, startedAt: now, updatedAt: now, logs: [`${agentLabel(task.agentId)} started work.`, ...task.logs].slice(0, 6) };
    });
  }
  const huntTasks = tasks.filter((task) => task.huntId === activeHunt.id);
  const doneCount = huntTasks.filter((task) => task.status === "done").length;
  const allDone = doneCount === huntTasks.length;
  const nextStatus: OpportunityHunt["status"] = allDone
    ? "ready_to_review"
    : doneCount >= 5
      ? "teamleader_review"
      : doneCount >= 3
        ? "agents_drafting"
        : "researching";
  const sessions = current.agentWorkSessions.map((session) => {
    if (session.huntId !== activeHunt.id) return session;
    const task = tasks.find((item) => item.id === session.taskId);
    if (!task) return session;
    const isWorking = task.status === "now_working";
    const isDone = task.status === "done";
    const sessionStatus: AgentWorkSession["status"] = isWorking
      ? task.agentId === "agent-researcher"
        ? "researching"
        : task.agentId === "agent-writer"
          ? "writing"
          : task.agentId === "agent-production"
            ? "production"
            : task.agentId === "teamleader1a"
              ? "review"
              : "working"
      : "idle";
    const sessionMotion: AgentWorkSession["motion"] = isWorking
      ? task.agentId === "agent-researcher" || task.agentId === "agent-seo"
        ? "research_beam"
        : task.agentId === "agent-production"
          ? "forge"
          : task.agentId === "teamleader1a"
            ? "review"
            : "pulse"
      : "idle";
    return {
      ...session,
      status: sessionStatus,
      motion: sessionMotion,
      currentTask: isWorking ? task.title : isDone ? "Finished and sent artifact to TeamLeader1A." : "Queued by TeamLeader1A.",
      currentOutput: isDone ? `${task.currentArtifact} ready` : task.currentArtifact,
      currentSource: task.currentSource,
      progress: task.progress,
      updatedAt: now,
    } satisfies AgentWorkSession;
  });
  const next: AppDataState = {
    ...current,
    businessTasks: tasks,
    agentWorkSessions: sessions,
    opportunityHunts: current.opportunityHunts.map((hunt) =>
      hunt.id === activeHunt.id
        ? {
            ...hunt,
            status: nextStatus,
            currentPhase: allDone
              ? "TeamLeader1A finished the proposal. Review it in Mission Briefs."
              : `${doneCount}/${huntTasks.length} agent tasks complete. Agents are still working.`,
            updatedAt: now,
          }
        : hunt,
    ),
    businessProposals: current.businessProposals.map((proposal) =>
      proposal.huntId === activeHunt.id
        ? { ...proposal, status: allDone ? "ready_for_review" : "drafting", updatedAt: now }
        : proposal,
    ),
    activityLogs: [
      {
        id: id("log-opportunity-tick"),
        category: "agent",
        title: allDone ? "Business proposal ready" : "Agents advanced opportunity hunt",
        detail: allDone
          ? "TeamLeader1A has a complete business proposal ready for review. No external action ran."
          : `${doneCount}/${huntTasks.length} tasks complete in the active TeamLeader work session.`,
        severity: allDone ? "success" : "info",
        createdAt: now,
      } satisfies ActivityLog,
      ...current.activityLogs,
    ].slice(0, 80),
  };
  return { ...next, guildOfficeStations: syncGuildStations(next) };
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
  if (payload.actionKind === "mission_start") return `${payload.title}: ${payload.stepCount} approved local agent turns.`;
  if (payload.actionKind === "url_research") return `${payload.purpose} / ${payload.urls.join(", ")}`;
  return `${payload.channel} -> ${payload.target}: ${payload.message}`;
}

function commandForPayload(payload: OpenClawApprovalPayload) {
  if (payload.actionKind === "gateway_start") return "openclaw.cmd gateway start";
  if (payload.actionKind === "agent_turn") return `openclaw.cmd agent --agent ${payload.agentProfileId} --message <approved> --json`;
  if (payload.actionKind === "mission_start") return `mission batch: ${payload.stepCount} local OpenClaw agent turns`;
  if (payload.actionKind === "url_research") return "openclaw.cmd agent --agent main --message <approved-url-research> --json";
  return `openclaw.cmd message send --channel ${payload.channel} --target ${payload.target} --message <approved>${payload.dryRun ? " --dry-run" : ""} --json`;
}

function connectorForPayload(payload: OpenClawApprovalPayload): CommandLedgerEntry["connector"] {
  if (payload.actionKind === "channel_message" || payload.actionKind === "gateway_start" || payload.actionKind === "agent_turn" || payload.actionKind === "mission_start" || payload.actionKind === "url_research") {
    return "openclaw";
  }
  return "mission_control";
}

function ledgerStatusForApprovalStatus(status: ApprovalStatus): CommandLedgerEntry["status"] {
  if (status === "approved") return "approved";
  if (status === "rejected") return "cancelled";
  if (status === "blocked") return "blocked";
  return "approval_required";
}

function executionSummary(result: OpenClawBridgeResult) {
  const output = result.stdout.trim() || result.stderr.trim();
  if (result.timedOut) return "OpenClaw command timed out before completing.";
  if (!output) return result.ok ? "OpenClaw command completed." : "OpenClaw command failed without output.";
  return output.length > 700 ? `${output.slice(0, 700)}...` : output;
}

function requestTitle(payload: OpenClawApprovalPayload) {
  if (payload.actionKind === "gateway_start") return "Start local OpenClaw gateway";
  if (payload.actionKind === "agent_turn") return payload.agentRole ? `Run approved ${payload.agentRole} local turn` : "Run approved OpenClaw local turn";
  if (payload.actionKind === "mission_start") return "Start approved TeamLeader1A mission";
  if (payload.actionKind === "url_research") return "Run approved URL research";
  return payload.dryRun ? "Dry-run approved channel message" : "Send approved channel message";
}

function riskForPayload(payload: OpenClawApprovalPayload): RiskLevel {
  if (payload.actionKind === "gateway_start") return "medium";
  if (payload.actionKind === "agent_turn") return "medium";
  if (payload.actionKind === "mission_start") return "medium";
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

const missionAgentOrder: MissionAgentId[] = [
  "agent-researcher",
  "agent-seo",
  "agent-writer",
  "agent-content",
  "agent-production",
  "agent-publish",
  "agent-action",
  "teamleader1a",
];

const missionBriefKindByAgent: Record<MissionAgentId, MissionBriefSectionKind> = {
  teamleader1a: "overview",
  "agent-researcher": "research",
  "agent-seo": "seo",
  "agent-writer": "content",
  "agent-content": "content",
  "agent-production": "production",
  "agent-publish": "approvals",
  "agent-action": "experiment",
};

const missionProfileFallbackByAgent: Record<MissionAgentId, string> = {
  teamleader1a: "main",
  "agent-researcher": "researcher",
  "agent-seo": "seo",
  "agent-writer": "writer",
  "agent-content": "content",
  "agent-production": "production",
  "agent-publish": "publish",
  "agent-action": "action",
};

function missionAgentName(state: AppDataState, agentId: MissionAgentId) {
  return state.agents.find((agent) => agent.id === agentId)?.name ?? agentId;
}

function missionAgentProfileId(state: AppDataState, agentId: MissionAgentId) {
  const agentName = missionAgentName(state, agentId);
  return state.userSettings.openClawRoleMap[agentName] ?? missionProfileFallbackByAgent[agentId];
}

function titleForMissionAgent(agentId: MissionAgentId) {
  if (agentId === "agent-researcher") return "Market research and demand evidence";
  if (agentId === "agent-seo") return "SEO plan and keyword opportunity map";
  if (agentId === "agent-writer") return "Conversion-safe writing angles and drafts";
  if (agentId === "agent-content") return "Content calendar and asset pipeline";
  if (agentId === "agent-production") return "Production proposal and build checklist";
  if (agentId === "agent-publish") return "Publishing approval checklist";
  if (agentId === "agent-action") return "Operational checklist and approved-action queue";
  return "TeamLeader1A final review and recommendation";
}

function expectedArtifactForMissionAgent(agentId: MissionAgentId) {
  if (agentId === "agent-researcher") return "Research brief with target audience, competitor gaps, demand evidence, assumptions, and missing proof.";
  if (agentId === "agent-seo") return "SEO plan with keyword clusters, search intent, ranking opportunities, and source needs.";
  if (agentId === "agent-writer") return "Draft copy angles, article ideas, email/script outlines, and unsupported-claim warnings.";
  if (agentId === "agent-content") return "Content calendar, asset sequence, dependencies, and approval checkpoints.";
  if (agentId === "agent-production") return "Production proposal, local asset checklist, launch-readiness gaps, and cost/risk notes.";
  if (agentId === "agent-publish") return "Publishing checklist only, including what remains locked until separate approval.";
  if (agentId === "agent-action") return "Operational workflow, task queue, blocked external actions, and approval recommendations.";
  return "Final TeamLeader1A synthesis with continue/revise/kill recommendation and next approval-gated step.";
}

function promptForMissionAgent(agentId: MissionAgentId, questTitle: string, objective: string, sourceMessage: string) {
  const common = [
    `Mission objective: ${objective}`,
    `Quest: ${questTitle}`,
    `User command to TeamLeader1A: ${sourceMessage}`,
    "Return a structured artifact for TeamLeader1A review. Include evidence, assumptions, risks, blockers, success metrics, failure criteria, and the next safe approval-gated step.",
    "Do not browse, scrape, log in, submit forms, spend money, publish, send messages, launch, scale, use --deliver, broadcast, make fake reviews, spam, purchase, bypass CAPTCHA, bypass terms, or run external automation.",
  ].join("\n");

  if (agentId === "agent-researcher") return `${common}\nFocus: market demand, target audience, competitors, proof gaps, and validation questions.`;
  if (agentId === "agent-seo") return `${common}\nFocus: SEO plan, search intent, keyword cluster ideas, ranking opportunities, and sources needed before launch.`;
  if (agentId === "agent-writer") return `${common}\nFocus: safe copy, content outlines, claims to avoid, and drafts that do not imply guaranteed income.`;
  if (agentId === "agent-content") return `${common}\nFocus: content calendar, asset pipeline, dependencies, review checkpoints, and repurposing plan.`;
  if (agentId === "agent-production") return `${common}\nFocus: production proposal, local assets, landing page/product/template plan, effort, cost, and launch-readiness gaps.`;
  if (agentId === "agent-publish") return `${common}\nFocus: publishing checklist only. Make clear that no external publishing is authorized by this mission.`;
  if (agentId === "agent-action") return `${common}\nFocus: operations checklist, internal workflows, approvals needed, and tasks that are safe to prepare locally.`;
  return `${common}\nFocus: review all agent outputs, summarize the strongest plan, risks, missing evidence, and whether to continue, revise, or kill.`;
}

function buildMissionDraft(state: AppDataState, message: string, questId: string): MissionDraft {
  const now = new Date().toISOString();
  const quest = state.quests.find((item) => item.id === questId) ?? state.quests[0];
  const questTitle = quest?.title ?? "OpenClaw business quest";
  const objective = message.trim() || `Create a safe multi-agent plan for ${questTitle}.`;
  const plannedSteps: MissionDraftStepPlan[] = missionAgentOrder.map((agentId) => ({
    agentId,
    title: titleForMissionAgent(agentId),
    briefKind: missionBriefKindByAgent[agentId],
    prompt: promptForMissionAgent(agentId, questTitle, objective, message),
    expectedArtifact: expectedArtifactForMissionAgent(agentId),
  }));

  return {
    id: id("mission-draft"),
    questId: quest?.id ?? questId,
    title: `TeamLeader1A mission: ${questTitle}`,
    objective,
    sourceMessage: message.trim(),
    status: "draft",
    plannedAgentIds: missionAgentOrder,
    plannedSteps,
    riskFlags: ["local_agent_turns", "approval_required", "external_actions_separate"],
    requiredApprovals: [
      "Start mission approval covers only the listed local OpenClaw agent turns.",
      "Browser research or scraping requires a separate approved URL research request.",
      "Publishing, spending, launch, scale, messages, and external automation remain separately locked.",
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function missionStepFromDraftStep(state: AppDataState, draft: MissionDraft, step: MissionDraftStepPlan, index: number, runId: string): MissionAgentStep {
  const now = new Date().toISOString();
  const agentName = missionAgentName(state, step.agentId);
  return {
    id: id("mission-step"),
    draftId: draft.id,
    missionRunId: runId,
    questId: draft.questId,
    order: index + 1,
    agentId: step.agentId,
    agentName,
    agentProfileId: missionAgentProfileId(state, step.agentId),
    title: step.title,
    briefKind: step.briefKind,
    prompt: step.prompt,
    expectedArtifact: step.expectedArtifact,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
}

function bridgeResult(ok: boolean, command: string[], stdout: string, stderr = ""): OpenClawBridgeResult {
  return { ok, command, stdout, stderr, exitCode: ok ? 0 : 1, timedOut: false };
}

function contentFromAgentResult(step: MissionAgentStep, summary: string, result: OpenClawBridgeResult) {
  return [
    `## ${step.title}`,
    `Agent: ${step.agentName}`,
    `Profile: ${step.agentProfileId}`,
    "",
    `## Expected Artifact`,
    step.expectedArtifact,
    "",
    `## Result Summary`,
    summary,
    "",
    `## Raw Output`,
    result.stdout.trim() || "No stdout captured.",
    "",
    `## Error Output`,
    result.stderr.trim() || "No stderr captured.",
    "",
    `## Safety Boundary`,
    "This mission artifact is local planning work only. It does not authorize browsing, scraping, publishing, spending, sending messages, launching, scaling, purchases, login automation, form submission, CAPTCHA bypass, fake reviews, spam, or external automation.",
  ].join("\n");
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

function seoResearchPackFromQuest(state: AppDataState, questId: string) {
  const quest = state.quests.find((item) => item.id === questId);
  const idea = quest ? state.businessIdeas.find((item) => item.id === quest.businessIdeaId) : null;
  const report = [...state.marketIntelligenceReports].filter((item) => item.questId === questId)[0] ?? (quest ? marketReportFromQuest(state, quest.id) : null);
  if (!quest || !report) throw new Error("Quest not found for SEO research pack.");

  const now = new Date().toISOString();
  const sourceCapture: ResearchSourceCapture = {
    id: id("source-capture"),
    questId: quest.id,
    reportId: report.id,
    url: report.sourceUrls[0] ?? "manual://stored-mission-evidence",
    title: `${quest.title} stored evidence capture`,
    status: "manual",
    captureMode: "manual",
    evidenceSummary: report.demandSignals.map((signal) => signal.signal).join(" "),
    citation: "Stored Mission Control evidence. Replace with approved URL capture before public citation.",
    riskNotes: report.risks.join(" "),
    capturedAt: now,
  };
  const cluster: SeoKeywordCluster = {
    id: id("seo-cluster"),
    questId: quest.id,
    reportId: report.id,
    name: `${quest.businessIdea} proof cluster`,
    intent: report.keywordOpportunities[0]?.intent ?? (quest.type === "SEO quest" ? "informational" : "commercial"),
    keywords:
      report.keywordOpportunities.length > 0
        ? report.keywordOpportunities.map((keyword) => keyword.keyword)
        : [quest.businessIdea.toLowerCase(), `${quest.businessIdea.toLowerCase()} guide`, `${quest.businessIdea.toLowerCase()} comparison`],
    targetAudience: idea?.targetAudience ?? "The selected quest audience.",
    contentAngle: report.keywordOpportunities[0]?.contentAngle ?? idea?.trafficPlan ?? quest.nextAction,
    monetizationFit: idea?.model === "Affiliate marketing" || idea?.model === "Content websites" ? "high" : "medium",
    evidenceScore: report.evidenceScore,
    status: report.evidenceScore >= 70 ? "ready_for_brief" : "needs_sources",
    sourceCaptureIds: [sourceCapture.id],
    createdAt: now,
    updatedAt: now,
  };
  const proof: DemandProofReport = {
    id: id("demand-proof"),
    questId: quest.id,
    title: `${quest.title} demand proof`,
    status: report.evidenceScore >= 70 ? "ready_for_validation" : "needs_more_evidence",
    sourceCaptureIds: [sourceCapture.id],
    keywordClusterIds: [cluster.id],
    evidenceScore: report.evidenceScore,
    demandSummary: report.teamLeaderSummary,
    competitorGaps: report.competitorSnapshots.map((competitor) => competitor.gap),
    assumptions: idea?.assumptions ?? ["Demand assumptions need approved source checks."],
    recommendedNextStep: report.recommendedNextStep,
    teamLeaderRecommendation:
      report.evidenceScore >= 70
        ? "Convert the strongest cluster into a claim-safe content brief, then review before publishing approval."
        : "Collect more approved source captures before production or launch.",
    createdAt: now,
    updatedAt: now,
  };
  const task: MissionTask = {
    id: id("mission-task-seo"),
    questId: quest.id,
    type: "research",
    title: `SEO demand proof pack for ${quest.title}`,
    ownerAgentId: "agent-seo",
    status: proof.status === "ready_for_validation" ? "ready_for_review" : "in_progress",
    priority: "high",
    approvalRequired: false,
    dependencyIds: [],
    artifactIds: [],
    commandLedgerEntryIds: [],
    successCriteria: ["Demand proof report exists", "Keyword cluster is scored", "Source capture risk notes are visible"],
    createdAt: now,
    updatedAt: now,
  };
  const artifact: MissionArtifact = {
    id: id("artifact-seo-proof"),
    questId: quest.id,
    taskId: task.id,
    type: "keyword_map",
    title: `${quest.title} SEO research pack`,
    summary: `${cluster.keywords.length} keyword targets mapped with ${proof.evidenceScore}/100 evidence.`,
    content: [
      `## Demand Proof`,
      proof.demandSummary,
      "",
      `## Keyword Cluster`,
      cluster.keywords.map((keyword) => `- ${keyword}`).join("\n"),
      "",
      `## Gaps`,
      proof.competitorGaps.map((gap) => `- ${gap}`).join("\n"),
      "",
      `## Safety`,
      "This research pack is local evidence only. Public citation, publishing, outreach, and spend require approval.",
    ].join("\n"),
    status: proof.status === "ready_for_validation" ? "ready_for_review" : "draft",
    storage: "sqlite",
    sourceIds: [sourceCapture.id, cluster.id, proof.id],
    createdByAgentId: "agent-seo",
    createdAt: now,
    updatedAt: now,
  };
  task.artifactIds = [artifact.id];

  return { report, sourceCapture, cluster, proof, task, artifact };
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function siteProjectForQuest(state: AppDataState, questId: string): SiteProject {
  const quest = state.quests.find((item) => item.id === questId);
  const idea = quest ? state.businessIdeas.find((item) => item.id === quest.businessIdeaId) : null;
  if (!quest) throw new Error("Quest not found for site project.");
  const now = new Date().toISOString();
  const name = `${quest.businessIdea.split(" for ")[0]} Field Guide`;
  return {
    id: id("site-project"),
    name,
    primaryQuestId: quest.id,
    questIds: [quest.id],
    repoPath: `C:\\Users\\User\\.openclaw\\sites\\${slugify(name)}`,
    framework: "plain_markdown",
    status: "publishing_locked",
    niche: quest.businessIdea,
    audience: idea?.targetAudience ?? "Audience needs validation.",
    disclosureText:
      "Affiliate or commercial relationships must be disclosed clearly. Content must not contain guaranteed income claims, fabricated experience, or unsupported product claims.",
    publishingRules: [
      "Generate local Markdown only",
      "Review diff before approval",
      "Pass claim review before publishing",
      "Require approval before git push, deployment, or external publication",
    ],
    monetizationPolicy: idea?.monetizationMethod ?? "Monetization method must be validated before launch.",
    createdAt: now,
    updatedAt: now,
  };
}

function contentItemForCluster(state: AppDataState, clusterId: string): ContentItem {
  const cluster = state.seoKeywordClusters.find((item) => item.id === clusterId);
  if (!cluster) throw new Error("Keyword cluster not found for content item.");
  const quest = state.quests.find((item) => item.id === cluster.questId);
  const site = state.siteProjects.find((item) => item.questIds.includes(cluster.questId)) ?? siteProjectForQuest(state, cluster.questId);
  const now = new Date().toISOString();
  const title = cluster.intent === "comparison" ? `${cluster.name}: Practical Comparison Guide` : `${cluster.name}: Evidence-First Guide`;
  return {
    id: id("content-item"),
    siteProjectId: site.id,
    questId: cluster.questId,
    clusterId: cluster.id,
    title,
    slug: slugify(title),
    type: cluster.intent === "comparison" || cluster.intent === "commercial" ? "comparison" : "article",
    status: "draft",
    targetKeywords: cluster.keywords,
    outline: [
      "Audience and problem",
      "What the evidence supports",
      "Comparison criteria or workflow steps",
      "Limitations, risks, and assumptions",
      "Affiliate disclosure and next safe step",
    ],
    draftMarkdown: [
      `# ${title}`,
      "",
      "> Draft only. Review sources, claims, and disclosure before publishing.",
      "",
      `Target quest: ${quest?.title ?? cluster.questId}`,
      "",
      "## Target Keywords",
      cluster.keywords.map((keyword) => `- ${keyword}`).join("\n"),
      "",
      "## Content Angle",
      cluster.contentAngle,
      "",
      "## Disclosure",
      "Affiliate disclosure required before public release.",
    ].join("\n"),
    disclosureRequired: true,
    claimReviewStatus: "needs_review",
    artifactIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function publishingDiffForSite(state: AppDataState, siteProjectId: string): PublishingDiff {
  const site = state.siteProjects.find((item) => item.id === siteProjectId);
  if (!site) throw new Error("Site project not found for publishing diff.");
  const items = state.contentItems.filter((item) => item.siteProjectId === site.id && item.status !== "published");
  const now = new Date().toISOString();
  return {
    id: id("publishing-diff"),
    siteProjectId: site.id,
    contentItemIds: items.map((item) => item.id),
    title: `${site.name} local static-site diff`,
    status: "ready_for_approval",
    files: items.map((item) => ({
      path: `content/${item.slug}.md`,
      action: "create",
      summary: `Create local ${item.type.replace(/_/g, " ")} draft for ${item.title}.`,
      preview: item.draftMarkdown.slice(0, 1200),
    })),
    riskFlags: ["publishing_approval_required", "claim_review_required", "affiliate_disclosure_required", "git_push_locked"],
    createdAt: now,
    updatedAt: now,
  };
}

function affiliateOfferForQuest(state: AppDataState, questId: string): AffiliateOffer {
  const quest = state.quests.find((item) => item.id === questId);
  const idea = quest ? state.businessIdeas.find((item) => item.id === quest.businessIdeaId) : null;
  if (!quest) throw new Error("Quest not found for affiliate offer.");
  const site = state.siteProjects.find((item) => item.questIds.includes(questId));
  const proof = state.demandProofReports.find((item) => item.questId === questId);
  const now = new Date().toISOString();
  return {
    id: id("affiliate-offer"),
    questId,
    siteProjectId: site?.id,
    name: `${quest.businessIdea} affiliate candidate`,
    program: "Manual affiliate candidate",
    productUrl: "https://example.com/affiliate-candidate",
    commissionModel: "Manual review required before use",
    disclosureRequired: true,
    allowedClaims: [
      "Explain comparison criteria",
      "Use cited product facts only",
      "Show affiliate disclosure before links",
      "Mention limitations and assumptions",
    ],
    prohibitedClaims: [
      "No guaranteed income, health, productivity, or business outcomes",
      "No fake hands-on review language",
      "No hidden affiliate relationship",
      "No unsupported best/cheapest claims",
    ],
    status: "claim_review",
    riskLevel: quest.riskLevel,
    evidenceIds: [proof?.id, ...(proof?.sourceCaptureIds ?? [])].filter(Boolean) as string[],
    createdAt: now,
    updatedAt: now,
  };
}

function reviewForAffiliateOffer(offer: AffiliateOffer): OfferClaimReview {
  const now = new Date().toISOString();
  const blocked = offer.prohibitedClaims.some((claim) => claim.toLowerCase().includes("fake"));
  return {
    id: id("offer-review"),
    offerId: offer.id,
    questId: offer.questId,
    reviewedBy: "TeamLeader1A",
    status: blocked ? "needs_revision" : "passed",
    findings: [
      offer.disclosureRequired ? "Affiliate disclosure is required and visible." : "Disclosure requirement is unclear.",
      `${offer.allowedClaims.length} allowed claim boundaries are defined.`,
      `${offer.prohibitedClaims.length} prohibited claim boundaries are defined.`,
    ],
    requiredChanges:
      blocked || offer.evidenceIds.length === 0
        ? [
            "Attach approved source captures before publishing",
            "Remove any first-hand testing language unless verified",
            "Verify affiliate program terms manually",
          ]
        : ["Keep disclosure close to affiliate links and preserve source citations."],
    createdAt: now,
  };
}

function analyticsSnapshotFromMetrics(state: AppDataState, questId?: string): AnalyticsSnapshot {
  const relevantMetrics = state.searchConsoleMetrics.filter((metric) => !questId || metric.questId === questId);
  const metrics = relevantMetrics.length > 0 ? relevantMetrics : state.searchConsoleMetrics;
  const clicks = metrics.reduce((total, metric) => total + metric.clicks, 0);
  const impressions = metrics.reduce((total, metric) => total + metric.impressions, 0);
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const averagePosition =
    metrics.length > 0 ? metrics.reduce((total, metric) => total + metric.position, 0) / metrics.length : 0;
  const quest = questId ? state.quests.find((item) => item.id === questId) : undefined;
  const recommendation: AnalyticsSnapshot["recommendation"] =
    impressions >= 500 && clicks >= 20 ? "scale_later" : impressions >= 100 ? "continue" : impressions > 0 ? "revise" : "kill";
  const now = new Date().toISOString();
  return {
    id: id("analytics-snapshot"),
    questId,
    propertyId: metrics[0]?.propertyId,
    source: "google_search_console",
    title: quest ? `${quest.title} Search Console snapshot` : "Portfolio Search Console snapshot",
    clicks,
    impressions,
    ctr,
    averagePosition,
    topQueries: [...new Set(metrics.map((metric) => metric.query))].slice(0, 8),
    topPages: [...new Set(metrics.map((metric) => metric.page))].slice(0, 8),
    recommendation,
    teamLeaderSummary:
      recommendation === "scale_later"
        ? "Search visibility is strong enough to consider a scaling review, but spend and publishing still require approval."
        : recommendation === "continue"
          ? "Search visibility is emerging. Continue improving content and collect more data."
          : recommendation === "revise"
            ? "Search visibility is thin. Revise content, source quality, and internal links before scaling."
            : "No usable search signal yet. Keep the experiment small or kill/rework the quest.",
    createdAt: now,
  };
}

function learningFromQuestState(state: AppDataState, questId: string): { card: LearningCard; decision: ExperimentDecision } {
  const quest = state.quests.find((item) => item.id === questId);
  const analysis = state.experimentAnalyses.find((item) => item.questId === questId);
  const snapshot = state.analyticsSnapshots.find((item) => item.questId === questId);
  if (!quest) throw new Error("Quest not found for learning decision.");
  const recommendation = analysis?.recommendation ?? snapshot?.recommendation ?? "revise";
  const now = new Date().toISOString();
  const card: LearningCard = {
    id: id("learning-card"),
    questId,
    title: `${quest.title} learning review`,
    whatWorked: snapshot?.impressions ? [`Collected ${snapshot.impressions} search impressions`] : ["Created a local experiment record"],
    whatFailed: snapshot?.clicks === 0 ? ["No clicks recorded yet"] : ["Evidence is still incomplete"],
    whatChanged:
      recommendation === "scale_later"
        ? "The quest can be considered for a separate scaling review."
        : recommendation === "kill"
          ? "The idea should be killed or redesigned before more work."
          : "The next step is a smaller revision loop, not scaling.",
    nextTest:
      recommendation === "continue"
        ? "Continue the current bounded test and sync read-only metrics again."
        : recommendation === "scale_later"
          ? "Prepare a scaling approval package with budget and risk caps."
          : "Revise the content/research asset and rerun the safest evidence check.",
    reusableLesson: "Every experiment result must produce a continue, revise, kill, or scale-later decision before more resources are allocated.",
    createdAt: now,
  };
  const decision: ExperimentDecision = {
    id: id("experiment-decision"),
    questId,
    experimentId: analysis?.experimentId,
    analyticsSnapshotId: snapshot?.id,
    decision: recommendation,
    rationale: analysis?.notes ?? snapshot?.teamLeaderSummary ?? "TeamLeader1A generated a local decision from available evidence.",
    nextAction: card.nextTest,
    approvalRequired: recommendation === "scale_later",
    createdBy: "TeamLeader1A",
    createdAt: now,
  };
  return { card, decision };
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

function updateMcpCapabilities(current: AppDataState, servers: OpenClawMcpServer[]) {
  const byId = new Map(servers.map((server) => [server.id, server]));
  return current.openClawCapabilities.map((capability) => {
    if (capability.id === "cap-mcp-filesystem") {
      const server = byId.get("mcp-filesystem");
      return {
        ...capability,
        status: server?.configured ? "available" as const : "needs_install" as const,
        description: server?.configured
          ? "Scoped filesystem MCP is configured for approved workspace and vault folders only."
          : capability.description,
      };
    }
    if (capability.id === "cap-mcp-memory") {
      const server = byId.get("mcp-memory");
      return {
        ...capability,
        status: server?.configured ? "available" as const : "needs_install" as const,
        description: server?.configured
          ? "Local knowledge graph memory MCP is configured for agent notes and lessons."
          : capability.description,
      };
    }
    if (capability.id === "cap-mcp-fetch") {
      const server = byId.get("mcp-fetch-approved-url-research");
      return {
        ...capability,
        status: server?.configured ? "blocked" as const : "needs_install" as const,
        description: server?.configured
          ? "Fetch MCP is installed but disabled for general agent use; approved URL research remains per-action gated."
          : capability.description,
      };
    }
    if (capability.id === "cap-mcp-browser") {
      const server = byId.get("mcp-puppeteer-deferred");
      return {
        ...capability,
        status: server?.configured ? "available" as const : "needs_install" as const,
        approvalRequired: false,
        description: server?.configured
          ? "Browser MCP is installed but brokered by Mission Control for safe public reads and screenshots only; direct agent control remains disabled."
          : "Browser MCP can be installed for brokered safe public reads and screenshots only.",
      };
    }
    return capability;
  });
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
  const [operatingAutopilotEnabled, setOperatingAutopilotEnabled] = useState(false);
  const [lastExportResult, setLastExportResult] = useState<ExportResult | null>(null);
  const intervalRef = useRef<number | null>(null);
  const opportunityIntervalRef = useRef<number | null>(null);
  const operatingAutopilotIntervalRef = useRef<number | null>(null);
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
          approvalGateStates: current.approvalGateStates.map((gate) =>
            gate.id === existingApproval.approvalGateStateId
              ? {
                  ...gate,
                  status: "blocked",
                  label: "Blocked",
                  reason: blockedDetail,
                  actionLabel: "Review Product Studio",
                  updatedAt: now,
                }
              : gate,
          ),
          commandLedgerEntries: current.commandLedgerEntries.map((entry) =>
            entry.approvalId === approvalId || entry.commandId === existingApproval.commandId
              ? {
                  ...entry,
                  status: "blocked",
                  outputSummary: `Blocked by safety policy: ${blockedDetail}`,
                  updatedAt: now,
                }
              : entry,
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
        approvalGateStates: current.approvalGateStates.map((gate) =>
          gate.id === existingApproval.approvalGateStateId
            ? {
                ...gate,
                status: status === "approved" ? "approved" : status === "rejected" ? "rejected" : status === "blocked" ? "blocked" : gate.status,
                label: status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : status === "blocked" ? "Blocked" : gate.label,
                reason:
                  status === "approved"
                    ? "The exact publish request was approved. Execution still remains limited to the approved payload and connector availability."
                    : status === "rejected"
                      ? "The exact publish request was rejected. Request a revision or prepare a new approval later."
                      : gate.reason,
                updatedAt: now,
              }
            : gate,
        ),
        commandLedgerEntries: current.commandLedgerEntries.map((entry) =>
          entry.approvalId === approvalId || entry.commandId === existingApproval.commandId
            ? {
                ...entry,
                status: ledgerStatusForApprovalStatus(status),
                outputSummary:
                  status === "approved"
                    ? "Approved by user. Execution may run through its allowlisted connector."
                    : status === "rejected"
                      ? "Rejected by user. No external action will run."
                      : entry.outputSummary,
                updatedAt: now,
              }
            : entry,
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

  const updateExternalActionLock = useCallback(
    async (mode: ExternalActionLockMode, reason: string) => {
      const current = dataRef.current;
      const now = new Date().toISOString();
      const next: AppDataState = {
        ...current,
        externalActionLock: {
          ...current.externalActionLock,
          mode,
          reason,
          updatedBy: "user",
          updatedAt: now,
        },
        activityLogs: [
          {
            id: id("log-external-lock"),
            category: "system",
            title: "External action lock updated",
            detail: `Mode set to ${mode.replace(/_/g, " ")}. ${reason}`,
            severity: mode === "locked" ? "warning" : "info",
            createdAt: now,
          } satisfies ActivityLog,
          ...current.activityLogs,
        ],
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

  const refreshOpenClawMcpStatus = useCallback(async () => {
    const current = dataRef.current;
    const { result, servers } = await openclawService.listMcpServers(current.openClawMcpServers);
    const configuredCount = servers.filter((server) => server.configured).length;
    const now = new Date().toISOString();
    const next: AppDataState = {
      ...current,
      openClawMcpServers: servers,
      openClawCapabilities: updateMcpCapabilities(current, servers),
      openClawEvents: [
        {
          id: id("event-mcp-status"),
          type: "command",
          title: result.ok ? "MCP status refreshed" : "MCP status check failed",
          detail: result.ok ? `${configuredCount} OpenClaw MCP servers are configured.` : executionSummary(result),
          createdAt: now,
          severity: result.ok ? "success" : "warning",
        },
        ...current.openClawEvents,
      ],
      activityLogs: [
        {
          id: id("log-mcp-status"),
          category: "openclaw",
          title: "OpenClaw MCP status refreshed",
          detail: result.ok ? `${configuredCount} configured MCP servers found.` : executionSummary(result),
          severity: result.ok ? "success" : "warning",
          createdAt: now,
        },
        ...current.activityLogs,
      ],
    };
    await persist(next);
  }, [persist]);

  const installOpenClawMcpLocalKit = useCallback(async () => {
    const current = dataRef.current;
    const result = await openclawService.installMcpLocalKit(current.userSettings.obsidianVaultPath);
    const listed = await openclawService.listMcpServers(current.openClawMcpServers);
    const now = new Date().toISOString();
    const configuredCount = listed.servers.filter((server) => server.configured).length;
    const next: AppDataState = {
      ...current,
      openClawMcpServers: listed.servers,
      openClawCapabilities: updateMcpCapabilities(current, listed.servers),
      openClawCommands: [
        {
          id: id("cmd-mcp-install"),
          command: result.command.join(" "),
          targetAgentId: "system",
          status: result.ok ? "complete" : "failed",
          riskLevel: "medium",
          approvalRequired: false,
          resultSummary: result.ok ? "Free local MCP kit installed and OpenClaw MCP config repaired." : executionSummary(result),
          createdAt: now,
          actionKind: undefined,
          executionMode: "real_local",
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          startedAt: now,
          completedAt: now,
        },
        ...current.openClawCommands,
      ],
      openClawEvents: [
        {
          id: id("event-mcp-install"),
          type: "command",
          title: result.ok ? "Free MCP kit installed" : "MCP kit install failed",
          detail: result.ok
            ? `${configuredCount} OpenClaw MCP servers are configured. Fetch remains disabled for general agent access.`
            : executionSummary(result),
          createdAt: now,
          severity: result.ok ? "success" : "danger",
        },
        ...current.openClawEvents,
      ],
      activityLogs: [
        {
          id: id("log-mcp-install"),
          category: "openclaw",
          title: result.ok ? "OpenClaw MCP local kit repaired" : "OpenClaw MCP local kit failed",
          detail: result.ok
            ? "Filesystem and memory MCPs are scoped locally. Fetch MCP is staged for approved URL research only."
            : executionSummary(result),
          severity: result.ok ? "success" : "danger",
          createdAt: now,
        },
        ...current.activityLogs,
      ],
    };
    await persist(next);
  }, [persist]);

  const runBrowserBrokerDiagnostic = useCallback(async () => {
    const current = dataRef.current;
    const now = new Date().toISOString();
    const diagnosticHuntId = "browser-broker-diagnostic";
    const runId = id("public-research-diagnostic");
    const browserRunId = id("browser-research-diagnostic");
    const browserFetchId = id("browser-research-fetch");
    const receiptId = id("browser-safety-receipt");
    const artifactId = id("browser-research-artifact");
    const result = await openclawService.readPublicBrowserSource({
      url: "https://example.com",
      purpose: "Browser broker diagnostic: fetch public title/text and capture screenshot safely.",
      sourcePackId: "diagnostic",
      huntId: diagnosticHuntId,
      timeoutSeconds: 18,
      captureScreenshot: true,
    });
    const completedAt = new Date().toISOString();
    const receipt: BrowserSafetyReceipt = {
      id: receiptId,
      runId: browserRunId,
      url: result.url,
      allowed: result.ok,
      blockedReasons: result.ok ? [] : [result.error || "Browser broker diagnostic failed safely."],
      safetyChecklist: [
        "Exact public URL only",
        "GET/read-only page access",
        "No login or credentials",
        "No form submission",
        "No purchase or spend",
        "No publishing, messaging, or connector execution",
      ],
      receipt: result.safetyReceipt,
      createdAt: completedAt,
    };
    const browserFetch: BrowserResearchFetch = {
      id: browserFetchId,
      runId: browserRunId,
      sourcePackId: "diagnostic",
      url: result.url,
      status: result.ok ? "captured" : "failed",
      title: result.title ?? "Example Domain",
      excerpt: result.excerpt ?? undefined,
      screenshotPath: result.screenshotPath ?? undefined,
      screenshotCaptured: result.screenshotCaptured,
      basicLinks: result.basicLinks,
      error: result.error ?? undefined,
      safetyReceiptId: receiptId,
      startedAt: now,
      completedAt,
    };
    const artifact: BrowserResearchArtifact = {
      id: artifactId,
      runId: browserRunId,
      fetchId: browserFetchId,
      huntId: diagnosticHuntId,
      type: "page_summary",
      url: result.url,
      title: result.title ?? "Example Domain",
      summary: safeBrowserSummary(result),
      screenshotPath: result.screenshotPath ?? undefined,
      safetyReceiptId: receiptId,
      createdAt: completedAt,
    };
    const browserRun: BrowserResearchRun = {
      id: browserRunId,
      huntId: diagnosticHuntId,
      publicResearchRunId: runId,
      depth: "quick",
      status: result.ok ? "completed" : "failed",
      fetchIds: [browserFetchId],
      artifactIds: [artifactId],
      safetyReceiptIds: [receiptId],
      startedAt: now,
      completedAt,
      summary: result.ok
        ? "Browser Research Broker diagnostic captured example.com with a safe public read."
        : "Browser Research Broker diagnostic failed safely before any risky action.",
      executionReceipt: `browser-broker-diagnostic:${result.ok ? "captured" : "failed"}:example.com:no-login:no-forms:no-spend:no-publish`,
    };
    const publicRun: PublicResearchRun = {
      id: runId,
      huntId: diagnosticHuntId,
      depth: "quick",
      status: result.ok ? "completed" : "failed",
      sourcePackIds: ["diagnostic"],
      fetchIds: [],
      browserResearchRunId: browserRunId,
      evidenceCitationIds: [],
      candidateIdeaIds: [],
      startedAt: now,
      completedAt,
      summary: "One-page safe browser broker diagnostic against example.com.",
      executionReceipt: browserRun.executionReceipt,
    };
    await persistOptimistic({
      ...current,
      publicResearchRuns: [publicRun, ...current.publicResearchRuns],
      browserResearchRuns: [browserRun, ...current.browserResearchRuns],
      browserResearchFetches: [browserFetch, ...current.browserResearchFetches],
      browserResearchArtifacts: [artifact, ...current.browserResearchArtifacts],
      browserSafetyReceipts: [receipt, ...current.browserSafetyReceipts],
      openClawEvents: [
        {
          id: id("event-browser-broker-diagnostic"),
          type: "command",
          title: result.ok ? "Browser Research Broker diagnostic completed" : "Browser Research Broker diagnostic failed safely",
          detail: result.ok
            ? `Read ${result.url}. Screenshot: ${result.screenshotCaptured ? "captured" : "not available"}.`
            : result.error || "The broker blocked or failed the diagnostic safely.",
          createdAt: completedAt,
          severity: result.ok ? "success" : "warning",
        },
        ...current.openClawEvents,
      ],
      activityLogs: [
        {
          id: id("log-browser-broker-diagnostic"),
          category: "openclaw",
          title: result.ok ? "Browser broker diagnostic completed" : "Browser broker diagnostic failed safely",
          detail: `${artifact.summary} ${receipt.receipt}`,
          severity: result.ok ? "success" : "warning",
          createdAt: completedAt,
        } satisfies ActivityLog,
        ...current.activityLogs,
      ].slice(0, 80),
    });
  }, [persistOptimistic]);

  const createOpenClawApproval = useCallback(
    async (
      payload: OpenClawApprovalPayload,
      options: { questId?: string; pilotRunId?: string; missionDraftId?: string; missionRunId?: string; parentApprovalId?: string; retryOfCommandId?: string } = {},
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
        targetAgentId:
          payload.actionKind === "agent_turn"
            ? payload.agentProfileId
            : payload.actionKind === "url_research"
              ? "teamleader1a"
              : payload.actionKind === "mission_start"
                ? "teamleader1a"
                : "openclaw-runtime",
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
        missionRunId: options.missionRunId ?? (payload.actionKind === "mission_start" ? payload.missionRunId : payload.actionKind === "agent_turn" ? payload.missionRunId : undefined),
        missionStepId: payload.actionKind === "agent_turn" ? payload.missionStepId : undefined,
      };
      const approval: ApprovalRequest = {
        id: approvalId,
        type:
          payload.actionKind === "gateway_start"
            ? "Start OpenClaw gateway"
            : payload.actionKind === "agent_turn"
              ? "Run OpenClaw local agent turn"
              : payload.actionKind === "mission_start"
                ? "Start TeamLeader mission"
                : payload.actionKind === "url_research"
                  ? "Run approved URL research"
                  : "Send approved channel message",
        title: requestTitle(payload),
        questId: options.questId,
        pilotRunId: options.pilotRunId,
        missionDraftId: options.missionDraftId ?? (payload.actionKind === "mission_start" ? payload.missionDraftId : undefined),
        missionRunId: options.missionRunId ?? (payload.actionKind === "mission_start" ? payload.missionRunId : undefined),
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
      const ledgerEntry: CommandLedgerEntry = {
        id: id("ledger-openclaw"),
        questId: options.questId,
        approvalId,
        commandId,
        connector: connectorForPayload(payload),
        action: payload.actionKind,
        status: isBlocked ? "blocked" : "approval_required",
        externalAction: payload.actionKind !== "agent_turn" && payload.actionKind !== "mission_start",
        approvalMode: payload.actionKind === "mission_start" ? "batch" : "single",
        riskLevel: command.riskLevel,
        inputSummary: safetyEvaluation.normalizedPayloadSummary,
        outputSummary: isBlocked
          ? `Blocked by safety policy: ${safetyEvaluation.blockedReasons.join(" ")}`
          : "Waiting for approval. No connector action has run.",
        createdAt: now,
        updatedAt: now,
      };
      const next: AppDataState = {
        ...current,
        approvalRequests: [approval, ...current.approvalRequests],
        openClawCommands: [command, ...current.openClawCommands],
        commandLedgerEntries: [ledgerEntry, ...current.commandLedgerEntries],
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
            relatedMissionRunId: options.missionRunId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return { approvalId, commandId, blocked: isBlocked, safetyEvaluation };
    },
    [persistOptimistic],
  );

  const executeMissionRun = useCallback(
    async (approval: ApprovalRequest): Promise<OpenClawBridgeResult> => {
      if (!approval.payload || approval.payload.actionKind !== "mission_start") {
        return bridgeResult(false, ["mission://invalid"], "", "Approval payload is not a mission start request.");
      }

      const payload = approval.payload;
      const current = dataRef.current;
      const run = current.missionRuns.find((item) => item.id === payload.missionRunId);
      if (!run) {
        return bridgeResult(false, ["mission://missing-run"], "", "Mission run was not found.");
      }

      const selectedStepIds = new Set(payload.missionStepIds);
      const steps = current.missionAgentSteps
        .filter((step) => step.missionRunId === run.id && selectedStepIds.has(step.id) && !["complete", "skipped", "local_draft"].includes(step.status))
        .sort((a, b) => a.order - b.order);
      if (steps.length === 0) {
        return bridgeResult(false, ["mission://no-steps"], "", "No queued mission agent steps were available for this approval.");
      }

      let nextSteps = current.missionAgentSteps.map((step) =>
        selectedStepIds.has(step.id) && step.missionRunId === run.id
          ? { ...step, status: "queued" as const, error: undefined, updatedAt: new Date().toISOString() }
          : step,
      );
      let nextRuns = current.missionRuns.map((item) =>
        item.id === run.id
          ? {
              ...item,
              status: "running" as const,
              pausedReason: undefined,
              approvalId: approval.id,
              updatedAt: new Date().toISOString(),
            }
          : item,
      );
      let nextDrafts = current.missionDrafts.map((draft) =>
        draft.id === run.draftId
          ? { ...draft, status: "started" as const, approvalId: approval.id, runId: run.id, updatedAt: new Date().toISOString() }
          : draft,
      );
      const nextCommands: OpenClawCommand[] = [...current.openClawCommands];
      const nextLedger: CommandLedgerEntry[] = [...current.commandLedgerEntries];
      const nextResults: AgentTurnResult[] = [...current.agentTurnResults];
      const nextSections: MissionBriefSection[] = [...current.missionBriefSections];
      const nextArtifacts: MissionArtifact[] = [...current.missionArtifacts];
      const nextAgentMessages: AgentMessage[] = [...current.agentMessages];
      const nextActivityLogs = [...current.activityLogs];
      const outputs: string[] = [];
      let failedStep: MissionAgentStep | null = null;
      let failedSummary = "";

      const artifactTypeForKind = (kind: MissionBriefSectionKind): MissionArtifact["type"] => {
        if (kind === "research") return "research_report";
        if (kind === "seo") return "keyword_map";
        if (kind === "content") return "content_brief";
        if (kind === "production") return "draft_page";
        if (kind === "validation") return "validation_report";
        if (kind === "experiment") return "experiment_plan";
        if (kind === "approvals") return "publishing_diff";
        if (kind === "risks") return "decision_record";
        return "decision_record";
      };

      for (const step of steps) {
        const startedAt = new Date().toISOString();
        nextSteps = nextSteps.map((item) =>
          item.id === step.id ? { ...item, status: "running" as const, startedAt, updatedAt: startedAt } : item,
        );

        const result = await openclawService.runAgentTurn({
          agentProfileId: step.agentProfileId,
          agentRole: step.agentName,
          message: step.prompt,
          missionRunId: run.id,
          timeoutSeconds: 300,
        });
        const completedAt = new Date().toISOString();
        const summary = executionSummary(result);
        const commandId = id("cmd-mission-agent");
        const resultId = id("agent-turn-result");
        const sectionId = id("mission-section");
        const artifactId = id("artifact-mission");
        const content = contentFromAgentResult(step, summary, result);

        const command: OpenClawCommand = {
          id: commandId,
          command: result.command.join(" "),
          targetAgentId: step.agentProfileId,
          status: result.ok ? "complete" : "failed",
          riskLevel: "medium",
          approvalRequired: true,
          resultSummary: summary,
          createdAt: startedAt,
          actionKind: "agent_turn",
          executionMode: "real_local",
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          startedAt,
          completedAt,
          missionRunId: run.id,
          missionStepId: step.id,
        };
        const turnResult: AgentTurnResult = {
          id: resultId,
          missionRunId: run.id,
          stepId: step.id,
          agentId: step.agentId,
          ok: result.ok,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          summary,
          commandId,
          createdAt: completedAt,
        };
        const section: MissionBriefSection = {
          id: sectionId,
          missionRunId: run.id,
          questId: run.questId,
          kind: step.briefKind,
          title: step.title,
          summary,
          content,
          status: result.ok ? "ready" : "blocked",
          agentId: step.agentId,
          sourceStepId: step.id,
          createdAt: completedAt,
          updatedAt: completedAt,
        };
        const artifact: MissionArtifact = {
          id: artifactId,
          questId: run.questId,
          taskId: step.id,
          type: artifactTypeForKind(step.briefKind),
          title: `${step.agentName}: ${step.title}`,
          summary: result.ok ? `${step.agentName} completed a mission artifact for TeamLeader1A review.` : `${step.agentName} failed safely during the mission run.`,
          content,
          status: result.ok ? "ready_for_review" : "blocked",
          storage: "sqlite",
          sourceIds: [run.id, step.id, commandId, resultId],
          createdByAgentId: step.agentId,
          createdAt: completedAt,
          updatedAt: completedAt,
        };

        nextCommands.unshift(command);
        nextLedger.unshift({
          id: id("ledger-mission-agent"),
          questId: run.questId,
          taskId: step.id,
          approvalId: approval.id,
          commandId,
          connector: "openclaw",
          action: "agent_turn",
          status: result.ok ? "completed" : "failed",
          externalAction: false,
          approvalMode: "batch",
          riskLevel: "medium",
          inputSummary: `${step.agentName}: ${step.title}`,
          outputSummary: summary,
          stdout: result.stdout,
          stderr: result.stderr,
          createdAt: startedAt,
          updatedAt: completedAt,
        });
        nextResults.unshift(turnResult);
        nextSections.unshift(section);
        nextArtifacts.unshift(artifact);
        nextAgentMessages.unshift({
          id: id("msg-mission-agent"),
          fromAgentId: step.agentId,
          toAgentId: "TeamLeader1A",
          questId: run.questId,
          summary: `${step.agentName} ${result.ok ? "submitted" : "failed"}: ${step.title}`,
          details: summary,
          createdAt: completedAt,
          visibility: step.agentId === "teamleader1a" ? "user_summary" : "internal_report",
        });
        nextActivityLogs.unshift({
          id: id("log-mission-agent"),
          category: "agent",
          title: result.ok ? `${step.agentName} mission turn completed` : `${step.agentName} mission turn failed safely`,
          detail: summary,
          severity: result.ok ? "success" : "danger",
          createdAt: completedAt,
          relatedQuestId: run.questId,
          relatedMissionRunId: run.id,
        });
        nextSteps = nextSteps.map((item) =>
          item.id === step.id
            ? {
                ...item,
                status: result.ok ? "complete" as const : "failed" as const,
                commandId,
                resultId,
                artifactId,
                briefSectionId: sectionId,
                error: result.ok ? undefined : summary,
                completedAt,
                updatedAt: completedAt,
              }
            : item,
        );
        outputs.push(`${step.agentName}: ${summary}`);

        if (!result.ok) {
          failedStep = step;
          failedSummary = summary;
          break;
        }
      }

      const completedStepIds = new Set(nextSteps.filter((step) => step.missionRunId === run.id && ["complete", "skipped", "local_draft"].includes(step.status)).map((step) => step.id));
      const runStepIds = new Set(nextSteps.filter((step) => step.missionRunId === run.id).map((step) => step.id));
      const allDone = Array.from(runStepIds).every((stepId) => completedStepIds.has(stepId));
      const status: MissionRun["status"] = failedStep ? "paused" : allDone ? "complete" : "paused";
      const finalSummary =
        failedStep
          ? `Mission paused at ${failedStep.agentName}: ${failedSummary}`
          : allDone
            ? `Mission completed. TeamLeader1A has a unified brief from ${completedStepIds.size} approved local agent turns.`
            : "Mission paused after completing the approved subset. Request another approval to resume remaining queued local turns.";

      nextRuns = nextRuns.map((item) =>
        item.id === run.id
          ? {
              ...item,
              status,
              stepIds: Array.from(runStepIds),
              briefSectionIds: nextSections.filter((section) => section.missionRunId === run.id).map((section) => section.id),
              artifactIds: nextArtifacts.filter((artifact) => artifact.sourceIds.includes(run.id)).map((artifact) => artifact.id),
              finalSummary,
              pausedReason: failedStep ? failedSummary : status === "paused" ? finalSummary : undefined,
              updatedAt: new Date().toISOString(),
            }
          : item,
      );

      await persist({
        ...dataRef.current,
        missionDrafts: nextDrafts,
        missionRuns: nextRuns,
        missionAgentSteps: nextSteps,
        missionBriefSections: nextSections,
        missionApprovalBatches: current.missionApprovalBatches.map((batch) =>
          batch.approvalId === approval.id
            ? { ...batch, status: failedStep ? "rejected" : allDone ? "approved" : "pending", updatedAt: new Date().toISOString() }
            : batch,
        ),
        agentTurnResults: nextResults,
        missionArtifacts: nextArtifacts,
        openClawCommands: nextCommands,
        commandLedgerEntries: nextLedger,
        agentMessages: nextAgentMessages.slice(0, 48),
        activityLogs: nextActivityLogs,
        dashboardSummary: {
          ...dataRef.current.dashboardSummary,
          latestTeamLeaderRecommendation: finalSummary,
        },
      });

      return bridgeResult(!failedStep, ["mission://approved-agent-turns"], outputs.join("\n\n") || finalSummary, failedStep ? failedSummary : "");
    },
    [persist],
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
          commandLedgerEntries: runningState.commandLedgerEntries.map((entry) =>
            entry.approvalId === approval.id || entry.commandId === approval.commandId
              ? {
                  ...entry,
                  status: "blocked",
                  outputSummary: `Blocked by safety policy: ${blockedDetail}`,
                  updatedAt: startedAt,
                }
              : entry,
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
        commandLedgerEntries: runningState.commandLedgerEntries.map((entry) =>
          entry.approvalId === approval.id || entry.commandId === approval.commandId
            ? {
                ...entry,
                status: "running",
                outputSummary: "Approved connector action is running.",
                updatedAt: startedAt,
              }
            : entry,
        ),
      });

      let result: OpenClawBridgeResult;
      if (approval.payload.actionKind === "gateway_start") {
        result = await openclawService.startGateway();
      } else if (approval.payload.actionKind === "agent_turn") {
        result = await openclawService.runAgentTurn({
          agentProfileId: approval.payload.agentProfileId,
          agentRole: approval.payload.agentRole ?? "TeamLeader1A",
          message: approval.payload.message,
          missionRunId: approval.payload.missionRunId,
          timeoutSeconds: 300,
        });
      } else if (approval.payload.actionKind === "mission_start") {
        result = await executeMissionRun(approval);
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
      const chatMessage: TeamLeaderChatMessage | null =
        approval.payload.actionKind === "agent_turn"
          ? {
              id: id("tl-chat-live-result"),
              role: "teamleader",
              content: summary,
              createdAt: completedAt,
              mode: "live_result",
              relatedApprovalId: approval.id,
              relatedCommandId: approval.commandId,
              relatedMissionRunId: approval.payload.missionRunId,
            }
          : null;
      const sourceCaptureArtifacts =
        approval.payload.actionKind === "url_research" && approval.questId
          ? approval.payload.urls.map((url) => {
              const captureId = id("source-capture");
              const capture: ResearchSourceCapture = {
                id: captureId,
                questId: approval.questId as string,
                url,
                title: result.ok ? `Approved source capture: ${url}` : `Failed source capture: ${url}`,
                status: result.ok ? "captured" : "failed",
                captureMode: "approved_url",
                evidenceSummary: summary,
                citation: url,
                riskNotes: approval.payload?.actionKind === "url_research" ? approval.payload.riskNotes : "Approved URL research boundary applied.",
                approvalId: approval.id,
                commandId: approval.commandId,
                capturedAt: completedAt,
              };
              const artifact: MissionArtifact = {
                id: id("artifact-source-capture"),
                questId: approval.questId as string,
                type: "source_capture",
                title: capture.title,
                summary: result.ok ? "Approved URL research completed and was captured locally." : "Approved URL research failed safely and was captured for audit.",
                content: [
                  `## URL`,
                  url,
                  "",
                  `## Result`,
                  summary,
                  "",
                  `## Safety Boundary`,
                  "This capture came from an approved URL research action. It does not authorize publishing, scraping beyond the approved URL, spending, login automation, or form submission.",
                ].join("\n"),
                status: result.ok ? "ready_for_review" : "blocked",
                storage: "sqlite",
                sourceIds: [captureId, approval.id, approval.commandId ?? ""].filter(Boolean),
                createdByAgentId: "teamleader1a",
                createdAt: completedAt,
                updatedAt: completedAt,
              };
              return { capture, artifact };
            })
          : [];
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
        researchSourceCaptures: sourceCaptureArtifacts.length
          ? [...sourceCaptureArtifacts.map((item) => item.capture), ...current.researchSourceCaptures]
          : current.researchSourceCaptures,
        missionArtifacts: sourceCaptureArtifacts.length
          ? [...sourceCaptureArtifacts.map((item) => item.artifact), ...current.missionArtifacts]
          : current.missionArtifacts,
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
        commandLedgerEntries: current.commandLedgerEntries.map((entry) =>
          entry.approvalId === approval.id || entry.commandId === approval.commandId
            ? {
                ...entry,
                status: result.ok ? "completed" : "failed",
                outputSummary: summary,
                stdout: result.stdout,
                stderr: result.stderr,
                updatedAt: completedAt,
              }
            : entry,
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
            relatedMissionRunId: approval.missionRunId ?? (approval.payload.actionKind === "mission_start" ? approval.payload.missionRunId : approval.payload.actionKind === "agent_turn" ? approval.payload.missionRunId : undefined),
          },
          ...current.activityLogs,
        ],
        agentMessages: message ? [message, ...current.agentMessages].slice(0, 24) : current.agentMessages,
        teamLeaderChatMessages: chatMessage ? [...current.teamLeaderChatMessages, chatMessage].slice(-120) : current.teamLeaderChatMessages,
      };
      await persist(next);
    },
    [executeMissionRun, persist],
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
        agentRole: "TeamLeader1A",
        message: message.trim(),
        expectedResult: "TeamLeader1A returns a local planning or research summary.",
      });
    },
    [createOpenClawApproval],
  );

  const createOpportunityHuntFromMessage = useCallback(
    async (message: string, depth?: OpportunityHuntDepth) => {
      const trimmed = message.trim();
      if (!trimmed) return "";
      const current = dataRef.current;
      const now = new Date().toISOString();
      const userChatId = id("tl-chat-user");
      const selectedDepth = depth ?? current.userSettings.defaultOpportunityHuntDepth ?? "fast";
      const ids = { huntId: id("opportunity-hunt"), proposalId: id("business-proposal") };
      const publicResearch = await buildPublicResearchBundle(current, ids.huntId, ids.proposalId, trimmed, selectedDepth);
      const built = buildOpportunityHuntState(current, trimmed, userChatId, selectedDepth, ids, publicResearch);
      const commandReceipt: ExecutionReceipt = {
        id: id("execution-receipt"),
        proposalId: built.proposal.id,
        actionType: "teamleader_opportunity_hunt",
        title: "TeamLeader command receipt",
        summary: `TeamLeader1A started a ${depthLabel(selectedDepth).toLowerCase()} opportunity hunt, assigned agents, captured public evidence, and created a proposal draft.`,
        source: "TeamLeader1A / Browser Research Broker",
        artifactIds: [built.hunt.id, built.proposal.id, publicResearch.run.id],
        budgetEffect: "No spend. Public read-only research and local proposal drafting only.",
        externalAction: false,
        approvalRequired: false,
        status: "success",
        nextAction: "Review the Mission Brief proposal.",
        createdAt: now,
      };
      const nextPreSync: AppDataState = {
        ...current,
        opportunityHunts: [built.hunt, ...current.opportunityHunts],
        publicResearchRuns: [publicResearch.run, ...current.publicResearchRuns],
        publicResearchFetches: [...publicResearch.fetches, ...current.publicResearchFetches],
        browserResearchRuns: [publicResearch.browserResearch.run, ...current.browserResearchRuns],
        browserResearchFetches: [...publicResearch.browserResearch.fetches, ...current.browserResearchFetches],
        browserResearchArtifacts: [...publicResearch.browserResearch.artifacts, ...current.browserResearchArtifacts],
        browserSafetyReceipts: [...publicResearch.browserResearch.safetyReceipts, ...current.browserSafetyReceipts],
        evidenceCitations: [...publicResearch.citations, ...current.evidenceCitations],
        candidateBusinessIdeas: [...publicResearch.candidates, ...current.candidateBusinessIdeas],
        candidateScorecards: [...publicResearch.scorecards, ...current.candidateScorecards],
        businessProposals: [built.proposal, ...current.businessProposals],
        researchEvidence: [...built.evidence, ...current.researchEvidence],
        productionDestinations: [...built.destinations, ...current.productionDestinations],
        contentInventoryItems: [...built.contentInventory, ...current.contentInventoryItems],
        externalPlatformRequirements: [...built.externalPlatformRequirements, ...current.externalPlatformRequirements],
        platformExecutionPackages: [...built.platformExecutionPackages, ...current.platformExecutionPackages],
        businessTasks: [...built.tasks, ...current.businessTasks],
        agentWorkSessions: [...built.sessions, ...current.agentWorkSessions],
        executionReceipts: [commandReceipt, ...current.executionReceipts],
        teamLeaderChatMessages: [
          ...current.teamLeaderChatMessages,
          {
            id: userChatId,
            role: "user",
            content: trimmed,
            createdAt: now,
            mode: "local",
            relatedOpportunityHuntId: built.hunt.id,
            relatedBusinessProposalId: built.proposal.id,
          } satisfies TeamLeaderChatMessage,
          {
            id: id("tl-chat-opportunity"),
            role: "teamleader",
            content:
              `I started a ${depthLabel(selectedDepth).toLowerCase()} public opportunity hunt for "${trimmed}". The agents are working now in the Guild Office and Tasks tabs. They know the budget cap, remaining capital, platform boundaries, public source-pack evidence, and safe browser-read receipts. I compared the Top 3 candidates and will show one winner before anything external happens.`,
            createdAt: now,
            mode: "local",
            relatedOpportunityHuntId: built.hunt.id,
            relatedBusinessProposalId: built.proposal.id,
          } satisfies TeamLeaderChatMessage,
        ].slice(-120),
        activityLogs: [
          {
            id: id("log-opportunity-hunt"),
            category: "agent",
            title: "TeamLeader1A started opportunity hunt",
            detail: `${depthLabel(selectedDepth)} curated public research created ${publicResearch.citations.length} citations, ${publicResearch.browserResearch.artifacts.length} brokered browser artifacts, and ${publicResearch.candidates.length} candidate ideas. No publishing, messaging, spending, launch, login automation, form submission, or external connector action ran.`,
            severity: "success",
            createdAt: now,
          } satisfies ActivityLog,
          ...current.activityLogs,
        ].slice(0, 80),
        dashboardSummary: {
          ...current.dashboardSummary,
          latestTeamLeaderRecommendation: "Agents are working on a zero-budget business proposal. Watch Tasks or Guild Office, then review the proposal in Mission Briefs.",
        },
      };
      const next = { ...nextPreSync, guildOfficeStations: syncGuildStations(nextPreSync) };
      await persistOptimistic(next);
      return built.hunt.id;
    },
    [persistOptimistic],
  );

  const updateBusinessProposalStatus = useCallback(
    async (proposalId: string, status: BusinessProposal["status"]) => {
      const current = dataRef.current;
      const proposal = current.businessProposals.find((item) => item.id === proposalId);
      if (!proposal) return;
      const now = new Date().toISOString();
      await persistOptimistic({
        ...current,
        businessProposals: current.businessProposals.map((item) =>
          item.id === proposalId ? { ...item, status, updatedAt: now } : item,
        ),
        opportunityHunts: current.opportunityHunts.map((hunt) =>
          hunt.id === proposal.huntId
            ? { ...hunt, status: status === "rejected" ? "rejected" : hunt.status, updatedAt: now }
            : hunt,
        ),
        activityLogs: [
          {
            id: id("log-proposal-status"),
            category: "quest",
            title: `Business proposal ${status.replace(/_/g, " ")}`,
            detail: `${proposal.title} was marked ${status.replace(/_/g, " ")}. No external action ran.`,
            severity: status === "rejected" ? "warning" : "info",
            createdAt: now,
          },
          ...current.activityLogs,
        ],
      });
    },
    [persistOptimistic],
  );

  const cleanupAcceptanceTestData = useCallback(async () => {
    const current = dataRef.current;
    const testHuntIds = new Set(
      current.opportunityHunts
        .filter((hunt) => /\b\d{10,}\b/.test(hunt.sourcePrompt) || hunt.sourcePrompt.toLowerCase().includes("acceptance test"))
        .map((hunt) => hunt.id),
    );
    if (testHuntIds.size === 0) return;
    const proposalIds = new Set(current.businessProposals.filter((proposal) => testHuntIds.has(proposal.huntId)).map((proposal) => proposal.id));
    const businessIds = new Set(current.approvedBusinesses.filter((business) => proposalIds.has(business.proposalId)).map((business) => business.id));
    const researchRunIds = new Set(current.publicResearchRuns.filter((run) => testHuntIds.has(run.huntId)).map((run) => run.id));
    const browserRunIds = new Set(current.browserResearchRuns.filter((run) => testHuntIds.has(run.huntId)).map((run) => run.id));
    const now = new Date().toISOString();
    await persistOptimistic({
      ...current,
      opportunityHunts: current.opportunityHunts.filter((hunt) => !testHuntIds.has(hunt.id)),
      businessProposals: current.businessProposals.filter((proposal) => !proposalIds.has(proposal.id)),
      approvedBusinesses: current.approvedBusinesses.filter((business) => !businessIds.has(business.id)),
      businessTasks: current.businessTasks.filter((task) => !task.huntId || !testHuntIds.has(task.huntId)),
      agentWorkSessions: current.agentWorkSessions.filter((session) => !session.huntId || !testHuntIds.has(session.huntId)),
      publicResearchRuns: current.publicResearchRuns.filter((run) => !researchRunIds.has(run.id)),
      publicResearchFetches: current.publicResearchFetches.filter((fetch) => !researchRunIds.has(fetch.runId)),
      browserResearchRuns: current.browserResearchRuns.filter((run) => !browserRunIds.has(run.id)),
      browserResearchFetches: current.browserResearchFetches.filter((fetch) => !browserRunIds.has(fetch.runId)),
      browserResearchArtifacts: current.browserResearchArtifacts.filter((artifact) => !browserRunIds.has(artifact.runId)),
      browserSafetyReceipts: current.browserSafetyReceipts.filter((receipt) => !browserRunIds.has(receipt.runId)),
      evidenceCitations: current.evidenceCitations.filter((citation) => !testHuntIds.has(citation.huntId)),
      candidateBusinessIdeas: current.candidateBusinessIdeas.filter((candidate) => !testHuntIds.has(candidate.huntId)),
      candidateScorecards: current.candidateScorecards.filter((scorecard) => !testHuntIds.has(scorecard.huntId)),
      researchEvidence: current.researchEvidence.filter((evidence) => !evidence.huntId || !testHuntIds.has(evidence.huntId)),
      productionDestinations: current.productionDestinations.filter((item) => !item.proposalId || !proposalIds.has(item.proposalId)),
      contentInventoryItems: current.contentInventoryItems.filter((item) => !item.proposalId || !proposalIds.has(item.proposalId)),
      externalPlatformRequirements: current.externalPlatformRequirements.filter((item) => !item.proposalId || !proposalIds.has(item.proposalId)),
      platformExecutionPackages: current.platformExecutionPackages.filter((item) => !item.proposalId || !proposalIds.has(item.proposalId)),
      autonomousImprovementRuns: current.autonomousImprovementRuns.filter((run) => !businessIds.has(run.businessId)),
      approvedBusinessCockpits: current.approvedBusinessCockpits.filter((cockpit) => !businessIds.has(cockpit.businessId)),
      businessOperatingRuns: current.businessOperatingRuns.filter((run) => !businessIds.has(run.businessId)),
      businessIterations: current.businessIterations.filter((iteration) => !businessIds.has(iteration.businessId)),
      executionReceipts: current.executionReceipts.filter((receipt) => !receipt.businessId || !businessIds.has(receipt.businessId)),
      researchQueryPlans: current.researchQueryPlans.filter((plan) => !plan.huntId || !testHuntIds.has(plan.huntId)),
      opportunityCandidates: current.opportunityCandidates.filter((candidate) => !candidate.huntId || !testHuntIds.has(candidate.huntId)),
      evidenceQualityScores: current.evidenceQualityScores.filter((score) => !score.evidenceId || !current.researchEvidence.some((evidence) => evidence.id === score.evidenceId && evidence.huntId && testHuntIds.has(evidence.huntId))),
      localAssetFiles: current.localAssetFiles.filter((file) => !businessIds.has(file.businessId)),
      publishingPackages: current.publishingPackages.filter((pack) => !businessIds.has(pack.businessId)),
      businessMetricSnapshots: current.businessMetricSnapshots.filter((snapshot) => !businessIds.has(snapshot.businessId)),
      budgetLedgerEntries: current.budgetLedgerEntries.filter((entry) => !businessIds.has(entry.businessId)),
      autopilotJobs: current.autopilotJobs.filter((job) => !businessIds.has(job.businessId)),
      agentArtifacts: current.agentArtifacts.filter((artifact) => !proposalIds.has(artifact.runId) && !businessIds.has(artifact.runId)),
      activityLogs: [
        {
          id: id("log-cleanup-test-data"),
          category: "system",
          title: "Acceptance test data cleaned",
          detail: `Removed ${testHuntIds.size} timestamped TeamLeader test work sessions. No external action ran.`,
          severity: "success",
          createdAt: now,
        } satisfies ActivityLog,
        ...current.activityLogs,
      ].slice(0, 80),
    });
  }, [persistOptimistic]);

  const approveBusinessProposal = useCallback(
    async (proposalId: string) => {
      const current = dataRef.current;
      const proposal = current.businessProposals.find((item) => item.id === proposalId);
      if (!proposal) throw new Error("Business proposal not found.");
      const now = new Date().toISOString();
      const budgetBlockers = proposalBudgetBlockers(proposal);
      if (budgetBlockers.length > 0) {
        await persistOptimistic({
          ...current,
          businessProposals: current.businessProposals.map((item) =>
            item.id === proposalId
              ? {
                  ...item,
                  status: "revision_requested",
                  missingRequirements: [...new Set([...(item.missingRequirements ?? []), ...budgetBlockers])],
                  updatedAt: now,
                }
              : item,
          ),
          teamLeaderChatMessages: [
            ...current.teamLeaderChatMessages,
            {
              id: id("tl-chat-budget-block"),
              role: "teamleader",
              content: `I cannot approve "${proposal.title}" yet because the budget guard failed: ${budgetBlockers.join(" ")} No business was launched and no external action ran.`,
              createdAt: now,
              mode: "system",
              relatedBusinessProposalId: proposalId,
            } satisfies TeamLeaderChatMessage,
          ].slice(-120),
          activityLogs: [
            {
              id: id("log-budget-block"),
              category: "approval",
              title: "Business approval blocked by budget guard",
              detail: budgetBlockers.join(" "),
              severity: "danger",
              createdAt: now,
            } satisfies ActivityLog,
            ...current.activityLogs,
          ],
        });
        return "";
      }
      const businessIdeaId = id("business-idea");
      const questId = id("quest-approved-business");
      const businessId = id("approved-business");
      const runId = id("autonomous-improvement");
      const packId = id("production-pack");
      const assetId = id("production-asset");
      const idea: BusinessIdea = {
        id: businessIdeaId,
        title: proposal.recommendedIdea,
        summary: proposal.summary,
        model: proposal.businessModel,
        targetAudience: proposal.targetAudience,
        problemSolved: "Freelancers need practical repeatable AI workflows for client work without hype or unsupported guarantees.",
        monetizationMethod: "Validate free templates and newsletter intent first; paid templates or services remain a later approved experiment.",
        trafficPlan: "SEO content, newsletter signup, and manual community feedback after approval.",
        evidenceOfDemand: proposal.evidenceIds,
        assumptions: proposal.risks,
        riskLevel: "medium",
        status: "promoted",
        createdAt: now,
        updatedAt: now,
      };
      const quest: Quest = {
        id: questId,
        title: proposal.title.replace("Business Proposal: ", ""),
        businessIdeaId,
        businessIdea: proposal.recommendedIdea,
        type: "Validation quest",
        assignedAgentIds: proposal.evidenceIds.length ? opportunityAgentOrder : ["teamleader1a", "agent-researcher", "agent-seo"],
        stage: "Validation required",
        difficulty: "Adept",
        potentialReward: "Validated zero-budget business opportunity; revenue remains unproven.",
        riskLevel: "medium",
        requiredBudget: proposal.budgetPlan.requiredSpend,
        capitalAllocated: proposal.budgetPlan.recommendedSpend,
        expectedTimeline: "7 days",
        validationEvidence: proposal.evidenceIds,
        successMetrics: proposal.successMetrics,
        failureCriteria: proposal.failureMetrics,
        currentStatus: "Approved as a business; autonomous improvement can continue safe research and local production.",
        nextAction: proposal.nextActions[0] ?? "Continue safe autonomous validation.",
        approvalStatus: "approved",
        relatedObsidianNoteIds: [],
        experimentIds: [],
        decisionLogIds: [],
        openClawCommandIds: [],
        progress: 52,
        bossFight: "Validation Gatekeeper",
        loot: ["Business proposal", "SEO plan", "Production destination map"],
      };
      const pack: ProductionPack = {
        id: packId,
        questId,
        title: `${quest.title} production pack`,
        status: "draft",
        assetIds: [assetId],
        reviewChecklist: [
          "Confirm content belongs to the approved business.",
          "Confirm publishing destination is visible.",
          "Confirm claims do not imply guaranteed income.",
          "Create approval before external publishing or connector execution.",
        ],
        teamLeaderSummary: "Production is local draft work only. Publishing destinations are visible, but external release remains locked until approval.",
        createdAt: now,
        updatedAt: now,
      };
      const asset: ProductionAsset = {
        id: assetId,
        questId,
        packId,
        title: "Zero-budget validation landing page draft",
        type: "landing_page",
        status: "draft",
        sourceReportIds: [proposal.id],
        claims: ["Practical workflow templates", "No guaranteed income", "Validation-first offer"],
        policyChecks: ["Draft only", "Publishing locked until exact approval", "No misleading claims"],
        localPreview: proposal.contentPlan.join(" / "),
        exportFolder: "OpenClaw/Production",
        createdAt: now,
        updatedAt: now,
      };
      const operatingBundle = buildBusinessOperatingBundle(current, proposal, businessId, questId, now);
      const productStudio = buildProductStudioRecords(current, proposal, businessId, now, operatingBundle.localAssetFiles, operatingBundle.publishingPackage);
      const inheritedTaskIds = current.businessTasks.filter((task) => task.proposalId === proposalId && task.status !== "done").map((task) => task.id);
      const approvedBusiness: ApprovedBusiness = {
        id: businessId,
        proposalId,
        questId,
        name: quest.title,
        status: "active",
        stage: "Autonomous improvement",
        teamLeaderRecommendation: proposal.teamLeaderRecommendation,
        validationScore: proposal.validationScore,
        assignedAgentIds: opportunityAgentOrder,
        activeTaskIds: [...inheritedTaskIds, ...operatingBundle.businessTasks.map((task) => task.id)],
        productionAssetIds: [assetId],
        publishingDestinationIds: proposal.publishingDestinationIds,
        contentInventoryIds: proposal.contentInventoryIds,
        researchEvidenceIds: proposal.evidenceIds,
        budgetPlan: proposal.budgetPlan,
        externalPlatformRequirementIds: proposal.externalPlatformRequirementIds,
        platformExecutionPackageIds: proposal.platformExecutionPackageIds,
        readinessChecklist: proposal.readinessChecklist,
        risks: proposal.risks,
        nextAction: "Review the Business Cockpit receipts, then add metrics or run the next safe operating cycle.",
        createdAt: now,
        updatedAt: now,
      };
      const run: AutonomousImprovementRun = {
        id: runId,
        businessId,
        status: "running",
        currentFocus: "Safe research refresh, SEO refinement, and local content/production assets.",
        safeAutonomousActions: ["Read public sources safely", "Improve SEO/content plan", "Create local drafts", "Update validation score"],
        approvalLockedActions: ["Spend money", "Publish externally", "Send messages", "Execute connectors", "Submit forms", "Launch campaign"],
        taskIds: approvedBusiness.activeTaskIds,
        lastTeamLeaderSummary: "Business approved. Agents can keep improving it locally; external actions remain approval-gated.",
        startedAt: now,
        updatedAt: now,
      };
      const updatedDestinations = current.productionDestinations.map((destination) =>
        proposal.publishingDestinationIds.includes(destination.id) ? { ...destination, businessId, updatedAt: now } : destination,
      );
      const updatedContent = current.contentInventoryItems.map((item) =>
        proposal.contentInventoryIds.includes(item.id) ? { ...item, businessId, updatedAt: now } : item,
      );
      const updatedPlatformRequirements = current.externalPlatformRequirements.map((item) =>
        proposal.externalPlatformRequirementIds.includes(item.id) ? { ...item, businessId, updatedAt: now } : item,
      );
      const updatedPlatformPackages = current.platformExecutionPackages.map((item) =>
        proposal.platformExecutionPackageIds.includes(item.id) ? { ...item, businessId, updatedAt: now } : item,
      );
      const next: AppDataState = {
        ...current,
        businessIdeas: [idea, ...current.businessIdeas],
        quests: [quest, ...current.quests],
        productionPacks: [pack, ...current.productionPacks],
        productionAssets: [asset, ...current.productionAssets],
        approvedBusinesses: [approvedBusiness, ...current.approvedBusinesses],
        autonomousImprovementRuns: [run, ...current.autonomousImprovementRuns],
        approvedBusinessCockpits: [operatingBundle.cockpit, ...current.approvedBusinessCockpits],
        businessOperatingRuns: [operatingBundle.operatingRun, ...current.businessOperatingRuns],
        businessIterations: [...operatingBundle.iterations, ...current.businessIterations],
        executionReceipts: [...operatingBundle.receipts, ...current.executionReceipts],
        researchQueryPlans: [operatingBundle.queryPlan, ...current.researchQueryPlans],
        opportunityCandidates: [operatingBundle.opportunityCandidate, ...current.opportunityCandidates],
        evidenceQualityScores: [...operatingBundle.evidenceQualityScores, ...current.evidenceQualityScores],
        localAssetFiles: [...operatingBundle.localAssetFiles, ...current.localAssetFiles],
        publishingPackages: [operatingBundle.publishingPackage, ...current.publishingPackages],
        productBlueprints: [productStudio.blueprint, ...current.productBlueprints],
        productPreviews: [productStudio.preview, ...current.productPreviews],
        renderedProductPreviews: [productStudio.renderedPreview, ...current.renderedProductPreviews],
        productPreviewSections: [...productStudio.sections, ...current.productPreviewSections],
        productDraftApprovals: [productStudio.draftApproval, ...current.productDraftApprovals],
        approvalGateStates: [productStudio.gateState, ...current.approvalGateStates],
        businessMetricSnapshots: [operatingBundle.metricSnapshot, ...current.businessMetricSnapshots],
        budgetLedgerEntries: [operatingBundle.ledgerEntry, ...current.budgetLedgerEntries],
        autopilotJobs: [operatingBundle.autopilotJob, ...current.autopilotJobs],
        businessTasks: [...operatingBundle.businessTasks, ...current.businessTasks],
        agentArtifacts: [...operatingBundle.agentArtifacts, ...current.agentArtifacts],
        productionDestinations: updatedDestinations,
        contentInventoryItems: updatedContent,
        externalPlatformRequirements: updatedPlatformRequirements,
        platformExecutionPackages: updatedPlatformPackages,
        businessProposals: current.businessProposals.map((item) =>
          item.id === proposalId ? { ...item, status: "approved", questId, approvedBusinessId: businessId, updatedAt: now } : item,
        ),
        opportunityHunts: current.opportunityHunts.map((hunt) =>
          hunt.id === proposal.huntId ? { ...hunt, status: "approved_as_business", updatedAt: now } : hunt,
        ),
        teamLeaderChatMessages: [
          ...current.teamLeaderChatMessages,
          {
            id: id("tl-chat-business-approved"),
            role: "teamleader",
            content: `Approved. I promoted "${quest.title}" into an active business. Agents can keep improving it through safe research and local drafts within the ${money(proposal.budgetPlan.businessBudgetCap)} cap. Publishing, spending, messaging, connector execution, login, launch, and form submission are still approval-gated.`,
            createdAt: now,
            mode: "local",
            relatedApprovedBusinessId: businessId,
            relatedBusinessProposalId: proposalId,
          } satisfies TeamLeaderChatMessage,
        ].slice(-120),
        activityLogs: [
          {
            id: id("log-business-approved"),
            category: "quest",
            title: "Business proposal approved",
            detail: `${quest.title} is now an active business with an autonomous improvement run. No external action executed.`,
            severity: "success",
            createdAt: now,
            relatedQuestId: questId,
          } satisfies ActivityLog,
          ...current.activityLogs,
        ].slice(0, 80),
        dashboardSummary: {
          ...current.dashboardSummary,
          latestTeamLeaderRecommendation: `${quest.title} is active. Monitor it in Businesses, Tasks, and Guild Office. External execution remains approval-gated.`,
        },
      };
      await persistOptimistic(next);
      return businessId;
    },
    [persistOptimistic],
  );

  const runBusinessOperatingCycle = useCallback(
    async (businessId: string) => {
      const current = dataRef.current;
      const business = current.approvedBusinesses.find((item) => item.id === businessId);
      if (!business) throw new Error("Approved business not found.");
      const proposal = current.businessProposals.find((item) => item.id === business.proposalId);
      if (!proposal) throw new Error("Source proposal not found.");
      const now = new Date().toISOString();
      const questId = business.questId ?? proposal.questId ?? id("quest-business-cycle");
      const operatingBundle = buildBusinessOperatingBundle(current, proposal, businessId, questId, now);
      const existingCockpit = current.approvedBusinessCockpits.find((cockpit) => cockpit.businessId === businessId);
      const nextCockpits = existingCockpit
        ? current.approvedBusinessCockpits.map((cockpit) =>
            cockpit.id === existingCockpit.id
              ? {
                  ...cockpit,
                  currentStage: "Safe operating cycle refreshed",
                  operatingRunIds: [operatingBundle.operatingRun.id, ...cockpit.operatingRunIds],
                  iterationIds: [...operatingBundle.iterations.map((iteration) => iteration.id), ...cockpit.iterationIds],
                  agentArtifactIds: [...operatingBundle.agentArtifacts.map((artifact) => artifact.id), ...cockpit.agentArtifactIds],
                  executionReceiptIds: [...operatingBundle.receipts.map((receipt) => receipt.id), ...cockpit.executionReceiptIds],
                  metricSnapshotIds: [operatingBundle.metricSnapshot.id, ...cockpit.metricSnapshotIds],
                  budgetLedgerEntryIds: [operatingBundle.ledgerEntry.id, ...cockpit.budgetLedgerEntryIds],
                  localAssetFileIds: [...operatingBundle.localAssetFiles.map((file) => file.id), ...cockpit.localAssetFileIds],
                  publishingPackageIds: [operatingBundle.publishingPackage.id, ...cockpit.publishingPackageIds],
                  autopilotJobIds: [operatingBundle.autopilotJob.id, ...cockpit.autopilotJobIds],
                  nextBestActions: operatingBundle.cockpit.nextBestActions,
                  healthScore: Math.max(cockpit.healthScore, operatingBundle.cockpit.healthScore),
                  updatedAt: now,
                }
              : cockpit,
          )
        : [operatingBundle.cockpit, ...current.approvedBusinessCockpits];
      const next: AppDataState = {
        ...current,
        approvedBusinessCockpits: nextCockpits,
        businessOperatingRuns: [operatingBundle.operatingRun, ...current.businessOperatingRuns],
        businessIterations: [...operatingBundle.iterations, ...current.businessIterations],
        executionReceipts: [...operatingBundle.receipts, ...current.executionReceipts],
        researchQueryPlans: [operatingBundle.queryPlan, ...current.researchQueryPlans],
        opportunityCandidates: [operatingBundle.opportunityCandidate, ...current.opportunityCandidates],
        evidenceQualityScores: [...operatingBundle.evidenceQualityScores, ...current.evidenceQualityScores],
        localAssetFiles: [...operatingBundle.localAssetFiles, ...current.localAssetFiles],
        publishingPackages: [operatingBundle.publishingPackage, ...current.publishingPackages],
        businessMetricSnapshots: [operatingBundle.metricSnapshot, ...current.businessMetricSnapshots],
        budgetLedgerEntries: [operatingBundle.ledgerEntry, ...current.budgetLedgerEntries],
        autopilotJobs: [{ ...operatingBundle.autopilotJob, status: "completed", result: "Safe operating cycle completed locally. No external action executed.", updatedAt: now }, ...current.autopilotJobs],
        businessTasks: [...operatingBundle.businessTasks, ...current.businessTasks],
        agentArtifacts: [...operatingBundle.agentArtifacts, ...current.agentArtifacts],
        approvedBusinesses: current.approvedBusinesses.map((item) =>
          item.id === businessId
            ? {
                ...item,
                activeTaskIds: [...operatingBundle.businessTasks.map((task) => task.id), ...item.activeTaskIds],
                nextAction: "Review the latest operating-loop receipts and update manual metrics.",
                updatedAt: now,
              }
            : item,
        ),
        autonomousImprovementRuns: current.autonomousImprovementRuns.map((run) =>
          run.businessId === businessId
            ? {
                ...run,
                status: "running",
                currentFocus: "Safe operating cycle refreshed: evidence, local production, metrics reminder, and next actions.",
                taskIds: [...operatingBundle.businessTasks.map((task) => task.id), ...run.taskIds],
                lastTeamLeaderSummary: "I ran another safe local operating cycle. No spending, publishing, messaging, login, forms, or connector execution occurred.",
                updatedAt: now,
              }
            : run,
        ),
        teamLeaderChatMessages: [
          ...current.teamLeaderChatMessages,
          {
            id: id("tl-chat-operating-cycle"),
            role: "teamleader",
            content: `I ran a safe operating cycle for "${business.name}". The team refreshed evidence, local production, checks, receipts, and next actions. No external action ran.`,
            createdAt: now,
            mode: "local",
            relatedApprovedBusinessId: businessId,
            relatedBusinessProposalId: business.proposalId,
          } satisfies TeamLeaderChatMessage,
        ].slice(-120),
        activityLogs: [
          {
            id: id("log-operating-cycle"),
            category: "system",
            title: "Safe business operating cycle completed",
            detail: `${business.name}: local research/planning/production/metrics refresh completed. External actions remain approval-gated.`,
            severity: "success",
            createdAt: now,
            relatedQuestId: business.questId,
          } satisfies ActivityLog,
          ...current.activityLogs,
        ].slice(0, 80),
      };
      await persistOptimistic(next);
      return operatingBundle.operatingRun.id;
    },
    [persistOptimistic],
  );

  const addBusinessMetricSnapshot = useCallback(
    async (businessId: string, input: Partial<BusinessMetricSnapshot>) => {
      const current = dataRef.current;
      const business = current.approvedBusinesses.find((item) => item.id === businessId);
      if (!business) throw new Error("Approved business not found.");
      const now = new Date().toISOString();
      const snapshot: BusinessMetricSnapshot = {
        id: id("business-metric"),
        businessId,
        traffic: input.traffic ?? 0,
        clicks: input.clicks ?? 0,
        leads: input.leads ?? 0,
        conversions: input.conversions ?? 0,
        revenue: input.revenue ?? 0,
        cost: input.cost ?? 0,
        timeSpentHours: input.timeSpentHours ?? 0,
        confidence: input.confidence ?? business.validationScore,
        notes: input.notes ?? "Manual metric snapshot recorded by the user.",
        createdAt: now,
      };
      const revenueEntry: BudgetLedgerEntry | null = snapshot.revenue
        ? {
            id: id("budget-ledger"),
            businessId,
            type: "revenue",
            amount: snapshot.revenue,
            currency: "USD",
            description: "Manual revenue metric recorded. Verify source before using it for scale decisions.",
            createdAt: now,
          }
        : null;
      const costEntry: BudgetLedgerEntry | null = snapshot.cost
        ? {
            id: id("budget-ledger"),
            businessId,
            type: "actual_spend",
            amount: snapshot.cost,
            currency: "USD",
            description: "Manual cost metric recorded. Future spend still requires approval.",
            createdAt: now,
          }
        : null;
      const ledgerEntries = [revenueEntry, costEntry].filter(Boolean) as BudgetLedgerEntry[];
      await persistOptimistic({
        ...current,
        businessMetricSnapshots: [snapshot, ...current.businessMetricSnapshots],
        budgetLedgerEntries: [...ledgerEntries, ...current.budgetLedgerEntries],
        approvedBusinessCockpits: current.approvedBusinessCockpits.map((cockpit) =>
          cockpit.businessId === businessId
            ? {
                ...cockpit,
                metricSnapshotIds: [snapshot.id, ...cockpit.metricSnapshotIds],
                budgetLedgerEntryIds: [...ledgerEntries.map((entry) => entry.id), ...cockpit.budgetLedgerEntryIds],
                nextBestActions:
                  snapshot.revenue > 0 || snapshot.conversions > 0
                    ? ["Review evidence quality before scale.", "Prepare a separate approval for any publishing, spend, or connector action."]
                    : ["Revise the offer or run another no-spend validation test.", "Collect more traffic and lead data before scaling."],
                updatedAt: now,
              }
            : cockpit,
        ),
        activityLogs: [
          {
            id: id("log-business-metrics"),
            category: "system",
            title: "Business metric snapshot recorded",
            detail: `${business.name}: traffic ${snapshot.traffic}, leads ${snapshot.leads}, revenue ${money(snapshot.revenue)}, cost ${money(snapshot.cost)}.`,
            severity: "info",
            createdAt: now,
            relatedQuestId: business.questId,
          } satisfies ActivityLog,
          ...current.activityLogs,
        ].slice(0, 80),
      });
      return snapshot.id;
    },
    [persistOptimistic],
  );

  const approveProductLocalDraft = useCallback(
    async (previewId: string) => {
      const current = dataRef.current;
      const preview = current.productPreviews.find((item) => item.id === previewId);
      if (!preview) throw new Error("Product preview not found.");
      const business = current.approvedBusinesses.find((item) => item.id === preview.businessId);
      const blueprint = current.productBlueprints.find((item) => item.id === preview.blueprintId);
      const now = new Date().toISOString();
      const payloadPreview = buildPublishPayloadPreview(current, preview, now);
      const receipt: ExecutionReceipt = {
        id: id("execution-receipt"),
        businessId: preview.businessId,
        proposalId: preview.proposalId,
        actionType: "product_local_draft_approved",
        title: "Local product draft approved",
        summary: `${blueprint?.name ?? business?.name ?? "Product draft"} was accepted as a local draft only. This unlocked the ability to request a publish approval, but did not publish anything.`,
        source: "Product Studio",
        artifactIds: [preview.id, payloadPreview.id],
        budgetEffect: payloadPreview.budgetBoundary,
        externalAction: false,
        approvalRequired: false,
        status: "success",
        nextAction: "Prepare a publish approval only if the exact product preview looks right.",
        createdAt: now,
      };
      await persistOptimistic({
        ...current,
        productPreviews: current.productPreviews.map((item) =>
          item.id === previewId
            ? {
                ...item,
                status: "local_draft_approved",
                localDraftApproved: true,
                publishPayloadPreviewId: payloadPreview.id,
                missingItems: item.missingItems.filter((missing) => !missing.toLowerCase().includes("local product")),
                updatedAt: now,
              }
            : item,
        ),
        productDraftApprovals: current.productDraftApprovals.map((item) =>
          item.previewId === previewId
            ? {
                ...item,
                status: "approved_local",
                note: "User approved this local draft for the next step only. Nothing was published.",
                approvedAt: now,
                updatedAt: now,
              }
            : item,
        ),
        productBlueprints: current.productBlueprints.map((item) =>
          item.id === preview.blueprintId
            ? { ...item, stage: "ready_for_publish_request", nextProductionStep: "Prepare an exact publish approval if you want to continue.", updatedAt: now }
            : item,
        ),
        publishPayloadPreviews: [payloadPreview, ...current.publishPayloadPreviews.filter((item) => item.previewId !== previewId || item.status !== "frozen")],
        executionReceipts: [receipt, ...current.executionReceipts],
        approvalGateStates: current.approvalGateStates.map((item) =>
          item.id === preview.approvalGateStateId
            ? {
                ...item,
                publishPayloadPreviewId: payloadPreview.id,
                status: "ready_to_request_approval",
                label: "Ready To Request Approval",
                reason: "Local draft is approved. You can now create a pending publish approval from the frozen payload.",
                actionLabel: "Prepare Publish Approval",
                updatedAt: now,
              }
            : item,
        ),
        activityLogs: [
          {
            id: id("log-product-draft-approved"),
            category: "system",
            title: "Local product draft approved",
            detail: `${business?.name ?? "Product draft"} was approved locally. No external publishing, spending, login, messaging, form submission, or connector action ran.`,
            severity: "success",
            createdAt: now,
            relatedQuestId: business?.questId,
          } satisfies ActivityLog,
          ...current.activityLogs,
        ].slice(0, 80),
      });
    },
    [persistOptimistic],
  );

  const requestProductRevision = useCallback(
    async (previewId: string, reason = "Please revise the product draft before any publishing approval is requested.") => {
      const current = dataRef.current;
      const preview = current.productPreviews.find((item) => item.id === previewId);
      if (!preview) throw new Error("Product preview not found.");
      const business = current.approvedBusinesses.find((item) => item.id === preview.businessId);
      const now = new Date().toISOString();
      const revisionId = id("product-revision");
      const taskIds = [id("business-task"), id("business-task")];
      const revisionTasks: BusinessTask[] = [
        {
          id: taskIds[0],
          businessId: preview.businessId,
          proposalId: preview.proposalId,
          agentId: "agent-production",
          title: "Revise product package",
          objective: reason,
          status: "queued",
          progress: 0,
          currentArtifact: "Product draft revision",
          expectedOutput: "Updated local product draft and platform field notes.",
          approvalRequired: false,
          logs: ["Revision is safe internal work only. No external publishing, login, form submission, spending, or connector action."],
          updatedAt: now,
        },
        {
          id: taskIds[1],
          businessId: preview.businessId,
          proposalId: preview.proposalId,
          agentId: "agent-writer",
          title: "Revise product copy",
          objective: reason,
          status: "queued",
          progress: 0,
          currentArtifact: "Copy and claims revision",
          expectedOutput: "Sharper copy with unsupported claims removed.",
          approvalRequired: false,
          logs: ["Writer revision stays local and must preserve the no-guaranteed-income safety rule."],
          updatedAt: now,
        },
      ];
      const revision: ProductRevisionRequest = {
        id: revisionId,
        previewId,
        businessId: preview.businessId,
        requestedBy: "user",
        reason,
        taskIds,
        status: "open",
        createdAt: now,
        updatedAt: now,
      };
      const receipt: ExecutionReceipt = {
        id: id("execution-receipt"),
        businessId: preview.businessId,
        proposalId: preview.proposalId,
        actionType: "product_revision_requested",
        title: "Product revision requested",
        summary: reason,
        source: "Product Studio",
        artifactIds: [revisionId, ...taskIds],
        budgetEffect: "No spend. Revision creates safe local tasks only.",
        externalAction: false,
        approvalRequired: false,
        status: "pending",
        nextAction: "Watch Tasks for AgentProduction and AgentWriter revision work.",
        createdAt: now,
      };
      await persistOptimistic({
        ...current,
        productRevisionRequests: [revision, ...current.productRevisionRequests],
        businessTasks: [...revisionTasks, ...current.businessTasks],
        executionReceipts: [receipt, ...current.executionReceipts],
        productPreviews: current.productPreviews.map((item) =>
          item.id === previewId ? { ...item, status: "revision_requested", localDraftApproved: false, updatedAt: now } : item,
        ),
        productDraftApprovals: current.productDraftApprovals.map((item) =>
          item.previewId === previewId ? { ...item, status: "revision_requested", revisionRequestId: revisionId, note: reason, updatedAt: now } : item,
        ),
        productPreviewSections: current.productPreviewSections.map((section) =>
          section.previewId === previewId && section.kind === "revision_requests"
            ? {
                ...section,
                content: [section.content, "", `## ${new Date(now).toLocaleString()}`, reason].join("\n"),
                status: "needs_review",
                updatedAt: now,
              }
            : section,
        ),
        approvalGateStates: current.approvalGateStates.map((item) =>
          item.id === preview.approvalGateStateId
            ? {
                ...item,
                status: "needs_product_review",
                label: "Needs Product Review",
                reason: "A revision was requested. Review the updated draft before creating any publish approval.",
                actionLabel: "Review Product",
                updatedAt: now,
              }
            : item,
        ),
        activityLogs: [
          {
            id: id("log-product-revision"),
            category: "agent",
            title: "Product revision requested",
            detail: `${business?.name ?? "Product draft"} revision queued for AgentProduction and AgentWriter. No external action ran.`,
            severity: "info",
            createdAt: now,
            relatedQuestId: business?.questId,
          } satisfies ActivityLog,
          ...current.activityLogs,
        ].slice(0, 80),
      });
      return revisionId;
    },
    [persistOptimistic],
  );

  const prepareProductPublishApproval = useCallback(
    async (previewId: string) => {
      const current = dataRef.current;
      const preview = current.productPreviews.find((item) => item.id === previewId);
      if (!preview) throw new Error("Product preview not found.");
      const business = current.approvedBusinesses.find((item) => item.id === preview.businessId);
      const blueprint = current.productBlueprints.find((item) => item.id === preview.blueprintId);
      const existingGate = current.approvalGateStates.find((item) => item.id === preview.approvalGateStateId);
      const existingPending = existingGate?.approvalId ? current.approvalRequests.find((item) => item.id === existingGate.approvalId && item.status === "pending") : undefined;
      if (existingPending) return existingPending.id;
      const now = new Date().toISOString();
      const renderedPreviewExists = current.renderedProductPreviews.some((item) => item.previewId === preview.id && item.status === "ready");
      const blockedReason = !preview.localDraftApproved
        ? "The local draft must be approved in Product Studio before a publish approval can be requested."
        : !renderedPreviewExists
          ? "A rendered product preview must exist before a publish approval can be requested."
          : preview.claimsSafetyStatus === "blocked"
            ? "Claims & Safety Check is blocked. Request a revision before publishing."
            : preview.missingItems.length
              ? `Missing product items: ${preview.missingItems.join(", ")}`
              : "";
      if (blockedReason) {
        await persistOptimistic({
          ...current,
          approvalGateStates: current.approvalGateStates.map((item) =>
            item.id === preview.approvalGateStateId
              ? {
                  ...item,
                  status: preview.localDraftApproved ? "locked" : "needs_product_review",
                  label: preview.localDraftApproved ? "Locked" : "Needs Product Review",
                  reason: blockedReason,
                  actionLabel: "Open Product Studio",
                  updatedAt: now,
                }
              : item,
          ),
          activityLogs: [
            {
              id: id("log-publish-gate-locked"),
              category: "approval",
              title: "Publish approval not requested",
              detail: blockedReason,
              severity: "warning",
              createdAt: now,
              relatedQuestId: business?.questId,
            } satisfies ActivityLog,
            ...current.activityLogs,
          ].slice(0, 80),
        });
        return "";
      }
      const payloadPreview = preview.publishPayloadPreviewId
        ? current.publishPayloadPreviews.find((item) => item.id === preview.publishPayloadPreviewId) ?? buildPublishPayloadPreview(current, preview, now)
        : buildPublishPayloadPreview(current, preview, now);
      const approvalId = id("approval-product-publish");
      const approval: ApprovalRequest = {
        id: approvalId,
        type: "Publish externally",
        title: `${payloadPreview.platform} publish approval: ${blueprint?.name ?? business?.name ?? "Product draft"}`,
        questId: business?.questId,
        requestedBy: "TeamLeader1A",
        riskLevel: "high",
        reason: "This approval is for the exact frozen Product Studio payload only. It records the publish request; connector execution remains separate unless a later executor is explicitly approved.",
        safetyChecklist: [
          "Product preview exists and the local draft was approved.",
          "Exact fields/content are frozen in the publish payload preview.",
          "User login, if needed, is manual and credentials are not stored.",
          "No spend, paid promotion, messaging, purchases, or broad account control is included.",
          "No guaranteed income, fake reviews, spam, or misleading claims.",
          "Publishing connector/browser execution remains locked until a later exact executor is approved.",
        ],
        blockedBehaviors: ["Credential storage", "Unapproved login automation", "Form submission beyond exact approved fields", "Paid promotion", "Buyer messaging", "Purchases", "Guaranteed income claims"],
        status: "pending",
        createdAt: now,
        productPreviewId: preview.id,
        publishPayloadPreviewId: payloadPreview.id,
        approvalGateStateId: preview.approvalGateStateId,
      };
      const receipt: ExecutionReceipt = {
        id: id("execution-receipt"),
        businessId: preview.businessId,
        proposalId: preview.proposalId,
        actionType: "publish_approval_requested",
        title: "Publish approval requested",
        summary: `${payloadPreview.platform} has a frozen publish payload waiting in Approvals. No connector, login, form submission, or publishing action has executed.`,
        source: "Product Studio approval gate",
        artifactIds: [preview.id, payloadPreview.id, approvalId],
        budgetEffect: payloadPreview.budgetBoundary,
        externalAction: false,
        approvalRequired: true,
        status: "pending",
        nextAction: "Open Approvals and inspect the exact publish payload.",
        createdAt: now,
      };
      await persistOptimistic({
        ...current,
        approvalRequests: [approval, ...current.approvalRequests],
        publishPayloadPreviews: current.publishPayloadPreviews.some((item) => item.id === payloadPreview.id)
          ? current.publishPayloadPreviews
          : [payloadPreview, ...current.publishPayloadPreviews],
        productPreviews: current.productPreviews.map((item) =>
          item.id === preview.id ? { ...item, publishPayloadPreviewId: payloadPreview.id, updatedAt: now } : item,
        ),
        approvalGateStates: current.approvalGateStates.map((item) =>
          item.id === preview.approvalGateStateId
            ? {
                ...item,
                approvalId,
                publishPayloadPreviewId: payloadPreview.id,
                status: "pending_approval",
                label: "Pending Approval",
                reason: "A real pending approval exists in the Approvals tab.",
                actionLabel: "Open Pending Approval",
                linkedPath: "/#/approvals",
                updatedAt: now,
              }
            : item,
        ),
        platformExecutionPackages: current.platformExecutionPackages.map((item) =>
          item.id === preview.platformPackageId ? { ...item, status: "approval_requested", approvalId, updatedAt: now } : item,
        ),
        publishingPackages: current.publishingPackages.map((item) =>
          item.id === preview.publishingPackageId ? { ...item, status: "approval_requested", updatedAt: now } : item,
        ),
        executionReceipts: [receipt, ...current.executionReceipts],
        activityLogs: [
          {
            id: id("log-product-publish-approval"),
            category: "approval",
            title: "Product publish pending approval",
            detail: `${payloadPreview.platform} publish payload is now visible in Approvals. No external action executed.`,
            severity: "warning",
            createdAt: now,
            relatedQuestId: business?.questId,
          } satisfies ActivityLog,
          ...current.activityLogs,
        ],
      });
      return approvalId;
    },
    [persistOptimistic],
  );

  const preparePlatformPublishApproval = useCallback(
    async (packageId: string) => {
      const current = dataRef.current;
      const preview = current.productPreviews.find((item) => item.platformPackageId === packageId);
      if (preview) return prepareProductPublishApproval(preview.id);
      const executionPackage = current.platformExecutionPackages.find((item) => item.id === packageId);
      if (!executionPackage) throw new Error("Platform execution package not found.");
      const now = new Date().toISOString();
      await persistOptimistic({
        ...current,
        activityLogs: [
          {
            id: id("log-platform-approval-locked"),
            category: "approval",
            title: "Publish approval locked until Product Studio review",
            detail: `${executionPackage.title} needs a Product Studio preview and local draft approval before a pending approval can be created.`,
            severity: "warning",
            createdAt: now,
          } satisfies ActivityLog,
          ...current.activityLogs,
        ].slice(0, 80),
      });
      return "";
    },
    [persistOptimistic, prepareProductPublishApproval],
  );

  const createMissionDraftFromMessage = useCallback(
    async (input: { message: string; questId: string }) => {
      const current = dataRef.current;
      const draft = buildMissionDraft(current, input.message, input.questId);
      const now = new Date().toISOString();
      const next: AppDataState = {
        ...current,
        missionDrafts: [draft, ...current.missionDrafts],
        teamLeaderChatMessages: [
          ...current.teamLeaderChatMessages,
          {
            id: id("tl-chat-user"),
            role: "user",
            content: input.message.trim(),
            createdAt: now,
            mode: "local",
            relatedMissionDraftId: draft.id,
          } satisfies TeamLeaderChatMessage,
          {
            id: id("tl-chat-mission-draft"),
            role: "teamleader",
            content: `I drafted a multi-agent mission for "${draft.title}". Review the Mission Brief, then start it only if the listed local agent turns look safe. Browser research, scraping, publishing, messages, spending, launch, and external automation are still separate approvals.`,
            createdAt: new Date().toISOString(),
            mode: "system",
            relatedMissionDraftId: draft.id,
          } satisfies TeamLeaderChatMessage,
        ].slice(-120),
        activityLogs: [
          {
            id: id("log-mission-draft"),
            category: "agent",
            title: "TeamLeader1A mission draft created",
            detail: `${draft.plannedSteps.length} local agent turns were planned for ${draft.title}. Nothing has executed yet.`,
            severity: "info",
            createdAt: new Date().toISOString(),
            relatedQuestId: draft.questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return draft.id;
    },
    [persistOptimistic],
  );

  const createMissionStartApproval = useCallback(
    async (draftId: string, requestedStepIds?: string[]) => {
      const current = dataRef.current;
      const draft = current.missionDrafts.find((item) => item.id === draftId);
      if (!draft) throw new Error("Mission draft not found.");

      const now = new Date().toISOString();
      let run = draft.runId ? current.missionRuns.find((item) => item.id === draft.runId) : undefined;
      let steps = run ? current.missionAgentSteps.filter((step) => step.missionRunId === run?.id) : [];

      if (!run) {
        const runId = id("mission-run");
        steps = draft.plannedSteps.map((step, index) => missionStepFromDraftStep(current, draft, step, index, runId));
        run = {
          id: runId,
          draftId: draft.id,
          questId: draft.questId,
          title: draft.title,
          objective: draft.objective,
          status: "awaiting_approval",
          stepIds: steps.map((step) => step.id),
          briefSectionIds: [],
          artifactIds: [],
          createdAt: now,
          updatedAt: now,
        };
        await persistOptimistic({
          ...current,
          missionRuns: [run, ...current.missionRuns],
          missionAgentSteps: [...steps, ...current.missionAgentSteps],
          missionDrafts: current.missionDrafts.map((item) =>
            item.id === draft.id ? { ...item, status: "approval_requested", runId, updatedAt: now } : item,
          ),
        });
      }

      const latest = dataRef.current;
      const latestRun = latest.missionRuns.find((item) => item.id === run?.id);
      if (!latestRun) throw new Error("Mission run could not be created.");
      const latestSteps = latest.missionAgentSteps
        .filter((step) => step.missionRunId === latestRun.id)
        .sort((a, b) => a.order - b.order);
      const selectedStepIds = requestedStepIds?.length
        ? requestedStepIds
        : latestSteps.filter((step) => !["complete", "skipped", "local_draft"].includes(step.status)).map((step) => step.id);
      const selectedSteps = latestSteps.filter((step) => selectedStepIds.includes(step.id));
      if (selectedSteps.length === 0) throw new Error("No mission agent steps are waiting for approval.");

      const approvalResult = await createOpenClawApproval(
        {
          actionKind: "mission_start",
          missionDraftId: draft.id,
          missionRunId: latestRun.id,
          missionStepIds: selectedSteps.map((step) => step.id),
          title: latestRun.title,
          stepCount: selectedSteps.length,
          agentProfileIds: selectedSteps.map((step) => step.agentProfileId),
          expectedResult: "Mission Control runs the approved local OpenClaw agent turns and builds a unified Mission Brief.",
        },
        { questId: latestRun.questId, missionDraftId: draft.id, missionRunId: latestRun.id },
      );

      const afterApproval = dataRef.current;
      const batch: MissionApprovalBatch = {
        id: id("mission-batch"),
        draftId: draft.id,
        missionRunId: latestRun.id,
        approvalId: approvalResult.approvalId,
        status: approvalResult.blocked ? "rejected" : "pending",
        stepIds: selectedSteps.map((step) => step.id),
        summary: `${selectedSteps.length} approved-local agent turns requested for ${latestRun.title}.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await persistOptimistic({
        ...afterApproval,
        missionApprovalBatches: [batch, ...afterApproval.missionApprovalBatches],
        missionRuns: afterApproval.missionRuns.map((item) =>
          item.id === latestRun.id
            ? { ...item, status: "awaiting_approval", approvalId: approvalResult.approvalId, updatedAt: new Date().toISOString() }
            : item,
        ),
        missionDrafts: afterApproval.missionDrafts.map((item) =>
          item.id === draft.id
            ? { ...item, status: "approval_requested", approvalId: approvalResult.approvalId, runId: latestRun.id, updatedAt: new Date().toISOString() }
            : item,
        ),
        teamLeaderChatMessages: [
          ...afterApproval.teamLeaderChatMessages,
          {
            id: id("tl-chat-mission-approval"),
            role: "teamleader",
            content: approvalResult.blocked
              ? `I blocked the mission start request: ${approvalResult.safetyEvaluation.blockedReasons.join(" ")}`
              : `Mission start approval is ready. It covers only ${selectedSteps.length} listed local OpenClaw agent turns. Review it in Approvals before anything runs.`,
            createdAt: new Date().toISOString(),
            mode: approvalResult.blocked ? "system" : "approval_requested",
            relatedApprovalId: approvalResult.approvalId,
            relatedCommandId: approvalResult.commandId,
            relatedMissionDraftId: draft.id,
            relatedMissionRunId: latestRun.id,
          } satisfies TeamLeaderChatMessage,
        ].slice(-120),
      });
      return approvalResult.approvalId;
    },
    [createOpenClawApproval, persistOptimistic],
  );

  const requestMissionStart = useCallback(
    async (draftId: string) => createMissionStartApproval(draftId),
    [createMissionStartApproval],
  );

  const retryMissionStep = useCallback(
    async (stepId: string) => {
      const current = dataRef.current;
      const step = current.missionAgentSteps.find((item) => item.id === stepId);
      if (!step) return;
      const remaining = current.missionAgentSteps
        .filter((item) => item.missionRunId === step.missionRunId && item.order >= step.order && !["complete", "skipped", "local_draft"].includes(item.status))
        .sort((a, b) => a.order - b.order)
        .map((item) => item.id);
      await createMissionStartApproval(step.draftId, remaining);
    },
    [createMissionStartApproval],
  );

  const skipMissionStep = useCallback(
    async (stepId: string) => {
      const current = dataRef.current;
      const step = current.missionAgentSteps.find((item) => item.id === stepId);
      if (!step) return;
      const now = new Date().toISOString();
      await persistOptimistic({
        ...current,
        missionAgentSteps: current.missionAgentSteps.map((item) =>
          item.id === stepId
            ? { ...item, status: "skipped", error: "Skipped by user; no OpenClaw command executed.", completedAt: now, updatedAt: now }
            : item,
        ),
        missionRuns: current.missionRuns.map((run) =>
          run.id === step.missionRunId
            ? { ...run, status: "paused", pausedReason: "A failed step was skipped. Resume remaining local turns with a new approval.", updatedAt: now }
            : run,
        ),
        activityLogs: [
          {
            id: id("log-mission-step-skip"),
            category: "agent",
            title: "Mission step skipped locally",
            detail: `${step.agentName}: ${step.title}. No command was executed.`,
            severity: "warning",
            createdAt: now,
            relatedQuestId: step.questId,
            relatedMissionRunId: step.missionRunId,
          },
          ...current.activityLogs,
        ],
      });
    },
    [persistOptimistic],
  );

  const convertMissionStepToLocalDraft = useCallback(
    async (stepId: string) => {
      const current = dataRef.current;
      const step = current.missionAgentSteps.find((item) => item.id === stepId);
      if (!step) return;
      const now = new Date().toISOString();
      const sectionId = id("mission-section-local");
      const artifactId = id("artifact-mission-local");
      const summary = `${step.agentName} was converted to a local fallback draft. No OpenClaw command executed.`;
      const content = [
        `## ${step.title}`,
        `Agent: ${step.agentName}`,
        "",
        `## Local Fallback Draft`,
        "This fallback keeps the mission reviewable after a failed agent turn. It should be treated as a placeholder until a real approved agent turn succeeds or TeamLeader1A accepts the limitation.",
        "",
        `## Expected Artifact`,
        step.expectedArtifact,
        "",
        `## Safety Boundary`,
        "No external action was executed.",
      ].join("\n");
      const section: MissionBriefSection = {
        id: sectionId,
        missionRunId: step.missionRunId,
        questId: step.questId,
        kind: step.briefKind,
        title: `${step.title} fallback`,
        summary,
        content,
        status: "ready",
        agentId: step.agentId,
        sourceStepId: step.id,
        createdAt: now,
        updatedAt: now,
      };
      const artifact: MissionArtifact = {
        id: artifactId,
        questId: step.questId,
        taskId: step.id,
        type: step.briefKind === "seo" ? "keyword_map" : step.briefKind === "research" ? "research_report" : step.briefKind === "experiment" ? "experiment_plan" : "content_brief",
        title: `${step.agentName}: local fallback for ${step.title}`,
        summary,
        content,
        status: "ready_for_review",
        storage: "sqlite",
        sourceIds: [step.missionRunId, step.id],
        createdByAgentId: "teamleader1a",
        createdAt: now,
        updatedAt: now,
      };
      await persistOptimistic({
        ...current,
        missionBriefSections: [section, ...current.missionBriefSections],
        missionArtifacts: [artifact, ...current.missionArtifacts],
        missionAgentSteps: current.missionAgentSteps.map((item) =>
          item.id === stepId
            ? { ...item, status: "local_draft", briefSectionId: sectionId, artifactId, completedAt: now, updatedAt: now }
            : item,
        ),
        missionRuns: current.missionRuns.map((run) =>
          run.id === step.missionRunId
            ? {
                ...run,
                status: "paused",
                briefSectionIds: [sectionId, ...run.briefSectionIds],
                artifactIds: [artifactId, ...run.artifactIds],
                pausedReason: "A failed step was converted to a local draft. Resume remaining local turns with a new approval.",
                updatedAt: now,
              }
            : run,
        ),
      });
    },
    [persistOptimistic],
  );

  const sendTeamLeaderChatMessage = useCallback(
    async (message: string, options: { requestLiveTurn?: boolean; createMissionDraft?: boolean; questId?: string; opportunityHuntDepth?: OpportunityHuntDepth } = {}) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      const now = new Date().toISOString();
      if (options.createMissionDraft) {
        await createMissionDraftFromMessage({ message: trimmed, questId: options.questId ?? dataRef.current.quests[0]?.id ?? "" });
        return;
      }

      if (options.requestLiveTurn) {
        const result = await createOpenClawApproval({
          actionKind: "agent_turn",
          agentProfileId: "main",
          agentRole: "TeamLeader1A",
          message: trimmed,
          expectedResult: "TeamLeader1A returns a local planning or research summary.",
        });
        const current = dataRef.current;
        const userChat: TeamLeaderChatMessage = {
          id: id("tl-chat-user"),
          role: "user",
          content: trimmed,
          createdAt: now,
          mode: "approval_requested",
          relatedApprovalId: result.approvalId,
          relatedCommandId: result.commandId,
        };
        const teamLeaderChat: TeamLeaderChatMessage = {
          id: id("tl-chat-teamleader-approval"),
          role: "teamleader",
          content: result.blocked
            ? `I blocked that live turn request before execution: ${result.safetyEvaluation.blockedReasons.join(" ")}`
            : "I created a live TeamLeader1A approval request. Nothing has executed yet. Review it in Approvals, then approve only if the prompt is safe.",
          createdAt: new Date().toISOString(),
          mode: result.blocked ? "system" : "approval_requested",
          relatedApprovalId: result.approvalId,
          relatedCommandId: result.commandId,
        };
        await persistOptimistic({
          ...current,
          teamLeaderChatMessages: [...current.teamLeaderChatMessages, userChat, teamLeaderChat].slice(-120),
        });
        return;
      }

      if (shouldStartOpportunityHunt(trimmed)) {
        await createOpportunityHuntFromMessage(trimmed, options.opportunityHuntDepth);
        return;
      }

      const current = dataRef.current;
      const userChat: TeamLeaderChatMessage = {
        id: id("tl-chat-user"),
        role: "user",
        content: trimmed,
        createdAt: now,
        mode: "local",
      };
      const teamLeaderChat: TeamLeaderChatMessage = {
        id: id("tl-chat-teamleader"),
        role: "teamleader",
        content: buildTeamLeaderLocalReply(current, trimmed),
        createdAt: new Date().toISOString(),
        mode: "local",
      };
      const receipt: ExecutionReceipt = {
        id: id("execution-receipt"),
        actionType: "teamleader_local_reply",
        title: "TeamLeader1A local reply receipt",
        summary: `TeamLeader1A answered "${trimmed.slice(0, 120)}${trimmed.length > 120 ? "..." : ""}" from local Mission Control context only.`,
        source: "TeamLeader Command",
        artifactIds: [userChat.id, teamLeaderChat.id],
        budgetEffect: "No spend.",
        externalAction: false,
        approvalRequired: false,
        status: "success",
        nextAction: "Send a work command if you want the agent team to create tasks, evidence, and a proposal.",
        createdAt: now,
      };
      await persistOptimistic({
        ...current,
        teamLeaderChatMessages: [...current.teamLeaderChatMessages, userChat, teamLeaderChat].slice(-120),
        executionReceipts: [receipt, ...current.executionReceipts],
        activityLogs: [
          {
            id: id("log-teamleader-chat"),
            category: "agent",
            title: "TeamLeader1A local chat reply",
            detail: "A local TeamLeader1A reply was generated without running external commands or risky actions.",
            severity: "info",
            createdAt: new Date().toISOString(),
          },
          ...current.activityLogs,
        ],
      });
    },
    [createMissionDraftFromMessage, createOpenClawApproval, createOpportunityHuntFromMessage, persistOptimistic],
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
      }, { questId: input.questId });
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
            title: result.blocked ? "Real pilot URL research blocked" : "Real pilot URL research pending approval",
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
            title: result.blocked ? "TeamLeader1A pilot review blocked" : "TeamLeader1A pilot review pending approval",
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

  const createSeoResearchPack = useCallback(
    async (questId: string) => {
      const current = dataRef.current;
      const { report, sourceCapture, cluster, proof, task, artifact } = seoResearchPackFromQuest(current, questId);
      const now = new Date().toISOString();
      const reportExists = current.marketIntelligenceReports.some((item) => item.id === report.id);
      const next: AppDataState = {
        ...current,
        marketIntelligenceReports: reportExists ? current.marketIntelligenceReports : [report, ...current.marketIntelligenceReports],
        researchSourceCaptures: [sourceCapture, ...current.researchSourceCaptures],
        seoKeywordClusters: [cluster, ...current.seoKeywordClusters],
        demandProofReports: [proof, ...current.demandProofReports],
        missionTasks: [task, ...current.missionTasks],
        missionArtifacts: [artifact, ...current.missionArtifacts],
        quests: current.quests.map((quest) =>
          quest.id === questId
            ? {
                ...quest,
                stage: quest.stage === "Idea discovered" ? "Researching" : quest.stage,
                progress: Math.max(quest.progress, proof.evidenceScore >= 70 ? 64 : 52),
                currentStatus: proof.status === "ready_for_validation" ? "SEO demand proof ready for validation review" : "SEO demand proof needs more approved sources",
                nextAction: proof.recommendedNextStep,
              }
            : quest,
        ),
        agentMessages: [
          {
            id: id("msg-seo-proof"),
            fromAgentId: "teamleader1a",
            toAgentId: "TeamLeader1A" as const,
            questId,
            summary: "SEO demand proof pack prepared.",
            details: proof.teamLeaderRecommendation,
            createdAt: now,
            visibility: "user_summary" as const,
          },
          ...current.agentMessages,
        ].slice(0, 32),
        activityLogs: [
          {
            id: id("log-seo-proof"),
            category: "quest",
            title: "SEO demand proof pack generated",
            detail: `${proof.title} linked ${cluster.keywords.length} keywords, ${proof.competitorGaps.length} competitor gaps, and ${proof.evidenceScore}/100 evidence. No live scraping or publishing occurred.`,
            severity: proof.status === "ready_for_validation" ? "success" : "warning",
            createdAt: now,
            relatedQuestId: questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return proof.id;
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

  const createSiteProject = useCallback(
    async (questId: string) => {
      const current = dataRef.current;
      const existing = current.siteProjects.find((site) => site.primaryQuestId === questId || site.questIds.includes(questId));
      if (existing) return existing.id;
      const site = siteProjectForQuest(current, questId);
      const now = new Date().toISOString();
      const next: AppDataState = {
        ...current,
        siteProjects: [site, ...current.siteProjects],
        activityLogs: [
          {
            id: id("log-site-project"),
            category: "quest",
            title: "Static site project created",
            detail: `${site.name} is configured for local Markdown output at ${site.repoPath}. Publishing, git push, and deployment remain locked.`,
            severity: "success",
            createdAt: now,
            relatedQuestId: questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return site.id;
    },
    [persistOptimistic],
  );

  const createContentItemFromCluster = useCallback(
    async (clusterId: string) => {
      const current = dataRef.current;
      const cluster = current.seoKeywordClusters.find((item) => item.id === clusterId);
      if (!cluster) throw new Error("Keyword cluster not found.");
      const existingSite = current.siteProjects.find((site) => site.questIds.includes(cluster.questId));
      const site = existingSite ?? siteProjectForQuest(current, cluster.questId);
      const contentItem = contentItemForCluster({ ...current, siteProjects: existingSite ? current.siteProjects : [site, ...current.siteProjects] }, clusterId);
      const now = new Date().toISOString();
      const artifact: MissionArtifact = {
        id: id("artifact-content-item"),
        questId: contentItem.questId,
        type: "draft_page",
        title: contentItem.title,
        summary: `Local static-site draft for ${contentItem.targetKeywords.slice(0, 2).join(", ")}.`,
        content: contentItem.draftMarkdown,
        status: "draft",
        storage: "sqlite",
        sourceIds: [cluster.id],
        createdByAgentId: "agent-writer",
        createdAt: now,
        updatedAt: now,
      };
      const itemWithArtifact: ContentItem = {
        ...contentItem,
        artifactIds: [artifact.id],
      };
      const next: AppDataState = {
        ...current,
        siteProjects: existingSite ? current.siteProjects : [site, ...current.siteProjects],
        contentItems: [itemWithArtifact, ...current.contentItems],
        missionArtifacts: [artifact, ...current.missionArtifacts],
        quests: current.quests.map((quest) =>
          quest.id === contentItem.questId
            ? {
                ...quest,
                stage: "Production",
                progress: Math.max(quest.progress, 72),
                currentStatus: "Static-site content draft prepared locally",
                nextAction: "Review claims, disclosure, and static-site diff before requesting publish approval.",
              }
            : quest,
        ),
        activityLogs: [
          {
            id: id("log-content-item"),
            category: "quest",
            title: "Static-site content draft created",
            detail: `${contentItem.title} was generated as local Markdown. It has not been written, pushed, deployed, or published.`,
            severity: "success",
            createdAt: now,
            relatedQuestId: contentItem.questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return itemWithArtifact.id;
    },
    [persistOptimistic],
  );

  const prepareStaticSiteDiff = useCallback(
    async (siteProjectId: string) => {
      const current = dataRef.current;
      const diff = publishingDiffForSite(current, siteProjectId);
      const now = new Date().toISOString();
      const ledger: CommandLedgerEntry = {
        id: id("ledger-static-site"),
        connector: "static_site",
        action: "prepare_local_diff",
        status: "approval_required",
        externalAction: true,
        approvalMode: "batch",
        riskLevel: "medium",
        inputSummary: `${diff.files.length} local Markdown files prepared for static-site review.`,
        outputSummary: "Diff is ready for approval. No git push, deploy, or external publishing has run.",
        createdAt: now,
        updatedAt: now,
      };
      const next: AppDataState = {
        ...current,
        publishingDiffs: [diff, ...current.publishingDiffs],
        commandLedgerEntries: [ledger, ...current.commandLedgerEntries],
        contentItems: current.contentItems.map((item) =>
          diff.contentItemIds.includes(item.id)
            ? {
                ...item,
                status: "diff_ready",
                updatedAt: now,
              }
            : item,
        ),
        activityLogs: [
          {
            id: id("log-static-diff"),
            category: "approval",
            title: "Static-site publishing diff prepared",
            detail: `${diff.title} contains ${diff.files.length} local file changes. Publishing requires an explicit approval package.`,
            severity: "warning",
            createdAt: now,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return diff.id;
    },
    [persistOptimistic],
  );

  const createAffiliateOffer = useCallback(
    async (questId: string) => {
      const current = dataRef.current;
      const offer = affiliateOfferForQuest(current, questId);
      const now = new Date().toISOString();
      const task: MissionTask = {
        id: id("mission-task-offer"),
        questId,
        type: "review",
        title: `Claim review for ${offer.name}`,
        ownerAgentId: "teamleader1a",
        status: "in_progress",
        priority: "high",
        approvalRequired: false,
        dependencyIds: [],
        artifactIds: [],
        commandLedgerEntryIds: [],
        successCriteria: ["Disclosure rules are clear", "Allowed claims are source-backed", "Prohibited claims are blocked"],
        createdAt: now,
        updatedAt: now,
      };
      const next: AppDataState = {
        ...current,
        affiliateOffers: [offer, ...current.affiliateOffers],
        missionTasks: [task, ...current.missionTasks],
        activityLogs: [
          {
            id: id("log-affiliate-offer"),
            category: "quest",
            title: "Affiliate offer candidate created",
            detail: `${offer.name} is in claim review. No affiliate API, link publishing, or external action has run.`,
            severity: "warning",
            createdAt: now,
            relatedQuestId: questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return offer.id;
    },
    [persistOptimistic],
  );

  const reviewAffiliateOffer = useCallback(
    async (offerId: string) => {
      const current = dataRef.current;
      const offer = current.affiliateOffers.find((item) => item.id === offerId);
      if (!offer) throw new Error("Affiliate offer not found.");
      const review = reviewForAffiliateOffer(offer);
      const now = new Date().toISOString();
      const nextStatus: AffiliateOffer["status"] = review.status === "passed" ? "approved_local" : review.status === "blocked" ? "blocked" : "claim_review";
      const artifact: MissionArtifact = {
        id: id("artifact-offer-review"),
        questId: offer.questId,
        type: "decision_record",
        title: `${offer.name} claim review`,
        summary: review.status === "passed" ? "Offer claim rules passed local review." : "Offer needs revision before it can be used in publishable content.",
        content: [
          `## Findings`,
          review.findings.map((finding) => `- ${finding}`).join("\n"),
          "",
          `## Required Changes`,
          review.requiredChanges.map((change) => `- ${change}`).join("\n"),
          "",
          `## Safety`,
          "This review does not publish links, join affiliate programs, or claim verified product experience.",
        ].join("\n"),
        status: review.status === "passed" ? "approved_local" : "ready_for_review",
        storage: "sqlite",
        sourceIds: [offer.id, ...offer.evidenceIds],
        createdByAgentId: "teamleader1a",
        createdAt: now,
        updatedAt: now,
      };
      const next: AppDataState = {
        ...current,
        offerClaimReviews: [review, ...current.offerClaimReviews],
        affiliateOffers: current.affiliateOffers.map((item) =>
          item.id === offer.id
            ? {
                ...item,
                status: nextStatus,
                updatedAt: now,
              }
            : item,
        ),
        missionArtifacts: [artifact, ...current.missionArtifacts],
        contentItems: current.contentItems.map((item) =>
          item.questId === offer.questId
            ? {
                ...item,
                claimReviewStatus: review.status === "passed" ? "passed" : "needs_review",
                updatedAt: now,
              }
            : item,
        ),
        activityLogs: [
          {
            id: id("log-affiliate-review"),
            category: "quest",
            title: "Affiliate offer claim review completed",
            detail: `${offer.name}: ${review.status.replace(/_/g, " ")}. Publishing still requires approval.`,
            severity: review.status === "passed" ? "success" : review.status === "blocked" ? "danger" : "warning",
            createdAt: now,
            relatedQuestId: offer.questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return review.id;
    },
    [persistOptimistic],
  );

  const syncSearchConsoleReadOnly = useCallback(
    async (questId?: string) => {
      const current = dataRef.current;
      const now = new Date().toISOString();
      const snapshot = analyticsSnapshotFromMetrics(current, questId);
      const next: AppDataState = {
        ...current,
        analyticsSnapshots: [snapshot, ...current.analyticsSnapshots],
        analyticsConnectors: current.analyticsConnectors.map((connector) =>
          connector.type === "google_search_console"
            ? {
                ...connector,
                status: connector.authMode === "secure_reference" ? "connected" : connector.status,
                lastSyncAt: now,
                notes:
                  connector.authMode === "secure_reference"
                    ? "Read-only Search Console sync completed."
                    : "Read-only snapshot generated from local/manual metrics. OAuth secure token storage is still required for real GSC API sync.",
                updatedAt: now,
              }
            : connector,
        ),
        experimentAnalyses: questId
          ? [
              {
                id: id("experiment-analysis-gsc"),
                experimentId: current.experiments.find((experiment) => experiment.questId === questId)?.id ?? "search-console",
                questId,
                confidenceScore: clampScore(snapshot.impressions > 0 ? Math.min(75, snapshot.impressions / 4) + snapshot.clicks * 2 : 10),
                recommendation: snapshot.recommendation,
                conversionRate: snapshot.ctr,
                breakEvenProgress: 0,
                revenue: 0,
                cost: 0,
                evidenceStrength: snapshot.impressions >= 500 ? "strong" : snapshot.impressions >= 100 ? "directional" : "thin",
                notes: snapshot.teamLeaderSummary,
                createdAt: now,
              },
              ...current.experimentAnalyses,
            ]
          : current.experimentAnalyses,
        activityLogs: [
          {
            id: id("log-gsc-sync"),
            category: "experiment",
            title: "Read-only Search Console snapshot created",
            detail: `${snapshot.title}: ${snapshot.impressions} impressions, ${snapshot.clicks} clicks, ${Math.round(snapshot.ctr * 1000) / 10}% CTR. No write action occurred.`,
            severity: snapshot.recommendation === "scale_later" ? "success" : snapshot.recommendation === "kill" ? "danger" : "info",
            createdAt: now,
            relatedQuestId: questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return snapshot.id;
    },
    [persistOptimistic],
  );

  const createLearningDecision = useCallback(
    async (questId: string) => {
      const current = dataRef.current;
      const { card, decision } = learningFromQuestState(current, questId);
      const now = new Date().toISOString();
      const next: AppDataState = {
        ...current,
        learningCards: [card, ...current.learningCards],
        experimentDecisions: [decision, ...current.experimentDecisions],
        decisionLogs: [
          {
            id: id("decision-learning"),
            questId,
            title: `${card.title}: ${decision.decision.replace(/_/g, " ")}`,
            decision: decision.nextAction,
            rationale: decision.rationale,
            risk: decision.approvalRequired ? "medium" : "low",
            createdBy: "TeamLeader1A",
            createdAt: now,
          },
          ...current.decisionLogs,
        ],
        activityLogs: [
          {
            id: id("log-learning-decision"),
            category: "experiment",
            title: "Experiment learning decision created",
            detail: `${decision.decision.replace(/_/g, " ")}: ${decision.nextAction}`,
            severity: decision.decision === "kill" ? "danger" : decision.decision === "scale_later" ? "success" : "info",
            createdAt: now,
            relatedQuestId: questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return decision.id;
    },
    [persistOptimistic],
  );

  const createBatchApprovalFromDiff = useCallback(
    async (diffId: string) => {
      const current = dataRef.current;
      const diff = current.publishingDiffs.find((item) => item.id === diffId);
      if (!diff) throw new Error("Publishing diff not found.");
      const site = current.siteProjects.find((item) => item.id === diff.siteProjectId);
      const now = new Date().toISOString();
      const approvalId = id("approval-batch");
      const batchId = id("batch-approval");
      const items: BatchApprovalItem[] = diff.files.map((file) => ({
        id: id("batch-item"),
        batchId,
        targetType: "publishing_diff_file",
        targetId: file.path,
        summary: `${file.action} ${file.path}: ${file.summary}`,
        status: "pending",
      }));
      const batch: BatchApprovalPackage = {
        id: batchId,
        title: `${diff.title} batch approval`,
        status: "pending",
        approvalId,
        questId: site?.primaryQuestId,
        sourceDiffId: diff.id,
        itemIds: items.map((item) => item.id),
        maxActions: items.length,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        riskFlags: diff.riskFlags,
        rollbackPlan: "Do not deploy automatically. If later published manually, revert the static-site commit and archive the local diff if issues appear.",
        createdAt: now,
        updatedAt: now,
      };
      const approval: ApprovalRequest = {
        id: approvalId,
        type: "Publish externally",
        title: batch.title,
        questId: batch.questId,
        requestedBy: "TeamLeader1A",
        riskLevel: "medium",
        reason: `Approve an itemized batch of ${items.length} static-site file changes. This records approval only; publishing execution remains separate.`,
        safetyChecklist: [
          "Every file is listed",
          "Batch has an expiry",
          "Rollback plan is visible",
          "Claims and affiliate disclosures must pass review",
          "No deployment or git push executes from this approval",
        ],
        blockedBehaviors: phase5BlockedBehaviors,
        status: "pending",
        createdAt: now,
      };
      const next: AppDataState = {
        ...current,
        batchApprovalPackages: [batch, ...current.batchApprovalPackages],
        batchApprovalItems: [...items, ...current.batchApprovalItems],
        approvalRequests: [approval, ...current.approvalRequests],
        publishingDiffs: current.publishingDiffs.map((item) =>
          item.id === diff.id
            ? {
                ...item,
                approvalId,
                updatedAt: now,
              }
            : item,
        ),
        approvalDecisionRecords: [
          decisionRecord({
            approvalId,
            decision: "created",
            reason: `Batch approval package created for ${items.length} file changes.`,
            payloadSummary: batch.title,
          }),
          ...current.approvalDecisionRecords,
        ],
        activityLogs: [
          {
            id: id("log-batch-approval"),
            category: "approval",
            title: "Batch approval package created",
            detail: `${batch.title} expires at ${batch.expiresAt}. No publishing command has run.`,
            severity: "warning",
            createdAt: now,
            relatedQuestId: batch.questId,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return batch.id;
    },
    [persistOptimistic],
  );

  const runControlledJobNow = useCallback(
    async (scheduleId: string) => {
      const current = dataRef.current;
      const schedule = current.jobSchedules.find((item) => item.id === scheduleId);
      if (!schedule) throw new Error("Job schedule not found.");
      const now = new Date().toISOString();
      const completedAt = new Date(Date.now() + 1000).toISOString();
      const blocked = schedule.status === "blocked" || (!schedule.safeReadOnly && schedule.requiresApprovalAtExecution);
      const run: JobRun = {
        id: id("job-run"),
        scheduleId,
        name: schedule.name,
        status: blocked ? "blocked" : "success",
        startedAt: now,
        completedAt,
        summary: blocked
          ? "Job blocked because it is not safe read-only and needs approval at execution time."
          : "Controlled local job completed. No external write action, spending, publishing, or messaging occurred.",
        relatedLogIds: [],
      };
      const next: AppDataState = {
        ...current,
        jobRuns: [run, ...current.jobRuns],
        jobSchedules: current.jobSchedules.map((item) =>
          item.id === schedule.id
            ? {
                ...item,
                lastRunAt: completedAt,
                nextRunAt: new Date(Date.now() + item.intervalMinutes * 60 * 1000).toISOString(),
                updatedAt: completedAt,
              }
            : item,
        ),
        activityLogs: [
          {
            id: id("log-job-run"),
            category: "system",
            title: blocked ? "Controlled job blocked" : "Controlled job completed",
            detail: run.summary,
            severity: blocked ? "warning" : "success",
            createdAt: completedAt,
          },
          ...current.activityLogs,
        ],
      };
      await persistOptimistic(next);
      return run.id;
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
    opportunityIntervalRef.current = window.setInterval(() => {
      setData((current) => {
        const next = advanceOpportunityWorkState(current);
        if (!next) return current;
        dataRef.current = next;
        void persistenceService.saveState(next).then(setAdapter);
        return next;
      });
    }, 4_000);

    return () => {
      if (opportunityIntervalRef.current) {
        window.clearInterval(opportunityIntervalRef.current);
        opportunityIntervalRef.current = null;
      }
    };
  }, []);

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

  useEffect(() => {
    if (!operatingAutopilotEnabled) {
      if (operatingAutopilotIntervalRef.current) {
        window.clearInterval(operatingAutopilotIntervalRef.current);
        operatingAutopilotIntervalRef.current = null;
      }
      return;
    }

    operatingAutopilotIntervalRef.current = window.setInterval(() => {
      const business = dataRef.current.approvedBusinesses.find((item) => item.status === "active");
      if (!business) return;
      void runBusinessOperatingCycle(business.id);
    }, 120_000);

    return () => {
      if (operatingAutopilotIntervalRef.current) {
        window.clearInterval(operatingAutopilotIntervalRef.current);
        operatingAutopilotIntervalRef.current = null;
      }
    };
  }, [operatingAutopilotEnabled, runBusinessOperatingCycle]);

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

  const exportBusinessAssetPack = useCallback(
    async (businessId: string) => {
      const current = dataRef.current;
      const business = current.approvedBusinesses.find((item) => item.id === businessId);
      if (!business) {
        return { ok: false, mode: "preview" as const, message: "Approved business not found." };
      }
      const cockpit = current.approvedBusinessCockpits.find((item) => item.businessId === businessId);
      const files = current.localAssetFiles.filter((file) => file.businessId === businessId);
      const receipts = current.executionReceipts.filter((receipt) => receipt.businessId === businessId);
      const metrics = current.businessMetricSnapshots.filter((snapshot) => snapshot.businessId === businessId);
      const ledger = current.budgetLedgerEntries.filter((entry) => entry.businessId === businessId);
      const note: ObsidianNote = {
        id: `obsidian-business-pack-${businessId}`,
        title: `${business.name} Business Operating Pack`,
        type: "sop",
        folder: `OpenClaw/Businesses/${filenameSafe(business.name)}`,
        frontmatter: {
          type: "business_operating_pack",
          system: "openclaw",
          business_id: businessId,
          status: business.status,
          validation_score: business.validationScore,
          external_actions: "approval_required",
          updated_at: new Date().toISOString(),
        },
        linkedQuestId: business.questId,
        body: [
          `# ${business.name} Business Operating Pack`,
          "",
          "## TeamLeader1A Recommendation",
          business.teamLeaderRecommendation,
          "",
          "## Business Cockpit",
          cockpit ? `Health score: ${cockpit.healthScore}/100` : "Cockpit record not found.",
          ...(cockpit?.nextBestActions ?? []).map((item) => `- ${item}`),
          "",
          "## Local Asset Files",
          ...files.map((file) => `- ${file.title} (${file.platform}) -> ${file.intendedPath}`),
          "",
          "## Execution Receipts",
          ...receipts.slice(0, 12).map((receipt) => `- ${receipt.title}: ${receipt.summary} Budget effect: ${receipt.budgetEffect}`),
          "",
          "## Metrics",
          ...metrics.slice(0, 6).map((metric) => `- ${metric.createdAt}: traffic ${metric.traffic}, leads ${metric.leads}, revenue ${money(metric.revenue)}, cost ${money(metric.cost)}, confidence ${metric.confidence}`),
          "",
          "## Budget Ledger",
          ...ledger.slice(0, 10).map((entry) => `- ${entry.type}: ${money(entry.amount)} - ${entry.description}`),
          "",
          "## Approval Boundary",
          "This pack is local only. Publishing, messaging, spending, launch, connector execution, login automation, form submission, and purchases require separate explicit approval.",
        ].join("\n"),
      };
      const noteExists = current.obsidianNotes.some((item) => item.id === note.id);
      await persistOptimistic({
        ...current,
        obsidianNotes: noteExists ? current.obsidianNotes.map((item) => (item.id === note.id ? note : item)) : [note, ...current.obsidianNotes],
      });
      return exportObsidianNote(note);
    },
    [exportObsidianNote, persistOptimistic],
  );

  const exportProductProofPack = useCallback(
    async (previewId: string) => {
      const current = dataRef.current;
      const preview = current.productPreviews.find((item) => item.id === previewId);
      if (!preview) {
        return { ok: false, mode: "preview" as const, message: "Product preview not found." };
      }
      const business = current.approvedBusinesses.find((item) => item.id === preview.businessId);
      const blueprint = current.productBlueprints.find((item) => item.id === preview.blueprintId);
      const proposal = current.businessProposals.find((item) => item.id === preview.proposalId);
      const sections = current.productPreviewSections.filter((section) => preview.sectionIds.includes(section.id));
      const files = current.localAssetFiles.filter((file) => preview.assetFileIds.includes(file.id));
      const evidence = current.researchEvidence.filter((item) => proposal?.evidenceIds.includes(item.id));
      const gate = current.approvalGateStates.find((item) => item.id === preview.approvalGateStateId);
      const publishPayload = preview.publishPayloadPreviewId
        ? current.publishPayloadPreviews.find((item) => item.id === preview.publishPayloadPreviewId)
        : undefined;
      const revisions = current.productRevisionRequests.filter((item) => item.previewId === preview.id);
      const receipts = current.executionReceipts.filter((receipt) => receipt.businessId === preview.businessId || receipt.proposalId === preview.proposalId);
      const now = new Date().toISOString();
      const productName = blueprint?.name ?? business?.name ?? "Product Draft";
      const note: ObsidianNote = {
        id: `obsidian-product-proof-${previewId}`,
        title: `${productName} Product Proof Pack`,
        type: "sop",
        folder: `OpenClaw/Businesses/${filenameSafe(business?.name ?? productName)}`,
        linkedQuestId: business?.questId,
        frontmatter: {
          type: "product_proof_pack",
          system: "openclaw",
          business_id: preview.businessId,
          proposal_id: preview.proposalId,
          preview_id: preview.id,
          product_status: preview.status,
          local_draft_approved: preview.localDraftApproved,
          pending_approval_id: gate?.approvalId ?? "",
          external_actions: "blocked_until_exact_approval",
          updated_at: now,
        },
        body: [
          `# ${productName} Product Proof Pack`,
          "",
          "## Product Snapshot",
          `Buyer: ${blueprint?.audience ?? proposal?.targetAudience ?? "Not specified"}`,
          `Problem solved: ${blueprint?.problemSolved ?? "Not specified"}`,
          `Deliverable: ${blueprint?.offerDeliverable ?? "Not specified"}`,
          `Destination: ${blueprint?.intendedDestination ?? publishPayload?.platform ?? "Not specified"}`,
          `Status: ${preview.status.replace(/_/g, " ")}`,
          `Latest change: ${preview.updatedAt}`,
          `Next action: ${gate?.actionLabel ?? blueprint?.nextProductionStep ?? "Review the product draft"}`,
          "",
          "## What Exists",
          ...(files.length
            ? files.map((file) => `- ${file.title} (${file.platform})`)
            : sections.length
              ? sections.map((section) => `- ${section.title}`)
              : ["- No product files have been generated yet."]),
          "",
          "## What Is Missing",
          ...(preview.missingItems.length ? preview.missingItems.map((item) => `- ${item}`) : ["- Nothing blocking the local draft review is recorded."]),
          "",
          "## Full Draft",
          sections.find((section) => section.kind === "full_draft")?.content ?? "No full draft section found.",
          "",
          "## Platform Fields",
          ...(sections.find((section) => section.kind === "platform_fields")?.fields
            ? Object.entries(sections.find((section) => section.kind === "platform_fields")?.fields ?? {}).map(([key, value]) => `- ${key}: ${value}`)
            : ["- No platform fields found."]),
          "",
          "## Product Files",
          ...(files.length ? files.map((file) => `- ${file.title} (${file.platform}) -> ${file.intendedPath}`) : ["- No linked local product files found."]),
          "",
          "## Claims & Safety Check",
          sections.find((section) => section.kind === "claims_safety")?.content ?? "No claims and safety section found.",
          "",
          "## Evidence And Citations",
          ...(evidence.length ? evidence.map((item) => `- ${item.title}: ${item.url} - ${item.summary}`) : ["- No linked evidence records found."]),
          "",
          "## Budget Plan",
          proposal
            ? [
                `Portfolio starting capital: ${money(proposal.budgetPlan.portfolioStartingCapital)}`,
                `Remaining capital: ${money(proposal.budgetPlan.portfolioRemainingCapital)}`,
                `Business budget cap: ${money(proposal.budgetPlan.businessBudgetCap)}`,
                `Required spend: ${money(proposal.budgetPlan.requiredSpend)}`,
                `Recommended spend: ${money(proposal.budgetPlan.recommendedSpend)}`,
                `Zero-budget path: ${proposal.budgetPlan.zeroBudgetPath}`,
              ].join("\n")
            : "No proposal budget plan found.",
          "",
          "## Approval Boundary",
          gate ? `${gate.label}: ${gate.reason}` : "No approval gate record found.",
          publishPayload ? `Frozen publish payload: ${publishPayload.platform}. ${publishPayload.contentSummary}` : "No publish approval payload has been created yet.",
          "Publishing, messaging, spending, launching, connector execution, login automation, form submission, and purchases remain locked until a separate exact approval exists.",
          "",
          "## Revision History",
          ...(revisions.length ? revisions.map((item) => `- ${item.updatedAt}: ${item.reason}`) : ["- No revision requests yet."]),
          "",
          "## Execution Receipts",
          ...(receipts.length ? receipts.slice(0, 12).map((receipt) => `- ${receipt.title}: ${receipt.summary} Budget effect: ${receipt.budgetEffect}`) : ["- No receipts yet."]),
        ].join("\n"),
      };
      const receipt: ExecutionReceipt = {
        id: id("execution-receipt"),
        businessId: preview.businessId,
        proposalId: preview.proposalId,
        actionType: "product_proof_pack_export",
        title: "Product Proof Pack prepared",
        summary: `${productName} proof pack was assembled with draft content, platform fields, evidence, budget, safety checks, and approval boundary.`,
        source: "Product Studio / Obsidian export",
        artifactIds: [preview.id, note.id],
        budgetEffect: "No spend. Local/export artifact only.",
        externalAction: false,
        approvalRequired: false,
        status: "success",
        nextAction: "Review the proof pack before requesting any external approval.",
        createdAt: now,
      };
      const noteExists = current.obsidianNotes.some((item) => item.id === note.id);
      await persistOptimistic({
        ...current,
        obsidianNotes: noteExists ? current.obsidianNotes.map((item) => (item.id === note.id ? note : item)) : [note, ...current.obsidianNotes],
        executionReceipts: [receipt, ...current.executionReceipts],
      });
      return exportObsidianNote(note);
    },
    [exportObsidianNote, persistOptimistic],
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
      operatingAutopilotEnabled,
      lastExportResult,
      refresh,
      resetLocalData,
      updateApprovalStatus,
      updateSettings,
      updateExternalActionLock,
      recordSystemLog,
      runSimulationNow,
      setSimulationEnabled,
      selectObsidianVault,
      exportObsidianNote,
      revealExportedPath,
      refreshOpenClawStatus,
      syncOpenClawAgents,
      refreshOpenClawMcpStatus,
      installOpenClawMcpLocalKit,
      runBrowserBrokerDiagnostic,
      requestGatewayStart,
      requestTeamLeaderTurn,
      sendTeamLeaderChatMessage,
      createOpportunityHuntFromMessage,
      cleanupAcceptanceTestData,
      approveBusinessProposal,
      runBusinessOperatingCycle,
      addBusinessMetricSnapshot,
      exportBusinessAssetPack,
      exportProductProofPack,
      setOperatingAutopilotEnabled,
      updateBusinessProposalStatus,
      approveProductLocalDraft,
      requestProductRevision,
      prepareProductPublishApproval,
      preparePlatformPublishApproval,
      createMissionDraftFromMessage,
      requestMissionStart,
      retryMissionStep,
      skipMissionStep,
      convertMissionStepToLocalDraft,
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
      createSeoResearchPack,
      createExperimentPlan,
      analyzeExperiment,
      createProductionPack,
      advanceProductionAsset,
      createSiteProject,
      createContentItemFromCluster,
      prepareStaticSiteDiff,
      createAffiliateOffer,
      reviewAffiliateOffer,
      syncSearchConsoleReadOnly,
      createLearningDecision,
      createBatchApprovalFromDiff,
      runControlledJobNow,
    }),
    [
      data,
      adapter,
      isLoading,
      simulationEnabled,
      operatingAutopilotEnabled,
      lastExportResult,
      refresh,
      resetLocalData,
      updateApprovalStatus,
      updateSettings,
      updateExternalActionLock,
      recordSystemLog,
      runSimulationNow,
      selectObsidianVault,
      exportObsidianNote,
      revealExportedPath,
      refreshOpenClawStatus,
      syncOpenClawAgents,
      refreshOpenClawMcpStatus,
      installOpenClawMcpLocalKit,
      runBrowserBrokerDiagnostic,
      requestGatewayStart,
      requestTeamLeaderTurn,
      sendTeamLeaderChatMessage,
      createOpportunityHuntFromMessage,
      cleanupAcceptanceTestData,
      approveBusinessProposal,
      runBusinessOperatingCycle,
      addBusinessMetricSnapshot,
      exportBusinessAssetPack,
      exportProductProofPack,
      updateBusinessProposalStatus,
      approveProductLocalDraft,
      requestProductRevision,
      prepareProductPublishApproval,
      preparePlatformPublishApproval,
      createMissionDraftFromMessage,
      requestMissionStart,
      retryMissionStep,
      skipMissionStep,
      convertMissionStepToLocalDraft,
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
      createSeoResearchPack,
      createExperimentPlan,
      analyzeExperiment,
      createProductionPack,
      advanceProductionAsset,
      createSiteProject,
      createContentItemFromCluster,
      prepareStaticSiteDiff,
      createAffiliateOffer,
      reviewAffiliateOffer,
      syncSearchConsoleReadOnly,
      createLearningDecision,
      createBatchApprovalFromDiff,
      runControlledJobNow,
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
