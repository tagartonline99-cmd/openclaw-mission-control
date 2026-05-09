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
  const { data, createProductionPack, advanceProductionAsset } = useAppData();
  const [questId, setQuestId] = useState(data.quests[0]?.id ?? "");
  const selectedQuest = data.quests.find((quest) => quest.id === questId);

  async function createPack() {
    if (!questId) return;
    await createProductionPack(questId);
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
            <p className="text-xs uppercase text-slate-500">Ready review</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{data.productionPacks.filter((pack) => pack.status === "ready_for_review").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Published</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">0</p>
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
