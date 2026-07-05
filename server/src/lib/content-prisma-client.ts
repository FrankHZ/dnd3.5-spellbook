import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "#prisma-content/generated/client";

const connectionString = process.env.CONTENT_DATABASE_URL ?? process.env.APP_DATABASE_URL;

if (!connectionString) {
  throw new Error("CONTENT_DATABASE_URL or transitional APP_DATABASE_URL is required");
}

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const contentPrisma = new PrismaClient({ adapter });

export { contentPrisma };
