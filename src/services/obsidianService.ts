import type { ObsidianNote } from "../types";
import { renderMarkdownNote } from "../utils/markdown";
import { persistenceService } from "./persistenceService";

async function state() {
  return (await persistenceService.loadState()).state;
}

export const obsidianService = {
  async listNotes() {
    return (await state()).obsidianNotes;
  },
  async getSettings() {
    const { userSettings } = await state();
    return {
      vaultPath: userSettings.obsidianVaultPath,
      folders: userSettings.obsidianDefaultFolders,
    };
  },
  async previewExport(note: ObsidianNote) {
    const { userSettings } = await state();
    return {
      pathPreview: `${userSettings.obsidianVaultPath}\\${note.folder}\\${note.title}.md`,
      markdown: renderMarkdownNote(note),
      mode: "local-markdown" as const,
    };
  },
};
