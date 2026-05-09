import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const exePath =
  "C:\\Users\\User\\AppData\\Local\\OpenClaw Mission Control\\openclaw-mission-control.exe";
const port = 9235;

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
  while (Date.now() < deadline) {
    try {
      const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
      const target = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl) ?? targets[0];
      if (target?.webSocketDebuggerUrl) return target;
    } catch {
      // keep waiting for WebView2
    }
    await delay(500);
  }
  throw new Error("Timed out waiting for WebView2 debug target");
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
            returnByValue: true,
            awaitPromise: true,
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
  const errors = await client.evaluate("JSON.stringify(window.__phase5Errors || [])").catch(() => "[]");
  throw new Error(`Timed out waiting for ${label}. Errors: ${errors}. Body: ${body}`);
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

async function clickApprovalButtonForTitle(client, title, buttonText) {
  const clicked = await client.evaluate(`
    (() => {
      const cards = [...document.querySelectorAll("div")]
        .filter((item) =>
          item.innerText?.includes(${JSON.stringify(title)}) &&
          item.innerText?.includes("PENDING") &&
          item.innerText?.includes(${JSON.stringify(buttonText)})
        );
      const card = cards.sort((a, b) => a.innerText.length - b.innerText.length)[0];
      const button = card ? [...card.querySelectorAll("button")].find((item) => item.innerText.includes(${JSON.stringify(buttonText)}) && !item.disabled) : null;
      if (!button) return false;
      button.click();
      return true;
    })()
  `);
  assert(clicked, `Could not click ${buttonText} for ${title}`);
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

const child = spawn(exePath, {
  cwd: dirname(exePath),
  env: {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-allow-origins=*`,
  },
  windowsHide: false,
  stdio: "ignore",
});

const evidence = {};
let client;
try {
  const target = await waitForTarget();
  client = await connectCdp(target.webSocketDebuggerUrl);
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await waitFor(client, "document.body && document.body.innerText.length > 0", "initial render");
  await client.evaluate(`
    (() => {
      window.__phase5Errors = [];
      window.addEventListener("error", (event) => window.__phase5Errors.push(String(event.error || event.message)));
      window.addEventListener("unhandledrejection", (event) => window.__phase5Errors.push(String(event.reason)));
    })()
  `);

  await client.evaluate("location.hash = '/openclaw-system'");
  await waitFor(client, "document.body.innerText.includes('Approved Runtime Actions')", "Phase 5 runtime actions");
  evidence.initial = await client.evaluate("document.body.innerText.slice(0, 1800)");

  await click(client, "Refresh");
  await waitFor(client, "document.body.innerText.includes('Task Last Run') || document.body.innerText.includes('ECONNREFUSED') || document.body.innerText.includes('gateway is reachable')", "status refresh", 120_000);

  await click(client, "Sync Agents");
  await waitFor(client, "document.body.innerText.includes('main') || document.body.innerText.includes('openai-codex')", "agent sync", 60_000);

  await click(client, "Request URL Research Approval");
  await delay(1200);
  await setInputByPlaceholder(client, "Explicit channel target", "channel:1501109046726365254");
  await setInputByPlaceholder(client, "Message text", "Phase 5 dry-run smoke test from Mission Control.");
  await delay(500);
  await click(client, "Request Dry-Run Send Approval");
  await delay(1500);
  evidence.errorsAfterApprovalClicks = await client.evaluate("JSON.stringify(window.__phase5Errors || [])");

  await client.evaluate("location.hash = '/approvals'");
  await waitFor(
    client,
    "document.body.innerText.includes('Run approved URL research') && document.body.innerText.includes('Dry-run approved channel message') && document.body.innerText.includes('PENDING')",
    "created approvals",
  );
  await clickApprovalButtonForTitle(client, "Dry-run approved channel message", "Approve and execute");
  await waitFor(
    client,
    "document.body.innerText.includes('APPROVED') || document.body.innerText.includes('Execution result: completed') || document.body.innerText.includes('Execution result: failed')",
    "dry-run execution result",
    90_000,
  );

  await client.evaluate("location.hash = '/openclaw-system'");
  await waitFor(client, "document.body.innerText.includes('OpenClaw Command Queue')", "command queue");
  evidence.final = await client.evaluate(`
    (() => {
      const text = document.body.innerText;
      const commandText = [...document.querySelectorAll("code")].map((item) => item.innerText).join("\\n");
      return {
        hasNoDeliver: !commandText.includes("--deliver"),
        hasDryRun: text.includes("--dry-run"),
        hasProfiles: text.includes("main") || text.includes("researcher"),
        sample: text.slice(0, 2600)
      };
    })()
  `);
  assert(evidence.final.hasNoDeliver, "Command queue unexpectedly contained --deliver");
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  client?.close();
  child.kill();
  await delay(1000);
}
