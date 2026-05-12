import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";

const exePath =
  process.env.OPENCLAW_MC_EXE ??
  "C:\\Users\\User\\AppData\\Local\\OpenClaw Mission Control\\openclaw-mission-control.exe";
const port = Number(process.env.OPENCLAW_MC_DEBUG_PORT ?? 9255);
const expectedVersion = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const sqlitePath = process.env.OPENCLAW_MC_DB ?? "C:\\Users\\User\\AppData\\Roaming\\com.openclaw.missioncontrol\\openclaw-mission-control.db";
const productsRoot = process.env.OPENCLAW_MC_PRODUCTS_ROOT ?? "C:\\Users\\User\\.openclaw\\mission-control-products";

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
            const timer = setTimeout(() => {
              pending.delete(messageId);
              rejectSend(new Error(`${method}: timed out waiting for CDP response`));
            }, 120_000);
            pending.set(messageId, { resolve: resolveSend, reject: rejectSend, method, timer });
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
      clearTimeout(item.timer);
      if (message.error) item.reject(new Error(`${item.method}: ${message.error.message}`));
      else item.resolve(message.result);
    });
    ws.addEventListener("error", () => reject(new Error("WebSocket connection failed")));
  });
}

async function waitFor(client, expression, label, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await client.evaluate(expression);
    if (value) return value;
    await delay(300);
  }
  const body = await client.evaluate("document.body.innerText.slice(0, 3000)").catch(() => "");
  const errors = await client.evaluate("JSON.stringify(window.__acceptanceErrors || [])").catch(() => "[]");
  throw new Error(`Timed out waiting for ${label}. Errors: ${errors}. Body: ${body}`);
}

function readProductProof(beforeCount) {
  try {
    const db = new DatabaseSync(sqlitePath, { readOnly: true });
    try {
      const allRuns = db.prepare("SELECT id FROM product_production_runs").all();
      if (allRuns.length <= beforeCount) return false;
      const latestRow = db.prepare("SELECT payload FROM product_production_runs ORDER BY updated_at DESC LIMIT 1").get();
      if (!latestRow?.payload) return false;
      const latest = JSON.parse(latestRow.payload);
      if (latest.status === "blocked") {
        return { status: latest.status, written: 0, rootPath: "", error: latest.buildError || latest.summary || "Product build blocked." };
      }
      if (latest.status !== "complete") return false;
      const fileRows = db.prepare("SELECT payload FROM product_file_records").all();
      const parsedFiles = fileRows.map((row) => JSON.parse(row.payload)).filter((file) => file.runId === latest.id);
      const written = parsedFiles.filter((file) => file.status === "written").length;
      const manifestRow = db.prepare("SELECT payload FROM product_file_manifests WHERE id = ?").get(latest.fileManifestId);
      const manifest = manifestRow?.payload ? JSON.parse(manifestRow.payload) : null;
      return written >= 7 ? { status: latest.status, written, rootPath: manifest?.rootPath ?? "", error: "" } : false;
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

async function waitForProductProof(beforeCount, timeoutMs = 900_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const proof = readProductProof(beforeCount);
    if (proof) return proof;
    await delay(2_000);
  }
  return readProductProof(beforeCount) || { status: "timeout", written: 0, rootPath: "", error: "Timed out waiting for Product Factory." };
}

function listProductFiles(root = productsRoot) {
  const files = [];
  if (!existsSync(root)) return files;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = `${root}\\${entry.name}`;
    if (entry.isDirectory()) files.push(...listProductFiles(fullPath));
    else if (entry.isFile()) files.push({ path: fullPath, mtimeMs: statSync(fullPath).mtimeMs, size: statSync(fullPath).size });
  }
  return files;
}

async function waitForWrittenProductFiles(startedAtMs, timeoutMs = 1_200_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const files = listProductFiles().filter((file) => file.mtimeMs >= startedAtMs - 2_000 && file.size > 0);
    if (files.length >= 7) {
      const newest = files.sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
      return { status: "complete", written: files.length, rootPath: dirname(newest.path), error: "" };
    }
    await delay(2_000);
  }
  return { status: "timeout", written: 0, rootPath: "", error: "Timed out waiting for real product files on disk." };
}

