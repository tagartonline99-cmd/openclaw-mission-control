import { isTauri } from "@tauri-apps/api/core";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

function isTauriRuntime() {
  return isTauri() || (typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window));
}

export type UpdaterCheckResult =
  | { ok: true; mode: "tauri"; update: Update | null }
  | { ok: false; mode: "browser" | "tauri"; message: string };

export const updaterService = {
  isAvailable() {
    return isTauriRuntime();
  },
  async checkForUpdate(): Promise<UpdaterCheckResult> {
    if (!isTauriRuntime()) {
      return {
        ok: false,
        mode: "browser",
        message: "Updater checks require the installed Tauri desktop app.",
      };
    }

    try {
      const update = await check({ timeout: 20_000 });
      return { ok: true, mode: "tauri", update };
    } catch (error) {
      return {
        ok: false,
        mode: "tauri",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
  async installUpdate(update: Update, onEvent?: (event: DownloadEvent) => void) {
    await update.downloadAndInstall(onEvent, { timeout: 120_000 });
    await relaunch();
  },
};
