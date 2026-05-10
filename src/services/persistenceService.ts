import { isTauri } from "@tauri-apps/api/core";
import {
  activityLogs,
  affiliateOffers,
  agentMessages,
  agentPerformanceMemories,
  agents,
  analyticsConnectors,
  analyticsSnapshots,
  approvalRequests,
  approvedBusinesses,
  agentWorkSessions,
  autonomousImprovementRuns,
  batchApprovalItems,
  batchApprovalPackages,
  budgets,
  businessProposals,
  businessIdeas,
  businessTasks,
  contentInventoryItems,
  contentItems,
  dashboardSummary,
  decisionLogs,
  demandProofReports,
  experimentAnalyses,
  experimentQueue,
  experiments,
  experimentDecisions,
  commandLedgerEntries,
  externalActionLock,
  improvementProposals,
  improvementQueue,
  guildOfficeStations,
  jobRuns,
  jobSchedules,
  marketIntelligenceReports,
  learningCards,
  researchSourceCaptures,
  seoKeywordClusters,
  siteProjects,
  missionArtifacts,
  missionTasks,
  obsidianNotes,
  openClawCapabilities,
  openClawCommands,
  openClawEvents,
  openClawMcpServers,
  openClawPermissions,
  openClawRuntimeStatus,
  offerClaimReviews,
  opportunityHunts,
  productionAssets,
  productionPacks,
  productionDestinations,
  publishingDiffs,
  publishingConnectors,
  portfolioScores,
  quests,
  researchQueue,
  researchEvidence,
  revenueRecords,
  searchConsoleMetrics,
  searchConsoleProperties,
  safetyRules,
  skills,
  spendEntries,
  skillGapRequests,
  tasks,
  teamLeaderChatMessages,
  userSettings,
  validationReports,
} from "../data/mockData";
import type {
  ActivityLog,
  AffiliateOffer,
  Agent,
  AgentArtifact,
  AgentMessage,
  AgentPerformanceMemory,
  AgentWorkSession,
  AnalyticsConnector,
  AnalyticsSnapshot,
  AgentOrchestrationRun,
  AgentRunReview,
  ApprovedBusiness,
  AllowlistEntry,
  ApprovalRequest,
  ApprovalDecisionRecord,
  AutonomousImprovementRun,
  BatchApprovalItem,
  BatchApprovalPackage,
  Budget,
  BusinessProposal,
  BusinessIdea,
  BusinessTask,
  DashboardSummary,
  DecisionLog,
  DemandProofReport,
  Experiment,
  ExperimentDecision,
  ExperimentAnalysis,
  CommandLedgerEntry,
  ContentItem,
  ContentInventoryItem,
  ExternalActionLock,
  GuildOfficeStation,
  ImprovementProposal,
  JobRun,
  JobSchedule,
  LearningCard,
  MarketIntelligenceReport,
  AgentTurnResult,
  MissionArtifact,
  MissionAgentStep,
  MissionApprovalBatch,
  MissionBriefSection,
  MissionDraft,
  MissionRun,
  MissionTask,
  ObsidianNote,
  OpenClawCapability,
  OpenClawCommand,
  OpenClawEvent,
  OpenClawMcpServer,
  OpenClawPermission,
  OpenClawRuntimeStatus,
  OfferClaimReview,
  OpportunityHunt,
  ProductionAsset,
  ProductionPack,
  ProductionDestination,
  PublishingDiff,
  PublishingConnector,
  PortfolioScore,
  Quest,
  ResearchEvidence,
  ResearchSourceCapture,
  RealPilotRun,
  SearchConsoleMetric,
  SearchConsoleProperty,
  SeoKeywordCluster,
  SiteProject,
  Skill,
  SpendEntry,
  SkillGapRequest,
  Task,
  TeamLeaderChatMessage,
  UserSettings,
  ValidationReport,
  RevenueRecord,
} from "../types";
import { safetyPolicyService } from "./safetyPolicyService";

export type StorageAdapter = "tauri-sqlite" | "browser-local-storage";

