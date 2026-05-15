import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const exePath =
  process.env.OPENCLAW_MC_EXE ??
  "C:\\Users\\User\\AppData\\Local\\OpenClaw Mission Control\\openclaw-mission-control.exe";
const port = Number(process.env.OPENCLAW_MC_DEBUG_PORT ?? 9333);
const commandName = process.env.OPENCLAW_MC_TAURI_COMMAND ?? "openclaw_agents_list";
const commandArgs = process.env.OPENCLAW_MC_TAURI_ARGS ? JSON.parse(process.env.OPENCLAW_MC_TAURI_ARGS) : {};
const outputPath =
  process.env.OPENCLAW_MC_TAURI_PROBE_OUT ??
  join(process.cwd(), "test-results", `tauri-command-${commandName}.json`);

const receipt = {
  startedAt: new Date().toISOString(),
  completedAt: null,
  exePath,
  port,
  commandName,
  commandArgs,
  appVersion: null,
  result: null,
  error: null,
};

function persist() {
  const dir = dirname(outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
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
        send(method, params = {}, timeoutMs = 180_000) {
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
        async evaluate(expression, timeoutMs = 180_000) {
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
  const child = spawn(exePath, {
    cwd: dirname(exePath),
    env: {
      ...process.env,
      OPENCLAW_PROFILE: "mission-control",
      OPENCLAW_GATEWAY_PORT: "19789",
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-allow-origins=*`,
    },
    windowsHide: true,
    detached: false,
    stdio: "ignore",
  });

  let client;
  try {
    const target = await waitForTarget();
    client = await connectCdp(target.webSocketDebuggerUrl);
    await client.send("Runtime.enable");
    await client.evaluate("document.body && document.body.innerText.length > 0", 30_000);
    receipt.appVersion = await client.evaluate(`
      (async () => {
        const invoke = window.__TAURI_INTERNALS__?.invoke;
        if (!invoke) return "";
        try { return await invoke("plugin:app|version"); } catch { return ""; }
      })()
    `);
    receipt.result = await client.evaluate(`
      (async () => {
        const invoke = window.__TAURI_INTERNALS__?.invoke;
        if (!invoke) return { invokeError: "missing __TAURI_INTERNALS__.invoke" };
        try {
          return await invoke(${JSON.stringify(commandName)}, ${JSON.stringify(commandArgs)});
        } catch (error) {
          return { invokeError: String(error?.message || error), stack: String(error?.stack || "") };
        }
      })()
    `);
  } catch (error) {
    receipt.error = {
      message: String(error?.message || error),
      stack: String(error?.stack || ""),
    };
    process.exitCode = 1;
  } finally {
    receipt.completedAt = new Date().toISOString();
    persist();
    client?.close();
    if (!child.killed) child.kill();
    await delay(1500);
    console.log(JSON.stringify({ outputPath, appVersion: receipt.appVersion, ok: !receipt.error, error: receipt.error?.message ?? null }, null, 2));
  }
}

main();
