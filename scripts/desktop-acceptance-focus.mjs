import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const exePath =
  "C:\\Users\\User\\AppData\\Local\\OpenClaw Mission Control\\openclaw-mission-control.exe";
const port = 9225;
const vaultPath = "C:\\Users\\User\\.openclaw\\mission-control-test-vault";

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
        async evaluate(expression, awaitPromise = false) {
          const response = await client.send("Runtime.evaluate", {
            expression,
            awaitPromise,
            returnByValue: true,
            userGesture: true,
          });
          if (response.exceptionDetails) {
            throw new Error(response.exceptionDetails.text ?? "Runtime.evaluate failed");
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
      if (message.error) {
        item.reject(new Error(`${item.method}: ${message.error.message}`));
      } else {
        item.resolve(message.result);
      }
    });

    ws.addEventListener("error", () => reject(new Error("WebSocket connection failed")));
  });
}

async function waitFor(client, expression, label, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;

  while (Date.now() < deadline) {
    lastValue = await client.evaluate(expression);
    if (lastValue) return lastValue;
    await delay(250);
  }

  const body = await client.evaluate("document.body?.innerText?.slice(0, 2500) ?? ''").catch(() => "");
  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(lastValue)}. Body: ${body}`);
}

async function route(client, hash, text) {
  await client.evaluate(`location.hash = ${JSON.stringify(hash)}`);
  return waitFor(client, `document.body?.innerText?.includes(${JSON.stringify(text)})`, text);
}

async function clickButton(client, text) {
  const clicked = await client.evaluate(`
    (() => {
      const button = [...document.querySelectorAll("button")]
        .find((item) => item.innerText.includes(${JSON.stringify(text)}) && !item.disabled);
      if (!button) return false;
      button.click();
      return true;
    })()
  `);
  assert(clicked, `Could not click enabled button containing "${text}"`);
}

async function main() {
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

  let client;
  const evidence = {
    launchedPid: child.pid,
    settings: null,
    activity: null,
    secondBrainTextSample: null,
    exportMessage: null,
    openLocationEnabled: null,
    revealClicked: false,
  };

  try {
    const target = await waitForTarget();
    client = await connectCdp(target.webSocketDebuggerUrl);
    await client.send("Runtime.enable");
    await client.send("Page.enable");
    await waitFor(client, "document.body && document.body.innerText.length > 0", "initial app render", 30_000);

    await route(client, "/settings", "Capital, risk, storage, and permissions");
    evidence.settings = await client.evaluate(`
      (() => ({
        storageText: document.body.innerText.match(/Storage: [^\\n]+/)?.[0] ?? "",
        inputs: [...document.querySelectorAll("input")].map((input) => input.value),
        selects: [...document.querySelectorAll("select")].map((select) => select.value),
        body: document.body.innerText.slice(0, 1400)
      }))()
    `);
    assert(
      evidence.settings.storageText.includes("tauri-sqlite"),
      `Settings did not show tauri-sqlite adapter: ${JSON.stringify(evidence.settings)}`,
    );
    assert(
      evidence.settings.inputs.includes("4321"),
      `Persisted starting capital was not visible after restart: ${JSON.stringify(evidence.settings)}`,
    );
    assert(
      evidence.settings.selects.includes("high"),
      `Persisted risk tolerance was not visible after restart: ${JSON.stringify(evidence.settings)}`,
    );
    assert(
      evidence.settings.inputs.includes(vaultPath),
      `Persisted disposable vault path was not visible after restart: ${JSON.stringify(evidence.settings)}`,
    );

    await route(client, "/activity-log", "Activity Log");
    evidence.activity = await client.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          hasApprovalApproved: text.includes("Approval approved"),
          hasApprovalRejected: text.includes("Approval rejected"),
          hasSimulation: text.includes("Simulated research check completed"),
          sample: text.slice(0, 1800)
        };
      })()
    `);
    assert(evidence.activity.hasApprovalApproved, "Approval approved activity log was not visible after restart");
    assert(evidence.activity.hasApprovalRejected, "Approval rejected activity log was not visible after restart");
    assert(evidence.activity.hasSimulation, "Simulation activity log was not visible after restart");

    await route(client, "/second-brain", "Obsidian-ready mission memory");
    evidence.secondBrainTextSample = await client.evaluate("document.body.innerText.slice(0, 2600)");
    assert(evidence.secondBrainTextSample.includes("Obsidian Second Brain"), "Second Brain panel was not visible");
    assert(evidence.secondBrainTextSample.includes("Local export"), "Local export badge was not visible");

    await clickButton(client, "Export to Obsidian");
    await waitFor(
      client,
      `document.body.innerText.includes("Exported ") || document.body.innerText.includes("Tauri export failed")`,
      "export result",
      20_000,
    );
    evidence.exportMessage = await client.evaluate(`
      (() => {
        const lines = document.body.innerText.split("\\n");
        return lines.find((line) => line.includes("Exported ") || line.includes("Tauri export failed")) ?? "";
      })()
    `);
    assert(evidence.exportMessage.includes("Exported "), evidence.exportMessage || "Export did not report success");

    evidence.openLocationEnabled = await client.evaluate(`
      (() => {
        const button = [...document.querySelectorAll("button")].find((item) => item.innerText.includes("Open location"));
        return Boolean(button && !button.disabled);
      })()
    `);
    assert(evidence.openLocationEnabled, "Open location button was not enabled after export");

    await clickButton(client, "Open location");
    evidence.revealClicked = true;

    await delay(1000);
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    client?.close();
    if (!child.killed) {
      child.kill();
    }
    await delay(1500);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