export interface AppDataState {
  skills: Skill[];
  agents: Agent[];
  businessIdeas: BusinessIdea[];
  quests: Quest[];
  budgets: Budget[];
  validationReports: ValidationReport[];
  experiments: Experiment[];
  experimentDecisions: ExperimentDecision[];
  marketIntelligenceReports: MarketIntelligenceReport[];
  researchSourceCaptures: ResearchSourceCapture[];
  seoKeywordClusters: SeoKeywordCluster[];
  demandProofReports: DemandProofReport[];
  experimentAnalyses: ExperimentAnalysis[];
  productionAssets: ProductionAsset[];
  productionPacks: ProductionPack[];
  siteProjects: SiteProject[];
  contentItems: ContentItem[];
  publishingDiffs: PublishingDiff[];
  publishingConnectors: PublishingConnector[];
  spendEntries: SpendEntry[];
  revenueRecords: RevenueRecord[];
  portfolioScores: PortfolioScore[];
  affiliateOffers: AffiliateOffer[];
  offerClaimReviews: OfferClaimReview[];
  analyticsConnectors: AnalyticsConnector[];
  searchConsoleProperties: SearchConsoleProperty[];
  searchConsoleMetrics: SearchConsoleMetric[];
  analyticsSnapshots: AnalyticsSnapshot[];
  learningCards: LearningCard[];
  jobSchedules: JobSchedule[];
  jobRuns: JobRun[];
  opportunityHunts: OpportunityHunt[];
  businessProposals: BusinessProposal[];
  approvedBusinesses: ApprovedBusiness[];
  businessTasks: BusinessTask[];
  agentWorkSessions: AgentWorkSession[];
  guildOfficeStations: GuildOfficeStation[];
  researchEvidence: ResearchEvidence[];
  productionDestinations: ProductionDestination[];
  contentInventoryItems: ContentInventoryItem[];
  autonomousImprovementRuns: AutonomousImprovementRun[];
  missionDrafts: MissionDraft[];
  missionRuns: MissionRun[];
  missionAgentSteps: MissionAgentStep[];
  missionBriefSections: MissionBriefSection[];
  missionApprovalBatches: MissionApprovalBatch[];
  agentTurnResults: AgentTurnResult[];
  missionTasks: MissionTask[];
  missionArtifacts: MissionArtifact[];
  commandLedgerEntries: CommandLedgerEntry[];
  obsidianNotes: ObsidianNote[];
  decisionLogs: DecisionLog[];
  improvementProposals: ImprovementProposal[];
  tasks: Task[];
  agentOrchestrationRuns: AgentOrchestrationRun[];
  agentArtifacts: AgentArtifact[];
  agentRunReviews: AgentRunReview[];
  agentMessages: AgentMessage[];
  agentPerformanceMemories: AgentPerformanceMemory[];
  skillGapRequests: SkillGapRequest[];
  teamLeaderChatMessages: TeamLeaderChatMessage[];
  approvalRequests: ApprovalRequest[];
  batchApprovalPackages: BatchApprovalPackage[];
  batchApprovalItems: BatchApprovalItem[];
  approvalDecisionRecords: ApprovalDecisionRecord[];
  allowlistEntries: AllowlistEntry[];
  activityLogs: ActivityLog[];
  openClawCommands: OpenClawCommand[];
  openClawEvents: OpenClawEvent[];
  openClawMcpServers: OpenClawMcpServer[];
  openClawCapabilities: OpenClawCapability[];
  openClawPermissions: OpenClawPermission[];
  openClawRuntimeStatus: OpenClawRuntimeStatus;
  realPilotRuns: RealPilotRun[];
  userSettings: UserSettings;
  externalActionLock: ExternalActionLock;
  dashboardSummary: DashboardSummary;
  researchQueue: string[];
  experimentQueue: string[];
  improvementQueue: string[];
  safetyRules: string[];
}

type SqlDatabase = {
  execute: (query: string, bindValues?: unknown[]) => Promise<unknown>;
  select: <T = Record<string, unknown>>(query: string, bindValues?: unknown[]) => Promise<T[]>;
};

