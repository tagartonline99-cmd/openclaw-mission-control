import type { ObsidianNote } from "../types";

function formatFrontmatterValue(value: string | number | boolean | string[]) {
  if (Array.isArray(value)) {
    return `\n${value.map((item) => `  - ${item}`).join("\n")}`;
  }
  return String(value);
}

export function renderMarkdownNote(note: ObsidianNote) {
  const frontmatter = Object.entries(note.frontmatter)
    .map(([key, value]) => `${key}: ${formatFrontmatterValue(value)}`)
    .join("\n");

  return `---\n${frontmatter}\n---\n\n# ${note.title}\n\n${note.body}`;
}

export const noteTemplateDescriptions = [
  "Business idea",
  "Market research",
  "Competitor research",
  "Keyword research",
  "Experiment log",
  "Decision log",
  "Agent memory",
  "SOP",
  "Content plan",
  "Revenue report",
  "Lessons learned",
  "Validation report",
  "Quest summary",
  "OpenClaw command log",
  "OpenClaw agent memory",
  "OpenClaw system report",
];
