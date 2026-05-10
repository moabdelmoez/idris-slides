import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["@idris-slides/core", "@idris-slides/project"] })],
    build: {
      rollupOptions: {
        input: resolve(currentDir, "src/main/main.ts")
      }
    }
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ["@idris-slides/brand", "@idris-slides/core", "@idris-slides/project"]
      })
    ],
    build: {
      rollupOptions: {
        input: resolve(currentDir, "src/preload/preload.ts")
      }
    }
  },
  renderer: {
    root: currentDir,
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(currentDir, "index.html")
      }
    }
  }
});
