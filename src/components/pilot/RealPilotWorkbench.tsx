import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Compass, FileText, Play, RotateCcw, ScrollText, ShieldCheck } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Progress } from "../ui/progress";
import { formatCurrency, formatDateTime, statusTone } from "../../utils/formatting";
import type { RealPilotRun } from "../../types";
import { safetyPolicyService } from "../../services/safetyPolicyService";

function urlList(value: string) {
  return value.split(/[,\n]/g).map((url) => url.trim()).filter(Boolean);
}

function invalidUrl(value: string) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    if (!["http:", "https:"].includes(parsed.protocol)) return "Only http and https URLs are supported.";
    if (value.includes("@") || value.includes("*")) return "Credentials, wildcards, and patterns are blocked.";
    if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local")) return "Local/private hosts are blocked for approved research.";
    const parts = host.split(".").map((part) => Number(part));
    if (parts.length === 4 && parts.every((part) => !Number.isNaN(part))) {
      const [a, b] = parts;
      if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
        return "Private network addresses are blocked.";
      }
    }
    return "";
  } catch {
    return "Enter explicit absolute URLs.";
  }
}

function pilotProgress(status: RealPilotRun["status"]) {
  const values: Record<RealPilotRun["status"], number> = {
    draft: 18,
    research_requested: 38,
    research_complete: 56,
    teamleader_review_requested: 72,
    test_plan_ready: 86,
    exported: 100,
    failed: 100,
  };
  return values[status];
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function RealPilotWorkbench() {
  const {
    data,
    createRealPilotRun,
    updateRealPilotRun,
    requestPilotUrlResearch,
    requestPilotTeamLeaderReview,
    exportRealPilotReport,
    lastExportResult,
    revealExportedPath,
  } = useAppData();
  const { quests, validationReports, openClawCommands, realPilotRuns } = data;
  const [activeRunId, setActiveRunId] = useState(realPilotRuns[0]?.id ?? "");
  const selectedRun = realPilotRuns.find((run) => run.id === activeRunId);
  const defaultQuest = quests.find((quest) => !["Archived", "Failed", "Retired"].includes(quest.stage)) ?? quests[0];
  const [questId, setQuestId] = useState(selectedRun?.questId ?? defaultQuest?.id ?? "");
  const selectedQuest = quests.find((quest) => quest.id === questId) ?? defaultQuest;
  const validation = validationReports.find((report) => report.questId === selectedQuest?.id);
  const [purpose, setPurpose] = useState(selectedRun?.purpose ?? `Real pilot evidence check for ${selectedQuest?.title ?? "selected quest"}`);
  const [approvedUrls, setApprovedUrls] = useState(selectedRun?.approvedUrls.join("\n") ?? "https://example.com");
  const [extractionGoal, setExtractionGoal] = useState(selectedRun?.extractionGoal ?? "Fetch page status/title, summarize positioning, evidence, risks, and next safe validation step.");
  const [validationSummary, setValidationSummary] = useState(
    selectedRun?.validationChecklistSummary ??
      validation?.teamLeaderRecommendation ??
      "Summarize audience, problem, demand evidence, monetization, traffic plan, costs, success metrics, and kill criteria.",
  );
  const [riskReview, setRiskReview] = useState(selectedRun?.riskReview ?? "Local research only. No publishing, spending, login automation, form submission, purchases, PII harvesting, or scraping beyond approved URLs.");
  const [minimumTestPlan, setMinimumTestPlan] = useState(selectedRun?.minimumTestPlan ?? validation?.minimumTest ?? "Run a small evidence-gathering test, review results, then decide whether to revise or kill the idea.");
  const [successCriteria, setSuccessCriteria] = useState(selectedRun?.successCriteria ?? validation?.successDefinition ?? "Enough evidence to justify a controlled MVP test without external launch or spend.");
  const [killCriteria, setKillCriteria] = useState(selectedRun?.killCriteria ?? validation?.killCriteria ?? "Kill or revise if evidence of demand, channel fit, or economics remains weak.");
  const [budgetCap, setBudgetCap] = useState(selectedRun?.budgetCap ?? validation?.budgetNeeded ?? 0);
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  useEffect(() => {
    if (!activeRunId && realPilotRuns[0]) {
      setActiveRunId(realPilotRuns[0].id);
    }
  }, [activeRunId, realPilotRuns]);

  const linkedCommands = useMemo(() => {
    if (!selectedRun) return [];
    return openClawCommands.filter((command) => selectedRun.commandIds.includes(command.id));
  }, [openClawCommands, selectedRun]);
  const draftSafetyEvaluation = useMemo(
    () =>
      safetyPolicyService.evaluateOpenClawPayload(
        {
          actionKind: "url_research",
          purpose,
          urls: urlList(approvedUrls),
          extractionGoal,
          riskNotes: riskReview,
          successCriteria,
          expectedResult: "TeamLeader1A records evidence from the approved URLs and identifies the next safe validation step.",
        },
        { allowlistEntries: data.allowlistEntries, userSettings: data.userSettings },
      ),
    [approvedUrls, data.allowlistEntries, data.userSettings, extractionGoal, purpose, riskReview, successCriteria],
  );

  const saveRun = async () => {
    if (!selectedQuest) return;
    const urls = urlList(approvedUrls);
    const blocked = urls.find((url) => invalidUrl(url));
    if (urls.length === 0 || urls.length > 8 || blocked) {
      setNotice({ tone: "warning", text: blocked ? `URL blocked: ${blocked}` : "Use 1-8 explicit approved URLs." });
      return;
    }

    const input = {
      questId: selectedQuest.id,
      purpose,
      approvedUrls: urls,
      extractionGoal,
      validationChecklistSummary: validationSummary,
      riskReview,
      minimumTestPlan,
      successCriteria,
      killCriteria,
      budgetCap,
    };

    if (selectedRun) {
      await updateRealPilotRun(selectedRun.id, input);
      setNotice({ tone: "success", text: "Real pilot draft saved locally." });
      return;
    }

    const runId = await createRealPilotRun(input);
    setActiveRunId(runId);
    setNotice({ tone: "success", text: "Real pilot draft created locally." });
  };

  const requestResearch = async () => {
    const run = selectedRun;
    if (!run) {
      setNotice({ tone: "warning", text: "Save a real pilot draft first." });
      return;
    }
    await requestPilotUrlResearch(run.id);
    setNotice(
      draftSafetyEvaluation.allowed
        ? { tone: "success", text: "URL research approval request created. No browser research has run yet." }
        : { tone: "warning", text: `Blocked attempt recorded. ${draftSafetyEvaluation.blockedReasons.join(" ")}` },
    );
  };

  const requestReview = async () => {
    const run = selectedRun;
    if (!run) {
      setNotice({ tone: "warning", text: "Save a real pilot draft first." });
      return;
    }
    await requestPilotTeamLeaderReview(run.id);
    setNotice({ tone: "success", text: "TeamLeader1A review approval request created." });
  };

  const exportReport = async () => {
    const run = selectedRun;
    if (!run) {
      setNotice({ tone: "warning", text: "Save a real pilot draft first." });
      return;
    }
    const result = await exportRealPilotReport(run.id);
    setNotice({ tone: result.ok ? "success" : "warning", text: result.message });
  };

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-amber-100" />
            Phase 6A Real Pilot Workbench
          </CardTitle>
          <p className="mt-1 text-sm text-slate-400">One local pilot can gather approved research, validation notes, a TeamLeader1A review, and an Obsidian report before any launch, spend, publish, or external automation.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-4">
            <div className="rounded-lg border border-amber-300/20 bg-amber-400/8 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Active pilot</p>
              <p className="mt-1 text-lg font-semibold text-amber-100">{selectedRun ? statusLabel(selectedRun.status) : "new draft"}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Quest</p>
              <p className="mt-1 truncate text-sm font-semibold text-stone-100">{selectedQuest?.title ?? "No quest selected"}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Budget cap</p>
              <p className="mt-1 text-sm font-semibold text-emerald-100">{formatCurrency(budgetCap)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Linked commands</p>
              <p className="mt-1 text-sm font-semibold text-teal-100">{linkedCommands.length}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Pilot readiness</span>
              <span>{selectedRun ? pilotProgress(selectedRun.status) : 0}%</span>
            </div>
            <Progress value={selectedRun ? pilotProgress(selectedRun.status) : 0} tone="amber" />
          </div>
          {notice ? (
            <div className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${notice.tone === "success" ? "border-teal-300/25 bg-teal-400/8 text-teal-100" : "border-amber-300/25 bg-amber-400/8 text-amber-100"}`}>
              {notice.tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {notice.text}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-100" />
              Pilot Draft
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Quest</p>
                <Select value={questId} onChange={(event) => setQuestId(event.target.value)}>
                  {quests.map((quest) => (
                    <option key={quest.id} value={quest.id}>{quest.title}</option>
                  ))}
                </Select>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Budget cap</p>
                <Input type="number" value={budgetCap} onChange={(event) => setBudgetCap(Number(event.target.value) || 0)} />
              </div>
            </div>
            <Input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Pilot purpose" />
            <textarea className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20" value={approvedUrls} onChange={(event) => setApprovedUrls(event.target.value)} placeholder="Approved URLs, one per line" />
            <div className={`rounded-lg border p-3 text-sm ${draftSafetyEvaluation.allowed ? "border-teal-300/25 bg-teal-400/8 text-teal-100" : "border-red-300/25 bg-red-500/8 text-red-100"}`}>
              Safety evaluation: {draftSafetyEvaluation.allowed ? "eligible for approval" : draftSafetyEvaluation.blockedReasons.join(" ")}
              <div className="mt-2 flex flex-wrap gap-2">
                {draftSafetyEvaluation.riskFlags.map((flag) => <Badge key={flag} tone={draftSafetyEvaluation.allowed ? "amber" : "red"}>{safetyPolicyService.riskFlagLabel(flag)}</Badge>)}
              </div>
            </div>
            <Input value={extractionGoal} onChange={(event) => setExtractionGoal(event.target.value)} placeholder="Extraction goal" />
            <textarea className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20" value={validationSummary} onChange={(event) => setValidationSummary(event.target.value)} placeholder="Validation checklist summary" />
            <textarea className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20" value={riskReview} onChange={(event) => setRiskReview(event.target.value)} placeholder="Risk review" />
            <textarea className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20" value={minimumTestPlan} onChange={(event) => setMinimumTestPlan(event.target.value)} placeholder="Minimum test plan" />
            <div className="grid gap-4 lg:grid-cols-2">
              <textarea className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20" value={successCriteria} onChange={(event) => setSuccessCriteria(event.target.value)} placeholder="Success criteria" />
              <textarea className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20" value={killCriteria} onChange={(event) => setKillCriteria(event.target.value)} placeholder="Kill criteria" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void saveRun()}>
                <ScrollText className="h-4 w-4" />
                {selectedRun ? "Save Pilot Draft" : "Create Pilot Draft"}
              </Button>
              <Button variant="outline" onClick={() => void requestResearch()}>
                <Play className="h-4 w-4" />
                Request URL Research Approval
              </Button>
              <Button variant="outline" onClick={() => void requestReview()}>
                <ShieldCheck className="h-4 w-4" />
                Request TeamLeader1A Review
              </Button>
              <Button variant="secondary" onClick={() => void exportReport()}>
                <FileText className="h-4 w-4" />
                Export Pilot Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-100" />
                Pilot Runs
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveRunId("__new__");
                  setNotice({ tone: "success", text: "New pilot draft is ready." });
                }}
              >
                New Draft
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {realPilotRuns.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-slate-400">No real pilot runs yet.</div>
            ) : null}
            {realPilotRuns.map((run) => {
              const quest = quests.find((item) => item.id === run.questId);
              return (
                <button
                  key={run.id}
                  className={`w-full rounded-lg border p-3 text-left transition ${run.id === selectedRun?.id ? "border-amber-300/40 bg-amber-400/10" : "border-white/10 bg-black/25 hover:border-white/20"}`}
                  onClick={() => {
                    setActiveRunId(run.id);
                    setQuestId(run.questId);
                    setPurpose(run.purpose);
                    setApprovedUrls(run.approvedUrls.join("\n"));
                    setExtractionGoal(run.extractionGoal);
                    setValidationSummary(run.validationChecklistSummary);
                    setRiskReview(run.riskReview);
                    setMinimumTestPlan(run.minimumTestPlan);
                    setSuccessCriteria(run.successCriteria);
                    setKillCriteria(run.killCriteria);
                    setBudgetCap(run.budgetCap);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-stone-100">{quest?.title ?? run.title}</p>
                    <Badge tone={run.status === "failed" ? "red" : run.status === "exported" ? "emerald" : "amber"}>{statusLabel(run.status)}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(run.updatedAt)}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Linked OpenClaw Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedCommands.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-slate-400">No linked command results yet.</div>
            ) : null}
            {linkedCommands.map((command) => (
              <div key={command.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="text-xs text-teal-100">{command.command}</code>
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(command.status)}`}>{command.status.replace("_", " ")}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{command.resultSummary ?? "No result yet."}</p>
                {command.stdout ? <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-md border border-teal-300/20 bg-teal-400/8 p-2 text-xs text-teal-100">{command.stdout}</pre> : null}
                {command.stderr ? <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-md border border-red-300/20 bg-red-500/8 p-2 text-xs text-red-100">{command.stderr}</pre> : null}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Export Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
              {lastExportResult?.message ?? "No pilot report export has run in this session."}
            </div>
            {lastExportResult?.path ? (
              <Button variant="outline" onClick={() => void revealExportedPath(lastExportResult.path!)}>
                <FileText className="h-4 w-4" />
                Open Export Location
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
