import { invoke, isTauri } from "@tauri-apps/api/core";
import type {
  Agent,
  OpenClawMcpServer,
  OpenClawRuntimeStatus,
  UserSettings,
} from "../types";
import { persistenceService } from "./persistenceService";

export type OpenClawBridgeResult = {
  ok: boolean;
  command: string[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
};

export type OpenClawAgentProfile = {
  id: string;
  name?: string;
  identityName?: string;
  identityEmoji?: string;
  workspace?: string;
  agentDir?: string;
  model?: string;
  bindings?: number;
  isDefault?: boolean;
};

export type UrlResearchInput = {
  questId?: string;
  reportId?: string;
  purpose: string;
  urls: string[];
  extractionGoal: string;
  riskNotes: string;
  successCriteria: string;
};

export type ChannelMessageInput = {
  channel: string;
  target: string;
  message: string;
  dryRun: boolean;
};

export type AgentTurnInput = {
  agentProfileId: string;
  agentRole: string;
  message: string;
  missionRunId?: string;
  timeoutSeconds?: number;
};

export type PublicResearchFetchInput = {
  url: string;
  sourcePackId?: string;
  timeoutSeconds?: number;
};

export type PublicResearchFetchResult = {
  ok: boolean;
  url: string;
  sourcePackId?: string;
  statusCode?: number | null;
  title?: string | null;
  excerpt?: string | null;
  contentType?: string | null;
  error?: string | null;
  fetchedAt: string;
};

export type BrowserPublicReadInput = {
  url: string;
  purpose: string;
  sourcePackId?: string;
  huntId?: string;
  timeoutSeconds?: number;
  captureScreenshot?: boolean;
};

export type BrowserPublicReadResult = {
  ok: boolean;
  url: string;
  sourcePackId?: string;
  huntId?: string;
  statusCode?: number | null;
  title?: string | null;
  excerpt?: string | null;
  contentType?: string | null;
  screenshotPath?: string | null;
  screenshotCaptured: boolean;
  basicLinks: string[];
  safetyReceipt: string;
  error?: string | null;
  capturedAt: string;
};

export type OpenClawMcpConfig = Record<
  string,
  {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    disabled?: boolean;
    note?: string;
  }
>;

async function state() {
  return (await persistenceService.loadState()).state;
}

function isTauriRuntime() {
  return isTauri() || (typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window));
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function nextHourIso() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

export function runtimeFromGatewayStatus(result: OpenClawBridgeResult, port: number): OpenClawRuntimeStatus {
  const parsed = parseJson<{
    service?: { runtime?: { status?: string; detail?: string } };
    gateway?: { probeUrl?: string; port?: number };
    rpc?: { ok?: boolean; error?: string };
    health?: { healthy?: boolean };
  }>(result.stdout);

  const rpcOk = parsed?.rpc?.ok === true;
  const runtimeStatus = parsed?.service?.runtime?.status?.toLowerCase();
  const serviceRunning = runtimeStatus === "running" || parsed?.health?.healthy === true;
  const status = rpcOk ? "online" : serviceRunning ? "degraded" : result.ok ? "offline" : "degraded";
  const detailParts = [
    rpcOk ? "OpenClaw gateway RPC is reachable." : parsed?.service?.runtime?.detail,
    !rpcOk ? parsed?.rpc?.error : undefined,
    result.stderr.trim() || undefined,
  ].filter(Boolean);
  const detail =
    detailParts.join(" / ") ||
    (rpcOk ? "OpenClaw gateway is reachable." : "OpenClaw gateway is not reachable.");

  return {
    id: "runtime-mock",
    status,
    endpoint: parsed?.gateway?.probeUrl ?? `ws://127.0.0.1:${parsed?.gateway?.port ?? port}`,
    lastCheckedAt: new Date().toISOString(),
    nextCheckAt: nextHourIso(),
    healthScore: status === "online" ? 92 : status === "offline" ? 35 : 55,
    notes: detail,
  };
}

export function profilesFromResult(result: OpenClawBridgeResult): OpenClawAgentProfile[] {
  return parseJson<OpenClawAgentProfile[]>(result.stdout) ?? [];
}

export function applyProfilesToAgents(agents: Agent[], profiles: OpenClawAgentProfile[], settings: UserSettings): Agent[] {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const syncedAt = new Date().toISOString();

  return agents.map((agent) => {
    const profileId = settings.openClawRoleMap[agent.name];
    const profile = profileId ? profileById.get(profileId) : undefined;
    if (!profileId || !profile) return agent;

    return {
      ...agent,
      openClawProfileId: profile.id,
      openClawWorkspace: profile.workspace,
      openClawModel: profile.model,
      openClawBindings: profile.bindings,
      lastRuntimeSyncAt: syncedAt,
    };
  });
}

function packageInstalled(config?: OpenClawMcpConfig[string]) {
  const entrypoint = config?.args?.[0] ?? "";
  return Boolean(entrypoint && entrypoint.includes("\\mcp-servers\\node_modules\\"));
}

export function mcpServersFromResult(result: OpenClawBridgeResult, existing: OpenClawMcpServer[]): OpenClawMcpServer[] {
  const parsed = parseJson<OpenClawMcpConfig>(result.stdout) ?? {};
  const now = new Date().toISOString();
  return existing.map((server) => {
    const config =
      server.id === "mcp-filesystem"
        ? parsed.filesystem
        : server.id === "mcp-memory"
          ? parsed.memory
          : server.id === "mcp-fetch-approved-url-research"
            ? parsed.fetch_approved_url_research
            : server.id === "mcp-puppeteer-deferred"
              ? parsed.browser_safe_public_read
            : undefined;
    if (!config) {
      return {
        ...server,
        status: server.kind === "browser" ? "needs_install" as const : "needs_install" as const,
        configured: false,
        installed: false,
        lastCheckedAt: now,
        updatedAt: now,
      };
    }
    const disabled = config.disabled === true;
    const installed = packageInstalled(config);
    const brokeredBrowser = server.kind === "browser" && config.note === "safe-public-browser-read-brokered";
    return {
      ...server,
      command: config.command,
      args: config.args ?? [],
      env: config.env,
      status: brokeredBrowser && installed ? "safe_public_read" : disabled ? "disabled" : installed ? "configured" : "installed",
      safetyMode: brokeredBrowser ? "brokered" : server.safetyMode,
      enabled: !disabled,
      configured: true,
      installed,
      lastCheckedAt: now,
      updatedAt: now,
      notes: config.note ?? server.notes,
    };
  });
}

async function bridge<T extends OpenClawBridgeResult>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isTauriRuntime()) return null;
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    return {
      ok: false,
      command: [`tauri://${command}`],
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: null,
      timedOut: false,
    } as T;
  }
}

