import type { MissionAgentId, ProductTrack } from "../types";

export const TRAINING_LIBRARY_ROOT = "C:\\Users\\User\\.openclaw\\workspace-mission-control\\training";

export type ProductTrainingStatus = "passed" | "warning" | "blocked";

export type ProductAgentTrainingScore = {
  score: number;
  checks: string[];
  issues: string[];
  status: ProductTrainingStatus;
};

type ProductAgentTrainingProfile = {
  agentId: MissionAgentId;
  roleName: string;
  libraryFile: string;
  qualityRubric: string[];
  strongTraits: string[];
  weakAntiPatterns: string[];
  repairChecklist: string[];
  safetyBoundaries: string[];
};

type ProductAgentExampleCard = {
  exampleFile: string;
  requiredProofPoints: string[];
  strongPattern: string;
  weakPattern: string;
};

export const PRODUCT_AGENT_TRAINING_PROFILES: Record<MissionAgentId, ProductAgentTrainingProfile> = {
  "agent-content": {
    agentId: "agent-content",
    roleName: "AgentContent",
    libraryFile: "role-rubrics\\agent-content.md",
    qualityRubric: ["Clear buyer/problem framing", "Concrete offer sections and asset sequence", "Production-ready checklist"],
    strongTraits: ["Names the buyer and problem plainly", "Maps every asset to a user need", "Keeps claims reviewable"],
    weakAntiPatterns: ["Generic content strategy", "Channel advice without assets", "Unsupported success promises"],
    repairChecklist: ["Add specific assets", "Tie assets to buyer problems", "State local-only review boundary"],
    safetyBoundaries: ["No publishing", "No account access", "No spend", "No outreach or connector execution"],
  },
  "agent-writer": {
    agentId: "agent-writer",
    roleName: "AgentWriter",
    libraryFile: "role-rubrics\\agent-writer.md",
    qualityRubric: ["Buyer-facing copy", "Complete product draft or platform copy", "Claim-safe CTAs and FAQ"],
    strongTraits: ["Writes actual copy instead of instructions", "Includes FAQ or objections", "Avoids guaranteed outcomes"],
    weakAntiPatterns: ["Outline-only draft", "Placeholder copy", "Income or performance guarantees"],
    repairChecklist: ["Replace placeholders", "Write complete copy", "Add FAQ/CTA and claim limits"],
    safetyBoundaries: ["No publishing", "No login", "No form submission", "No messages or purchases"],
  },
  "agent-production": {
    agentId: "agent-production",
    roleName: "AgentProduction",
    libraryFile: "role-rubrics\\agent-production.md",
    qualityRubric: ["Exact package structure", "Platform fields and file plan", "Readiness gaps and local delivery notes"],
    strongTraits: ["Lists exact local files", "Names required platform fields", "Separates ready items from gaps"],
    weakAntiPatterns: ["Vague build plan", "Missing file names", "Assumes external launch happened"],
    repairChecklist: ["Add file manifest", "Add platform fields", "State gaps and review steps"],
    safetyBoundaries: ["No external release", "No connector execution", "No account actions", "No spend"],
  },
  "agent-publish": {
    agentId: "agent-publish",
    roleName: "AgentPublish",
    libraryFile: "role-rubrics\\agent-publish.md",
    qualityRubric: ["Publishing checklist only", "Locked action list", "Approval payload preview and manual review steps"],
    strongTraits: ["Defines exact later approval payload", "States all locked actions", "Keeps publish work manual/review-first"],
    weakAntiPatterns: ["Claims publish completed", "Asks for credentials", "Starts connector/browser execution"],
    repairChecklist: ["Remove execution language", "Add approval payload", "Add manual review steps"],
    safetyBoundaries: ["No publish", "No login", "No form submission", "No connector execution"],
  },
  "agent-action": {
    agentId: "agent-action",
    roleName: "AgentAction",
    libraryFile: "role-rubrics\\agent-action.md",
    qualityRubric: ["Operating checklist", "Next safe steps", "User review steps and blocked actions"],
    strongTraits: ["Turns work into local tasks", "Separates safe actions from approvals", "Names measurable review steps"],
    weakAntiPatterns: ["Autopilot launch plan", "Unapproved outreach", "Spend or publish instructions"],
    repairChecklist: ["Convert risky steps to approvals", "Add user review steps", "Add blocked-action list"],
    safetyBoundaries: ["No spend", "No messages", "No launch", "No purchases, forms, or connector execution"],
  },
  teamleader1a: {
    agentId: "teamleader1a",
    roleName: "TeamLeader1A",
    libraryFile: "role-rubrics\\teamleader1a.md",
    qualityRubric: ["Rubric review of prior outputs", "Readiness decision", "Safe local review recommendation"],
    strongTraits: ["Cites agent scores/issues", "Names missing items", "Keeps final action approval-gated"],
    weakAntiPatterns: ["Rubber-stamp approval", "No reference to role rubrics", "External action authorization"],
    repairChecklist: ["Review all role scores", "State pass/revise/block", "Name the next safe user action"],
    safetyBoundaries: ["No publishing or spend", "No messaging", "No login or forms", "No external automation"],
  },
  "agent-researcher": {
    agentId: "agent-researcher",
    roleName: "AgentResearcher",
    libraryFile: "role-rubrics\\agent-content.md",
    qualityRubric: ["Evidence-backed demand", "Clear assumptions", "Safe public-read boundary"],
    strongTraits: ["Distinguishes evidence from assumptions", "Names missing proof", "Avoids unsupported claims"],
    weakAntiPatterns: ["Invented sources", "Guaranteed demand", "Uncontrolled scraping plan"],
    repairChecklist: ["Add evidence notes", "Label assumptions", "State public-read-only boundary"],
    safetyBoundaries: ["No browsing from Product Factory", "No scraping", "No login", "No external actions"],
  },
  "agent-seo": {
    agentId: "agent-seo",
    roleName: "AgentSeo",
    libraryFile: "role-rubrics\\agent-content.md",
    qualityRubric: ["Search intent map", "Content gaps", "Claim-safe SEO plan"],
    strongTraits: ["Maps keywords to product sections", "Avoids ranking guarantees", "Defines reviewable content tasks"],
    weakAntiPatterns: ["Guaranteed rankings", "Thin keyword list", "Spam tactics"],
    repairChecklist: ["Add intent clusters", "Add content tasks", "Remove ranking promises"],
    safetyBoundaries: ["No scraping", "No posting", "No account access", "No paid promotion"],
  },
};

