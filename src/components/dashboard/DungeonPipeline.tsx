import { CheckCircle2, Circle, Flame, Lock, Swords } from "lucide-react";
import { pipelineStages } from "../../data/mockData";
import type { QuestStage } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "../../utils/cn";
import { useAppData } from "../../app/AppDataContext";

const stageIcon = (stage: QuestStage, activeStages: Set<string>) => {
  const hasQuest = activeStages.has(stage);
  if (["Publishing approval", "Scaling"].includes(stage)) return Lock;
  if (["Failed", "Retired", "Archived"].includes(stage)) return Flame;
  if (hasQuest) return Swords;
  return stage === "Idea discovered" ? CheckCircle2 : Circle;
};

export function DungeonPipeline() {
  const { data } = useAppData();
  const activeStages = new Set(data.quests.map((quest) => quest.stage));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Dungeon Pipeline Map</CardTitle>
          <p className="mt-1 text-sm text-slate-400">Each chamber is a business validation stage.</p>
        </div>
        <Badge tone="amber">Launch gates active</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {pipelineStages.map((stage) => {
            const Icon = stageIcon(stage, activeStages);
            const stageQuests = data.quests.filter((quest) => quest.stage === stage);
            return (
              <div
                key={stage}
                className={cn(
                  "min-h-28 rounded-lg border bg-black/25 p-3 transition",
                  stageQuests.length
                    ? "border-amber-300/35 shadow-glow"
                    : "border-white/10",
                  stage === "Publishing approval" && "border-red-300/35 bg-red-500/8",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 text-amber-100" />
                  <span className="text-xs font-semibold text-slate-400">{stageQuests.length} quests</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-stone-100">{stage}</h3>
                <div className="mt-2 space-y-1">
                  {stageQuests.slice(0, 2).map((quest) => (
                    <p key={quest.id} className="truncate text-xs text-slate-300">
                      {quest.title}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
