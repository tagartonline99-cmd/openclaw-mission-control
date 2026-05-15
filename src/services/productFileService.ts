import { invoke, isTauri } from "@tauri-apps/api/core";

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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`)), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
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
      return await withTimeout(
        invoke<ProductFileWriteResult>("write_product_files", {
          request: {
            rootPath: input.rootPath,
            files: input.files,
          },
        }),
        45_000,
        "Product file write",
      );
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
