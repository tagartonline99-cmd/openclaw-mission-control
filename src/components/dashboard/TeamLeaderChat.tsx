import { useMemo, useState } from "react";
import { Crown, Radio, Send, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatDateTime } from "../../utils/formatting";
import { cn } from "../../utils/cn";
import { useAppData } from "../../app/AppDataContext";

export function TeamLeaderChat({ full = false }: { full?: boolean }) {
  const { data, sendTeamLeaderChatMessage } = useAppData();
  const { approvalRequests, dashboardSummary, openClawCommands, teamLeaderChatMessages } = data;
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const pending = approvalRequests.filter((request) => request.status === "pending").length;
  const queued = openClawCommands.filter((command) => command.status === "queued" || command.status === "requires_approval").length;
  const messages = useMemo(
    () => (full ? teamLeaderChatMessages : teamLeaderChatMessages.slice(-8)),
    [full, teamLeaderChatMessages],
  );

  async function submit(requestLiveTurn: boolean) {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      await sendTeamLeaderChatMessage(trimmed, { requestLiveTurn });
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
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-red-300/20 bg-red-500/8 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-100">
              <ShieldAlert className="h-4 w-4" />
              Pending approvals
            </div>
            <p className="mt-1 text-2xl font-semibold text-stone-50">{pending}</p>
          </div>
          <div className="rounded-lg border border-teal-300/20 bg-teal-500/8 p-3">
            <p className="text-sm font-semibold text-teal-100">Queued commands</p>
            <p className="mt-1 text-2xl font-semibold text-stone-50">{queued}</p>
          </div>
        </div>

        <div className="space-y-3">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask TeamLeader1A what to validate, kill, improve, or approve next..."
            className="min-h-28 w-full resize-none rounded-md border border-white/10 bg-black/30 p-3 text-sm leading-6 text-stone-100 outline-none transition placeholder:text-slate-600 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={!message.trim() || isSending} onClick={() => void submit(false)}>
              <Send className="h-4 w-4" />
              Send local chat
            </Button>
            <Button type="button" variant="outline" disabled={!message.trim() || isSending} onClick={() => void submit(true)}>
              <Radio className="h-4 w-4" />
              Request live turn approval
            </Button>
          </div>
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Local chat replies are generated inside Mission Control. Live TeamLeader1A turns require approval and never use external delivery.
        </p>
      </CardContent>
    </Card>
  );
}
