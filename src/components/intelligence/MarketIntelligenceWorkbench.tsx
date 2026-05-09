import { useState } from "react";
import { BarChart3, BookOpen, ExternalLink, Search, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import { formatDateTime, statusTone } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Select } from "../ui/select";

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function MarketIntelligenceWorkbench() {
  const { data, createMarketIntelligenceReport, requestUrlResearch } = useAppData();
  const [questId, setQuestId] = useState(data.quests[0]?.id ?? "");
  const selectedQuest = data.quests.find((quest) => quest.id === questId);
  const reports = data.marketIntelligenceReports;
  const questReports = reports.filter((report) => report.questId === questId);
  const latestReport = questReports[0] ?? reports[0];

  async function createReport() {
    if (!questId) return;
    await createMarketIntelligenceReport(questId);
  }

  function requestApprovedResearch(reportId: string) {
    const report = data.marketIntelligenceReports.find((item) => item.id === reportId);
    if (!report) return;
    void requestUrlResearch({
      purpose: `Collect approved market evidence for ${report.title}`,
      urls: report.sourceUrls.length > 0 ? report.sourceUrls : ["https://example.com"],
      extractionGoal: "Summarize page title/status, demand evidence, competitor positioning, pricing signals, citations, and policy risks.",
      riskNotes: "Approved URLs only. No login, no form submission, no purchases, no PII harvesting, no publishing.",
      successCriteria: "TeamLeader1A can cite useful evidence or fail safely if the capability is unavailable.",
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Reports</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{reports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Demand signals</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{reports.reduce((total, report) => total + report.demandSignals.length, 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Keyword ops</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{reports.reduce((total, report) => total + report.keywordOpportunities.length, 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Avg evidence</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">
              {reports.length ? Math.round(reports.reduce((total, report) => total + report.evidenceScore, 0) / reports.length) : 0}/100
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-amber-100" />
            Phase 8 Research And SEO Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[360px_1fr_auto]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Quest</p>
            <Select value={questId} onChange={(event) => setQuestId(event.target.value)}>
              {data.quests.map((quest) => (
                <option key={quest.id} value={quest.id}>
                  {quest.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3">
            <p className="font-semibold text-stone-100">{selectedQuest?.businessIdea ?? "Select a quest"}</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              Market reports use stored evidence first. Live URL research remains a separate approval request.
            </p>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => void createReport()}>
              <Sparkles className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge tone="teal">{data.quests.find((quest) => quest.id === report.questId)?.title ?? report.questId}</Badge>
                    <h3 className="mt-3 font-display text-xl font-semibold text-stone-100">{report.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{report.teamLeaderSummary}</p>
                  </div>
                  <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(report.status)}`}>{label(report.status)}</span>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs uppercase text-slate-500">
                    <span>Evidence score</span>
                    <span>{report.evidenceScore}/100</span>
                  </div>
                  <Progress value={report.evidenceScore} tone={report.evidenceScore >= 65 ? "emerald" : "amber"} />
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><Target className="h-3.5 w-3.5" /> Demand</p>
                    <div className="mt-2 space-y-2">
                      {report.demandSignals.map((signal) => (
                        <p key={signal.id} className="text-sm leading-5 text-slate-300">{signal.signal}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><BarChart3 className="h-3.5 w-3.5" /> Competitors</p>
                    <div className="mt-2 space-y-2">
                      {report.competitorSnapshots.map((competitor) => (
                        <p key={competitor.id} className="text-sm leading-5 text-slate-300">{competitor.gap}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><BookOpen className="h-3.5 w-3.5" /> Keywords</p>
                    <div className="mt-2 space-y-2">
                      {report.keywordOpportunities.map((keyword) => (
                        <p key={keyword.id} className="text-sm leading-5 text-slate-300">{keyword.keyword} / {keyword.confidence}%</p>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => requestApprovedResearch(report.id)}>
                    <ExternalLink className="h-4 w-4" />
                    Request Approved URL Research
                  </Button>
                  <Badge tone="red">No uncontrolled scraping</Badge>
                  <Badge tone="amber">Citations need approval</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-100" />
              Evidence Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestReport ? (
              <>
                <div className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Next step</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{latestReport.recommendedNextStep}</p>
                </div>
                {latestReport.risks.map((risk) => (
                  <div key={risk} className="rounded-md border border-red-300/20 bg-red-500/8 p-3 text-sm text-red-100">
                    {risk}
                  </div>
                ))}
                <p className="text-xs text-slate-500">Updated {formatDateTime(latestReport.updatedAt)}</p>
              </>
            ) : (
              <p className="text-sm text-slate-300">Generate a report to see evidence review details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