export const openclawService = {
  async getRuntimeStatus() {
    return (await state()).openClawRuntimeStatus;
  },
  async listCommands() {
    return (await state()).openClawCommands;
  },
  async listEvents() {
    return (await state()).openClawEvents;
  },
  async listCapabilities() {
    return (await state()).openClawCapabilities;
  },
  async listPermissions() {
    return (await state()).openClawPermissions;
  },
  async probeGateway(port: number) {
    return bridge("openclaw_gateway_status").then((result) =>
      result ?? {
        ok: false,
        command: ["mock://openclaw_gateway_status"],
        stdout: "",
        stderr: "Tauri desktop runtime is required for real OpenClaw status.",
        exitCode: null,
        timedOut: false,
      },
    ).then((result) => ({
      result,
      runtimeStatus: runtimeFromGatewayStatus(result, port),
    }));
  },
  async syncAgents() {
    const result =
      (await bridge("openclaw_agents_list")) ??
      ({
        ok: false,
        command: ["mock://openclaw_agents_list"],
        stdout: "[]",
        stderr: "Tauri desktop runtime is required for real OpenClaw agent sync.",
        exitCode: null,
        timedOut: false,
      } satisfies OpenClawBridgeResult);

    return { result, profiles: profilesFromResult(result) };
  },
  async listTasks() {
    return bridge("openclaw_tasks_list");
  },
  async listMcpServers(existing: OpenClawMcpServer[]) {
    const result =
      (await bridge("openclaw_mcp_list")) ??
      ({
        ok: false,
        command: ["mock://openclaw_mcp_list"],
        stdout: "{}",
        stderr: "Tauri desktop runtime is required for real OpenClaw MCP status.",
        exitCode: null,
        timedOut: false,
      } satisfies OpenClawBridgeResult);

    return { result, servers: mcpServersFromResult(result, existing) };
  },
  async installMcpLocalKit(obsidianVaultPath: string) {
    return bridge("openclaw_mcp_install_local_kit", { request: { obsidianVaultPath } }).then((result) =>
      result ?? {
        ok: false,
        command: ["mock://openclaw_mcp_install_local_kit"],
        stdout: "",
        stderr: "Tauri desktop runtime is required to install or repair OpenClaw MCP servers.",
        exitCode: null,
        timedOut: false,
      },
    );
  },
  async startGateway() {
    return bridge("openclaw_gateway_start").then((result) =>
      result ?? {
        ok: false,
        command: ["mock://openclaw_gateway_start"],
        stdout: "",
        stderr: "Tauri desktop runtime is required to start the real OpenClaw gateway.",
        exitCode: null,
        timedOut: false,
      },
    );
  },
  async runAgentTurn(input: AgentTurnInput) {
    return bridge("openclaw_agent_turn", { request: { ...input, timeoutSeconds: input.timeoutSeconds ?? 300 } }).then((result) =>
      result ?? {
        ok: false,
        command: ["mock://openclaw_agent_turn"],
        stdout: "",
        stderr: "Tauri desktop runtime is required for a live OpenClaw agent turn.",
        exitCode: null,
        timedOut: false,
      },
    );
  },
  async runTeamLeaderTurn(message: string) {
    return this.runAgentTurn({ agentProfileId: "main", agentRole: "TeamLeader1A", message, timeoutSeconds: 300 });
  },
  async runUrlResearch(input: UrlResearchInput) {
    return bridge("openclaw_url_research", { request: { ...input, timeoutSeconds: 300 } }).then((result) =>
      result ?? {
        ok: false,
        command: ["mock://openclaw_url_research"],
        stdout: "",
        stderr: "Tauri desktop runtime is required for approved URL research.",
        exitCode: null,
        timedOut: false,
      },
    );
  },
  async fetchPublicResearch(input: PublicResearchFetchInput): Promise<PublicResearchFetchResult> {
    if (!isTauriRuntime()) {
      return {
        ok: false,
        url: input.url,
        sourcePackId: input.sourcePackId,
        statusCode: null,
        title: null,
        excerpt: null,
        contentType: null,
        error: "Browser preview uses curated source-pack metadata; desktop Tauri performs real GET-only research fetches.",
        fetchedAt: new Date().toISOString(),
      };
    }
    try {
      return await invoke<PublicResearchFetchResult>("public_research_fetch", { request: { ...input, timeoutSeconds: input.timeoutSeconds ?? 12 } });
    } catch (error) {
      return {
        ok: false,
        url: input.url,
        sourcePackId: input.sourcePackId,
        statusCode: null,
        title: null,
        excerpt: null,
        contentType: null,
        error: error instanceof Error ? error.message : String(error),
        fetchedAt: new Date().toISOString(),
      };
    }
  },
  async readPublicBrowserSource(input: BrowserPublicReadInput): Promise<BrowserPublicReadResult> {
    if (!isTauriRuntime()) {
      return {
        ok: true,
        url: input.url,
        sourcePackId: input.sourcePackId,
        huntId: input.huntId,
        statusCode: 200,
        title: "Browser preview safe read",
        excerpt: "Browser preview simulates the Mission Control broker. The installed desktop app performs the guarded local browser read and screenshot capture.",
        contentType: "text/html; preview=true",
        screenshotPath: "browser-preview-no-local-file",
        screenshotCaptured: false,
        basicLinks: [],
        safetyReceipt: `safe-browser-public-read:browser-preview:${input.captureScreenshot === false ? "no-screenshot" : "screenshot-requested"}:no-login:no-forms:no-spend:no-publish`,
        capturedAt: new Date().toISOString(),
      };
    }
    try {
      return await invoke<BrowserPublicReadResult>("browser_public_read", {
        request: { ...input, timeoutSeconds: input.timeoutSeconds ?? 18, captureScreenshot: input.captureScreenshot ?? true },
      });
    } catch (error) {
      return {
        ok: false,
        url: input.url,
        sourcePackId: input.sourcePackId,
        huntId: input.huntId,
        statusCode: null,
        title: null,
        excerpt: null,
        contentType: null,
        screenshotPath: null,
        screenshotCaptured: false,
        basicLinks: [],
        safetyReceipt: "safe-browser-public-read:failed-before-execution",
        error: error instanceof Error ? error.message : String(error),
        capturedAt: new Date().toISOString(),
      };
    }
  },
  async sendChannelMessage(input: ChannelMessageInput) {
    return bridge("openclaw_channel_send", { request: { ...input, timeoutSeconds: 60 } }).then((result) =>
      result ?? {
        ok: false,
        command: ["mock://openclaw_channel_send"],
        stdout: "",
        stderr: "Tauri desktop runtime is required for approved channel messaging.",
        exitCode: null,
        timedOut: false,
      },
    );
  },
  async previewCommand(command: string) {
    return {
      command,
      status: "requires_approval",
      approvalRequired: true,
      note: "Phase 5 real actions require one approval per action and run only through the Tauri allowlist.",
    };
  },
};
