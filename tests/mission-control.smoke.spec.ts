import { expect, test } from "@playwright/test";

test("dashboard, TeamLeader1A chat, mission briefs, approvals, OpenClaw System, and settings render", async ({ page }) => {
  await page.goto("/#/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "OpenClaw Mission Control" })).toBeVisible();
  await expect(page.getByText("TeamLeader1A Chat")).toBeVisible();
  await expect(page.getByRole("button", { name: "Simulated Check", exact: true })).toBeVisible();

  await page.getByPlaceholder("Ask TeamLeader1A what to validate, kill, improve, or approve next...").fill("Create a safe test mission for the dashboard smoke test.");
  await page.getByRole("button", { name: /Draft agent mission/i }).click();
  await expect(page.getByText(/I drafted a multi-agent mission/i)).toBeVisible();
  await expect(page.getByText("View Mission Brief").last()).toBeVisible();

  await page.goto("/#/mission-briefs", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "TeamLeader1A delegated agent work" })).toBeVisible();
  await expect(page.getByRole("main").getByText(/TeamLeader1A mission/i).first()).toBeVisible();

  await page.goto("/#/approvals", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Approval gates for risky actions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Safety Review Desk" })).toBeVisible();
  await expect(page.getByText(/Start TeamLeader mission|Mission/i).first()).toBeVisible();

  await page.goto("/#/openclaw-system", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("OpenClaw System Health")).toBeVisible();
  await expect(page.getByText("Free Local MCP Kit")).toBeVisible();
  await expect(page.getByText("Filesystem MCP", { exact: true })).toBeVisible();
  await expect(page.getByText("Knowledge Graph Memory MCP", { exact: true })).toBeVisible();
  await expect(page.getByText("Approved URL Fetch MCP", { exact: true })).toBeVisible();
  await expect(page.getByText(/Browser\/Puppeteer MCP is intentionally deferred/i)).toBeVisible();

  await page.goto("/#/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Auto Updates")).toBeVisible();
  await expect(page.getByText(/Playwright MCP release/i)).toBeVisible();
});

test("MCP refresh does not expose browser automation in browser fallback", async ({ page }) => {
  await page.goto("/#/openclaw-system", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Refresh MCP status/i }).click();
  await expect(page.getByText("Browser Automation MCP", { exact: true })).toBeVisible();
  await expect(page.getByText("deferred").first()).toBeVisible();
  await expect(page.getByText(/Fetch MCP is installed but disabled|approved URL research only/i).first()).toBeVisible();
});
