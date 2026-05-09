import type { ReactNode } from "react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "amber",
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ReactNode;
  tone?: "amber" | "teal" | "emerald" | "red" | "slate" | "violet";
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">{label}</p>
            <div className="mt-2 text-2xl font-semibold text-stone-50">{value}</div>
          </div>
          <Badge tone={tone} className="h-9 w-9 justify-center p-0">
            {icon}
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-5 text-slate-300">{detail}</p>
      </CardContent>
    </Card>
  );
}
