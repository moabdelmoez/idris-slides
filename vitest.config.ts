import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    passWithNoTests: true,
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "apps/**/*.test.tsx"]
  }
});
