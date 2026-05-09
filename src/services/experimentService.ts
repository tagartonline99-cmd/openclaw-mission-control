import { persistenceService } from "./persistenceService";

async function state() {
  return (await persistenceService.loadState()).state;
}

export const experimentService = {
  async listExperiments() {
    return (await state()).experiments;
  },
  async listExperimentAnalyses() {
    return (await state()).experimentAnalyses;
  },
  async getLatestAnalysis(experimentId: string) {
    const { experimentAnalyses } = await state();
    return experimentAnalyses.find((analysis) => analysis.experimentId === experimentId);
  },
};
