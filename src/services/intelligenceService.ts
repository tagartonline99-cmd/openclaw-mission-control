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
};
