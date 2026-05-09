import {
  Bot,
  CalendarCheck,
  Crown,
  Hammer,
  Map,
  PenTool,
  Search,
  Send,
  Zap,
} from "lucide-react";
import type { Agent, Quest } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { statusTone } from "../../utils/formatting";
import { useAppData } from "../../app/AppDataContext";

const iconMap = {
  Crown,
  Search,
  Map,
  PenTool,
  CalendarCheck,
  Hammer,
  Send,
  Zap,
  Bot,
};

function AgentCard({ agent, quests }: { agent: Agent; quests: Quest[] }) {
  const Icon = iconMap[agent.icon as keyof typeof iconMap] ?? Bot;
  const assigned = quests.filter((quest) => agent.assignedQuestIds.includes(quest.id));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-amber-300/35 bg-amber-400/10 shadow-glow">
            <Icon className="h-7 w-7 text-amber-100" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold text-stone-100">{agent.name}</h3>
                <p className="text-sm text-slate-400">{agent.role} / {agent.archetype}</p>
              </div>
              <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(agent.status)}`}>{agent.status}</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-normal text-slate-500">Level</p>
                <p className="text-lg font-semibold text-amber-100">{agent.level}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-normal text-slate-500">Workload</p>
                <p className="text-lg font-semibold text-stone-100">{agent.workload}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-normal text-slate-500">Score</p>
                <p className="text-lg font-semibold text-emerald-100">{agent.performanceScore}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>XP</span>
                <span>{agent.xp}/{agent.xpToNext}</span>
              </div>
              <Progress value={(agent.xp / agent.xpToNext) * 100} tone="amber" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{agent.currentTask}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {agent.skills.map((item) => (
                <Badge key={item.id} tone="teal">{item.name} Lv {item.level}</Badge>
              ))}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Recent contribution</p>
                <p className="mt-1 text-sm text-slate-300">{agent.recentContribution}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Assigned quests</p>
                <p className="mt-1 text-sm text-slate-300">{assigned.map((quest) => quest.title).join(", ") || "Unassigned"}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Suggested upgrades</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {agent.suggestedSkillUpgrades.map((upgrade) => (
                  <Badge key={upgrade} tone="violet">{upgrade}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentRosterGrid({ compact = false }: { compact?: boolean }) {
  const { data } = useAppData();
  const { agents, quests } = data;
  const list = compact ? agents.slice(0, 4) : agents;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>OpenClaw Party Roster</CardTitle>
          <p className="mt-1 text-sm text-slate-400">TeamLeader1A commands the party; all other agents report internally.</p>
        </div>
        <Badge tone="amber">{agents.length} agents</Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        {list.map((agent) => (
          <AgentCard key={agent.id} agent={agent} quests={quests} />
        ))}
      </CardContent>
    </Card>
  );
}
