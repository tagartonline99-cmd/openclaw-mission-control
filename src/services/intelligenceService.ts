import { persistenceService } from "./persistenceService";

async function state() {
  return (await persistenceService.loadState()).state;
}

export const intelligenceService = {
  async listMarketReports() {
    return (await state()).marketIntelligenceReports;
  },
  async listQuestMarketReports(questId: string) {
    const { marketIntelligenceReports } = await state();
    return marketIntelligenceReports.filter((report) => report.questId === questId);
  },
  async listKeywordOpportunities(questId?: string) {
    const { marketIntelligenceReports } = await state();
    return marketIntelligenceReports
      .filter((report) => !questId || report.questId === questId)
      .flatMap((report) => report.keywordOpportunities.map((keyword) => ({ ...keyword, reportId: report.id, questId: report.questId })));
  },
  async listSourceCaptures(questId?: string) {
    const { researchSourceCaptures } = await state();
    return researchSourceCaptures.filter((capture) => !questId || capture.questId === questId);
  },
  async listSeoKeywordClusters(questId?: string) {
    const { seoKeywordClusters } = await state();
    return seoKeywordClusters.filter((cluster) => !questId || cluster.questId === questId);
  },
  async listDemandProofReports(questId?: string) {
    const { demandProofReports } = await state();
    return demandProofReports.filter((report) => !questId || report.questId === questId);
  },
};
