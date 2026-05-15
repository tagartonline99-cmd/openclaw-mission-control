import { ArrowRight, ClipboardList, FileText, Link2 } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import type { AgentEvidenceTrail, BusinessTask, RealityMode } from "../../types";
import { formatDateTime } from "../../utils/formatting";
import { RealityPill } from "../reality/RealityMeter";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

function label(value: string) {
  return value.replace(/_/g, " ");
}

type RenderTrail = AgentEvidenceTrail & { fallbackTaskId?: string };

function taskRealityMode(task: BusinessTask): RealityMode {
  if (task.approvalRequired) return "pending_external_approval";
  if (task.currentSource?.startsWith("http")) return "real_public_read";
  if (task.status === "blocked") return "external_action_blocked";
  return "real_local";
}

export function AgentEvidenceTrailPanel({
  businessId,
  proposalId,
  huntId,
  trailId,
  compact = false,
  embedded = false,
  taskId,
}: {
  businessId?: string;
  proposalId?: string;
  huntId?: string;
  trailId?: string;
  compact?: boolean;
  embedded?: boolean;
  taskId?: string;
}) {
  const { data } = useAppData();
  const itemLimit = compact ? 2 : 8;
  const storedTrails = data.agentEvidenceTrails
    .filter((trail) => {
      if (trailId) return trail.id === trailId;
      return (
        (businessId && trail.businessId === businessId) ||
        (proposalId && trail.proposalId === proposalId) ||
        (huntId && trail.huntId === huntId)
      );
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const fallbackTasks = data.businessTasks.filter((task) => {
    if (taskId) return task.id === taskId;
    if (trailId) return false;
    return (
      (businessId && task.businessId === businessId) ||
      (proposalId && task.proposalId === proposalId) ||
      (huntId && task.huntId === huntId)
    );
  });
  const fallbackTrails: RenderTrail[] = fallbackTasks
    .filter((task) => !storedTrails.some((trail) => trail.id === task.evidenceTrailId))
    .map((task) => ({
      id: task.evidenceTrailId ?? `evidence-trail-live-${task.id}`,
      fallbackTaskId: task.id,
      businessId: task.businessId,
      proposalId: task.proposalId,
      huntId: task.huntId,
      agentId: task.agentId,
      title: task.title,
      summary: task.expectedOutput,
      itemIds: [`evidence-item-live-${task.id}`],
      status: task.status === "blocked" ? "failed" : task.status === "done" ? "complete" : "running",
      realityMode: taskRealityMode(task),
      createdAt: task.startedAt ?? task.updatedAt,
      updatedAt: task.completedAt ?? task.updatedAt,
    }));
  const trails: RenderTrail[] = [...storedTrails, ...fallbackTrails].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const visibleTrails = compact ? trails.slice(0, 3) : trails;

  const content = (
    <>
      <div className={embedded ? "mb-3" : "hidden"}>
        <div className="flex items-center gap-2 font-semibold text-stone-100">
          <ClipboardList className="h-4 w-4 text-teal-100" />
          Agent Evidence Trail
        </div>
        <p className="mt-1 text-sm text-slate-400">Assigned prompt, output, citations, logs, timestamp, mode, and handoff.</p>
      </div>
      <div className="space-y-3">
        {visibleTrails.length === 0 ? (
          <p className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3 text-sm text-amber-100">
            No evidence trail is attached yet. If an agent section is missing, treat the run as partial and ask TeamLeader1A to revise.
          </p>
        ) : null}
        {visibleTrails.map((trail: AgentEvidenceTrail) => {
          const fallbackTask = "fallbackTaskId" in trail && trail.fallbackTaskId ? data.businessTasks.find((task) => task.id === trail.fallbackTaskId) : undefined;
          const items = data.agentEvidenceItems.filter((item) => trail.itemIds.includes(item.id));
          const trailItems = items.length || !fallbackTask
            ? items
            : [
                {
                  id: `evidence-item-live-${fallbackTask.id}`,
                  trailId: trail.id,
                  agentId: fallbackTask.agentId,
                  inputPrompt: fallbackTask.objective,
                  outputArtifact: fallbackTask.currentArtifact || fallbackTask.expectedOutput,
                  citationIds: data.businessProposals.find((proposal) => proposal.id === fallbackTask.proposalId)?.evidenceCitationIds ?? [],
                  logRefs: fallbackTask.logs,
                  nextHandoffAgent: fallbackTask.status === "done" ? "TeamLeader1A" : undefined,
                  realityMode: taskRealityMode(fallbackTask),
                  createdAt: fallbackTask.startedAt ?? fallbackTask.updatedAt,
                },
              ];
          const visibleItems = trailItems.slice(0, itemLimit);
          const agent = data.agents.find((item) => item.id === trail.agentId);
          return (
            <div key={trail.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={trail.status === "failed" ? "red" : trail.status === "complete" ? "emerald" : "teal"}>{label(trail.status)}</Badge>
                    <RealityPill mode={trail.realityMode} />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold text-stone-100">{trail.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{agent?.name ?? trail.agentId} / {formatDateTime(trail.updatedAt)}</p>
                </div>
                <Badge tone="slate">{trailItems.length} item{trailItems.length === 1 ? "" : "s"}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{trail.summary}</p>
              {trailItems.length > visibleItems.length ? (
                <p className="mt-3 rounded-md border border-teal-300/20 bg-teal-400/8 p-2 text-xs text-teal-100">
                  Current-first evidence view: showing {visibleItems.length} of {trailItems.length} items.
                </p>
              ) : null}
              <div className="mt-4 space-y-3">
                {visibleItems.map((item) => {
                  const citations = data.evidenceCitations.filter((citation) => item.citationIds.includes(citation.id));
                  return (
                    <div key={item.id} className="rounded-md border border-white/10 bg-black/30 p-3">
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Assigned prompt</p>
                          <p className="mt-2 text-sm leading-6 text-slate-200">{item.inputPrompt}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Output artifact</p>
                          <p className="mt-2 text-sm leading-6 text-slate-200">{item.outputArtifact}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <RealityPill mode={item.realityMode} />
                        <Badge tone="slate">{formatDateTime(item.createdAt)}</Badge>
                        {item.nextHandoffAgent ? (
                          <Badge tone="teal">
                            <ArrowRight className="h-3.5 w-3.5" />
                            {item.nextHandoffAgent}
                          </Badge>
                        ) : null}
                      </div>
                      {citations.length ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold uppercase text-slate-500">Citations / source links</p>
                          {citations.slice(0, 4).map((citation) => (
                            <a key={citation.id} href={citation.url} className="flex items-start gap-2 rounded-md border border-teal-300/20 bg-teal-400/8 p-2 text-xs leading-5 text-teal-100 hover:text-teal-50">
                              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>{citation.title}</span>
                            </a>
                          ))}
                        </div>
                      ) : null}
                      {item.logRefs.length ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold uppercase text-slate-500">Logs / stdout / stderr refs</p>
                          {item.logRefs.slice(0, 4).map((log) => (
                            <p key={log} className="rounded-md border border-white/10 bg-black/25 p-2 text-xs leading-5 text-slate-300">
                              <FileText className="mr-1 inline h-3.5 w-3.5 text-amber-100" />
                              {log}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (embedded) {
    return <div className="rounded-md border border-white/10 bg-black/25 p-3">{content}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-teal-100" />
          Agent Evidence Trail
        </CardTitle>
        <p className="mt-1 text-sm text-slate-400">
          Every agent task should show the assigned prompt, artifact, citations, logs, timestamp, mode, and handoff.
        </p>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
