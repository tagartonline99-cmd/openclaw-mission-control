import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const tag = `v${version}`;
const artifactDir = path.join(root, "release-artifacts", tag);
const requiredAssets = [
  "latest.json",
  `OpenClaw Mission Control_${version}_x64-setup.exe`,
  `OpenClaw Mission Control_${version}_x64-setup.exe.sig`,
  `OpenClaw Mission Control_${version}_x64_en-US.msi`,
];

function run(command, args) {
  try {
    return execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    return "";
  }
}

function findGh() {
  const local = run("where", ["gh.exe"]);
  if (local) return local.split(/\r?\n/)[0];
  const programFiles = "C:\\Program Files\\GitHub CLI\\gh.exe";
  return existsSync(programFiles) ? programFiles : "";
}

const commit = run("git", ["rev-parse", "--short", "HEAD"]);
const exactTag = run("git", ["describe", "--tags", "--exact-match"]);
const gitStatus = run("git", ["status", "--short"]);
const assets = requiredAssets.map((asset) => ({
  asset,
  path: path.join(artifactDir, asset),
  exists: existsSync(path.join(artifactDir, asset)),
}));
const latestJsonPath = path.join(artifactDir, "latest.json");
let latestJsonOk = false;
let latestJsonVersion = "";
try {
  const latestJson = JSON.parse(readFileSync(latestJsonPath, "utf8"));
  latestJsonVersion = latestJson.version ?? "";
  latestJsonOk = latestJsonVersion === version && Boolean(latestJson.platforms?.["windows-x86_64"]?.signature);
} catch {
  latestJsonOk = false;
}

const ghPath = findGh();
const ghAuth = ghPath ? spawnSync(ghPath, ["auth", "status"], { cwd: root, encoding: "utf8" }) : undefined;
const ghAuthenticated = Boolean(ghAuth && ghAuth.status === 0);
const uploadCommand = ghPath
  ? `"${ghPath}" release create ${tag} ${requiredAssets.map((asset) => JSON.stringify(path.join(artifactDir, asset))).join(" ")} --repo tagartonline99-cmd/openclaw-mission-control --title "OpenClaw Mission Control ${tag}" --notes "Signed updater release ${tag}."`
  : "Install/authenticate GitHub CLI, then run gh release create with the files listed below.";

const status = {
  version,
  tag,
  commit,
  exactTag,
  gitClean: gitStatus.length === 0,
  artifactDir,
  assets,
  latestJsonOk,
  latestJsonVersion,
  ghPath,
  ghAuthenticated,
  uploadStatus: ghAuthenticated ? "ready_to_upload" : "blocked_auth",
  uploadCommand,
};

mkdirSync(artifactDir, { recursive: true });
writeFileSync(path.join(artifactDir, "release-status.json"), JSON.stringify(status, null, 2));
writeFileSync(
  path.join(artifactDir, "manual-upload-checklist.md"),
  [
    `# OpenClaw Mission Control ${tag} Release Upload Checklist`,
    "",
    `Commit: ${commit || "unknown"}`,
    `Tag on current commit: ${exactTag || "missing"}`,
    `Git clean: ${status.gitClean}`,
    `latest.json valid: ${latestJsonOk}`,
    `GitHub CLI authenticated: ${ghAuthenticated}`,
    "",
    "## Upload these files",
    ...assets.map((item) => `- [${item.exists ? "x" : " "}] ${item.path}`),
    "",
    "## Command",
    "```powershell",
    uploadCommand,
    "```",
  ].join("\n"),
);

console.log(JSON.stringify(status, null, 2));
if (!ghAuthenticated) {
  console.log(`\nRelease publish is blocked until GitHub CLI is authenticated or assets are uploaded manually from ${artifactDir}`);
}
