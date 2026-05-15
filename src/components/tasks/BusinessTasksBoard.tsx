import { CheckCircle2, Clock, ExternalLink, Lock, Search, ShieldAlert, Sparkles } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppDataContext";
import type { BusinessTaskStatus } from "../../types";
import { formatCurrency, formatDateTime } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ClarityBadge } from "../dashboard/ClarityBadge";
import { ExecutionReceiptsPanel } from "../dashboard/ExecutionReceiptsPanel";
import { Progress } from "../ui/progress";

const groups: Array<{ status: BusinessTaskStatus; title: string; icon: React.ReactNode; tone: "teal" | "amber" | "red" | "emerald" | "slate" }> = [
  { status: "now_working", title: "Now Working", icon: <Sparkles className="h-4 w-4 text-teal-100" />, tone: "teal" },
  { status: "queued", title: "Queued", icon: <Clock className="h-4 w-4 text-amber-100" />, tone: "amber" },
  { status: "blocked", title: "Blocked", icon: <Lock className="h-4 w-4 text-red-100" />, tone: "red" },
  { status: "needs_approval", title: "Needs User Approval", icon: <ShieldAlert className="h-4 w-4 text-red-100" />, tone: "red" },
  { status: "done", title: "Done", icon: <CheckCircle2 className="h-4 w-4 text-emerald-100" />, tone: "emerald" },
];

const TASK_HISTORY_LIMIT = 8;
const UNCAPPED_TASK_STATUSES = new Set<BusinessTaskStatus>(["now_working", "blocked", "needs_approval"]);

function taskAgentName(agentId: string) {
  return agentId.replace("agent-", "Agent").replace("teamleader1a", "TeamLeader1A");
}

function byNewestTaskUpdate(left: { updatedAt?: string; startedAt?: string }, right: { updatedAt?: string; startedAt?: string }) {
  return (right.updatedAt ?? right.startedAt ?? "").localeCompare(left.updatedAt ?? left.startedAt ?? "");
}

