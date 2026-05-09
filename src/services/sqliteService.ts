import { entityConfigs, singletonConfigs } from "./persistenceService";

export const sqliteTables = [
  "agents",
  "skills",
  "quests",
  "business_ideas",
  "validation_reports",
  "experiments",
  "market_intelligence_reports",
  "experiment_analyses",
  "production_assets",
  "production_packs",
  "approval_requests",
  "approval_decision_records",
  "allowlist_entries",
  "activity_logs",
  "decision_logs",
  "improvement_proposals",
  "obsidian_notes",
  "settings",
  "budgets",
  "metrics",
  "tasks",
  "agent_orchestration_runs",
  "agent_artifacts",
  "agent_run_reviews",
  "agent_messages",
  "teamleader_chat_messages",
  "openclaw_commands",
  "openclaw_events",
  "openclaw_capabilities",
  "openclaw_permissions",
  "openclaw_runtime_status",
  "real_pilot_runs",
] as const;

export const sqliteSchemaPlan = sqliteTables.map((tableName) => ({
  tableName,
  phase: "Local E2E",
  status: entityConfigs.some((config) => config.tableName === tableName) || singletonConfigs.some((config) => config.tableName === tableName)
    ? "repository-backed"
    : "reserved",
  note: "SQLite tables use JSON payload columns plus practical status/type/stage/risk indexes.",
}));

export const sqliteService = {
  async getSchemaPlan() {
    return sqliteSchemaPlan;
  },
  async getPersistenceStatus() {
    return {
      enabled: true,
      adapter: "auto",
      note: "Tauri desktop uses SQLite through @tauri-apps/plugin-sql; browser development falls back to localStorage.",
    };
  },
};
