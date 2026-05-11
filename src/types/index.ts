export type RiskLevel = "low" | "medium" | "high" | "critical";
export type AgentStatus = "active" | "paused" | "blocked" | "reviewing" | "idle";
export type BusinessModel =
  | "Content websites"
  | "Affiliate marketing"
  | "Digital products"
  | "Templates"
  | "Micro-SaaS"
  | "Newsletters"
  | "Lead generation"
  | "Online services"
  | "Automation products"
  | "SEO projects"
  | "Social media content engines";

export type QuestStage =
  | "Idea discovered"
  | "Researching"
  | "Validation required"
  | "Test campaign"
  | "Production"
  | "Publishing approval"
  | "SEO growth"
  | "Monetization"
  | "Optimization"
  | "Scaling"
  | "Retired"
  | "Failed"
  | "Archived";

export type QuestType =
  | "Research quest"
  | "Validation quest"
  | "Content quest"
  | "SEO quest"
  | "Production quest"
  | "Publishing quest"
  | "Monetization quest"
  | "Optimization quest"
  | "Scaling quest"
  | "Maintenance quest";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "blocked" | "not_required";
export type ApprovalRequestType =
  | "Spend money"
  | "Publish externally"
  | "Launch experiment"
  | "Install new capability"
  | "Run automation"
  | "Archive failed idea"
  | "Scale successful idea"
  | "Connect OpenClaw capability"
  | "Execute OpenClaw external command"
  | "Run OpenClaw local agent turn"
  | "Start TeamLeader mission"
  | "Run approved URL research"
  | "Send approved channel message"
  | "Start OpenClaw gateway";

export type OpenClawActionKind = "gateway_start" | "agent_turn" | "mission_start" | "url_research" | "channel_message";
export type OpenClawExecutionMode = "mock" | "real_local" | "dry_run";
export type OpenClawMcpServerKind = "filesystem" | "memory" | "fetch" | "browser";
export type OpenClawMcpServerStatus = "configured" | "installed" | "needs_install" | "disabled" | "error" | "safe_public_read";
export type OpenClawMcpSafetyMode = "direct_local" | "approval_gated" | "deferred" | "brokered";
export type SafetyRiskFlag =
  | "requires_approval"
  | "external_action"
  | "approved_url_research"
  | "channel_message"
  | "dry_run_required"
  | "blocked_intent"
  | "malformed_url"
  | "credential_url"
  | "wildcard_url"
  | "private_host"
  | "unapproved_domain"
  | "malformed_target"
  | "broadcast_target"
  | "batch_target"
  | "unapproved_target"
  | "capability_not_allowed";
export type SafetyRecommendedDecision = "approve_with_caution" | "review" | "reject" | "block";
export type AllowlistKind = "research_domain" | "channel_target" | "openclaw_capability";
export type AllowlistStatus = "active" | "paused" | "removed";
export type ApprovalDecisionType = "created" | "approved" | "rejected" | "blocked" | "cancelled" | "failed_safe" | "retry_created";
export type AgentOrchestrationStatus =
  | "draft"
  | "assigned"
  | "in_progress"
  | "teamleader_review"
  | "accepted"
  | "needs_revision"
  | "rejected"
  | "archived";
export type AgentArtifactType =
  | "mission_brief"
  | "research_brief"
  | "seo_map"
  | "content_brief"
  | "draft"
  | "asset_plan"
  | "publish_checklist"
  | "ops_checklist"
  | "teamleader_summary";
export type AgentRunReviewStatus = "accepted" | "needs_revision" | "rejected";
export type RealPilotStatus =
  | "draft"
  | "research_requested"
  | "research_complete"
  | "teamleader_review_requested"
  | "test_plan_ready"
  | "exported"
  | "failed";
export type MarketReportStatus = "draft" | "ready" | "needs_more_sources" | "blocked";
export type ResearchSourceCaptureStatus = "pending_approval" | "captured" | "failed" | "blocked" | "manual";
export type SeoKeywordClusterStatus = "draft" | "needs_sources" | "ready_for_brief" | "blocked";
export type DemandProofStatus = "draft" | "needs_more_evidence" | "ready_for_validation" | "blocked";
export type ExperimentRecommendation = "continue" | "revise" | "kill" | "scale_later";
export type ProductionAssetType =
  | "landing_page"
  | "content_brief"
  | "article_draft"
  | "lead_magnet"
  | "template"
  | "newsletter_issue"
  | "product_draft";
export type ProductionAssetStatus = "draft" | "claim_review" | "ready_for_user_review" | "approved_local" | "blocked";
export type ProductionPackStatus = "draft" | "ready_for_review" | "needs_revision" | "approved_local" | "blocked";
export type SiteProjectStatus = "draft" | "local_ready" | "publishing_locked" | "published" | "archived";
export type StaticSiteFramework = "astro" | "next" | "hugo" | "plain_markdown";
export type ContentItemType = "article" | "comparison" | "review" | "landing_page" | "disclosure" | "pillar";
export type ContentItemStatus = "brief" | "draft" | "review" | "approved_local" | "diff_ready" | "published" | "blocked";
export type PublishingDiffStatus = "draft" | "ready_for_approval" | "approved" | "published" | "blocked";
export type AffiliateOfferStatus = "candidate" | "claim_review" | "approved_local" | "blocked" | "archived";
export type OfferClaimReviewStatus = "passed" | "needs_revision" | "blocked";
export type AnalyticsConnectorType = "google_search_console";
export type AnalyticsConnectorStatus = "not_connected" | "needs_auth" | "connected" | "sync_error";
export type BatchApprovalStatus = "draft" | "pending" | "approved" | "rejected" | "expired" | "cancelled";
export type BatchApprovalItemStatus = "pending" | "approved" | "rejected" | "executed" | "skipped";
export type JobScheduleType = "gsc_sync" | "report_generation" | "static_repo_check" | "approved_research_batch" | "obsidian_export";
export type JobScheduleStatus = "active" | "paused" | "blocked";
export type JobRunStatus = "queued" | "running" | "success" | "failed" | "blocked";
export type SkillGapStatus = "open" | "approved" | "blocked" | "learned";
export type PublishingConnectorType = "static_site" | "wordpress" | "newsletter" | "social";
export type PublishingConnectorStatus = "available" | "needs_auth" | "disabled" | "blocked";
export type SpendStatus = "planned" | "approved" | "rejected" | "recorded";
export type PortfolioRecommendation = "kill" | "revise" | "pause" | "continue" | "scale_later" | "archive";
export type MissionTaskType = "research" | "content" | "validation" | "production" | "publishing" | "analytics" | "review";
export type MissionTaskStatus = "queued" | "in_progress" | "blocked" | "ready_for_review" | "done" | "cancelled";
export type MissionArtifactType =
  | "source_capture"
  | "research_report"
  | "keyword_map"
  | "content_brief"
  | "draft_page"
  | "validation_report"
  | "experiment_plan"
  | "analytics_snapshot"
  | "decision_record"
  | "publishing_diff";
