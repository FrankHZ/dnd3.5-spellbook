import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "#prisma-app-state/generated/client";

const connectionString = process.env.APP_STATE_DATABASE_URL;

if (!connectionString) {
  throw new Error("APP_STATE_DATABASE_URL is required");
}

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const appStatePrisma = new PrismaClient({ adapter });

export { appStatePrisma };