const PRODUCT_AGENT_EXAMPLE_CARDS: Record<MissionAgentId, ProductAgentExampleCard> = {
  "agent-content": {
    exampleFile: "role-examples\\agent-content.md",
    requiredProofPoints: ["specific buyer", "customer problem", "named assets", "production checklist", "local-only boundary"],
    strongPattern: "Buyer/problem -> offer modules -> exact asset list -> local production checklist.",
    weakPattern: "Generic content strategy, channel advice, or sales promise with no buildable assets.",
  },
  "agent-writer": {
    exampleFile: "role-examples\\agent-writer.md",
    requiredProofPoints: ["actual buyer-facing copy", "packages or product sections", "FAQ/objections", "buyer requirements", "claims to avoid"],
    strongPattern: "Writes the actual title, description, packages/draft copy, FAQ, requirements, and claim-safe limits.",
    weakPattern: "Outline-only copy, TBD placeholders, hype, or guaranteed performance claims.",
  },
  "agent-production": {
    exampleFile: "role-examples\\agent-production.md",
    requiredProofPoints: ["file manifest", "platform fields", "readiness gaps", "local delivery notes", "approval boundary"],
    strongPattern: "Exact package structure and destination fields with gaps called out before any external upload.",
    weakPattern: "Vague folder plan or instructions to upload/publish without a reviewed package.",
  },
  "agent-publish": {
    exampleFile: "role-examples\\agent-publish.md",
    requiredProofPoints: ["publishing checklist", "locked external actions", "approval payload preview", "manual review steps"],
    strongPattern: "Checklist-only publish readiness with all external actions locked until an exact approval payload exists.",
    weakPattern: "Claims publishing is done or tells the system to publish/message/submit now.",
  },
  "agent-action": {
    exampleFile: "role-examples\\agent-action.md",
    requiredProofPoints: ["operating checklist", "next safe steps", "Commander review", "blocked actions", "approval boundary"],
    strongPattern: "Turns the product into local review tasks and separates safe work from approval-gated external work.",
    weakPattern: "Autopilot launch, outreach, spend, login, platform submission, or revenue-promise steps.",
  },
  teamleader1a: {
    exampleFile: "role-examples\\teamleader1a.md",
    requiredProofPoints: ["readiness decision", "role scores/issues", "risks", "missing items", "next user action"],
    strongPattern: "Reviews each role's quality result, decides pass/revise/block, and names one safe next user action.",
    weakPattern: "Rubber-stamps approval or authorizes agents to launch without reviewing scores and risks.",
  },
  "agent-researcher": {
    exampleFile: "role-examples\\agent-content.md",
    requiredProofPoints: ["evidence signals", "assumptions", "missing proof", "public-read boundary"],
    strongPattern: "Separates evidence from assumptions and names the proof still needed.",
    weakPattern: "Invented sources, guaranteed demand, or uncontrolled scraping plan.",
  },
  "agent-seo": {
    exampleFile: "role-examples\\agent-content.md",
    requiredProofPoints: ["search intent", "keyword clusters", "content tasks", "ranking-claim boundary"],
    strongPattern: "Maps intent clusters to reviewable content tasks and avoids ranking guarantees.",
    weakPattern: "Thin keyword list, spam tactics, or guaranteed ranking claims.",
  },
};

