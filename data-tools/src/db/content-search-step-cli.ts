import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { loadServerEnv, repoRoot, resolveServerRelativePath } from "../shared/env";
import { contentSearchStep, type ContentSearchStepResult } from "./content-search-step";

export function runContentSearchStepFile(dbPath: string, mode: "check" | "apply" = "check"): ContentSearchStepResult {
  if (mode !== "check" && mode !== "apply") throw new Error("Unknown search step mode");
  loadServerEnv();
  const target = fs.realpathSync(dbPath);
  const comparable = (value: string) => process.platform === "win32" ? value.toLowerCase() : value;
  for (const key of ["RULES_DATABASE_URL", "APP_STATE_DATABASE_URL"]) {
    const url = process.env[key];
    if (url?.startsWith("file:")) {
      // Compare configured paths without opening other databases.
      const other = resolveServerRelativePath(url.slice(5));
      if (fs.existsSync(other) && comparable(fs.realpathSync(other)) === comparable(target)) {
        throw new Error(`Content target must differ from ${key}`);
      }
    }
  }
  const checkDb = new Database(target, {readonly: true, fileMustExist: true});
  let check: ContentSearchStepResult;
  try {check = contentSearchStep(checkDb);}
  finally {checkDb.close();}
  // A completed apply repeat never even acquires a writable connection.
  if (mode === "check" || check.state === "current") return {...check, mode};
  const db = new Database(target, {fileMustExist: true});
  try {return contentSearchStep(db, "apply");}
  finally {db.close();}
}

function main() {
  const args = process.argv.slice(2);
  let database: string | undefined;
  let mode: "check" | "apply" = "check";
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (seen.has(arg)) throw new Error(`Duplicate argument: ${arg}`);
    seen.add(arg);
    if (arg === "--apply") {mode = "apply"; continue;}
    if (arg !== "--content-db" || !args[i + 1] || args[i + 1]!.startsWith("--")) {
      throw new Error("Usage: content:search:step -- [--content-db <existing.sqlite>] [--apply]");
    }
    database = path.resolve(repoRoot(), args[++i]!);
  }
  loadServerEnv();
  if (!database) {
    const url = process.env.CONTENT_DATABASE_URL;
    if (!url?.startsWith("file:")) throw new Error("CONTENT_DATABASE_URL must be a file: SQLite URL, or supply --content-db");
    database = resolveServerRelativePath(url.slice(5));
  }
  console.log(JSON.stringify(runContentSearchStepFile(database, mode), null, 2));
}

if (require.main === module) {
  try {main();} catch (error) {console.error(String(error)); process.exitCode = 1;}
}
