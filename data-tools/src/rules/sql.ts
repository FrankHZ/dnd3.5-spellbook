import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  loadServerEnv,
  localDataDir,
  resolveServerRelativePath,
} from "../shared/env";

type Mode = "dry-run" | "apply";

const PATCH_ROOT = path.join(localDataDir(), "rules-patches");

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools rules:sql:dry-run -- <patch.sql>
  npm run -w data-tools rules:sql:apply -- <patch.sql>
  npm run -w data-tools rules:index:rebuild -- --dry-run
  npm run -w data-tools rules:index:rebuild

Patch paths are resolved under data/rules-patches/.
`);
  process.exit(1);
}

function rulesDbPath() {
  loadServerEnv();
  const raw = process.env.RULES_DATABASE_URL;
  if (!raw) throw new Error("RULES_DATABASE_URL is not set");
  if (!raw.startsWith("file:")) {
    throw new Error(`Only file: SQLite URLs are supported, got ${raw}`);
  }
  return resolveServerRelativePath(raw.slice("file:".length));
}

function resolvePatchPath(rawPath: string) {
  if (path.isAbsolute(rawPath)) {
    throw new Error(
      "Patch path must be relative to data/rules-patches",
    );
  }

  const resolved = path.resolve(PATCH_ROOT, rawPath);
  const relative = path.relative(PATCH_ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Patch path escapes patch root: ${rawPath}`);
  }
  if (!resolved.toLowerCase().endsWith(".sql")) {
    throw new Error(`Patch path must end with .sql: ${rawPath}`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Patch file not found: ${resolved}`);
  }
  return resolved;
}

function tempDbPath(sourceDbPath: string) {
  const base = path.basename(sourceDbPath).replace(/[^a-zA-Z0-9_.-]/g, "_");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spellbook-rules-sql-"));
  return path.join(dir, base);
}

function applySqlToDb(dbPath: string, sqlPath: string) {
  const sql = fs.readFileSync(sqlPath, "utf-8");
  const db = new Database(dbPath);
  try {
    db.exec(sql);
  } finally {
    db.close();
  }
}

function runPatch(mode: Mode, patchPath: string) {
  const targetDbPath = rulesDbPath();
  const sqlPath = resolvePatchPath(patchPath);

  if (mode === "dry-run") {
    const dryRunDbPath = tempDbPath(targetDbPath);
    fs.copyFileSync(targetDbPath, dryRunDbPath);
    applySqlToDb(dryRunDbPath, sqlPath);
    console.log(`Dry-run OK`);
    console.log(`Patch: ${sqlPath}`);
    console.log(`Source DB unchanged: ${targetDbPath}`);
    console.log(`Temporary DB: ${dryRunDbPath}`);
    return;
  }

  console.log(`Applying SQL patch`);
  console.log(`Patch: ${sqlPath}`);
  console.log(`Target DB: ${targetDbPath}`);
  applySqlToDb(targetDbPath, sqlPath);
  console.log(`Apply OK`);
}

function runIndexRebuild(mode: Mode) {
  const patches = [
    "legacy-sql/create-idx-spell-class-level.sql",
    "legacy-sql/create-idx-spell-domain-level.sql",
    "legacy-sql/derive-spell-class-domain-mapping.sql",
  ];

  const targetDbPath = rulesDbPath();
  const sqlPaths = patches.map(resolvePatchPath);

  if (mode === "dry-run") {
    const dryRunDbPath = tempDbPath(targetDbPath);
    fs.copyFileSync(targetDbPath, dryRunDbPath);
    for (const sqlPath of sqlPaths) applySqlToDb(dryRunDbPath, sqlPath);
    console.log(`Index rebuild dry-run OK`);
    console.log(`Source DB unchanged: ${targetDbPath}`);
    console.log(`Temporary DB: ${dryRunDbPath}`);
    return;
  }

  console.log(`Rebuilding derived spell indexes`);
  console.log(`Target DB: ${targetDbPath}`);
  for (const sqlPath of sqlPaths) {
    console.log(`Applying: ${sqlPath}`);
    applySqlToDb(targetDbPath, sqlPath);
  }
  console.log(`Index rebuild OK`);
}

function main() {
  const [, , command, ...args] = process.argv;

  if (command === "dry-run" || command === "apply") {
    const patchPath = args[0];
    if (!patchPath) usage();
    runPatch(command, patchPath);
    return;
  }

  if (command === "index:rebuild") {
    runIndexRebuild(args.includes("--dry-run") ? "dry-run" : "apply");
    return;
  }

  usage();
}

main();
