import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

type BadgeTone = "amber" | "teal" | "emerald" | "red" | "slate" | "violet";

const tones: Record<BadgeTone, string> = {
  amber: "border-amber-300/40 bg-amber-400/10 text-amber-100",
  teal: "border-teal-300/35 bg-teal-400/10 text-teal-100",
  emerald: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
  red: "border-red-300/40 bg-red-400/10 text-red-100",
  slate: "border-slate-300/20 bg-slate-400/10 text-slate-200",
  violet: "border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-100",
};

export function Badge({
  className,
  tone = "slate",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-normal",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
