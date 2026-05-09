import { persistenceService } from "./persistenceService";

async function state() {
  return (await persistenceService.loadState()).state;
}

export const questService = {
  async listQuests() {
    return (await state()).quests;
  },
  async listBusinessIdeas() {
    return (await state()).businessIdeas;
  },
  async getQuest(id: string) {
    const { quests } = await state();
    return quests.find((quest) => quest.id === id);
  },
  async listQuestExperiments(questId: string) {
    const { experiments } = await state();
    return experiments.filter((experiment) => experiment.questId === questId);
  },
  async listQuestDecisions(questId: string) {
    const { decisionLogs } = await state();
    return decisionLogs.filter((decision) => decision.questId === questId);
  },
  async listQueues() {
    const { researchQueue, experimentQueue, improvementQueue } = await state();
    return { researchQueue, experimentQueue, improvementQueue };
  },
};
