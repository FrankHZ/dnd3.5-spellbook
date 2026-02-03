import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "prisma-app/generated/client";

const connectionString = `${process.env.APP_DATABASE_URL}`;

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const appPrisma = new PrismaClient({ adapter });

export { appPrisma };
