import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "../prisma-app-state/schema.prisma",
  migrations: {
    path: "../db/app-state/migrations",
    seed: "tsx ./db/app-state/seed.ts",
  },
  datasource: {
    url: env("APP_STATE_DATABASE_URL"),
  },
});
