import { expect, test } from "@playwright/test";

test("TeamLeader command runs public research, ranks top candidates, creates business, and production map", async ({ page }) => {
  await page.goto("/#/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Tell TeamLeader1A what to build" })).toBeVisible();
  await expect(page.getByText("Reality Meter").first()).toBeVisible();
  await expect(page.getByText("Real Local").first()).toBeVisible();
  await expect(page.getByText("Pending External Approval").first()).toBeVisible();
  await expect(page.getByText("Today / Now Command Center").first()).toBeVisible();
  await expect(page.getByText("TeamLeader1A Chat")).toBeVisible();
  await expect(page.getByText("Research depth")).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(1);
  await expect(page.getByText("Optional quest attachment")).toBeVisible();
  await page.getByRole("button", { name: /Advanced/i }).click();
  await expect(page.getByText("Attach this command to an existing quest")).toBeVisible();
  await page.getByRole("button", { name: /Advanced/i }).click();

  await page
    .getByPlaceholder("Ask TeamLeader1A what to validate, kill, improve, or approve next...")
    .fill("find me the best online business idea with zero budget");
  await page.getByRole("button", { name: /Send to TeamLeader1A/i }).click();
  await expect(page.getByText(/I started a fast Tavily-backed opportunity hunt/i)).toBeVisible();
  await expect(page.getByText(/FactCheck cleared proposal submission|I still created a proposal draft/i)).toBeVisible();
  await expect(page.getByText(/View Work/i).first()).toBeVisible();

  await page.goto("/#/tasks", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Every agent task in one place" })).toBeVisible();
  await expect(page.getByText("Reality Meter").first()).toBeVisible();
  await expect(page.getByText("Today / Now Command Center").first()).toBeVisible();
  await expect(page.getByText("TeamLeader-created only")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Now Working" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Research zero-budget demand/i })).toBeVisible();
  await expect(page.getByText(/https:\/\//i).first()).toBeVisible();

  await page.goto("/#/guild-office", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Watch the agents work" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Research Library/i })).toBeVisible();
  await expect(page.getByText(/research beam|pulse|forge/i).first()).toBeVisible();
  await page.getByRole("button", { name: /Research Library/i }).click();
  await expect(page.getByText("Agent Evidence Trail").first()).toBeVisible();

  await page.goto("/#/mission-briefs", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Reality Meter").first()).toBeVisible();
  await expect(page.getByText("Business Proposal Review")).toBeVisible();
  await expect(page.getByText("Agent Evidence Trail").first()).toBeVisible();
  await expect(page.getByText("Assigned prompt").first()).toBeVisible();
  await expect(page.getByText("Output artifact").first()).toBeVisible();
  await expect(page.getByText("Research Confidence Report").first()).toBeVisible();
  await expect(page.getByText("FactCheck Station").first()).toBeVisible();
  await expect(page.getByText("Proposal Draft Status")).toBeVisible();
  await expect(page.getByText("Here is the proposal draft")).toBeVisible();
  await expect(page.getByText("Full Proposal")).toBeVisible();
  await expect(page.getByText("Who it is for")).toBeVisible();
  await expect(page.getByText("What the product is")).toBeVisible();
  await expect(page.getByText("Where it would publish")).toBeVisible();
  await expect(page.getByText("Draft product fields already prepared")).toBeVisible();
  await expect(page.getByText("Tavily API research").first()).toBeVisible();
  await expect(page.getByText("Query plan preview").first()).toBeVisible();
  await expect(page.getByText("Weak claim detection").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Business Proposal:/i })).toBeVisible();
  await expect(page.getByText("Top 3 + Winner", { exact: true })).toBeVisible();
  await expect(page.getByText("Safe browser evidence")).toBeVisible();
  await expect(page.getByText(/safe-browser-public-read/i).first()).toBeVisible();
  await expect(page.getByText(/Practical AI Workflow Template Kit|Local Service Lead-Gen|Client Operations Notion/i).first()).toBeVisible();
  await expect(page.getByText(/safe-public-research/i)).toBeVisible();
  await expect(page.getByText("Budget plan")).toBeVisible();
  await expect(page.getByText(/within hard cap/i)).toBeVisible();
  await expect(page.getByText("Evidence and links")).toBeVisible();
  await page.getByRole("button", { name: /Approve Business/i }).click();

  await page.goto("/#/businesses", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Business proposals you approved" })).toBeVisible();
  await expect(page.getByText("Reality Meter").first()).toBeVisible();
  await expect(page.getByText("Today / Now Command Center").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Practical AI Workflow|Local Service Lead-Gen|Client Operations Notion/i })).toBeVisible();
  await expect(page.getByText("Business Operating Cockpit v2").first()).toBeVisible();
  await expect(page.getByText("Today's objective").first()).toBeVisible();
  await expect(page.getByText("Current experiment").first()).toBeVisible();
  await expect(page.getByText("Manual metrics entry").first()).toBeVisible();
  await expect(page.getByText("Business cockpit", { exact: true })).toBeVisible();
  await expect(page.getByText("What happened receipts")).toBeVisible();
  await expect(page.getByText("Local production files")).toBeVisible();
  await expect(page.getByRole("button", { name: /Run Safe Loop Now/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Autopilot While Open/i })).toBeVisible();
  await expect(page.getByText("Budget guard")).toBeVisible();
  await expect(page.getByText("External platform requirements")).toBeVisible();
  await expect(page.getByText("Autonomous improvement", { exact: true }).last()).toBeVisible();

  await page.goto("/#/production", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Product Studio" })).toBeVisible();
  await expect(page.getByText("Reality Meter").first()).toBeVisible();
  await expect(page.getByText("Today / Now Command Center").first()).toBeVisible();
  await expect(page.getByText("Product Snapshot").first()).toBeVisible();
  await expect(page.getByText(/See the exact product before any publishing approval/i)).toBeVisible();
  await expect(page.getByText("Product Files", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Rendered Product Preview").first()).toBeVisible();
  await expect(page.getByText(/FIVERR GIG MOCKUP|LANDING PAGE PREVIEW/i).first()).toBeVisible();
  await expect(page.getByText("Claims & Safety Check").first()).toBeVisible();
  await expect(page.getByText("Publishing Preview")).toBeVisible();
  await expect(page.getByText("Product Proof Pack").first()).toBeVisible();
  await expect(page.getByText("Product Receipts").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Prepare Publish Approval/i })).toBeDisabled();
  await page.getByRole("button", { name: /View Product/i }).click();
  await expect(page.getByText("Full local draft")).toBeVisible();
  await page.getByRole("button", { name: /Approve Local Draft/i }).click();
  await expect(page.getByRole("button", { name: /Local Draft Approved/i })).toBeVisible();
  await page.getByRole("button", { name: /Prepare Publish Approval/i }).click();

  await page.goto("/#/approvals", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Approval gates for risky actions" })).toBeVisible();
  await expect(page.getByText("Reality Meter").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approval Inbox 2.0" })).toBeVisible();
  await expect(page.getByText("Ready To Request").first()).toBeVisible();
  await expect(page.getByText("Locked").first()).toBeVisible();
  await expect(page.getByText("Blocked").first()).toBeVisible();
  await expect(page.getByText(/Product publish|Publish externally/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ready, Locked, And Blocked" })).toBeVisible();

  await page.goto("/#/openclaw-system", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Reality Meter").first()).toBeVisible();
  await expect(page.getByText("OpenClaw System Health")).toBeVisible();
  await expect(page.getByText("Free Local MCP Kit")).toBeVisible();
  await expect(page.getByText("Tavily Research + FactCheck Station")).toBeVisible();
  await expect(page.getByText("Browser Research Broker").first()).toBeVisible();
  await expect(page.getByText("native safe public read")).toBeVisible();
  await page.getByRole("button", { name: /Test browser read with example.com/i }).click();
  await expect(page.getByText(/Last artifact: Browser preview safe read|Last artifact: Example Domain/i)).toBeVisible();
  await expect(page.getByText("Filesystem MCP", { exact: true })).toBeVisible();
  await expect(page.getByText("Knowledge Graph Memory MCP", { exact: true })).toBeVisible();
  await expect(page.getByText("Approved URL Fetch MCP", { exact: true })).toBeVisible();
  await expect(page.getByText("Puppeteer MCP Compatibility", { exact: true })).toBeVisible();
  await expect(page.getByText(/Browser Research Broker is not direct agent control/i)).toBeVisible();
  await expect(page.getByText("Runtime Role Map")).toBeVisible();
  await expect(page.getByText("TeamLeader1A", { exact: true })).toBeVisible();
  await expect(page.getByText("AgentResearcher", { exact: true })).toBeVisible();
  await expect(page.getByText("AgentSeo", { exact: true })).toBeVisible();
  await expect(page.getByText("AgentWriter", { exact: true })).toBeVisible();
  await expect(page.getByText("AgentContent", { exact: true })).toBeVisible();
  await expect(page.getByText("AgentProduction", { exact: true })).toBeVisible();
  await expect(page.getByText("AgentPublish", { exact: true })).toBeVisible();
  await expect(page.getByText("AgentAction", { exact: true })).toBeVisible();

  await page.goto("/#/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Release And Updater Checklist")).toBeVisible();
  await expect(page.getByText("Manual upload checklist")).toBeVisible();
  await expect(page.getByText("Auto Updates")).toBeVisible();
  await expect(page.getByText(/FactCheck evidence triage release/i)).toBeVisible();
});

test("Fiverr prompt still creates a locked local platform package", async ({ page }) => {
  await page.goto("/#/", { waitUntil: "domcontentloaded" });
  await page
    .getByPlaceholder("Ask TeamLeader1A what to validate, kill, improve, or approve next...")
    .fill("create a Fiverr gig business idea with zero budget");
  await page.getByRole("button", { name: /Send to TeamLeader1A/i }).click();
  await expect(page.getByText(/I started a fast Tavily-backed opportunity hunt/i)).toBeVisible();
  await page.goto("/#/mission-briefs", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Business Proposal: Fiverr AI Workflow Gig/i })).toBeVisible();
  await expect(page.getByText("Proposal Draft Status")).toBeVisible();
  await expect(page.getByText("Here is the proposal draft")).toBeVisible();
  await expect(page.getByText("Excluded / Invalid Evidence")).toBeVisible();
  await expect(page.getByRole("button", { name: /Find Replacement Evidence/i }).first()).toBeVisible();
  await expect(page.getByText("External platform/account needs")).toBeVisible();
  await expect(page.getByText(/User login required: yes/i)).toBeVisible();
  await expect(page.getByText(/Credentials stored: no/i)).toBeVisible();
  await expect(page.getByText(/Approve Business First/i)).toBeVisible();
});

test("MCP refresh keeps browser automation brokered in browser fallback", async ({ page }) => {
  await page.goto("/#/openclaw-system", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Refresh MCP status/i }).click();
  await expect(page.getByText("Browser Research Broker", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Puppeteer MCP Compatibility", { exact: true })).toBeVisible();
  await expect(page.getByText(/brokered safe read|needs install/i).first()).toBeVisible();
  await expect(page.getByText(/Fetch MCP is installed but disabled|approved URL research only/i).first()).toBeVisible();
});

test("approval-gated research and messaging block unsafe targets", async ({ page }) => {
  await page.goto("/#/openclaw-system", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Approved URLs, comma separated").fill("http://localhost:3000/private");
  await expect(page.getByText(/Private or local hosts are blocked/i)).toBeVisible();
  await page.getByPlaceholder("Approved URLs, comma separated").fill("http://127.0.0.1:3000/private");
  await expect(page.getByText(/Private or local hosts are blocked/i)).toBeVisible();
  await page.getByPlaceholder("Approved URLs, comma separated").fill("http://10.0.0.2/private");
  await expect(page.getByText(/Private or local hosts are blocked/i)).toBeVisible();
  await page.getByPlaceholder("Approved URLs, comma separated").fill("https://*.example.com");
  await expect(page.getByText(/Wildcard URL patterns are blocked/i)).toBeVisible();
  await page.getByPlaceholder("Approved URLs, comma separated").fill("https://user:pass@example.com/private");
  await expect(page.getByText(/Credential-style URLs are blocked/i)).toBeVisible();
  await page.getByPlaceholder("Approved URLs, comma separated").fill("ftp://example.com/file");
  await expect(page.getByText(/Only http and https URLs are allowed|Malformed URL/i)).toBeVisible();
  await page.getByPlaceholder("Approved URLs, comma separated").fill("https://example.com/login");
  await expect(page.getByText(/Login, account, checkout, payment, form, and CAPTCHA URL paths are blocked/i)).toBeVisible();

  await page.getByPlaceholder("Explicit channel target").fill("@everyone");
  await page.getByPlaceholder("Message text").fill("hello from dry-run");
  await expect(page.getByText(/Broadcast-style channel targets are blocked/i)).toBeVisible();
  await page.getByPlaceholder("Explicit channel target").fill("channel:one,channel:two");
  await expect(page.getByText(/Batch, wildcard, or comma-separated channel targets are blocked/i)).toBeVisible();
});
