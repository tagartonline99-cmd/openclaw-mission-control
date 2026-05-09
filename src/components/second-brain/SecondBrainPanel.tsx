import { useMemo, useState } from "react";
import { Brain, Download, Eye, FolderOpen } from "lucide-react";
import { renderMarkdownNote, noteTemplateDescriptions } from "../../utils/markdown";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAppData } from "../../app/AppDataContext";

export function SecondBrainPanel() {
  const { data, selectObsidianVault, exportObsidianNote, revealExportedPath, lastExportResult } = useAppData();
  const { obsidianNotes, userSettings } = data;
  const [selectedNoteId, setSelectedNoteId] = useState(obsidianNotes[0]?.id ?? "");
  const selectedNote = obsidianNotes.find((note) => note.id === selectedNoteId) ?? obsidianNotes[0];
  const markdown = useMemo(() => (selectedNote ? renderMarkdownNote(selectedNote) : ""), [selectedNote]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-amber-100" />
            Obsidian Second Brain
          </CardTitle>
          <p className="mt-1 text-sm text-slate-400">Export Markdown notes with frontmatter to a selected local Obsidian vault from the Tauri desktop shell.</p>
        </div>
        <Badge tone="teal">Local export</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Vault path</p>
            <Input value={userSettings.obsidianVaultPath} readOnly />
            <Button className="mt-2 w-full" variant="outline" size="sm" onClick={() => void selectObsidianVault()}>
              <FolderOpen className="h-4 w-4" />
              Select vault folder
            </Button>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Default quest folder</p>
            <Input value={userSettings.obsidianDefaultFolders.quests} readOnly />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Default validation folder</p>
            <Input value={userSettings.obsidianDefaultFolders.validation} readOnly />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            {obsidianNotes.map((note) => (
              <button
                key={note.id}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selectedNoteId === note.id
                    ? "border-amber-300/45 bg-amber-300/10"
                    : "border-white/10 bg-black/20 hover:border-white/20"
                }`}
                onClick={() => setSelectedNoteId(note.id)}
              >
                <p className="font-semibold text-stone-100">{note.title}</p>
                <p className="mt-1 text-xs uppercase text-slate-500">{note.type.replace(/_/g, " ")} / {note.folder}</p>
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-white/10 bg-black/35">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-3">
              <div>
                <p className="font-semibold text-stone-100">{selectedNote?.title}</p>
                <p className="text-xs text-slate-500">{userSettings.obsidianVaultPath}\{selectedNote?.folder}\{selectedNote?.title}.md</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><Eye className="h-4 w-4" /> Preview</Button>
                <Button variant="secondary" size="sm" onClick={() => selectedNote && void exportObsidianNote(selectedNote)}>
                  <Download className="h-4 w-4" />
                  Export to Obsidian
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!lastExportResult?.path}
                  onClick={() => lastExportResult?.path && void revealExportedPath(lastExportResult.path)}
                >
                  <FolderOpen className="h-4 w-4" />
                  Open location
                </Button>
              </div>
            </div>
            <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap p-4 text-xs leading-5 text-slate-300">{markdown}</pre>
          </div>
        </div>
        {lastExportResult ? (
          <div className={`rounded-lg border p-3 text-sm ${lastExportResult.ok ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100" : "border-amber-300/30 bg-amber-400/10 text-amber-100"}`}>
            {lastExportResult.message}
          </div>
        ) : null}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Available templates</p>
          <div className="flex flex-wrap gap-2">
            {noteTemplateDescriptions.map((template) => <Badge key={template} tone="slate">{template}</Badge>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
