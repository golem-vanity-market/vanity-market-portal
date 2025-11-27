import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression2";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "node:path";
import * as child from "node:child_process";

const commitHash = child
  .execSync("git rev-parse --short HEAD")
  .toString()
  .trim();

// https://vitejs.dev/config https://vitest.dev/config
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    define: {
      "import.meta.env.VITE_GIT_COMMIT": `"${commitHash}"`,
    },
    plugins: [
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
      tailwindcss(),
      compression(),
      nodePolyfills({
        // Whether to polyfill `node:` protocol imports.
        include: ["buffer"],
      }),
    ],
    base: env.VITE_BASE || "/",
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return id
                .toString()
                .split("node_modules/")[1]
                .split("/")[0]
                .toString();
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      exclude: ["brotli-wasm", "brotli-wasm/pkg.bundler/brotli_wasm_bg.wasm"],
    },
  };
});
