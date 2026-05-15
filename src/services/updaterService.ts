import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

function isTauriRuntime() {
  return isTauri() || (typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window));
}

type ParsedSemver = {
  release: [number, number, number];
  prerelease: string[];
};

function parseSemver(version: string): ParsedSemver | null {
  const normalized = version.trim().replace(/^v/i, "").split("+")[0];
  const prereleaseIndex = normalized.indexOf("-");
  const releaseText = prereleaseIndex === -1 ? normalized : normalized.slice(0, prereleaseIndex);
  const prerelease = prereleaseIndex === -1 ? [] : normalized.slice(prereleaseIndex + 1).split(".");
  const releaseParts = releaseText.split(".");

  if (releaseParts.length < 1 || releaseParts.length > 3) return null;
  const release = releaseParts.map((part) => {
    if (!/^\d+$/.test(part)) return null;
    return Number(part);
  });
  if (release.some((part) => part === null || !Number.isSafeInteger(part))) return null;

  return {
    release: [release[0] ?? 0, release[1] ?? 0, release[2] ?? 0] as [number, number, number],
    prerelease,
  };
}

export function compareSemverVersions(candidateVersion: string, currentVersion: string): -1 | 0 | 1 | null {
  const candidate = parseSemver(candidateVersion);
  const current = parseSemver(currentVersion);
  if (!candidate || !current) return null;

  for (let index = 0; index < candidate.release.length; index += 1) {
    if (candidate.release[index] > current.release[index]) return 1;
    if (candidate.release[index] < current.release[index]) return -1;
  }

  if (!candidate.prerelease.length && current.prerelease.length) return 1;
  if (candidate.prerelease.length && !current.prerelease.length) return -1;

  const length = Math.max(candidate.prerelease.length, current.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const candidatePart = candidate.prerelease[index];
    const currentPart = current.prerelease[index];
    if (candidatePart === undefined && currentPart === undefined) return 0;
    if (candidatePart === undefined) return -1;
    if (currentPart === undefined) return 1;
    if (candidatePart === currentPart) continue;

    const candidateNumeric = /^\d+$/.test(candidatePart);
    const currentNumeric = /^\d+$/.test(currentPart);
    if (candidateNumeric && currentNumeric) {
      const candidateNumber = Number(candidatePart);
      const currentNumber = Number(currentPart);
      if (candidateNumber > currentNumber) return 1;
      if (candidateNumber < currentNumber) return -1;
      continue;
    }
    if (candidateNumeric) return -1;
    if (currentNumeric) return 1;
    return candidatePart > currentPart ? 1 : -1;
  }

  return 0;
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
      if (update) {
        const currentVersion = await getVersion().catch(() => update.currentVersion);
        const versionComparison = compareSemverVersions(update.version, currentVersion);
        if (versionComparison !== null && versionComparison <= 0) {
          await update.close().catch(() => undefined);
          return { ok: true, mode: "tauri", update: null };
        }
      }
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