export type MissionArtifactStatus = "draft" | "ready_for_review" | "approved_local" | "blocked" | "archived";
export type CommandLedgerStatus = "planned" | "approval_required" | "approved" | "running" | "completed" | "failed" | "blocked" | "cancelled";
export type CommandConnector = "openclaw" | "mission_control" | "obsidian" | "static_site" | "analytics" | "manual";
export type ApprovalMode = "not_required" | "single" | "batch";
export type ExternalActionLockMode = "locked" | "approval_only" | "batch_approval_enabled";
export type MissionDraftStatus = "draft" | "approval_requested" | "started" | "archived";
export type MissionRunStatus = "awaiting_approval" | "running" | "paused" | "complete" | "failed" | "cancelled";
export type MissionAgentStepStatus = "queued" | "running" | "complete" | "failed" | "skipped" | "local_draft";
export type OpportunityHuntStatus =
  | "planning"
  | "researching"
  | "agents_drafting"
  | "teamleader_review"
  | "ready_to_review"
  | "approved_as_business"
  | "rejected";
export type BusinessProposalStatus = "drafting" | "ready_for_review" | "approved" | "revision_requested" | "rejected";
export type ApprovedBusinessStatus = "active" | "paused" | "revising" | "archived";
export type BusinessTaskStatus = "now_working" | "queued" | "blocked" | "needs_approval" | "done";
export type AgentWorkSessionStatus = "idle" | "working" | "researching" | "writing" | "production" | "blocked" | "review";
export type AgentWorkMotion = "idle" | "pulse" | "research_beam" | "forge" | "blocked" | "review";
export type ProductionDestinationType = "static_website" | "newsletter" | "blog_cms" | "social_post" | "marketplace_product_page" | "manual_no_connector";
export type ProductionDestinationStatus = "local_draft" | "ready_for_review" | "needs_approval" | "blocked";
export type ContentInventoryStatus = "brief" | "draft" | "ready_for_review" | "approved_local" | "blocked";
export type AutonomousImprovementRunStatus = "running" | "paused" | "blocked" | "complete";
export type BudgetRisk = "within_cap" | "needs_spend_approval" | "over_cap" | "over_remaining" | "missing";
export type PlatformPublishStatus = "local_draft" | "ready_for_approval" | "approval_requested" | "approved" | "blocked";
export type ReadinessStatus = "passed" | "missing" | "needs_review" | "blocked";
export type OpportunityHuntDepth = "quick" | "fast" | "deep";
export type PublicResearchRunStatus = "queued" | "running" | "completed" | "failed" | "blocked";
export type PublicResearchFetchStatus = "queued" | "fetched" | "failed" | "blocked" | "skipped";
export type BrowserResearchStatus = "queued" | "captured" | "failed" | "blocked" | "skipped";
export type BrowserResearchArtifactType = "page_summary" | "screenshot";
export type CandidateBusinessStatus = "candidate" | "winner" | "rejected" | "archived";
export type BusinessOperatingRunStatus = "running" | "paused" | "complete" | "blocked";
export type BusinessIterationPhase = "research" | "validate" | "produce" | "review" | "improve";
export type BusinessIterationStatus = "queued" | "running" | "complete" | "blocked";
export type ExecutionReceiptStatus = "success" | "warning" | "blocked" | "failed" | "pending";
export type RealityMode =
  | "real_local"
  | "real_public_read"
  | "local_draft"
  | "simulated"
  | "mock_seed_data"
  | "pending_external_approval"
  | "external_action_blocked";
export type RealitySourceType =
  | "teamleader_command"
  | "agent_task"
  | "research"
  | "product"
  | "approval"
  | "command"
  | "business"
  | "system";
export type EvidenceQualityGrade = "strong" | "moderate" | "weak" | "unsupported";
export type LocalAssetFileType = "fiverr_gig" | "landing_page" | "article" | "newsletter" | "template" | "sop" | "obsidian_pack";
export type LocalAssetFileStatus = "planned" | "preview_only" | "written" | "blocked";
export type PublishingPackageStatus = "local_draft" | "ready_for_approval" | "approval_requested" | "blocked";
export type BudgetLedgerEntryType = "planned_spend" | "approved_spend" | "actual_spend" | "revenue" | "time_cost" | "adjustment";
export type AutopilotJobType = "research_refresh" | "content_update" | "metric_reminder" | "improvement_proposal" | "local_asset_refresh";
export type AutopilotJobStatus = "queued" | "running" | "completed" | "paused" | "blocked" | "failed";
export type ProductBlueprintType = "fiverr_gig" | "landing_page" | "article" | "newsletter" | "template" | "sop" | "obsidian_pack";
export type ProductPreviewStatus = "needs_product_review" | "local_draft_approved" | "revision_requested" | "blocked";
export type ProductPreviewSectionKind =
  | "overview"
  | "full_draft"
  | "platform_fields"
  | "assets"
  | "claims_safety"
  | "publishing_preview"
  | "revision_requests";
export type ProductDraftApprovalStatus = "not_reviewed" | "approved_local" | "revision_requested";
export type ProductRevisionStatus = "open" | "in_progress" | "resolved";
export type PublishPayloadPreviewStatus = "frozen" | "stale" | "blocked";
export type ApprovalGateKind = "publish" | "spend" | "message" | "launch" | "connector";
export type ApprovalGateStateStatus =
  | "locked"
  | "needs_product_review"
  | "ready_to_request_approval"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "blocked";
export type MissionBriefSectionKind =
  | "overview"
  | "research"
  | "seo"
  | "content"
  | "production"
  | "validation"
  | "experiment"
  | "risks"
  | "approvals"
  | "logs";
export type MissionAgentId =
  | "teamleader1a"
  | "agent-researcher"
  | "agent-seo"
  | "agent-writer"
  | "agent-content"
  | "agent-production"
  | "agent-publish"
  | "agent-action";

export interface Skill {
  id: string;
  name: string;
  category: "research" | "seo" | "writing" | "production" | "publishing" | "operations" | "strategy" | "memory";
  level: number;
  description: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  archetype: string;
  icon: string;
  level: number;
  xp: number;
  xpToNext: number;
  skills: Skill[];
  currentTask: string;
  status: AgentStatus;
  workload: number;
  recentContribution: string;
  performanceScore: number;
  assignedQuestIds: string[];
  suggestedSkillUpgrades: string[];
  openClawProfileId?: string;
  openClawWorkspace?: string;
  openClawModel?: string;
  openClawBindings?: number;
  lastRuntimeSyncAt?: string;
}

export interface OpportunityHunt {
  id: string;
  title: string;
  objective: string;
  sourcePrompt: string;
  status: OpportunityHuntStatus;
  currentPhase: string;
  depth: OpportunityHuntDepth;
  zeroBudget: boolean;
  sourcePack: "broad_public_web";
  assignedAgentIds: MissionAgentId[];
  businessProposalId?: string;
  publicResearchRunId?: string;
  candidateIdeaIds?: string[];
  evidenceCitationIds?: string[];
  executionReceipt?: string;
  taskIds: string[];
  evidenceIds: string[];
  createdFromChatMessageId?: string;
  startedAt: string;
  updatedAt: string;
}

