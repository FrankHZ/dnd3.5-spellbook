import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/client";

const connectionString = `${process.env.APP_DATABASE_URL}`;

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const appPrismaClient = new PrismaClient({ adapter });

async function main() {
  // optional dev user
  await appPrismaClient.user.upsert({
    where: { id: "dev-user" },
    update: {},
    create: { id: "dev-user", email: "dev@example.com" },
  });
}

main().finally(async () => appPrismaClient.$disconnect());
