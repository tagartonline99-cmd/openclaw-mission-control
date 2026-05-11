import { CheckCircle2, Github, PackageCheck, ShieldAlert, UploadCloud } from "lucide-react";
import packageJson from "../../../package.json";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const version = packageJson.version;
const artifactFolder = `release-artifacts\\v${version}`;
const requiredAssets = [
  "latest.json",
  `OpenClaw Mission Control_${version}_x64-setup.exe`,
  `OpenClaw Mission Control_${version}_x64-setup.exe.sig`,
  `OpenClaw Mission Control_${version}_x64_en-US.msi`,
];

export function ReleaseChecklistPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-teal-100" />
          Release And Updater Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-black/25 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Current version</p>
            <p className="mt-2 text-2xl font-semibold text-stone-50">{version}</p>
          </div>
          <div className="rounded-md border border-amber-300/20 bg-amber-400/8 p-3">
            <p className="text-xs font-semibold uppercase text-amber-100">GitHub upload status</p>
            <p className="mt-2 text-sm leading-6 text-amber-50">Blocked until GitHub CLI is authenticated or assets are uploaded manually.</p>
          </div>
          <div className="rounded-md border border-teal-300/20 bg-teal-400/8 p-3">
            <p className="text-xs font-semibold uppercase text-teal-100">Updater verification</p>
            <p className="mt-2 text-sm leading-6 text-teal-50">Signed artifacts are prepared locally before upload.</p>
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
            <UploadCloud className="h-3.5 w-3.5" />
            Manual upload checklist
          </p>
          <p className="mt-2 text-sm text-slate-300">Create GitHub release <code>v{version}</code> and upload every file from <code>{artifactFolder}</code>:</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {requiredAssets.map((asset) => (
              <div key={asset} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/25 p-2 text-xs text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-100" />
                {asset}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-black/25 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <Github className="h-3.5 w-3.5" />
              Authenticated path
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Run <code>npm.cmd run release:checklist</code>. If GitHub CLI is authenticated, use the printed <code>gh release</code> command to upload.
            </p>
          </div>
          <div className="rounded-md border border-red-300/20 bg-red-500/8 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-red-100">
              <ShieldAlert className="h-3.5 w-3.5" />
              Business safety boundary
            </p>
            <p className="mt-2 text-sm leading-6 text-red-100">
              Updater work never runs OpenClaw commands, publishing, messaging, scraping, browser automation, spending, or external account actions.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
