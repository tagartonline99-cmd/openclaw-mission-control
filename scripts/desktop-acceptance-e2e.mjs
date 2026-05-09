import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const exePath =
  "C:\\Users\\User\\AppData\\Local\\OpenClaw Mission Control\\openclaw-mission-control.exe";
const vaultPath = "C:\\Users\\User\\.openclaw\\mission-control-test-vault";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function waitForTarget(port) {
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

  throw new Error(`Timed out waiting for WebView2 debug target on ${port}: ${lastError?.message ?? "no target"}`);
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

async function clickButton(client, text, index = 0) {
  const clicked = await client.evaluate(`
    (() => {
      const buttons = [...document.querySelectorAll("button")]
        .filter((item) => item.innerText.includes(${JSON.stringify(text)}) && !item.disabled);
      const button = buttons[${index}];
      if (!button) return false;
      button.click();
      return true;
    })()
  `);
  assert(clicked, `Could not click enabled button containing "${text}" at index ${index}`);
}

async function setInput(client, index, value) {
  await client.evaluate(`
    (() => {
      const input = [...document.querySelectorAll("input")][${index}];
      if (!input) return null;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.blur();
      return input.value;
    })()
  `);
  await waitFor(
    client,
    `[...document.querySelectorAll("input")][${index}]?.value === ${JSON.stringify(String(value))}`,
    `input ${index} durable value ${value}`,
    15_000,
  );
}

async function setSelect(client, index, value) {
  await client.evaluate(`
    (() => {
      const select = [...document.querySelectorAll("select")][${index}];
      if (!select) return null;
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(select, ${JSON.stringify(value)});
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.blur();
      return select.value;
    })()
  `);
  await waitFor(
    client,
    `[...document.querySelectorAll("select")][${index}]?.value === ${JSON.stringify(value)}`,
    `select ${index} durable value ${value}`,
    15_000,
  );
}

async function launch(port) {
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
  const target = await waitForTarget(port);
  const client = await connectCdp(target.webSocketDebuggerUrl);
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await waitFor(client, "document.body && document.body.innerText.length > 0", "initial app render", 30_000);
  return { child, client };
}

async function stop(session) {
  session.client?.close();
  if (session.child && !session.child.killed) session.child.kill();
  await delay(1500);
}

async function firstRun(evidence) {
  const session = await launch(9230);
  try {
    const { client } = session;
    evidence.firstPid = session.child.pid;

    await route(client, "/", "Dungeon-grade AI business operations");
    await waitFor(client, "document.body.innerText.includes('Local persistence adapter: tauri-sqlite')", "SQLite dashboard adapter", 30_000);
    evidence.dashboardSeeded = await client.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          hasAgents: text.includes("TeamLeader1A") && text.includes("AgentResearcher"),
          hasQuest: text.includes("Affiliate content site for budget home office gear"),
          hasSafety: text.includes("Simulated queues only run while this app is open and never execute external actions."),
          sample: text.slice(0, 1600)
        };
      })()
    `);
    assert(evidence.dashboardSeeded.hasAgents, "Seeded agents were not visible on dashboard");
    assert(evidence.dashboardSeeded.hasQuest, "Seeded quest was not visible on dashboard");
    assert(evidence.dashboardSeeded.hasSafety, "Local-only simulation safety copy was not visible");

    await route(client, "/settings", "Capital, risk, storage, and permissions");
    await waitFor(client, "document.body.innerText.includes('Storage: tauri-sqlite')", "SQLite settings adapter", 30_000);
    await setInput(client, 0, "4321");
    await setSelect(client, 0, "high");
    await setInput(client, 1, vaultPath);
    evidence.changedSettings = await client.evaluate(`
      (() => ({
        inputs: [...document.querySelectorAll("input")].map((input) => input.value),
        selects: [...document.querySelectorAll("select")].map((select) => select.value),
        storage: document.body.innerText.match(/Storage: [^\\n]+/)?.[0] ?? ""
      }))()
    `);
    assert(evidence.changedSettings.inputs.includes("4321"), "Starting capital did not update in settings");
    assert(evidence.changedSettings.selects.includes("high"), "Risk tolerance did not update in settings");
    assert(evidence.changedSettings.inputs.includes(vaultPath), "Vault path did not update in settings");

    await route(client, "/approvals", "Approval gates for risky actions");
    await clickButton(client, "Approve locally", 0);
    await delay(1200);
    await clickButton(client, "Reject locally", 1);
    await delay(1200);
    evidence.approvals = await client.evaluate(`
      (() => {
        const text = document.body.innerText;
        const lower = text.toLowerCase();
        return {
          approved: (lower.match(/approved/g) ?? []).length,
          rejected: (lower.match(/rejected/g) ?? []).length,
          hasGuardrail: text.includes("No money, publishing, launching, scaling, external automation")
        };
      })()
    `);
    assert(evidence.approvals.approved > 0, "Approved local decision was not visible");
    assert(evidence.approvals.rejected > 0, "Rejected local decision was not visible");

    await route(client, "/", "Dungeon-grade AI business operations");
    await clickButton(client, "Run simulated check");
    await delay(1200);
    await clickButton(client, "Start local queue");
    await waitFor(client, "document.body.innerText.includes('Pause local queue')", "queue start");
    await delay(62_000);
    await clickButton(client, "Pause local queue");
    await waitFor(client, "document.body.innerText.includes('Start local queue')", "queue pause");

    await route(client, "/activity-log", "Activity Log");
    evidence.activityAfterSimulation = await waitFor(
      client,
      "((document.body.innerText.match(/Simulated research check completed/g) || []).length >= 2) && document.body.innerText.includes('Approval approved') && document.body.innerText.includes('Approval rejected')",
      "simulation and approval logs",
      20_000,
    );

    await route(client, "/second-brain", "Obsidian-ready mission memory");
    evidence.secondBrainTextSample = await client.evaluate("document.body.innerText.slice(0, 2200)");
    assert(evidence.secondBrainTextSample.toLowerCase().includes("local export"), "Local export badge was not visible");
    await clickButton(client, "Export to Obsidian");
    await waitFor(
      client,
      "document.body.innerText.includes('Exported ') || document.body.innerText.includes('Tauri export failed')",
      "export result",
      20_000,
    );
    evidence.exportMessage = await client.evaluate(`
      (() => document.body.innerText.split("\\n").find((line) => line.includes("Exported ") || line.includes("Tauri export failed")) ?? "")()
    `);
    assert(evidence.exportMessage.includes("Exported "), evidence.exportMessage || "Export did not report success");
    evidence.openLocationEnabled = await client.evaluate(`
      (() => {
        const button = [...document.querySelectorAll("button")].find((item) => item.innerText.includes("Open location"));
        return Boolean(button && !button.disabled);
      })()
    `);
    assert(evidence.openLocationEnabled, "Open location was not enabled after export");
    await clickButton(client, "Open location");
    evidence.revealClicked = true;

    await route(client, "/activity-log", "Activity Log");
    evidence.persistedBeforeShutdown = await waitFor(
      client,
      "((document.body.innerText.match(/Simulated research check completed/g) || []).length >= 2) && document.body.innerText.includes('Markdown export completed')",
      "simulation and export logs before shutdown",
      20_000,
    );
  } finally {
    await stop(session);
  }
}

async function restartRun(evidence) {
  const session = await launch(9231);
  try {
    const { client } = session;
    evidence.restartPid = session.child.pid;

    await route(client, "/settings", "Capital, risk, storage, and permissions");
    await waitFor(client, "document.body.innerText.includes('Storage: tauri-sqlite')", "SQLite settings adapter after restart", 30_000);
    evidence.restartSettings = await client.evaluate(`
      (() => ({
        storageText: document.body.innerText.match(/Storage: [^\\n]+/)?.[0] ?? "",
        inputs: [...document.querySelectorAll("input")].map((input) => input.value),
        selects: [...document.querySelectorAll("select")].map((select) => select.value)
      }))()
    `);
    assert(evidence.restartSettings.inputs.includes("4321"), "Starting capital did not persist after restart");
    assert(evidence.restartSettings.selects.includes("high"), "Risk tolerance did not persist after restart");
    assert(evidence.restartSettings.inputs.includes(vaultPath), "Vault path did not persist after restart");

    await route(client, "/activity-log", "Activity Log");
    evidence.restartLogs = await client.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          simulations: (text.match(/Simulated research check completed/g) ?? []).length,
          hasApprovalApproved: text.includes("Approval approved"),
          hasApprovalRejected: text.includes("Approval rejected"),
          hasMarkdownExport: text.includes("Markdown export completed"),
          sample: text.slice(0, 2000)
        };
      })()
    `);
    assert(evidence.restartLogs.simulations >= 2, "Simulation logs did not persist after restart");
    assert(evidence.restartLogs.hasApprovalApproved, "Approved decision log did not persist after restart");
    assert(evidence.restartLogs.hasApprovalRejected, "Rejected decision log did not persist after restart");
    assert(evidence.restartLogs.hasMarkdownExport, "Obsidian export log did not persist after restart");

    await route(client, "/openclaw-system", "OpenClaw integration architecture");
    evidence.openClawSystem = await client.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          mocked: text.includes("MOCKED") || text.includes("mock"),
          deferred: text.includes("Real runtime connection is deferred"),
          noLiveCommandCopy: text.includes("Real OpenClaw runtime commands are disabled")
        };
      })()
    `);
    assert(evidence.openClawSystem.mocked, "OpenClaw System page did not show mocked state");
    assert(evidence.openClawSystem.deferred, "OpenClaw System page did not show deferred integration copy");
  } finally {
    await stop(session);
  }
}

const evidence = {
  vaultPath,
  dashboardSeeded: null,
  changedSettings: null,
  approvals: null,
  activityAfterSimulation: null,
  secondBrainTextSample: null,
  exportMessage: null,
  openLocationEnabled: null,
  revealClicked: false,
  persistedBeforeShutdown: null,
  restartSettings: null,
  restartLogs: null,
  openClawSystem: null,
};

try {
  await firstRun(evidence);
  await restartRun(evidence);
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  console.error(JSON.stringify(evidence, null, 2));
  console.error(error);
  process.exitCode = 1;
}