export function BusinessTasksBoard() {
  const { data } = useAppData();
  const [teamLeaderOnly, setTeamLeaderOnly] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Partial<Record<BusinessTaskStatus, boolean>>>({});
  const displayTasks = useMemo(() => {
    const activeHuntIds = new Set(
      data.opportunityHunts
        .filter((hunt) => !["ready_to_review", "approved_as_business", "rejected"].includes(hunt.status))
        .map((hunt) => hunt.id),
    );
    const completedHuntIds = new Set(
      data.opportunityHunts
        .filter((hunt) => ["ready_to_review", "approved_as_business", "rejected"].includes(hunt.status) || /finished the proposal|review it in mission briefs|proposal draft exists/i.test(hunt.currentPhase ?? ""))
        .map((hunt) => hunt.id),
    );
    const completedProposalIds = new Set(
      data.businessProposals
        .filter((proposal) => ["ready_for_review", "approved", "revision_requested", "rejected"].includes(proposal.status))
        .map((proposal) => proposal.id),
    );
    return data.businessTasks.map((task) => {
      const staleFinished =
        task.status !== "done" &&
        !(task.huntId && activeHuntIds.has(task.huntId)) &&
        ((task.huntId && completedHuntIds.has(task.huntId)) || (task.proposalId && completedProposalIds.has(task.proposalId))) &&
        !task.approvalRequired;
      return staleFinished ? { ...task, status: "done" as const, progress: 100 } : task;
    }).sort(byNewestTaskUpdate);
  }, [data.businessProposals, data.businessTasks, data.opportunityHunts]);
  const visibleTasks = useMemo(
    () => teamLeaderOnly ? displayTasks.filter((task) => task.huntId || task.proposalId || task.businessId) : displayTasks,
    [displayTasks, teamLeaderOnly],
  );
  const [selectedTaskId, setSelectedTaskId] = useState(visibleTasks[0]?.id ?? "");
  const selectedTask = visibleTasks.find((task) => task.id === selectedTaskId) ?? visibleTasks.find((task) => task.status === "now_working" || task.approvalRequired) ?? visibleTasks[0];
  const selectedTaskLogs = selectedTask?.logs.slice(0, TASK_HISTORY_LIMIT) ?? [];
  const hiddenSelectedLogCount = (selectedTask?.logs.length ?? 0) - selectedTaskLogs.length;
  const taskCounts = useMemo(
    () => Object.fromEntries(groups.map((group) => [group.status, visibleTasks.filter((task) => task.status === group.status).length])),
    [visibleTasks],
  );

  if (visibleTasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <Badge tone="amber">Waiting for TeamLeader1A</Badge>
          <h3 className="mt-3 font-display text-2xl font-semibold text-stone-50">No live agent tasks yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Send TeamLeader1A a command like "find me the best online business idea with zero budget." Tasks will appear here automatically as agents start working.
          </p>
          <a className="mt-4 inline-flex text-sm font-semibold text-teal-100 hover:text-teal-50" href="#/">
            Go to Command
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/25 p-3">
          <div>
            <p className="text-sm font-semibold text-stone-100">Task view filter</p>
            <p className="text-xs text-slate-400">Recent-first task view keeps active, blocked, and approval-needed records visible while capping older done/queued history.</p>
          </div>
          <button
            type="button"
            onClick={() => setTeamLeaderOnly((value) => !value)}
            className="rounded-md border border-teal-300/30 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 transition hover:bg-teal-400/15"
          >
            {teamLeaderOnly ? "TeamLeader-created only" : "Showing all tasks"}
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {groups.map((group) => (
            <Card key={group.status}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  {group.icon}
                  <p className="text-xs font-semibold uppercase text-slate-500">{group.title}</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-stone-50">{taskCounts[group.status] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {groups.map((group) => {
          const tasks = visibleTasks.filter((task) => task.status === group.status);
          if (tasks.length === 0) return null;
          const groupExpanded = !!expandedGroups[group.status];
          const visibleGroupTasks = UNCAPPED_TASK_STATUSES.has(group.status) || groupExpanded ? tasks : tasks.slice(0, TASK_HISTORY_LIMIT);
          const hiddenGroupTaskCount = tasks.length - visibleGroupTasks.length;
          return (
            <Card key={group.status}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {group.icon}
                  {group.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                {visibleGroupTasks.map((task) => {
                  const proposal = data.businessProposals.find((item) => item.id === task.proposalId);
                  const business = data.approvedBusinesses.find((item) => item.id === task.businessId);
                  const budgetPlan = proposal?.budgetPlan ?? business?.budgetPlan;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className="rounded-lg border border-white/10 bg-black/25 p-4 text-left transition hover:border-teal-300/35 hover:bg-teal-400/8"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-stone-100">{task.title}</p>
                          <p className="mt-1 text-xs uppercase text-slate-500">
                            {taskAgentName(task.agentId)} / {business?.name ?? proposal?.title ?? "TeamLeader work"}
                          </p>
                        </div>
                        <Badge tone={group.tone}>{task.status.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{task.objective}</p>
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs uppercase text-slate-500">
                          <span>{task.currentArtifact}</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} tone={task.status === "done" ? "emerald" : "teal"} />
                      </div>
                      {task.currentSource ? (
                        <p className="mt-2 flex items-center gap-2 text-xs text-teal-100">
                          <Search className="h-3.5 w-3.5" />
                          {task.currentSource}
                        </p>
                      ) : null}
                      {budgetPlan ? (
                        <p className="mt-2 text-xs text-emerald-100">
                          Budget known: cap {formatCurrency(budgetPlan.businessBudgetCap)}, required {formatCurrency(budgetPlan.requiredSpend)}, remaining {formatCurrency(budgetPlan.portfolioRemainingCapital)}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
                {hiddenGroupTaskCount > 0 ? (
                  <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3 text-sm text-teal-100 lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span>Recent-first history cap: showing {visibleGroupTasks.length} of {tasks.length} {group.title.toLowerCase()} tasks.</span>
                      <button
                        type="button"
                        className="rounded-md border border-teal-300/30 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 transition hover:bg-teal-400/15"
                        onClick={() => setExpandedGroups((current) => ({ ...current, [group.status]: !current[group.status] }))}
                      >
                        {groupExpanded ? "Show fewer tasks" : "View all task history"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="xl:sticky xl:top-28 xl:self-start">
        <CardHeader>
          <CardTitle>Task Inspector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTask ? (
            <>
              {(() => {
                const proposal = data.businessProposals.find((item) => item.id === selectedTask.proposalId);
                const business = data.approvedBusinesses.find((item) => item.id === selectedTask.businessId);
                const budgetPlan = proposal?.budgetPlan ?? business?.budgetPlan;
                const platformRequirements = proposal
                  ? data.externalPlatformRequirements.filter((item) => proposal.externalPlatformRequirementIds.includes(item.id))
                  : business
                    ? data.externalPlatformRequirements.filter((item) => business.externalPlatformRequirementIds.includes(item.id))
                    : [];
                return (
                  <div className="rounded-md border border-emerald-300/20 bg-emerald-400/8 p-3">
                    <p className="text-xs font-semibold uppercase text-emerald-100">What this agent knows</p>
                    <p className="mt-1 text-sm leading-6 text-emerald-50">
                      {budgetPlan
                        ? `Budget cap ${formatCurrency(budgetPlan.businessBudgetCap)}, required spend ${formatCurrency(budgetPlan.requiredSpend)}, remaining capital ${formatCurrency(budgetPlan.portfolioRemainingCapital)}.`
                        : "No proposal budget is attached yet."}
                    </p>
                    {platformRequirements.length > 0 ? (
                      <p className="mt-1 text-xs text-slate-300">
                        Platform boundary: {platformRequirements.map((item) => `${item.platform} requires ${item.userLoginRequired ? "manual user login" : "no login"} and ${item.approvalRequiredBeforePublish ? "separate publish approval" : "no publish approval"}`).join("; ")}.
                      </p>
                    ) : null}
                  </div>
                );
              })()}
              <div>
                <ClarityBadge label={selectedTask.approvalRequired ? "Pending Approval" : selectedTask.currentSource ? "Real Public Read" : "Local Draft"} />
                <h3 className="mt-3 font-display text-xl font-semibold text-stone-50">{selectedTask.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{selectedTask.expectedOutput}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/25 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Dependency</p>
                <p className="mt-1 text-sm text-slate-300">{selectedTask.dependency ?? "None"}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/25 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Updated</p>
                <p className="mt-1 text-sm text-slate-300">{formatDateTime(selectedTask.updatedAt)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Live log</p>
                {selectedTaskLogs.map((log) => (
                  <div key={log} className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
                    {log}
                  </div>
                ))}
                {hiddenSelectedLogCount > 0 ? (
                  <p className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3 text-xs text-teal-100">
                    Showing the latest {selectedTaskLogs.length} log entries; {hiddenSelectedLogCount} older entries are capped.
                  </p>
                ) : null}
              </div>
              {selectedTask.proposalId ? (
                <a className="inline-flex items-center gap-2 text-sm font-semibold text-teal-100 hover:text-teal-50" href={`#/mission-briefs?proposal=${selectedTask.proposalId}`}>
                  <ExternalLink className="h-4 w-4" />
                  View proposal
                </a>
              ) : null}
              {selectedTask.approvalRequired ? (
                <a className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100 hover:text-amber-50" href="#/approvals">
                  <ShieldAlert className="h-4 w-4" />
                  Open pending approvals
                </a>
              ) : null}
              <ExecutionReceiptsPanel businessId={selectedTask.businessId} limit={3} title="Task Receipts" />
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
