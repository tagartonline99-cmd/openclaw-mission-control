import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  Bell,
  CheckCircle2,
  CloudOff,
  Coins,
  Database,
  FlaskConical,
  FolderOpen,
  Gauge,
  Gem,
  Lightbulb,
  ListChecks,
  Lock,
  MessageSquare,
  Pause,
  Play,
  Rocket,
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

export function TeamLeaderChatPage() {
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Command Channel"
        title="Talk to TeamLeader1A"
        description="Use this as the direct user channel. Local replies are safe and instant; live OpenClaw turns remain approval-gated."
        action={<Badge tone="amber"><MessageSquare className="h-3.5 w-3.5" /> TeamLeader1A only</Badge>}
      />
      <TeamLeaderChat full />
    </div>
  );
}

export function AgentsPage() {
  const { data } = useAppData();
  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Party Roster"
        title="OpenClaw agent raid formation"
        description="Each agent has a role, current mission, workload, performance score, and suggested skill upgrades. Only TeamLeader1A communicates with the user."
      />
      <AgentRosterGrid />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance Memory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.agentPerformanceMemories.map((memory) => {
              const agent = data.agents.find((item) => item.id === memory.agentId);
              return (
                <div key={memory.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-stone-100">{agent?.name ?? memory.agentId}</p>
                    <Badge tone="teal">{memory.usefulnessScore}/100 useful</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {memory.acceptedArtifacts} accepted artifacts / {memory.revisionRequests} revisions / {memory.blockedActions} blocked actions
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {memory.notes.map((note) => <Badge key={note} tone="slate">{note}</Badge>)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Skill Gap Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.skillGapRequests.map((request) => {
              const agent = data.agents.find((item) => item.id === request.agentId);
              return (
                <div key={request.id} className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-stone-100">{request.skill}</p>
                    <Badge tone={request.status === "blocked" ? "red" : "amber"}>{request.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs uppercase text-slate-500">{agent?.name ?? request.agentId} / {request.proposedMode}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{request.reason}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
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

export function LaunchControlPage() {
  const { data, adapter, simulationEnabled, setSimulationEnabled, runSimulationNow, updateExternalActionLock, runControlledJobNow } = useAppData();
  const readyPacks = data.productionPacks.filter((pack) => pack.status === "ready_for_review" || pack.status === "approved_local");
  const riskyApprovals = data.approvalRequests.filter((request) =>
    ["Publish externally", "Launch experiment", "Scale successful idea", "Send approved channel message"].includes(request.type),
  );
  const activeMissionTasks = data.missionTasks.filter((task) => !["done", "cancelled"].includes(task.status));
  const readyArtifacts = data.missionArtifacts.filter((artifact) => artifact.status === "ready_for_review" || artifact.status === "approved_local");
  const recentLedger = data.commandLedgerEntries.slice(0, 5);
  const activeQuests = data.quests
    .filter((quest) => !["Archived", "Failed", "Retired"].includes(quest.stage))
    .sort((left, right) => right.progress - left.progress);
  const recentLogs = data.activityLogs.slice(0, 5);

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Phases 11-16"
        title="Launch, budget, runner, and portfolio control"
        description="The final operating layer keeps publishing, messaging, spend, scheduling, scaling, diagnostics, and optional cloud posture visible without unlocking risky automation."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void runSimulationNow()}>
              <Play className="h-4 w-4" />
              Run safe tick
            </Button>
            <Button variant={simulationEnabled ? "danger" : "outline"} onClick={() => setSimulationEnabled(!simulationEnabled)}>
              {simulationEnabled ? <Pause className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {simulationEnabled ? "Pause runner" : "Start runner"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ready local packs" value={String(readyPacks.length)} detail="Reviewable assets, not published." icon={<Rocket className="h-4 w-4" />} tone="teal" />
        <MetricCard label="Risky approvals" value={String(riskyApprovals.length)} detail="Launch, publish, scale, or send gates." icon={<ShieldCheck className="h-4 w-4" />} tone="red" />
        <MetricCard label="Remaining capital" value={formatCurrency(data.dashboardSummary.remainingCapital)} detail="No spend executes automatically." icon={<WalletCards className="h-4 w-4" />} tone="emerald" />
        <MetricCard label="Storage" value={adapter} detail="Local-first persistence status." icon={<Database className="h-4 w-4" />} tone="amber" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-red-100" /> Phase 17 Operating Core</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
            <div className="rounded-md border border-red-300/20 bg-red-500/8 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-red-100">Global external action lock</p>
                  <p className="mt-1 font-display text-xl font-semibold text-stone-100">{data.externalActionLock.mode.replace(/_/g, " ")}</p>
                </div>
                <Badge tone={data.externalActionLock.mode === "locked" ? "red" : "amber"}>{data.externalActionLock.updatedBy}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-red-50">{data.externalActionLock.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.externalActionLock.lockedActions.slice(0, 8).map((action) => <Badge key={action} tone="red">{action}</Badge>)}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="danger" size="sm" onClick={() => void updateExternalActionLock("locked", "User locked every external action. Local planning can continue.")}>
                  Lock all external
                </Button>
                <Button variant="outline" size="sm" onClick={() => void updateExternalActionLock("approval_only", "External actions may be requested, but only after explicit approval.")}>
                  Approval only
                </Button>
                <Button variant="secondary" size="sm" onClick={() => void updateExternalActionLock("batch_approval_enabled", "Itemized batch approvals are allowed when every item, limit, and expiry is visible.")}>
                  Batch approval mode
                </Button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-white/10 bg-black/25 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Mission tasks</p>
                <p className="mt-1 text-2xl font-semibold text-stone-100">{activeMissionTasks.length}</p>
                <p className="mt-1 text-xs text-slate-400">Research, content, validation, production, publishing, analytics, and review tasks.</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/25 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Reviewable artifacts</p>
                <p className="mt-1 text-2xl font-semibold text-stone-100">{readyArtifacts.length}</p>
                <p className="mt-1 text-xs text-slate-400">Briefs, reports, plans, drafts, snapshots, and diffs before external action.</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/25 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Ledger entries</p>
                <p className="mt-1 text-2xl font-semibold text-stone-100">{data.commandLedgerEntries.length}</p>
                <p className="mt-1 text-xs text-slate-400">Every connector action is linked to quest, approval, command, and result.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Active operating tasks</p>
              {activeMissionTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-stone-100">{task.title}</p>
                    <Badge tone={task.approvalRequired ? "red" : "teal"}>{task.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs uppercase text-slate-500">{task.type} / {data.agents.find((agent) => agent.id === task.ownerAgentId)?.name ?? task.ownerAgentId}</p>
                  {task.blockedReason ? <p className="mt-2 text-sm text-red-100">{task.blockedReason}</p> : null}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Artifact ledger</p>
              {data.missionArtifacts.slice(0, 4).map((artifact) => (
                <div key={artifact.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-stone-100">{artifact.title}</p>
                    <Badge tone={artifact.status === "blocked" ? "red" : artifact.status === "approved_local" ? "emerald" : "amber"}>{artifact.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{artifact.summary}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Command/result ledger</p>
              {recentLedger.map((entry) => (
                <div key={entry.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <code className="text-xs text-teal-100">{entry.connector}.{entry.action}</code>
                    <Badge tone={entry.status === "blocked" || entry.status === "failed" ? "red" : entry.status === "completed" ? "emerald" : "amber"}>{entry.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{entry.outputSummary ?? entry.inputSummary}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Rocket className="h-4 w-4 text-amber-100" /> Approved Publishing And Outreach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readyPacks.length === 0 ? (
              <p className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">No production pack is ready for review yet. Build a local pack first; publishing stays locked behind approval.</p>
            ) : (
              readyPacks.map((pack) => (
                <div key={pack.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-stone-100">{pack.title}</p>
                    <Badge tone={pack.status === "approved_local" ? "emerald" : "amber"}>{pack.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{pack.teamLeaderSummary}</p>
                </div>
              ))
            )}
            <div className="rounded-md border border-red-300/20 bg-red-500/8 p-3 text-sm leading-6 text-red-100">
              Publishing, live messaging, outreach, and scaling require one approval per action. Broadcast, hidden recipients, spam batches, fake reviews, and misleading claims remain blocked.
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Publishing connectors</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {data.publishingConnectors.map((connector) => (
                  <div key={connector.id} className="rounded-md border border-white/10 bg-black/25 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-stone-100">{connector.name}</span>
                      <Badge tone={connector.status === "available" ? "emerald" : connector.status === "blocked" ? "red" : "amber"}>{connector.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{connector.mode.replace(/_/g, " ")} / {connector.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Coins className="h-4 w-4 text-emerald-100" /> Budget Ledger And Spend Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.budgets.map((budget) => (
              <div key={budget.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-stone-100">{data.quests.find((quest) => quest.id === budget.questId)?.title ?? "Portfolio reserve"}</p>
                  <Badge tone={budget.spent > 0 ? "amber" : "teal"}>{formatCurrency(budget.spent)} spent</Badge>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs uppercase text-slate-500">
                    <span>Allocated</span>
                    <span>{formatCurrency(budget.allocated)} / {formatCurrency(budget.startingCapital)}</span>
                  </div>
                  <Progress value={budget.startingCapital ? Math.min(100, Math.round((budget.allocated / budget.startingCapital) * 100)) : 0} tone="emerald" />
                </div>
              </div>
            ))}
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Spend ledger</p>
              {data.spendEntries.map((entry) => (
                <div key={entry.id} className="mt-2 flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/25 p-2">
                  <span className="text-sm text-slate-300">{entry.category} / {entry.note}</span>
                  <Badge tone={entry.status === "approved" || entry.status === "recorded" ? "emerald" : "amber"}>{formatCurrency(entry.amount)} {entry.status}</Badge>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Revenue records</p>
              {data.revenueRecords.map((record) => (
                <div key={record.id} className="mt-2 flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/25 p-2">
                  <span className="text-sm text-slate-300">{record.source} / {record.mode.replace(/_/g, " ")}</span>
                  <Badge tone={record.amount > 0 ? "emerald" : "slate"}>{formatCurrency(record.amount)}</Badge>
                </div>
              ))}
            </div>
            <p className="text-xs leading-5 text-slate-500">Real payments and purchases are not connected. Spend records are local planning controls until a separate approved spend workflow exists.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-teal-100" /> Portfolio Optimization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeQuests.map((quest) => {
              const validation = data.validationReports.find((report) => report.questId === quest.id);
              const completion = validation ? calculateValidationCompletion(validation) : 0;
              const score = data.portfolioScores.find((item) => item.questId === quest.id);
              return (
                <div key={quest.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-stone-100">{quest.title}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={quest.stage === "Scaling" ? "emerald" : quest.stage === "Publishing approval" ? "red" : "teal"}>{quest.stage}</Badge>
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${riskTone(quest.riskLevel)}`}>{quest.riskLevel}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{quest.nextAction}</p>
                  {score ? (
                    <div className="mt-2 rounded-md border border-teal-300/20 bg-teal-400/8 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-stone-100">Portfolio score {score.totalScore}/100</span>
                        <Badge tone={score.recommendation === "scale_later" ? "emerald" : score.recommendation === "kill" ? "red" : "amber"}>{score.recommendation.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{score.rationale}</p>
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 flex justify-between text-xs uppercase text-slate-500">
                        <span>Quest progress</span>
                        <span>{quest.progress}%</span>
                      </div>
                      <Progress value={quest.progress} tone="teal" />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs uppercase text-slate-500">
                        <span>Validation proof</span>
                        <span>{completion}%</span>
                      </div>
                      <Progress value={completion} tone={completion >= 80 ? "emerald" : "amber"} />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4 text-amber-100" /> Controlled Runner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-white/10 bg-black/25 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Runner status</p>
                <p className="mt-1 text-lg font-semibold text-stone-100">{simulationEnabled ? "Running while app is open" : "Paused"}</p>
              </div>
              {recentLogs.map((log) => (
                <div key={log.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-stone-100">{log.title}</p>
                    <Badge tone={log.severity === "danger" ? "red" : log.severity === "success" ? "emerald" : "slate"}>{log.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(log.createdAt)}</p>
                </div>
              ))}
              <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Job schedules</p>
                <div className="mt-3 space-y-2">
                  {data.jobSchedules.map((schedule) => (
                    <div key={schedule.id} className="rounded-md border border-white/10 bg-black/25 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-stone-100">{schedule.name}</span>
                        <Badge tone={schedule.safeReadOnly ? "teal" : "red"}>{schedule.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Next: {formatDateTime(schedule.nextRunAt)}</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => void runControlledJobNow(schedule.id)}>
                        <Play className="h-4 w-4" />
                        Run now
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              {data.jobRuns.slice(0, 3).map((run) => (
                <div key={run.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-stone-100">{run.name}</p>
                    <Badge tone={run.status === "success" ? "emerald" : run.status === "blocked" ? "red" : "amber"}>{run.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-300">{run.summary}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CloudOff className="h-4 w-4 text-slate-200" /> Hardening And Sync Posture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
              <p className="rounded-md border border-white/10 bg-black/25 p-3">Diagnostics: {data.openClawRuntimeStatus.status}. {data.openClawRuntimeStatus.notes}</p>
              <p className="rounded-md border border-white/10 bg-black/25 p-3">Auto-updates are signed through GitHub Releases. Secrets are not stored in the repo.</p>
              <p className="rounded-md border border-white/10 bg-black/25 p-3">Team/cloud sync remains optional and disabled by default. Local-first mode is the source of truth.</p>
            </CardContent>
          </Card>
        </div>
      </div>
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
