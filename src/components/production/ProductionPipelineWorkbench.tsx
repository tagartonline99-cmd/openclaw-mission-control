import { useState } from "react";
import { CheckCircle2, Eye, FileText, Hammer, Lock, PackageCheck, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
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

export function ProductionPipelineWorkbench() {
  const {
    data,
    approveProductLocalDraft,
    requestProductRevision,
    prepareProductPublishApproval,
    exportProductProofPack,
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
  const selectedQuest = data.quests.find((quest) => quest.id === questId);
  const siteProject = data.siteProjects.find((site) => site.questIds.includes(questId));
  const clusters = data.seoKeywordClusters.filter((cluster) => cluster.questId === questId);
  const siteContentItems = siteProject ? data.contentItems.filter((item) => item.siteProjectId === siteProject.id) : [];
  const siteDiffs = siteProject ? data.publishingDiffs.filter((diff) => diff.siteProjectId === siteProject.id) : [];
  const affiliateOffers = data.affiliateOffers.filter((offer) => offer.questId === questId);
  const selectedBusiness = data.approvedBusinesses.find((business) => business.id === businessId) ?? data.approvedBusinesses[0];
  const preview = selectedBusiness ? data.productPreviews.find((item) => item.businessId === selectedBusiness.id) : undefined;
  const blueprint = preview ? data.productBlueprints.find((item) => item.id === preview.blueprintId) : undefined;
  const gate = preview?.approvalGateStateId ? data.approvalGateStates.find((item) => item.id === preview.approvalGateStateId) : undefined;
  const previewSections = preview ? data.productPreviewSections.filter((section) => preview.sectionIds.includes(section.id)) : [];
  const activeSection = previewSections.find((section) => section.kind === activeTab) ?? previewSections[0];
  const assetFiles = preview ? data.localAssetFiles.filter((file) => preview.assetFileIds.includes(file.id)) : [];
  const destination = preview?.destinationId ? data.productionDestinations.find((item) => item.id === preview.destinationId) : undefined;
  const platformPackage = preview?.platformPackageId ? data.platformExecutionPackages.find((item) => item.id === preview.platformPackageId) : undefined;
  const publishPayload = preview?.publishPayloadPreviewId ? data.publishPayloadPreviews.find((item) => item.id === preview.publishPayloadPreviewId) : undefined;
  const pendingApproval = gate?.approvalId ? data.approvalRequests.find((item) => item.id === gate.approvalId) : undefined;
  const latestReceipt = preview
    ? data.executionReceipts.find((receipt) => receipt.businessId === preview.businessId || receipt.proposalId === preview.proposalId)
    : undefined;

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
                    {data.approvedBusinesses.map((business) => (
                      <option key={business.id} value={business.id}>{business.name}</option>
                    ))}
                  </Select>
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
                        <h3 className="mt-3 font-display text-3xl font-semibold text-stone-50">{blueprint.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-200">{blueprint.valueProposition}</p>
                      </div>
                      <div className="grid min-w-[260px] gap-2 text-sm">
                        <a className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-2 font-semibold text-teal-100 hover:bg-teal-400/15" href="#/businesses">
                          Open business cockpit
                        </a>
                        <Button variant="secondary" onClick={() => setActiveTab("full_draft")}>
                          <Eye className="h-4 w-4" />
                          Exact preview
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
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-md border border-emerald-300/20 bg-emerald-400/8 p-3">
                        <p className="text-xs font-semibold uppercase text-emerald-100">What exists</p>
                        <div className="mt-2 space-y-1 text-sm text-slate-200">
                          {(assetFiles.length ? assetFiles.map((file) => file.title) : previewSections.map((section) => section.title)).slice(0, 6).map((item) => (
                            <p key={item}>- {item}</p>
                          ))}
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
                    {lastExportResult ? (
                      <p className="mt-4 rounded-md border border-white/10 bg-black/25 p-3 text-xs text-slate-300">{lastExportResult.message}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 xl:grid-cols-4">
                    <div className="rounded-md border border-white/10 bg-black/25 p-3 xl:col-span-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">What the product is</p>
                      <h3 className="mt-2 font-display text-2xl font-semibold text-stone-100">{blueprint.name}</h3>
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
                      <p className="text-xs font-semibold uppercase text-slate-500">Product Files</p>
                      <p className="mt-2 text-2xl font-semibold text-stone-50">{assetFiles.length}</p>
                    </div>
                    <div className="rounded-md border border-red-300/20 bg-red-500/8 p-3">
                      <p className="text-xs font-semibold uppercase text-red-100">Locked</p>
                      <p className="mt-2 text-sm leading-6 text-red-100">Publishing, spending, messaging, login, forms, purchases, and connectors.</p>
                    </div>
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
                      <pre className="mt-4 max-h-[460px] overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-200">{activeSection?.content}</pre>
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
                      <Button variant="outline" onClick={() => setActiveTab("full_draft")}>
                        <Eye className="h-4 w-4" />
                        View Product
                      </Button>
                      <Button variant="outline" onClick={() => void requestRevision()}>
                        <RotateCcw className="h-4 w-4" />
                        Request Revision
                      </Button>
                      <Button variant="secondary" disabled={preview.localDraftApproved} onClick={() => void approveDraft()}>
                        <CheckCircle2 className="h-4 w-4" />
                        {preview.localDraftApproved ? "Local Draft Approved" : "Approve Local Draft"}
                      </Button>
                      <Button
                        disabled={!preview.localDraftApproved || gate?.status === "pending_approval" || gate?.status === "approved" || preview.claimsSafetyStatus === "blocked"}
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
          {data.productionPacks.map((pack) => {
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
            {data.productionPacks[0] ? (
              <>
                {data.productionPacks[0].reviewChecklist.map((check) => (
                  <div key={check} className="flex gap-2 rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-100" />
                    {check}
                  </div>
                ))}
                <div className="rounded-md border border-red-300/20 bg-red-500/8 p-3 text-sm leading-6 text-red-100">
                  <Lock className="mb-2 h-4 w-4" />
                  Approval is still required for publishing, launch, outreach, external automation, spend, and live OpenClaw commands.
                </div>
                <p className="text-xs text-slate-500">Updated {formatDateTime(data.productionPacks[0].updatedAt)}</p>
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
