import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

type PortableFixtureRow = {
  op: "insert";
  table: string;
  key?: string;
  data: Record<string, unknown>;
};

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function serverDbFixturePath(
  dbRole: "rules-clean" | "content" | "app-state",
  fileName: string,
) {
  return path.join(
    __dirname,
    "..",
    "..",
    "db",
    dbRole,
    "fixtures",
    "portable",
    fileName,
  );
}

export function loadPortableFixtureFile(
  db: Database.Database,
  fixturePath: string,
) {
  const content = fs.readFileSync(fixturePath, "utf8");
  const rows = content
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line.length > 0);

  for (const { line, lineNumber } of rows) {
    const fixture = JSON.parse(line) as PortableFixtureRow;
    insertFixtureRow(db, fixture, `${fixturePath}:${lineNumber}`);
  }
}

function insertFixtureRow(
  db: Database.Database,
  fixture: PortableFixtureRow,
  source: string,
) {
  if (fixture.op !== "insert") {
    throw new Error(`Unsupported fixture op at ${source}: ${fixture.op}`);
  }
  assertIdentifier(fixture.table, source);

  const columns = Object.keys(fixture.data);
  if (columns.length === 0) {
    throw new Error(`Fixture insert has no data at ${source}`);
  }
  for (const column of columns) assertIdentifier(column, source);

  const columnSql = columns.map((column) => `"${column}"`).join(", ");
  const valueSql = columns.map((column) => `@${column}`).join(", ");
  db.prepare(
    `INSERT INTO "${fixture.table}" (${columnSql}) VALUES (${valueSql})`,
  ).run(fixture.data);
}

function assertIdentifier(value: string, source: string) {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`Unsafe fixture identifier at ${source}: ${value}`);
  }
}
