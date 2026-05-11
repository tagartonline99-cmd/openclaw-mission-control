import { isTauri } from "@tauri-apps/api/core";

export type ProductFileWriteInput = {
  rootPath: string;
  files: Array<{
    fileName: string;
    content: string;
  }>;
};

export type ProductFileWriteResult = {
  ok: boolean;
  mode: "tauri-file" | "browser-virtual" | "failed";
  rootPath: string;
  written: Array<{ fileName: string; path: string; ok: boolean; error?: string }>;
  message: string;
};

function isTauriRuntime() {
  return isTauri() || (typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window));
}

function joinPath(rootPath: string, fileName: string) {
  return `${rootPath.replace(/[\\\/]+$/, "")}\\${fileName.replace(/^[\\\/]+/, "")}`;
}

export function slugifyProductName(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "openclaw-product";
}

export function productRootPath(name: string) {
  return `C:\\Users\\User\\.openclaw\\mission-control-products\\${slugifyProductName(name)}`;
}

export const productFileService = {
  async writeFiles(input: ProductFileWriteInput): Promise<ProductFileWriteResult> {
    const written = input.files.map((file) => ({
      fileName: file.fileName,
      path: joinPath(input.rootPath, file.fileName),
      ok: false,
    }));

    if (!isTauriRuntime()) {
      return {
        ok: true,
        mode: "browser-virtual",
        rootPath: input.rootPath,
        written: written.map((file) => ({ ...file, ok: true })),
        message: "Browser preview created virtual product file records. The installed desktop app writes real files under .openclaw.",
      };
    }

    try {
      const fs = await import("@tauri-apps/plugin-fs");
      await fs.mkdir(input.rootPath, { recursive: true });
      const results = [];
      for (const file of input.files) {
        const path = joinPath(input.rootPath, file.fileName);
        try {
          await fs.writeTextFile(path, file.content);
          results.push({ fileName: file.fileName, path, ok: true });
        } catch (error) {
          results.push({ fileName: file.fileName, path, ok: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
      const ok = results.every((file) => file.ok);
      return {
        ok,
        mode: ok ? "tauri-file" : "failed",
        rootPath: input.rootPath,
        written: results,
        message: ok
          ? `Wrote ${results.length} real product file(s) to ${input.rootPath}.`
          : "Some product files could not be written. See file records for details.",
      };
    } catch (error) {
      return {
        ok: false,
        mode: "failed",
        rootPath: input.rootPath,
        written: written.map((file) => ({ ...file, error: error instanceof Error ? error.message : String(error) })),
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
