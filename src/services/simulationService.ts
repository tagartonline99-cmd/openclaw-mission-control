import type { AppDataState } from "./persistenceService";
import type { ActivityLog, AgentMessage, OpenClawCommand, OpenClawEvent } from "../types";

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function runSafeSimulationTick(state: AppDataState): AppDataState {
  const next = structuredClone(state);
  const now = nowIso();
  const researchTarget = next.researchQueue[0] ?? "Review validation evidence";
  const experimentTarget = next.experimentQueue[0] ?? "Review queued experiment";

  const log: ActivityLog = {
    id: id("log-sim"),
    category: "system",
    title: "Simulated research check completed",
    detail: `TeamLeader1A reviewed "${researchTarget}" and queued safe internal follow-up only. No external command was executed.`,
    severity: "success",
    createdAt: now,
  };

  const command: OpenClawCommand = {
    id: id("cmd-sim"),
    command: `simulation.safe_check --target "${researchTarget}" --mode local-only`,
    targetAgentId: "teamleader1a",
    status: "simulated",
    riskLevel: "low",
    approvalRequired: false,
    resultSummary: "Local-only simulation wrote logs and refreshed TeamLeader1A summary.",
    createdAt: now,
  };

  const event: OpenClawEvent = {
    id: id("event-sim"),
    type: "queue",
    title: "Controlled queue tick",
    detail: "The app advanced local queues while keeping spending, publishing, automation, and external OpenClaw commands locked.",
    createdAt: now,
    severity: "success",
  };

  const message: AgentMessage = {
    id: id("msg-teamleader"),
    fromAgentId: "teamleader1a",
    toAgentId: "TeamLeader1A",
    summary: "Local simulation completed. No external actions were taken.",
    details: `Reviewed ${researchTarget}. Next safe internal focus: ${experimentTarget}. Approval gates remain active for spend, publish, launch, and automation.`,
    createdAt: now,
    visibility: "user_summary",
  };

  next.activityLogs = [log, ...next.activityLogs];
  next.openClawCommands = [command, ...next.openClawCommands];
  next.openClawEvents = [event, ...next.openClawEvents];
  next.agentMessages = [message, ...next.agentMessages].slice(0, 24);
  next.researchQueue = [...next.researchQueue.slice(1), researchTarget];
  next.experimentQueue = [...next.experimentQueue.slice(1), experimentTarget];
  next.dashboardSummary = {
    ...next.dashboardSummary,
    latestTeamLeaderRecommendation:
      "The latest local simulation found no safe reason to launch externally. Continue validation, keep approval gates active, and prioritize the next small evidence-gathering step.",
  };

  const firstRunningExperiment = next.experiments.find((experiment) => experiment.status === "running" || experiment.status === "planned");
  if (firstRunningExperiment?.metrics[0] && typeof firstRunningExperiment.metrics[0].value === "number") {
    firstRunningExperiment.metrics[0] = {
      ...firstRunningExperiment.metrics[0],
      value: firstRunningExperiment.metrics[0].value + 1,
      trend: "up",
    };
    firstRunningExperiment.learning = "Latest local queue tick added one simulated internal evidence point. External action remains locked.";
  }

  return next;
}
