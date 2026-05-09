import { AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck, XCircle } from "lucide-react";
import type { ValidationChecklistItem, ValidationReport } from "../../types";
import { calculateValidationCompletion } from "../../utils/scoring";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { formatCurrency, statusTone } from "../../utils/formatting";
import { useAppData } from "../../app/AppDataContext";

function ChecklistIcon({ item }: { item: ValidationChecklistItem }) {
  if (item.status === "passed") return <CheckCircle2 className="h-4 w-4 text-emerald-200" />;
  if (item.status === "missing") return <XCircle className="h-4 w-4 text-red-200" />;
  return <HelpCircle className="h-4 w-4 text-amber-200" />;
}

function ProofPanel({ report }: { report: ValidationReport }) {
  return (
    <div className="rounded-lg border border-amber-300/25 bg-amber-400/8 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-100">
        <ShieldCheck className="h-4 w-4" />
        Proof Before Launch
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Why it might work</p>
          <p className="mt-1 text-sm leading-6 text-slate-200">{report.whyItMightWork}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Why it might fail</p>
          <p className="mt-1 text-sm leading-6 text-slate-200">{report.whyItMightFail}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Minimum test</p>
          <p className="mt-1 text-sm leading-6 text-slate-200">{report.minimumTest}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Budget needed</p>
          <p className="mt-1 text-sm font-semibold text-emerald-100">{formatCurrency(report.budgetNeeded)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Success means</p>
          <p className="mt-1 text-sm leading-6 text-slate-200">{report.successDefinition}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Kill criteria</p>
          <p className="mt-1 text-sm leading-6 text-slate-200">{report.killCriteria}</p>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">TeamLeader1A recommendation</p>
        <p className="mt-1 text-sm leading-6 text-stone-200">{report.teamLeaderRecommendation}</p>
      </div>
    </div>
  );
}

export function ValidationGate({ limit }: { limit?: number }) {
  const { data } = useAppData();
  const { quests, validationReports } = data;
  const list = typeof limit === "number" ? validationReports.slice(0, limit) : validationReports;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Business Idea Validation Gate</CardTitle>
            <p className="mt-1 text-sm text-slate-400">Every launch must prove audience, demand, cost, risk, and a test plan first.</p>
          </div>
          <Badge tone="red">Launch locked by default</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {list.map((report) => {
          const quest = quests.find((item) => item.id === report.questId);
          const completion = calculateValidationCompletion(report);
          return (
            <div key={report.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-stone-100">{quest?.title ?? report.questId}</h3>
                  <p className="mt-1 text-sm text-slate-400">{quest?.businessIdea}</p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${statusTone(report.status)}`}>
                  {report.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-slate-400">
                  <span>Validation checklist</span>
                  <span>{completion}%</span>
                </div>
                <Progress value={completion} tone={completion > 75 ? "emerald" : "amber"} />
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {report.checklist.map((item) => (
                  <div key={item.id} className="rounded-md border border-white/10 bg-zinc-950/55 p-3">
                    <div className="flex items-center gap-2">
                      <ChecklistIcon item={item} />
                      <p className="text-sm font-semibold text-stone-200">{item.label}</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{item.evidence}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-md border border-red-300/20 bg-red-500/8 p-3 text-sm text-red-100">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Spending, publishing, launching, or external automation requires user approval.
              </div>
              <div className="mt-4">
                <ProofPanel report={report} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
