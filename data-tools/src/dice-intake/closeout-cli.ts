import assert from "node:assert/strict";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { authenticateDiceCloseout } from "./closeout";
import { noAlias, pathArg, within } from "./paths";

export function checkCloseoutArguments(argv: string[]) {
  const allowed = ["data-root", "rules-db", "content-db", "report-dir"], seen = new Set<string>();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.slice(2);
    assert(key && argv[i] === `--${key}` && allowed.includes(key) && !seen.has(key)
      && argv[i + 1] && !argv[i + 1]!.startsWith("--"), "unknown/repeated/missing closeout option");
    seen.add(key);
  }
  assert(seen.size === allowed.length, "closeout requires explicit roots, DBs and output");
}

export function runCloseout(argv: string[]) {
  checkCloseoutArguments(argv);
  const dataRoot = pathArg("data-root", argv), rulesPath = pathArg("rules-db", argv),
    contentPath = pathArg("content-db", argv), reportDir = pathArg("report-dir", argv);
  const owned = join(dataRoot, "dice-handoffs/issue-586");
  for (const path of [dataRoot, rulesPath, contentPath, reportDir]) noAlias(path);
  assert(within(owned, reportDir) && reportDir !== owned && !existsSync(reportDir),
    "closeout requires a fresh child directory of private dice-handoffs/issue-586");
  const stamp = (path: string) => { const s = statSync(path); return [s.dev, s.ino, s.size, s.mtimeMs]; };
  const before = [stamp(rulesPath), stamp(contentPath)];
  assert(before[0]![0] !== before[1]![0] || before[0]![1] !== before[1]![1], "database alias");
  const rulesDb = new Database(rulesPath, { readonly: true, fileMustExist: true });
  const contentDb = new Database(contentPath, { readonly: true, fileMustExist: true });
  try {
    rulesDb.pragma("query_only=ON"); contentDb.pragma("query_only=ON");
    const result = authenticateDiceCloseout({ dataRoot, rulesDb, contentDb });
    assert.deepEqual([stamp(rulesPath), stamp(contentPath)], before, "operator DB changed during closeout");
    mkdirSync(reportDir, { recursive: true });
    for (const key of ["fields", "targets", "retained"] as const)
      writeFileSync(join(reportDir, `${key}.jsonl`), result[key].map(row => JSON.stringify(row)).join("\n") + "\n");
    writeFileSync(join(reportDir, "report.json"), JSON.stringify(result.report, null, 2) + "\n");
    console.log(JSON.stringify(result.report));
    return result.report;
  } finally { rulesDb.close(); contentDb.close(); }
}

if (require.main === module) runCloseout(process.argv.slice(2));
