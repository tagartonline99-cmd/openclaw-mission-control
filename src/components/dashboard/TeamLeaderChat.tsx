import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Crown, Eye, HelpCircle, Send, ShieldAlert, SlidersHorizontal, Sparkles, WalletCards } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Select } from "../ui/select";
import { formatCurrency, formatDateTime } from "../../utils/formatting";
import { cn } from "../../utils/cn";
import { useAppData } from "../../app/AppDataContext";
import type { OpportunityHuntDepth } from "../../types";

export function TeamLeaderChat({ full = false }: { full?: boolean }) {
  const { data, sendTeamLeaderChatMessage, updateSettings } = useAppData();
  const { approvalRequests, businessProposals, businessTasks, dashboardSummary, opportunityHunts, quests, teamLeaderChatMessages } = data;
  const [message, setMessage] = useState("");
  const [questId, setQuestId] = useState(quests[0]?.id ?? "");
  const [depth, setDepth] = useState<OpportunityHuntDepth>(data.userSettings.defaultOpportunityHuntDepth ?? "fast");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const riskyPending = approvalRequests.filter((request) => request.status === "pending").length;
  const latestHunt = opportunityHunts[0];
  const latestProposal = latestHunt ? businessProposals.find((proposal) => proposal.id === latestHunt.businessProposalId) : businessProposals[0];
  const latestPlatformRequirements = latestProposal ? data.externalPlatformRequirements.filter((item) => latestProposal.externalPlatformRequirementIds.includes(item.id)) : [];
  const activeTasks = latestHunt ? businessTasks.filter((task) => task.huntId === latestHunt.id && task.status !== "done") : [];
  const doneTasks = latestHunt ? businessTasks.filter((task) => task.huntId === latestHunt.id && task.status === "done") : [];
  const messages = useMemo(
    () => (full ? teamLeaderChatMessages : teamLeaderChatMessages.slice(-8)),
    [full, teamLeaderChatMessages],
  );

  useEffect(() => {
    if (!questId && quests[0]) setQuestId(quests[0].id);
  }, [questId, quests]);

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      await sendTeamLeaderChatMessage(trimmed, { questId: showAdvanced ? questId : undefined, opportunityHuntDepth: depth });
      setMessage("");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-100" />
              TeamLeader1A Chat
            </CardTitle>
            <p className="mt-1 text-sm text-slate-400">You talk only to TeamLeader1A. Other agents report internally.</p>
          </div>
          <Badge tone="amber">Commander</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-300/20 bg-amber-400/8 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-100">
            <Sparkles className="h-4 w-4" />
            Latest recommendation
          </div>
          <p className="text-sm leading-6 text-stone-200">{dashboardSummary.latestTeamLeaderRecommendation}</p>
        </div>

        {latestHunt ? (
          <div className="rounded-lg border border-teal-300/25 bg-teal-400/10 p-4 shadow-[0_0_28px_rgba(45,212,191,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={latestHunt.status === "ready_to_review" ? "emerald" : "teal"}>{latestHunt.status.replace(/_/g, " ")}</Badge>
                  <Badge tone="amber">{doneTasks.length}/{businessTasks.filter((task) => task.huntId === latestHunt.id).length} tasks done</Badge>
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold text-stone-50">{latestProposal?.title ?? latestHunt.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{latestHunt.currentPhase}</p>
              </div>
              <a href={`#/mission-briefs?proposal=${latestProposal?.id ?? ""}`}>
                <Button variant="secondary" type="button">
                  <Eye className="h-4 w-4" />
                  View Work
                </Button>
              </a>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {activeTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="text-xs font-semibold uppercase text-teal-100">{task.status.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm font-semibold text-stone-100">{task.title}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-teal-300" style={{ width: `${task.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-black/25 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <HelpCircle className="h-4 w-4 text-amber-100" />
              Why nothing may be happening
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Status/help questions stay as chat replies. Work commands such as "create a Fiverr gig business idea with zero budget" create visible Tasks, Guild Office movement, and a Mission Brief.
            </p>
          </div>
        )}

        {latestProposal?.budgetPlan ? (
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/8 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <WalletCards className="h-4 w-4" />
              What agents know
            </div>
            <div className="mt-2 grid gap-2 text-sm text-slate-200 md:grid-cols-3">
              <span>Budget cap: <strong>{formatCurrency(latestProposal.budgetPlan.businessBudgetCap)}</strong></span>
              <span>Required spend: <strong>{formatCurrency(latestProposal.budgetPlan.requiredSpend)}</strong></span>
              <span>Remaining: <strong>{formatCurrency(latestProposal.budgetPlan.portfolioRemainingCapital)}</strong></span>
            </div>
            {latestPlatformRequirements.length > 0 ? (
              <p className="mt-2 text-xs leading-5 text-slate-300">
                Platform boundaries: {latestPlatformRequirements.map((item) => `${item.platform} ${item.userLoginRequired ? "requires manual login" : "does not require login"}; credentials stored: ${item.credentialsStored ? "yes" : "no"}; publish approval: ${item.approvalRequiredBeforePublish ? "required" : "not required"}`).join(" / ")}.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={cn("space-y-3 overflow-y-auto pr-1", full ? "max-h-[58vh]" : "max-h-[480px]")}>
          {messages.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border p-4",
                item.role === "user"
                  ? "ml-8 border-teal-300/25 bg-teal-400/10"
                  : item.role === "system"
                    ? "border-white/10 bg-black/20"
                    : "mr-8 border-amber-300/20 bg-black/30",
              )}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-stone-100">
                  {item.role === "user" ? "You" : item.role === "system" ? "Mission Control" : "TeamLeader1A"}
                </span>
                <div className="flex items-center gap-2">
                  <Badge tone={item.mode === "approval_requested" ? "amber" : item.mode === "live_result" ? "teal" : "slate"}>
                    {item.mode.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</span>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{item.content}</p>
              {item.relatedApprovalId ? (
                <p className="mt-3 text-xs text-amber-100">Approval: {item.relatedApprovalId}</p>
              ) : null}
                  {item.relatedOpportunityHuntId || item.relatedBusinessProposalId ? (
                <a
                  className="mt-3 inline-flex text-xs font-semibold text-teal-100 hover:text-teal-50"
                  href={`#/mission-briefs?proposal=${item.relatedBusinessProposalId ?? latestProposal?.id ?? ""}`}
                >
                  View Work
                </a>
              ) : item.relatedMissionDraftId || item.relatedMissionRunId ? (
                <a
                  className="mt-3 inline-flex text-xs font-semibold text-teal-100 hover:text-teal-50"
                  href={`#/mission-briefs?${item.relatedMissionRunId ? `run=${item.relatedMissionRunId}` : `draft=${item.relatedMissionDraftId}`}`}
                >
                  View Mission Brief
                </a>
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-teal-300/20 bg-teal-500/8 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-100">
              <BriefcaseBusiness className="h-4 w-4" />
              Safe work sessions
            </div>
            <p className="mt-1 text-2xl font-semibold text-stone-50">{opportunityHunts.length}</p>
          </div>
          <div className="rounded-lg border border-amber-300/20 bg-amber-400/8 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
              <Sparkles className="h-4 w-4" />
              Research depth
            </div>
            <p className="mt-1 text-2xl font-semibold capitalize text-stone-50">{depth}</p>
          </div>
          <div className="rounded-lg border border-red-300/20 bg-red-500/8 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-100">
              <ShieldAlert className="h-4 w-4" />
              Risky approvals
            </div>
            <p className="mt-1 text-2xl font-semibold text-stone-50">{riskyPending}</p>
          </div>
        </div>

        <div className="space-y-3">
          <Select
            value={depth}
            onChange={(event) => {
              const nextDepth = event.target.value as OpportunityHuntDepth;
              setDepth(nextDepth);
              void updateSettings({ ...data.userSettings, defaultOpportunityHuntDepth: nextDepth });
            }}
          >
            <option value="quick">Quick public research</option>
            <option value="fast">Fast public research</option>
            <option value="deep">Deep public research</option>
          </Select>
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-200"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-amber-100" />
                Advanced
              </span>
              <span className="text-xs text-slate-500">{showAdvanced ? "Hide legacy quest attachment" : "Optional quest attachment"}</span>
            </button>
            {showAdvanced ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs leading-5 text-slate-500">
                  Attach this command to an existing quest only for legacy quest work. New business searches create a fresh Opportunity Hunt automatically.
                </p>
                <Select value={questId} onChange={(event) => setQuestId(event.target.value)}>
                  {quests.map((quest) => (
                    <option key={quest.id} value={quest.id}>{quest.title}</option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask TeamLeader1A what to validate, kill, improve, or approve next..."
            className="min-h-28 w-full resize-none rounded-md border border-white/10 bg-black/30 p-3 text-sm leading-6 text-stone-100 outline-none transition placeholder:text-slate-600 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={!message.trim() || isSending} onClick={() => void submit()}>
              <Send className="h-4 w-4" />
              Send to TeamLeader1A
            </Button>
            <a href="#/tasks">
              <Button type="button" variant="outline">
                <Sparkles className="h-4 w-4" />
                Task tab
              </Button>
            </a>
          </div>
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Work commands to TeamLeader1A create visible agent tasks without approval. Status/help questions stay as local replies. Spending, publishing, messaging, connector execution, launch, login automation, form submission, and purchases still require approval.
        </p>
      </CardContent>
    </Card>
  );
}
