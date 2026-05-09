import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Coins,
  FlaskConical,
  FolderOpen,
  Gauge,
  Gem,
  Lightbulb,
  ListChecks,
  Lock,
  Pause,
  Play,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { AgentRosterGrid } from "../components/agents/AgentRosterGrid";
import { ApprovalCenter } from "../components/approvals/ApprovalCenter";
import { DungeonPipeline } from "../components/dashboard/DungeonPipeline";
import { MetricCard } from "../components/dashboard/MetricCard";
import { TeamLeaderChat } from "../components/dashboard/TeamLeaderChat";
import { OpenClawPanel } from "../components/openclaw/OpenClawPanel";
import { AllowlistManager } from "../components/openclaw/AllowlistManager";
import { ExperimentAnalyticsWorkbench } from "../components/intelligence/ExperimentAnalyticsWorkbench";
import { MarketIntelligenceWorkbench } from "../components/intelligence/MarketIntelligenceWorkbench";
import { AgentOrchestrationWorkbench } from "../components/orchestration/AgentOrchestrationWorkbench";
import { RealPilotWorkbench } from "../components/pilot/RealPilotWorkbench";
import { ProductionPipelineWorkbench } from "../components/production/ProductionPipelineWorkbench";
import { QuestBoard } from "../components/quests/QuestBoard";
import { SecondBrainPanel } from "../components/second-brain/SecondBrainPanel";
import { UpdateManager } from "../components/updater/UpdateManager";
import { ValidationGate } from "../components/validation/ValidationGate";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { Select } from "../components/ui/select";
import { useAppData } from "./AppDataContext";
import { sqliteSchemaPlan } from "../services/sqliteService";
import { formatCurrency, formatDateTime, riskTone, statusTone } from "../utils/formatting";
import { calculateValidationCompletion } from "../utils/scoring";

function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <Badge tone="amber">{eyebrow}</Badge>
        <h2 className="mt-3 font-display text-3xl font-semibold text-stone-50">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
      </div>
      {action}
    </div>
  );
}

function QueueCard({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-md border border-white/10 bg-black/25 p-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-300/25 bg-amber-400/10 text-xs font-semibold text-amber-100">
                {index + 1}
              </span>
              <p className="text-sm text-slate-200">{item}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data, adapter, simulationEnabled, setSimulationEnabled, runSimulationNow } = useAppData();
  const {
    dashboardSummary,
    researchQueue,
    experimentQueue,
    improvementQueue,
    openClawCommands,
  } = data;

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Command Center"
        title="Dungeon-grade AI business operations"
        description="A responsible mission-control layer for OpenClaw agents to research, validate, test, and improve business ideas before any risky action is approved."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void runSimulationNow()}>
              <Play className="h-4 w-4" />
              Run simulated check
            </Button>
            <Button variant={simulationEnabled ? "danger" : "outline"} onClick={() => setSimulationEnabled(!simulationEnabled)}>
              {simulationEnabled ? <Pause className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
              {simulationEnabled ? "Pause local queue" : "Start local queue"}
            </Button>
            <Button variant="secondary"><Sparkles className="h-4 w-4" /> Create quest</Button>
            <Button variant="outline"><SlidersHorizontal className="h-4 w-4" /> Tune priorities</Button>
          </div>
        }
      />
      <div className="rounded-lg border border-teal-300/20 bg-teal-400/8 p-3 text-sm text-teal-100">
        Local persistence adapter: {adapter}. Simulated queues only run while this app is open and never execute external actions.
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Starting capital" value={formatCurrency(dashboardSummary.totalStartingCapital)} detail="Portfolio capital configured by the user." icon={<WalletCards className="h-4 w-4" />} tone="emerald" />
        <MetricCard label="Allocated capital" value={formatCurrency(dashboardSummary.allocatedCapital)} detail="Capital assigned to active validation quests." icon={<Coins className="h-4 w-4" />} tone="amber" />
        <MetricCard label="Profit / loss" value={formatCurrency(dashboardSummary.profitLoss)} detail="MVP sample data only. No guaranteed outcomes." icon={<BarChart3 className="h-4 w-4" />} tone="red" />
        <MetricCard label="Validation status" value="Gated" detail={dashboardSummary.validationStatus} icon={<ShieldCheck className="h-4 w-4" />} tone="teal" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <DungeonPipeline />
          <QuestBoard limit={3} />
        </div>
        <TeamLeaderChat />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <QueueCard title="Research Queue" items={researchQueue} icon={<BookOpen className="h-4 w-4 text-amber-100" />} />
        <QueueCard title="Experiment Queue" items={experimentQueue} icon={<FlaskConical className="h-4 w-4 text-teal-100" />} />
        <QueueCard title="Improvement Queue" items={improvementQueue} icon={<TrendingUp className="h-4 w-4 text-emerald-100" />} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <AgentRosterGrid compact />
        <Card>
          <CardHeader>
            <CardTitle>Current Bottlenecks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardSummary.currentBottlenecks.map((bottleneck) => (
              <div key={bottleneck} className="flex items-center gap-3 rounded-md border border-red-300/20 bg-red-500/8 p-3 text-sm text-red-100">
                <AlertTriangle className="h-4 w-4" />
                {bottleneck}
              </div>
            ))}
            <div className="rounded-lg border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">OpenClaw command queue</p>
              <div className="mt-3 space-y-2">
                {openClawCommands.slice(0, 3).map((command) => (
                  <div key={command.id} className="rounded-md bg-black/25 p-2">
                    <code className="text-xs text-teal-100">{command.command}</code>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AgentsPage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Party Roster"
        title="OpenClaw agent raid formation"
        description="Each agent has a role, current mission, workload, performance score, and suggested skill upgrades. Only TeamLeader1A communicates with the user."
      />
      <AgentRosterGrid />
    </div>
  );
}

export function AgentOrchestrationPage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Phase 7"
        title="Real agent orchestration"
        description="TeamLeader1A assigns internal work, agents produce local artifacts, and TeamLeader1A reviews the run before any external action can be requested."
      />
      <AgentOrchestrationWorkbench />
    </div>
  );
}

