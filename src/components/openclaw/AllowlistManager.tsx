import { useState } from "react";
import { CheckCircle2, Pause, Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { AllowlistKind } from "../../types";
import { useAppData } from "../../app/AppDataContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select } from "../ui/select";

const kindLabels: Record<AllowlistKind, string> = {
  research_domain: "Research domain",
  channel_target: "Channel target",
  openclaw_capability: "OpenClaw capability",
};

export function AllowlistManager({ compact = false }: { compact?: boolean }) {
  const { data, addAllowlistEntry, updateAllowlistEntryStatus, removeAllowlistEntry } = useAppData();
  const [kind, setKind] = useState<AllowlistKind>("research_domain");
  const [value, setValue] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const visibleEntries = data.allowlistEntries.filter((entry) => entry.status !== "removed");

  const addEntry = async () => {
    const result = await addAllowlistEntry(kind, value);
    setNotice(result);
    if (result.ok) setValue("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-100" />
          Allowlist Manager
        </CardTitle>
        <p className="mt-1 text-sm text-slate-400">Structured allowlists are the Phase 6B source of truth for approved research domains, channel targets, and local OpenClaw capabilities.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <Select value={kind} onChange={(event) => setKind(event.target.value as AllowlistKind)}>
            <option value="research_domain">Research domain</option>
            <option value="channel_target">Channel target</option>
            <option value="openclaw_capability">OpenClaw capability</option>
          </Select>
          <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="example.com, channel:123, or url_research" />
          <Button variant="secondary" onClick={() => void addEntry()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        {notice ? (
          <div className={`rounded-lg border p-3 text-sm ${notice.ok ? "border-teal-300/25 bg-teal-400/8 text-teal-100" : "border-red-300/25 bg-red-500/8 text-red-100"}`}>
            {notice.message}
          </div>
        ) : null}
        <div className={`grid gap-3 ${compact ? "" : "xl:grid-cols-2"}`}>
          {visibleEntries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-stone-100">{entry.label ?? entry.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{kindLabels[entry.kind]} / {entry.value}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={entry.status === "active" ? "emerald" : "amber"}>{entry.status}</Badge>
                  <Badge tone="slate">{entry.source}</Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {entry.status !== "active" ? (
                  <Button variant="secondary" size="sm" onClick={() => void updateAllowlistEntryStatus(entry.id, "active")}>
                    <CheckCircle2 className="h-4 w-4" />
                    Reactivate
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => void updateAllowlistEntryStatus(entry.id, "paused")}>
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={() => void removeAllowlistEntry(entry.id)}>
                  <Trash2 className="h-4 w-4" />
                  Remove Local Entry
                </Button>
              </div>
            </div>
          ))}
          {visibleEntries.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-slate-400">No active or paused allowlist entries.</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
