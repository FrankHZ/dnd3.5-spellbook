import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
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