function readReadyProposalProof(beforeCount, stamp = "") {
  try {
    const db = new DatabaseSync(sqlitePath, { readOnly: true });
    try {
      const huntRows = stamp
        ? db.prepare("SELECT payload FROM opportunity_hunts WHERE payload LIKE ?").all(`%${stamp}%`)
        : [];
      const stampedHuntIds = new Set(huntRows.map((row) => JSON.parse(row.payload).id));
      const rows = db.prepare("SELECT payload FROM business_proposals").all();
      const proposals = rows
        .map((row) => JSON.parse(row.payload))
        .filter((proposal) => proposal.status === "ready_for_review")
        .filter((proposal) => stampedHuntIds.size === 0 || stampedHuntIds.has(proposal.huntId))
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      if (!proposals.length) return false;
      return {
        id: proposals[0].id,
        status: proposals[0].status,
        gate: proposals[0].proposalGateStatus,
        isNew: rows.length > beforeCount,
      };
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}

async function waitForReadyProposal(beforeCount, timeoutMs = 180_000, stamp = "") {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const proof = readReadyProposalProof(beforeCount, stamp);
    if (proof?.isNew) return proof;
    await delay(2_000);
  }
  return readReadyProposalProof(beforeCount, stamp);
}

async function route(client, hash, text) {
  console.log(`route ${hash}`);
  await client.evaluate(`location.hash = ${JSON.stringify(hash)}`);
  await waitFor(client, `document.body.innerText.includes(${JSON.stringify(text)})`, text);
}

async function click(client, text, index = 0) {
  const box = await client.evaluate(`
    (() => {
      const buttons = [...document.querySelectorAll("button")]
        .filter((button) => {
          const style = window.getComputedStyle(button);
          return button.innerText.includes(${JSON.stringify(text)}) &&
            !button.disabled &&
            button.getClientRects().length > 0 &&
            style.visibility !== "hidden" &&
            style.display !== "none";
        });
      const button = buttons[${index}];
      if (!button) return false;
      button.scrollIntoView({ block: "center" });
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, label: button.innerText };
    })()
  `);
  assert(box, `Could not click ${text}`);
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y, button: "none" });
  await client.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
  await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
}

async function domClick(client, text, index = 0) {
  const ok = await client.evaluate(`
    (() => {
      const buttons = [...document.querySelectorAll("button")]
        .filter((button) => button.innerText.includes(${JSON.stringify(text)}) && !button.disabled && button.getClientRects().length > 0);
      const button = buttons[${index}];
      if (!button) return false;
      button.scrollIntoView({ block: "center" });
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
      button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
      button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 }));
      button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
      button.click();
      return true;
    })()
  `);
  assert(ok, `Could not activate ${text}`);
}

async function setFirstSelect(client, value) {
  const ok = await client.evaluate(`
    (() => {
      const select = document.querySelector("select");
      if (!select) return false;
      select.value = ${JSON.stringify(value)};
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return select.value === ${JSON.stringify(value)};
    })()
  `);
  assert(ok, `Could not set first select to ${value}`);
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
  assert(box, "Missing TeamLeader textarea");
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
  await waitFor(client, `document.querySelector("textarea")?.value === ${JSON.stringify(value)}`, "typed TeamLeader command");
}

