import { Badge } from "../ui/badge";

export type ClarityLabel =
  | "Local Draft"
  | "Real Public Read"
  | "Simulated"
  | "Pending Approval"
  | "Locked"
  | "Approved Local"
  | "External Action Blocked"
  | "Ready";

const toneByLabel: Record<ClarityLabel, "amber" | "teal" | "emerald" | "red" | "slate" | "violet"> = {
  "Local Draft": "amber",
  "Real Public Read": "teal",
  Simulated: "slate",
  "Pending Approval": "amber",
  Locked: "red",
  "Approved Local": "emerald",
  "External Action Blocked": "red",
  Ready: "emerald",
};

export function clarityLabelFromStatus(status?: string, externalAction = false): ClarityLabel {
  if (externalAction) return "External Action Blocked";
  if (!status) return "Local Draft";
  if (status === "pending" || status === "pending_approval" || status === "approval_requested") return "Pending Approval";
  if (status === "approved_local" || status === "local_draft_approved" || status === "approved") return "Approved Local";
  if (status === "locked" || status === "blocked" || status === "needs_product_review" || status === "needs_approval") return "Locked";
  if (status === "captured" || status === "fetched" || status === "completed") return "Real Public Read";
  if (status === "simulated" || status === "mocked") return "Simulated";
  if (status === "ready_for_review" || status === "ready_to_request_approval") return "Ready";
  return "Local Draft";
}

export function ClarityBadge({ label, className }: { label: ClarityLabel; className?: string }) {
  return <Badge className={className} tone={toneByLabel[label]}>{label}</Badge>;
}
