import { persistenceService } from "./persistenceService";
import { calculateValidationCompletion } from "../utils/scoring";

async function state() {
  return (await persistenceService.loadState()).state;
}

export const validationService = {
  async listValidationReports() {
    return (await state()).validationReports;
  },
  async getValidationReport(questId: string) {
    const { validationReports } = await state();
    return validationReports.find((report) => report.questId === questId);
  },
  async getCompletion(questId: string) {
    const { validationReports } = await state();
    const report = validationReports.find((item) => item.questId === questId);
    return report ? calculateValidationCompletion(report) : 0;
  },
};
