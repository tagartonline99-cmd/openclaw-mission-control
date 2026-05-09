import { invoke, isTauri } from "@tauri-apps/api/core";
import type {
  Agent,
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
  async runTeamLeaderTurn(message: string) {
    return bridge("openclaw_agent_turn", { request: { message, timeoutSeconds: 300 } }).then((result) =>
      result ?? {
        ok: false,
        command: ["mock://openclaw_agent_turn"],
        stdout: "",
        stderr: "Tauri desktop runtime is required for a live TeamLeader1A turn.",
        exitCode: null,
        timedOut: false,
      },
    );
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
