import { useEffect, useRef, useState } from "react";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";
import { Download, RefreshCw, Rocket, ShieldCheck } from "lucide-react";
import { useAppData } from "../../app/AppDataContext";
import { updaterService } from "../../services/updaterService";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog } from "../ui/dialog";
import { Progress } from "../ui/progress";

type Status = "idle" | "checking" | "available" | "current" | "installing" | "error";

const UPDATER_VERIFICATION_MARKER = "Approve Business responsiveness hotfix 0.1.38";

function progressPercent(downloaded: number, total?: number) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((downloaded / total) * 100));
}

export function UpdateManager({ autoCheck = false, compact = false }: { autoCheck?: boolean; compact?: boolean }) {
  const { recordSystemLog } = useAppData();
  const [status, setStatus] = useState<Status>("idle");
  const [update, setUpdate] = useState<Update | null>(null);
  const [message, setMessage] = useState("Updater is ready.");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(0);
  const [totalBytes, setTotalBytes] = useState<number | undefined>();
  const checkedRef = useRef(false);

  async function checkNow(source: "auto" | "manual") {
    if (source === "auto" && checkedRef.current) return;
    checkedRef.current = true;
    setStatus("checking");
    setMessage("Checking GitHub Releases for a signed update...");

    const result = await updaterService.checkForUpdate();
    if (!result.ok) {
      setStatus("error");
      setMessage(result.message);
      await recordSystemLog({
        title: "Updater check failed",
        detail: result.message,
        severity: source === "auto" ? "warning" : "danger",
      });
      return;
    }

    if (!result.update) {
      setStatus("current");
      setUpdate(null);
      setMessage("OpenClaw Mission Control is up to date.");
      if (source === "manual") {
        await recordSystemLog({
          title: "Updater check completed",
          detail: "No newer signed release was found.",
          severity: "success",
        });
      }
      return;
    }

    setUpdate(result.update);
    setStatus("available");
    setMessage(`Version ${result.update.version} is available.`);
    setDialogOpen(true);
    await recordSystemLog({
      title: "Update available",
      detail: `Version ${result.update.version} is available from GitHub Releases.`,
      severity: "info",
    });
  }

  async function install() {
    if (!update) return;
    setStatus("installing");
    setMessage("Downloading and verifying the signed update...");
    setDownloaded(0);
    setTotalBytes(undefined);

    try {
      await updaterService.installUpdate(update, (event: DownloadEvent) => {
        if (event.event === "Started") {
          setTotalBytes(event.data.contentLength);
          setDownloaded(0);
        }
        if (event.event === "Progress") {
          setDownloaded((current) => current + event.data.chunkLength);
        }
        if (event.event === "Finished") {
          setMessage("Update downloaded. Installing and relaunching...");
        }
      });
      await recordSystemLog({
        title: "Update installed",
        detail: `Installed version ${update.version}. The app will relaunch.`,
        severity: "success",
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setStatus("error");
      setMessage(detail);
      await recordSystemLog({
        title: "Update install failed",
        detail,
        severity: "danger",
      });
    }
  }

  useEffect(() => {
    if (!autoCheck) return;
    const timer = window.setTimeout(() => {
      void checkNow("auto");
    }, 2_500);
    return () => window.clearTimeout(timer);
  }, [autoCheck]);

  const percent = progressPercent(downloaded, totalBytes);

  return (
    <>
      {compact ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-teal-100" />
              Auto Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">{UPDATER_VERIFICATION_MARKER}</p>
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm leading-6 text-slate-300">{message}</p>
                <Badge tone={status === "error" ? "red" : status === "available" ? "amber" : "teal"}>{status}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void checkNow("manual")} disabled={status === "checking" || status === "installing"}>
                <RefreshCw className="h-4 w-4" />
                Check for updates
              </Button>
              {update ? (
                <Button onClick={() => setDialogOpen(true)}>
                  <Download className="h-4 w-4" />
                  View update
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={dialogOpen} title="OpenClaw Mission Control Update" onClose={() => status !== "installing" && setDialogOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-teal-100">Signed GitHub release</p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-stone-50">
                  {update ? `Version ${update.version}` : "Checking for update"}
                </h3>
              </div>
              <Badge tone="amber">{status}</Badge>
            </div>
            {update?.body ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{update.body}</p> : null}
          </div>

          <div className="rounded-md border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-300">
            <ShieldCheck className="mb-2 h-4 w-4 text-emerald-100" />
            Updates are downloaded from the configured GitHub Releases endpoint and verified with the Tauri updater public key before install.
          </div>

          {status === "installing" ? (
            <div className="space-y-2">
              <Progress value={percent || 12} tone="teal" />
              <p className="text-xs text-slate-400">
                {totalBytes ? `${downloaded.toLocaleString()} / ${totalBytes.toLocaleString()} bytes` : "Preparing download..."}
              </p>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="rounded-md border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">{message}</div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={status === "installing"}>
              Later
            </Button>
            <Button onClick={() => void install()} disabled={!update || status === "installing"}>
              <Rocket className="h-4 w-4" />
              Install update
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
