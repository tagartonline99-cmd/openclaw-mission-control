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
  | "Run approved URL research"
  | "Send approved channel message"
  | "Start OpenClaw gateway";

export type OpenClawActionKind = "gateway_start" | "agent_turn" | "url_research" | "channel_message";
export type OpenClawExecutionMode = "mock" | "real_local" | "dry_run";
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
  commandId?: string;
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
      agentProfileId: "main";
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