type EntityKey =
  | "skills"
  | "agents"
  | "businessIdeas"
  | "quests"
  | "budgets"
  | "validationReports"
  | "experiments"
  | "experimentDecisions"
  | "marketIntelligenceReports"
  | "researchSourceCaptures"
  | "seoKeywordClusters"
  | "demandProofReports"
  | "experimentAnalyses"
  | "productionAssets"
  | "productionPacks"
  | "siteProjects"
  | "contentItems"
  | "publishingDiffs"
  | "publishingConnectors"
  | "spendEntries"
  | "revenueRecords"
  | "portfolioScores"
  | "affiliateOffers"
  | "offerClaimReviews"
  | "analyticsConnectors"
  | "searchConsoleProperties"
  | "searchConsoleMetrics"
  | "analyticsSnapshots"
  | "learningCards"
  | "jobSchedules"
  | "jobRuns"
  | "opportunityHunts"
  | "businessProposals"
  | "approvedBusinesses"
  | "businessTasks"
  | "agentWorkSessions"
  | "guildOfficeStations"
  | "researchEvidence"
  | "productionDestinations"
  | "contentInventoryItems"
  | "autonomousImprovementRuns"
  | "missionDrafts"
  | "missionRuns"
  | "missionAgentSteps"
  | "missionBriefSections"
  | "missionApprovalBatches"
  | "agentTurnResults"
  | "missionTasks"
  | "missionArtifacts"
  | "commandLedgerEntries"
  | "obsidianNotes"
  | "decisionLogs"
  | "improvementProposals"
  | "tasks"
  | "agentOrchestrationRuns"
  | "agentArtifacts"
  | "agentRunReviews"
  | "agentMessages"
  | "agentPerformanceMemories"
  | "skillGapRequests"
  | "teamLeaderChatMessages"
  | "approvalRequests"
  | "batchApprovalPackages"
  | "batchApprovalItems"
  | "approvalDecisionRecords"
  | "allowlistEntries"
  | "activityLogs"
  | "openClawCommands"
  | "openClawEvents"
  | "openClawMcpServers"
  | "openClawCapabilities"
  | "openClawPermissions"
  | "realPilotRuns";

type SingletonKey = "openClawRuntimeStatus" | "userSettings" | "dashboardSummary" | "externalActionLock";

type EntityConfig = {
  stateKey: EntityKey;
  tableName: string;
};

type SingletonConfig = {
  stateKey: SingletonKey;
  tableName: string;
  id: string;
};

type StoredRow = {
  id: string;
  payload: string;
};

const LOCAL_STORAGE_KEY = "openclaw-mission-control-state-v2";
const SEED_METADATA_KEY = "seeded";
const DATABASE_URL = "sqlite:openclaw-mission-control.db";
let cachedSqlDatabase: SqlDatabase | null = null;
let pendingSqlDatabase: Promise<SqlDatabase | null> | null = null;

