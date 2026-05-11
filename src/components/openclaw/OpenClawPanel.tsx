import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Cpu, Lock, Network, Play, Radio, RefreshCw, RotateCcw, Send, ShieldCheck, TerminalSquare, Users, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { formatDateTime, riskTone, statusTone } from "../../utils/formatting";
import { useAppData } from "../../app/AppDataContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Dialog } from "../ui/dialog";
import { safetyPolicyService } from "../../services/safetyPolicyService";
import { completeOpenClawRoleMap } from "../../services/openclawService";
import { AllowlistManager } from "./AllowlistManager";
import { McpManager } from "./McpManager";

type ActionNotice = {
  tone: "success" | "warning";
  text: string;
};

function urlHost(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isPrivateHost(host: string) {
  if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local")) return true;
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

function domainAllowed(host: string, approvedDomains: string[]) {
  if (approvedDomains.length === 0) return true;
  return approvedDomains.some((domain) => {
    const normalized = domain.toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    return host === normalized || host.endsWith(`.${normalized}`);
  });
}

export function OpenClawPanel() {
  const {
    data,
    adapter,
    refreshOpenClawStatus,
    syncOpenClawAgents,
    requestGatewayStart,
    requestUrlResearch,
    requestChannelMessage,
    cancelOpenClawCommand,
    markOpenClawCommandFailed,
    retryOpenClawCommand,
  } = useAppData();
  const { agents, approvalRequests, openClawCapabilities, openClawCommands, openClawEvents, openClawPermissions, openClawRuntimeStatus, tavilySettings } = data;
  const [researchPurpose, setResearchPurpose] = useState("Validate competitor positioning and evidence of demand");
  const [researchUrls, setResearchUrls] = useState("https://example.com");
  const [researchGoal, setResearchGoal] = useState("Extract positioning, audience, claims, pricing, and risks.");
  const [channel, setChannel] = useState("discord");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  const [pendingRecovery, setPendingRecovery] = useState<{ kind: "cancel" | "fail" | "retry"; commandId: string } | null>(null);

  const roleMap = useMemo(() => completeOpenClawRoleMap(data.userSettings), [data.userSettings]);
  const mappedRoleCount = agents.filter((agent) => agent.openClawProfileId && agent.openClawProfileId === roleMap[agent.name]).length;
  const researchUrlsList = researchUrls.split(/[,\n]/g).map((url) => url.trim()).filter(Boolean);
  const researchEvaluation = useMemo(
    () =>
      safetyPolicyService.evaluateOpenClawPayload(
        {
          actionKind: "url_research",
          purpose: researchPurpose,
          urls: researchUrlsList,
          extractionGoal: researchGoal,
          riskNotes: "Approved URL research only. No login, form submission, purchase, PII harvesting, or terms bypass.",
          successCriteria: "Return concise findings, evidence, risks, and next approval-gated step.",
          expectedResult: "TeamLeader1A reports findings from the approved URL research task or fails safely.",
        },
        { allowlistEntries: data.allowlistEntries, userSettings: data.userSettings },
      ),
    [data.allowlistEntries, data.userSettings, researchGoal, researchPurpose, researchUrlsList],
  );
  const channelEvaluation = useMemo(
    () =>
      safetyPolicyService.evaluateOpenClawPayload(
        {
          actionKind: "channel_message",
          channel,
          target,
          message,
          dryRun: true,
          expectedResult: "OpenClaw validates the message payload without sending.",
        },
        { allowlistEntries: data.allowlistEntries, userSettings: data.userSettings },
      ),
    [channel, data.allowlistEntries, data.userSettings, message, target],
  );

  const createUrlResearchApproval = () => {
    void requestUrlResearch({
      purpose: researchPurpose,
      urls: researchUrlsList,
      extractionGoal: researchGoal,
      riskNotes: "Approved URL research only. No login, form submission, purchase, PII harvesting, or terms bypass.",
      successCriteria: "Return concise findings, evidence, risks, and next approval-gated step.",
    });
    setNotice(
      researchEvaluation.allowed
        ? { tone: "success", text: "URL research approval request created. No browser or scraping action has run yet." }
        : { tone: "warning", text: `Blocked attempt recorded. ${researchEvaluation.blockedReasons.join(" ")}` },
    );
  };

  const createChannelApproval = () => {
    const trimmedTarget = target.trim();
    const trimmedMessage = message.trim();
    void requestChannelMessage({
      channel,
      target: trimmedTarget,
      message: trimmedMessage,
      dryRun: true,
    });
    setNotice(
      channelEvaluation.allowed
        ? { tone: "success", text: "Dry-run channel approval request created. Nothing has been sent." }
        : { tone: "warning", text: `Blocked attempt recorded. ${channelEvaluation.blockedReasons.join(" ")}` },
    );
  };

  const confirmRecovery = () => {
    if (!pendingRecovery) return;
    if (pendingRecovery.kind === "cancel") void cancelOpenClawCommand(pendingRecovery.commandId);
    if (pendingRecovery.kind === "fail") void markOpenClawCommandFailed(pendingRecovery.commandId);
    if (pendingRecovery.kind === "retry") void retryOpenClawCommand(pendingRecovery.commandId);
    setPendingRecovery(null);
  };

  const blockedAttempts = [
    ...approvalRequests.filter((request) => request.status === "blocked"),
    ...openClawCommands.filter((command) => command.status === "blocked").map((command) => ({
      id: command.id,
      title: command.command,
      blockedExplanation: command.resultSummary,
      createdAt: command.createdAt,
    })),
  ].slice(0, 8);

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-4 w-4 text-amber-100" />
            OpenClaw System Health
          </CardTitle>
          <p className="mt-1 text-sm text-slate-400">The runtime can now sync with the local OpenClaw CLI. Gateway start, agent turns, URL research, and channel sends require approval.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-lg border border-teal-300/20 bg-teal-400/8 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Runtime</p>
              <p className="mt-1 text-lg font-semibold text-teal-100">{openClawRuntimeStatus.status}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Endpoint</p>
              <p className="mt-1 truncate text-sm font-semibold text-stone-100">{openClawRuntimeStatus.endpoint}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Last checked</p>
              <p className="mt-1 text-sm font-semibold text-stone-100">{formatDateTime(openClawRuntimeStatus.lastCheckedAt)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Next check</p>
              <p className="mt-1 text-sm font-semibold text-stone-100">{formatDateTime(openClawRuntimeStatus.nextCheckAt)}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Runtime health score</span>
              <span>{openClawRuntimeStatus.healthScore}%</span>
            </div>
            <Progress value={openClawRuntimeStatus.healthScore} tone="teal" />
          </div>
          <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
            {openClawRuntimeStatus.notes}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-100" />
            Tavily Research + FactCheck Station
          </CardTitle>
          <p className="mt-1 text-sm text-slate-400">
            Tavily API powers real public research packets. FactCheck Station blocks proposal submission when sources are weak, duplicated, challenge-gated, or unsupported.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Provider</p>
            <p className="mt-1 text-lg font-semibold text-stone-100">Tavily API</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">API key</p>
            <p className="mt-1 text-lg font-semibold text-stone-100">{tavilySettings.apiKeyConfigured ? "Configured" : "Needed"}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Default depth</p>
            <p className="mt-1 text-lg font-semibold text-stone-100">{tavilySettings.defaultSearchDepth}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Last test</p>
            <p className="mt-1 text-sm font-semibold text-stone-100">{tavilySettings.lastTestStatus ?? "untested"}</p>
          </div>
          <div className="lg:col-span-4 rounded-lg border border-teal-300/20 bg-teal-400/8 p-3 text-sm leading-6 text-teal-100">
            Configure the key and credit caps in Settings. Safe autonomous lane is search/extract/read-only evidence only; publish, message, spend, login, form submission, purchases, and connector actions remain approval-gated.
          </div>
        </CardContent>
      </Card>
      <McpManager />
      <AllowlistManager />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-4 w-4 text-amber-100" />
              Approved Runtime Actions
            </CardTitle>
            <p className="mt-1 text-sm text-slate-400">These buttons create approval requests. Real external actions do not run until the approval is accepted.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void refreshOpenClawStatus()}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => void syncOpenClawAgents()}>
                <Users className="h-4 w-4" />
                Sync Agents
              </Button>
              <Button variant="danger" onClick={() => void requestGatewayStart()}>
                <Play className="h-4 w-4" />
                Start Gateway
              </Button>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
              Bridge mode: {adapter === "tauri-sqlite" ? "desktop Tauri allowlist with SQLite persistence" : "browser fallback; real OpenClaw commands are unavailable"}.
            </div>
            {notice ? (
              <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${notice.tone === "success" ? "border-teal-300/25 bg-teal-400/8 text-teal-100" : "border-amber-300/25 bg-amber-400/8 text-amber-100"}`}>
                {notice.tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {notice.text}
              </div>
            ) : null}
            <div className="rounded-lg border border-amber-300/20 bg-amber-400/8 p-4">
              <p className="text-sm font-semibold text-amber-100">Approved URL research</p>
              <p className="mt-1 text-xs text-slate-500">
                {data.userSettings.approvedResearchDomains.length > 0
                  ? `Allowed domains: ${data.userSettings.approvedResearchDomains.join(", ")}`
                  : "No domain allowlist is saved, so each explicit URL is reviewed as a one-time approval."}
              </p>
              <div className="mt-3 grid gap-3">
                <Input value={researchPurpose} onChange={(event) => setResearchPurpose(event.target.value)} placeholder="Research purpose" />
                <Input value={researchUrls} onChange={(event) => setResearchUrls(event.target.value)} placeholder="Approved URLs, comma separated" />
                <Input value={researchGoal} onChange={(event) => setResearchGoal(event.target.value)} placeholder="Extraction goal" />
                <div className={`rounded-lg border p-3 text-sm ${researchEvaluation.allowed ? "border-teal-300/25 bg-teal-400/8 text-teal-100" : "border-red-300/25 bg-red-500/8 text-red-100"}`}>
                  Safety: {researchEvaluation.allowed ? "eligible for approval" : researchEvaluation.blockedReasons.join(" ")}
                </div>
                <Button
                  variant="secondary"
                  onClick={createUrlResearchApproval}
                >
                  <Network className="h-4 w-4" />
                  Request URL Research Approval
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-teal-300/20 bg-teal-400/8 p-4">
              <p className="text-sm font-semibold text-teal-100">Draft channel message</p>
              <p className="mt-1 text-xs text-slate-500">
                {data.userSettings.approvedChannelTargets.length > 0
                  ? `Saved targets: ${data.userSettings.approvedChannelTargets.join(", ")}`
                  : "Targets must be typed explicitly. This phase defaults to dry-run send approval."}
              </p>
              <div className="mt-3 grid gap-3">
                <Select value={channel} onChange={(event) => setChannel(event.target.value)}>
                  <option value="discord">discord</option>
                  <option value="telegram">telegram</option>
                  <option value="slack">slack</option>
                  <option value="whatsapp">whatsapp</option>
                  <option value="signal">signal</option>
                </Select>
                <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Explicit channel target" />
                <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message text" />
                <div className={`rounded-lg border p-3 text-sm ${channelEvaluation.allowed ? "border-teal-300/25 bg-teal-400/8 text-teal-100" : "border-red-300/25 bg-red-500/8 text-red-100"}`}>
                  Safety: {channelEvaluation.allowed ? "dry-run eligible for approval" : channelEvaluation.blockedReasons.join(" ")}
                </div>
                <Button
                  variant="secondary"
                  onClick={createChannelApproval}
                >
                  <Send className="h-4 w-4" />
                  Request Dry-Run Send Approval
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-100" />
              Runtime Role Map
              <Badge tone={mappedRoleCount === agents.length ? "teal" : "amber"}>{mappedRoleCount}/{agents.length} mapped</Badge>
            </CardTitle>
            <p className="mt-1 text-sm text-slate-400">
              This always shows the full OpenClaw roster. If a role says profile missing, click Sync Agents after checking the local runtime profiles.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {agents.map((agent) => {
              const expectedProfileId = roleMap[agent.name];
              const correctlyMapped = Boolean(agent.openClawProfileId && expectedProfileId && agent.openClawProfileId === expectedProfileId);
              const hasUnexpectedProfile = Boolean(agent.openClawProfileId && expectedProfileId && agent.openClawProfileId !== expectedProfileId);
              const badgeTone = correctlyMapped ? "teal" : hasUnexpectedProfile ? "amber" : "red";
              const badgeLabel = correctlyMapped
                ? agent.openClawProfileId
                : hasUnexpectedProfile
                  ? `${agent.openClawProfileId} -> expected ${expectedProfileId}`
                  : expectedProfileId
                    ? `${expectedProfileId} profile missing`
                    : "not mapped";
              return (
                <div key={agent.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-stone-100">{agent.name}</p>
                    <Badge tone={badgeTone}>{badgeLabel}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {agent.openClawModel ?? "Sync real profiles to populate model/workspace."}
                    {agent.openClawWorkspace ? ` / ${agent.openClawWorkspace}` : ""}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-amber-100" />
              OpenClaw Command Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openClawCommands.map((command) => {
              const approval = approvalRequests.find((request) => request.commandId === command.id);
              const canClose = ["queued", "requires_approval", "running"].includes(command.status);
              const canRetry = approval?.payload && ["failed", "cancelled"].includes(command.status);
              return (
                <div key={command.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <code className="text-xs text-teal-100">{command.command}</code>
                    <div className="flex flex-wrap gap-2">
                      {command.executionMode ? <Badge tone={command.executionMode === "dry_run" ? "teal" : "amber"}>{command.executionMode}</Badge> : null}
                      {command.actionKind ? <Badge tone="slate">{command.actionKind.replace("_", " ")}</Badge> : null}
                      {approval ? <Badge tone={approval.status === "approved" ? "emerald" : approval.status === "rejected" ? "red" : "amber"}>approval {approval.status}</Badge> : null}
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(command.status)}`}>{command.status.replace("_", " ")}</span>
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${riskTone(command.riskLevel)}`}>{command.riskLevel}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{command.resultSummary ?? "Queued for mock execution."}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                    <span>Created {formatDateTime(command.createdAt)}</span>
                    <span>Started {command.startedAt ? formatDateTime(command.startedAt) : "not started"}</span>
                    <span>Completed {command.completedAt ? formatDateTime(command.completedAt) : "not completed"}</span>
                  </div>
                  {approval ? (
                    <div className="mt-2 rounded-md border border-white/10 bg-black/25 p-2 text-xs text-slate-400">
                      Approval record: {approval.id} / {approval.title}
                    </div>
                  ) : null}
                  {command.missionRunId ? (
                    <a className="mt-2 inline-flex text-xs font-semibold text-teal-100 hover:text-teal-50" href={`#/mission-briefs?run=${command.missionRunId}`}>
                      View Mission Brief
                    </a>
                  ) : null}
                  {command.stdout ? <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-md border border-teal-300/20 bg-teal-400/8 p-2 text-xs text-teal-100">{command.stdout}</pre> : null}
                  {command.stderr ? <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-md border border-red-300/20 bg-red-500/8 p-2 text-xs text-red-100">{command.stderr}</pre> : null}
                  {canClose || canRetry ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canClose ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setPendingRecovery({ kind: "cancel", commandId: command.id })}>
                            <XCircle className="h-4 w-4" />
                            Cancel Record
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => setPendingRecovery({ kind: "fail", commandId: command.id })}>
                            <AlertTriangle className="h-4 w-4" />
                            Mark Failed Safely
                          </Button>
                        </>
                      ) : null}
                      {canRetry ? (
                        <Button variant="secondary" size="sm" onClick={() => setPendingRecovery({ kind: "retry", commandId: command.id })}>
                          <RotateCcw className="h-4 w-4" />
                          Retry With Approval
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-100" />
              Blocked Attempt Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {blockedAttempts.map((item) => (
              <div key={item.id} className="rounded-lg border border-red-300/20 bg-red-500/8 p-3">
                <p className="font-semibold text-red-100">{item.title}</p>
                <p className="mt-2 text-sm text-slate-300">{"blockedExplanation" in item ? item.blockedExplanation : "Blocked by safety policy."}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
              </div>
            ))}
            {blockedAttempts.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-slate-400">No blocked attempts recorded.</div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-amber-100" />
              Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openClawCapabilities.map((capability) => (
              <div key={capability.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-stone-100">{capability.name}</p>
                  <Badge tone={capability.status === "blocked" ? "red" : capability.status === "needs_install" ? "amber" : "teal"}>
                    {capability.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{capability.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-100" />
              Permission Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openClawPermissions.map((permission) => (
              <div key={permission.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-stone-100">{permission.name}</p>
                  <Badge tone={permission.allowed ? "emerald" : "red"}>{permission.allowed ? "allowed" : "locked"}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-300">{permission.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-amber-100" />
              Event Log
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openClawEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-stone-100">{event.title}</p>
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(event.severity)}`}>{event.severity}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{event.detail}</p>
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Activity className="h-3.5 w-3.5" /> {formatDateTime(event.createdAt)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Dialog open={Boolean(pendingRecovery)} title="Confirm local command recovery" onClose={() => setPendingRecovery(null)}>
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-300/25 bg-amber-400/8 p-4 text-sm text-amber-100">
            {pendingRecovery?.kind === "retry"
              ? "Retry creates a fresh approval request linked to the original command. It will not execute until approved."
              : "This only updates the local command record and decision timeline. It does not execute external work."}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={pendingRecovery?.kind === "fail" ? "danger" : "secondary"} onClick={confirmRecovery}>
              Confirm
            </Button>
            <Button variant="outline" onClick={() => setPendingRecovery(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
