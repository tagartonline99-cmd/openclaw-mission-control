import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const exePath =
  process.env.OPENCLAW_MC_EXE ??
  "C:\\Users\\User\\AppData\\Local\\OpenClaw Mission Control\\openclaw-mission-control.exe";
const port = Number(process.env.OPENCLAW_MC_DEBUG_PORT ?? 9255);
const expectedVersion = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

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

async function waitFor(client, expression, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await client.evaluate(expression);
    if (value) return value;
    await delay(300);
  }
  const body = await client.evaluate("document.body.innerText.slice(0, 2600)").catch(() => "");
  const errors = await client.evaluate("JSON.stringify(window.__acceptanceErrors || [])").catch(() => "[]");
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

async function waitForEnabledButton(client, text, timeoutMs = 120_000) {
  await waitFor(
    client,
    `
      [...document.querySelectorAll("button")]
        .some((button) => button.innerText.includes(${JSON.stringify(text)}) && !button.disabled)
    `,
    `enabled ${text} button`,
    timeoutMs,
  );
}

async function setTextArea(client, value) {
  const box = await client.evaluate(`
    (() => {
      const input = document.querySelector("textarea");
      if (!input) return null;
      input.scrollIntoView({ block: "center" });
      const rect = input.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()
  `);
  assert(box, "Missing TeamLeader chat textarea");
  await client.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
  await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Control", code: "ControlLeft", windowsVirtualKeyCode: 17, modifiers: 2 });
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Control", code: "ControlLeft", windowsVirtualKeyCode: 17 });
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
  await client.send("Input.insertText", { text: value });
  await client.evaluate(`
    (() => {
      const input = document.querySelector("textarea");
      if (!input) return;
      input._valueTracker?.setValue("");
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: ${JSON.stringify(value)} }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    })()
  `);
  await waitFor(client, `document.querySelector("textarea")?.value === ${JSON.stringify(value)}`, "typed TeamLeader chat value");
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
  await waitFor(client, "document.body && document.body.innerText.length > 0", "initial render");
  await client.evaluate(`
    (() => {
      window.__acceptanceErrors = [];
      window.addEventListener("error", (event) => window.__acceptanceErrors.push(String(event.error || event.message)));
      window.addEventListener("unhandledrejection", (event) => window.__acceptanceErrors.push(String(event.reason)));
    })()
  `);
  return { child, client };
}

async function closeApp(app) {
  app.client?.close();
  if (app.child && !app.child.killed) app.child.kill();
  await delay(1500);
}

async function main() {
  const stamp = new Date().toISOString();
  const app = await launch();
  const evidence = {
    storage: "",
    chatLocalReply: false,
    liveApprovalCreated: false,
    launchControlVisible: false,
    appVersion: "",
    persistedChatRows: 0,
    safetyCopyVisible: false,
  };

  try {
    const { client } = app;

    await route(client, "/settings", "Capital, risk, storage, and permissions");
    await waitFor(client, "document.body.innerText.includes('Storage: tauri-sqlite')", "tauri-sqlite storage adapter");
    evidence.storage = await client.evaluate("document.body.innerText.match(/Storage: [^\\n]+/)?.[0] ?? ''");

    await route(client, "/teamleader-chat", "Talk to TeamLeader1A");
    await waitFor(client, "document.body.innerText.includes('TeamLeader1A Chat')", "TeamLeader1A chat title");
    await setTextArea(client, `Acceptance local chat ${stamp}: what should I verify next?`);
    await waitForEnabledButton(client, "Send local chat");
    await click(client, "Send local chat");
    await waitFor(client, "document.body.innerText.includes('TeamLeader1A local reply')", "local TeamLeader1A reply");
    evidence.chatLocalReply = true;

    await route(client, "/settings", "Capital, risk, storage, and permissions");
    await route(client, "/teamleader-chat", "Talk to TeamLeader1A");
    await setTextArea(client, `Acceptance live approval ${stamp}: summarize next verification. Do not browse, publish, send, spend, launch, or use --deliver.`);
    await waitForEnabledButton(client, "Request live turn approval");
    await click(client, "Request live turn approval");
    await waitFor(client, "document.body.innerText.includes('created a live TeamLeader1A approval request') || document.body.innerText.includes('I blocked that live turn request')", "live approval request response");
    evidence.liveApprovalCreated = await client.evaluate("document.body.innerText.includes('created a live TeamLeader1A approval request')");

    evidence.persistedChatRows = await waitFor(
      client,
      `(async () => {
        const invoke = window.__TAURI_INTERNALS__?.invoke;
        if (!invoke) return false;
        const db = await invoke("plugin:sql|load", { db: "sqlite:openclaw-mission-control.db" });
        const rows = await invoke("plugin:sql|select", {
          db,
          query: "SELECT payload FROM teamleader_chat_messages WHERE payload LIKE ?",
          values: [${JSON.stringify(`%Acceptance local chat ${stamp}%`)}],
        });
        return rows.length;
      })()`,
      "persisted TeamLeader chat rows",
    );
    assert(evidence.persistedChatRows > 0, "TeamLeader chat did not persist to SQLite");

    await route(client, "/approvals", "Approval gates for risky actions");
    await waitFor(client, `document.body.innerText.includes(${JSON.stringify(`Acceptance live approval ${stamp}`)})`, "live turn approval in approval center");

    await route(client, "/launch-control", "Launch, budget, runner, and portfolio control");
    await waitFor(client, "document.body.innerText.includes('Approved Publishing And Outreach') && document.body.innerText.includes('Budget Ledger And Spend Controls') && document.body.innerText.includes('Portfolio Optimization')", "Launch Control panels");
    await waitFor(client, "document.body.innerText.includes('Phase 17 Operating Core') && document.body.innerText.includes('MISSION TASKS') && document.body.innerText.includes('COMMAND/RESULT LEDGER')", "Business OS Launch Control panels");
    evidence.launchControlVisible = true;
    evidence.safetyCopyVisible = await client.evaluate("document.body.innerText.includes('Publishing, live messaging, outreach, and scaling require one approval per action')");

    await route(client, "/settings", "Auto Updates");
    evidence.appVersion = await waitFor(
      client,
      `(async () => {
        const invoke = window.__TAURI_INTERNALS__?.invoke;
        if (!invoke) return "";
        try {
          return await invoke("plugin:app|version");
        } catch {
          return "";
        }
      })()`,
      "Tauri app version",
    );
    assert(evidence.appVersion === expectedVersion, `Installed app version was ${evidence.appVersion}, expected ${expectedVersion}`);

    const errors = await client.evaluate("JSON.stringify(window.__acceptanceErrors || [])");
    assert(errors === "[]", `Browser errors captured: ${errors}`);
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await closeApp(app);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