export const entityConfigs: EntityConfig[] = [
  { stateKey: "skills", tableName: "skills" },
  { stateKey: "agents", tableName: "agents" },
  { stateKey: "businessIdeas", tableName: "business_ideas" },
  { stateKey: "quests", tableName: "quests" },
  { stateKey: "budgets", tableName: "budgets" },
  { stateKey: "validationReports", tableName: "validation_reports" },
  { stateKey: "experiments", tableName: "experiments" },
  { stateKey: "experimentDecisions", tableName: "experiment_decisions" },
  { stateKey: "marketIntelligenceReports", tableName: "market_intelligence_reports" },
  { stateKey: "researchSourceCaptures", tableName: "research_source_captures" },
  { stateKey: "seoKeywordClusters", tableName: "seo_keyword_clusters" },
  { stateKey: "demandProofReports", tableName: "demand_proof_reports" },
  { stateKey: "experimentAnalyses", tableName: "experiment_analyses" },
  { stateKey: "productionAssets", tableName: "production_assets" },
  { stateKey: "productionPacks", tableName: "production_packs" },
  { stateKey: "siteProjects", tableName: "site_projects" },
  { stateKey: "contentItems", tableName: "content_items" },
  { stateKey: "publishingDiffs", tableName: "publishing_diffs" },
  { stateKey: "publishingConnectors", tableName: "publishing_connectors" },
  { stateKey: "spendEntries", tableName: "spend_entries" },
  { stateKey: "revenueRecords", tableName: "revenue_records" },
  { stateKey: "portfolioScores", tableName: "portfolio_scores" },
  { stateKey: "affiliateOffers", tableName: "affiliate_offers" },
  { stateKey: "offerClaimReviews", tableName: "offer_claim_reviews" },
  { stateKey: "analyticsConnectors", tableName: "analytics_connectors" },
  { stateKey: "searchConsoleProperties", tableName: "search_console_properties" },
  { stateKey: "searchConsoleMetrics", tableName: "search_console_metrics" },
  { stateKey: "analyticsSnapshots", tableName: "analytics_snapshots" },
  { stateKey: "learningCards", tableName: "learning_cards" },
  { stateKey: "jobSchedules", tableName: "job_schedules" },
  { stateKey: "jobRuns", tableName: "job_runs" },
  { stateKey: "opportunityHunts", tableName: "opportunity_hunts" },
  { stateKey: "businessProposals", tableName: "business_proposals" },
  { stateKey: "approvedBusinesses", tableName: "approved_businesses" },
  { stateKey: "businessTasks", tableName: "business_tasks" },
  { stateKey: "agentWorkSessions", tableName: "agent_work_sessions" },
  { stateKey: "guildOfficeStations", tableName: "guild_office_stations" },
  { stateKey: "researchEvidence", tableName: "research_evidence" },
  { stateKey: "productionDestinations", tableName: "production_destinations" },
  { stateKey: "contentInventoryItems", tableName: "content_inventory_items" },
  { stateKey: "autonomousImprovementRuns", tableName: "autonomous_improvement_runs" },
  { stateKey: "missionDrafts", tableName: "mission_drafts" },
  { stateKey: "missionRuns", tableName: "mission_runs" },
  { stateKey: "missionAgentSteps", tableName: "mission_agent_steps" },
  { stateKey: "missionBriefSections", tableName: "mission_brief_sections" },
  { stateKey: "missionApprovalBatches", tableName: "mission_approval_batches" },
  { stateKey: "agentTurnResults", tableName: "agent_turn_results" },
  { stateKey: "missionTasks", tableName: "mission_tasks" },
  { stateKey: "missionArtifacts", tableName: "mission_artifacts" },
  { stateKey: "commandLedgerEntries", tableName: "command_ledger_entries" },
  { stateKey: "approvalRequests", tableName: "approval_requests" },
  { stateKey: "batchApprovalPackages", tableName: "batch_approval_packages" },
  { stateKey: "batchApprovalItems", tableName: "batch_approval_items" },
  { stateKey: "approvalDecisionRecords", tableName: "approval_decision_records" },
  { stateKey: "allowlistEntries", tableName: "allowlist_entries" },
  { stateKey: "activityLogs", tableName: "activity_logs" },
  { stateKey: "decisionLogs", tableName: "decision_logs" },
  { stateKey: "improvementProposals", tableName: "improvement_proposals" },
  { stateKey: "obsidianNotes", tableName: "obsidian_notes" },
  { stateKey: "tasks", tableName: "tasks" },
  { stateKey: "agentOrchestrationRuns", tableName: "agent_orchestration_runs" },
  { stateKey: "agentArtifacts", tableName: "agent_artifacts" },
  { stateKey: "agentRunReviews", tableName: "agent_run_reviews" },
  { stateKey: "agentMessages", tableName: "agent_messages" },
  { stateKey: "agentPerformanceMemories", tableName: "agent_performance_memories" },
  { stateKey: "skillGapRequests", tableName: "skill_gap_requests" },
  { stateKey: "teamLeaderChatMessages", tableName: "teamleader_chat_messages" },
  { stateKey: "openClawCommands", tableName: "openclaw_commands" },
  { stateKey: "openClawEvents", tableName: "openclaw_events" },
  { stateKey: "openClawMcpServers", tableName: "openclaw_mcp_servers" },
  { stateKey: "openClawCapabilities", tableName: "openclaw_capabilities" },
  { stateKey: "openClawPermissions", tableName: "openclaw_permissions" },
  { stateKey: "realPilotRuns", tableName: "real_pilot_runs" },
];

