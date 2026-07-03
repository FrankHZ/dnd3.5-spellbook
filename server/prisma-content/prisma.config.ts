import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "../prisma-content/schema.prisma",
  migrations: {
    path: "../db/content/migrations",
  },
  datasource: {
    url: env("CONTENT_DATABASE_URL"),
  },
});
