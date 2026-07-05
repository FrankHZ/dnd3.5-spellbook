import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["source"],
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    hookTimeout: 30_000,
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**"],
    server: {
      deps: {
        inline: true,
      },
    },
    setupFiles: ["tests/setup-test-dbs.ts"],
    testTimeout: 30_000,
  },
});
