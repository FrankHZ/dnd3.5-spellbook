import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

function sqlitePathFromFileUrl(value: string): string {
  if (!value.startsWith("file:")) {
    throw new Error("Only file: SQLite URLs are supported");
  }

  const withoutScheme = value.slice("file:".length).split("?")[0];
  if (!withoutScheme) {
    throw new Error("SQLite file URL must include a path");
  }

  const decoded = decodeURIComponent(withoutScheme);
  if (/^[A-Za-z]:[\\/]/.test(decoded) || path.isAbsolute(decoded)) {
    return path.normalize(decoded);
  }

  return path.resolve(decoded);
}

const envName = process.argv[2];
if (!envName) {
  throw new Error("Usage: tsx scripts/ensure-sqlite-file.ts <ENV_NAME>");
}

const url = process.env[envName];
if (!url) {
  throw new Error(`${envName} is required`);
}

const sqlitePath = sqlitePathFromFileUrl(url);
fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });

const db = new Database(sqlitePath);
db.close();

console.log(`SQLite file ready: ${sqlitePath}`);