export interface ResearchSourcePack {
  id: string;
  name: string;
  category: "demand" | "seo" | "marketplace" | "production" | "platform" | "community";
  description: string;
  urls: Array<{
    url: string;
    title: string;
    sourceType: ResearchEvidence["sourceType"];
    candidateHint?: string;
  }>;
  safetyNotes: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicResearchRun {
  id: string;
  huntId: string;
  depth: OpportunityHuntDepth;
  status: PublicResearchRunStatus;
  sourcePackIds: string[];
  fetchIds: string[];
  browserResearchRunId?: string;
  evidenceCitationIds: string[];
  candidateIdeaIds: string[];
  startedAt: string;
  completedAt?: string;
  summary: string;
  executionReceipt: string;
}

export interface PublicResearchFetch {
  id: string;
  runId: string;
  sourcePackId: string;
  url: string;
  status: PublicResearchFetchStatus;
  httpStatus?: number;
  title?: string;
  excerpt?: string;
  error?: string;
  browserResearchFetchId?: string;
  startedAt: string;
  completedAt?: string;
}

export interface BrowserSafetyReceipt {
  id: string;
  runId: string;
  url: string;
  allowed: boolean;
  blockedReasons: string[];
  safetyChecklist: string[];
  receipt: string;
  createdAt: string;
}

export interface BrowserResearchRun {
  id: string;
  huntId: string;
  publicResearchRunId: string;
  depth: OpportunityHuntDepth;
  status: PublicResearchRunStatus;
  fetchIds: string[];
  artifactIds: string[];
  safetyReceiptIds: string[];
  startedAt: string;
  completedAt?: string;
  summary: string;
  executionReceipt: string;
}

export interface BrowserResearchFetch {
  id: string;
  runId: string;
  sourcePackId?: string;
  url: string;
  status: BrowserResearchStatus;
  title?: string;
  excerpt?: string;
  screenshotPath?: string;
  screenshotCaptured: boolean;
  basicLinks: string[];
  error?: string;
  safetyReceiptId?: string;
  startedAt: string;
  completedAt?: string;
}

export interface BrowserResearchArtifact {
  id: string;
  runId: string;
  fetchId: string;
  huntId: string;
  proposalId?: string;
  type: BrowserResearchArtifactType;
  url: string;
  title: string;
  summary: string;
  screenshotPath?: string;
  safetyReceiptId?: string;
  createdAt: string;
}

export interface BrowserBrokerStatus {
  ok: boolean;
  status: "active" | "text_only" | "degraded" | "browser_preview";
  browserProgram: string;
  browserFound: boolean;
  artifactDir: string;
  artifactDirWritable: boolean;
  safetyMode: string;
  directControlDisabled: boolean;
  lastCheckedAt: string;
  notes: string;
}

export interface EvidenceCitation {
  id: string;
  huntId: string;
  researchRunId: string;
  sourcePackId?: string;
  fetchId?: string;
  candidateId?: string;
  title: string;
  url: string;
  sourceType: ResearchEvidence["sourceType"];
  summary: string;
  excerpt?: string;
  browserArtifactIds?: string[];
  confidence: number;
  capturedAt: string;
}

export interface CandidateScorecard {
  id: string;
  huntId: string;
  candidateId: string;
  demandScore: number;
  seoScore: number;
  zeroBudgetScore: number;
  productionScore: number;
  platformRiskScore: number;
  evidenceScore: number;
  totalScore: number;
  notes: string[];
}

export interface CandidateBusinessIdea {
  id: string;
  huntId: string;
  researchRunId: string;
  rank: number;
  status: CandidateBusinessStatus;
  title: string;
  businessModel: BusinessModel;
  audience: string;
  summary: string;
  zeroBudgetPath: string;
  platformNeeds: string[];
  evidenceCitationIds: string[];
  scorecardId: string;
  whyItMightWin: string[];
  whyItMightLose: string[];
  nextValidationStep: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchEvidence {
  id: string;
  huntId?: string;
  proposalId?: string;
  businessId?: string;
  agentId: MissionAgentId;
  title: string;
  url: string;
  sourceType: "public_web" | "forum" | "marketplace" | "competitor" | "search_signal" | "directory";
  summary: string;
  confidence: number;
  capturedAt: string;
}

export interface ProductionDestination {
  id: string;
  proposalId?: string;
  businessId?: string;
  type: ProductionDestinationType;
  name: string;
  connector: "none" | "static_site" | "wordpress" | "newsletter" | "social" | "marketplace";
  status: ProductionDestinationStatus;
  approvalRequired: boolean;
  description: string;
  publishingRules: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetPlan {
  id: string;
  currency: "USD";
  portfolioStartingCapital: number;
  portfolioRemainingCapital: number;
  businessBudgetCap: number;
  requiredSpend: number;
  recommendedSpend: number;
  zeroBudgetPath: string;
  breakEvenEstimate: string;
  spendApprovalRequired: boolean;
  budgetRisk: BudgetRisk;
  approvalBlockers: string[];
  assumptions: string[];
}

export interface ExternalPlatformRequirement {
  id: string;
  proposalId?: string;
  businessId?: string;
  platform: string;
  accountNeeded: boolean;
  userLoginRequired: boolean;
  credentialsStored: boolean;
  requiredAssets: string[];
  publishStatus: PlatformPublishStatus;
  approvalRequiredBeforePublish: boolean;
  blockedActions: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformExecutionPackage {
  id: string;
  proposalId?: string;
  businessId?: string;
  platform: string;
  title: string;
  status: PlatformPublishStatus;
  actionLabel: string;
  userLoginRequired: boolean;
  exactFields: Record<string, string>;
  requiredAssets: string[];
  policyChecks: string[];
  approvalBoundary: string;
  approvalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentInventoryItem {
  id: string;
  proposalId?: string;
  businessId?: string;
  destinationId?: string;
  title: string;
  type: ContentItemType | "email" | "social_post" | "product_page";
  status: ContentInventoryStatus;
  summary: string;
  draftContent: string;
  createdByAgentId: MissionAgentId;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProposal {
  id: string;
  huntId: string;
  title: string;
  recommendedIdea: string;
  summary: string;
  businessModel: BusinessModel;
  targetAudience: string;
  whyMightWork: string[];
  whyMightFail: string[];
  evidenceIds: string[];
  seoPlan: string[];
  contentPlan: string[];
  productionPlan: string[];
  publishingDestinationIds: string[];
  contentInventoryIds: string[];
  budgetPlan: BudgetPlan;
  externalPlatformRequirementIds: string[];
  platformExecutionPackageIds: string[];
  publicResearchRunId?: string;
  candidateIdeaIds?: string[];
  winningCandidateId?: string;
  evidenceCitationIds?: string[];
  readinessChecklist: Array<{ label: string; status: ReadinessStatus; detail: string }>;
  qualityScore: number;
  missingRequirements: string[];
  zeroBudgetValidationTest: string;
  successMetrics: string[];
  failureMetrics: string[];
  risks: string[];
  validationScore: number;
  nextActions: string[];
  teamLeaderRecommendation: string;
  status: BusinessProposalStatus;
  questId?: string;
  approvedBusinessId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovedBusiness {
  id: string;
  proposalId: string;
  questId?: string;
  name: string;
  status: ApprovedBusinessStatus;
  stage: QuestStage | "Autonomous improvement";
  teamLeaderRecommendation: string;
  validationScore: number;
  assignedAgentIds: MissionAgentId[];
  activeTaskIds: string[];
  productionAssetIds: string[];
  publishingDestinationIds: string[];
  contentInventoryIds: string[];
  researchEvidenceIds: string[];
  budgetPlan: BudgetPlan;
  externalPlatformRequirementIds: string[];
  platformExecutionPackageIds: string[];
  readinessChecklist: Array<{ label: string; status: ReadinessStatus; detail: string }>;
  risks: string[];
  nextAction: string;
  dailyStatusId?: string;
  realityReceiptId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessTask {
  id: string;
  huntId?: string;
  proposalId?: string;
  businessId?: string;
  agentId: MissionAgentId;
  title: string;
  objective: string;
  status: BusinessTaskStatus;
  progress: number;
  currentArtifact: string;
  currentSource?: string;
  dependency?: string;
  expectedOutput: string;
  approvalRequired: boolean;
  logs: string[];
  evidenceTrailId?: string;
  realityReceiptId?: string;
  startedAt?: string;
  updatedAt: string;
  completedAt?: string;
}

export interface AgentWorkSession {
  id: string;
  agentId: MissionAgentId;
  huntId?: string;
  proposalId?: string;
  businessId?: string;
  taskId?: string;
  stationId: string;
  status: AgentWorkSessionStatus;
  motion: AgentWorkMotion;
  currentTask: string;
  currentOutput: string;
  currentSource?: string;
  progress: number;
  startedAt: string;
  updatedAt: string;
}

export interface GuildOfficeStation {
  id: string;
  name: string;
  room: string;
  agentId: MissionAgentId;
  status: AgentWorkSessionStatus;
  motion: AgentWorkMotion;
  currentTask: string;
  lastOutput: string;
  progress: number;
  taskId?: string;
  updatedAt: string;
}

export interface AutonomousImprovementRun {
  id: string;
  businessId: string;
  status: AutonomousImprovementRunStatus;
  currentFocus: string;
  safeAutonomousActions: string[];
  approvalLockedActions: string[];
  taskIds: string[];
  lastTeamLeaderSummary: string;
  startedAt: string;
  updatedAt: string;
}

export interface ApprovedBusinessCockpit {
  id: string;
  businessId: string;
  objective: string;
  currentStage: string;
  operatingRunIds: string[];
  iterationIds: string[];
  agentArtifactIds: string[];
  executionReceiptIds: string[];
  metricSnapshotIds: string[];
  budgetLedgerEntryIds: string[];
  productionAssetIds: string[];
  localAssetFileIds: string[];
  publishingPackageIds: string[];
  autopilotJobIds: string[];
  nextBestActions: string[];
  healthScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessOperatingRun {
  id: string;
  businessId: string;
  status: BusinessOperatingRunStatus;
  currentCycle: BusinessIterationPhase;
  cycleNumber: number;
  iterationIds: string[];
  taskIds: string[];
  receiptIds: string[];
  summary: string;
  nextAction: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BusinessIteration {
  id: string;
  businessId: string;
  runId: string;
  cycleNumber: number;
  phase: BusinessIterationPhase;
  status: BusinessIterationStatus;
  agentId: MissionAgentId;
  objective: string;
  output: string;
  evidenceIds: string[];
  artifactIds: string[];
  receiptIds: string[];
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ExecutionReceipt {
  id: string;
  businessId?: string;
  proposalId?: string;
  taskId?: string;
  agentId?: MissionAgentId;
  actionType: string;
  title: string;
  summary: string;
  source?: string;
  artifactIds: string[];
  budgetEffect: string;
  externalAction: boolean;
  approvalRequired: boolean;
  status: ExecutionReceiptStatus;
  nextAction: string;
  realityReceiptId?: string;
  createdAt: string;
}

export interface RealityReceipt {
  id: string;
  mode: RealityMode;
  sourceType: RealitySourceType;
  sourceId: string;
  title: string;
  summary: string;
  whatHappened: string[];
  whatDidNotHappen: string[];
  linkedPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchQueryPlan {
  id: string;
  huntId?: string;
  businessId?: string;
  prompt: string;
  depth: OpportunityHuntDepth;
  queries: string[];
  sourcePackIds: string[];
  blockedTerms: string[];
  safeMode: "public_read_only";
  createdAt: string;
}

export interface OpportunityCandidate {
  id: string;
  huntId?: string;
  businessId?: string;
  title: string;
  summary: string;
  score: number;
  reasons: string[];
  riskFlags: string[];
  sourceIds: string[];
  status: CandidateBusinessStatus;
  createdAt: string;
}

export interface EvidenceQualityScore {
  id: string;
  evidenceId?: string;
  citationId?: string;
  source: string;
  credibility: number;
  freshness: number;
  relevance: number;
  confidence: number;
  grade: EvidenceQualityGrade;
  notes: string[];
  createdAt: string;
}

export interface LocalAssetFile {
  id: string;
  businessId: string;
  productionAssetId?: string;
  title: string;
  type: LocalAssetFileType;
  platform: string;
  intendedPath: string;
  fileName: string;
  content: string;
  status: LocalAssetFileStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublishingPackage {
  id: string;
  businessId: string;
  destinationId?: string;
  platform: string;
  title: string;
  status: PublishingPackageStatus;
  localAssetFileIds: string[];
  approvalBoundary: string;
  requiredUserSteps: string[];
  connectorActionsBlocked: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductBlueprint {
  id: string;
  businessId: string;
  proposalId: string;
  name: string;
  productType: ProductBlueprintType;
  audience: string;
  problemSolved: string;
  offerDeliverable: string;
  valueProposition: string;
  intendedDestination: string;
  zeroBudgetDeliveryPath: string;
  stage: "local_draft" | "review" | "ready_for_publish_request" | "blocked";
  readinessScore: number;
  requiredAssetIds: string[];
  blockedExternalActions: string[];
  nextProductionStep: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPreview {
  id: string;
  blueprintId: string;
  businessId: string;
  proposalId: string;
  destinationId?: string;
  platformPackageId?: string;
  publishingPackageId?: string;
  status: ProductPreviewStatus;
  localDraftApproved: boolean;
  sectionIds: string[];
  assetFileIds: string[];
  claimsSafetyStatus: ReadinessStatus;
  missingItems: string[];
  readinessScore: number;
  renderedPreviewIds?: string[];
  realityReceiptId?: string;
  approvalGateStateId?: string;
  publishPayloadPreviewId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenderedProductPreview {
  id: string;
  previewId: string;
  businessId: string;
  mode: "fiverr_mockup" | "landing_page" | "article" | "newsletter" | "template_sop" | "obsidian_proof_pack";
  title: string;
  summary: string;
  renderedHtml?: string;
  textPreview: string;
  sourceSectionIds: string[];
  filePath?: string;
  status: "draft" | "ready" | "blocked";
  realityReceiptId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRevisionDiff {
  id: string;
  previewId: string;
  businessId: string;
  fromRevisionLabel: string;
  toRevisionLabel: string;
  summary: string;
  changedSections: string[];
  createdAt: string;
}

export interface ProductPreviewSection {
  id: string;
  previewId: string;
  kind: ProductPreviewSectionKind;
  title: string;
  summary: string;
  content: string;
  fields?: Record<string, string>;
  status: ReadinessStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDraftApproval {
  id: string;
  previewId: string;
  businessId: string;
  status: ProductDraftApprovalStatus;
  note: string;
  revisionRequestId?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRevisionRequest {
  id: string;
  previewId: string;
  businessId: string;
  requestedBy: "user" | "TeamLeader1A";
  reason: string;
  taskIds: string[];
  status: ProductRevisionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublishPayloadPreview {
  id: string;
  previewId: string;
  businessId: string;
  platform: string;
  destinationId?: string;
  platformPackageId?: string;
  exactFields: Record<string, string>;
  contentSummary: string;
  userLoginRequired: boolean;
  credentialsStored: boolean;
  whatWillNotHappen: string[];
  rollbackNotes: string[];
  budgetBoundary: string;
  status: PublishPayloadPreviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalGateState {
  id: string;
  businessId: string;
  previewId?: string;
  approvalId?: string;
  publishPayloadPreviewId?: string;
  gate: ApprovalGateKind;
  status: ApprovalGateStateStatus;
  label: string;
  reason: string;
  actionLabel: string;
  linkedPath: string;
  actionHintIds?: string[];
  realityReceiptId?: string;
  updatedAt: string;
}

export interface AgentEvidenceTrail {
  id: string;
  businessId?: string;
  proposalId?: string;
  huntId?: string;
  commandMessageId?: string;
  agentId: MissionAgentId | "TeamLeader1A";
  title: string;
  summary: string;
  itemIds: string[];
  status: "complete" | "partial" | "failed" | "running";
  realityMode: RealityMode;
  createdAt: string;
  updatedAt: string;
}

export interface AgentEvidenceItem {
  id: string;
  trailId: string;
  agentId: MissionAgentId | "TeamLeader1A";
  inputPrompt: string;
  outputArtifact: string;
  citationIds: string[];
  logRefs: string[];
  nextHandoffAgent?: MissionAgentId | "TeamLeader1A";
  realityMode: RealityMode;
  createdAt: string;
}

export interface ApprovalActionHint {
  id: string;
  gateId?: string;
  approvalId?: string;
  businessId?: string;
  previewId?: string;
  lane: "pending" | "ready_to_request" | "locked" | "blocked";
  title: string;
  why: string;
  missing: string[];
  fixPath: string;
  expectedAfterFix: string;
  realityMode: RealityMode;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDailyStatus {
  id: string;
  businessId: string;
  todaysObjective: string;
  currentExperiment: string;
  activeTaskIds: string[];
  latestEvidenceIds: string[];
  latestProductPreviewId?: string;
  metricSnapshotId?: string;
  budgetLedgerEntryIds: string[];
  lastDecisionId?: string;
  nextBestAction: string;
  realityReceiptId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessOperatingDecision {
  id: string;
  businessId: string;
  decision: "continue" | "revise" | "pause" | "kill" | "scale_later";
  rationale: string;
  metricSnapshotId?: string;
  budgetEffect: string;
  requiresExternalApproval: boolean;
  approvalId?: string;
  createdAt: string;
}

export interface ReleasePublishStatus {
  id: string;
  version: string;
  gitCommit?: string;
  gitTag?: string;
  signedArtifacts: string[];
  latestJsonPath?: string;
  githubReleaseUrl?: string;
  uploadStatus: "not_started" | "prepared" | "blocked_auth" | "uploaded" | "verified" | "failed";
  updaterVerified: boolean;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessMetricSnapshot {
  id: string;
  businessId: string;
  traffic: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  cost: number;
  timeSpentHours: number;
  confidence: number;
  notes: string;
  createdAt: string;
}

export interface BudgetLedgerEntry {
  id: string;
  businessId: string;
  type: BudgetLedgerEntryType;
  amount: number;
  currency: "USD";
  description: string;
  approvalId?: string;
  createdAt: string;
}

export interface AutopilotJob {
  id: string;
  businessId: string;
  type: AutopilotJobType;
  status: AutopilotJobStatus;
  safeAutonomous: boolean;
  approvalRequired: boolean;
  title: string;
  result: string;
  runAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  questId?: string;
  startingCapital: number;
  allocated: number;
  spent: number;
  reserved: number;
  revenue: number;
  currency: "USD";
}

export interface Metric {
  id: string;
  label: string;
  value: string | number;
  target?: string | number;
  trend: "up" | "down" | "flat";
  status: "healthy" | "watch" | "blocked";
}

export interface BusinessIdea {
  id: string;
  title: string;
  summary: string;
  model: BusinessModel;
  targetAudience: string;
  problemSolved: string;
  monetizationMethod: string;
  trafficPlan: string;
  evidenceOfDemand: string[];
  assumptions: string[];
  riskLevel: RiskLevel;
  status: "new" | "researching" | "validating" | "testing" | "killed" | "promoted";
  createdAt: string;
  updatedAt: string;
}

export interface ValidationChecklistItem {
  id: string;
  label: string;
  status: "passed" | "missing" | "needs_review";
  evidence: string;
}

export interface ValidationReport {
  id: string;
  questId: string;
  score: number;
  status: "blocked" | "needs_more_evidence" | "ready_for_test" | "validated";
  checklist: ValidationChecklistItem[];
  whyItMightWork: string;
  whyItMightFail: string;
  supportingEvidence: string[];
  unprovenAssumptions: string[];
  minimumTest: string;
  budgetNeeded: number;
  successDefinition: string;
  killCriteria: string;
  teamLeaderRecommendation: string;
  userApprovalRequired: boolean;
}

export interface Experiment {
  id: string;
  questId: string;
  title: string;
  hypothesis: string;
  status: "planned" | "running" | "paused" | "complete" | "failed";
  budgetCap: number;
  metrics: Metric[];
  startDate: string;
  endDate?: string;
  learning: string;
}

export interface DemandSignal {
  id: string;
  source: string;
  signal: string;
  strength: "weak" | "moderate" | "strong";
  citation?: string;
}

export interface CompetitorSnapshot {
  id: string;
  name: string;
  url?: string;
  positioning: string;
  pricing?: string;
  gap: string;
  riskNotes: string;
}

export interface KeywordOpportunity {
  id: string;
  keyword: string;
  intent: "informational" | "commercial" | "transactional" | "local" | "comparison";
  difficulty: "low" | "medium" | "high";
  confidence: number;
  contentAngle: string;
}

export interface MarketIntelligenceReport {
  id: string;
  questId: string;
  title: string;
  status: MarketReportStatus;
  sourceUrls: string[];
  demandSignals: DemandSignal[];
  competitorSnapshots: CompetitorSnapshot[];
  keywordOpportunities: KeywordOpportunity[];
  evidenceScore: number;
  citationNotes: string[];
  risks: string[];
  recommendedNextStep: string;
  teamLeaderSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchSourceCapture {
  id: string;
  questId: string;
  reportId?: string;
  url: string;
  title: string;
  statusCode?: number;
  status: ResearchSourceCaptureStatus;
  captureMode: "approved_url" | "manual" | "imported";
  evidenceSummary: string;
  citation: string;
  riskNotes: string;
  approvalId?: string;
  commandId?: string;
  capturedAt: string;
}

export interface SeoKeywordCluster {
  id: string;
  questId: string;
  reportId?: string;
  name: string;
  intent: KeywordOpportunity["intent"];
  keywords: string[];
  targetAudience: string;
  contentAngle: string;
  monetizationFit: "low" | "medium" | "high";
  evidenceScore: number;
  status: SeoKeywordClusterStatus;
  sourceCaptureIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DemandProofReport {
  id: string;
  questId: string;
  title: string;
  status: DemandProofStatus;
  sourceCaptureIds: string[];
  keywordClusterIds: string[];
  evidenceScore: number;
  demandSummary: string;
  competitorGaps: string[];
  assumptions: string[];
  recommendedNextStep: string;
  teamLeaderRecommendation: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentAnalysis {
  id: string;
  experimentId: string;
  questId: string;
  confidenceScore: number;
  recommendation: ExperimentRecommendation;
  conversionRate: number;
  breakEvenProgress: number;
  revenue: number;
  cost: number;
  evidenceStrength: "thin" | "directional" | "strong";
  notes: string;
  createdAt: string;
}

export interface ProductionAsset {
  id: string;
  questId: string;
  packId?: string;
  title: string;
  type: ProductionAssetType;
  status: ProductionAssetStatus;
  sourceReportIds: string[];
  claims: string[];
  policyChecks: string[];
  localPreview: string;
  exportFolder?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionPack {
  id: string;
  questId: string;
  title: string;
  status: ProductionPackStatus;
  assetIds: string[];
  reviewChecklist: string[];
  teamLeaderSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteProject {
  id: string;
  name: string;
  primaryQuestId: string;
  questIds: string[];
  repoPath: string;
  framework: StaticSiteFramework;
  status: SiteProjectStatus;
  niche: string;
  audience: string;
  disclosureText: string;
  publishingRules: string[];
  monetizationPolicy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentItem {
  id: string;
  siteProjectId: string;
  questId: string;
  clusterId?: string;
  title: string;
  slug: string;
  type: ContentItemType;
  status: ContentItemStatus;
  targetKeywords: string[];
  outline: string[];
  draftMarkdown: string;
  disclosureRequired: boolean;
  claimReviewStatus: "not_started" | "needs_review" | "passed" | "blocked";
  approvalId?: string;
  artifactIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PublishingDiffFile {
  path: string;
  action: "create" | "update" | "delete";
  summary: string;
  preview: string;
}

export interface PublishingDiff {
  id: string;
  siteProjectId: string;
  contentItemIds: string[];
  title: string;
  status: PublishingDiffStatus;
  files: PublishingDiffFile[];
  riskFlags: string[];
  approvalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateOffer {
  id: string;
  questId: string;
  siteProjectId?: string;
  name: string;
  program: string;
  productUrl: string;
  commissionModel: string;
  disclosureRequired: boolean;
  allowedClaims: string[];
  prohibitedClaims: string[];
  status: AffiliateOfferStatus;
  riskLevel: RiskLevel;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OfferClaimReview {
  id: string;
  offerId: string;
  questId: string;
  reviewedBy: "TeamLeader1A";
  status: OfferClaimReviewStatus;
  findings: string[];
  requiredChanges: string[];
  createdAt: string;
}

export interface AnalyticsConnector {
  id: string;
  type: AnalyticsConnectorType;
  status: AnalyticsConnectorStatus;
  authMode: "oauth_pending" | "secure_reference" | "manual_import";
  propertyCount: number;
  lastSyncAt?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchConsoleProperty {
  id: string;
  connectorId: string;
  siteUrl: string;
  permissionLevel: "owner" | "full" | "restricted" | "unknown";
  status: "active" | "needs_verification" | "archived";
  linkedSiteProjectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchConsoleMetric {
  id: string;
  propertyId: string;
  questId?: string;
  page: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  startDate: string;
  endDate: string;
}

export interface AnalyticsSnapshot {
  id: string;
  questId?: string;
  propertyId?: string;
  source: "google_search_console" | "manual";
  title: string;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  topQueries: string[];
  topPages: string[];
  recommendation: ExperimentRecommendation;
  teamLeaderSummary: string;
  createdAt: string;
}

export interface LearningCard {
  id: string;
  questId: string;
  title: string;
  whatWorked: string[];
  whatFailed: string[];
  whatChanged: string;
  nextTest: string;
  reusableLesson: string;
  createdAt: string;
}

export interface ExperimentDecision {
  id: string;
  questId: string;
  experimentId?: string;
  analyticsSnapshotId?: string;
  decision: ExperimentRecommendation;
  rationale: string;
  nextAction: string;
  approvalRequired: boolean;
  createdBy: "TeamLeader1A";
  createdAt: string;
}

export interface BatchApprovalItem {
  id: string;
  batchId: string;
  targetType: "publishing_diff_file" | "url_research" | "content_item";
  targetId: string;
  summary: string;
  status: BatchApprovalItemStatus;
}

export interface BatchApprovalPackage {
  id: string;
  title: string;
  status: BatchApprovalStatus;
  approvalId?: string;
  questId?: string;
  sourceDiffId?: string;
  itemIds: string[];
  maxActions: number;
  expiresAt: string;
  riskFlags: string[];
  rollbackPlan: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobSchedule {
  id: string;
  name: string;
  type: JobScheduleType;
  status: JobScheduleStatus;
  intervalMinutes: number;
  safeReadOnly: boolean;
  requiresApprovalAtExecution: boolean;
  lastRunAt?: string;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobRun {
  id: string;
  scheduleId: string;
  name: string;
  status: JobRunStatus;
  startedAt: string;
  completedAt?: string;
  summary: string;
  relatedLogIds: string[];
}

export interface AgentPerformanceMemory {
  id: string;
  agentId: string;
  acceptedArtifacts: number;
  revisionRequests: number;
  blockedActions: number;
  usefulnessScore: number;
  accuracyScore: number;
  notes: string[];
  updatedAt: string;
}

export interface SkillGapRequest {
  id: string;
  agentId: string;
  questId?: string;
  skill: string;
  reason: string;
  proposedMode: "Build" | "Install" | "Learn";
  status: SkillGapStatus;
  approvalId?: string;
  createdAt: string;
}

export interface PublishingConnector {
  id: string;
  type: PublishingConnectorType;
  name: string;
  status: PublishingConnectorStatus;
  mode: "draft_only" | "approval_required";
  target: string;
  notes: string;
  lastCheckedAt?: string;
}

export interface SpendEntry {
  id: string;
  questId?: string;
  amount: number;
  currency: "USD";
  category: "tool" | "content" | "ads" | "domain" | "hosting" | "contractor" | "other";
  status: SpendStatus;
  approvalId?: string;
  note: string;
  createdAt: string;
}

export interface RevenueRecord {
  id: string;
  questId?: string;
  source: string;
  amount: number;
  currency: "USD";
  mode: "manual" | "csv_import" | "read_only_connector";
  note: string;
  createdAt: string;
}

export interface PortfolioScore {
  id: string;
  questId: string;
  evidenceScore: number;
  riskScore: number;
  effortScore: number;
  costScore: number;
  revenueScore: number;
  learningValue: number;
  totalScore: number;
  recommendation: PortfolioRecommendation;
  rationale: string;
  createdAt: string;
}

export interface MissionTask {
  id: string;
  questId: string;
  type: MissionTaskType;
  title: string;
  ownerAgentId: string;
  status: MissionTaskStatus;
  priority: "low" | "normal" | "high" | "urgent";
  approvalRequired: boolean;
  dependencyIds: string[];
  artifactIds: string[];
  commandLedgerEntryIds: string[];
  successCriteria: string[];
  blockedReason?: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MissionArtifact {
  id: string;
  questId: string;
  taskId?: string;
  type: MissionArtifactType;
  title: string;
  summary: string;
  content: string;
  status: MissionArtifactStatus;
  storage: "sqlite" | "obsidian" | "local_file" | "static_repo";
  sourceIds: string[];
  path?: string;
  createdByAgentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommandLedgerEntry {
  id: string;
  questId?: string;
  taskId?: string;
  approvalId?: string;
  commandId?: string;
  connector: CommandConnector;
  action: string;
  status: CommandLedgerStatus;
  externalAction: boolean;
  approvalMode: ApprovalMode;
  riskLevel: RiskLevel;
  inputSummary: string;
  outputSummary?: string;
  stdout?: string;
  stderr?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalActionLock {
  id: "global-external-action-lock";
  mode: ExternalActionLockMode;
  reason: string;
  lockedActions: string[];
  updatedBy: "TeamLeader1A" | "user" | "system";
  updatedAt: string;
}

export interface ObsidianNote {
  id: string;
  title: string;
  type:
    | "business_idea"
    | "market_research"
    | "competitor_research"
    | "keyword_research"
    | "experiment_log"
    | "decision_log"
    | "agent_memory"
    | "sop"
    | "content_plan"
    | "revenue_report"
    | "lessons_learned"
    | "validation_report"
    | "quest_summary"
    | "openclaw_command_log"
    | "openclaw_agent_memory"
    | "openclaw_system_report";
  folder: string;
  frontmatter: Record<string, string | number | boolean | string[]>;
  body: string;
  linkedQuestId?: string;
  lastExportPreviewAt?: string;
}

export interface DecisionLog {
  id: string;
  questId: string;
  title: string;
  decision: string;
  rationale: string;
  risk: RiskLevel;
  createdBy: "TeamLeader1A";
  createdAt: string;
}

export interface ImprovementProposal {
  id: string;
  title: string;
  skillNeeded: string;
  whyNeeded: string;
  requestingAgent: string;
  mode: "Build" | "Install" | "Learn";
  expectedBenefit: string;
  risk: RiskLevel;
  cost: number;
  timeEstimate: string;
  approvalStatus: ApprovalStatus;
  relatedQuestId?: string;
  teamLeaderRecommendation: string;
  openClawCapabilityAffected: string;
}

export interface Task {
  id: string;
  questId?: string;
  title: string;
  assignedAgentId: string;
  status: "queued" | "in_progress" | "blocked" | "review" | "done";
  priority: "low" | "normal" | "high" | "urgent";
  dependencyIds: string[];
  dueAt?: string;
}

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: "TeamLeader1A";
  questId?: string;
  summary: string;
  details: string;
  createdAt: string;
  visibility: "internal_report" | "user_summary";
}

export interface TeamLeaderChatMessage {
  id: string;
  role: "user" | "teamleader" | "system";
  content: string;
  createdAt: string;
  mode: "local" | "approval_requested" | "live_result" | "system";
  relatedApprovalId?: string;
  relatedCommandId?: string;
  relatedMissionDraftId?: string;
  relatedMissionRunId?: string;
  relatedOpportunityHuntId?: string;
  relatedBusinessProposalId?: string;
  relatedApprovedBusinessId?: string;
}

export interface MissionDraftStepPlan {
  agentId: MissionAgentId;
  title: string;
  briefKind: MissionBriefSectionKind;
  prompt: string;
  expectedArtifact: string;
}

export interface MissionDraft {
  id: string;
  questId: string;
  title: string;
  objective: string;
  sourceMessage: string;
  status: MissionDraftStatus;
  plannedAgentIds: MissionAgentId[];
  plannedSteps: MissionDraftStepPlan[];
  riskFlags: string[];
  requiredApprovals: string[];
  approvalId?: string;
  runId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MissionRun {
  id: string;
  draftId: string;
  questId: string;
  title: string;
  objective: string;
  status: MissionRunStatus;
  stepIds: string[];
  briefSectionIds: string[];
  artifactIds: string[];
  approvalId?: string;
  finalSummary?: string;
  pausedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MissionAgentStep {
  id: string;
  draftId: string;
  missionRunId: string;
  questId: string;
  order: number;
  agentId: MissionAgentId;
  agentName: string;
  agentProfileId: string;
  title: string;
  briefKind: MissionBriefSectionKind;
  prompt: string;
  expectedArtifact: string;
  status: MissionAgentStepStatus;
  commandId?: string;
  resultId?: string;
  artifactId?: string;
  briefSectionId?: string;
  retryOfStepId?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MissionBriefSection {
  id: string;
  missionRunId: string;
  questId: string;
  kind: MissionBriefSectionKind;
  title: string;
  summary: string;
  content: string;
  status: "draft" | "ready" | "blocked";
  agentId?: MissionAgentId;
  sourceStepId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MissionApprovalBatch {
  id: string;
  draftId: string;
  missionRunId: string;
  approvalId: string;
  status: BatchApprovalStatus;
  stepIds: string[];
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTurnResult {
  id: string;
  missionRunId: string;
  stepId: string;
  agentId: MissionAgentId;
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode?: number | null;
  timedOut: boolean;
  summary: string;
  commandId: string;
  createdAt: string;
}

export interface AgentArtifact {
  id: string;
  runId: string;
  questId: string;
  taskId?: string;
  agentId: string;
  type: AgentArtifactType;
  title: string;
  summary: string;
  content: string;
  status: "draft" | "ready_for_teamleader_review" | "accepted" | "needs_revision" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunReview {
  id: string;
  runId: string;
  questId: string;
  reviewedBy: "TeamLeader1A";
  status: AgentRunReviewStatus;
  summary: string;
  requestedChanges: string[];
  createdAt: string;
}

export interface AgentOrchestrationRun {
  id: string;
  questId: string;
  title: string;
  objective: string;
  status: AgentOrchestrationStatus;
  taskIds: string[];
  artifactIds: string[];
  reviewIds: string[];
  skillGaps: string[];
  teamLeaderSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyPolicyEvaluation {
  allowed: boolean;
  riskFlags: SafetyRiskFlag[];
  blockedReasons: string[];
  safetyChecklist: string[];
  normalizedPayloadSummary: string;
  recommendedDecision: SafetyRecommendedDecision;
}

export interface AllowlistEntry {
  id: string;
  kind: AllowlistKind;
  value: string;
  label?: string;
  status: AllowlistStatus;
  source: "settings_migration" | "user" | "system";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalDecisionRecord {
  id: string;
  approvalId?: string;
  commandId?: string;
  decision: ApprovalDecisionType;
  actor: "user" | "TeamLeader1A" | "system";
  reason: string;
  payloadSummary?: string;
  relatedApprovalId?: string;
  relatedCommandId?: string;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  title: string;
  questId?: string;
  pilotRunId?: string;
  amount?: number;
  requestedBy: "TeamLeader1A";
  riskLevel: RiskLevel;
  reason: string;
  safetyChecklist: string[];
  blockedBehaviors: string[];
  status: ApprovalStatus;
  createdAt: string;
  payload?: OpenClawApprovalPayload;
  payloadSnapshot?: OpenClawApprovalPayload;
  productPreviewId?: string;
  publishPayloadPreviewId?: string;
  approvalGateStateId?: string;
  commandId?: string;
  missionDraftId?: string;
  missionRunId?: string;
  parentApprovalId?: string;
  retryOfCommandId?: string;
  blockedExplanation?: string;
  safetyEvaluation?: SafetyPolicyEvaluation;
  executionResult?: {
    ok: boolean;
    summary: string;
    completedAt: string;
  };
}

export interface ActivityLog {
  id: string;
  category: "agent" | "quest" | "approval" | "openclaw" | "obsidian" | "system" | "experiment";
  title: string;
  detail: string;
  severity: "info" | "success" | "warning" | "danger";
  createdAt: string;
  relatedQuestId?: string;
  relatedMissionRunId?: string;
}

export interface OpenClawCommand {
  id: string;
  command: string;
  targetAgentId: string;
  status: "queued" | "requires_approval" | "simulated" | "blocked" | "running" | "complete" | "failed" | "cancelled";
  riskLevel: RiskLevel;
  approvalRequired: boolean;
  resultSummary?: string;
  createdAt: string;
  actionKind?: OpenClawActionKind;
  executionMode?: OpenClawExecutionMode;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  startedAt?: string;
  completedAt?: string;
  retryOfCommandId?: string;
  cancelReason?: string;
  safetyEvaluation?: SafetyPolicyEvaluation;
  missionRunId?: string;
  missionStepId?: string;
}

export interface OpenClawEvent {
  id: string;
  type: "runtime" | "agent" | "command" | "approval" | "memory" | "queue";
  title: string;
  detail: string;
  createdAt: string;
  severity: "info" | "success" | "warning" | "danger";
}

export interface OpenClawCapability {
  id: string;
  name: string;
  status: "mocked" | "available" | "needs_install" | "blocked";
  description: string;
  approvalRequired: boolean;
  connectedTo?: string;
}

export interface OpenClawPermission {
  id: string;
  capabilityId: string;
  name: string;
  allowed: boolean;
  requiresUserApproval: boolean;
  description: string;
}

export interface OpenClawRuntimeStatus {
  id: string;
  status: "mocked" | "offline" | "online" | "degraded";
  endpoint: string;
  lastCheckedAt: string;
  nextCheckAt: string;
  healthScore: number;
  notes: string;
}

export interface OpenClawMcpServer {
  id: string;
  name: string;
  kind: OpenClawMcpServerKind;
  packageName: string;
  packageVersion: string;
  command?: string;
  args: string[];
  env?: Record<string, string>;
  allowedAgentIds: string[];
  allowedPaths?: string[];
  status: OpenClawMcpServerStatus;
  safetyMode: OpenClawMcpSafetyMode;
  enabled: boolean;
  configured: boolean;
  installed: boolean;
  lastCheckedAt?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quest {
  id: string;
  title: string;
  businessIdeaId: string;
  businessIdea: string;
  type: QuestType;
  assignedAgentIds: string[];
  stage: QuestStage;
  difficulty: "Novice" | "Adept" | "Veteran" | "Champion" | "Boss";
  potentialReward: string;
  riskLevel: RiskLevel;
  requiredBudget: number;
  capitalAllocated: number;
  expectedTimeline: string;
  validationEvidence: string[];
  successMetrics: string[];
  failureCriteria: string[];
  currentStatus: string;
  nextAction: string;
  approvalStatus: ApprovalStatus;
  relatedObsidianNoteIds: string[];
  experimentIds: string[];
  decisionLogIds: string[];
  openClawCommandIds: string[];
  progress: number;
  bossFight?: string;
  loot?: string[];
  bottleneck?: string;
}

export interface RealPilotRun {
  id: string;
  questId: string;
  title: string;
  status: RealPilotStatus;
  purpose: string;
  approvedUrls: string[];
  extractionGoal: string;
  validationChecklistSummary: string;
  riskReview: string;
  minimumTestPlan: string;
  successCriteria: string;
  killCriteria: string;
  budgetCap: number;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  artifactNoteIds: string[];
  commandIds: string[];
  activityLogIds: string[];
  lastTeamLeaderSummary?: string;
}

export interface UserSettings {
  totalStartingCapital: number;
  riskTolerance: RiskLevel;
  preferredBusinessModels: BusinessModel[];
  obsidianVaultPath: string;
  obsidianDefaultFolders: Record<string, string>;
  openClawRuntimePath: string;
  openClawEndpoint: string;
  openClawGatewayPort: number;
  openClawGatewayStartMode: "prompt" | "manual" | "auto";
  defaultOpportunityHuntDepth: OpportunityHuntDepth;
  openClawRoleMap: Record<string, string>;
  approvedChannelTargets: string[];
  approvedResearchDomains: string[];
  approvalRules: {
    requireSpendingApproval: boolean;
    requirePublishingApproval: boolean;
    requireLaunchApproval: boolean;
    requireAutomationApproval: boolean;
    maxAutoApprovedSpend: number;
  };
}

export type OpenClawApprovalPayload =
  | {
      actionKind: "gateway_start";
      expectedResult: string;
    }
  | {
      actionKind: "agent_turn";
      message: string;
      agentProfileId: string;
      agentRole?: string;
      missionRunId?: string;
      missionStepId?: string;
      expectedResult: string;
    }
  | {
      actionKind: "mission_start";
      missionDraftId: string;
      missionRunId: string;
      missionStepIds: string[];
      title: string;
      stepCount: number;
      agentProfileIds: string[];
      expectedResult: string;
    }
  | {
      actionKind: "url_research";
      purpose: string;
      urls: string[];
      extractionGoal: string;
      riskNotes: string;
      successCriteria: string;
      expectedResult: string;
    }
  | {
      actionKind: "channel_message";
      channel: string;
      target: string;
      message: string;
      dryRun: boolean;
      expectedResult: string;
    };

export interface DashboardSummary {
  totalStartingCapital: number;
  allocatedCapital: number;
  remainingCapital: number;
  revenueGenerated: number;
  expenses: number;
  profitLoss: number;
  reputationScore: number;
  estimatedRiskLevel: RiskLevel;
  validationStatus: string;
  currentBottlenecks: string[];
  latestTeamLeaderRecommendation: string;
}
