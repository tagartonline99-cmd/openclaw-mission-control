import { BookOpen, Coins, Scroll, ShieldCheck, Swords } from "lucide-react";
import type { Agent, Quest, ValidationReport } from "../../types";
import { formatCurrency, riskTone, statusTone } from "../../utils/formatting";
import { calculateValidationCompletion } from "../../utils/scoring";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { useAppData } from "../../app/AppDataContext";

function agentNames(ids: string[], agents: Agent[]) {
  return ids
    .map((id) => agents.find((agent) => agent.id === id)?.name)
    .filter(Boolean)
    .join(", ");
}

function QuestCard({ quest, agents, validationReports }: { quest: Quest; agents: Agent[]; validationReports: ValidationReport[] }) {
  const report = validationReports.find((item) => item.questId === quest.id);
  const validation = report ? calculateValidationCompletion(report) : 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone={quest.difficulty === "Boss" ? "red" : "amber"}>{quest.difficulty}</Badge>
              <Badge tone="teal">{quest.type}</Badge>
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${riskTone(quest.riskLevel)}`}>{quest.riskLevel} risk</span>
            </div>
            <h3 className="font-display text-xl font-semibold text-stone-100">{quest.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{quest.businessIdea}</p>
          </div>
          <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(quest.approvalStatus)}`}>
            {quest.approvalStatus.replace("_", " ")}
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2 text-xs uppercase text-slate-500"><Swords className="h-3.5 w-3.5" /> Stage</div>
            <p className="mt-1 text-sm font-semibold text-stone-100">{quest.stage}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2 text-xs uppercase text-slate-500"><Coins className="h-3.5 w-3.5" /> Capital</div>
            <p className="mt-1 text-sm font-semibold text-emerald-100">{formatCurrency(quest.capitalAllocated)} / {formatCurrency(quest.requiredBudget)}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2 text-xs uppercase text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> Validation</div>
            <p className="mt-1 text-sm font-semibold text-amber-100">{validation}% complete</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2 text-xs uppercase text-slate-500"><BookOpen className="h-3.5 w-3.5" /> Timeline</div>
            <p className="mt-1 text-sm font-semibold text-stone-100">{quest.expectedTimeline}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Quest progress</span>
              <span>{quest.progress}%</span>
            </div>
            <Progress value={quest.progress} tone={quest.riskLevel === "high" ? "red" : "amber"} />
            <p className="mt-3 text-sm leading-6 text-slate-300">{quest.currentStatus}</p>
            {quest.bottleneck ? <p className="mt-2 text-sm text-red-200">Bottleneck: {quest.bottleneck}</p> : null}
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Assigned raid party</p>
            <p className="mt-1 text-sm text-slate-300">{agentNames(quest.assignedAgentIds, agents)}</p>
            <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Next action</p>
            <p className="mt-1 text-sm text-stone-200">{quest.nextAction}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><Scroll className="h-3.5 w-3.5" /> Evidence</p>
            <ul className="space-y-1 text-sm text-slate-300">
              {quest.validationEvidence.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Success metrics</p>
            <ul className="space-y-1 text-sm text-slate-300">
              {quest.successMetrics.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Failure criteria</p>
            <ul className="space-y-1 text-sm text-slate-300">
              {quest.failureCriteria.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </div>
        </div>
        {quest.bossFight ? (
          <div className="mt-5 rounded-lg border border-red-300/20 bg-red-500/8 p-3">
            <p className="text-xs font-semibold uppercase text-red-100">Boss fight</p>
            <p className="mt-1 text-sm text-stone-200">{quest.bossFight}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function QuestBoard({ limit }: { limit?: number }) {
  const { data } = useAppData();
  const { quests, agents, validationReports } = data;
  const list = typeof limit === "number" ? quests.slice(0, limit) : quests;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Quest Board</CardTitle>
          <p className="mt-1 text-sm text-slate-400">Business quests stay locked until validation and approvals are clear.</p>
        </div>
        <Badge tone="amber">{quests.length} quests</Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        {list.map((quest) => <QuestCard key={quest.id} quest={quest} agents={agents} validationReports={validationReports} />)}
      </CardContent>
    </Card>
  );
}
