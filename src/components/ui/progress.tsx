import { cn } from "../../utils/cn";

export function Progress({ value, className, tone = "amber" }: { value: number; className?: string; tone?: "amber" | "teal" | "emerald" | "red" }) {
  const color = {
    amber: "bg-amber-300",
    teal: "bg-teal-300",
    emerald: "bg-emerald-300",
    red: "bg-red-300",
  }[tone];

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-black/45 ring-1 ring-white/10", className)}>
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}