export function QuestsPage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Quest Board"
        title="Business experiments under command"
        description="Quests track business ideas, budget caps, validation evidence, success metrics, kill criteria, approvals, Obsidian notes, experiments, and OpenClaw command history."
        action={<Button variant="secondary"><ListChecks className="h-4 w-4" /> New business quest</Button>}
      />
      <QuestBoard />
    </div>
  );
}

export function IdeasPage() {
  const { data } = useAppData();
  const { businessIdeas } = data;

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Idea Vault"
        title="Business ideas waiting for proof"
        description="Ideas are treated as hypotheses. They become quests only after the team can define audience, demand signals, risks, and a minimum viable test."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {businessIdeas.map((idea) => (
          <Card key={idea.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge tone="teal">{idea.model}</Badge>
                  <h3 className="mt-3 font-display text-xl font-semibold text-stone-100">{idea.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{idea.summary}</p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${riskTone(idea.riskLevel)}`}>{idea.riskLevel}</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Audience</p>
                  <p className="mt-1 text-sm text-slate-300">{idea.targetAudience}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Problem</p>
                  <p className="mt-1 text-sm text-slate-300">{idea.problemSolved}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Monetization</p>
                  <p className="mt-1 text-sm text-slate-300">{idea.monetizationMethod}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Traffic plan</p>
                  <p className="mt-1 text-sm text-slate-300">{idea.trafficPlan}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Evidence of demand</p>
                <div className="flex flex-wrap gap-2">
                  {idea.evidenceOfDemand.map((item) => <Badge key={item} tone="amber">{item}</Badge>)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ValidationPage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Proof Gate"
        title="Validation before launch"
        description="Every money-making plan must pass a validation checklist and get user approval before spending, publishing, launching, or running risky automation."
      />
      <ValidationGate />
    </div>
  );
}

export function RealPilotPage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Phase 6A"
        title="Real pilot workbench"
        description="Run one responsible local pilot end-to-end: approved URL research, validation evidence, risk review, TeamLeader1A review, command results, and Obsidian export before any external launch or spend."
      />
      <RealPilotWorkbench />
    </div>
  );
}

export function MarketIntelligencePage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Phase 8"
        title="Research, SEO, and market intelligence"
        description="Build evidence-first market reports with demand signals, competitor gaps, keyword opportunities, citation notes, and approved URL research requests."
      />
      <MarketIntelligenceWorkbench />
    </div>
  );
}

export function ExperimentsPage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Phase 9"
        title="Experiment builder and analytics"
        description="Create bounded MVP tests, score confidence, track break-even progress, and get continue, revise, kill, or scale-later recommendations."
      />
      <ExperimentAnalyticsWorkbench />
    </div>
  );
}

export function ProductionPipelinePage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Phase 10"
        title="Production asset pipeline"
        description="Create local landing pages, briefs, lead magnets, templates, newsletters, and product drafts with claim checks before anything goes public."
      />
      <ProductionPipelineWorkbench />
    </div>
  );
}

export function SecondBrainPage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Second Brain"
        title="Obsidian-ready mission memory"
        description="Export Markdown notes, frontmatter, decision logs, agent memory, validation reports, and OpenClaw system reports to a selected local vault from the desktop shell."
      />
      <SecondBrainPanel />
    </div>
  );
}

export function ApprovalsPage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Guardrails"
        title="Approval gates for risky actions"
        description="No money, publishing, launching, scaling, external automation, capability connection, or OpenClaw external command proceeds without user approval."
      />
      <ApprovalCenter />
    </div>
  );
}

export function ActivityLogPage() {
  const { data } = useAppData();
  const { activityLogs } = data;

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Ledger"
        title="Activity, decisions, and lessons"
        description="A durable feed of agent activity, decisions, failures, wins, approvals, OpenClaw events, Obsidian exports, and experiment updates."
      />
      <Card>
        <CardContent className="space-y-3 p-4">
          {activityLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-amber-100" />
                  <div>
                    <p className="font-semibold text-stone-100">{log.title}</p>
                    <p className="text-xs uppercase text-slate-500">{log.category} / {formatDateTime(log.createdAt)}</p>
                  </div>
                </div>
                <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(log.severity)}`}>{log.severity}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{log.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function OpenClawSystemPage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Runtime"
        title="OpenClaw integration architecture"
        description="Phase 5 connects to the local OpenClaw CLI with per-action approval gates for gateway start, TeamLeader1A turns, approved URL research, and channel messaging."
      />
      <OpenClawPanel />
      <UpdateManager compact />
    </div>
  );
}

export function SettingsPage() {
  const { data, adapter, updateSettings, resetLocalData, selectObsidianVault } = useAppData();
  const { userSettings, safetyRules } = data;
  const saveSettings = (patch: Partial<typeof userSettings>) => {
    void updateSettings({ ...userSettings, ...patch });
  };

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Controls"
        title="Capital, risk, storage, and permissions"
        description="Settings now persist locally. Real external runtime connections remain disabled until a later explicit approval phase."
        action={
          <div className="flex flex-wrap gap-2">
            <Badge tone="teal">Storage: {adapter}</Badge>
            <Button variant="outline" onClick={() => void resetLocalData()}>Reset local data</Button>
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gauge className="h-4 w-4 text-amber-100" /> User Controls</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Total starting capital</p>
              <Input
                type="number"
                value={userSettings.totalStartingCapital}
                onChange={(event) => saveSettings({ totalStartingCapital: Number(event.target.value) || 0 })}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Risk tolerance</p>
              <Select
                value={userSettings.riskTolerance}
                onChange={(event) => saveSettings({ riskTolerance: event.target.value as typeof userSettings.riskTolerance })}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Obsidian vault path</p>
              <div className="flex gap-2">
                <Input
                  value={userSettings.obsidianVaultPath}
                  onChange={(event) => saveSettings({ obsidianVaultPath: event.target.value })}
                />
                <Button variant="outline" size="icon" onClick={() => void selectObsidianVault()} aria-label="Select Obsidian vault">
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">OpenClaw endpoint</p>
              <Input
                value={userSettings.openClawEndpoint}
                onChange={(event) => saveSettings({ openClawEndpoint: event.target.value })}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Runtime path</p>
              <Input
                value={userSettings.openClawRuntimePath}
                onChange={(event) => saveSettings({ openClawRuntimePath: event.target.value })}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Gateway port</p>
              <Input
                type="number"
                value={userSettings.openClawGatewayPort}
                onChange={(event) => saveSettings({ openClawGatewayPort: Number(event.target.value) || 18789 })}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Gateway start mode</p>
              <Select
                value={userSettings.openClawGatewayStartMode}
                onChange={(event) => saveSettings({ openClawGatewayStartMode: event.target.value as typeof userSettings.openClawGatewayStartMode })}
              >
                <option value="prompt">prompt</option>
                <option value="manual">manual</option>
                <option value="auto">auto</option>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Approved research domains</p>
              <Input
                value={userSettings.approvedResearchDomains.join(", ")}
                onChange={(event) => saveSettings({ approvedResearchDomains: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Approved channel targets</p>
              <Input
                value={userSettings.approvedChannelTargets.join(", ")}
                onChange={(event) => saveSettings({ approvedChannelTargets: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Max auto-approved spend</p>
              <Input
                type="number"
                value={userSettings.approvalRules.maxAutoApprovedSpend}
                onChange={(event) =>
                  saveSettings({
                    approvalRules: {
                      ...userSettings.approvalRules,
                      maxAutoApprovedSpend: Number(event.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-red-100" /> Approval Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(userSettings.approvalRules).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/25 p-3">
                <span className="text-sm text-slate-300">{key.replace(/([A-Z])/g, " $1")}</span>
                <Badge tone={value ? "red" : "slate"}>{String(value)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="h-4 w-4 text-amber-100" /> Preferred Business Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {userSettings.preferredBusinessModels.map((model) => <Badge key={model} tone="teal">{model}</Badge>)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gem className="h-4 w-4 text-amber-100" /> SQLite Persistence Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid max-h-64 gap-2 overflow-auto pr-1 md:grid-cols-2">
              {sqliteSchemaPlan.map((table) => (
                <div key={table.tableName} className="rounded-md border border-white/10 bg-black/25 p-2 text-sm text-slate-300">
                  {table.tableName}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-100" /> Safety Rules</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {safetyRules.map((rule) => (
            <div key={rule} className="flex items-center gap-3 rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              {rule}
            </div>
          ))}
        </CardContent>
      </Card>
      <AllowlistManager compact />
      <UpdateManager compact />
    </div>
  );
}
