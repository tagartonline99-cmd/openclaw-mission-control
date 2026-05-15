import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const exePath =
  process.env.OPENCLAW_MC_EXE ??
  "C:\\Users\\User\\AppData\\Local\\OpenClaw Mission Control\\openclaw-mission-control.exe";
const port = Number(process.env.OPENCLAW_MC_DEBUG_PORT ?? 9321);
const profile = process.env.OPENCLAW_PROFILE ?? "mission-control";
const gatewayPort = process.env.OPENCLAW_GATEWAY_PORT ?? "19789";
const probeAgent = process.env.OPENCLAW_MC_PROBE_AGENT ?? "content";
const probeRole = process.env.OPENCLAW_MC_PROBE_ROLE ?? "AgentContent";
const probeMessage =
  process.env.OPENCLAW_MC_PROBE_MESSAGE ??
  "OPENCLAW_PRODUCT_DIRECTIVE_RECEIPT_V1. Return exactly: PRODUCT_FACTORY_TAURI_DIRECT_OK";
const probeMissionRunId =
  process.env.OPENCLAW_MC_PROBE_MISSION_RUN_ID ??
  `manual-tauri-probe-${Date.now()}`;
const probeTimeoutSeconds = Number(process.env.OPENCLAW_MC_PROBE_TIMEOUT_SECONDS ?? 180);
const outputPath =
  process.env.OPENCLAW_MC_PROBE_OUT ??
  join(process.cwd(), "test-results", "tauri-openclaw-bridge-probe.json");

const receipt = {
  startedAt: new Date().toISOString(),
  completedAt: null,
  exePath,
  port,
  profile,
  gatewayPort,
  steps: [],
  result: null,
  error: null,
};

function persist() {
  const dir = dirname(outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
}

function step(name, data = {}) {
  receipt.steps.push({ name, at: new Date().toISOString(), ...data });
  persist();
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function waitForTarget() {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
      const target =
        targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl) ??
        targets.find((item) => item.webSocketDebuggerUrl);
      if (target) return target;
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for WebView2 debug target: ${lastError?.message ?? "no target"}`);
}

function connectCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();

    ws.addEventListener("open", () => {
      const client = {
        send(method, params = {}, timeoutMs = 300_000) {
          const messageId = ++id;
          return new Promise((resolveSend, rejectSend) => {
            const timer = setTimeout(() => {
              pending.delete(messageId);
              rejectSend(new Error(`${method}: timed out waiting for CDP response`));
            }, timeoutMs);
            pending.set(messageId, { resolve: resolveSend, reject: rejectSend, method, timer });
            ws.send(JSON.stringify({ id: messageId, method, params }));
          });
        },
        async evaluate(expression, timeoutMs = 300_000) {
          const response = await client.send(
            "Runtime.evaluate",
            {
              expression,
              awaitPromise: true,
              returnByValue: true,
              userGesture: true,
            },
            timeoutMs,
          );
          if (response.exceptionDetails) {
            throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text ?? "Runtime.evaluate failed");
          }
          return response.result?.value;
        },
        close() {
          ws.close();
        },
      };
      resolve(client);
    });

    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const item = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(item.timer);
      if (message.error) item.reject(new Error(`${item.method}: ${message.error.message}`));
      else item.resolve(message.result);
    });
    ws.addEventListener("error", () => reject(new Error("WebSocket connection failed")));
  });
}

async function main() {
  persist();
  step("launching-installed-app");
  const child = spawn(exePath, {
    cwd: dirname(exePath),
    env: {
      ...process.env,
      OPENCLAW_PROFILE: profile,
      OPENCLAW_GATEWAY_PORT: gatewayPort,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-allow-origins=*`,
    },
    windowsHide: false,
    detached: false,
    stdio: "ignore",
  });

  let client;
  try {
    const target = await waitForTarget();
    step("webview-debug-target-ready", { targetUrl: target.url ?? "", targetType: target.type ?? "" });
    client = await connectCdp(target.webSocketDebuggerUrl);
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    await client.evaluate("document.body && document.body.innerText.length > 0", 30_000);

    const appVersion = await client.evaluate(`
      (async () => {
        const invoke = window.__TAURI_INTERNALS__?.invoke;
        if (!invoke) return "";
        try { return await invoke("plugin:app|version"); } catch { return ""; }
      })()
    `);
    step("tauri-invoke-ready", { appVersion });

    const started = Date.now();
    const result = await client.evaluate(`
      (async () => {
        const invoke = window.__TAURI_INTERNALS__?.invoke;
        if (!invoke) return { ok: false, error: "missing __TAURI_INTERNALS__.invoke" };
        const startedAt = Date.now();
        try {
          const request = ${JSON.stringify({
            agentProfileId: probeAgent,
            agentRole: probeRole,
            message: probeMessage,
            missionRunId: probeMissionRunId,
            timeoutSeconds: probeTimeoutSeconds,
          })};
          const response = await Promise.race([
            invoke("openclaw_agent_turn", { request }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("probe timed out in webview after " + ${probeTimeoutSeconds + 90} + "s")),
                ${probeTimeoutSeconds + 90} * 1000,
              ),
            )
          ]);
          return { ok: true, elapsedMs: Date.now() - startedAt, response };
        } catch (error) {
          return {
            ok: false,
            elapsedMs: Date.now() - startedAt,
            error: String(error?.message || error),
            stack: String(error?.stack || "")
          };
        }
      })()
    `, (probeTimeoutSeconds + 120) * 1000);

    receipt.result = { elapsedMs: Date.now() - started, ...result };
    step("probe-complete", { ok: result?.ok ?? false, elapsedMs: receipt.result.elapsedMs });
    if (!receipt.result?.ok || receipt.result?.response?.ok === false) {
      process.exitCode = 1;
    }
  } catch (error) {
    receipt.error = {
      message: String(error?.message || error),
      stack: String(error?.stack || ""),
    };
    step("probe-error", { message: receipt.error.message });
    process.exitCode = 1;
  } finally {
    receipt.completedAt = new Date().toISOString();
    persist();
    client?.close();
    if (!child.killed) child.kill();
    await delay(1500);
    console.log(
      JSON.stringify(
        {
          outputPath,
          ok: Boolean(receipt.result?.ok && receipt.result?.response?.ok !== false),
          responseOk: receipt.result?.response?.ok ?? null,
          error: receipt.error?.message ?? receipt.result?.response?.error ?? null,
        },
        null,
        2,
      ),
    );
  }
}

main();
