import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { loadServerEnv, repoRoot, resolveServerRelativePath } from "../shared/env";
import { summaryImportStep, type SummaryImportStepResult } from "./import-step";

/** Explicit CLI paths are checkout-root-relative; this file API takes resolved paths. */
export function runSummaryImportStepFile(dbPath: string, inputPath: string, previousInputPath: string,
  mode: "check" | "apply" = "check"): SummaryImportStepResult {
  if (mode !== "check" && mode !== "apply") throw new Error("Unknown summary import mode");
  loadServerEnv();
  const target = fs.realpathSync(dbPath);
  const comparable = (value: string) => process.platform === "win32" ? value.toLowerCase() : value;
  for (const key of ["RULES_DATABASE_URL", "APP_STATE_DATABASE_URL"]) {
    const url = process.env[key];
    if (url?.startsWith("file:")) {
      const other = resolveServerRelativePath(url.slice(5));
      if (fs.existsSync(other) && comparable(fs.realpathSync(other)) === comparable(target)) {
        throw new Error(`Content target must differ from ${key}`);
      }
    }
  }
  const checkDb = new Database(target, {readonly: true, fileMustExist: true});
  let check: SummaryImportStepResult;
  try {check = summaryImportStep(checkDb, inputPath, previousInputPath);}
  finally {checkDb.close();}
  if (mode === "check" || check.state === "after") return {...check, mode};
  const db = new Database(target, {fileMustExist: true});
  try {return summaryImportStep(db, inputPath, previousInputPath, "apply");}
  finally {db.close();}
}

function main() {
  const args = process.argv.slice(2);
  let input: string | undefined, previous: string | undefined, database: string | undefined;
  let mode: "check" | "apply" = "check";
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (seen.has(arg)) throw new Error(`Duplicate argument: ${arg}`);
    seen.add(arg);
    if (arg === "--apply") {mode = "apply"; continue;}
    if (!["--input", "--previous-input", "--content-db"].includes(arg) || !args[i + 1] || args[i + 1]!.startsWith("--")) {
      throw new Error("Usage: summaries:step -- --previous-input <accepted-full.jsonl> --input <accepted-full.jsonl> [--content-db <path>] [--apply]");
    }
    const value = path.resolve(repoRoot(), args[++i]!);
    if (arg === "--input") input = value;
    else if (arg === "--previous-input") previous = value;
    else database = value;
  }
  if (!input || !previous) throw new Error("Both --previous-input and --input accepted full inventories are required, including repeats");
  loadServerEnv();
  if (!database) {
    const url = process.env.CONTENT_DATABASE_URL;
    if (!url?.startsWith("file:")) throw new Error("CONTENT_DATABASE_URL must be a file: SQLite URL, or supply --content-db");
    database = resolveServerRelativePath(url.slice(5));
  }
  console.log(JSON.stringify(runSummaryImportStepFile(database, input, previous, mode), null, 2));
}

if (require.main === module) {
  try {main();} catch (error) {console.error(String(error)); process.exitCode = 1;}
}
