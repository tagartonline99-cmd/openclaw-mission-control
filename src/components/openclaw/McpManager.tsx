import { useEffect, useMemo, useState } from "react";
import { Brain, Camera, ExternalLink, FolderLock, Globe2, PackageCheck, RefreshCw, ShieldCheck, TestTube2, Wrench } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import { openclawService } from "../../services/openclawService";
import type { BrowserBrokerStatus, OpenClawMcpServer } from "../../types";
import { formatDateTime } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

function iconFor(server: OpenClawMcpServer) {
  if (server.kind === "filesystem") return <FolderLock className="h-4 w-4 text-amber-100" />;
  if (server.kind === "memory") return <Brain className="h-4 w-4 text-teal-100" />;
  return <Globe2 className="h-4 w-4 text-slate-300" />;
}

function statusTone(server: OpenClawMcpServer): "emerald" | "amber" | "red" | "slate" {
  if (server.status === "configured" || server.status === "safe_public_read") return "emerald";
  if (server.status === "disabled") return "amber";
  if (server.status === "error") return "red";
  return "slate";
}

function safetyLabel(server: OpenClawMcpServer) {
  if (server.safetyMode === "direct_local") return "local scoped";
  if (server.safetyMode === "approval_gated") return "approval gated";
  if (server.safetyMode === "brokered") return "brokered safe read";
  return "deferred";
}

function serverDisplayName(server: OpenClawMcpServer) {
  return server.kind === "browser" ? "Puppeteer MCP Compatibility" : server.name;
}

