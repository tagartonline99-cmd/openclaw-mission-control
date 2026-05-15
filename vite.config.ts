import { realpathSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const workspaceRoot = realpathSync(process.cwd());

export default defineConfig({
  root: workspaceRoot,
  plugins: [react()],
  clearScreen: false,
  server: {
    strictPort: false,
    port: 5173,
  },
});
