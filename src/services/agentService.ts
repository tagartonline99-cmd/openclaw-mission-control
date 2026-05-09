import { persistenceService } from "./persistenceService";

async function state() {
  return (await persistenceService.loadState()).state;
}

export const agentService = {
  async listAgents() {
    return (await state()).agents;
  },
  async getTeamLeaderSummary() {
    const { agentMessages } = await state();
    return agentMessages.find((message) => message.visibility === "user_summary") ?? agentMessages[0];
  },
  async listInternalReports() {
    const { agentMessages } = await state();
    return agentMessages.filter((message) => message.visibility === "internal_report");
  },
  async listAgentTasks(agentId: string) {
    const { tasks } = await state();
    return tasks.filter((task) => task.assignedAgentId === agentId);
  },
  async listOrchestrationRuns() {
    return (await state()).agentOrchestrationRuns;
  },
  async listAgentArtifacts(runId?: string) {
    const { agentArtifacts } = await state();
    return runId ? agentArtifacts.filter((artifact) => artifact.runId === runId) : agentArtifacts;
  },
  async listAgentRunReviews(runId?: string) {
    const { agentRunReviews } = await state();
    return runId ? agentRunReviews.filter((review) => review.runId === runId) : agentRunReviews;
  },
};