export function getProductAgentTrainingCard(agentId: MissionAgentId | "TeamLeader1A", track: ProductTrack) {
  const normalizedAgentId = normalizeProductAgentId(agentId);
  const profile = PRODUCT_AGENT_TRAINING_PROFILES[normalizedAgentId];
  const examples = PRODUCT_AGENT_EXAMPLE_CARDS[normalizedAgentId];
  return [
    `Local Agent Quality Card: ${profile.roleName}`,
    `Training library: ${TRAINING_LIBRARY_ROOT}\\${profile.libraryFile}`,
    `Example file: ${TRAINING_LIBRARY_ROOT}\\${examples.exampleFile}`,
    `Track: ${track.label}. Required deliverables: ${track.requiredDeliverables.join(", ")}.`,
    `Rubric: ${profile.qualityRubric.join("; ")}.`,
    `Required proof points: ${examples.requiredProofPoints.join("; ")}.`,
    `Strong pattern: ${examples.strongPattern}`,
    `Weak pattern to avoid: ${examples.weakPattern}`,
    `Strong output traits: ${profile.strongTraits.join("; ")}.`,
    `Avoid: ${profile.weakAntiPatterns.join("; ")}.`,
    `Repair before submitting: ${profile.repairChecklist.join("; ")}.`,
    `Safety boundary: ${profile.safetyBoundaries.join("; ")}. Local artifact only; no external action.`,
  ].join("\n");
}

