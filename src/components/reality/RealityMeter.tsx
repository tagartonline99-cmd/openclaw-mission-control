import { ChevronDown, Database, Eye, Lock, Radio, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppDataContext";
import type { AppDataState } from "../../services/persistenceService";
import type { RealityMode } from "../../types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export const realityLabels: Record<RealityMode, string> = {
  real_local: "Real Local",
  real_public_read: "Real Public Read",
  local_draft: "Local Draft",
  simulated: "Simulated",
  mock_seed_data: "Mock Seed Data",
  pending_external_approval: "Pending External Approval",
  external_action_blocked: "External Action Blocked",
};

const realityTone: Record<RealityMode, "teal" | "emerald" | "amber" | "red" | "slate"> = {
  real_local: "teal",
  real_public_read: "emerald",
  local_draft: "amber",
  simulated: "slate",
  mock_seed_data: "slate",
  pending_external_approval: "amber",
  external_action_blocked: "red",
};

const explanation: Record<RealityMode, { happened: string; didNot: string }> = {
  real_local: {
    happened: "Local SQLite records, local files, local OpenClaw-safe commands, or UI actions exist on this machine.",
    didNot: "This does not mean money was spent, content was published, or an external account was controlled.",
  },
  real_public_read: {
    happened: "Mission Control performed safe public read-only research, such as GET/browser-read evidence capture.",
    didNot: "No login, form submission, purchase, private host access, or unrestricted crawling happened.",
  },
  local_draft: {
    happened: "The agents produced a local product draft, preview, proof pack, or production artifact for inspection.",
    didNot: "The draft is not public and has not been submitted to Fiverr, a CMS, email platform, marketplace, or social channel.",
  },
  simulated: {
    happened: "A local simulation or fallback mock command recorded a status update.",
    didNot: "No real OpenClaw runtime action or external business operation happened from this item.",
  },
  mock_seed_data: {
    happened: "Starter/demo rows are present so the app can explain workflows on a fresh install.",
    didNot: "Seed data is not agent work created from your TeamLeader command.",
  },
  pending_external_approval: {
    happened: "A real approval record exists or an exact approval boundary is waiting for your review.",
    didNot: "The risky external action cannot execute until you explicitly approve that exact request.",
  },
  external_action_blocked: {
    happened: "Mission Control blocked or locked a risky external behavior.",
    didNot: "Spending, publishing, messaging, login automation, purchases, form submission, connector execution, --deliver, and broadcast did not run.",
  },
};

function countFallbackReality(data: AppDataState): Record<RealityMode, number> {
  return {
    real_local: data.executionReceipts.filter((receipt) => !receipt.externalAction && !receipt.approvalRequired).length,
    real_public_read: data.browserResearchArtifacts.length + data.evidenceCitations.length,
    local_draft: data.productPreviews.length + data.localAssetFiles.length,
    simulated: data.openClawCommands.filter((command) => command.executionMode === "mock" || command.status === "simulated").length,
    mock_seed_data: data.quests.length + data.businessIdeas.length ? 1 : 0,
    pending_external_approval: data.approvalRequests.filter((approval) => approval.status === "pending").length,
    external_action_blocked:
      data.approvalRequests.filter((approval) => approval.status === "blocked").length +
      data.approvalGateStates.filter((gate) => gate.status === "blocked" || gate.status === "locked").length +
      (data.externalActionLock?.lockedActions?.length ?? 0),
  };
}

function countRealityModes(data: AppDataState): Record<RealityMode, number> {
  const fallback = countFallbackReality(data);
  const counts: Record<RealityMode, number> = {
    real_local: 0,
    real_public_read: 0,
    local_draft: 0,
    simulated: 0,
    mock_seed_data: 0,
    pending_external_approval: 0,
    external_action_blocked: 0,
  };
  for (const receipt of data.realityReceipts ?? []) {
    counts[receipt.mode] = Math.max(counts[receipt.mode], 0) + 1;
  }
  for (const mode of Object.keys(realityLabels) as RealityMode[]) {
    counts[mode] = Math.max(counts[mode], fallback[mode]);
  }
  return counts;
}

export function RealityPill({ mode, count }: { mode: RealityMode; count?: number }) {
  return (
    <Badge tone={realityTone[mode]}>
      {realityLabels[mode]}
      {typeof count === "number" ? ` ${count}` : ""}
    </Badge>
  );
}

export function RealityMeter({ compact = false, scope = "current page" }: { compact?: boolean; scope?: string }) {
  const { data, adapter } = useAppData();
  const [open, setOpen] = useState(false);
  const counts = useMemo(() => countRealityModes(data), [data]);
  const activeModes = (Object.keys(realityLabels) as RealityMode[]).filter((mode) => counts[mode] > 0);
  const totalReceipts = activeModes.reduce((sum, mode) => sum + counts[mode], 0);

  return (
    <Card className={compact ? "bg-black/20" : ""}>
      <CardHeader className="flex flex-col gap-3 border-b border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-teal-100" />
          Reality Meter
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={adapter === "tauri-sqlite" ? "teal" : "amber"}>
            <Database className="h-3.5 w-3.5" />
            {adapter}
          </Badge>
          <Badge tone="slate">{totalReceipts} receipts</Badge>
          <Button variant="outline" onClick={() => setOpen((value) => !value)}>
            <Eye className="h-4 w-4" />
            What is real here?
            <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(realityLabels) as RealityMode[]).map((mode) => (
            <RealityPill key={mode} mode={mode} count={counts[mode]} />
          ))}
        </div>
        {!compact && (
          <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3 text-sm leading-6 text-teal-50">
            This {scope} separates local work, real public reads, drafts, simulations, seed data, pending approvals, and blocked external actions.
          </div>
        )}
        {open && (
          <div className="grid gap-3 lg:grid-cols-2">
            {(Object.keys(realityLabels) as RealityMode[]).map((mode) => (
              <div key={mode} className="rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between gap-2">
                  <RealityPill mode={mode} />
                  <span className="text-xs font-semibold text-slate-500">{counts[mode]} visible</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{explanation[mode].happened}</p>
                <p className="mt-2 flex gap-2 text-sm leading-6 text-slate-400">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-100" />
                  {explanation[mode].didNot}
                </p>
              </div>
            ))}
            <div className="rounded-md border border-emerald-300/20 bg-emerald-400/8 p-3 lg:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                <ShieldCheck className="h-4 w-4" />
                Safety boundary
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-50">
                Safe autonomous work can research public pages, draft locally, score evidence, and organize tasks. Publishing, spending, messaging, login automation, form submission, purchases, connector execution, --deliver, and broadcast stay blocked until a separate exact approval exists.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
