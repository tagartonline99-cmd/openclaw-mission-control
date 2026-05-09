# OpenClaw Mission Control

OpenClaw Mission Control is a Tauri, React, and TypeScript desktop command center for responsible OpenClaw agent operations. It combines a dark fantasy dungeon/RPG strategy interface with a futuristic mission-control dashboard for researching, validating, testing, and improving online business ideas.

The app does not claim guaranteed income. Business ideas are treated as hypotheses, and every plan must pass validation before launch. Spending, publishing, scaling, browser automation, scraping, channel messaging, and live OpenClaw runtime actions require explicit approval and are routed through narrow allowlists.

## Current Scope

This build covers the local end-to-end MVP:

- Polished desktop-first UI with routes for Dashboard, Agents, Orchestration, Quests, Ideas, Validation, Real Pilot, Market Intel, Experiments, Production, Second Brain, Approvals, Activity Log, OpenClaw System, and Settings.
- App-wide data provider that loads local state once and exposes durable mutations.
- SQLite-ready Tauri SQL adapter using `sqlite:openclaw-mission-control.db` in the desktop shell.
- Browser development fallback using `localStorage` so Vite can be verified without native APIs.
- First-launch seeding from realistic mock OpenClaw data.
- Durable local settings, approval decisions, activity logs, simulated commands, simulated events, and queue results.
- Real local Obsidian Markdown export from the Tauri desktop shell, with browser download fallback during web development.
- Controlled simulated queues that only run while the app is open and never execute external actions.
- Phase 5B real local OpenClaw bridge for gateway status, profile sync, approved TeamLeader1A turns, approved URL research, and approved channel-message dry runs.
- Phase 6A Real Pilot Workbench for one local end-to-end business quest pilot: approved URL research request, validation snapshot, risk review, minimum test plan, TeamLeader1A review request, command-result ledger, and Obsidian pilot report export.
- Phase 6B Approval and Safety UX hardening with a central safety policy, structured allowlists, blocked-attempt records, decision timelines, safer command recovery, and retry lineage.
- Phase 7 Real Agent Orchestration with TeamLeader1A-managed task trees, dependencies, internal agent reports, local artifacts, skill gap capture, and accept/revise/reject reviews.
- Phase 8 Market Intelligence Workbench with local demand signals, competitor snapshots, keyword opportunities, evidence scoring, citation notes, and approval-gated URL research requests.
- Phase 9 Experiment Builder and Analytics with bounded local test plans, confidence scoring, break-even progress, and continue/revise/kill/scale-later recommendations.
- Phase 10 Production Asset Pipeline with local landing page drafts, content briefs, policy checks, claim review, and approval-locked publishing boundaries.
- Native Tauri plugin wiring for SQL, filesystem, dialog, and opener.

## Safety Position

Guardrails in this app:

- No spending without user approval.
- No external publishing without user approval.
- No launch or scaling without validation evidence and user approval.
- No scams, spam, fake reviews, misleading claims, illegal activity, scraping against website terms, or financial guarantees.
- No uncontrolled background jobs.
- Real local OpenClaw actions are limited to allowlisted commands and require one approval per risky action.
- Structured allowlists are the source of truth for approved research domains, channel targets, and local OpenClaw capabilities.
- Blocked URL/channel attempts are stored as local audit records and never execute.
- Browser research/scraping is limited to explicit approved URLs, no login, no form submission, no PII harvesting, no terms bypass, and no uncontrolled crawling.
- Channel messaging drafts are visible first; dry-run is the default, broadcasts and batch targets are blocked, and real sends require explicit approval.

Approvals are durable local records with safety evaluations and decision timelines. Approved OpenClaw actions execute once through the desktop bridge, with command text, stdout, stderr, exit code, events, and activity logs persisted to SQLite. Phase 6A-10 workflows remain local planning, evidence, analytics, and asset-preparation workflows. Spending, publishing, payments, bulk outreach, browser login flows, and external business automation remain disabled.

## Stack

- Tauri 2
- React
- TypeScript
- Tailwind CSS
- shadcn-style local UI primitives
- Lucide icons
- Tauri SQL plugin with SQLite
- Tauri filesystem, dialog, and opener plugins
- Tauri updater and process plugins
- Local Markdown export for Obsidian
- Mock data and simulated queues for MVP behavior

## Setup

Install JavaScript dependencies:

```powershell
npm.cmd install
```

Run the Vite development server:

```powershell
npm.cmd run dev
```

Build the frontend:

```powershell
npm.cmd run build
```

Preview the production frontend build:

```powershell
npm.cmd run preview
```

## Native Desktop

Native Tauri run/build requires Rust and Cargo on PATH. The SQL plugin requires Rust 1.77.2 or newer. On Windows, Rust's MSVC target also needs Visual Studio Build Tools with the C++ workload so `link.exe` is available.

After Rust is installed:

```powershell
npm.cmd run tauri dev
npm.cmd run tauri build
```