export function McpManager() {
  const { data, adapter, refreshOpenClawMcpStatus, installOpenClawMcpLocalKit, runBrowserBrokerDiagnostic, revealExportedPath } = useAppData();
  const [brokerStatus, setBrokerStatus] = useState<BrowserBrokerStatus | null>(null);
  const [isCheckingBroker, setIsCheckingBroker] = useState(false);
  const [isTestingBroker, setIsTestingBroker] = useState(false);
  const configuredCount = data.openClawMcpServers.filter((server) => server.configured).length;
  const lastBrowserArtifact = useMemo(
    () => [...data.browserResearchArtifacts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [data.browserResearchArtifacts],
  );
  const lastBrowserFetch = useMemo(
    () => [...data.browserResearchFetches].sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt))[0],
    [data.browserResearchFetches],
  );

  async function refreshBrokerStatus() {
    setIsCheckingBroker(true);
    try {
      setBrokerStatus(await openclawService.getBrowserBrokerStatus());
    } finally {
      setIsCheckingBroker(false);
    }
  }

  async function runDiagnostic() {
    setIsTestingBroker(true);
    try {
      await runBrowserBrokerDiagnostic();
      await refreshBrokerStatus();
    } finally {
      setIsTestingBroker(false);
    }
  }

  useEffect(() => {
    void refreshBrokerStatus();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-amber-100" />
          Free Local MCP Kit
        </CardTitle>
        <p className="mt-1 text-sm text-slate-400">
          MCP access is local-first. Filesystem is scoped, memory is local, fetch stays approval-gated, and browser automation is brokered for safe public reads only.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 p-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Configured servers</p>
            <p className="mt-1 text-lg font-semibold text-stone-100">{configuredCount}/{data.openClawMcpServers.length}</p>
          </div>
          <Badge tone={adapter === "tauri-sqlite" ? "teal" : "amber"}>
            {adapter === "tauri-sqlite" ? "desktop bridge" : "browser preview"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void refreshOpenClawMcpStatus()}>
            <RefreshCw className="h-4 w-4" />
            Refresh MCP status
          </Button>
          <Button variant="outline" onClick={() => void installOpenClawMcpLocalKit()}>
            <Wrench className="h-4 w-4" />
            Install / repair local MCP kit
          </Button>
        </div>
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/8 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Camera className="h-4 w-4 text-cyan-100" />
                <p className="font-semibold text-stone-100">Browser Research Broker</p>
                <Badge tone={brokerStatus?.ok ? "teal" : brokerStatus?.status === "browser_preview" ? "amber" : "red"}>
                  {brokerStatus?.status.replace(/_/g, " ") ?? "checking"}
                </Badge>
                <Badge tone="teal">native safe public read</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                This is the real supported browser research path. It can read exact public URLs and capture screenshots; direct Puppeteer/browser control stays disabled.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={isCheckingBroker} onClick={() => void refreshBrokerStatus()}>
                <RefreshCw className="h-4 w-4" />
                Refresh broker
              </Button>
              <Button variant="secondary" disabled={isTestingBroker} onClick={() => void runDiagnostic()}>
                <TestTube2 className="h-4 w-4" />
                Test browser read with example.com
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Browser executable</p>
              <p className="mt-1 truncate text-sm text-stone-100">{brokerStatus?.browserProgram ?? "checking"}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Artifact folder</p>
              <p className="mt-1 truncate text-sm text-stone-100">{brokerStatus?.artifactDir ?? "checking"}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Last broker read</p>
              <p className="mt-1 text-sm text-stone-100">{lastBrowserArtifact ? formatDateTime(lastBrowserArtifact.createdAt) : "none yet"}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Safety mode</p>
              <p className="mt-1 text-sm text-stone-100">{brokerStatus?.safetyMode ?? "safe-public-read-only"}</p>
            </div>
          </div>
          {brokerStatus ? <p className="mt-3 text-sm leading-6 text-cyan-100">{brokerStatus.notes}</p> : null}
          {lastBrowserArtifact ? (
            <div className="mt-3 rounded-md border border-cyan-300/15 bg-black/25 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-stone-100">Last artifact: {lastBrowserArtifact.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{lastBrowserArtifact.url}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={lastBrowserFetch?.status === "captured" ? "teal" : lastBrowserFetch?.status === "failed" ? "red" : "amber"}>
                    {lastBrowserFetch?.status.replace(/_/g, " ") ?? "recorded"}
                  </Badge>
                  <Badge tone={lastBrowserArtifact.screenshotPath ? "teal" : "amber"}>
                    {lastBrowserArtifact.screenshotPath ? "screenshot saved" : "text only"}
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{lastBrowserArtifact.summary}</p>
              {lastBrowserFetch?.error ? (
                <p className="mt-2 rounded-md border border-red-300/20 bg-red-500/8 p-2 text-xs text-red-100">
                  Blocked or failed safely: {lastBrowserFetch.error}. Revise by using an exact public HTTP/HTTPS page that does not require login, forms, checkout, CAPTCHA, or account access.
                </p>
              ) : null}
              {lastBrowserArtifact.screenshotPath ? (
                <Button className="mt-3" variant="outline" size="sm" onClick={() => void revealExportedPath(lastBrowserArtifact.screenshotPath!)}>
                  <ExternalLink className="h-4 w-4" />
                  Open screenshot location
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {data.openClawMcpServers.map((server) => (
            <div key={server.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {iconFor(server)}
                  <div>
                    <p className="font-semibold text-stone-100">{serverDisplayName(server)}</p>
                    <p className="text-xs text-slate-500">{server.packageName}@{server.packageVersion}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={statusTone(server)}>{server.status.replace(/_/g, " ")}</Badge>
                  <Badge tone={server.safetyMode === "approval_gated" ? "amber" : server.safetyMode === "deferred" ? "red" : "teal"}>
                    {safetyLabel(server)}
                  </Badge>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {server.kind === "browser"
                  ? "Optional deprecated MCP compatibility. It is disabled for direct agent control; Mission Control uses the native Browser Research Broker above for safe public reads."
                  : server.notes}
              </p>
              {server.allowedPaths?.length ? (
                <div className="mt-3 rounded-md border border-amber-300/15 bg-amber-400/5 p-2">
                  <p className="text-xs font-semibold uppercase text-amber-100">Allowed paths</p>
                  <div className="mt-2 space-y-1">
                    {server.allowedPaths.map((path) => (
                      <code key={path} className="block truncate text-xs text-slate-300">{path}</code>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{server.enabled ? "Enabled" : "Disabled"}</span>
                <span>{server.configured ? "Configured" : "Not configured"}</span>
                <span>{server.installed ? "Installed" : "Install check pending"}</span>
                {server.lastCheckedAt ? <span>Checked {formatDateTime(server.lastCheckedAt)}</span> : null}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-teal-300/20 bg-teal-400/8 p-3 text-sm leading-6 text-teal-100">
          <ShieldCheck className="mb-2 h-4 w-4" />
          Browser Research Broker is not direct agent control. Mission Control brokers exact public reads, screenshots, and receipts; login, forms, purchases, publishing, messaging, and unrestricted crawling stay blocked.
        </div>
      </CardContent>
    </Card>
  );
}
