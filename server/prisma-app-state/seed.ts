import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/client";

const connectionString = process.env.APP_STATE_DATABASE_URL;

if (!connectionString) {
  throw new Error("APP_STATE_DATABASE_URL is required");
}

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const appStatePrismaClient = new PrismaClient({ adapter });

async function main() {
  // Optional dev user for future server-owned app-state experiments.
  await appStatePrismaClient.user.upsert({
    where: { id: "dev-user" },
    update: {},
    create: { id: "dev-user", email: "dev@example.com" },
  });
}

main().finally(async () => appStatePrismaClient.$disconnect());
