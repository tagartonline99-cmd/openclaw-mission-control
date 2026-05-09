import type { RiskLevel } from "../types";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function riskTone(risk: RiskLevel) {
  switch (risk) {
    case "low":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
    case "medium":
      return "border-amber-400/40 bg-amber-500/10 text-amber-200";
    case "high":
      return "border-orange-400/40 bg-orange-500/10 text-orange-200";
    case "critical":
      return "border-red-400/50 bg-red-500/10 text-red-200";
  }
}

export function statusTone(status: string) {
  if (["approved", "validated", "complete", "success", "healthy", "online"].includes(status)) {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  }
  if (["pending", "needs_more_evidence", "requires_approval", "watch", "review"].includes(status)) {
    return "border-amber-400/40 bg-amber-500/10 text-amber-200";
  }
  if (["blocked", "rejected", "failed", "danger", "critical"].includes(status)) {
    return "border-red-400/50 bg-red-500/10 text-red-200";
  }
  return "border-slate-400/30 bg-slate-500/10 text-slate-200";
}
