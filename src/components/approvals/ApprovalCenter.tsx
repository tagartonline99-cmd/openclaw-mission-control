import { useMemo, useState } from "react";
import { AlertTriangle, Check, Coins, ExternalLink, GitBranch, Lock, ShieldCheck, X } from "lucide-react";
import type { ApprovalGateState, ApprovalRequest, PublishPayloadPreview } from "../../types";
import { formatCurrency, formatDateTime, riskTone, statusTone } from "../../utils/formatting";
import { safetyPolicyService } from "../../services/safetyPolicyService";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Select } from "../ui/select";
import { useAppData } from "../../app/AppDataContext";

function requestIcon(type: ApprovalRequest["type"]) {
  if (type === "Spend money") return Coins;
  if (type === "Publish externally") return ExternalLink;
  if (type === "Launch experiment") return ShieldCheck;
  if (type.includes("OpenClaw") || type.includes("URL") || type.includes("channel") || type.includes("gateway")) return ShieldCheck;
  return Lock;
}

function actionKind(request: ApprovalRequest) {
  return request.payload?.actionKind ?? "local";
}

function PayloadCard({ request, publishPayloadPreview }: { request: ApprovalRequest; publishPayloadPreview?: PublishPayloadPreview }) {
  if (publishPayloadPreview) {
    return (
      <div className="grid gap-3">
        <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3">
          <p className="text-xs font-semibold uppercase text-teal-100">Frozen publish payload</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{publishPayloadPreview.contentSummary}</p>
          <p className="mt-2 text-xs text-slate-500">{publishPayloadPreview.budgetBoundary}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(publishPayloadPreview.exactFields).map(([key, value]) => (
            <div key={key} className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">{key}</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-red-300/20 bg-red-500/8 p-3">
          <p className="text-xs font-semibold uppercase text-red-100">What will not happen</p>
          <ul className="mt-2 space-y-1 text-sm text-red-100">
            {publishPayloadPreview.whatWillNotHappen.map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </div>
      </div>
    );
  }

  if (!request.payload) {
    return <p className="text-sm text-slate-300">{request.reason}</p>;
  }

  if (request.payload.actionKind === "url_research") {
    return (
      <div className="grid gap-3">
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Purpose</p>
          <p className="mt-1 text-sm text-slate-300">{request.payload.purpose}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Approved URLs</p>
          <div className="mt-2 space-y-1">
            {request.payload.urls.map((url) => <code key={url} className="block text-xs text-teal-100">{url}</code>)}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Goal</p>
          <p className="mt-1 text-sm text-slate-300">{request.payload.extractionGoal}</p>
        </div>
      </div>
    );
  }

  if (request.payload.actionKind === "channel_message") {
    return (
      <div className="grid gap-3">
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Target</p>
          <p className="mt-1 text-sm text-slate-300">{request.payload.channel} / {request.payload.target}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Message</p>
          <p className="mt-1 text-sm text-slate-300">{request.payload.message}</p>
        </div>
        <Badge tone={request.payload.dryRun ? "teal" : "red"}>{request.payload.dryRun ? "dry run" : "real send requested"}</Badge>
      </div>
    );
  }

  if (request.payload.actionKind === "agent_turn") {
    return (
      <div className="rounded-md border border-white/10 bg-black/25 p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">TeamLeader1A prompt</p>
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5 text-amber-100">{request.payload.message}</pre>
      </div>
    );
  }

  if (request.payload.actionKind === "mission_start") {
    return (
      <div className="grid gap-3">
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Mission</p>
          <p className="mt-1 text-sm text-slate-300">{request.payload.title}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Approved local turns</p>
          <p className="mt-1 text-sm text-slate-300">{request.payload.stepCount} exact agent turns / {request.payload.agentProfileIds.join(", ")}</p>
        </div>
        <a className="text-sm font-semibold text-teal-100 hover:text-teal-50" href={`#/mission-briefs?run=${request.payload.missionRunId}`}>
          View Mission Brief
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-white/10 bg-black/25 p-3">
      <p className="text-sm text-slate-300">Start local OpenClaw gateway.</p>
    </div>
  );
}

export function ApprovalCenter() {
  const { data, updateApprovalStatus } = useAppData();
  const { approvalRequests, approvalDecisionRecords, openClawCommands, quests, publishPayloadPreviews, approvalGateStates, approvedBusinesses } = data;
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const filteredRequests = useMemo(() => {
    return approvalRequests.filter((request) => {
      const statusOk = statusFilter === "all" || request.status === statusFilter;
      const actionOk = actionFilter === "all" || actionKind(request) === actionFilter;
      const riskOk = riskFilter === "all" || request.riskLevel === riskFilter;
      return statusOk && actionOk && riskOk;
    });
  }, [actionFilter, approvalRequests, riskFilter, statusFilter]);

  const pendingRequests = filteredRequests.filter((request) => request.status === "pending");
  const nonPendingRequests = filteredRequests.filter((request) => request.status !== "pending");
  const lockedGateStates = approvalGateStates.filter((gate) => ["locked", "needs_product_review", "ready_to_request_approval", "blocked"].includes(gate.status));

  function publishPreviewFor(request: ApprovalRequest) {
    return request.publishPayloadPreviewId ? publishPayloadPreviews.find((item) => item.id === request.publishPayloadPreviewId) : undefined;
  }

  function gateBusiness(gate: ApprovalGateState) {
    return approvedBusinesses.find((business) => business.id === gate.businessId);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Pending Requests</CardTitle>
              <p className="mt-1 text-sm text-slate-400">Only real approval records appear here. If something is locked but not requested, it is shown in the lane below without approve buttons.</p>
            </div>
            <Badge tone="red">{approvalRequests.filter((request) => request.status === "pending").length} pending approval</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">all statuses</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="blocked">blocked</option>
            </Select>
            <Select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
              <option value="all">all actions</option>
              <option value="gateway_start">gateway start</option>
              <option value="agent_turn">agent turn</option>
              <option value="mission_start">mission start</option>
              <option value="url_research">url research</option>
              <option value="channel_message">channel message</option>
              <option value="local">local approvals</option>
            </Select>
            <Select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
              <option value="all">all risks</option>
              <option value="low">low risk</option>
              <option value="medium">medium risk</option>
              <option value="high">high risk</option>
              <option value="critical">critical risk</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {pendingRequests.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
              No pending approval requests match these filters. Locked actions that have not been requested yet are listed below.
            </p>
          ) : null}
          {pendingRequests.map((request) => {
            const Icon = requestIcon(request.type);
            const quest = quests.find((item) => item.id === request.questId);
            const command = openClawCommands.find((item) => item.id === request.commandId);
            const publishPayload = publishPreviewFor(request);
            const blocked = request.status === "blocked" || request.safetyEvaluation?.allowed === false;
            return (
              <div key={request.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-300/30 bg-amber-400/10">
                      <Icon className="h-5 w-5 text-amber-100" />
                    </div>
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge tone="amber">{request.type}</Badge>
                        <Badge tone="slate">{actionKind(request).replace("_", " ")}</Badge>
                        <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${riskTone(request.riskLevel)}`}>{request.riskLevel} risk</span>
                        <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(request.status)}`}>{request.status}</span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-stone-100">{request.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">{quest?.title ?? "Portfolio-level request"} / {formatDateTime(request.createdAt)}</p>
                    </div>
                  </div>
                  {request.amount ? <p className="text-lg font-semibold text-emerald-100">{formatCurrency(request.amount)}</p> : null}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300">{request.safetyEvaluation?.normalizedPayloadSummary ?? request.reason}</p>
                {request.safetyEvaluation ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.safetyEvaluation.riskFlags.map((flag) => (
                      <Badge key={flag} tone={request.safetyEvaluation?.allowed === false ? "red" : "amber"}>{safetyPolicyService.riskFlagLabel(flag)}</Badge>
                    ))}
                  </div>
                ) : null}
                {blocked ? (
                  <div className="mt-3 rounded-md border border-red-300/25 bg-red-500/8 p-3 text-sm text-red-100">
                    {request.blockedExplanation ?? request.safetyEvaluation?.blockedReasons.join(" ") ?? "Blocked by safety policy."}
                  </div>
                ) : null}
                {command?.retryOfCommandId || request.parentApprovalId ? (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-white/10 bg-black/25 p-2 text-xs text-slate-400">
                    <GitBranch className="h-3.5 w-3.5" />
                    Retry lineage: parent approval {request.parentApprovalId ?? "n/a"} / retry of command {command?.retryOfCommandId ?? request.retryOfCommandId}
                  </div>
                ) : null}
                {request.payload?.actionKind === "mission_start" ? (
                  <a className="mt-3 inline-flex text-sm font-semibold text-teal-100 hover:text-teal-50" href={`#/mission-briefs?run=${request.payload.missionRunId}`}>
                    View Mission Brief
                  </a>
                ) : null}
                {publishPayload ? (
                  <a className="mt-3 inline-flex text-sm font-semibold text-teal-100 hover:text-teal-50" href="#/production">
                    View Product Studio payload
                  </a>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setSelected(request)}>
                    <ShieldCheck className="h-4 w-4" />
                    Review
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={blocked || request.status !== "pending"}
                    onClick={() => void updateApprovalStatus(request.id, "approved")}
                  >
                    <Check className="h-4 w-4" />
                    {request.payload ? "Approve and execute" : "Approve locally"}
                  </Button>
                  <Button variant="danger" size="sm" disabled={request.status !== "pending"} onClick={() => void updateApprovalStatus(request.id, "rejected")}>
                    <X className="h-4 w-4" />
                    Reject locally
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Locked / Not Requested Yet</CardTitle>
          <p className="mt-1 text-sm text-slate-400">These are gates that explain why an action cannot be approved from here yet. Use the linked Product Studio step first.</p>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {lockedGateStates.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">No locked product gates are waiting for review.</p>
          ) : null}
          {lockedGateStates.map((gate) => {
            const business = gateBusiness(gate);
            return (
              <div key={gate.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge tone={gate.status === "blocked" ? "red" : gate.status === "ready_to_request_approval" ? "emerald" : "amber"}>{gate.label}</Badge>
                    <h3 className="mt-3 font-display text-lg font-semibold text-stone-100">{business?.name ?? "Product gate"}</h3>
                  </div>
                  <Badge tone="slate">{gate.gate}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{gate.reason}</p>
                <a className="mt-3 inline-flex text-sm font-semibold text-teal-100 hover:text-teal-50" href={gate.linkedPath}>
                  {gate.actionLabel}
                </a>
              </div>
            );
          })}
        </CardContent>
      </Card>
      {nonPendingRequests.length > 0 ? (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Approval History</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {nonPendingRequests.slice(0, 8).map((request) => (
              <div key={request.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-stone-100">{request.title}</p>
                  <Badge tone={request.status === "approved" ? "emerald" : request.status === "rejected" ? "red" : "amber"}>{request.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-400">{formatDateTime(request.createdAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <Dialog open={Boolean(selected)} title={selected?.title ?? "Approval request"} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-4">
            <div className={`rounded-lg border p-4 ${selected.safetyEvaluation?.allowed === false ? "border-red-300/25 bg-red-500/8" : "border-amber-300/25 bg-amber-400/8"}`}>
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                <AlertTriangle className="h-4 w-4" />
                Safety evaluation: {selected.safetyEvaluation?.recommendedDecision ?? "review"}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Approved OpenClaw actions run only after approval, through the Tauri allowlist, and are logged to SQLite. Blocked actions cannot execute.
              </p>
            </div>

            <PayloadCard request={selected} publishPayloadPreview={publishPreviewFor(selected)} />

            {selected.safetyEvaluation ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Risk flags</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.safetyEvaluation.riskFlags.map((flag) => <Badge key={flag} tone="amber">{safetyPolicyService.riskFlagLabel(flag)}</Badge>)}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Blocked reasons</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-300">
                    {(selected.safetyEvaluation.blockedReasons.length > 0 ? selected.safetyEvaluation.blockedReasons : ["None"]).map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Safety checklist</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {selected.safetyChecklist.map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Blocked behaviors</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {selected.blockedBehaviors.map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </div>
            </div>

            {selected.executionResult ? (
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-slate-300">
                Execution result: {selected.executionResult.ok ? "completed" : "failed"} / {selected.executionResult.summary}
              </div>
            ) : null}

            <div className="rounded-lg border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Decision timeline</p>
              <div className="mt-3 space-y-2">
                {approvalDecisionRecords
                  .filter((record) => record.approvalId === selected.id || record.commandId === selected.commandId)
                  .map((record) => (
                    <div key={record.id} className="rounded-md border border-white/10 bg-black/25 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge tone={record.decision === "blocked" ? "red" : record.decision === "approved" ? "emerald" : "amber"}>{record.decision.replace("_", " ")}</Badge>
                        <span className="text-xs text-slate-500">{record.actor} / {formatDateTime(record.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{record.reason}</p>
                    </div>
                  ))}
                {approvalDecisionRecords.filter((record) => record.approvalId === selected.id || record.commandId === selected.commandId).length === 0 ? (
                  <p className="text-sm text-slate-500">No decision records yet.</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => void updateApprovalStatus(selected.id, "approved")}
                disabled={selected.status === "blocked" || selected.safetyEvaluation?.allowed === false || selected.status !== "pending"}
              >
                <Check className="h-4 w-4" />
                {selected.payload ? "Approve and execute" : "Approve locally"}
              </Button>
              <Button variant="danger" onClick={() => void updateApprovalStatus(selected.id, "rejected")} disabled={selected.status !== "pending"}>
                <X className="h-4 w-4" />
                Reject locally
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
