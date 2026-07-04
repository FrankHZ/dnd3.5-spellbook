import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(rootDir, "src"),
      "prisma-rules-clean": path.resolve(rootDir, "prisma-rules-clean"),
      "prisma-content": path.resolve(rootDir, "prisma-content"),
      "prisma-app-state": path.resolve(rootDir, "prisma-app-state"),
      DB_RULES: path.resolve(rootDir, "prisma-rules-clean/generated"),
      DB_CONTENT: path.resolve(rootDir, "prisma-content/generated"),
      DB_APP_STATE: path.resolve(rootDir, "prisma-app-state/generated"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    hookTimeout: 30_000,
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules/**", "dist/**"],
    setupFiles: ["tests/setup-test-dbs.ts"],
    testTimeout: 30_000,
  },
});
