import type { ApprovalRequest } from "../types";
import { persistenceService } from "./persistenceService";

async function state() {
  return (await persistenceService.loadState()).state;
}

export const approvalService = {
  async listApprovalRequests() {
    return (await state()).approvalRequests;
  },
  async listPendingApprovals() {
    const { approvalRequests } = await state();
    return approvalRequests.filter((request) => request.status === "pending");
  },
  async previewDecision(request: ApprovalRequest, decision: "approved" | "rejected") {
    return {
      ...request,
      status: decision,
      note:
        decision === "approved"
          ? "Local approval decision can be persisted, but external execution remains locked."
          : "Local rejection decision can be persisted, and no external action is executed.",
    };
  },
};
