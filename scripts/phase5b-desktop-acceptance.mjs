import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const exePath =
  process.env.OPENCLAW_MC_EXE ??
  "C:\\Users\\User\\AppData\\Local\\OpenClaw Mission Control\\openclaw-mission-control.exe";
const port = Number(process.env.OPENCLAW_MC_DEBUG_PORT ?? 9245);
const runLive = process.argv.includes("--live") || process.env.OPENCLAW_PHASE5B_LIVE === "1";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
        send(method, params = {}) {
          const messageId = ++id;
          return new Promise((resolveSend, rejectSend) => {
            pending.set(messageId, { resolve: resolveSend, reject: rejectSend, method });
            ws.send(JSON.stringify({ id: messageId, method, params }));
          });
        },
        async evaluate(expression) {
          const response = await client.send("Runtime.evaluate", {
            expression,
            awaitPromise: true,
            returnByValue: true,
            userGesture: true,
          });
          if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? "Runtime.evaluate failed");
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
      if (message.error) item.reject(new Error(`${item.method}: ${message.error.message}`));
      else item.resolve(message.result);
    });
    ws.addEventListener("error", () => reject(new Error("WebSocket connection failed")));
  });
}

async function launch() {
  const child = spawn(exePath, {
    cwd: dirname(exePath),
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-allow-origins=*`,
    },
    windowsHide: false,
    detached: false,
    stdio: "ignore",
  });
  const target = await waitForTarget();
  const client = await connectCdp(target.webSocketDebuggerUrl);
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await waitFor(client, "document.body && document.body.innerText.length > 0", "initial render", 30_000);
  await client.evaluate(`
    (() => {
      window.__phase5bErrors = [];
      window.addEventListener("error", (event) => window.__phase5bErrors.push(String(event.error || event.message)));
      window.addEventListener("unhandledrejection", (event) => window.__phase5bErrors.push(String(event.reason)));
    })()
  `);
  return { child, client };
}

async function closeApp(app) {
  app.client?.close();
  if (app.child && !app.child.killed) app.child.kill();
  await delay(1500);
}

async function waitFor(client, expression, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await client.evaluate(expression);
    if (value) return value;
    await delay(300);
  }
  const body = await client.evaluate("document.body.innerText.slice(0, 2600)").catch(() => "");
  const errors = await client.evaluate("JSON.stringify(window.__phase5bErrors || [])").catch(() => "[]");
  throw new Error(`Timed out waiting for ${label}. Errors: ${errors}. Body: ${body}`);
}

async function route(client, hash, text) {
  await client.evaluate(`location.hash = ${JSON.stringify(hash)}`);
  await waitFor(client, `document.body.innerText.includes(${JSON.stringify(text)})`, text);
}

async function click(client, text, index = 0) {
  const clicked = await client.evaluate(`
    (() => {
      const buttons = [...document.querySelectorAll("button")]
        .filter((button) => button.innerText.includes(${JSON.stringify(text)}) && !button.disabled);
      const button = buttons[${index}];
      if (!button) return false;
      button.click();
      return true;
    })()
  `);
  assert(clicked, `Could not click ${text}`);
}

async function setInputByPlaceholder(client, placeholder, value) {
  const changed = await client.evaluate(`
    (() => {
      const input = [...document.querySelectorAll("input")]
        .find((item) => item.placeholder === ${JSON.stringify(placeholder)});
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()
  `);
  assert(changed, `Missing input with placeholder ${placeholder}`);
}

async function approveRequestContaining(client, needle, timeoutMs = 120_000) {
  const clicked = await client.evaluate(`
    (() => {
      const candidates = [];
      for (const button of [...document.querySelectorAll("button")]) {
        if (!button.innerText.includes("Approve and execute") || button.disabled) continue;
        let node = button.parentElement;
        while (node && node !== document.body) {
          const text = node.innerText ?? "";
          if (text.includes(${JSON.stringify(needle)}) && text.toLowerCase().includes("pending") && text.length < 3000) {
            candidates.push({ button, size: text.length });
            break;
          }
          node = node.parentElement;
        }
      }
      const item = candidates.sort((a, b) => a.size - b.size)[0];
      const button = item?.button;
      if (!button) return false;
      button.click();
      return true;
    })()
  `);
  assert(clicked, `Could not approve request containing ${needle}`);
  await waitFor(
    client,
    `document.body.innerText.includes("Execution result: completed") || document.body.innerText.includes("Execution result: failed") || document.body.innerText.includes("APPROVED")`,
    `execution result for ${needle}`,
    timeoutMs,
  );
}

async function waitForPersistedApproval(client, needle, expectedStatus, timeoutMs = 60_000) {
  await waitFor(
    client,
    `(async () => {
      const invoke = window.__TAURI_INTERNALS__?.invoke;
      if (!invoke) return false;
      const db = await invoke("plugin:sql|load", { db: "sqlite:openclaw-mission-control.db" });
      const rows = await invoke("plugin:sql|select", {
        db,
        query: "SELECT status, payload FROM approval_requests WHERE payload LIKE ?",
        values: [${JSON.stringify(`%${needle}%`)}],
      });
      return rows.some((row) => row.status === ${JSON.stringify(expectedStatus)} || JSON.parse(row.payload).status === ${JSON.stringify(expectedStatus)});
    })()`,
    `persisted approval ${expectedStatus} for ${needle}`,
    timeoutMs,
  );
}

async function waitForPersistedExecution(client, needle, timeoutMs = 120_000) {
  await waitFor(
    client,
    `(async () => {
      const invoke = window.__TAURI_INTERNALS__?.invoke;
      if (!invoke) return false;
      const db = await invoke("plugin:sql|load", { db: "sqlite:openclaw-mission-control.db" });
      const rows = await invoke("plugin:sql|select", {
        db,
        query: "SELECT payload FROM approval_requests WHERE payload LIKE ? ORDER BY created_at DESC LIMIT 1",
        values: [${JSON.stringify(`%${needle}%`)}],
      });
      if (!rows.length) return false;
      const approval = JSON.parse(rows[0].payload);
      if (approval.status !== "approved" || !approval.commandId) return false;
      const commands = await invoke("plugin:sql|select", {
        db,
        query: "SELECT payload FROM openclaw_commands WHERE id = ?",
        values: [approval.commandId],
      });
      if (!commands.length) return false;
      const command = JSON.parse(commands[0].payload);
      const terminal = command.status === "complete" || command.status === "failed" || command.status === "cancelled";
      const interrupted = String(command.resultSummary ?? "").includes("restarted before");
      return terminal && !interrupted && Boolean(approval.executionResult);
    })()`,
    `persisted execution result for ${needle}`,
    timeoutMs,
  );
}

async function main() {
  let app = await launch();
  const evidence = {
    runLive,
    storage: "",
    statusSample: "",
    agentSyncSample: "",
    dryRunApproved: false,
    liveAgentTurnChecked: false,
    liveUrlResearchChecked: false,
    restartPreserved: false,
    safety: null,
  };

  try {
    const { client } = app;
    await route(client, "/settings", "Capital, risk, storage, and permissions");
    await waitFor(client, "document.body.innerText.includes('Storage: tauri-sqlite')", "tauri-sqlite storage adapter", 30_000);
    evidence.storage = await client.evaluate("document.body.innerText.match(/Storage: [^\\n]+/)?.[0] ?? ''");
    assert(evidence.storage.includes("tauri-sqlite"), `Desktop app did not report tauri-sqlite: ${evidence.storage}`);

    await route(client, "/openclaw-system", "Approved Runtime Actions");
    await click(client, "Refresh");
    await waitFor(client, "document.body.innerText.includes('Gateway') || document.body.innerText.includes('OpenClaw gateway') || document.body.innerText.includes('Task Last Run')", "gateway status", 120_000);
    evidence.statusSample = await client.evaluate("document.body.innerText.slice(0, 1600)");

    await click(client, "Sync Agents");
    await waitFor(
      client,
      `document.body.innerText.includes("TeamLeader1A") &&
       document.body.innerText.includes("MAIN") &&
       document.body.innerText.includes("AgentResearcher") &&
       document.body.innerText.includes("RESEARCHER") &&
       document.body.innerText.includes("openai-codex/gpt-5.5")`,
      "agent role mapping sync",
      120_000,
    );
    evidence.agentSyncSample = await client.evaluate("document.body.innerText.slice(0, 2200)");

    const messageText = `Phase 5B dry-run acceptance ${stamp}`;
    await setInputByPlaceholder(client, "Explicit channel target", "channel:1501109046726365254");
    await setInputByPlaceholder(client, "Message text", messageText);
    await click(client, "Request Dry-Run Send Approval");

    const purpose = `Phase 5B approved URL research ${stamp}`;
    await setInputByPlaceholder(client, "Research purpose", purpose);
    await setInputByPlaceholder(client, "Approved URLs, comma separated", "https://example.com");
    await setInputByPlaceholder(client, "Extraction goal", "Summarize page purpose, obvious demand signals, safety constraints, and whether deeper research is worth requesting.");
    await click(client, "Request URL Research Approval");

    if (runLive) {
      await route(client, "/", "TeamLeader1A Channel");
      await setInputByPlaceholder(client, "Ask TeamLeader1A for a live local turn...", `Phase 5B live acceptance ${stamp}: briefly confirm what Mission Control should verify next. Do not deliver messages, browse, publish, or spend.`);
      await click(client, "Request approval");
    }

    await route(client, "/approvals", "Approval gates for risky actions");
    await waitFor(client, "document.body.innerText.includes('Dry-run approved channel message') && document.body.innerText.includes('Run approved URL research')", "created approvals");
    await approveRequestContaining(client, messageText, 120_000);
    await waitForPersistedApproval(client, messageText, "approved", 60_000);
    await waitForPersistedExecution(client, messageText, 120_000);
    evidence.dryRunApproved = true;

    if (runLive) {
      await approveRequestContaining(client, purpose, 420_000);
      await waitForPersistedExecution(client, purpose, 420_000);
      evidence.liveUrlResearchChecked = true;
      await approveRequestContaining(client, `Phase 5B live acceptance ${stamp}`, 420_000);
      await waitForPersistedExecution(client, `Phase 5B live acceptance ${stamp}`, 420_000);
      evidence.liveAgentTurnChecked = true;
    }

    await route(client, "/openclaw-system", "OpenClaw Command Queue");
    await waitFor(
      client,
      `[...document.querySelectorAll("div")].some((item) => {
        const text = item.innerText ?? "";
        return text.includes("--dry-run") && (text.toLowerCase().includes("complete") || text.toLowerCase().includes("failed"));
      })`,
      "dry-run command completion state",
      runLive ? 420_000 : 120_000,
    );
    evidence.safety = await client.evaluate(`
      (() => {
        const commandText = [...document.querySelectorAll("code")].map((item) => item.innerText).join("\\n").toLowerCase();
        const body = document.body.innerText.toLowerCase();
        return {
          hasDryRun: body.includes("--dry-run") || commandText.includes("--dry-run"),
          hasNoDeliver: !commandText.includes("--deliver"),
          hasNoBroadcast: !commandText.includes("broadcast"),
          hasNoPurchase: !commandText.includes("purchase") && !commandText.includes("payment"),
          hasNoPublish: !commandText.includes("publish externally"),
          sample: document.body.innerText.slice(0, 2600)
        };
      })()
    `);
    assert(evidence.safety.hasDryRun, "Dry-run command was not visible");
    assert(evidence.safety.hasNoDeliver, "Command queue contained --deliver");
    assert(evidence.safety.hasNoBroadcast, "Command queue contained broadcast");
    assert(evidence.safety.hasNoPurchase, "Command queue contained purchase/payment");
    assert(evidence.safety.hasNoPublish, "Command queue contained publish externally");
    await delay(5000);

    await closeApp(app);
    app = await launch();
    await route(app.client, "/settings", "Capital, risk, storage, and permissions");
    await waitFor(app.client, "document.body.innerText.includes('Storage: tauri-sqlite')", "tauri-sqlite storage adapter after restart", 30_000);
    const storageAfterRestart = await app.client.evaluate("document.body.innerText.match(/Storage: [^\\n]+/)?.[0] ?? ''");
    assert(storageAfterRestart.includes("tauri-sqlite"), `Restart did not preserve tauri-sqlite adapter: ${storageAfterRestart}`);
    await route(app.client, "/approvals", "Approval gates for risky actions");
    await waitFor(
      app.client,
      `document.body.innerText.includes(${JSON.stringify(messageText)}) && document.body.innerText.toLowerCase().includes("approved")`,
      "persisted approval decision",
      30_000,
    );
    evidence.restartPreserved = await app.client.evaluate(`
      document.body.innerText.includes(${JSON.stringify(messageText)}) &&
      document.body.innerText.toLowerCase().includes("approved")
    `);
    assert(evidence.restartPreserved, "Approval decision did not survive restart");

    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await closeApp(app);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
