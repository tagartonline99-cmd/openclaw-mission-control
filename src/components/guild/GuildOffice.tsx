import { BookOpen, Crown, Eye, FileText, Hammer, Lock, PenLine, Search, ShieldCheck, Sparkles } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppDataContext";
import type { GuildOfficeStation } from "../../types";
import { formatDateTime } from "../../utils/formatting";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { AgentEvidenceTrailPanel } from "../evidence/AgentEvidenceTrailPanel";

const stationIcons: Record<string, React.ReactNode> = {
  "station-teamleader": <Crown className="h-5 w-5 text-amber-100" />,
  "station-research": <BookOpen className="h-5 w-5 text-teal-100" />,
  "station-seo": <Search className="h-5 w-5 text-teal-100" />,
  "station-content": <Sparkles className="h-5 w-5 text-amber-100" />,
  "station-writer": <PenLine className="h-5 w-5 text-stone-100" />,
  "station-production": <Hammer className="h-5 w-5 text-emerald-100" />,
  "station-factcheck": <ShieldCheck className="h-5 w-5 text-emerald-100" />,
  "station-publish": <Lock className="h-5 w-5 text-red-100" />,
  "station-action": <ShieldCheck className="h-5 w-5 text-teal-100" />,
};

function stationTone(station: GuildOfficeStation) {
  if (station.status === "blocked") return "border-red-300/35 bg-red-500/10";
  if (station.status === "idle") return "border-white/10 bg-black/25 opacity-75";
  if (station.status === "review") return "border-amber-300/45 bg-amber-400/10";
  return "border-teal-300/35 bg-teal-400/10";
}

function motionClass(station: GuildOfficeStation) {
  if (station.motion === "research_beam") return "guild-agent-research";
  if (station.motion === "forge") return "guild-agent-forge";
  if (station.motion === "review") return "guild-agent-review";
  if (station.motion === "pulse") return "guild-agent-pulse";
  if (station.motion === "blocked") return "guild-agent-blocked";
  return "";
}

export function GuildOffice() {
  const { data } = useAppData();
  const [selectedStationId, setSelectedStationId] = useState(data.guildOfficeStations[0]?.id ?? "");
  const activeHunt = data.opportunityHunts.find((hunt) => !["ready_to_review", "approved_as_business", "rejected"].includes(hunt.status)) ?? data.opportunityHunts[0];
  const workingStations = data.guildOfficeStations.filter((station) => station.status !== "idle");
  const selectedStation = data.guildOfficeStations.find((station) => station.id === selectedStationId) ?? data.guildOfficeStations[0];
  const recentSessions = useMemo(
    () => [...data.agentWorkSessions].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 24),
    [data.agentWorkSessions],
  );
  const selectedSession = selectedStation
    ? recentSessions.find((session) => session.stationId === selectedStation.id && session.taskId === selectedStation.taskId) ??
      data.agentWorkSessions.find((session) => session.stationId === selectedStation.id && session.taskId === selectedStation.taskId)
    : undefined;
  const selectedTask = selectedSession ? data.businessTasks.find((task) => task.id === selectedSession.taskId) : undefined;

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge tone={workingStations.length ? "teal" : "amber"}>{workingStations.length ? "agents moving" : "waiting"}</Badge>
              <h3 className="mt-3 font-display text-2xl font-semibold text-stone-50">What is happening now?</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                {activeHunt
                  ? `${activeHunt.currentPhase} This is safe autonomous work from your TeamLeader1A command; external actions remain locked.`
                  : "No TeamLeader1A work session is active. Send a command from the Command tab to light up the guild hall."}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase text-teal-100">Current-first guild view: active stations and recent sessions only.</p>
            </div>
            {activeHunt?.businessProposalId ? (
              <a href={`#/mission-briefs?proposal=${activeHunt.businessProposalId}`}>
                <Badge tone="teal">
                  <Eye className="h-3.5 w-3.5" />
                  View Work
                </Badge>
              </a>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="relative overflow-hidden rounded-lg border border-amber-300/20 bg-[radial-gradient(circle_at_50%_18%,rgba(245,158,11,0.14),transparent_28%),linear-gradient(135deg,rgba(8,7,6,0.96),rgba(8,16,15,0.9))] p-4">
          <div className="absolute inset-0 bg-dungeon-grid bg-[length:46px_46px] opacity-35" />
          <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.guildOfficeStations.map((station) => (
              <button
                key={station.id}
                type="button"
                onClick={() => setSelectedStationId(station.id)}
                className={`relative min-h-52 overflow-hidden rounded-lg border p-4 text-left transition hover:border-amber-300/45 ${stationTone(station)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">{station.room}</p>
                    <h3 className="mt-1 font-display text-lg font-semibold text-stone-50">{station.name}</h3>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/35 p-2">{stationIcons[station.id]}</div>
                </div>
                <div className="mt-5 flex items-center justify-center">
                  <div className={`guild-agent ${motionClass(station)}`}>
                    <div className="guild-agent-core">{station.agentId === "teamleader1a" ? "TL" : station.agentId.split("-")[1]?.slice(0, 2).toUpperCase()}</div>
                  </div>
                </div>
                <p className="mt-5 text-sm font-semibold text-stone-100">{station.currentTask}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{station.lastOutput}</p>
                <div className="mt-3">
                  <Progress value={station.progress} tone={station.status === "idle" ? "amber" : "teal"} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={station.status === "idle" ? "slate" : station.status === "blocked" ? "red" : "teal"}>{station.status}</Badge>
                  <Badge tone="amber">{station.motion.replace(/_/g, " ")}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Card className="xl:sticky xl:top-28 xl:self-start">
          <CardHeader>
            <CardTitle>Station Drawer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedStation ? (
              <>
                <div>
                  <Badge tone={selectedStation.status === "idle" ? "slate" : "teal"}>{selectedStation.status}</Badge>
                  <h3 className="mt-3 font-display text-xl font-semibold text-stone-50">{selectedStation.room}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{selectedStation.currentTask}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Latest output</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{selectedStation.lastOutput}</p>
                </div>
                {selectedTask ? (
                  <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Linked task</p>
                    <p className="mt-1 font-semibold text-stone-100">{selectedTask.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{selectedTask.expectedOutput}</p>
                    <div className="mt-3 space-y-2">
                      {selectedTask.logs.slice(0, 3).map((log) => (
                        <p key={log} className="rounded-md border border-white/10 bg-black/25 p-2 text-xs text-slate-300">{log}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-white/10 bg-black/25 p-3 text-sm text-slate-300">
                    <FileText className="mb-2 h-4 w-4 text-amber-100" />
                    No active task is attached to this station yet.
                  </div>
                )}
                {selectedTask ? (
                  <AgentEvidenceTrailPanel trailId={selectedTask.evidenceTrailId} taskId={selectedTask.id} compact embedded />
                ) : null}
                <p className="text-xs text-slate-500">Updated {formatDateTime(selectedStation.updatedAt)}</p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
