import { useState } from "react";
import { CheckCircle2, FileText, Hammer, Lock, PackageCheck, ShieldAlert, Sparkles } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import { formatDateTime, statusTone } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select } from "../ui/select";

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function ProductionPipelineWorkbench() {
  const {
    data,
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
  const selectedQuest = data.quests.find((quest) => quest.id === questId);
  const siteProject = data.siteProjects.find((site) => site.questIds.includes(questId));
  const clusters = data.seoKeywordClusters.filter((cluster) => cluster.questId === questId);
  const siteContentItems = siteProject ? data.contentItems.filter((item) => item.siteProjectId === siteProject.id) : [];
  const siteDiffs = siteProject ? data.publishingDiffs.filter((diff) => diff.siteProjectId === siteProject.id) : [];
  const affiliateOffers = data.affiliateOffers.filter((offer) => offer.questId === questId);

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

  return (
    <div className="space-y-5">
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
                    Run Claim Review
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
              <p className="text-sm text-slate-300">Create a pack to see claim review and production QA controls.</p>
            )}
            <div className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3 text-sm leading-6 text-amber-100">
              <ShieldAlert className="mb-2 h-4 w-4" />
              This pipeline creates local artifacts only. It does not publish, buy traffic, submit forms, send outreach, or make public claims.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
