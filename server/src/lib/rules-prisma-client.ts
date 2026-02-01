import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "DB_RULES/client";

const connectionString = `${process.env.RULES_CLEAN_DATABASE_URL}`;

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const rulesPrismaClient = new PrismaClient({ adapter });

export { rulesPrismaClient };