export const singletonConfigs: SingletonConfig[] = [
  { stateKey: "openClawRuntimeStatus", tableName: "openclaw_runtime_status", id: "runtime-mock" },
  { stateKey: "userSettings", tableName: "settings", id: "user-settings" },
  { stateKey: "dashboardSummary", tableName: "settings", id: "dashboard-summary" },
  { stateKey: "externalActionLock", tableName: "settings", id: "global-external-action-lock" },
];

export const initialAppDataState: AppDataState = {
  skills,
  agents,
  businessIdeas,
  quests,
  budgets,
  validationReports,
  experiments,
  experimentDecisions,
  marketIntelligenceReports,
  researchSourceCaptures,
  seoKeywordClusters,
  demandProofReports,
  experimentAnalyses,
  productionAssets,
  productionPacks,
  siteProjects,
  contentItems,
  publishingDiffs,
  publishingConnectors,
  spendEntries,
  revenueRecords,
  portfolioScores,
  affiliateOffers,
  offerClaimReviews,
  analyticsConnectors,
  searchConsoleProperties,
  searchConsoleMetrics,
  analyticsSnapshots,
  learningCards,
  jobSchedules,
  jobRuns,
  opportunityHunts,
  businessProposals,
  approvedBusinesses,
  businessTasks,
  agentWorkSessions,
  guildOfficeStations,
  researchEvidence,
  productionDestinations,
  contentInventoryItems,
  autonomousImprovementRuns,
  missionDrafts: [],
  missionRuns: [],
  missionAgentSteps: [],
  missionBriefSections: [],
  missionApprovalBatches: [],
  agentTurnResults: [],
  missionTasks,
  missionArtifacts,
  commandLedgerEntries,
  obsidianNotes,
  decisionLogs,
  improvementProposals,
  tasks,
  agentOrchestrationRuns: [],
  agentArtifacts: [],
  agentRunReviews: [],
  agentMessages,
  agentPerformanceMemories,
  skillGapRequests,
  teamLeaderChatMessages,
  approvalRequests,
  batchApprovalPackages,
  batchApprovalItems,
  approvalDecisionRecords: [],
  allowlistEntries: [],
  activityLogs,
  openClawCommands,
  openClawEvents,
  openClawMcpServers,
  openClawCapabilities,
  openClawPermissions,
  openClawRuntimeStatus,
  realPilotRuns: [],
  userSettings,
  externalActionLock,
  dashboardSummary,
  researchQueue,
  experimentQueue,
  improvementQueue,
  safetyRules,
};

function cloneState(state: AppDataState): AppDataState {
  return JSON.parse(JSON.stringify(state)) as AppDataState;
}

function isTauriRuntime() {
  return isTauri() || (typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window));
}

function nowIso() {
  return new Date().toISOString();
}

function getRecordId(record: unknown) {
  const id = (record as { id?: unknown }).id;
  return typeof id === "string" ? id : crypto.randomUUID();
}

