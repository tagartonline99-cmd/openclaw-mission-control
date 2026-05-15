import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, CheckCircle2, Eye, FileText, FolderOpen, Hammer, Lock, PackageCheck, RefreshCw, RotateCcw, ShieldAlert, Sparkles, X } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import { formatCurrency, formatDateTime, statusTone } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select } from "../ui/select";
import { ClarityBadge, clarityLabelFromStatus } from "../dashboard/ClarityBadge";
import { ExecutionReceiptsPanel } from "../dashboard/ExecutionReceiptsPanel";
import { NowCommandCenter } from "../dashboard/NowCommandCenter";

function label(value: string) {
  return value.replace(/_/g, " ");
}

function gateTone(status: string) {
  if (status === "approved" || status === "ready_to_request_approval") return "emerald";
  if (status === "pending_approval") return "amber";
  if (status === "blocked" || status === "rejected") return "red";
  return "slate";
}

function gateLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const previewTabs = [
  { id: "overview", label: "Overview" },
  { id: "full_draft", label: "Full Draft" },
  { id: "platform_fields", label: "Platform Fields" },
  { id: "assets", label: "Assets" },
  { id: "claims_safety", label: "Claims & Safety Check" },
  { id: "publishing_preview", label: "Publishing Preview" },
  { id: "revision_requests", label: "Revision Requests" },
] as const;

const BUSINESS_OPTION_LIMIT = 12;
const PRODUCT_FILE_LIMIT = 8;
const PRODUCT_ARTIFACT_LIMIT = 6;
const LEGACY_PRODUCTION_PACK_LIMIT = 6;
const PRODUCT_TEXT_LIMIT = 14_000;

function byNewestUpdatedAt<T extends { updatedAt?: string; createdAt?: string; startedAt?: string }>(left: T, right: T) {
  return (right.updatedAt ?? right.createdAt ?? right.startedAt ?? "").localeCompare(left.updatedAt ?? left.createdAt ?? left.startedAt ?? "");
}

function includeSelected<T extends { id: string }>(items: T[], selectedId: string | undefined, limit: number) {
  const selected = selectedId ? items.find((item) => item.id === selectedId) : undefined;
  const capped = items.slice(0, limit);
  if (!selected || capped.some((item) => item.id === selected.id)) return capped;
  return [selected, ...capped.filter((item) => item.id !== selected.id).slice(0, Math.max(0, limit - 1))];
}

function productFileRank(fileName: string, requiredFileNames: string[] = []) {
  const normalized = fileName.replace(/\\/g, "/").toLowerCase();
  const index = requiredFileNames.findIndex((item) => item.replace(/\\/g, "/").toLowerCase() === normalized);
  if (index >= 0) return index;
  if (normalized === "readme.md") return 0;
  if (normalized === "start-here.md") return 1;
  return 1_000;
}

function compactProductName(name: string, trackType?: string) {
  if (trackType === "digital_template_pack" && /client onboarding|meeting notes|proposal|delivery/i.test(name)) {
    return "AI Client Workflow Template Pack";
  }
  if (name.length <= 72) return name;
  return `${name.slice(0, 69).trim()}...`;
}

