import { Activity, BriefcaseBusiness, CheckCircle2, ExternalLink, FileText, Lock, ReceiptText, Search, Sparkles } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import { formatDateTime } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ClarityBadge, clarityLabelFromStatus } from "./ClarityBadge";

export function NowCommandCenter({ compact = false }: { compact?: boolean }) {
  const { data } = useAppData();
  const activeHunt = data.opportunityHunts.find((hunt) => !["ready_to_review", "approved_as_business", "rejected"].includes(hunt.status)) ?? data.opportunityHunts[0];
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
  const activeTasks = data.businessTasks.filter(
    (task) =>
      task.status === "now_working" &&
      !(task.huntId && completedHuntIds.has(task.huntId)) &&
      !(task.proposalId && completedProposalIds.has(task.proposalId)),
  );
  const latestProposal = data.businessProposals[0];
  const latestBusiness = data.approvedBusinesses[0];
  const latestPreview = latestBusiness ? data.productPreviews.find((preview) => preview.businessId === latestBusiness.id) : data.productPreviews[0];
  const latestBlueprint = latestPreview ? data.productBlueprints.find((blueprint) => blueprint.id === latestPreview.blueprintId) : undefined;
  const latestEvidence = data.browserResearchArtifacts[0] ?? data.researchEvidence[0] ?? data.evidenceCitations[0];
  const pendingApprovals = data.approvalRequests.filter((request) => request.status === "pending");
  const lockedGates = data.approvalGateStates.filter((gate) => ["locked", "needs_product_review", "blocked"].includes(gate.status));
  const latestReceipt = data.executionReceipts[0];
  const latestEvidenceTime: string | undefined = latestEvidence && "capturedAt" in latestEvidence
    ? String(latestEvidence.capturedAt)
    : latestEvidence && "createdAt" in latestEvidence
      ? String(latestEvidence.createdAt)
      : undefined;

  const nextAction = pendingApprovals[0]
    ? { label: "Review pending approval", href: "#/approvals" }
    : latestPreview && !latestPreview.localDraftApproved
      ? { label: "Review product draft", href: "#/production" }
      : latestProposal?.status === "ready_for_review"
        ? { label: "Review business proposal", href: `#/mission-briefs?proposal=${latestProposal.id}` }
        : activeTasks[0]
          ? { label: "Watch active tasks", href: "#/tasks" }
          : { label: "Command TeamLeader1A", href: "#/" };

  return (
    <Card className="border-teal-300/20 bg-teal-400/8">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-100" />
              Today / Now Command Center
            </CardTitle>
            <p className="mt-1 text-sm text-slate-300">What is really working, what changed, and what needs your attention next.</p>
          </div>
          <a href={nextAction.href}>
            <Button variant="secondary" size="sm">
              <ExternalLink className="h-4 w-4" />
              {nextAction.label}
            </Button>
          </a>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><Sparkles className="h-3.5 w-3.5" /> Active work</p>
            <ClarityBadge label={clarityLabelFromStatus(activeHunt?.status)} />
          </div>
          <p className="mt-2 font-semibold text-stone-100">{activeHunt?.title ?? latestProposal?.title ?? "No active TeamLeader work"}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{activeHunt?.currentPhase ?? "Send TeamLeader1A a command to start the agent team."}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><BriefcaseBusiness className="h-3.5 w-3.5" /> Latest product</p>
            <ClarityBadge label={clarityLabelFromStatus(latestPreview?.status)} />
          </div>
          <p className="mt-2 font-semibold text-stone-100">{latestBlueprint?.name ?? latestBusiness?.name ?? "No approved product yet"}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{latestBlueprint?.offerDeliverable ?? "Approve a Mission Brief proposal to create a product."}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><Search className="h-3.5 w-3.5" /> Latest evidence</p>
            <ClarityBadge label={latestEvidence ? "Real Public Read" : "Simulated"} />
          </div>
          <p className="mt-2 font-semibold text-stone-100">{latestEvidence?.title ?? latestEvidence?.url ?? "No evidence captured yet"}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {latestEvidenceTime ? formatDateTime(latestEvidenceTime) : latestEvidence ? "Stored evidence receipt" : "Start a public opportunity hunt."}
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><CheckCircle2 className="h-3.5 w-3.5" /> Attention</p>
            <Badge tone={pendingApprovals.length ? "amber" : "slate"}>{pendingApprovals.length} pending</Badge>
          </div>
          <p className="mt-2 font-semibold text-stone-100">{activeTasks.length} agents working / {lockedGates.length} locked gates</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {latestReceipt ? `Latest receipt: ${latestReceipt.title}` : "No action receipts yet."}
          </p>
          {pendingApprovals.length ? (
            <a className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-100 hover:text-amber-50" href="#/approvals">
              <ReceiptText className="h-3.5 w-3.5" /> View pending approvals
            </a>
          ) : (
            <span className="mt-2 inline-flex items-center gap-1 text-xs text-red-100"><Lock className="h-3.5 w-3.5" /> External actions stay locked</span>
          )}
        </div>
        {!compact ? (
          <div className="rounded-md border border-emerald-300/20 bg-emerald-400/8 p-3 md:col-span-2 xl:col-span-4">
            <p className="text-xs font-semibold uppercase text-emerald-100">Next best action</p>
            <p className="mt-1 text-sm leading-6 text-slate-200">{nextAction.label}. No publishing, messaging, spending, login, form submission, purchase, or connector action runs from this panel.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
