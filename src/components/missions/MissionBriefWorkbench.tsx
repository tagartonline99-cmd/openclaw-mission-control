import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, FileText, Play, RotateCcw, ShieldCheck, SkipForward, Sparkles, Workflow } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import type { MissionAgentStep, MissionDraftStepPlan } from "../../types";
import { formatDateTime, statusTone } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";

function label(value: string) {
  return value.replace(/_/g, " ");
}

function stepProgress(steps: MissionAgentStep[]) {
  if (steps.length === 0) return 0;
  const done = steps.filter((step) => ["complete", "skipped", "local_draft"].includes(step.status)).length;
  return Math.round((done / steps.length) * 100);
}

function isRunStep(step: MissionAgentStep | MissionDraftStepPlan): step is MissionAgentStep {
  return "id" in step;
}

export function MissionBriefWorkbench() {
  const {
    data,
    requestMissionStart,
    retryMissionStep,
    skipMissionStep,
    convertMissionStepToLocalDraft,
  } = useAppData();
  const [params, setParams] = useSearchParams();
  const requestedRunId = params.get("run");
  const requestedDraftId = params.get("draft");
  const firstRun = data.missionRuns[0];
  const firstDraft = data.missionDrafts[0];
  const initialId = requestedRunId ?? requestedDraftId ?? firstRun?.id ?? firstDraft?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialId);

  const draftFromSelection = useMemo(
    () => data.missionDrafts.find((draft) => draft.id === (requestedDraftId ?? selectedId)) ?? data.missionDrafts.find((draft) => draft.id === selectedId),
    [data.missionDrafts, requestedDraftId, selectedId],
  );
  const selectedRun = useMemo(
    () =>
      data.missionRuns.find((run) => run.id === (requestedRunId ?? selectedId)) ??
      data.missionRuns.find((run) => run.id === selectedId) ??
      (draftFromSelection?.runId ? data.missionRuns.find((run) => run.id === draftFromSelection.runId) : undefined),
    [data.missionRuns, draftFromSelection, requestedRunId, selectedId],
  );
  const selectedDraft = useMemo(
    () => (selectedRun ? data.missionDrafts.find((draft) => draft.id === selectedRun.draftId) : draftFromSelection),
    [data.missionDrafts, draftFromSelection, selectedRun],
  );
  const selectedQuest = data.quests.find((quest) => quest.id === (selectedRun?.questId ?? selectedDraft?.questId));
  const runSteps = selectedRun
    ? data.missionAgentSteps.filter((step) => step.missionRunId === selectedRun.id).sort((a, b) => a.order - b.order)
    : [];
  const sections = selectedRun
    ? data.missionBriefSections.filter((section) => section.missionRunId === selectedRun.id)
    : [];
  const results = selectedRun
    ? data.agentTurnResults.filter((result) => result.missionRunId === selectedRun.id)
    : [];
  const failedStep = runSteps.find((step) => step.status === "failed");
  const nextQueuedStep = runSteps.find((step) => step.status === "queued");
  const approval = selectedRun?.approvalId ? data.approvalRequests.find((request) => request.id === selectedRun.approvalId) : undefined;

  function selectRun(id: string) {
    setSelectedId(id);
    setParams({ run: id });
  }

  function selectDraft(id: string) {
    setSelectedId(id);
    setParams({ draft: id });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Drafts</p>
            <p className="mt-1 text-2xl font-semibold text-stone-50">{data.missionDrafts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Runs</p>
            <p className="mt-1 text-2xl font-semibold text-stone-50">{data.missionRuns.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Agent turns</p>
            <p className="mt-1 text-2xl font-semibold text-stone-50">{data.missionAgentSteps.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Artifacts</p>
            <p className="mt-1 text-2xl font-semibold text-stone-50">{data.missionBriefSections.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-amber-100" />
              Mission Ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.missionRuns.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => selectRun(run.id)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  selectedRun?.id === run.id ? "border-amber-300/40 bg-amber-400/10" : "border-white/10 bg-black/25 hover:border-teal-300/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-stone-100">{run.title}</p>
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(run.status)}`}>{label(run.status)}</span>
                </div>
                <Progress className="mt-3" value={stepProgress(data.missionAgentSteps.filter((step) => step.missionRunId === run.id))} />
              </button>
            ))}
            {data.missionDrafts.filter((draft) => !draft.runId).map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => selectDraft(draft.id)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  selectedDraft?.id === draft.id ? "border-amber-300/40 bg-amber-400/10" : "border-white/10 bg-black/25 hover:border-teal-300/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-stone-100">{draft.title}</p>
                  <Badge tone="amber">{label(draft.status)}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatDateTime(draft.updatedAt)}</p>
              </button>
            ))}
            {data.missionDrafts.length === 0 && data.missionRuns.length === 0 ? (
              <div className="rounded-md border border-white/10 bg-black/25 p-4 text-sm text-slate-300">
                No mission briefs yet. Use TeamLeader Chat and click Draft agent mission.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-100" />
                {selectedRun?.title ?? selectedDraft?.title ?? "Mission Brief"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedDraft && !selectedRun ? (
                <p className="text-sm text-slate-300">Select a mission draft or run.</p>
              ) : (
                <>
                  <div className="rounded-lg border border-teal-300/20 bg-teal-400/8 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Quest</p>
                        <p className="mt-1 font-semibold text-stone-100">{selectedQuest?.title ?? "Portfolio mission"}</p>
                      </div>
                      <Badge tone={selectedRun?.status === "complete" ? "emerald" : selectedRun?.status === "paused" ? "red" : "amber"}>
                        {label(selectedRun?.status ?? selectedDraft?.status ?? "draft")}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-200">{selectedRun?.objective ?? selectedDraft?.objective}</p>
                    {selectedRun ? <Progress className="mt-4" value={stepProgress(runSteps)} /> : null}
                  </div>

                  {selectedDraft && !selectedRun ? (
                    <div className="rounded-lg border border-amber-300/20 bg-amber-400/8 p-4">
                      <p className="text-sm font-semibold text-amber-100">Mission draft ready</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Starting this mission creates one approval for the exact local agent turns below. External browser research, scraping, messages, publishing, spending, launch, and automation stay separate.
                      </p>
                      <Button className="mt-4" variant="secondary" onClick={() => void requestMissionStart(selectedDraft.id)}>
                        <Play className="h-4 w-4" />
                        Request mission start approval
                      </Button>
                    </div>
                  ) : null}

                  {approval ? (
                    <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
                      Approval: <span className="text-amber-100">{approval.status}</span> / {approval.title}
                      <a className="ml-3 font-semibold text-teal-100 hover:text-teal-50" href="#/approvals">Review approvals</a>
                    </div>
                  ) : null}

                  {selectedRun?.finalSummary ? (
                    <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/8 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                        <ShieldCheck className="h-4 w-4" />
                        TeamLeader1A final summary
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{selectedRun.finalSummary}</p>
                    </div>
                  ) : null}

                  {failedStep ? (
                    <div className="rounded-lg border border-red-300/25 bg-red-500/8 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-red-100">
                        <AlertTriangle className="h-4 w-4" />
                        Mission paused at {failedStep.agentName}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{failedStep.error}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => void retryMissionStep(failedStep.id)}>
                          <RotateCcw className="h-4 w-4" />
                          Retry with approval
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void skipMissionStep(failedStep.id)}>
                          <SkipForward className="h-4 w-4" />
                          Skip locally
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void convertMissionStepToLocalDraft(failedStep.id)}>
                          <FileText className="h-4 w-4" />
                          Convert to local draft
                        </Button>
                      </div>
                    </div>
                  ) : selectedRun?.status === "paused" && nextQueuedStep ? (
                    <div className="rounded-lg border border-amber-300/25 bg-amber-400/8 p-4">
                      <p className="text-sm font-semibold text-amber-100">Remaining local turns need a fresh approval.</p>
                      <Button className="mt-3" variant="secondary" size="sm" onClick={() => void retryMissionStep(nextQueuedStep.id)}>
                        <Play className="h-4 w-4" />
                        Resume remaining with approval
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Turn Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {((runSteps.length ? runSteps : selectedDraft?.plannedSteps ?? []) as Array<MissionAgentStep | MissionDraftStepPlan>).map((step, index) => {
                const runStep = isRunStep(step) ? step : null;
                const status = runStep?.status ?? "planned";
                const result = runStep ? results.find((item) => item.stepId === runStep.id) : undefined;
                return (
                  <div key={isRunStep(step) ? step.id : `${step.agentId}-${index}`} className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-stone-100">{index + 1}. {step.title}</p>
                        <p className="mt-1 text-xs uppercase text-slate-500">{step.agentId} / {step.briefKind}</p>
                      </div>
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(status)}`}>{label(status)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{step.expectedArtifact}</p>
                    {runStep?.commandId ? (
                      <p className="mt-2 text-xs text-teal-100">Command: {runStep.commandId}</p>
                    ) : null}
                    {result ? (
                      <div className="mt-3 rounded-md border border-white/10 bg-black/25 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-teal-100">
                          <CheckCircle2 className="h-4 w-4" />
                          Result
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">{result.summary}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mission Brief Sections</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 xl:grid-cols-2">
              {sections.length === 0 ? (
                <p className="text-sm text-slate-300">Agent artifacts will appear here after the mission start approval executes.</p>
              ) : (
                sections.map((section) => (
                  <div key={section.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone="teal">{label(section.kind)}</Badge>
                      <Badge tone={section.status === "blocked" ? "red" : "emerald"}>{section.status}</Badge>
                    </div>
                    <p className="mt-3 font-semibold text-stone-100">{section.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{section.summary}</p>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase text-amber-100">Full artifact</summary>
                      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/30 p-3 text-xs leading-5 text-slate-300">{section.content}</pre>
                    </details>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
