import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { existsSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { effectiveArguments, effectiveOutputRoot, verifiedEffectiveSc } from "./effective-cli";
import { writeEffectiveOverlay } from "./effective-writer";

export async function runEffectiveExperiment(argv: string[]) {
  const allowed = new Set(["--accepted-baseline", "--rules-db", "--content-db", "--pdf-python", "--source", "--pdf-evidence", "--run"]);
  const seen = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]!;
    assert(key === "--apply" || allowed.has(key), `unknown argument ${key}`);
    assert(key === "--source" || !seen.has(key), `duplicate argument ${key}`);
    seen.add(key);
    if (key !== "--apply") assert(argv[++i] && !argv[i]!.startsWith("--"), `missing value ${key}`);
  }
  const options = effectiveArguments(argv);
  const parent = effectiveOutputRoot(options.root);
  const output = join(parent, `dice-effective-write-${options.run}`);
  assert(!existsSync(output), "experiment run already exists");
  // Copy through SQLite backup so committed WAL data
  // is included without opening the source in write mode or copying sidecars.
  const scratch = mkdtempSync(join(parent, "dice-effective-write-pending-"));
  try {
    const source = new Database(options.contentPath, { readonly: true, fileMustExist: true });
    try { await source.backup(join(scratch, "content.experiment.sqlite")); } finally { source.close(); }
    // Verify every original input and the actual copied current snapshot before
    // schema/overlay writes. No source can change this isolated snapshot between
    // preflight and transaction; no generated JSON grants write authority.
    const copied = verifiedEffectiveSc({ ...options, contentPath: join(scratch, "content.experiment.sqlite") });
    const db = new Database(join(scratch, "content.experiment.sqlite"), { fileMustExist: true });
    try {
      const plan = writeEffectiveOverlay(db, copied.output, options.acceptedBaseline, true);
      const apply = seen.has("--apply");
      if (apply) assert.deepEqual(writeEffectiveOverlay(db, copied.output, options.acceptedBaseline, false), plan, "dry-run/apply plan changed");
      writeFileSync(join(scratch, "plan.json"), JSON.stringify(plan, null, 2) + "\n", "utf8");
      const { rows, ...counts } = plan;
      const report = { ...copied.summary, storagePlan: counts, applied: apply,
        artifact: { scope: "limited", importable: false, activation: false },
        operatorWrites: false, searchRebuilt: false, consumerValidation: false };
      writeFileSync(join(scratch, "report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
      // A dry-run emits no database (the untouched snapshot could otherwise carry
      // old full-build claims beside a limited experiment report).
      db.close();
      if (!apply) rmSync(join(scratch, "content.experiment.sqlite"));
      renameSync(scratch, output);
      return { output, ...report };
    } finally { if (db.open) db.close(); }
  } finally {
    if (existsSync(scratch)) rmSync(scratch, { recursive: true }); // Exact command-created worktree scratch.
  }
}

if (require.main === module) runEffectiveExperiment(process.argv.slice(2))
  .then(report => console.log(JSON.stringify(report)))
  .catch(error => { console.error(error); process.exitCode = 1; });
