import { expect, test } from "@playwright/test";

test("TeamLeader command creates visible agent work, proposal, business, and production map", async ({ page }) => {
  await page.goto("/#/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Tell TeamLeader1A what to build" })).toBeVisible();
  await expect(page.getByText("TeamLeader1A Chat")).toBeVisible();

  await page
    .getByPlaceholder("Ask TeamLeader1A what to validate, kill, improve, or approve next...")
    .fill("find me the best online business idea with zero budget");
  await page.getByRole("button", { name: /Send to TeamLeader1A/i }).click();
  await expect(page.getByText(/I started a live opportunity hunt/i)).toBeVisible();
  await expect(page.getByText(/View Work/i).first()).toBeVisible();

  await page.goto("/#/tasks", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Every agent task in one place" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Now Working" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Research zero-budget demand/i })).toBeVisible();

  await page.goto("/#/guild-office", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Watch the agents work" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Research Library/i })).toBeVisible();
  await expect(page.getByText(/research beam|pulse|forge/i).first()).toBeVisible();

  await page.goto("/#/mission-briefs", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Business Proposal Review")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Business Proposal: Practical AI Workflow Kit/i })).toBeVisible();
  await expect(page.getByText("Evidence and links")).toBeVisible();
  await page.getByRole("button", { name: /Approve Business/i }).click();

  await page.goto("/#/businesses", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Business proposals you approved" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Practical AI Workflow Kit/i })).toBeVisible();
  await expect(page.getByText("Autonomous improvement", { exact: true }).last()).toBeVisible();

  await page.goto("/#/production", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Business Production And Publishing Map")).toBeVisible();
  await expect(page.getByText(/Publishing destinations are visible/i).first()).toBeVisible();
  await expect(page.getByText(/approval required/i).first()).toBeVisible();

  await page.goto("/#/approvals", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Approval gates for risky actions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Safety Review Desk" })).toBeVisible();
  await expect(page.getByText(/Spend money|Publish externally|Launch experiment/i).first()).toBeVisible();

  await page.goto("/#/openclaw-system", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("OpenClaw System Health")).toBeVisible();
  await expect(page.getByText("Free Local MCP Kit")).toBeVisible();
  await expect(page.getByText("Filesystem MCP", { exact: true })).toBeVisible();
  await expect(page.getByText("Knowledge Graph Memory MCP", { exact: true })).toBeVisible();
  await expect(page.getByText("Approved URL Fetch MCP", { exact: true })).toBeVisible();
  await expect(page.getByText(/Browser\/Puppeteer MCP is intentionally deferred/i)).toBeVisible();

  await page.goto("/#/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Auto Updates")).toBeVisible();
  await expect(page.getByText(/TeamLeader command center release/i)).toBeVisible();
});

test("MCP refresh does not expose browser automation in browser fallback", async ({ page }) => {
  await page.goto("/#/openclaw-system", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Refresh MCP status/i }).click();
  await expect(page.getByText("Browser Automation MCP", { exact: true })).toBeVisible();
  await expect(page.getByText("deferred").first()).toBeVisible();
  await expect(page.getByText(/Fetch MCP is installed but disabled|approved URL research only/i).first()).toBeVisible();
});