function getIndexValue(record: unknown, key: string) {
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function getRecordIndexes(record: unknown) {
  return {
    quest_id: getIndexValue(record, "questId"),
    status: getIndexValue(record, "status") ?? getIndexValue(record, "approvalStatus"),
    type: getIndexValue(record, "type"),
    stage: getIndexValue(record, "stage"),
    risk_level: getIndexValue(record, "riskLevel") ?? getIndexValue(record, "risk"),
    created_at: getIndexValue(record, "createdAt") ?? nowIso(),
    updated_at: getIndexValue(record, "updatedAt") ?? nowIso(),
  };
}

async function getSqlDatabase(): Promise<SqlDatabase | null> {
  if (!isTauriRuntime()) return null;
  if (cachedSqlDatabase) return cachedSqlDatabase;
  if (pendingSqlDatabase) return pendingSqlDatabase;

  pendingSqlDatabase = (async () => {
    try {
      const module = await import("@tauri-apps/plugin-sql");
      const Database = module.default;
      cachedSqlDatabase = (await Database.load(DATABASE_URL)) as SqlDatabase;
      return cachedSqlDatabase;
    } catch (error) {
      console.warn("SQLite adapter unavailable; falling back to browser local storage.", error);
      return null;
    } finally {
      pendingSqlDatabase = null;
    }
  })();

  return pendingSqlDatabase;
}

async function migrate(db: SqlDatabase) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const tableNames = [...new Set([...entityConfigs.map((item) => item.tableName), ...singletonConfigs.map((item) => item.tableName)])];

  for (const tableName of tableNames) {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        quest_id TEXT,
        status TEXT,
        type TEXT,
        stage TEXT,
        risk_level TEXT,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${tableName}_quest_id ON ${tableName} (quest_id)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${tableName}_status ON ${tableName} (status)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${tableName}_type ON ${tableName} (type)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${tableName}_stage ON ${tableName} (stage)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${tableName}_risk_level ON ${tableName} (risk_level)`);
  }
}

async function readMetadata(db: SqlDatabase, key: string) {
  const rows = await db.select<{ value: string }>("SELECT value FROM app_metadata WHERE key = ?", [key]);
  return rows[0]?.value ?? null;
}

async function writeMetadata(db: SqlDatabase, key: string, value: string) {
  await db.execute(
    `INSERT INTO app_metadata (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, nowIso()],
  );
}

async function replaceTable(db: SqlDatabase, tableName: string, records: unknown[]) {
  await db.execute(`DELETE FROM ${tableName}`);
  for (const record of records) {
    await upsertRecord(db, tableName, record);
  }
}

async function upsertRecord(db: SqlDatabase, tableName: string, record: unknown, forcedId?: string) {
  const id = forcedId ?? getRecordId(record);
  const indexes = getRecordIndexes(record);

  await db.execute(
    `INSERT INTO ${tableName} (id, quest_id, status, type, stage, risk_level, payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       quest_id = excluded.quest_id,
       status = excluded.status,
       type = excluded.type,
       stage = excluded.stage,
       risk_level = excluded.risk_level,
       payload = excluded.payload,
       updated_at = excluded.updated_at`,
    [
      id,
      indexes.quest_id,
      indexes.status,
      indexes.type,
      indexes.stage,
      indexes.risk_level,
      JSON.stringify(record),
      indexes.created_at,
      indexes.updated_at,
    ],
  );
}

async function loadTable<T>(db: SqlDatabase, tableName: string): Promise<T[]> {
  const rows = await db.select<StoredRow>(`SELECT id, payload FROM ${tableName} ORDER BY created_at ASC`);
  return rows.map((row) => JSON.parse(row.payload) as T);
}

async function saveSqlState(db: SqlDatabase, state: AppDataState) {
  for (const config of entityConfigs) {
    await replaceTable(db, config.tableName, state[config.stateKey]);
  }

  for (const config of singletonConfigs) {
    await upsertRecord(db, config.tableName, state[config.stateKey], config.id);
  }

  await writeMetadata(db, "research_queue", JSON.stringify(state.researchQueue));
  await writeMetadata(db, "experiment_queue", JSON.stringify(state.experimentQueue));
  await writeMetadata(db, "improvement_queue", JSON.stringify(state.improvementQueue));
  await writeMetadata(db, "safety_rules", JSON.stringify(state.safetyRules));
  await writeMetadata(db, SEED_METADATA_KEY, "true");
}

