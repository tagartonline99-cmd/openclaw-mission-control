import type {
  AllowlistEntry,
  AllowlistKind,
  OpenClawActionKind,
  OpenClawApprovalPayload,
  SafetyPolicyEvaluation,
  SafetyRiskFlag,
  UserSettings,
} from "../types";

type EvaluationContext = {
  allowlistEntries: AllowlistEntry[];
  userSettings: UserSettings;
};

const capabilityLabels: Record<OpenClawActionKind, string> = {
  gateway_start: "gateway_start",
  agent_turn: "agent_turn",
  url_research: "url_research",
  channel_message: "channel_message",
};

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeDomain(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  return trimmed.replace(/:\d+$/, "");
}

function normalizeTarget(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isPrivateHost(host: string) {
  if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local")) return true;
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

function activeValues(entries: AllowlistEntry[], kind: AllowlistKind) {
  return entries.filter((entry) => entry.kind === kind && entry.status === "active").map((entry) => entry.value);
}

function domainAllowed(host: string, allowedDomains: string[]) {
  if (allowedDomains.length === 0) return true;
  return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function targetAllowed(target: string, allowedTargets: string[]) {
  if (allowedTargets.length === 0) return true;
  const normalized = normalizeTarget(target).toLowerCase();
  return allowedTargets.some((value) => normalized === value.toLowerCase());
}

function capabilityAllowed(actionKind: OpenClawActionKind, entries: AllowlistEntry[]) {
  const capabilities = activeValues(entries, "openclaw_capability");
  const configured = entries.some((entry) => entry.kind === "openclaw_capability" && entry.status !== "removed");
  if (!configured) return true;
  return capabilities.includes(capabilityLabels[actionKind]);
}

function baseEvaluation(summary: string): SafetyPolicyEvaluation {
  return {
    allowed: true,
    riskFlags: ["requires_approval"],
    blockedReasons: [],
    safetyChecklist: ["One approval covers one action only.", "Result is logged locally.", "External risky behavior remains blocked."],
    normalizedPayloadSummary: summary,
    recommendedDecision: "review",
  };
}

function finish(evaluation: SafetyPolicyEvaluation): SafetyPolicyEvaluation {
  const blocked = evaluation.blockedReasons.length > 0;
  return {
    ...evaluation,
    allowed: !blocked,
    riskFlags: unique(evaluation.riskFlags),
    blockedReasons: unique(evaluation.blockedReasons),
    safetyChecklist: unique(evaluation.safetyChecklist),
    recommendedDecision: blocked ? "block" : evaluation.recommendedDecision,
  };
}

function evaluateUrls(payload: Extract<OpenClawApprovalPayload, { actionKind: "url_research" }>, context: EvaluationContext) {
  const allowedDomains = activeValues(context.allowlistEntries, "research_domain");
  const enforceDomainAllowlist = context.allowlistEntries.some((entry) => entry.kind === "research_domain" && entry.status !== "removed");
  const evaluation = baseEvaluation(`${payload.purpose.trim()} / ${payload.urls.join(", ")}`);
  evaluation.riskFlags.push("external_action", "approved_url_research");
  evaluation.safetyChecklist.push("URLs are explicit.", "No login or form submission.", "No PII harvesting.", "No purchases or terms bypass.");

  if (!capabilityAllowed(payload.actionKind, context.allowlistEntries)) {
    evaluation.riskFlags.push("capability_not_allowed");
    evaluation.blockedReasons.push("Approved URL research capability is not active in the allowlist.");
  }

  if (!payload.purpose.trim() || !payload.extractionGoal.trim()) {
    evaluation.riskFlags.push("blocked_intent");
    evaluation.blockedReasons.push("URL research needs a purpose and extraction goal.");
  }

  const urls = payload.urls.map((url) => url.trim()).filter(Boolean);
  if (urls.length === 0 || urls.length > 8) {
    evaluation.riskFlags.push("malformed_url");
    evaluation.blockedReasons.push("URL research requires 1-8 explicit URLs.");
  }

  for (const url of urls) {
    if (url.includes("*")) {
      evaluation.riskFlags.push("wildcard_url");
      evaluation.blockedReasons.push(`Wildcard URL patterns are blocked: ${url}`);
    }
    if (url.includes("@")) {
      evaluation.riskFlags.push("credential_url");
      evaluation.blockedReasons.push(`Credential-style URLs are blocked: ${url}`);
    }

    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        evaluation.riskFlags.push("malformed_url");
        evaluation.blockedReasons.push(`Only http and https URLs are allowed: ${url}`);
      }
      const host = parsed.hostname.toLowerCase();
      if (isPrivateHost(host)) {
        evaluation.riskFlags.push("private_host");
        evaluation.blockedReasons.push(`Private or local hosts are blocked: ${host}`);
      }
      if (enforceDomainAllowlist && !domainAllowed(host, allowedDomains)) {
        evaluation.riskFlags.push("unapproved_domain");
        evaluation.blockedReasons.push(`Domain is not active in the research allowlist: ${host}`);
      }
    } catch {
      evaluation.riskFlags.push("malformed_url");
      evaluation.blockedReasons.push(`Malformed URL: ${url}`);
    }
  }

  return finish(evaluation);
}

function evaluateChannel(payload: Extract<OpenClawApprovalPayload, { actionKind: "channel_message" }>, context: EvaluationContext) {
  const allowedTargets = activeValues(context.allowlistEntries, "channel_target");
  const enforceTargetAllowlist = context.allowlistEntries.some((entry) => entry.kind === "channel_target" && entry.status !== "removed");
  const target = normalizeTarget(payload.target);
  const lowerTarget = target.toLowerCase();
  const evaluation = baseEvaluation(`${payload.channel.trim()} -> ${target}`);
  evaluation.riskFlags.push("external_action", "channel_message");
  evaluation.safetyChecklist.push("Message text is visible.", "Target is explicit.", "Broadcast and batch targets are blocked.", "Dry-run is required in Phase 6B.");

  if (!capabilityAllowed(payload.actionKind, context.allowlistEntries)) {
    evaluation.riskFlags.push("capability_not_allowed");
    evaluation.blockedReasons.push("Channel messaging capability is not active in the allowlist.");
  }
  if (!payload.dryRun) {
    evaluation.riskFlags.push("dry_run_required");
    evaluation.blockedReasons.push("Real channel sends are disabled in Phase 6B. Use dry-run only.");
  }
  if (!target || !payload.message.trim()) {
    evaluation.riskFlags.push("malformed_target");
    evaluation.blockedReasons.push("Channel message requires one explicit target and visible message text.");
  }
  if (target.length > 200 || payload.message.length > 2000) {
    evaluation.riskFlags.push("malformed_target");
    evaluation.blockedReasons.push("Channel target or message exceeds Phase 6B safety limits.");
  }
  if (/[,*;]/.test(target)) {
    evaluation.riskFlags.push("batch_target");
    evaluation.blockedReasons.push("Batch, wildcard, or comma-separated channel targets are blocked.");
  }
  if (lowerTarget === "all" || lowerTarget.includes("broadcast") || lowerTarget.includes("@everyone") || lowerTarget.includes("@here")) {
    evaluation.riskFlags.push("broadcast_target");
    evaluation.blockedReasons.push("Broadcast-style channel targets are blocked.");
  }
  if (enforceTargetAllowlist && !targetAllowed(target, allowedTargets)) {
    evaluation.riskFlags.push("unapproved_target");
    evaluation.blockedReasons.push(`Target is not active in the channel allowlist: ${target}`);
  }

  return finish(evaluation);
}

function evaluateAgentTurn(payload: Extract<OpenClawApprovalPayload, { actionKind: "agent_turn" }>, context: EvaluationContext) {
  const evaluation = baseEvaluation(payload.message.trim().slice(0, 300));
  evaluation.safetyChecklist.push("TeamLeader1A only.", "No --deliver flag.", "No external delivery from this action.");
  if (!capabilityAllowed(payload.actionKind, context.allowlistEntries)) {
    evaluation.riskFlags.push("capability_not_allowed");
    evaluation.blockedReasons.push("TeamLeader1A local turn capability is not active in the allowlist.");
  }
  if (!payload.message.trim()) {
    evaluation.riskFlags.push("blocked_intent");
    evaluation.blockedReasons.push("TeamLeader1A prompt cannot be empty.");
  }
  return finish(evaluation);
}

function evaluateGateway(payload: Extract<OpenClawApprovalPayload, { actionKind: "gateway_start" }>, context: EvaluationContext) {
  const evaluation = baseEvaluation(payload.expectedResult);
  if (!capabilityAllowed(payload.actionKind, context.allowlistEntries)) {
    evaluation.riskFlags.push("capability_not_allowed");
    evaluation.blockedReasons.push("Gateway start capability is not active in the allowlist.");
  }
  return finish(evaluation);
}

export const safetyPolicyService = {
  normalizeAllowlistValue(kind: AllowlistKind, value: string) {
    return kind === "research_domain" ? normalizeDomain(value) : normalizeTarget(value);
  },

  validateAllowlistEntry(kind: AllowlistKind, value: string) {
    const normalized = this.normalizeAllowlistValue(kind, value);
    const blockedReasons: string[] = [];
    if (!normalized) blockedReasons.push("Allowlist value cannot be empty.");
    if (normalized.includes("*")) blockedReasons.push("Wildcards are blocked.");
    if (kind === "research_domain") {
      if (normalized.includes("@")) blockedReasons.push("Credential-style domains are blocked.");
      if (isPrivateHost(normalized)) blockedReasons.push("Private or local domains are blocked.");
      if (!/^[a-z0-9.-]+$/i.test(normalized)) blockedReasons.push("Research domain contains unsupported characters.");
    }
    if (kind === "channel_target") {
      const lower = normalized.toLowerCase();
      if (/[,*;]/.test(normalized)) blockedReasons.push("Batch and wildcard targets are blocked.");
      if (lower === "all" || lower.includes("broadcast") || lower.includes("@everyone") || lower.includes("@here")) {
        blockedReasons.push("Broadcast-style targets are blocked.");
      }
    }
    return { normalized, blockedReasons };
  },

  makeAllowlistEntry(kind: AllowlistKind, value: string, source: AllowlistEntry["source"], label?: string): AllowlistEntry {
    const normalized = this.normalizeAllowlistValue(kind, value);
    const now = new Date().toISOString();
    return {
      id: id(`allow-${kind}`),
      kind,
      value: normalized,
      label: label?.trim() || normalized,
      status: "active",
      source,
      createdAt: now,
      updatedAt: now,
    };
  },

  migrateSettingsAllowlists(settings: UserSettings, existing: AllowlistEntry[]) {
    if (existing.length > 0) return existing;
    const capabilities: OpenClawActionKind[] = ["gateway_start", "agent_turn", "url_research", "channel_message"];
    return [
      ...settings.approvedResearchDomains.map((domain) => this.makeAllowlistEntry("research_domain", domain, "settings_migration")),
      ...settings.approvedChannelTargets.map((target) => this.makeAllowlistEntry("channel_target", target, "settings_migration")),
      ...capabilities.map((capability) => this.makeAllowlistEntry("openclaw_capability", capability, "system", capability.replace("_", " "))),
    ];
  },

  evaluateOpenClawPayload(payload: OpenClawApprovalPayload, context: EvaluationContext): SafetyPolicyEvaluation {
    if (payload.actionKind === "url_research") return evaluateUrls(payload, context);
    if (payload.actionKind === "channel_message") return evaluateChannel(payload, context);
    if (payload.actionKind === "agent_turn") return evaluateAgentTurn(payload, context);
    return evaluateGateway(payload, context);
  },

  riskFlagLabel(flag: SafetyRiskFlag) {
    return flag.replace(/_/g, " ");
  },
};
