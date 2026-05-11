import { CheckCircle2, ExternalLink, ReceiptText } from "lucide-react";
import { useMemo } from "react";
import { useAppData } from "../../app/AppDataContext";
import { formatDateTime } from "../../utils/formatting";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ClarityBadge, type ClarityLabel } from "./ClarityBadge";

type VisibleReceipt = {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  mode: ClarityLabel;
  artifact: string;
  budgetEffect: string;
  externalStatus: string;
  href?: string;
};

export function ExecutionReceiptsPanel({
  businessId,
  previewId,
  limit = 6,
  title = "Action Receipts",
}: {
  businessId?: string;
  previewId?: string;
  limit?: number;
  title?: string;
}) {
  const { data } = useAppData();
  const receipts = useMemo<VisibleReceipt[]>(() => {
    const preview = previewId ? data.productPreviews.find((item) => item.id === previewId) : undefined;
    const resolvedBusinessId = businessId ?? preview?.businessId;
    const execution = data.executionReceipts
      .filter((item) => !resolvedBusinessId || item.businessId === resolvedBusinessId)
      .map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        createdAt: item.createdAt,
        mode: item.externalAction ? "External Action Blocked" as const : item.source?.toLowerCase().includes("browser") ? "Real Public Read" as const : "Local Draft" as const,
        artifact: item.artifactIds.length ? `${item.artifactIds.length} artifact(s)` : "Local record",
        budgetEffect: item.budgetEffect,
        externalStatus: item.externalAction ? "External action involved" : "No external action",
        href: resolvedBusinessId ? "#/businesses" : undefined,
      }));
    const draftApprovals = data.productDraftApprovals
      .filter((item) => (!previewId || item.previewId === previewId) && (!resolvedBusinessId || item.businessId === resolvedBusinessId))
      .map((item) => ({
        id: item.id,
        title: "Local draft review receipt",
        summary: item.note,
        createdAt: item.approvedAt ?? item.updatedAt,
        mode: item.status === "approved_local" ? "Approved Local" as const : "Local Draft" as const,
        artifact: "Product Studio local draft",
        budgetEffect: "No spend. Draft approval only unlocks the next request step.",
        externalStatus: "No external action",
        href: "#/production",
      }));
    const revisions = data.productRevisionRequests
      .filter((item) => (!previewId || item.previewId === previewId) && (!resolvedBusinessId || item.businessId === resolvedBusinessId))
      .map((item) => ({
        id: item.id,
        title: "Revision request receipt",
        summary: item.reason,
        createdAt: item.updatedAt,
        mode: "Local Draft" as const,
        artifact: `${item.taskIds.length} safe internal task(s)`,
        budgetEffect: "No spend. Revision is internal/local work.",
        externalStatus: "No external action",
        href: "#/tasks",
      }));
    const approvals = data.approvalRequests
      .filter((item) => (!previewId || item.productPreviewId === previewId) && (!resolvedBusinessId || item.publishPayloadPreviewId || item.questId))
      .filter((item) => !resolvedBusinessId || item.productPreviewId === previewId || data.productPreviews.find((previewItem) => previewItem.id === item.productPreviewId)?.businessId === resolvedBusinessId)
      .map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.reason,
        createdAt: item.createdAt,
        mode: item.status === "pending" ? "Pending Approval" as const : item.status === "approved" ? "Approved Local" as const : item.status === "blocked" ? "External Action Blocked" as const : "Locked" as const,
        artifact: item.publishPayloadPreviewId ? "Frozen publish payload" : "Approval request",
        budgetEffect: item.amount ? `Amount: $${item.amount}` : "No spend recorded by this receipt.",
        externalStatus: item.status === "pending" ? "Waiting for user approval" : "No automatic external action",
        href: "#/approvals",
      }));
    const teamLeaderLogs = data.activityLogs
      .filter((item) => !resolvedBusinessId && ["agent", "system", "approval"].includes(item.category))
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.detail,
        createdAt: item.createdAt,
        mode: item.title.toLowerCase().includes("browser") || item.detail.toLowerCase().includes("public research") ? "Real Public Read" as const : "Local Draft" as const,
        artifact: "Mission Control activity log",
        budgetEffect: "No automatic spend.",
        externalStatus: item.detail.toLowerCase().includes("no external") ? "No external action" : "Local record",
        href: item.relatedQuestId ? "#/mission-briefs" : undefined,
      }));
    return [...execution, ...draftApprovals, ...revisions, ...approvals, ...teamLeaderLogs]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, limit);
  }, [businessId, data, limit, previewId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-emerald-100" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {receipts.length === 0 ? (
          <p className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">No receipts yet. Run TeamLeader work, approve a local draft, or request a product revision.</p>
        ) : null}
        {receipts.map((receipt) => (
          <div key={receipt.id} className="rounded-md border border-white/10 bg-black/25 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <ClarityBadge label={receipt.mode} />
                <p className="mt-2 font-semibold text-stone-100">{receipt.title}</p>
              </div>
              <span className="text-xs text-slate-500">{formatDateTime(receipt.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{receipt.summary}</p>
            <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
              <span>Artifact: {receipt.artifact}</span>
              <span>Budget: {receipt.budgetEffect}</span>
              <span>{receipt.externalStatus}</span>
            </div>
            {receipt.href ? (
              <a className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-teal-100 hover:text-teal-50" href={receipt.href}>
                <ExternalLink className="h-3.5 w-3.5" />
                View output
              </a>
            ) : (
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Stored locally
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
