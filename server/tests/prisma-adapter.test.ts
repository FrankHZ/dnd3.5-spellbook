import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "#prisma-app-state/generated/client";

it("commits and rolls back Prisma queries through the SQLite adapter", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spellbook-prisma-test-"));
  const filename = path.join(root, "synthetic.sqlite");
  const db = new Database(filename);
  // Only this model is needed; no migration or operator database is used.
  db.exec(`CREATE TABLE User (
    id TEXT PRIMARY KEY, email TEXT UNIQUE, createdAt DATETIME NOT NULL
  )`);
  db.close();
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: `file:${filename.replace(/\\/g, "/")}` }),
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({ data: { id: "committed", email: "commit@example.test" } });
      expect(await tx.user.count()).toBe(1);
    });
    expect(await prisma.user.findUnique({ where: { id: "committed" } }))
      .toMatchObject({ email: "commit@example.test", createdAt: expect.any(Date) });

    await expect(prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: "committed" }, data: { email: "changed@example.test" } });
      await tx.user.create({ data: { id: "rolled-back" } });
      // Fail after successful writes so rollback must undo both of them.
      throw new Error("synthetic rollback");
    })).rejects.toThrow("synthetic rollback");
    expect(await prisma.user.findUnique({ where: { id: "committed" } }))
      .toMatchObject({ email: "commit@example.test" });
    expect(await prisma.user.findUnique({ where: { id: "rolled-back" } })).toBeNull();

    await prisma.$transaction(async (tx) => {
      await tx.user.create({ data: { id: "after-rollback" } });
    });
    expect(await prisma.user.findMany({ orderBy: { id: "asc" }, select: { id: true } }))
      .toEqual([{ id: "after-rollback" }, { id: "committed" }]);
  } finally {
    await prisma.$disconnect();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
