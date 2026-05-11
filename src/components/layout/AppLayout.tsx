import { NavLink, Outlet } from "react-router-dom";
import {
  Activity,
  BriefcaseBusiness,
  Brain,
  CheckCircle2,
  ClipboardList,
  Gem,
  Home,
  Landmark,
  MessageSquare,
  Network,
  Settings,
  Sparkles,
  Hammer,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { formatCurrency } from "../../utils/formatting";
import { cn } from "../../utils/cn";
import { useAppData } from "../../app/AppDataContext";
import { UpdateManager } from "../updater/UpdateManager";

const navItems = [
  { label: "Command", path: "/", icon: MessageSquare },
  { label: "Tasks", path: "/tasks", icon: ClipboardList },
  { label: "Guild Office", path: "/guild-office", icon: Landmark },
  { label: "Mission Briefs", path: "/mission-briefs", icon: Sparkles },
  { label: "Businesses", path: "/businesses", icon: BriefcaseBusiness },
  { label: "Production", path: "/production", icon: Hammer },
  { label: "Approvals", path: "/approvals", icon: CheckCircle2 },
  { label: "System", path: "/openclaw-system", icon: Network },
  { label: "Advanced", path: "/settings", icon: Settings },
];

const advancedItems = [
  { label: "Agents", path: "/agents", icon: Activity },
  { label: "Second Brain", path: "/second-brain", icon: Brain },
  { label: "Legacy Dashboard", path: "/legacy-dashboard", icon: Home },
];

export function AppLayout() {
  const { data, adapter, runSimulationNow, simulationEnabled } = useAppData();
  const { dashboardSummary, openClawRuntimeStatus } = data;
  const pendingApprovalCount = data.approvalRequests.filter((request) => request.status === "pending").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <UpdateManager autoCheck />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(217,119,6,0.16),transparent_30%),radial-gradient(circle_at_75%_5%,rgba(20,184,166,0.14),transparent_28%),linear-gradient(145deg,#070608,#11100d_45%,#0b1110)]" />
      <div className="fixed inset-0 -z-10 bg-dungeon-grid bg-[length:44px_44px] opacity-55" />
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-amber-200/10 bg-black/55 backdrop-blur-xl xl:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-amber-300/40 bg-amber-300/10 shadow-glow">
                <Gem className="h-5 w-5 text-amber-100" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-stone-100">OpenClaw</p>
                <p className="text-xs uppercase tracking-normal text-amber-200/75">Mission Control</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "border-amber-300/35 bg-amber-300/12 text-amber-100 shadow-glow"
                      : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/6 hover:text-stone-100",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.label === "Approvals" && pendingApprovalCount > 0 ? (
                  <span className="ml-auto rounded-md border border-amber-300/30 bg-amber-300/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-100">
                    {pendingApprovalCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
            <div className="pt-4">
              <p className="px-3 pb-2 text-xs font-semibold uppercase text-slate-500">Archive / Advanced</p>
              {advancedItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium transition",
                      isActive
                        ? "border-teal-300/35 bg-teal-300/10 text-teal-100"
                        : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/6 hover:text-stone-100",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>
          <div className="border-t border-white/10 p-4">
              <div className="rounded-lg border border-teal-300/20 bg-teal-400/8 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-normal text-teal-100">Runtime</span>
                  <Badge tone="teal">{openClawRuntimeStatus.status}</Badge>
                </div>
                <p className="text-xs leading-5 text-slate-300">{openClawRuntimeStatus.notes}</p>
                <p className="mt-2 text-xs text-teal-100">Storage: {adapter}</p>
              </div>
          </div>
        </div>
      </aside>
      <main className="xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/70 backdrop-blur-xl">
          <div className="flex min-h-20 flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-7">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="amber">Proof Before Launch</Badge>
                <Badge tone="teal">Local E2E</Badge>
                <Badge tone="red">External actions locked</Badge>
              </div>
              <h1 className="mt-2 font-display text-2xl font-semibold text-stone-50 lg:text-3xl">OpenClaw Mission Control</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-xs text-slate-400">Remaining capital</p>
                <p className="font-semibold text-emerald-100">{formatCurrency(dashboardSummary.remainingCapital)}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-xs text-slate-400">Reputation</p>
                <p className="font-semibold text-amber-100">{dashboardSummary.reputationScore}/100</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => void runSimulationNow()}>
                <Activity className="h-4 w-4" />
                {simulationEnabled ? "Run Tick" : "Simulated Check"}
              </Button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 xl:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold",
                    isActive ? "border-amber-300/40 bg-amber-300/12 text-amber-100" : "border-white/10 bg-black/25 text-slate-300",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.label === "Approvals" && pendingApprovalCount > 0 ? (
                  <span className="rounded-md border border-amber-300/30 bg-amber-300/15 px-1.5 py-0.5 text-[10px] text-amber-100">
                    {pendingApprovalCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        </header>
        <div className="px-4 py-6 lg:px-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