export function scoreProductAgentArtifact(
  agentId: MissionAgentId | "TeamLeader1A",
  markdown: string,
  requiredHeadings: string[],
): ProductAgentTrainingScore {
  const normalizedAgentId = normalizeProductAgentId(agentId);
  const profile = PRODUCT_AGENT_TRAINING_PROFILES[normalizedAgentId];
  const content = markdown.trim();
  const checks: string[] = [];
  const issues: string[] = [];
  const severeIssueTags = new Set<string>();
  const minLength = productArtifactTrainingMinLength(normalizedAgentId);

  const addIssue = (tag: string, issue: string) => {
    if (!issues.includes(issue)) issues.push(issue);
    severeIssueTags.add(tag);
  };
  const addWarning = (issue: string) => {
    if (!issues.includes(issue)) issues.push(issue);
  };

  if (content.length >= minLength) checks.push(`Useful length passed (${content.length}/${minLength} chars).`);
  else addIssue("thin", `Thin content: artifact has ${content.length}/${minLength} characters; ${profile.roleName} needs a reviewable product artifact.`);

  const missingHeadings = requiredHeadings.filter((heading) => !hasExactHeading(content, heading));
  if (missingHeadings.length) {
    missingHeadings.forEach((heading) => addIssue("headings", `Missing required heading: ## ${heading}.`));
  } else {
    checks.push(`All ${requiredHeadings.length} required headings are present.`);
  }

  const firstHeading = content.match(/^##\s+(.+?)\s*$/m)?.[1]?.trim();
  if (content && firstHeading === requiredHeadings[0]) checks.push(`First required heading is correct: ## ${requiredHeadings[0]}.`);
  else addIssue("headings", `First heading must be exactly: ## ${requiredHeadings[0]}.`);

  const thinSections = requiredHeadings
    .filter((heading) => hasExactHeading(content, heading))
    .filter((heading) => sectionContentForHeading(content, heading).length < productSectionTrainingMinLength(normalizedAgentId));
  if (thinSections.length) {
    addIssue("thin-sections", `Thin required section(s): ${thinSections.join(", ")} need concrete product substance.`);
  } else if (requiredHeadings.length) {
    checks.push("Required sections contain reviewable substance.");
  }

  if (hasPlaceholder(content)) addIssue("placeholder", "Placeholder/refusal issue: unresolved placeholder markers are present.");
  else checks.push("No unresolved placeholder markers found.");

  if (hasRefusalOrAcknowledgement(content)) addIssue("refusal", "Placeholder/refusal issue: output looks like a refusal, apology, acknowledgement, or standby response.");
  else checks.push("No refusal or acknowledgement pattern found.");

  if (hasPromptLeakage(content)) addIssue("prompt-leakage", "Prompt leakage: output appears to include Mission Control prompt, handoff, or training-card instructions.");
  else checks.push("No obvious prompt leakage found.");

  if (hasConcreteDeliverables(content)) checks.push("Concrete deliverables are present.");
  else addIssue("deliverables", "Missing concrete deliverables: include specific copy, fields, file names, checklist steps, package tiers, or buyer-facing assets under the required headings.");

  const missingSignals = missingRoleSignals(normalizedAgentId, content);
  if (missingSignals.length) {
    addIssue("role-signals", `Weak ${profile.roleName} signals: expected ${missingSignals.join("; ")}.`);
  } else {
    checks.push(`${profile.roleName} role-specific signals are present.`);
  }

  if (hasUnsafeExternalExecution(content)) {
    addIssue("safety", "Safety boundary issue: output appears to claim or instruct external execution without approval.");
  } else {
    checks.push("No claimed publish, spend, messaging, login, form submission, purchase, or connector execution found.");
  }

  if (hasSecretExposure(content)) addIssue("safety", "Safety boundary issue: output requests or exposes credentials, tokens, passwords, or API keys.");

  if (hasLocalApprovalBoundary(content)) checks.push("Local-only or approval-gated external action boundary is stated.");
  else addIssue("safety-boundary", "Safety boundary issue: output does not state the local-only or approval-gated external action boundary.");

  if (issues.length && severeIssueTags.size === 0) addWarning(`Rubric warning: ${profile.roleName} has minor review notes.`);

  const score = Math.max(0, Math.min(100, 100 - severeIssueTags.size * 14 - issues.length * 4));
  return {
    score,
    checks,
    issues,
    status: severeIssueTags.size > 0 ? "blocked" : issues.length > 0 ? "warning" : "passed",
  };
}

function normalizeProductAgentId(agentId: MissionAgentId | "TeamLeader1A"): MissionAgentId {
  return agentId === "TeamLeader1A" ? "teamleader1a" : agentId;
}

function productArtifactTrainingMinLength(agentId: MissionAgentId) {
  return agentId === "agent-publish" || agentId === "agent-action" || agentId === "teamleader1a" ? 180 : 220;
}

function productSectionTrainingMinLength(agentId: MissionAgentId) {
  return agentId === "agent-publish" || agentId === "agent-action" || agentId === "teamleader1a" ? 10 : 14;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasExactHeading(markdown: string, heading: string) {
  return new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m").test(markdown);
}

function sectionContentForHeading(markdown: string, heading: string) {
  const match = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m").exec(markdown);
  if (!match) return "";
  const sectionStart = match.index + match[0].length;
  const rest = markdown.slice(sectionStart);
  const nextHeadingIndex = rest.search(/^##\s+/m);
  const section = nextHeadingIndex >= 0 ? rest.slice(0, nextHeadingIndex) : rest;
  return section.replace(/^#{3,6}\s+.*$/gm, "").trim();
}

function hasPlaceholder(markdown: string) {
  return /\b(todo|tbd|replace this|lorem ipsum|coming soon)\b|\bplaceholder\s+(copy|text|field|section|content|asset|detail|details)\b|\{\{[^}]+\}\}|\[[^\]]*placeholder[^\]]*\]|<[^>]*(insert|replace|todo)[^>]*>|insert .{0,40} here/i.test(markdown);
}

function hasRefusalOrAcknowledgement(markdown: string) {
  return /i (can't|cannot|won't) (create|produce|write|help)|as an ai|i am unable|standing by|awaiting (your|the) (instruction|request)|acknowledged/i.test(markdown.slice(0, 1_200));
}

function hasPromptLeakage(markdown: string) {
  return [
    /previous agent handoff excerpts/i,
    /you must write the artifact now/i,
    /use these exact required markdown headings/i,
    /local agent quality card/i,
    /training library:\s*C:\\Users\\User\\\.openclaw/i,
    /failed training score/i,
    /validation blockers to fix/i,
  ].some((pattern) => pattern.test(markdown));
}

function hasConcreteDeliverables(markdown: string) {
  const bulletCount = markdown.match(/^\s*[-*]\s+\S+/gm)?.length ?? 0;
  const numberedCount = markdown.match(/^\s*\d+\.\s+\S+/gm)?.length ?? 0;
  const fieldCount = markdown.match(/^\s*(?:[-*]\s+)?[A-Z][A-Za-z0-9 /&()'-]{2,48}:\s+\S+/gm)?.length ?? 0;
  const boldFieldCount = markdown.match(/^\s*(?:[-*]\s+)?\*\*[A-Z][A-Za-z0-9 /&()'-]{2,48}:\*\*\s+\S+/gm)?.length ?? 0;
  const tableRows = markdown.match(/^\|.+\|$/gm)?.length ?? 0;
  const fileReferenceCount = markdown.match(/`[^`]+\.(?:md|json|txt|csv|html|css|js|ts|tsx|pdf|png|jpg|jpeg|webp)`/gi)?.length ?? 0;
  const checklistSignalCount = markdown.match(/\b(?:review|confirm|check|remove|duplicate|save|test|verify|approve)\b/gi)?.length ?? 0;
  const productTerms = /\b(copy|field|file|package|tier|faq|buyer|requirement|checklist|step|asset|template|deliverable|cta|headline|description|section|readiness gap|manual review|manifest|platform fields?)\b/i.test(markdown);
  const concreteStructureCount = bulletCount + numberedCount + fieldCount + boldFieldCount + tableRows;
  return productTerms && (concreteStructureCount >= 3 || fileReferenceCount >= 3 || (concreteStructureCount >= 1 && checklistSignalCount >= 3));
}

function missingRoleSignals(agentId: MissionAgentId, markdown: string) {
  const roleChecks: Record<MissionAgentId, Array<[RegExp, string]>> = {
    "agent-content": [
      [/\b(customer|buyer|audience|user)\b/i, "buyer or audience framing"],
      [/\b(problem|pain|need|job to be done|struggle)\b/i, "customer problem framing"],
      [/\b(asset|section|module|offer|product)\b/i, "offer assets or product sections"],
      [/\b(checklist|production|build|ready|review)\b/i, "production or review checklist"],
    ],
    "agent-writer": [
      [/\b(title|headline|description|copy|draft)\b/i, "actual product copy or draft"],
      [/\b(cta|call to action|buy|download|request|start|book)\b/i, "call to action or buyer next step"],
      [/\b(faq|question|answer|objection|buyer requirement|package)\b/i, "FAQ, objections, packages, or buyer requirements"],
      [/\b(claim|guarantee|avoid|risk|disclaimer)\b/i, "claim-safety notes"],
    ],
    "agent-production": [
      [/\b(file|folder|package|manifest|structure)\b/i, "file or package structure"],
      [/\b(platform|field|payload|destination)\b/i, "platform fields or destination payload"],
      [/\b(readiness|gap|missing|review)\b/i, "readiness gaps"],
      [/\b(local|delivery|handoff|approval)\b/i, "local delivery or approval notes"],
    ],
    "agent-publish": [
      [/\b(publishing checklist|publish checklist|manual review|review steps)\b/i, "publishing checklist or manual review steps"],
      [/\b(locked|blocked|no publishing|approval|external action)\b/i, "locked external action boundary"],
      [/\b(payload|field|exact|preview)\b/i, "approval payload preview"],
    ],
    "agent-action": [
      [/\b(operating|operation|checklist|workflow)\b/i, "operating checklist"],
      [/\b(next safe|safe step|user review|review step)\b/i, "next safe/user review steps"],
      [/\b(blocked action|locked action|approval|external)\b/i, "blocked actions or approval boundary"],
    ],
    teamleader1a: [
      [/\b(readiness decision|ready|revise|blocked|decision)\b/i, "readiness decision"],
      [/\b(score|scores|rubric|passed|issues|training)\b/i, "rubric and training score review"],
      [/\b(risks?|missing items?|gaps?|safe local review|local review|local-only review|ready for local review)\b/i, "risks, missing items, or safe local review"],
      [/\b(next user action|user action|next action|approval-gated|approval)\b/i, "next safe user action"],
    ],
    "agent-researcher": [
      [/\b(evidence|source|citation|demand)\b/i, "evidence or demand signal"],
      [/\b(assumption|missing proof|risk)\b/i, "assumptions or missing proof"],
    ],
    "agent-seo": [
      [/\b(keyword|search intent|cluster|query)\b/i, "keyword or search intent map"],
      [/\b(content|page|section|topic)\b/i, "content task mapping"],
    ],
  };
  return roleChecks[agentId]
    .filter(([pattern]) => !pattern.test(markdown))
    .map(([, description]) => description);
}

function hasUnsafeExternalExecution(markdown: string) {
  return [
    /\b(i|we|the agent|mission control|system)\s+(published|posted|submitted|sent|messaged|emailed|logged in|signed in|spent|paid|purchased|bought|launched)\b/i,
    /\b(executed|ran)\s+(the\s+)?(connector|browser automation|campaign|publish action)\b/i,
    /\b(no approval needed|approval is not required|without requiring approval)\b/i,
  ].some((pattern) => pattern.test(markdown));
}

function hasSecretExposure(markdown: string) {
  return /\b(api key|token|password|secret|credential)\b\s*[:=]\s*\S+|\b(send|provide|enter|store)\s+(your\s+)?(password|api key|token|credential|secret)s?\b/i.test(markdown);
}

function hasLocalApprovalBoundary(markdown: string) {
  return /\b(local-only|local only|local review|local draft|approval-gated|approval gated|separate approval|requires approval|locked external|blocked action|no publishing|do not publish|nothing external|no external action|no spend|no messaging|no login|manual review)\b/i.test(markdown);
}
