import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, ExternalLink, FileText, Lock, PackageCheck, Play, RotateCcw, ShieldCheck, SkipForward, Sparkles, WalletCards, Workflow, XCircle } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import type { MissionAgentStep, MissionDraftStepPlan } from "../../types";
import { formatCurrency, formatDateTime, statusTone } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";

function label(value: string) {
  return value.replace(/_/g, " ");
}

function clearStatusLabel(status: string) {
  if (status === "needs_approval") return "Locked";
  if (status === "approval_requested") return "Pending Approval";
  if (status === "ready_for_approval") return "Ready To Request Approval";
  return label(status);
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
    approveBusinessProposal,
    updateBusinessProposalStatus,
    preparePlatformPublishApproval,
    exportObsidianNote,
    revealExportedPath,
  } = useAppData();
  const [params, setParams] = useSearchParams();
  const requestedRunId = params.get("run");
  const requestedDraftId = params.get("draft");
  const requestedProposalId = params.get("proposal");
  const selectedProposal = data.businessProposals.find((proposal) => proposal.id === requestedProposalId) ?? data.businessProposals[0];
  const selectedProposalEvidence = selectedProposal ? data.researchEvidence.filter((item) => selectedProposal.evidenceIds.includes(item.id)) : [];
  const selectedProposalDestinations = selectedProposal ? data.productionDestinations.filter((item) => selectedProposal.publishingDestinationIds.includes(item.id)) : [];
  const selectedProposalContent = selectedProposal ? data.contentInventoryItems.filter((item) => selectedProposal.contentInventoryIds.includes(item.id)) : [];
  const selectedPlatformRequirements = selectedProposal ? data.externalPlatformRequirements.filter((item) => selectedProposal.externalPlatformRequirementIds.includes(item.id)) : [];
  const selectedPlatformPackages = selectedProposal ? data.platformExecutionPackages.filter((item) => selectedProposal.platformExecutionPackageIds.includes(item.id)) : [];
  const selectedApprovedBusiness = selectedProposal?.approvedBusinessId ? data.approvedBusinesses.find((item) => item.id === selectedProposal.approvedBusinessId) : undefined;
  const selectedAgentArtifacts = selectedApprovedBusiness ? data.agentArtifacts.filter((artifact) => data.approvedBusinessCockpits.find((cockpit) => cockpit.businessId === selectedApprovedBusiness.id)?.agentArtifactIds.includes(artifact.id)) : [];
  const selectedReceipts = selectedApprovedBusiness ? data.executionReceipts.filter((receipt) => receipt.businessId === selectedApprovedBusiness.id) : [];
  const selectedEvidenceQuality = selectedProposal ? data.evidenceQualityScores.filter((score) => selectedProposal.evidenceIds.includes(score.evidenceId ?? "")) : [];
  const selectedCandidates = selectedProposal?.candidateIdeaIds?.length
    ? data.candidateBusinessIdeas
        .filter((item) => selectedProposal.candidateIdeaIds?.includes(item.id))
        .sort((a, b) => a.rank - b.rank)
    : [];
  const selectedScorecards = selectedCandidates.map((candidate) => data.candidateScorecards.find((scorecard) => scorecard.id === candidate.scorecardId));
  const selectedCitations = selectedProposal?.evidenceCitationIds?.length
    ? data.evidenceCitations.filter((item) => selectedProposal.evidenceCitationIds?.includes(item.id))
    : [];
  const selectedResearchRun = selectedProposal?.publicResearchRunId ? data.publicResearchRuns.find((run) => run.id === selectedProposal.publicResearchRunId) : undefined;
  const selectedResearchFetches = selectedResearchRun ? data.publicResearchFetches.filter((fetch) => selectedResearchRun.fetchIds.includes(fetch.id)) : [];
  const selectedBrowserRun = selectedResearchRun?.browserResearchRunId ? data.browserResearchRuns.find((run) => run.id === selectedResearchRun.browserResearchRunId) : undefined;
  const selectedBrowserArtifacts = selectedBrowserRun ? data.browserResearchArtifacts.filter((artifact) => selectedBrowserRun.artifactIds.includes(artifact.id)) : [];
  const selectedBrowserReceipts = selectedBrowserRun ? data.browserSafetyReceipts.filter((receipt) => selectedBrowserRun.safetyReceiptIds.includes(receipt.id)) : [];
  const budgetBlockers = selectedProposal?.budgetPlan.approvalBlockers ?? [];
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

  function exportSelectedProposal() {
    if (!selectedProposal) return;
    void exportObsidianNote({
      id: `obsidian-proposal-${selectedProposal.id}`,
      title: selectedProposal.title,
      type: "business_idea",
      folder: "OpenClaw/Business Proposals",
      frontmatter: {
        type: "business_proposal",
        system: "openclaw",
        status: selectedProposal.status,
        validation_score: selectedProposal.validationScore,
        created_at: selectedProposal.createdAt,
        updated_at: selectedProposal.updatedAt,
      },
      body: [
        `# ${selectedProposal.title}`,
        "",
        selectedProposal.summary,
        "",
        "## Recommendation",
        selectedProposal.teamLeaderRecommendation,
        "",
        "## Evidence",
        ...selectedProposalEvidence.map((item) => `- [${item.title}](${item.url}) - ${item.summary}`),
        "",
        "## SEO Plan",
        ...selectedProposal.seoPlan.map((item) => `- ${item}`),
        "",
        "## Content Plan",
        ...selectedProposal.contentPlan.map((item) => `- ${item}`),
        "",
        "## Production Plan",
        ...selectedProposal.productionPlan.map((item) => `- ${item}`),
        "",
        "## Approval Boundary",
        "Approving this proposal starts local autonomous improvement only. Publishing, messaging, spending, connector execution, launch, forms, and purchases still require approval.",
      ].join("\n"),
      linkedQuestId: selectedProposal.questId,
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 text-amber-100" />
            Business Proposal Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedProposal ? (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={selectedProposal.status === "ready_for_review" ? "emerald" : selectedProposal.status === "approved" ? "teal" : "amber"}>
                      {selectedProposal.status.replace(/_/g, " ")}
                    </Badge>
                    <Badge tone="teal">{selectedProposal.validationScore}% validation</Badge>
                    <Badge tone="amber">zero budget test</Badge>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-stone-50">{selectedProposal.title}</h3>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">{selectedProposal.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    disabled={selectedProposal.status !== "ready_for_review" && selectedProposal.status !== "drafting"}
                    onClick={() => void approveBusinessProposal(selectedProposal.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve Business
                  </Button>
                  <Button variant="outline" disabled={selectedProposal.status === "approved"} onClick={() => void updateBusinessProposalStatus(selectedProposal.id, "revision_requested")}>
                    <RotateCcw className="h-4 w-4" />
                    Request Revision
                  </Button>
                  <Button variant="danger" disabled={selectedProposal.status === "approved"} onClick={() => void updateBusinessProposalStatus(selectedProposal.id, "rejected")}>
                    <XCircle className="h-4 w-4" />
                    Reject / Kill Idea
                  </Button>
                  <Button variant="outline" onClick={exportSelectedProposal}>
                    <FileText className="h-4 w-4" />
                    Export Proposal
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-amber-300/20 bg-amber-400/8 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">TeamLeader1A recommendation</p>
                <p className="mt-2 text-sm leading-6 text-stone-100">{selectedProposal.teamLeaderRecommendation}</p>
              </div>
              {selectedCandidates.length > 0 ? (
                <div className="rounded-lg border border-teal-300/20 bg-teal-400/8 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-teal-100">Top 3 + Winner</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {selectedResearchRun ? `${selectedResearchRun.depth} public research / ${selectedResearchFetches.filter((fetch) => fetch.status === "fetched").length}/${selectedResearchFetches.length} sources fetched` : "Candidate scorecards"}
                      </p>
                    </div>
                    {selectedResearchRun ? <Badge tone="teal">{selectedResearchRun.executionReceipt}</Badge> : null}
                  </div>
                  <div className="mt-4 grid gap-3 xl:grid-cols-3">
                    {selectedCandidates.map((candidate, index) => {
                      const scorecard = selectedScorecards[index];
                      return (
                        <div key={candidate.id} className={`rounded-md border p-3 ${candidate.status === "winner" ? "border-amber-300/35 bg-amber-400/10" : "border-white/10 bg-black/25"}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-stone-100">#{candidate.rank} {candidate.title}</p>
                            <Badge tone={candidate.status === "winner" ? "amber" : "slate"}>{candidate.status === "winner" ? "winner" : `${scorecard?.totalScore ?? 0}/100`}</Badge>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-400">{candidate.summary}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                            <span>Demand {scorecard?.demandScore ?? 0}</span>
                            <span>SEO {scorecard?.seoScore ?? 0}</span>
                            <span>Zero budget {scorecard?.zeroBudgetScore ?? 0}</span>
                            <span>Evidence {scorecard?.evidenceScore ?? 0}</span>
                          </div>
                          <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Why {candidate.status === "winner" ? "this won" : "it lost"}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-300">
                            {candidate.status === "winner" ? candidate.whyItMightWin.join(" ") : candidate.whyItMightLose.join(" ")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {selectedBrowserRun ? (
                <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/8 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-cyan-100">Safe browser evidence</p>
                      <p className="mt-1 text-sm text-slate-300">{selectedBrowserRun.summary}</p>
                    </div>
                    <Badge tone="teal">{selectedBrowserRun.executionReceipt}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {selectedBrowserArtifacts.map((artifact) => {
                      const receipt = selectedBrowserReceipts.find((item) => item.id === artifact.safetyReceiptId);
                      const fetch = data.browserResearchFetches.find((item) => item.id === artifact.fetchId);
                      return (
                        <div key={artifact.id} className="rounded-md border border-cyan-300/15 bg-black/25 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-stone-100">{artifact.title}</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge tone={fetch?.status === "captured" ? "teal" : fetch?.status === "failed" ? "red" : "amber"}>
                                {fetch?.status.replace(/_/g, " ") ?? "recorded"}
                              </Badge>
                              <Badge tone={artifact.screenshotPath ? "teal" : "amber"}>{artifact.screenshotPath ? "screenshot saved" : "text captured"}</Badge>
                            </div>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{artifact.summary}</p>
                          <a className="mt-2 inline-flex text-xs font-semibold text-teal-100 hover:text-teal-50" href={artifact.url}>{artifact.url}</a>
                          {artifact.screenshotPath ? (
                            <code className="mt-2 block truncate rounded border border-white/10 bg-black/35 p-2 text-xs text-cyan-100">{artifact.screenshotPath}</code>
                          ) : null}
                          {fetch?.error ? (
                            <div className="mt-2 rounded-md border border-red-300/20 bg-red-500/8 p-2 text-xs leading-5 text-red-100">
                              Blocked or failed safely: {fetch.error}. Use an exact public HTTP/HTTPS page that does not require login, checkout, forms, CAPTCHA, or account access.
                            </div>
                          ) : null}
                          {receipt ? (
                            <div className="mt-2 text-xs leading-5 text-slate-400">
                              <p>{receipt.receipt}</p>
                              {receipt.blockedReasons.length ? (
                                <p className="mt-1 text-red-100">Blocked reasons: {receipt.blockedReasons.join(" ")}</p>
                              ) : null}
                            </div>
                          ) : null}
                          {artifact.screenshotPath ? (
                            <Button className="mt-3" variant="outline" size="sm" onClick={() => void revealExportedPath(artifact.screenshotPath!)}>
                              <ExternalLink className="h-4 w-4" />
                              Open screenshot location
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {selectedAgentArtifacts.length > 0 ? (
                <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/8 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-emerald-100">Agent artifact contracts</p>
                      <p className="mt-1 text-sm text-slate-300">Each agent produced a structured local artifact after business approval.</p>
                    </div>
                    <Badge tone="emerald">{selectedAgentArtifacts.length} artifacts</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {selectedAgentArtifacts.map((artifact) => (
                      <div key={artifact.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-stone-100">{artifact.title}</p>
                          <Badge tone="teal">{artifact.type.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{artifact.summary}</p>
                        <pre className="mt-3 max-h-36 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-xs leading-5 text-slate-300">{artifact.content}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedReceipts.length > 0 ? (
                <div className="rounded-lg border border-amber-300/20 bg-amber-400/8 p-4">
                  <p className="text-xs font-semibold uppercase text-amber-100">Execution receipts</p>
                  <div className="mt-3 grid gap-3 xl:grid-cols-2">
                    {selectedReceipts.slice(0, 8).map((receipt) => (
                      <div key={receipt.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-stone-100">{receipt.title}</p>
                          <Badge tone={receipt.externalAction ? "red" : "teal"}>{receipt.externalAction ? "external" : "local only"}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{receipt.summary}</p>
                        <p className="mt-2 text-xs text-emerald-100">{receipt.budgetEffect}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedEvidenceQuality.length > 0 ? (
                <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Evidence quality scores</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {selectedEvidenceQuality.map((score) => (
                      <div key={score.id} className="rounded-md border border-white/10 bg-black/30 p-3">
                        <Badge tone={score.grade === "strong" ? "emerald" : score.grade === "moderate" ? "amber" : "red"}>{score.grade}</Badge>
                        <p className="mt-2 text-sm text-slate-300">Credibility {score.credibility} / relevance {score.relevance} / confidence {score.confidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/8 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-100">
                    <WalletCards className="h-3.5 w-3.5" />
                    Budget plan
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-200">
                    <div className="flex justify-between gap-3"><span>Portfolio capital</span><span className="font-semibold text-stone-50">{formatCurrency(selectedProposal.budgetPlan.portfolioStartingCapital)}</span></div>
                    <div className="flex justify-between gap-3"><span>Remaining capital</span><span className="font-semibold text-emerald-100">{formatCurrency(selectedProposal.budgetPlan.portfolioRemainingCapital)}</span></div>
                    <div className="flex justify-between gap-3"><span>Business cap</span><span className="font-semibold text-stone-50">{formatCurrency(selectedProposal.budgetPlan.businessBudgetCap)}</span></div>
                    <div className="flex justify-between gap-3"><span>Required spend</span><span className="font-semibold text-stone-50">{formatCurrency(selectedProposal.budgetPlan.requiredSpend)}</span></div>
                    <div className="flex justify-between gap-3"><span>Recommended spend</span><span className="font-semibold text-stone-50">{formatCurrency(selectedProposal.budgetPlan.recommendedSpend)}</span></div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-emerald-50">{selectedProposal.budgetPlan.zeroBudgetPath}</p>
                  {budgetBlockers.length > 0 ? (
                    <div className="mt-3 rounded-md border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">
                      {budgetBlockers.join(" ")}
                    </div>
                  ) : (
                    <Badge tone="teal">within hard cap</Badge>
                  )}
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Proposal readiness</p>
                  <div className="mt-3 space-y-2">
                    {selectedProposal.readinessChecklist.map((item) => (
                      <div key={item.label} className="rounded-md border border-white/10 bg-black/25 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-stone-100">{item.label}</span>
                          <Badge tone={item.status === "passed" ? "teal" : item.status === "blocked" ? "red" : "amber"}>{item.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Quality score: {selectedProposal.qualityScore}/100</p>
                </div>
                <div className="rounded-lg border border-red-300/20 bg-red-500/8 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-red-100">
                    <Lock className="h-3.5 w-3.5" />
                    What approval does not do
                  </p>
                  <p className="mt-3 text-sm leading-6 text-red-100">
                    Approving this business will not spend money, publish, submit forms, log in, store credentials, message anyone, or run a connector. It only starts safe internal improvement.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Why it might work</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                    {selectedProposal.whyMightWork.map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Why it might fail</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                    {selectedProposal.whyMightFail.map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
                <div className="rounded-lg border border-red-300/20 bg-red-500/8 p-4">
                  <p className="text-xs font-semibold uppercase text-red-100">Approval boundary</p>
                  <p className="mt-3 text-sm leading-6 text-red-100">Approving this business starts local autonomous improvement only. Publishing, messaging, connector execution, launch, forms, and spending still require approval.</p>
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-lg border border-teal-300/20 bg-teal-400/8 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Evidence and links</p>
                  <div className="mt-3 space-y-3">
                    {selectedCitations.map((item) => (
                      <div key={item.id} className="rounded-md border border-teal-300/15 bg-teal-400/8 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-stone-100">{item.title}</p>
                          <Badge tone={item.confidence >= 70 ? "teal" : "amber"}>{item.confidence}/100 confidence</Badge>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{item.summary}</p>
                        <a className="mt-2 inline-flex text-xs font-semibold text-teal-100 hover:text-teal-50" href={item.url}>{item.url}</a>
                      </div>
                    ))}
                    {selectedProposalEvidence.map((item) => (
                      <div key={item.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                        <p className="font-semibold text-stone-100">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{item.summary}</p>
                        <a className="mt-2 inline-flex text-xs font-semibold text-teal-100 hover:text-teal-50" href={item.url}>{item.url}</a>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">SEO / Content / Production</p>
                  <div className="mt-3 grid gap-3">
                    {[["SEO plan", selectedProposal.seoPlan], ["Content plan", selectedProposal.contentPlan], ["Production plan", selectedProposal.productionPlan]].map(([title, list]) => (
                      <div key={title as string} className="rounded-md border border-white/10 bg-black/25 p-3">
                        <p className="font-semibold text-stone-100">{title as string}</p>
                        <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
                          {(list as string[]).map((item) => <li key={item}>- {item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Publishing destination/options</p>
                  <div className="mt-3 space-y-2">
                    {selectedProposalDestinations.map((destination) => (
                      <div key={destination.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-stone-100">{destination.name}</p>
                          <Badge tone={destination.approvalRequired ? "red" : "teal"}>{clearStatusLabel(destination.status)}</Badge>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{destination.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-300/20 bg-amber-400/8 p-4">
                  <p className="text-xs font-semibold uppercase text-amber-100">External platform/account needs</p>
                  <div className="mt-3 space-y-3">
                    {selectedPlatformRequirements.map((requirement) => (
                      <div key={requirement.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-stone-100">{requirement.platform}</p>
                          <Badge tone={requirement.approvalRequiredBeforePublish ? "red" : "teal"}>{clearStatusLabel(requirement.publishStatus)}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{requirement.notes}</p>
                        <div className="mt-2 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                          <span>Account needed: {requirement.accountNeeded ? "yes" : "no"}</span>
                          <span>User login required: {requirement.userLoginRequired ? "yes" : "no"}</span>
                          <span>Credentials stored: {requirement.credentialsStored ? "yes" : "no"}</span>
                          <span>Publish gate: {requirement.approvalRequiredBeforePublish ? "separate exact approval later" : "not needed"}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">Required assets: {requirement.requiredAssets.join(", ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Exact content drafts/assets</p>
                  <div className="mt-3 space-y-2">
                    {selectedProposalContent.map((item) => (
                      <div key={item.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                        <p className="font-semibold text-stone-100">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{item.draftContent}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    <PackageCheck className="h-3.5 w-3.5" />
                    Platform execution packages
                  </p>
                  <div className="mt-3 space-y-3">
                    {selectedPlatformPackages.length === 0 ? <p className="text-sm text-slate-400">No external platform package is needed for this proposal yet.</p> : null}
                    {selectedPlatformPackages.map((item) => (
                      <div key={item.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-stone-100">{item.title}</p>
                          <Badge tone={item.status === "local_draft" ? "amber" : item.status === "approval_requested" ? "amber" : "teal"}>{clearStatusLabel(item.status)}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{item.approvalBoundary}</p>
                        <div className="mt-2 space-y-1 text-xs text-slate-400">
                          {Object.entries(item.exactFields).slice(0, 4).map(([key, value]) => <p key={key}><span className="text-slate-300">{key}:</span> {value}</p>)}
                        </div>
                        <Button className="mt-3" variant="outline" size="sm" disabled={!item.businessId || item.status === "approval_requested"} onClick={() => void preparePlatformPublishApproval(item.id)}>
                          <ShieldCheck className="h-4 w-4" />
                          {item.businessId ? "Open Product Studio Publish Gate" : "Approve Business First"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/8 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Zero-budget validation test</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">{selectedProposal.zeroBudgetValidationTest}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-300">No business proposal yet. Send TeamLeader1A a command from the Command tab.</p>
          )}
        </CardContent>
      </Card>

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
