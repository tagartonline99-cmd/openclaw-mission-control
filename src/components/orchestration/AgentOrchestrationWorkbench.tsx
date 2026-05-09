import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  GitBranch,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  XCircle,
} from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import type { AgentRunReviewStatus, Task } from "../../types";
import { formatDateTime, statusTone } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Select } from "../ui/select";

function label(value: string) {
  return value.replace(/_/g, " ");
}

function taskReady(task: Task, tasks: Task[]) {
  return task.dependencyIds.every((dependencyId) => tasks.find((item) => item.id === dependencyId)?.status === "done");
}

function runProgress(tasks: Task[]) {
  if (tasks.length === 0) return 0;
  const complete = tasks.filter((task) => task.status === "done").length;
  return Math.round((complete / tasks.length) * 100);
}

function reviewActionLabel(status: AgentRunReviewStatus) {
  if (status === "accepted") return "Accept Run";
  if (status === "needs_revision") return "Request Revision";
  return "Reject Run";
}

export function AgentOrchestrationWorkbench() {
  const {
    data,
    createAgentOrchestrationRun,
    completeAgentTask,
    reviewAgentRun,
  } = useAppData();
  const [questId, setQuestId] = useState(data.quests[0]?.id ?? "");
  const [objective, setObjective] = useState(
    "Coordinate internal agents into a reviewable validation package with evidence, assumptions, artifacts, and a safe next-step recommendation.",
  );
  const [selectedRunId, setSelectedRunId] = useState(data.agentOrchestrationRuns[0]?.id ?? "");

  const selectedRun = useMemo(
    () => data.agentOrchestrationRuns.find((run) => run.id === selectedRunId) ?? data.agentOrchestrationRuns[0],
    [data.agentOrchestrationRuns, selectedRunId],
  );
  const selectedQuest = data.quests.find((quest) => quest.id === (selectedRun?.questId ?? questId));
  const runTasks = useMemo(
    () => (selectedRun ? data.tasks.filter((task) => selectedRun.taskIds.includes(task.id)) : []),
    [data.tasks, selectedRun],
  );
  const runArtifacts = selectedRun
    ? data.agentArtifacts.filter((artifact) => selectedRun.artifactIds.includes(artifact.id) || artifact.runId === selectedRun.id)
    : [];
  const runReviews = selectedRun
    ? data.agentRunReviews.filter((review) => selectedRun.reviewIds.includes(review.id) || review.runId === selectedRun.id)
    : [];
  const internalReports = selectedRun
    ? data.agentMessages.filter((message) => message.questId === selectedRun.questId && message.visibility === "internal_report").slice(0, 5)
    : [];
  const activeRuns = data.agentOrchestrationRuns.filter((run) => ["assigned", "in_progress", "teamleader_review", "needs_revision"].includes(run.status));
  const pendingTasks = data.tasks.filter((task) => task.status !== "done").length;
  const reviewReady = selectedRun?.status === "teamleader_review" || runTasks.some((task) => task.status === "review");

  useEffect(() => {
    if (!questId && data.quests[0]) setQuestId(data.quests[0].id);
  }, [data.quests, questId]);

  useEffect(() => {
    if (!selectedRunId && data.agentOrchestrationRuns[0]) setSelectedRunId(data.agentOrchestrationRuns[0].id);
  }, [data.agentOrchestrationRuns, selectedRunId]);

  async function createRun() {
    if (!questId) return;
    const runId = await createAgentOrchestrationRun({ questId, objective });
    setSelectedRunId(runId);
  }

  async function review(status: AgentRunReviewStatus) {
    if (!selectedRun) return;
    await reviewAgentRun(selectedRun.id, status);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-teal-300/25 bg-teal-400/10">
              <Workflow className="h-5 w-5 text-teal-100" />
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Active runs</p>
              <p className="text-2xl font-semibold text-stone-50">{activeRuns.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-amber-300/25 bg-amber-400/10">
              <GitBranch className="h-5 w-5 text-amber-100" />
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Open local tasks</p>
              <p className="text-2xl font-semibold text-stone-50">{pendingTasks}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-300/25 bg-emerald-400/10">
              <FileText className="h-5 w-5 text-emerald-100" />
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Review artifacts</p>
              <p className="text-2xl font-semibold text-stone-50">{data.agentArtifacts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-100" />
            Create Local Agent Run
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[320px_1fr_auto]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Quest</p>
            <Select value={questId} onChange={(event) => setQuestId(event.target.value)}>
              {data.quests.map((quest) => (
                <option key={quest.id} value={quest.id}>
                  {quest.title}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Objective</p>
            <textarea
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              className="min-h-24 w-full rounded-md border border-white/10 bg-black/30 p-3 text-sm leading-6 text-stone-100 outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => void createRun()}>
              <Play className="h-4 w-4" />
              Assign Run
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-100" />
              Run Ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.agentOrchestrationRuns.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-black/25 p-4 text-sm text-slate-300">
                No orchestration runs yet. Assign one above to create a TeamLeader1A-managed task tree.
              </div>
            ) : (
              data.agentOrchestrationRuns.map((run) => {
                const tasks = data.tasks.filter((task) => run.taskIds.includes(task.id));
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={`w-full rounded-md border p-3 text-left transition ${
                      selectedRun?.id === run.id
                        ? "border-amber-300/40 bg-amber-400/10"
                        : "border-white/10 bg-black/25 hover:border-teal-300/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-stone-100">{run.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(run.updatedAt)}</p>
                      </div>
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(run.status)}`}>
                        {label(run.status)}
                      </span>
                    </div>
                    <Progress value={runProgress(tasks)} className="mt-3" />
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-amber-100" />
                  Agent Task Tree
                </span>
                {selectedRun ? <Badge tone="teal">{runProgress(runTasks)}% complete</Badge> : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedRun ? (
                <p className="text-sm text-slate-300">Select or create a run to inspect the task tree.</p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-stone-100">{selectedQuest?.title ?? selectedRun.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{selectedRun.objective}</p>
                      </div>
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(selectedRun.status)}`}>
                        {label(selectedRun.status)}
                      </span>
                    </div>
                  </div>
                  {runTasks.map((task, index) => {
                    const agent = data.agents.find((item) => item.id === task.assignedAgentId);
                    const ready = taskReady(task, runTasks) || task.status === "in_progress" || task.status === "review";
                    const done = task.status === "done";
                    return (
                      <div key={task.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-amber-300/25 bg-amber-400/10 text-sm font-semibold text-amber-100">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="break-words font-semibold text-stone-100">{task.title}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {agent?.name ?? task.assignedAgentId} / {task.dependencyIds.length} dependencies
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(task.status)}`}>
                              {label(task.status)}
                            </span>
                            <Button
                              variant={task.status === "review" ? "secondary" : "outline"}
                              size="sm"
                              disabled={done || !ready}
                              onClick={() => void completeAgentTask(task.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {task.status === "review" ? "Complete Review" : "Complete Local Task"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-100" />
                  Artifact Vault
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {runArtifacts.length === 0 ? (
                  <p className="text-sm text-slate-300">Completed tasks will create local artifacts for TeamLeader1A review.</p>
                ) : (
                  runArtifacts.map((artifact) => (
                    <div key={artifact.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-100">{artifact.title}</p>
                        <Badge tone={artifact.status === "accepted" ? "emerald" : artifact.status === "rejected" ? "red" : "amber"}>
                          {label(artifact.status)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{artifact.summary}</p>
                      <p className="mt-2 text-xs uppercase text-slate-500">{label(artifact.type)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-100" />
                  TeamLeader1A Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!selectedRun ? (
                  <p className="text-sm text-slate-300">Select a run to see review controls.</p>
                ) : (
                  <>
                    <div className="rounded-md border border-white/10 bg-black/25 p-3">
                      <p className="text-sm leading-6 text-slate-300">{selectedRun.teamLeaderSummary}</p>
                    </div>
                    {selectedRun.skillGaps.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedRun.skillGaps.map((gap) => (
                          <Badge key={gap} tone="violet">
                            {gap}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {(["accepted", "needs_revision", "rejected"] as AgentRunReviewStatus[]).map((status) => (
                        <Button
                          key={status}
                          variant={status === "accepted" ? "secondary" : status === "needs_revision" ? "outline" : "danger"}
                          size="sm"
                          disabled={!reviewReady || ["accepted", "rejected"].includes(selectedRun.status)}
                          onClick={() => void review(status)}
                        >
                          {status === "accepted" ? <CheckCircle2 className="h-4 w-4" /> : status === "needs_revision" ? <RotateCcw className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          {reviewActionLabel(status)}
                        </Button>
                      ))}
                    </div>
                    {!reviewReady ? (
                      <div className="flex gap-2 rounded-md border border-amber-300/20 bg-amber-400/8 p-3 text-sm text-amber-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        TeamLeader1A review unlocks after the dependency artifacts reach the final review task.
                      </div>
                    ) : null}
                    {runReviews.map((review) => (
                      <div key={review.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge tone={review.status === "accepted" ? "emerald" : review.status === "rejected" ? "red" : "amber"}>
                            {label(review.status)}
                          </Badge>
                          <span className="text-xs text-slate-500">{formatDateTime(review.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{review.summary}</p>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Internal Reports To TeamLeader1A</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {internalReports.length === 0 ? (
                <p className="text-sm text-slate-300">
                  Other agents never message the user directly. Their reports appear here as internal submissions for TeamLeader1A.
                </p>
              ) : (
                internalReports.map((message) => {
                  const agent = data.agents.find((item) => item.id === message.fromAgentId);
                  return (
                    <div key={message.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-100">{agent?.name ?? message.fromAgentId}</p>
                        <span className="text-xs text-slate-500">{formatDateTime(message.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{message.summary}</p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
