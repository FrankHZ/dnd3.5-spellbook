import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "prisma-rules-clean/generated/client";

import { loadServerEnv } from "../shared/env";

loadServerEnv();

const connectionString = `${process.env.RULES_DATABASE_URL}`;

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const rulesPrisma = new PrismaClient({ adapter });

export { rulesPrisma };
