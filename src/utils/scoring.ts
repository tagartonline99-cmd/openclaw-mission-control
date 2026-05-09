import type { Quest, ValidationReport } from "../types";

export function calculateValidationCompletion(report: ValidationReport) {
  const passed = report.checklist.filter((item) => item.status === "passed").length;
  return Math.round((passed / report.checklist.length) * 100);
}

export function canLaunchQuest(quest: Quest, report?: ValidationReport) {
  if (!report) return false;
  const completion = calculateValidationCompletion(report);
  return completion >= 80 && report.status !== "blocked" && quest.approvalStatus === "approved";
}

export function portfolioRiskScore(quests: Quest[]) {
  const weights = { low: 1, medium: 2, high: 3, critical: 5 };
  const total = quests.reduce((sum, quest) => sum + weights[quest.riskLevel], 0);
  return Math.round((total / Math.max(quests.length, 1)) * 20);
}