async function launch() {
  console.log(`launch ${exePath}`);
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
  const command = `Acceptance test ${stamp}: find me the best online business idea with zero budget`;
  const app = await launch();
  const evidence = {
    storage: "",
    appVersion: "",
    commandScreenClean: false,
    opportunityHuntRows: 0,
    browserArtifactRows: 0,
    productRunStatus: "",
    productFileRows: 0,
    productRootPath: "",
    brokerVisible: false,
    noApprovalSpam: false,
  };

  try {
    const { client } = app;

    console.log("check settings/storage");
    await route(client, "/settings", "Capital, risk, storage, and permissions");
    await waitFor(client, "document.body.innerText.includes('Storage: tauri-sqlite')", "tauri-sqlite storage adapter");
    evidence.storage = await client.evaluate("document.body.innerText.match(/Storage: [^\\n]+/)?.[0] ?? ''");

    console.log("run TeamLeader command");
    await route(client, "/", "Tell TeamLeader1A what to build");
    await waitFor(client, "document.querySelectorAll('select').length === 1 && document.body.innerText.includes('Optional quest attachment')", "clean command screen");
    evidence.commandScreenClean = true;
    const beforeProposalRows = await client.evaluate(`(async () => {
      const invoke = window.__TAURI_INTERNALS__?.invoke;
      if (!invoke) return 0;
      const db = await invoke("plugin:sql|load", { db: "sqlite:openclaw-mission-control.db" });
      const rows = await invoke("plugin:sql|select", { db, query: "SELECT id FROM business_proposals", values: [] });
      return rows.length;
    })()`);
    await setFirstSelect(client, "quick");
    await setTextArea(client, command);
    await click(client, "Send to TeamLeader1A");
    await waitFor(
      client,
      `document.body.innerText.includes(${JSON.stringify(stamp)}) && document.body.innerText.includes('I started a quick Tavily-backed opportunity hunt')`,
      "quick opportunity hunt start",
      60_000,
    );
    const proposalProof = await waitForReadyProposal(Number(beforeProposalRows), 180_000, stamp);
    assert(proposalProof.status === "ready_for_review", `Expected an approval-ready proposal, got ${JSON.stringify(proposalProof)}`);

    console.log("check tasks");
    await route(client, "/tasks", "Every agent task in one place");
    await waitFor(client, "document.body.innerText.includes('Research zero-budget demand')", "agent task board populated");

    console.log("check guild office");
    await route(client, "/guild-office", "Watch the agents work");
    await waitFor(client, "document.body.innerText.includes('Research Library') && document.body.innerText.includes('What is happening now')", "guild office active");

    console.log("check mission brief");
    await route(client, `/mission-briefs?proposal=${proposalProof.id}`, "Business Proposal Review");
    await waitFor(
      client,
      "(() => { const text = document.body.innerText.toLowerCase(); return text.includes('proposal draft status') && text.includes('factcheck station') && text.includes('tavily api research') && text.includes('top 3 + winner') && text.includes('safe browser evidence') && text.includes('safe-browser-public-read'); })()",
      "mission brief browser evidence",
    );

    console.log("approve proposal and wait for real product factory");
    await waitFor(
      client,
      "[...document.querySelectorAll('button')].some((button) => button.innerText.includes('Approve Business') && !button.disabled)",
      "enabled Approve Business button",
      60_000,
    );
    const productStartMs = Date.now();
    await domClick(client, "Approve Business");
    const productProof = await waitForWrittenProductFiles(productStartMs, 1_200_000);
    assert(productProof.status === "complete", `Product Factory did not complete: ${JSON.stringify(productProof)}`);
    assert(productProof.written >= 7, `Expected written product files, got ${JSON.stringify(productProof)}`);
    evidence.productRunStatus = productProof.status;
    evidence.productFileRows = productProof.written;
    evidence.productRootPath = productProof.rootPath;
    await client.evaluate("window.__acceptanceErrors = []");

    console.log("check Product Studio real output");
    await route(client, "/production", "Product Studio");
    await waitFor(
      client,
      "(() => { const text = document.body.innerText.toLowerCase(); return text.includes('product build status') && text.includes('real openclaw build complete') && text.includes('exact product preview') && text.includes('real local files written') && text.includes('product qa gate') && text.includes('product files passed qa checks') && text.includes('mission-control-products'); })()",
      "real Product Studio output",
      120_000,
    );
    await domClick(client, "Approve Local Draft");
    await waitFor(
      client,
      "document.body.innerText.includes('Local Draft Approved')",
      "local draft approval recorded",
      60_000,
    );
    await domClick(client, "Prepare Publish Approval");
    await route(client, "/approvals", "Approval gates for risky actions");
    const beforePublishPacketRows = await client.evaluate(`(async () => {
      const invoke = window.__TAURI_INTERNALS__?.invoke;
      if (!invoke) return 0;
      const db = await invoke("plugin:sql|load", { db: "sqlite:openclaw-mission-control.db" });
      const rows = await invoke("plugin:sql|select", {
        db,
        query: "SELECT id FROM product_file_records WHERE payload LIKE ?",
        values: ["%approved-publish-packet.md%"],
      });
      return rows.length;
    })()`);
    await waitFor(
      client,
      "(() => { const text = document.body.innerText.toLowerCase(); return text.includes('publish approval') && text.includes('publish externally') && text.includes('approve locally'); })()",
      "publish approval appears",
      60_000,
    );
    await domClick(client, "Approve locally");
    await waitFor(
      client,
      `(async () => {
        const invoke = window.__TAURI_INTERNALS__?.invoke;
        if (!invoke) return false;
        const db = await invoke("plugin:sql|load", { db: "sqlite:openclaw-mission-control.db" });
        const rows = await invoke("plugin:sql|select", {
          db,
          query: "SELECT id FROM product_file_records WHERE payload LIKE ?",
          values: ["%approved-publish-packet.md%"],
        });
        return rows.length > ${Number(beforePublishPacketRows)};
      })()`,
      "approved publish packet execution receipt",
      60_000,
    );
    await route(client, "/production", "Product Studio");
    await waitFor(
      client,
      "(() => { const text = document.body.innerText.toLowerCase(); return text.includes('approved-publish-packet.md') && text.includes('approved-publish-payload.json'); })()",
      "approved publish packet files visible",
      60_000,
    );

    console.log("check sqlite rows");
    const dbProof = await waitFor(
      client,
      `(async () => {
        const invoke = window.__TAURI_INTERNALS__?.invoke;
        if (!invoke) return false;
        const db = await invoke("plugin:sql|load", { db: "sqlite:openclaw-mission-control.db" });
        const hunts = await invoke("plugin:sql|select", {
          db,
          query: "SELECT payload FROM opportunity_hunts WHERE payload LIKE ?",
          values: [${JSON.stringify(`%${stamp}%`)}],
        });
        const artifacts = await invoke("plugin:sql|select", {
          db,
          query: "SELECT payload FROM browser_research_artifacts WHERE payload LIKE ?",
          values: ["%safe%"],
        });
        const tavily = await invoke("plugin:sql|select", {
          db,
          query: "SELECT payload FROM tavily_search_runs",
          values: [],
        });
        const factchecks = await invoke("plugin:sql|select", {
          db,
          query: "SELECT payload FROM fact_check_runs",
          values: [],
        });
        const proof = { hunts: hunts.length, artifacts: artifacts.length, tavily: tavily.length, factchecks: factchecks.length };
        return proof.hunts > 0 && proof.artifacts > 0 && proof.factchecks > 0 ? proof : false;
      })()`,
      "SQLite opportunity, Tavily, FactCheck, and browser evidence rows",
      120_000,
    );
    evidence.opportunityHuntRows = dbProof.hunts;
    evidence.browserArtifactRows = dbProof.artifacts;
    assert(evidence.opportunityHuntRows > 0, "Opportunity hunt did not persist to SQLite");
    assert(evidence.browserArtifactRows > 0, "Browser research artifacts did not persist to SQLite");

    console.log("check browser broker system panel");
    await route(client, "/openclaw-system", "OpenClaw System Health");
    await waitFor(
      client,
      "document.body.innerText.includes('Tavily Research + FactCheck Station') && document.body.innerText.includes('Browser Research Broker') && document.body.innerText.includes('Puppeteer MCP Compatibility') && document.body.innerText.includes('direct agent control')",
      "browser broker system status",
    );
    await waitFor(
      client,
      "['TeamLeader1A','AgentResearcher','AgentSeo','AgentWriter','AgentContent','AgentProduction','AgentPublish','AgentAction'].every((name) => document.body.innerText.includes(name))",
      "complete runtime role map",
    );
    evidence.brokerVisible = true;
    await click(client, "Test browser read with example.com");
    await waitFor(client, "document.body.innerText.includes('Last artifact:') && document.body.innerText.includes('example.com')", "browser broker diagnostic artifact", 120_000);

    console.log("check approval spam");
    await route(client, "/approvals", "Approval gates for risky actions");
    evidence.noApprovalSpam = await client.evaluate(`
      !document.body.innerText.includes(${JSON.stringify(command)}) &&
      !document.body.innerText.includes('Run approved URL research')
    `);
    assert(evidence.noApprovalSpam, "Safe opportunity hunt created approval spam");

    console.log("check updater marker/version");
    await route(client, "/settings", "Auto Updates");
    await waitFor(client, "document.body.innerText.toLowerCase().includes('approved publish packet release')", `${expectedVersion} updater marker`);
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