async function loadSqlState(db: SqlDatabase): Promise<AppDataState> {
  await migrate(db);
  const seeded = await readMetadata(db, SEED_METADATA_KEY);

  if (seeded !== "true") {
    const seededState = cloneState(initialAppDataState);
    await saveSqlState(db, seededState);
    return seededState;
  }

  const state = cloneState(initialAppDataState);

  for (const config of entityConfigs) {
    const rows = await loadTable(db, config.tableName);
    if (rows.length > 0) {
      (state as unknown as Record<EntityKey, unknown[]>)[config.stateKey] = rows;
    }
  }

  const settingsRows = await db.select<StoredRow>("SELECT id, payload FROM settings");
  const settingsById = new Map(settingsRows.map((row) => [row.id, JSON.parse(row.payload) as unknown]));
  const runtimeRows = await db.select<StoredRow>("SELECT id, payload FROM openclaw_runtime_status");
  const runtimeById = new Map(runtimeRows.map((row) => [row.id, JSON.parse(row.payload) as unknown]));

  state.userSettings = {
    ...state.userSettings,
    ...((settingsById.get("user-settings") as Partial<UserSettings> | undefined) ?? {}),
    approvalRules: {
      ...state.userSettings.approvalRules,
      ...(((settingsById.get("user-settings") as Partial<UserSettings> | undefined)?.approvalRules) ?? {}),
    },
  };
  state.dashboardSummary = (settingsById.get("dashboard-summary") as DashboardSummary | undefined) ?? state.dashboardSummary;
  state.externalActionLock =
    (settingsById.get("global-external-action-lock") as ExternalActionLock | undefined) ?? state.externalActionLock;
  state.openClawRuntimeStatus =
    (runtimeById.get("runtime-mock") as OpenClawRuntimeStatus | undefined) ?? state.openClawRuntimeStatus;

  state.researchQueue = JSON.parse((await readMetadata(db, "research_queue")) ?? JSON.stringify(state.researchQueue));
  state.experimentQueue = JSON.parse((await readMetadata(db, "experiment_queue")) ?? JSON.stringify(state.experimentQueue));
  state.improvementQueue = JSON.parse((await readMetadata(db, "improvement_queue")) ?? JSON.stringify(state.improvementQueue));
  state.safetyRules = JSON.parse((await readMetadata(db, "safety_rules")) ?? JSON.stringify(state.safetyRules));

  return state;
}

function loadBrowserState(): AppDataState {
  if (typeof window === "undefined") return cloneState(initialAppDataState);

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    const seededState = cloneState(initialAppDataState);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seededState));
    return seededState;
  }

  try {
    return { ...cloneState(initialAppDataState), ...(JSON.parse(raw) as Partial<AppDataState>) };
  } catch {
    const seededState = cloneState(initialAppDataState);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seededState));
    return seededState;
  }
}

function saveBrowserState(state: AppDataState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
}

function markInterruptedCommands(state: AppDataState) {
  let changed = false;
  const interruptedAt = nowIso();
  state.openClawCommands = state.openClawCommands.map((command) => {
    if (command.status !== "running") return command;
    changed = true;
    return {
      ...command,
      status: "failed",
      completedAt: command.completedAt ?? interruptedAt,
      stderr: command.stderr ?? "Mission Control restarted before this command completed.",
      resultSummary: "Marked failed because Mission Control restarted before this approved local command completed.",
    };
  });
  return changed;
}