The desktop shell is configured in `src-tauri`. In desktop mode, the app uses the Tauri SQL plugin and stores data in `sqlite:openclaw-mission-control.db`. In Vite browser mode, it falls back to `localStorage`.

## Auto Updates

The app is configured to check GitHub Releases for signed updates after launch and to prompt before installing. The first updater-enabled version must still be installed manually; later signed releases can update in-app.

Update endpoint:

```text
https://github.com/tagartonline99/openclaw-mission-control/releases/latest/download/latest.json
```

The updater public key is committed in `src-tauri/tauri.conf.json`. The private signing key must stay outside the repo:

```text
C:\Users\User\.openclaw\mission-control-updater-keys\openclaw-mission-control.key
```

Build signed artifacts:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY_PATH="C:\Users\User\.openclaw\mission-control-updater-keys\openclaw-mission-control.key"
npm.cmd run tauri build
npm.cmd run release:prepare-updater
```

Create GitHub release `v0.1.1` or later and upload every file from `release-artifacts\vVERSION`. The updater manifest is `latest.json`.

For a controlled local dev launch that reuses an already-running Vite server, use:

```powershell
npm.cmd run tauri -- dev --no-watch --config src-tauri\tauri.dev-check.conf.json
```

## Architecture

Main folders:

- `src/app`: app shell, routes, pages, and `AppDataContext`.
- `src/components`: dashboard, agents, orchestration, intelligence, production, quests, validation, approvals, Second Brain, OpenClaw, layout, and UI components.
- `src/data/mockData.ts`: first-launch seed data for agents, quests, approvals, logs, commands, events, capabilities, settings, queues, and reports.
- `src/types/index.ts`: TypeScript models for the full OpenClaw mission domain.
- `src/services`: local repositories and integration boundaries.
- `src/utils`: formatting, scoring, Markdown rendering, and class helpers.
- `src-tauri`: native desktop shell, plugin setup, capabilities, and bundle config.

Important service boundaries:

- `persistenceService`: loads, seeds, migrates, saves, and resets local state through SQLite or browser fallback.
- `simulationService`: runs safe local queue ticks and writes logs, messages, events, commands, and experiment updates.
- `agentService`: exposes agents, internal reports, per-agent tasks, orchestration runs, artifacts, and TeamLeader1A reviews.
- `intelligenceService`: exposes market reports, demand evidence, competitor snapshots, and keyword opportunities.
- `experimentService`: exposes experiment plans and local confidence analyses.
- `productionService`: exposes local production packs, assets, claim checks, and review status.
- `approvalService`: exposes approval request data and safe local decision previews.
- `obsidianService`: renders Markdown and path previews.
- `openclawService`: hybrid adapter for runtime status, profile sync, approved real local actions in Tauri, and safe browser fallback.
- `sqliteService`: schema plan and persistence status metadata.

## SQLite Persistence

The app reserves and migrates these local tables:

- `agents`
- `skills`
- `quests`
- `business_ideas`
- `validation_reports`
- `experiments`
- `market_intelligence_reports`
- `experiment_analyses`
- `production_assets`
- `production_packs`
- `approval_requests`
- `activity_logs`
- `decision_logs`
- `improvement_proposals`
- `obsidian_notes`
- `settings`
- `budgets`
- `metrics`
- `tasks`
- `agent_messages`
- `agent_orchestration_runs`
- `agent_artifacts`
- `agent_run_reviews`
- `openclaw_commands`
- `openclaw_events`
- `openclaw_capabilities`
- `openclaw_permissions`
- `openclaw_runtime_status`
- `app_metadata`

Each persisted table uses `id`, indexed practical fields such as `quest_id`, `status`, `type`, `stage`, and `risk_level`, plus a JSON `payload`. Nested structures stay as JSON text for this local MVP.

First launch seeds data exactly once through `app_metadata.seeded`. Resetting local data writes the original seed state again.

## Obsidian Export

The Second Brain page supports:

- Selecting a local Obsidian vault folder in the Tauri desktop shell.
- Persisting the vault path in settings.
- Rendering Markdown with frontmatter.
- Exporting quest summaries, validation reports, decisions, agent memory, experiment reports, lessons learned, command logs, and system reports.
- Revealing exported files or folders through the OS.
- Browser fallback download when running through Vite without Tauri APIs.

Templates include business idea, market research, competitor research, keyword research, experiment log, decision log, agent memory, SOP, content plan, revenue report, lessons learned, validation report, quest summary, OpenClaw command log, OpenClaw agent memory, and OpenClaw system report.

## Simulated Queues

The dashboard includes:

- Manual `Run simulated check now`.
- Safe interval simulation while the app is open.
- Research, experiment, and improvement queue rotation.
- Local activity logs.
- Local OpenClaw command and event logs.
- TeamLeader1A summaries.
- Experiment metric updates.

The simulation never spends money, publishes content, launches experiments, scrapes websites, starts browser automation, calls external APIs, or executes OpenClaw runtime commands.

## Agent System

TeamLeader1A is the commander and the only agent that communicates with the user. Other agents produce internal reports that TeamLeader1A summarizes.

The Orchestration page turns a quest into a local TeamLeader1A-managed task tree. Agents complete dependency-gated internal tasks, produce artifacts for review, and never talk directly to the user. TeamLeader1A can accept the run, reject it, or request revisions. This is still local planning and artifact management; it does not authorize spending, publishing, scraping, messaging, launching, or live external automation.

- AgentResearcher researches markets, competitors, trends, and demand.
- AgentSeo maps keywords, search intent, clusters, and SEO opportunities.
- AgentWriter drafts copy and content without unsupported claims.
- AgentContent manages content strategy and pipeline.
- AgentProduction builds assets and internal MVP materials.
- AgentPublish prepares publishing checklists but does not publish without approval.
- AgentAction executes approved internal tasks and prepares workflows.

## Approval Gates

Approval request types include:

- Spend money
- Publish externally
- Launch experiment
- Install new capability
- Run automation
- Archive failed idea
- Scale successful idea
- Connect OpenClaw capability
- Execute OpenClaw external command
- Start OpenClaw gateway
- Run OpenClaw local agent turn
- Run approved URL research
- Send approved channel message

Local approval/rejection decisions are saved and logged. Phase 5B OpenClaw payloads run only after approval, only through the Tauri bridge allowlist, and never with `--deliver`, broadcast, spending, publishing, login automation, CAPTCHA bypass, fake reviews, spam, purchases, or unrestricted scraping.

## OpenClaw Integration

`src/services/openclawService.ts` is the adapter boundary for:

- Probing local OpenClaw gateway status.
- Syncing real local OpenClaw profiles to Mission Control roles.
- Creating approved TeamLeader1A local turns.
- Running approved URL research against explicit URLs.
- Preparing approved text-only channel messages, dry-run first.
- Reading command results and safe failure states.
- Managing permissions.
- Enforcing approval rules.
- Syncing logs to SQLite.
- Exporting OpenClaw memory to Obsidian.

The native bridge lives in `src-tauri/src/lib.rs`. It calls `openclaw.cmd` directly with a strict command allowlist and rejects blocked intent such as `--deliver`, broadcast, purchases, fake reviews, spam, login automation, CAPTCHA bypass, form submission, publishing, and unrestricted scraping.

## Future Integration Notes

To extend real OpenClaw runtime support later:

1. Keep TeamLeader1A as the only user-facing communication agent.
2. Route all external commands through approval checks.
3. Persist command requests, approvals, results, and failures before and after execution.
4. Keep command execution idempotent and auditable.
5. Add kill switches for runtime, automation, publishing, and spending.

To add real AI agents later:

1. Add provider-specific adapters behind service interfaces.
2. Store prompts, outputs, costs, and safety decisions locally.
3. Require TeamLeader1A review before user-facing recommendations.
4. Block unsupported income claims and policy-risky content.

To add background jobs later:

1. Keep local scheduling explicit and user-configurable.
2. Avoid uncontrolled always-on jobs.
3. Store every job run and result in SQLite.
4. Require approval for external automation.

To connect APIs later:

1. Add per-provider permission and budget settings.
2. Store credentials through a secure desktop secret mechanism, not plain settings rows.
3. Log rate limits, spend, and external side effects.
4. Keep publishing, payments, browser automation, and outreach disabled until individually approved.

## Reference Docs

Implementation choices follow the official Tauri 2 plugin docs:

- SQL plugin: https://v2.tauri.app/plugin/sql/
- Filesystem plugin: https://v2.tauri.app/plugin/file-system/
- Dialog plugin: https://v2.tauri.app/plugin/dialog/
- Opener plugin: https://v2.tauri.app/plugin/opener/
- Updater plugin: https://v2.tauri.app/plugin/updater/

## Phase Roadmap

1. Phase 1: polished desktop frontend MVP with mock data.
2. Phase 2: local SQLite persistence.
3. Phase 3: real local Obsidian Markdown export.
4. Phase 4: controlled simulated autonomous queue system.
5. Phase 5: real OpenClaw runtime integration after explicit approval.
6. Phase 5B: runtime acceptance and safety hardening for approved local actions.
7. Phase 6A: Real Pilot Workbench for one local end-to-end quest pilot with approved research, TeamLeader1A review, command results, and Obsidian export.
8. Phase 6B: approval review hardening, allowlists, blocked-action explanations, and command replay/recovery tools.
9. Phase 7: real agent orchestration with task trees, dependencies, artifacts, and TeamLeader1A review.
10. Phase 8: approved research, SEO, and market intelligence integrations.
11. Phase 9: experiment builder and read-only analytics.
12. Phase 10: production asset pipeline with local previews and claim/policy checks.
13. Phase 11: approved publishing, messaging, and outreach connectors.
14. Phase 12: budget ledger, spend controls, caps, and forecasts.
15. Phase 13: controlled background runner and desktop notifications.
16. Phase 14: portfolio optimization and learning loop.
17. Phase 15: product hardening, encrypted secrets, backups, tests, signing, and diagnostics.
18. Phase 16: optional team/cloud sync while preserving local-first mode.