export function ProductionPipelineWorkbench() {
  const {
    data,
    approveProductLocalDraft,
    requestProductRevision,
    prepareProductPublishApproval,
    exportProductProofPack,
    regenerateProductWithAgents,
    revealProductPath,
    lastExportResult,
    createProductionPack,
    advanceProductionAsset,
    createSiteProject,
    createContentItemFromCluster,
    prepareStaticSiteDiff,
    createAffiliateOffer,
    reviewAffiliateOffer,
    createBatchApprovalFromDiff,
  } = useAppData();
  const [questId, setQuestId] = useState(data.quests[0]?.id ?? "");
  const [businessId, setBusinessId] = useState(data.approvedBusinesses[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<(typeof previewTabs)[number]["id"]>("overview");
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showAllBusinesses, setShowAllBusinesses] = useState(false);
  const [showAllProductFiles, setShowAllProductFiles] = useState(false);
  const [showAllLegacyPacks, setShowAllLegacyPacks] = useState(false);
  const [searchParams] = useSearchParams();
  const linkedBusinessId = searchParams.get("business") ?? "";
  const selectedQuest = data.quests.find((quest) => quest.id === questId);
  const siteProject = data.siteProjects.find((site) => site.questIds.includes(questId));
  const clusters = data.seoKeywordClusters.filter((cluster) => cluster.questId === questId);
  const siteContentItems = siteProject ? data.contentItems.filter((item) => item.siteProjectId === siteProject.id) : [];
  const siteDiffs = siteProject ? data.publishingDiffs.filter((diff) => diff.siteProjectId === siteProject.id) : [];
  const affiliateOffers = data.affiliateOffers.filter((offer) => offer.questId === questId);
  const sortedBusinesses = useMemo(() => [...data.approvedBusinesses].sort(byNewestUpdatedAt), [data.approvedBusinesses]);
  const latestCompleteProductBusinessId = useMemo(() => {
    const completeRun = [...data.productProductionRuns]
      .filter((run) => run.status === "complete" && run.runtimeMode === "real_openclaw")
      .sort(byNewestUpdatedAt)[0];
    return completeRun?.businessId ?? sortedBusinesses[0]?.id ?? "";
  }, [data.productProductionRuns, sortedBusinesses]);
  useEffect(() => {
    if (linkedBusinessId && data.approvedBusinesses.some((business) => business.id === linkedBusinessId)) {
      setBusinessId(linkedBusinessId);
      return;
    }
    if (!latestCompleteProductBusinessId) return;
    if (businessId !== latestCompleteProductBusinessId) {
      setBusinessId(latestCompleteProductBusinessId);
    }
  }, [businessId, data.approvedBusinesses, latestCompleteProductBusinessId, linkedBusinessId]);
  const selectedBusiness = data.approvedBusinesses.find((business) => business.id === businessId) ?? sortedBusinesses[0];
  const visibleBusinesses = showAllBusinesses
    ? sortedBusinesses
    : includeSelected(sortedBusinesses, selectedBusiness?.id, BUSINESS_OPTION_LIMIT);
  const hiddenBusinessCount = data.approvedBusinesses.length - visibleBusinesses.length;
  const selectedBusinessPreviews = selectedBusiness
    ? data.productPreviews.filter((item) => item.businessId === selectedBusiness.id).sort(byNewestUpdatedAt)
    : [];
  const preview = selectedBusinessPreviews[0];
  const blueprint = preview ? data.productBlueprints.find((item) => item.id === preview.blueprintId) : undefined;
  const gate = preview?.approvalGateStateId ? data.approvalGateStates.find((item) => item.id === preview.approvalGateStateId) : undefined;
  const previewSections = preview ? data.productPreviewSections.filter((section) => preview.sectionIds.includes(section.id)) : [];
  const activeSection = previewSections.find((section) => section.kind === activeTab) ?? previewSections[0];
  const assetFiles = preview ? data.localAssetFiles.filter((file) => preview.assetFileIds.includes(file.id)) : [];
  const renderedPreviews = preview ? data.renderedProductPreviews.filter((item) => item.previewId === preview.id) : [];
  const renderedPreview = renderedPreviews.find((item) => item.status === "ready") ?? renderedPreviews[0];
  const destination = preview?.destinationId ? data.productionDestinations.find((item) => item.id === preview.destinationId) : undefined;
  const platformPackage = preview?.platformPackageId ? data.platformExecutionPackages.find((item) => item.id === preview.platformPackageId) : undefined;
  const publishPayload = preview?.publishPayloadPreviewId ? data.publishPayloadPreviews.find((item) => item.id === preview.publishPayloadPreviewId) : undefined;
  const pendingApproval = gate?.approvalId ? data.approvalRequests.find((item) => item.id === gate.approvalId) : undefined;
  const latestReceipt = preview
    ? data.executionReceipts.find((receipt) => receipt.businessId === preview.businessId || receipt.proposalId === preview.proposalId)
    : undefined;
  const productionRun = preview?.productionRunId
    ? data.productProductionRuns.find((run) => run.id === preview.productionRunId)
    : selectedBusiness
      ? data.productProductionRuns.find((run) => run.businessId === selectedBusiness.id)
      : undefined;
  const productTrack = productionRun ? data.productTracks.find((track) => track.id === productionRun.trackId) : undefined;
  const productManifest = preview?.fileManifestId
    ? data.productFileManifests.find((manifest) => manifest.id === preview.fileManifestId)
    : productionRun?.fileManifestId
      ? data.productFileManifests.find((manifest) => manifest.id === productionRun.fileManifestId)
      : undefined;
  const productFiles = productManifest
    ? data.productFileRecords
        .filter((file) => productManifest.fileIds.includes(file.id))
        .sort((left, right) => {
          const rankDelta = productFileRank(left.fileName, productionRun?.requiredFileNames) - productFileRank(right.fileName, productionRun?.requiredFileNames);
          return rankDelta || left.fileName.localeCompare(right.fileName);
        })
    : [];
  const visibleProductFiles = showAllProductFiles ? productFiles : productFiles.slice(0, PRODUCT_FILE_LIMIT);
  const hiddenProductFileCount = productFiles.length - visibleProductFiles.length;
  const productArtifacts = productionRun ? data.productAgentArtifacts.filter((artifact) => productionRun.artifactIds.includes(artifact.id)) : [];
  const visibleProductArtifacts = productArtifacts.slice(0, PRODUCT_ARTIFACT_LIMIT);
  const productReceipts = productionRun ? data.productGenerationReceipts.filter((receipt) => productionRun.receiptIds.includes(receipt.id)) : [];
  const readinessGate = productionRun ? data.productReadinessGates.find((item) => item.runId === productionRun.id) : undefined;
  const fallbackNotAccepted = productionRun?.status === "fallback_complete" || productionRun?.status === "blocked_fallback_available" || productionRun?.runtimeMode === "fallback_local";
  const buildBlocked = fallbackNotAccepted || productionRun?.status === "blocked" || preview?.status === "blocked" || readinessGate?.status === "blocked";
  const buildComplete = productionRun?.status === "complete" && productionRun.runtimeMode === "real_openclaw" && productFiles.length > 0 && productFiles.every((file) => file.status === "written");
  const latestProductFile = productFiles[0];
  const primaryProductFile =
    productFiles.find((file) => file.fileName === "README.md") ??
    productFiles.find((file) => file.fileName === "START-HERE.md") ??
    productFiles.find((file) => /fiverr|gig|landing|newsletter|article|template|sop|checklist/i.test(file.fileName)) ??
    latestProductFile;
  const productDisplayName = compactProductName(blueprint?.name ?? selectedBusiness?.name ?? "Local product", productTrack?.type);
  const acceptedRequiredCount = productionRun?.requiredFileNames?.length ?? productFiles.length;
  const hasAcceptedManifest = Boolean(productManifest?.fileIds?.length && productFiles.length);
  const latestProductArtifact = productArtifacts[productArtifacts.length - 1];
  const blockedReason = productionRun?.buildError ?? readinessGate?.blockedReasons?.join(" ") ?? "No product files were accepted.";
  const blockedPreviewText = buildBlocked
    ? [
        "REAL PRODUCT BUILD BLOCKED",
        "",
        "No product files were created or accepted.",
        "",
        `Why blocked: ${blockedReason}`,
        "",
        fallbackNotAccepted
          ? "Fallback Local - Not Accepted. Retry the real gateway-backed Product Factory before local draft approval or publish approval."
          : "Next action: retry the failed agent/runtime path after fixing the diagnostic above.",
      ].join("\n")
    : "";
  const productFullText = productFiles.length
    ? [
        ...visibleProductFiles.map((file) => [`# ${file.title}`, `Path: ${file.path}`, `Mode: ${label(file.runtimeMode)}`, "", file.content].join("\n")),
        ...(hiddenProductFileCount > 0 ? [`${hiddenProductFileCount} older product file(s) are capped in the current-first view.`] : []),
      ].join("\n\n---\n\n")
    : activeSection?.content ?? renderedPreview?.textPreview ?? "No product content is available yet.";
  const renderedPreviewText = (buildBlocked ? blockedPreviewText : renderedPreview?.textPreview ?? "").slice(0, PRODUCT_TEXT_LIMIT);
  const inlineProductPreviewText = (
    blockedPreviewText ||
    renderedPreview?.textPreview?.trim() ||
    primaryProductFile?.content?.trim() ||
    productFullText.trim()
  ).slice(0, PRODUCT_TEXT_LIMIT);
  const productQualityIssues = productFiles.flatMap((file) => (file.qualityIssues ?? []).map((issue) => `${file.fileName}: ${issue}`));
  const productQualityBlocked = productFiles.filter((file) => file.qualityStatus === "blocked").length;
  const productQualityAverage = productFiles.length
    ? Math.round(productFiles.reduce((total, file) => total + (file.qualityScore ?? 0), 0) / productFiles.length)
    : 0;
  const runtimeLabel = fallbackNotAccepted ? "Fallback Local - Not Accepted" : buildComplete ? "real openclaw + local files" : productionRun?.runtimeMode ? label(productionRun.runtimeMode) : preview?.generatedByAgents ? "real product factory" : "not generated yet";
  const monitorStatus = buildBlocked
    ? fallbackNotAccepted ? "Fallback Local - Not Accepted" : "Real OpenClaw Build Blocked"
    : buildComplete
      ? "Real OpenClaw Build Complete"
      : productionRun
        ? "Working now"
        : "Waiting for product generation";
  const sortedProductionPacks = useMemo(() => [...data.productionPacks].sort(byNewestUpdatedAt), [data.productionPacks]);
  const visibleProductionPacks = showAllLegacyPacks ? sortedProductionPacks : sortedProductionPacks.slice(0, LEGACY_PRODUCTION_PACK_LIMIT);
  const hiddenProductionPackCount = data.productionPacks.length - visibleProductionPacks.length;

  async function createPack() {
    if (!questId) return;
    await createProductionPack(questId);
  }

  async function createStaticSite() {
    if (!questId) return;
    await createSiteProject(questId);
  }

  async function createContentDraft() {
    const cluster = clusters[0];
    if (!cluster) return;
    await createContentItemFromCluster(cluster.id);
  }

  async function createDiff() {
    if (!siteProject) return;
    await prepareStaticSiteDiff(siteProject.id);
  }

  async function createOffer() {
    if (!questId) return;
    await createAffiliateOffer(questId);
  }

  async function approveDraft() {
    if (!preview) return;
    await approveProductLocalDraft(preview.id);
  }

  async function requestRevision() {
    if (!preview) return;
    await requestProductRevision(preview.id);
  }

  async function preparePublish() {
    if (!preview) return;
    await prepareProductPublishApproval(preview.id);
  }

  async function exportProofPack() {
    if (!preview) return;
    await exportProductProofPack(preview.id);
  }

  async function regenerateProduct() {
    if (!preview) return;
    setIsRegenerating(true);
    try {
      await regenerateProductWithAgents(preview.id);
    } finally {
      setIsRegenerating(false);
    }
  }

  async function openProductFile(path?: string) {
    if (!path) return;
    await revealProductPath(path);
  }

  function openViewer(tab: (typeof previewTabs)[number]["id"] = "full_draft") {
    setActiveTab(tab);
    setViewerOpen(true);
  }

  return (
    <div className="space-y-5">
      <NowCommandCenter compact />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-teal-100" />
            Product Studio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3">
            <p className="font-semibold text-stone-100">See the exact product before any publishing approval can be requested.</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              Product Studio is local-only. Local draft approval means you accept the draft for the next step; it does not publish, spend, message, log in, submit forms, purchase, or execute connectors.
            </p>
          </div>
          <div className="rounded-md border border-teal-300/20 bg-black/25 p-3 text-sm text-teal-100">
            Current-first Product Studio view: the selected business, current product run, and newest file records render first; older history stays available behind view-all controls.
          </div>
          <div className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3 text-sm leading-6 text-amber-50">
            Product Studio treats the Product Factory manifest as the source of truth. Only the accepted manifest files count as the product proof pack; any older files left in the same folder are legacy leftovers and are not part of the accepted product.
          </div>
          {data.approvedBusinesses.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
              No approved business product yet. Ask TeamLeader1A for a business proposal, then approve one from Mission Briefs.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Approved business</p>
                  <Select value={selectedBusiness?.id ?? ""} onChange={(event) => setBusinessId(event.target.value)}>
                    {visibleBusinesses.map((business) => (
                      <option key={business.id} value={business.id}>{business.name}</option>
                    ))}
                  </Select>
                  {hiddenBusinessCount > 0 ? (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-teal-100 hover:text-teal-50"
                      onClick={() => setShowAllBusinesses((value) => !value)}
                    >
                      {showAllBusinesses ? "Show recent businesses" : `View all ${data.approvedBusinesses.length} businesses`}
                    </button>
                  ) : null}
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Approval gate</p>
                      <p className="mt-1 font-semibold text-stone-100">{gate?.label ?? "Needs Product Review"}</p>
                    </div>
                    <Badge tone={gateTone(gate?.status ?? "needs_product_review")}>{gateLabel(gate?.status ?? "needs_product_review")}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{gate?.reason ?? "Review the local product draft before requesting any publish approval."}</p>
                  {pendingApproval ? (
                    <a className="mt-2 inline-flex text-sm font-semibold text-teal-100 hover:text-teal-50" href="#/approvals">
                      Open exact pending approval
                    </a>
                  ) : null}
                </div>
              </div>

              {selectedBusiness && preview && blueprint ? (
                <>
                  <div className={`rounded-lg border p-4 ${buildBlocked ? "border-red-300/25 bg-red-500/10" : buildComplete ? "border-emerald-300/25 bg-emerald-400/10" : "border-amber-300/25 bg-amber-400/10"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Badge tone={buildBlocked ? "red" : buildComplete ? "emerald" : "amber"}>Product Build Status</Badge>
                        <h3 className="mt-2 font-display text-2xl font-semibold text-stone-50">{monitorStatus}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {buildBlocked
                            ? `No fallback product is accepted. ${blockedReason}`
                            : buildComplete
                              ? `Real local product files exist at ${productManifest?.rootPath}. Review them before any publish approval.`
                              : "The product is not ready until real OpenClaw output and written local files exist."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant={buildBlocked ? "secondary" : "outline"} disabled={isRegenerating} onClick={() => void regenerateProduct()}>
                          <RefreshCw className="h-4 w-4" />
                          {isRegenerating ? "Building..." : buildBlocked ? "Retry Full Product Build" : "Regenerate with agents"}
                        </Button>
                        <Button variant="outline" disabled={!productManifest?.rootPath || buildBlocked} onClick={() => void openProductFile(productManifest?.rootPath)}>
                          <FolderOpen className="h-4 w-4" />
                          Open Product Folder
                        </Button>
                      </div>
                    </div>
                    {readinessGate?.failedAgentId ? (
                      <p className="mt-3 rounded-md border border-red-300/20 bg-black/25 p-3 text-sm text-red-100">
                        Failed agent: {label(readinessGate.failedAgentId)}. Retry will run the full product build again and will not publish, spend, message, log in, submit forms, purchase, or execute connectors.
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-amber-300/20 bg-gradient-to-br from-amber-400/12 via-black/30 to-teal-400/10 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="max-w-4xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="amber">Product Snapshot</Badge>
                          <ClarityBadge label={clarityLabelFromStatus(preview.status)} />
                          {pendingApproval ? (
                            <a href="#/approvals">
                              <Badge tone="amber">Pending Approval</Badge>
                            </a>
                          ) : (
                            <Badge tone="red">External Action Blocked</Badge>
                          )}
                        </div>
                        <h3 className="mt-3 font-display text-3xl font-semibold text-stone-50">{productDisplayName}</h3>
                        {productDisplayName !== blueprint.name ? (
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">Original proposal: {blueprint.name}</p>
                        ) : null}
                        <p className="mt-2 text-sm leading-6 text-slate-200">{blueprint.valueProposition}</p>
                      </div>
                      <div className="grid min-w-[260px] gap-2 text-sm">
                        <a className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-2 font-semibold text-teal-100 hover:bg-teal-400/15" href="#/businesses">
                          Open business cockpit
                        </a>
                        <Button variant="secondary" onClick={() => openViewer("full_draft")}>
                          <Eye className="h-4 w-4" />
                          {buildBlocked ? "View Blocked Build" : "View Product"}
                        </Button>
                        <Button variant="outline" disabled={!latestProductFile && assetFiles.length === 0} onClick={() => void openProductFile(latestProductFile?.path ?? assetFiles[0]?.intendedPath)}>
                          <FileText className="h-4 w-4" />
                          Open product file
                        </Button>
                          <Button variant="outline" disabled={buildBlocked || !productManifest?.rootPath} onClick={() => void openProductFile(productManifest?.rootPath)}>
                          <FolderOpen className="h-4 w-4" />
                          Open folder
                        </Button>
                        <Button variant="outline" disabled={!primaryProductFile?.path || buildBlocked} onClick={() => void openProductFile(primaryProductFile?.path)}>
                          <FileText className="h-4 w-4" />
                          Open README / Start file
                        </Button>
                        <Button variant="outline" disabled>
                          <RotateCcw className="h-4 w-4" />
                          Compare latest revision
                        </Button>
                        <Button variant="outline" disabled={isRegenerating} onClick={() => void regenerateProduct()}>
                          <RefreshCw className="h-4 w-4" />
                          {isRegenerating ? "Building..." : buildBlocked ? "Retry Full Product Build" : "Regenerate with agents"}
                        </Button>
                        <Button variant="outline" onClick={() => void exportProofPack()}>
                          <FileText className="h-4 w-4" />
                          Export Product Proof Pack
                        </Button>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-md border border-white/10 bg-black/25 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Buyer</p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">{blueprint.audience}</p>
                      </div>
                      <div className="rounded-md border border-white/10 bg-black/25 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Deliverable</p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">{blueprint.offerDeliverable}</p>
                      </div>
                      <div className="rounded-md border border-white/10 bg-black/25 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Destination</p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">{blueprint.intendedDestination}</p>
                      </div>
                      <div className="rounded-md border border-white/10 bg-black/25 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Latest receipt</p>
                        <p className="mt-2 text-sm leading-6 text-slate-200">{latestReceipt?.title ?? "No receipt yet"}</p>
                      </div>
                    </div>
                    {hasAcceptedManifest ? (
                      <div className="mt-4 rounded-md border border-emerald-300/20 bg-emerald-400/8 p-3 text-sm leading-6 text-emerald-50">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="emerald">Accepted Product Pack</Badge>
                          <Badge tone="emerald">{productFiles.length}/{acceptedRequiredCount} files</Badge>
                          <Badge tone="slate">Legacy folder files excluded</Badge>
                        </div>
                        <p className="mt-2 text-slate-200">
                          Review the files listed in Product Studio. The OS folder may contain older root-level files from previous test runs, but they do not count unless they appear in this accepted manifest.
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-md border border-emerald-300/20 bg-emerald-400/8 p-3">
                        <p className="text-xs font-semibold uppercase text-emerald-100">What exists</p>
                        <div className="mt-2 space-y-1 text-sm text-slate-200">
                          {(buildBlocked ? ["No real product files created yet"] : productFiles.length ? visibleProductFiles.map((file) => file.fileName) : assetFiles.length ? assetFiles.map((file) => file.title) : previewSections.map((section) => section.title)).slice(0, PRODUCT_FILE_LIMIT).map((item) => (
                            <p key={item}>- {item}</p>
                          ))}
                          {hiddenProductFileCount > 0 ? <p>- {hiddenProductFileCount} accepted manifest file(s) hidden by the compact view</p> : null}
                        </div>
                      </div>
                      <div className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3">
                        <p className="text-xs font-semibold uppercase text-amber-100">What is missing / next</p>
                        <div className="mt-2 space-y-1 text-sm text-slate-200">
                          {(preview.missingItems.length ? preview.missingItems : [gate?.reason ?? blueprint.nextProductionStep]).map((item) => (
                            <p key={item}>- {item}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className={`mt-4 rounded-lg border p-4 ${buildComplete ? "border-teal-300/25 bg-teal-400/10" : "border-amber-300/20 bg-black/30"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={buildComplete ? "emerald" : buildBlocked ? "red" : "amber"}>Exact Product Preview</Badge>
                            <Badge tone={buildComplete ? "emerald" : "slate"}>{buildComplete ? "Real Local Files Written" : "Not Ready Yet"}</Badge>
                          </div>
                          <h3 className="mt-2 font-display text-2xl font-semibold text-stone-50">
                            {primaryProductFile?.title ?? renderedPreview?.title ?? blueprint.name}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            {buildComplete
                              ? `This is the product content created by the agents and written under ${productManifest?.rootPath}. Review it here before approving any draft or publish request.`
                              : buildBlocked
                                ? `The product is not visible because the real build was blocked: ${blockedReason}`
                                : "The product will appear here after the real OpenClaw production run writes local files."}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" disabled={!buildComplete} onClick={() => openViewer("full_draft")}>
                            <Eye className="h-4 w-4" />
                            Open Full Viewer
                          </Button>
                          <Button variant="outline" disabled={!primaryProductFile?.path || buildBlocked} onClick={() => void openProductFile(primaryProductFile?.path)}>
                            <FileText className="h-4 w-4" />
                            Open Main File
                          </Button>
                        </div>
                      </div>
                      <pre className="mt-4 max-h-[560px] overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/45 p-4 text-sm leading-6 text-slate-100">
                        {inlineProductPreviewText || "No product text exists yet."}
                      </pre>
                      {productFiles.length ? (
                        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                          {visibleProductFiles.map((file) => (
                            <button
                              key={file.id}
                              className="rounded-md border border-white/10 bg-black/30 p-3 text-left text-sm hover:border-teal-200/35 hover:bg-teal-400/8"
                              type="button"
                              onClick={() => void openProductFile(file.path)}
                            >
                              <span className="block font-semibold text-stone-100">{file.fileName}</span>
                              <span className="mt-1 block text-xs text-slate-500">{label(file.runtimeMode)} / {label(file.status)}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className={`mt-4 rounded-lg border p-4 ${productQualityBlocked ? "border-red-300/25 bg-red-500/10" : productFiles.length ? "border-emerald-300/20 bg-emerald-400/8" : "border-white/10 bg-black/25"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={productQualityBlocked ? "red" : productFiles.length ? "emerald" : "slate"}>Product QA Gate</Badge>
                            {productFiles.length ? <Badge tone={productQualityBlocked ? "red" : "emerald"}>{productQualityAverage}/100 avg</Badge> : null}
                          </div>
                          <h3 className="mt-2 font-display text-xl font-semibold text-stone-100">
                            {productQualityBlocked ? "Product needs repair before review approval" : productFiles.length ? "Product files passed QA checks" : "Product QA waits for real files"}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            {readinessGate?.fileQualitySummary ?? "Mission Control checks each generated file for useful length, required sections, unresolved placeholders, prompt leakage, valid JSON, and approval boundaries."}
                          </p>
                        </div>
                        <div className="grid min-w-[220px] gap-2 text-sm text-slate-300">
                          <p><span className="text-slate-500">Files checked:</span> {productFiles.length}</p>
                          <p><span className="text-slate-500">Blocked files:</span> {productQualityBlocked}</p>
                          <p><span className="text-slate-500">Approval:</span> {productQualityBlocked ? "disabled until repaired" : buildComplete ? "local review allowed" : "waiting"}</p>
                        </div>
                      </div>
                      {productFiles.length ? (
                        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                          {visibleProductFiles.map((file) => (
                            <div key={`${file.id}-qa`} className="rounded-md border border-white/10 bg-black/30 p-3 text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-stone-100">{file.fileName}</p>
                                <Badge tone={file.qualityStatus === "blocked" ? "red" : file.qualityStatus === "warning" ? "amber" : "emerald"}>{file.qualityScore ?? 0}/100</Badge>
                              </div>
                              <p className="mt-2 text-xs uppercase text-slate-500">{label(file.qualityStatus ?? "not_checked")}</p>
                              <div className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
                                {(file.qualityIssues?.length ? file.qualityIssues : (file.qualityChecks ?? ["QA check recorded."]).slice(0, 2)).slice(0, 3).map((item) => (
                                  <p key={item}>- {item}</p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {hiddenProductFileCount > 0 ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-teal-300/20 bg-teal-400/8 p-3 text-sm text-teal-100">
                          <span>Current-first file view: showing {visibleProductFiles.length} of {productFiles.length} product files.</span>
                          <Button variant="outline" size="sm" onClick={() => setShowAllProductFiles((value) => !value)}>
                            {showAllProductFiles ? "Show fewer files" : "View all product files"}
                          </Button>
                        </div>
                      ) : null}
                      {productQualityIssues.length ? (
                        <div className="mt-4 rounded-md border border-red-300/20 bg-black/30 p-3 text-sm leading-6 text-red-100">
                          {productQualityIssues.slice(0, 6).map((issue) => <p key={issue}>- {issue}</p>)}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 rounded-lg border border-teal-300/20 bg-black/35 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Activity className="h-4 w-4 text-teal-100" />
                            <Badge tone={buildBlocked ? "red" : buildComplete ? "emerald" : "amber"}>Agent Reality Monitor</Badge>
                            <Badge tone={buildComplete ? "emerald" : buildBlocked ? "red" : "slate"}>{runtimeLabel}</Badge>
                          </div>
                          <h3 className="mt-2 font-display text-xl font-semibold text-stone-100">{monitorStatus}</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            {productionRun?.summary ?? "No product production run is attached yet. Regenerate with agents to produce local files."}
                          </p>
                        </div>
                        <div className="grid min-w-[280px] gap-2 text-sm text-slate-300">
                          <p><span className="text-slate-500">Track:</span> {productTrack?.label ?? "No track selected"}</p>
                          <p><span className="text-slate-500">Latest file:</span> {latestProductFile?.fileName ?? "None yet"}</p>
                          <p><span className="text-slate-500">Latest artifact:</span> {latestProductArtifact?.agentName ?? "None yet"}</p>
                          <p><span className="text-slate-500">Folder:</span> {productManifest?.rootPath ?? "Not written yet"}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {visibleProductArtifacts.map((artifact) => (
                          <div key={artifact.id} className="rounded-md border border-white/10 bg-black/30 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-stone-100">{artifact.agentName}</p>
                              <Badge tone={artifact.status === "complete" ? "emerald" : "red"}>{label(artifact.status)}</Badge>
                            </div>
                            <p className="mt-2 text-xs uppercase text-slate-500">{label(artifact.runtimeMode)}</p>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{artifact.markdown}</p>
                          </div>
                        ))}
                      </div>
                      {readinessGate ? (
                        <p className="mt-3 rounded-md border border-white/10 bg-black/25 p-3 text-sm leading-6 text-slate-300">
                          {readinessGate.summary} Publish approval is still locked until a real product build completes and you approve the local draft.
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-4 rounded-md border border-teal-300/20 bg-black/30 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <Badge tone={renderedPreview?.status === "ready" ? "emerald" : "red"}>Rendered Product Preview</Badge>
                          <h3 className="mt-2 font-display text-xl font-semibold text-stone-100">{renderedPreview?.title ?? "Rendered preview missing"}</h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {renderedPreview
                              ? `${label(renderedPreview.mode)} / local-only preview created ${formatDateTime(renderedPreview.createdAt)}`
                              : "Publish approval stays locked until a rendered local preview exists."}
                          </p>
                        </div>
                        <Button variant="secondary" disabled={!renderedPreview} onClick={() => openViewer("full_draft")}>
                          <Eye className="h-4 w-4" />
                          View rendered preview
                        </Button>
                      </div>
                      <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/35 p-4 text-sm leading-6 text-slate-100">
                        {renderedPreviewText ?? "No rendered product preview has been generated yet."}
                      </pre>
                    </div>
                    {lastExportResult ? (
                      <p className="mt-4 rounded-md border border-white/10 bg-black/25 p-3 text-xs text-slate-300">{lastExportResult.message}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 xl:grid-cols-4">
                    <div className="rounded-md border border-white/10 bg-black/25 p-3 xl:col-span-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">What the product is</p>
                      <h3 className="mt-2 font-display text-2xl font-semibold text-stone-100">{productDisplayName}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{blueprint.offerDeliverable}</p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/25 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Who it is for</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{blueprint.audience}</p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/25 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Where it goes</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{blueprint.intendedDestination}</p>
                      <Badge className="mt-2" tone="slate">{platformPackage?.userLoginRequired ? "manual login later" : "local/manual destination"}</Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-4">
                    <div className="rounded-md border border-emerald-300/20 bg-emerald-400/8 p-3">
                      <p className="text-xs font-semibold uppercase text-emerald-100">Budget boundary</p>
                      <p className="mt-2 text-sm leading-6 text-emerald-50">
                        Cap {formatCurrency(selectedBusiness.budgetPlan.businessBudgetCap)} / required spend {formatCurrency(selectedBusiness.budgetPlan.requiredSpend)} / recommended spend {formatCurrency(selectedBusiness.budgetPlan.recommendedSpend)}.
                      </p>
                    </div>
                    <div className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3">
                      <p className="text-xs font-semibold uppercase text-amber-100">Missing</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{preview.missingItems.length ? preview.missingItems.join(" / ") : "Nothing blocking local draft review."}</p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/25 p-3">
                      <p className="text-xs font-semibold uppercase text-slate-500">Accepted Product Files</p>
                      <p className="mt-2 text-2xl font-semibold text-stone-50">{productFiles.length || assetFiles.length}</p>
                    </div>
                    <div className="rounded-md border border-red-300/20 bg-red-500/8 p-3">
                      <p className="text-xs font-semibold uppercase text-red-100">Locked</p>
                      <p className="mt-2 text-sm leading-6 text-red-100">Publishing, spending, messaging, login, forms, purchases, and connectors.</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Badge tone={productManifest?.status === "written" ? "emerald" : "red"}>Local Product Files</Badge>
                        <h3 className="mt-2 font-display text-xl font-semibold text-stone-100">{productManifest?.rootPath ?? "No product folder yet"}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {buildBlocked ? "No real local files were accepted for this product build." : "These accepted manifest files are the product. Other files in the same OS folder are legacy leftovers unless listed here."}
                        </p>
                      </div>
                      <Button variant="outline" disabled={buildBlocked || !productManifest?.rootPath} onClick={() => void openProductFile(productManifest?.rootPath)}>
                        <FolderOpen className="h-4 w-4" />
                        Open folder
                      </Button>
                    </div>
                    {productFiles.length ? (
                      <>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {visibleProductFiles.map((file) => (
                            <div key={file.id} className="rounded-md border border-white/10 bg-black/35 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-stone-100">{file.fileName}</p>
                                <Badge tone={file.status === "written" && file.qualityStatus !== "blocked" ? "emerald" : "red"}>{label(file.qualityStatus ?? file.status)}</Badge>
                              </div>
                              <p className="mt-2 text-xs uppercase text-slate-500">{label(file.runtimeMode)}</p>
                              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{file.content}</p>
                              <Button className="mt-3" size="sm" variant="outline" onClick={() => void openProductFile(file.path)}>
                                <FileText className="h-4 w-4" />
                                Open file
                              </Button>
                            </div>
                          ))}
                        </div>
                        {hiddenProductFileCount > 0 ? (
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-teal-300/20 bg-teal-400/8 p-3 text-sm text-teal-100">
                            <span>Showing accepted manifest files first; {hiddenProductFileCount} accepted file(s) are hidden by the compact view.</span>
                            <Button variant="outline" size="sm" onClick={() => setShowAllProductFiles((value) => !value)}>
                              {showAllProductFiles ? "Show fewer files" : "View all product files"}
                            </Button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-4 rounded-md border border-amber-300/20 bg-amber-400/8 p-3 text-sm text-amber-100">
                        No real product file records exist yet. Retry the full product build to run OpenClaw production agents and write local files.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {previewTabs.map((tab) => (
                      <Button key={tab.id} size="sm" variant={activeTab === tab.id ? "secondary" : "ghost"} onClick={() => setActiveTab(tab.id)}>
                        {tab.label}
                      </Button>
                    ))}
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Badge tone={activeSection?.status === "blocked" ? "red" : activeSection?.status === "passed" ? "emerald" : "amber"}>
                          {label(activeSection?.status ?? "needs_review")}
                        </Badge>
                        <h3 className="mt-3 font-display text-xl font-semibold text-stone-100">{activeSection?.title ?? "Product preview"}</h3>
                        <p className="mt-1 text-sm text-slate-400">{activeSection?.summary}</p>
                      </div>
                      {activeTab === "claims_safety" ? <Badge tone="amber">Claims & Safety Check</Badge> : null}
                    </div>
                    {activeSection?.fields ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {Object.entries(activeSection.fields).map(([key, value]) => (
                          <div key={key} className="rounded-md border border-white/10 bg-black/25 p-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">{key}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{value}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <pre className="mt-4 max-h-[460px] overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-200">
                        {activeTab === "full_draft" ? productFullText : activeSection?.content}
                      </pre>
                    )}
                    {activeTab === "publishing_preview" && publishPayload ? (
                      <div className="mt-4 rounded-md border border-teal-300/20 bg-teal-400/8 p-3">
                        <p className="text-xs font-semibold uppercase text-teal-100">Frozen publish payload</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{publishPayload.contentSummary}</p>
                        <p className="mt-2 text-xs text-slate-500">{publishPayload.budgetBoundary}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-amber-100" />
                          Product Proof Pack
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                        <p className="rounded-md border border-white/10 bg-black/25 p-3">
                          One review bundle containing the full draft, platform fields, Product Files, Claims & Safety Check, evidence, budget plan, approval boundary, revision history, and receipts.
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {[
                            "Full product draft",
                            "Platform fields",
                            "Claims & Safety Check",
                            "Evidence and citations",
                            "Budget boundary",
                            "Approval boundary",
                          ].map((item) => (
                            <span key={item} className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-xs font-semibold text-slate-200">{item}</span>
                          ))}
                        </div>
                        <Button variant="secondary" onClick={() => void exportProofPack()}>
                          <FileText className="h-4 w-4" />
                          Export / Preview Proof Pack
                        </Button>
                      </CardContent>
                    </Card>
                    <ExecutionReceiptsPanel businessId={selectedBusiness.id} previewId={preview.id} limit={4} title="Product Receipts" />
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <div className="rounded-md border border-white/10 bg-black/25 p-3 text-sm leading-6 text-slate-300">
                      <p className="font-semibold text-stone-100">Preview gate</p>
                      <p className="mt-1">
                        Use View Product to inspect the full draft. Request Revision creates safe internal tasks. Approve Local Draft only unlocks the ability to request a pending publish approval.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" onClick={() => openViewer("full_draft")}>
                        <Eye className="h-4 w-4" />
                        {buildBlocked ? "View Blocked Build" : "View Product"}
                      </Button>
                      <Button variant="outline" onClick={() => void requestRevision()}>
                        <RotateCcw className="h-4 w-4" />
                        Request Revision
                      </Button>
                      <Button variant="secondary" disabled={buildBlocked || preview.localDraftApproved} onClick={() => void approveDraft()}>
                        <CheckCircle2 className="h-4 w-4" />
                        {preview.localDraftApproved ? "Local Draft Approved" : "Approve Local Draft"}
                      </Button>
                      <Button
                        disabled={buildBlocked || !preview.localDraftApproved || !renderedPreview || renderedPreview.status !== "ready" || gate?.status === "pending_approval" || gate?.status === "approved" || preview.claimsSafetyStatus === "blocked"}
                        onClick={() => void preparePublish()}
                      >
                        <ShieldAlert className="h-4 w-4" />
                        {gate?.status === "pending_approval" ? "Pending Approval" : "Prepare Publish Approval"}
                      </Button>
                    </div>
                  </div>
                  {!preview.localDraftApproved ? (
                    <p className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3 text-sm text-amber-100">
                      Prepare Publish Approval is disabled because the product has not been approved as a local draft yet.
                    </p>
                  ) : null}
                  {preview.localDraftApproved && !renderedPreview ? (
                    <p className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3 text-sm text-amber-100">
                      Prepare Publish Approval is disabled because a rendered product preview does not exist yet.
                    </p>
                  ) : null}
                  {buildBlocked ? (
                    <p className="rounded-md border border-red-300/20 bg-red-500/8 p-3 text-sm text-red-100">
                      Prepare Publish Approval is disabled because the real product build is blocked. No fallback product is accepted.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3 text-sm text-amber-100">
                  This approved business does not have a Product Studio preview yet. Restart or run the next safe business loop to migrate older records.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {viewerOpen && preview && blueprint ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-amber-300/30 bg-[#070605] shadow-2xl shadow-amber-950/30">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="amber">Product Viewer</Badge>
                  <Badge tone={productionRun?.runtimeMode === "real_openclaw" ? "emerald" : productionRun?.runtimeMode === "fallback_local" ? "amber" : "slate"}>{runtimeLabel}</Badge>
                  <Badge tone="red">External Action Blocked</Badge>
                </div>
                <h2 className="mt-2 font-display text-2xl font-semibold text-stone-50">{productDisplayName}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Inspect the exact local product before any publish approval can be requested.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setViewerOpen(false)} aria-label="Close product viewer">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="border-b border-white/10 p-3">
              <div className="flex flex-wrap gap-2">
                {previewTabs.map((tab) => (
                  <Button key={tab.id} size="sm" variant={activeTab === tab.id ? "secondary" : "ghost"} onClick={() => setActiveTab(tab.id)}>
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[1fr_340px]">
              <div className="min-h-0 overflow-auto p-5">
                {activeTab === "assets" ? (
                  <div className="space-y-3">
                    <h3 className="font-display text-xl font-semibold text-stone-100">Product Files</h3>
                    {productFiles.length ? (
                      visibleProductFiles.map((file) => (
                        <div key={file.id} className="rounded-md border border-white/10 bg-black/30 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-100">{file.title}</p>
                              <p className="mt-1 text-xs text-slate-500">{file.path}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => void openProductFile(file.path)}>
                              <FileText className="h-4 w-4" />
                              Open file
                            </Button>
                          </div>
                          <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/35 p-3 text-sm leading-6 text-slate-200">{file.content}</pre>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3 text-sm text-amber-100">No product files exist yet.</p>
                    )}
                  </div>
                ) : activeSection?.fields ? (
                  <div>
                    <h3 className="font-display text-xl font-semibold text-stone-100">{activeSection.title}</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {Object.entries(activeSection.fields).map(([key, value]) => (
                        <div key={key} className="rounded-md border border-white/10 bg-black/30 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">{key}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-display text-xl font-semibold text-stone-100">{activeSection?.title ?? "Full Product"}</h3>
                    {activeTab === "full_draft" && renderedPreview ? (
                      <div className="mt-4 rounded-md border border-teal-300/20 bg-teal-400/8 p-4">
                        <p className="text-xs font-semibold uppercase text-teal-100">Rendered preview</p>
                        <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-100">{renderedPreviewText}</pre>
                        {renderedPreview.textPreview.length > PRODUCT_TEXT_LIMIT ? (
                          <p className="mt-3 text-xs text-teal-100">Rendered preview text is capped in this modal; open the product file for the full artifact.</p>
                        ) : null}
                      </div>
                    ) : null}
                    <pre className="mt-4 whitespace-pre-wrap rounded-md border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-200">
                      {activeTab === "full_draft" ? productFullText : activeSection?.content ?? "No section content."}
                    </pre>
                  </div>
                )}
              </div>
              <div className="min-h-0 overflow-auto border-t border-white/10 bg-black/25 p-4 lg:border-l lg:border-t-0">
                <p className="text-xs font-semibold uppercase text-slate-500">Reality</p>
                <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                  <p><span className="text-slate-500">Status:</span> {monitorStatus}</p>
                  <p><span className="text-slate-500">Track:</span> {productTrack?.label ?? "Unknown"}</p>
                  <p><span className="text-slate-500">Files:</span> {productFiles.length}</p>
                  <p><span className="text-slate-500">Folder:</span> {productManifest?.rootPath ?? "Not written"}</p>
                  <p><span className="text-slate-500">Latest receipt:</span> {productReceipts[productReceipts.length - 1]?.title ?? latestReceipt?.title ?? "No receipt"}</p>
                  <p><span className="text-slate-500">External action:</span> blocked until separate approval</p>
                </div>
                <div className="mt-4 space-y-2">
                  <Button className="w-full" variant="secondary" disabled={buildBlocked || !productManifest?.rootPath} onClick={() => void openProductFile(productManifest?.rootPath)}>
                    <FolderOpen className="h-4 w-4" />
                    Open product folder
                  </Button>
                  <Button className="w-full" variant="outline" disabled={isRegenerating} onClick={() => void regenerateProduct()}>
                    <RefreshCw className="h-4 w-4" />
                    {isRegenerating ? "Generating..." : "Regenerate with agents"}
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => void exportProofPack()}>
                    <FileText className="h-4 w-4" />
                    Export proof pack
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Hammer className="h-4 w-4 text-amber-100" />
                Advanced / Legacy Production Tools
              </CardTitle>
              <p className="mt-1 text-sm text-slate-400">
                Older quest-based generators are hidden here. Product Studio is the primary place to review what agents created.
              </p>
            </div>
            <Button variant="outline" onClick={() => setLegacyOpen((value) => !value)}>
              {legacyOpen ? "Hide Legacy Tools" : "Show Legacy Tools"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {legacyOpen ? (
      <>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Production packs</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{data.productionPacks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Assets</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{data.productionAssets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Site projects</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{data.siteProjects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Content drafts</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{data.contentItems.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="h-4 w-4 text-amber-100" />
            Phase 10 Production Asset Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[360px_1fr_auto]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Quest</p>
            <Select value={questId} onChange={(event) => setQuestId(event.target.value)}>
              {data.quests.map((quest) => (
                <option key={quest.id} value={quest.id}>{quest.title}</option>
              ))}
            </Select>
          </div>
          <div className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3">
            <p className="font-semibold text-stone-100">{selectedQuest?.businessIdea ?? "Select a quest"}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              Production packs create local drafts, previews, and policy checks. They never publish or deploy.
            </p>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => void createPack()}>
              <Sparkles className="h-4 w-4" />
              Create Pack
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-100" />
            Phase 19-20 Static Site And Offer Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3">
              <p className="font-semibold text-stone-100">{siteProject?.name ?? "No static site project for this quest yet"}</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                {siteProject
                  ? `${siteProject.framework} output at ${siteProject.repoPath}. Git push, deployment, and public publishing are still locked.`
                  : "Create a local static-site project after SEO demand proof exists. It will generate Markdown and diffs for review only."}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button variant="secondary" onClick={() => void createStaticSite()}>
                <Sparkles className="h-4 w-4" />
                Create Site
              </Button>
              <Button variant="outline" disabled={clusters.length === 0} onClick={() => void createContentDraft()}>
                <FileText className="h-4 w-4" />
                Draft From SEO Cluster
              </Button>
              <Button variant="outline" disabled={!siteProject || siteContentItems.length === 0} onClick={() => void createDiff()}>
                <PackageCheck className="h-4 w-4" />
                Prepare Diff
              </Button>
              <Button variant="outline" onClick={() => void createOffer()}>
                <ShieldAlert className="h-4 w-4" />
                Create Offer
              </Button>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {siteProject ? (
              <div className="rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-stone-100">Publishing rules</p>
                  <Badge tone="red">{siteProject.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {siteProject.publishingRules.map((rule) => (
                    <p key={rule} className="text-sm leading-5 text-slate-300">{rule}</p>
                  ))}
                </div>
              </div>
            ) : null}
            {siteContentItems.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-stone-100">{item.title}</p>
                  <Badge tone={item.status === "blocked" ? "red" : item.status === "approved_local" ? "emerald" : "amber"}>{label(item.status)}</Badge>
                </div>
                <p className="mt-2 text-xs uppercase text-slate-500">{item.slug}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.outline.slice(0, 3).join(" / ")}</p>
              </div>
            ))}
            {siteDiffs.slice(0, 2).map((diff) => (
              <div key={diff.id} className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-stone-100">{diff.title}</p>
                  <Badge tone="amber">{label(diff.status)}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{diff.files.length} local file changes prepared for review.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {diff.riskFlags.map((flag) => <Badge key={flag} tone="red">{flag.replace(/_/g, " ")}</Badge>)}
                </div>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => void createBatchApprovalFromDiff(diff.id)}>
                  <ShieldAlert className="h-4 w-4" />
                  Create Batch Approval
                </Button>
              </div>
            ))}
            {affiliateOffers.slice(0, 3).map((offer) => (
              <div key={offer.id} className="rounded-md border border-red-300/20 bg-red-500/8 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-stone-100">{offer.name}</p>
                  <Badge tone={offer.status === "approved_local" ? "emerald" : offer.status === "blocked" ? "red" : "amber"}>{label(offer.status)}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{offer.program} / {offer.commissionModel}</p>
                <p className="mt-2 text-xs text-red-100">Disclosure required: {String(offer.disclosureRequired)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => void reviewAffiliateOffer(offer.id)}>
                    <CheckCircle2 className="h-4 w-4" />
                    Run Claims & Safety Check
                  </Button>
                  <Badge tone="red">No fake reviews</Badge>
                  <Badge tone="amber">Manual terms check</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {hiddenProductionPackCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-teal-300/20 bg-teal-400/8 p-3 text-sm text-teal-100">
              <span>Recent-first legacy production view: showing {visibleProductionPacks.length} of {data.productionPacks.length} packs.</span>
              <Button variant="outline" size="sm" onClick={() => setShowAllLegacyPacks((value) => !value)}>
                {showAllLegacyPacks ? "Show fewer packs" : "View all legacy packs"}
              </Button>
            </div>
          ) : null}
          {visibleProductionPacks.map((pack) => {
            const quest = data.quests.find((item) => item.id === pack.questId);
            const assets = data.productionAssets.filter((asset) => pack.assetIds.includes(asset.id));
            return (
              <Card key={pack.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge tone="teal">{quest?.title ?? pack.questId}</Badge>
                      <h3 className="mt-3 font-display text-xl font-semibold text-stone-100">{pack.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{pack.teamLeaderSummary}</p>
                    </div>
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(pack.status)}`}>{label(pack.status)}</span>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {assets.map((asset) => (
                      <div key={asset.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-stone-100">{asset.title}</p>
                          <Badge tone={asset.status === "approved_local" ? "emerald" : asset.status === "blocked" ? "red" : "amber"}>
                            {label(asset.status)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs uppercase text-slate-500">{label(asset.type)}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{asset.localPreview}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {asset.policyChecks.map((check) => (
                            <Badge key={check} tone={check.toLowerCase().includes("locked") || check.toLowerCase().includes("approval") ? "red" : "slate"}>
                              {check}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          disabled={asset.status === "approved_local" || asset.status === "blocked"}
                          onClick={() => void advanceProductionAsset(asset.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Advance Review
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-100" />
              Review Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedProductionPacks[0] ? (
              <>
                {sortedProductionPacks[0].reviewChecklist.map((check) => (
                  <div key={check} className="flex gap-2 rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-100" />
                    {check}
                  </div>
                ))}
                <div className="rounded-md border border-red-300/20 bg-red-500/8 p-3 text-sm leading-6 text-red-100">
                  <Lock className="mb-2 h-4 w-4" />
                  Approval is still required for publishing, launch, outreach, external automation, spend, and live OpenClaw commands.
                </div>
                <p className="text-xs text-slate-500">Updated {formatDateTime(sortedProductionPacks[0].updatedAt)}</p>
              </>
            ) : (
              <p className="text-sm text-slate-300">Create a pack to see Claims & Safety Check and production QA controls.</p>
            )}
            <div className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3 text-sm leading-6 text-amber-100">
              <ShieldAlert className="mb-2 h-4 w-4" />
              This pipeline creates local artifacts only. It does not publish, buy traffic, submit forms, send outreach, or make public claims.
            </div>
          </CardContent>
        </Card>
      </div>
      </>
      ) : null}
    </div>
  );
}
