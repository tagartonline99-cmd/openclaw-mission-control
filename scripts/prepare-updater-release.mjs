import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoOwner = "tagartonline99-cmd";
const repoName = "openclaw-mission-control";
const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const bundleRoot = path.join(root, "src-tauri", "target", "release", "bundle");
const outputDir = path.join(root, "release-artifacts", `v${version}`);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function githubAssetUrl(filePath) {
  const name = path.basename(filePath);
  return `https://github.com/${repoOwner}/${repoName}/releases/download/v${version}/${encodeURIComponent(name)}`;
}

const files = walk(bundleRoot);
const updaterArtifact =
  files.find((file) => file.endsWith(".nsis.zip") && file.includes(version)) ??
  files.find((file) => file.endsWith(".zip") && file.includes(version)) ??
  files.find((file) => file.endsWith("-setup.exe") && file.includes(version));

if (!updaterArtifact) {
  console.error("No updater artifact found. Run with TAURI_SIGNING_PRIVATE_KEY set and ensure bundle.createUpdaterArtifacts is true.");
  process.exit(1);
}

const signaturePath = `${updaterArtifact}.sig`;
if (!fs.existsSync(signaturePath)) {
  console.error(`Missing updater signature: ${signaturePath}`);
  process.exit(1);
}

const installerArtifacts = files.filter((file) => {
  const ext = path.extname(file).toLowerCase();
  return file !== updaterArtifact && file.includes(version) && [".exe", ".msi"].includes(ext);
});

fs.mkdirSync(outputDir, { recursive: true });

for (const file of [updaterArtifact, signaturePath, ...installerArtifacts]) {
  fs.copyFileSync(file, path.join(outputDir, path.basename(file)));
}

const latest = {
  version,
  notes: `OpenClaw Mission Control ${version}. Signed updater release. See README for safety and updater notes.`,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: fs.readFileSync(signaturePath, "utf8").trim(),
      url: githubAssetUrl(updaterArtifact),
    },
  },
};

const latestPath = path.join(outputDir, "latest.json");
fs.writeFileSync(latestPath, `${JSON.stringify(latest, null, 2)}\n`);

console.log("Updater release artifacts prepared:");
console.log(`- ${latestPath}`);
console.log(`- ${path.join(outputDir, path.basename(updaterArtifact))}`);
console.log(`- ${path.join(outputDir, path.basename(signaturePath))}`);
for (const file of installerArtifacts) {
  console.log(`- ${path.join(outputDir, path.basename(file))}`);
}
console.log("");
console.log(`Create GitHub release v${version} and upload every file from:`);
console.log(outputDir);