function normalizePhase6BState(state: AppDataState) {
  state.missionDrafts ??= [];
  state.missionRuns ??= [];
  state.missionAgentSteps ??= [];
  state.missionBriefSections ??= [];
  state.missionApprovalBatches ??= [];
  state.agentTurnResults ??= [];
  state.missionTasks ??= cloneState(initialAppDataState).missionTasks;
  state.missionArtifacts ??= cloneState(initialAppDataState).missionArtifacts;
  state.commandLedgerEntries ??= cloneState(initialAppDataState).commandLedgerEntries;
  state.researchSourceCaptures ??= cloneState(initialAppDataState).researchSourceCaptures;
  state.seoKeywordClusters ??= cloneState(initialAppDataState).seoKeywordClusters;
  state.demandProofReports ??= cloneState(initialAppDataState).demandProofReports;
  state.siteProjects ??= cloneState(initialAppDataState).siteProjects;
  state.contentItems ??= cloneState(initialAppDataState).contentItems;
  state.publishingDiffs ??= cloneState(initialAppDataState).publishingDiffs;
  state.affiliateOffers ??= cloneState(initialAppDataState).affiliateOffers;
  state.offerClaimReviews ??= cloneState(initialAppDataState).offerClaimReviews;
  state.analyticsConnectors ??= cloneState(initialAppDataState).analyticsConnectors;
  state.searchConsoleProperties ??= cloneState(initialAppDataState).searchConsoleProperties;
  state.searchConsoleMetrics ??= cloneState(initialAppDataState).searchConsoleMetrics;
  state.analyticsSnapshots ??= cloneState(initialAppDataState).analyticsSnapshots;
  state.experimentDecisions ??= cloneState(initialAppDataState).experimentDecisions;
  state.learningCards ??= cloneState(initialAppDataState).learningCards;
  state.batchApprovalPackages ??= cloneState(initialAppDataState).batchApprovalPackages;
  state.batchApprovalItems ??= cloneState(initialAppDataState).batchApprovalItems;
  state.jobSchedules ??= cloneState(initialAppDataState).jobSchedules;
  state.jobRuns ??= cloneState(initialAppDataState).jobRuns;
  state.opportunityHunts ??= [];
  state.businessProposals ??= [];
  state.approvedBusinesses ??= [];
  state.businessTasks ??= [];
  state.agentWorkSessions ??= [];
  state.guildOfficeStations ??= cloneState(initialAppDataState).guildOfficeStations;
  state.researchEvidence ??= [];
  state.productionDestinations ??= [];
  state.contentInventoryItems ??= [];
  state.autonomousImprovementRuns ??= [];
  state.agentPerformanceMemories ??= cloneState(initialAppDataState).agentPerformanceMemories;
  state.skillGapRequests ??= cloneState(initialAppDataState).skillGapRequests;
  state.publishingConnectors ??= cloneState(initialAppDataState).publishingConnectors;
  state.spendEntries ??= cloneState(initialAppDataState).spendEntries;
  state.revenueRecords ??= cloneState(initialAppDataState).revenueRecords;
  state.portfolioScores ??= cloneState(initialAppDataState).portfolioScores;
  state.externalActionLock ??= cloneState(initialAppDataState).externalActionLock;
  state.openClawMcpServers ??= cloneState(initialAppDataState).openClawMcpServers;
  state.approvalDecisionRecords ??= [];
  state.allowlistEntries = safetyPolicyService.migrateSettingsAllowlists(state.userSettings, state.allowlistEntries ?? []);
  for (const request of state.approvalRequests) {
    if (!request.payload || request.safetyEvaluation) continue;
    request.payloadSnapshot = request.payloadSnapshot ?? request.payload;
    request.safetyEvaluation = safetyPolicyService.evaluateOpenClawPayload(request.payload, {
      allowlistEntries: state.allowlistEntries,
      userSettings: state.userSettings,
    });
    if (!request.safetyEvaluation.allowed && request.status === "pending") {
      request.status = "blocked";
      request.blockedExplanation = request.safetyEvaluation.blockedReasons.join(" ");
    }
  }
  for (const command of state.openClawCommands) {
    if (!command.actionKind || command.safetyEvaluation) continue;
    const request = state.approvalRequests.find((item) => item.commandId === command.id);
    command.safetyEvaluation = request?.safetyEvaluation;
  }
}

export const persistenceService = {
  async loadState(): Promise<{ state: AppDataState; adapter: StorageAdapter }> {
    const db = await getSqlDatabase();
    if (db) {
      const state = await loadSqlState(db);
      normalizePhase6BState(state);
      if (markInterruptedCommands(state)) {
        await saveSqlState(db, state);
      } else {
        await saveSqlState(db, state);
      }
      return { state, adapter: "tauri-sqlite" };
    }

    const state = loadBrowserState();
    normalizePhase6BState(state);
    if (markInterruptedCommands(state)) {
      saveBrowserState(state);
    } else {
      saveBrowserState(state);
    }
    return { state, adapter: "browser-local-storage" };
  },

  async saveState(state: AppDataState): Promise<StorageAdapter> {
    const db = await getSqlDatabase();
    if (db) {
      await migrate(db);
      await saveSqlState(db, state);
      return "tauri-sqlite";
    }

    saveBrowserState(state);
    return "browser-local-storage";
  },

  async resetState(): Promise<AppDataState> {
    const state = cloneState(initialAppDataState);
    await this.saveState(state);
    return state;
  },
};
