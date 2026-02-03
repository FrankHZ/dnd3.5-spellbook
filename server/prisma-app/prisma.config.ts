import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "../prisma-app/schema.prisma",
  migrations: {
    path: "./migrations",
    seed: "tsx ./prisma-app/seed.ts",
  },
  datasource: {
    url: env("APP_DATABASE_URL"),
  },
});
