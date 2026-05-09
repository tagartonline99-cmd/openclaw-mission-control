import { useState } from "react";
import { Activity, BarChart3, FlaskConical, Gauge, LineChart, Play, ShieldCheck, TrendingUp } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import { formatCurrency, formatDateTime, statusTone } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import { Select } from "../ui/select";

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function ExperimentAnalyticsWorkbench() {
  const { data, createExperimentPlan, analyzeExperiment, syncSearchConsoleReadOnly, createLearningDecision } = useAppData();
  const [questId, setQuestId] = useState(data.quests[0]?.id ?? "");
  const [title, setTitle] = useState("Bounded validation experiment");
  const [hypothesis, setHypothesis] = useState("A small reversible test can validate demand before any larger production, publishing, or spend.");
  const [budgetCap, setBudgetCap] = useState(0);
  const [metricLabel, setMetricLabel] = useState("Qualified validation signals");
  const [metricTarget, setMetricTarget] = useState(10);
  const [failureLabel, setFailureLabel] = useState("Critical failure signal");

  async function createPlan() {
    if (!questId) return;
    await createExperimentPlan({
      questId,
      title,
      hypothesis,
      budgetCap,
      successMetricLabel: metricLabel,
      successMetricTarget: metricTarget,
      failureMetricLabel: failureLabel,
    });
  }

  const latestAnalysis = data.experimentAnalyses[0];
  const latestSnapshot = data.analyticsSnapshots[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Experiments</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{data.experiments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Analyses</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{data.experimentAnalyses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Planned spend</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{formatCurrency(data.experiments.reduce((total, item) => total + item.budgetCap, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">GSC snapshots</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{data.analyticsSnapshots.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-teal-100" />
            Phase 9 Experiment Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Quest</p>
            <Select value={questId} onChange={(event) => setQuestId(event.target.value)}>
              {data.quests.map((quest) => (
                <option key={quest.id} value={quest.id}>{quest.title}</option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Experiment title</p>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Budget cap</p>
            <Input type="number" value={budgetCap} onChange={(event) => setBudgetCap(Number(event.target.value) || 0)} />
          </div>
          <div className="xl:col-span-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Hypothesis</p>
            <textarea
              value={hypothesis}
              onChange={(event) => setHypothesis(event.target.value)}
              className="min-h-20 w-full rounded-md border border-white/10 bg-black/30 p-3 text-sm leading-6 text-stone-100 outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Success metric</p>
            <Input value={metricLabel} onChange={(event) => setMetricLabel(event.target.value)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Target</p>
            <Input type="number" value={metricTarget} onChange={(event) => setMetricTarget(Number(event.target.value) || 1)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Failure metric</p>
            <Input value={failureLabel} onChange={(event) => setFailureLabel(event.target.value)} />
          </div>
          <div className="xl:col-span-3">
            <Button onClick={() => void createPlan()}>
              <Play className="h-4 w-4" />
              Create Local Experiment Plan
            </Button>
            <Button variant="secondary" className="ml-2" onClick={() => void syncSearchConsoleReadOnly(questId)}>
              <BarChart3 className="h-4 w-4" />
              Sync Read-Only GSC Snapshot
            </Button>
            <Button variant="outline" className="ml-2" onClick={() => void createLearningDecision(questId)}>
              <ShieldCheck className="h-4 w-4" />
              Create Learning Decision
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 xl:grid-cols-2">
          {data.experiments.map((experiment) => {
            const quest = data.quests.find((item) => item.id === experiment.questId);
            const analysis = data.experimentAnalyses.find((item) => item.experimentId === experiment.id);
            return (
              <Card key={experiment.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge tone="teal">{quest?.title ?? experiment.questId}</Badge>
                      <h3 className="mt-3 font-display text-xl font-semibold text-stone-100">{experiment.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{experiment.hypothesis}</p>
                    </div>
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(experiment.status)}`}>{experiment.status}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {experiment.metrics.map((metric) => {
                      const value = typeof metric.value === "number" && typeof metric.target === "number"
                        ? Math.min((metric.value / Math.max(metric.target, 1)) * 100, 100)
                        : 0;
                      return (
                        <div key={metric.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                          <div className="mb-2 flex justify-between gap-3">
                            <p className="text-sm font-semibold text-stone-100">{metric.label}</p>
                            <Badge tone={metric.status === "healthy" ? "emerald" : "amber"}>{metric.status}</Badge>
                          </div>
                          <Progress value={value} tone={metric.status === "healthy" ? "emerald" : "amber"} />
                          <p className="mt-2 text-sm text-amber-100">{metric.value} / {metric.target}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Learning</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{experiment.learning}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge tone="emerald">Cap {formatCurrency(experiment.budgetCap)}</Badge>
                    <Badge tone="slate">{formatDateTime(experiment.startDate)}</Badge>
                    {analysis ? <Badge tone="violet">{label(analysis.recommendation)}</Badge> : null}
                    <Button variant="outline" size="sm" onClick={() => void analyzeExperiment(experiment.id)}>
                      <LineChart className="h-4 w-4" />
                      Analyze
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-amber-100" />
              Analytics Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestAnalysis ? (
              <>
                <div className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><TrendingUp className="h-3.5 w-3.5" /> Recommendation</p>
                  <p className="mt-2 font-semibold text-stone-100">{label(latestAnalysis.recommendation)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{latestAnalysis.notes}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><Activity className="h-3.5 w-3.5" /> Confidence</p>
                  <Progress value={latestAnalysis.confidenceScore} tone={latestAnalysis.confidenceScore >= 70 ? "emerald" : "amber"} className="mt-2" />
                  <p className="mt-2 text-sm text-amber-100">{latestAnalysis.confidenceScore}/100 / {latestAnalysis.evidenceStrength}</p>
                </div>
                <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3 text-sm leading-6 text-teal-100">
                  <ShieldCheck className="mb-2 h-4 w-4" />
                  Scale, launch, spend, publishing, and external automation remain separate approval-gated actions.
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-300">Analyze an experiment to generate a confidence score and recommendation.</p>
            )}
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><BarChart3 className="h-3.5 w-3.5" /> Read-only integrations</p>
              {latestSnapshot ? (
                <div className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
                  <p className="font-semibold text-stone-100">{latestSnapshot.title}</p>
                  <p>{latestSnapshot.impressions} impressions / {latestSnapshot.clicks} clicks / {Math.round(latestSnapshot.ctr * 1000) / 10}% CTR / avg position {Math.round(latestSnapshot.averagePosition * 10) / 10}</p>
                  <p className="text-teal-100">{latestSnapshot.teamLeaderSummary}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Google Search Console is read-only first. Use the snapshot button to record local/manual metrics until OAuth secure storage is connected.
                </p>
              )}
              <div className="mt-3 space-y-2">
                {data.analyticsConnectors.map((connector) => (
                  <div key={connector.id} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/25 p-2">
                    <span className="text-sm text-slate-300">{connector.type.replace(/_/g, " ")}</span>
                    <Badge tone={connector.status === "connected" ? "emerald" : "amber"}>{connector.status.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Learning loop</p>
              {data.experimentDecisions.slice(0, 3).map((decision) => (
                <div key={decision.id} className="mt-3 rounded-md border border-white/10 bg-black/25 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-stone-100">{label(decision.decision)}</span>
                    <Badge tone={decision.approvalRequired ? "red" : "teal"}>{decision.approvalRequired ? "approval needed" : "local"}</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-300">{decision.nextAction}</p>
                </div>
              ))}
              {data.learningCards.slice(0, 2).map((card) => (
                <p key={card.id} className="mt-3 text-sm leading-6 text-amber-100">{card.reusableLesson}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
