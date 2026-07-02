import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "../prisma-app-state/schema.prisma",
  migrations: {
    path: "./migrations",
    seed: "tsx ./prisma-app-state/seed.ts",
  },
  datasource: {
    url: env("APP_STATE_DATABASE_URL"),
  },
});
