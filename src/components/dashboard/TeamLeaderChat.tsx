import { useState } from "react";
import { Crown, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { formatDateTime } from "../../utils/formatting";
import { useAppData } from "../../app/AppDataContext";

export function TeamLeaderChat() {
  const { data, requestTeamLeaderTurn } = useAppData();
  const { agentMessages, approvalRequests, dashboardSummary, openClawCommands } = data;
  const [message, setMessage] = useState("");
  const visibleMessages = agentMessages.filter((message) => message.visibility === "user_summary");
  const pending = approvalRequests.filter((request) => request.status === "pending").length;
  const queued = openClawCommands.filter((command) => command.status === "queued" || command.status === "requires_approval").length;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-100" />
              TeamLeader1A Channel
            </CardTitle>
            <p className="mt-1 text-sm text-slate-400">Only TeamLeader1A speaks to the user.</p>
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
        {visibleMessages.map((message) => (
          <div key={message.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-stone-100">TeamLeader1A</span>
              <span className="text-xs text-slate-500">{formatDateTime(message.createdAt)}</span>
            </div>
            <p className="text-sm font-medium text-stone-200">{message.summary}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{message.details}</p>
          </div>
        ))}
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
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask TeamLeader1A for a live local turn..."
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void requestTeamLeaderTurn(message);
              setMessage("");
            }}
          >
            Request approval
          </Button>
        </div>
        <p className="text-xs text-slate-500">Live TeamLeader1A turns require approval and never use external delivery. Other agents still report through TeamLeader1A.</p>
      </CardContent>
    </Card>
  );
}
