import { Brain, FolderLock, Globe2, PackageCheck, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import type { OpenClawMcpServer } from "../../types";
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

export function McpManager() {
  const { data, adapter, refreshOpenClawMcpStatus, installOpenClawMcpLocalKit } = useAppData();
  const configuredCount = data.openClawMcpServers.filter((server) => server.configured).length;

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
        <div className="grid gap-3 xl:grid-cols-2">
          {data.openClawMcpServers.map((server) => (
            <div key={server.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {iconFor(server)}
                  <div>
                    <p className="font-semibold text-stone-100">{server.name}</p>
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
              <p className="mt-3 text-sm leading-6 text-slate-300">{server.notes}</p>
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
          Browser/Puppeteer MCP is not direct agent control. Mission Control brokers safe public reads, screenshots, and receipts; login, forms, purchases, publishing, messaging, and unrestricted crawling stay blocked.
        </div>
      </CardContent>
    </Card>
  );
}
