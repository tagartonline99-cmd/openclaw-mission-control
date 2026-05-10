import { Archive, BriefcaseBusiness, ExternalLink, FileText, Pause, Play, ShieldAlert, Sparkles } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import { formatDateTime } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";

export function BusinessesWorkbench() {
  const { data } = useAppData();
  const activeBusinesses = data.approvedBusinesses.filter((business) => business.status !== "archived");

  if (activeBusinesses.length === 0) {
    const readyProposal = data.businessProposals.find((proposal) => proposal.status === "ready_for_review");
    return (
      <Card>
        <CardContent className="p-6">
          <Badge tone={readyProposal ? "amber" : "slate"}>{readyProposal ? "proposal ready" : "no approved businesses yet"}</Badge>
          <h3 className="mt-3 font-display text-2xl font-semibold text-stone-50">Businesses appear only after you approve a TeamLeader proposal</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            TeamLeader1A and the agents must finish a proposal first. Approve it from Mission Briefs, and the business dashboard will appear here.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={readyProposal ? `#/mission-briefs?proposal=${readyProposal.id}` : "#/"}>
              <Button variant="secondary">
                <Sparkles className="h-4 w-4" />
                {readyProposal ? "Review Proposal" : "Go to Command"}
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Active businesses</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{activeBusinesses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Avg validation</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-100">
              {Math.round(activeBusinesses.reduce((sum, item) => sum + item.validationScore, 0) / activeBusinesses.length)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Content assets</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{data.contentInventoryItems.filter((item) => item.businessId).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Locked actions</p>
            <p className="mt-2 text-2xl font-semibold text-red-100">external</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {activeBusinesses.map((business) => {
          const proposal = data.businessProposals.find((item) => item.id === business.proposalId);
          const destinations = data.productionDestinations.filter((item) => business.publishingDestinationIds.includes(item.id));
          const content = data.contentInventoryItems.filter((item) => business.contentInventoryIds.includes(item.id));
          const evidence = data.researchEvidence.filter((item) => business.researchEvidenceIds.includes(item.id));
          const tasks = data.businessTasks.filter((task) => business.activeTaskIds.includes(task.id) || task.businessId === business.id);
          const run = data.autonomousImprovementRuns.find((item) => item.businessId === business.id);
          return (
            <Card key={business.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge tone={business.status === "active" ? "teal" : "amber"}>{business.status}</Badge>
                    <CardTitle className="mt-3 flex items-center gap-2">
                      <BriefcaseBusiness className="h-4 w-4 text-amber-100" />
                      {business.name}
                    </CardTitle>
                  </div>
                  <Badge tone="emerald">{business.validationScore}% validation</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-slate-300">{business.teamLeaderRecommendation}</p>
                <div>
                  <div className="mb-1 flex justify-between text-xs uppercase text-slate-500">
                    <span>Business stage</span>
                    <span>{business.stage}</span>
                  </div>
                  <Progress value={business.validationScore} tone="teal" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Next action</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{business.nextAction}</p>
                  </div>
                  <div className="rounded-md border border-red-300/20 bg-red-500/8 p-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase text-red-100">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Approval locked
                    </p>
                    <p className="mt-1 text-sm leading-6 text-red-100">Publishing, messaging, spending, connector execution, launch, and forms.</p>
                  </div>
                </div>
                <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Publishing destinations</p>
                  <div className="mt-2 space-y-2">
                    {destinations.map((destination) => (
                      <div key={destination.id} className="rounded-md border border-white/10 bg-black/25 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-stone-100">{destination.name}</span>
                          <Badge tone={destination.approvalRequired ? "red" : "teal"}>{destination.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{destination.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                      <FileText className="h-3.5 w-3.5" />
                      Content inventory
                    </p>
                    <div className="mt-2 space-y-2">
                      {content.slice(0, 3).map((item) => <p key={item.id} className="text-sm text-slate-300">{item.title}</p>)}
                    </div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/25 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Evidence</p>
                    <div className="mt-2 space-y-2">
                      {evidence.slice(0, 3).map((item) => <p key={item.id} className="text-sm text-slate-300">{item.title}</p>)}
                    </div>
                  </div>
                </div>
                {run ? (
                  <div className="rounded-md border border-emerald-300/20 bg-emerald-400/8 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-stone-100">Autonomous improvement</p>
                      <Badge tone={run.status === "running" ? "emerald" : "amber"}>{run.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{run.currentFocus}</p>
                    <p className="mt-2 text-xs text-slate-500">Updated {formatDateTime(run.updatedAt)}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <a href={`#/mission-briefs?proposal=${business.proposalId}`}>
                    <Button variant="secondary" size="sm">
                      <ExternalLink className="h-4 w-4" />
                      View proposal
                    </Button>
                  </a>
                  <Button variant="outline" size="sm" disabled>
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <Play className="h-4 w-4" />
                    Resume
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                </div>
                {proposal ? <p className="text-xs text-slate-500">Source proposal: {proposal.title}</p> : null}
                {tasks.length > 0 ? <p className="text-xs text-slate-500">{tasks.length} linked tasks are tracked in the Tasks tab.</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
