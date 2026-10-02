import assert from "node:assert/strict";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { prepareSequenceFixture, sequenceSnapshot, sequenceTestRoot as root, writeJson, writeSummaries } from "./content-sequence-test-fixtures";
import type { ContentSequenceInputs, ContentSequenceResult } from "./content-sequence";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "content-sequence-"));
const file = path.join(temp, "content.sqlite");
process.env.CONTENT_DATABASE_URL = `file:${file}`;
process.env.APP_DATABASE_URL = process.env.CONTENT_DATABASE_URL;
const tsx = pathToFileURL(require.resolve("tsx")).href;
const cli = path.join(root, "data-tools/src/db/content-sequence-cli.ts");
const argsFor = (inputs: ContentSequenceInputs) => ["--content-db", path.relative(root, file),
  "--previous-normalized-input", path.relative(root, inputs.previousNormalizedInput),
  "--normalized-input", path.relative(root, inputs.normalizedInput),
  "--previous-summary-input", path.relative(root, inputs.previousSummaryInput),
  "--summary-input", path.relative(root, inputs.summaryInput)];
function run(inputs: ContentSequenceInputs, apply = false, cwd = temp, npm = false) {
  const args = [...argsFor(inputs), ...(apply ? ["--apply"] : [])];
  const invocation = npm ? [process.env.npm_execpath!, "run", ...(cwd === root ? ["-w", "data-tools"] : []),
    "content:sequence", "--", ...args] : ["--import", tsx, cli, ...args];
  const result = spawnSync(process.execPath, invocation, {cwd, env: process.env, encoding: "utf8"});
  assert.ifError(result.error);
  return result;
}
function applied(inputs: ContentSequenceInputs) {
  const result = run(inputs, true);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as ContentSequenceResult;
}
function failed(inputs: ContentSequenceInputs, stage: string) {
  const result = run(inputs, true);
  assert.notEqual(result.status, 0, result.stdout);
  const error = JSON.parse(result.stderr) as ContentSequenceResult & {stage: string; phase: string; error: string};
  assert.equal(error.stage, stage, result.stderr); assert.equal(error.complete, false);
  return error;
}
function dataFiles() {
  return [file, `${file}-wal`].filter(name => fs.existsSync(name)).map(name => ({name,
    bytes: fs.readFileSync(name), mtime: fs.statSync(name).mtimeMs}));
}
function rows(db: Database.Database, table: string) {return db.prepare(`SELECT * FROM "${table}" ORDER BY rowid`).safeIntegers().all();}
function searchRows(db: Database.Database) {
  return sequenceSnapshot(db).rows.filter(row => String(row[0]).startsWith("SpellSearch"));
}

async function main() {
  const fixture = await prepareSequenceFixture(temp, file);
  const {first, second} = fixture;
  const {ContentSequenceError, runContentSequenceFile} = await import("./content-sequence.js");
  const {normalizedImportStep} = await import("../rules-content/import-step.js");
  const {summaryImportStep} = await import("../short-desc/import-step.js");
  const db = new Database(file);
  try {
    db.pragma("journal_mode=WAL"); db.pragma("wal_autocheckpoint=0");
    const baseline = sequenceSnapshot(db), baselineFiles = dataFiles();
    const check = runContentSequenceFile(file, first);
    assert.equal(check.complete, false);
    assert.equal(check.normalized.preflight!.state, "before"); assert.equal(check.summaries.preflight!.state, "before");
    assert.equal(check.search.preflight!.state, "current");
    assert.equal(check.summaryRecheckRequired, true); assert.equal(check.searchRecheckRequired, true);
    assert.deepEqual(sequenceSnapshot(db), baseline); assert.deepEqual(dataFiles(), baselineFiles);
    // Standalone summary cannot bind a future-only new spell. The sequence
    // preflight proves it against next accepted rows without writing a DB copy.
    assert.throws(() => summaryImportStep(db, first.summaryInput, first.previousSummaryInput), /Missing\/drifted summary/);
    const invalidSummary = path.join(temp, "invalid.jsonl");
    writeSummaries(invalidSummary, [...fixture.afterSummaries, {...fixture.afterSummaries[0], spellId: 999999}]);
    const beforeBad = sequenceSnapshot(db);
    const error = failed({...first, summaryInput: invalidSummary}, "summaries");
    assert(error.normalized.preflight); assert.equal(error.normalized.application, "not-attempted");
    assert.deepEqual(sequenceSnapshot(db), beforeBad);
    fs.writeFileSync(invalidSummary, "malformed later inventory\n", "utf8");
    assert.match(failed({...first, summaryInput: invalidSummary}, "summaries").error, /Invalid accepted summary/);
    assert.deepEqual(sequenceSnapshot(db), baseline);
    // Planned spell/book identity and relationship checks reuse the stage's
    // exact rule, including a valid appearance relationship and its absence.
    const invalidNormalized = path.join(temp, "invalid.json");
    for (const change of [
      (next: typeof fixture.after) => {next.spells.find(row => row.legacySpellId === 9876)!.id = "drifted:9876";},
      (next: typeof fixture.after) => {next.rulebooks.find(row => row.legacyRulebookId === 6)!.id = "drifted:6";},
      (next: typeof fixture.after) => {next.spells.find(row => row.legacySpellId === 9876)!.sourceRulebookId = 4;},
    ]) {
      const next = structuredClone(fixture.after); change(next); writeJson(invalidNormalized, next);
      assert.match(failed({...first, normalizedInput: invalidNormalized}, "summaries").error, /summary spell\/book/);
      assert.deepEqual(sequenceSnapshot(db), baseline);
    }
    const appearanceNext = structuredClone(fixture.after);
    appearanceNext.spells.find(row => row.legacySpellId === 9876)!.sourceRulebookId = 4;
    appearanceNext.appearances.push({id: "appearance:9876", spellId: "spell:9876", legacySpellId: 9876,
      rulebookId: 6, page: null, printedName: "Synthetic Addition", sourceSlug: "synthetic-addition", sourceKey: "synthetic", sourceNote: null});
    appearanceNext.counts.appearances = appearanceNext.appearances.length;
    writeJson(invalidNormalized, appearanceNext);
    assert.equal(runContentSequenceFile(file, {...first, normalizedInput: invalidNormalized}).summaries.preflight!.state, "before");
    // Malformed future search data is known before any import, too.
    const badSearch = structuredClone(fixture.after); badSearch.spells[0]!.descriptionText = null as unknown as string;
    writeJson(invalidNormalized, badSearch);
    assert.match(failed({...first, normalizedInput: invalidNormalized}, "search").error, /source spell values/);
    assert.deepEqual(sequenceSnapshot(db), baseline);
    const stale = structuredClone(fixture.after); stale.artifact!.provenance.rulesDb.sha256 = "0".repeat(64);
    writeJson(invalidNormalized, stale);
    assert.match(failed({...first, normalizedInput: invalidNormalized}, "normalized").error, /provenance does not match/);
    assert.deepEqual(sequenceSnapshot(db), baseline);
    // Integration only samples complete-inventory drift; stage suites own each
    // column/key matrix. Restore only each task-owned deliberately changed row.
    const oldName = db.prepare("SELECT canonicalName FROM SpellContent WHERE legacySpellId=100").pluck().get();
    const component = db.prepare("SELECT * FROM SpellComponent LIMIT 1").get() as Record<string, unknown>;
    const summaryControl = db.prepare("SELECT * FROM I18nSpellSummaryText WHERE spellId=101").get() as Record<string, unknown>;
    const restoreRow = (table: string, row: Record<string, unknown>) => db.prepare(
      `INSERT INTO ${table} (${Object.keys(row).join(",")}) VALUES (${Object.keys(row).map(() => "?").join(",")})`).run(...Object.values(row));
    for (const [change, restore] of [
      [() => db.exec("UPDATE SpellContent SET canonicalName='drift' WHERE legacySpellId=100"),
        () => db.prepare("UPDATE SpellContent SET canonicalName=? WHERE legacySpellId=100").run(oldName)],
      [() => db.prepare("DELETE FROM SpellComponent WHERE id=?").run(component.id), () => restoreRow("SpellComponent", component)],
      [() => db.exec("UPDATE I18nSpellSummaryText SET id='extra-key' WHERE spellId=101"),
        () => db.prepare("UPDATE I18nSpellSummaryText SET id=? WHERE spellId=101").run(summaryControl.id)],
      [() => db.exec("DELETE FROM I18nSpellSummaryText WHERE spellId=101"), () => restoreRow("I18nSpellSummaryText", summaryControl)],
      [() => db.exec("INSERT INTO I18nSpellSummaryText SELECT 'extra',spellId,rulebookId,lang,'extra',summaryText,sourceKey,sourceName,sourceKind,reviewStatus,createdAt,updatedAt FROM I18nSpellSummaryText LIMIT 1"),
        () => db.exec("DELETE FROM I18nSpellSummaryText WHERE id='extra'")],
    ] as [() => unknown, () => unknown][]) {
      change(); const drifted = sequenceSnapshot(db);
      assert.throws(() => runContentSequenceFile(file, first, "apply"));
      assert.deepEqual(sequenceSnapshot(db), drifted, "rejected drift wrote data"); restore();
    }
    assert.deepEqual(sequenceSnapshot(db), baseline);
    // Unavailable readonly FTS checker must block before the normalized write.
    // Test-only driver fault; production has no injectable stage/hook API.
    const prepare = Database.prototype.prepare;
    Database.prototype.prepare = function(this: Database.Database, sql: string) {
      return prepare.call(this, sql === "SELECT sqlite_version()" ? "SELECT '3.43.0'" : sql);
    } as typeof prepare;
    try {
      assert.throws(() => runContentSequenceFile(file, first, "apply"), (error: unknown) =>
        error instanceof ContentSequenceError && error.stage === "search" && /3.44/.test(error.message) &&
        error.result.normalized.application === "not-attempted");
    } finally {Database.prototype.prepare = prepare;}
    assert.deepEqual(sequenceSnapshot(db), baseline);
    // Real SQL summary failure after normalized has durably committed. FTS and
    // summaries retain their exact old rows; the report never claims global rollback.
    db.exec(`CREATE TRIGGER summary_fault BEFORE INSERT ON I18nSpellSummaryText
      WHEN NEW.spellId=9876 BEGIN SELECT RAISE(ABORT,'real summary SQL fault'); END`);
    const summariesBefore = rows(db, "I18nSpellSummaryText"), searchBefore = searchRows(db);
    const summaryFailure = failed(first, "summaries");
    assert.equal(summaryFailure.phase, "apply"); assert.equal(summaryFailure.normalized.application, "committed");
    assert.equal(summaryFailure.summaries.application, "failed"); assert.equal(summaryFailure.search.application, "not-attempted");
    assert.equal(normalizedImportStep(db, first.normalizedInput, first.previousNormalizedInput).state, "after");
    assert.deepEqual(rows(db, "I18nSpellSummaryText"), summariesBefore); assert.deepEqual(searchRows(db), searchBefore);
    const normalizedCommitted = rows(db, "RulesContentBuild"), normalizedRows = rows(db, "SpellContent");
    db.exec("DROP TRIGGER summary_fault");
    const resumedCheck = JSON.parse(run(first).stdout) as ContentSequenceResult;
    assert.equal(resumedCheck.normalized.preflight!.state, "after"); assert.equal(resumedCheck.summaries.preflight!.state, "before");
    assert.equal(resumedCheck.search.preflight!.state, "stale");
    // Real FTS writer fails after replacing documents, on its final state insert.
    db.exec(`CREATE TRIGGER search_fault BEFORE INSERT ON SpellSearchIndexState
      BEGIN SELECT RAISE(ABORT,'real FTS SQL fault'); END`);
    const searchFailure = failed(first, "search");
    assert.equal(searchFailure.normalized.application, "no-op"); assert.equal(searchFailure.summaries.application, "committed");
    assert.equal(searchFailure.search.application, "failed");
    assert.deepEqual(rows(db, "RulesContentBuild"), normalizedCommitted); assert.deepEqual(rows(db, "SpellContent"), normalizedRows);
    assert.deepEqual(searchRows(db), searchBefore, "failed FTS SQL did not roll back");
    assert.equal(summaryImportStep(db, first.summaryInput, first.previousSummaryInput).state, "after");
    const summaryCommitted = rows(db, "I18nSpellSummaryText");
    db.exec("DROP TRIGGER search_fault");
    const resumed = applied(first);
    assert.equal(resumed.complete, true); assert.equal(resumed.normalized.application, "no-op");
    assert.equal(resumed.summaries.application, "no-op"); assert.equal(resumed.search.application, "committed");
    assert.equal(resumed.normalized.final!.state, "after"); assert.equal(resumed.summaries.final!.state, "after");
    assert.equal(resumed.search.final!.state, "current");
    assert.deepEqual(rows(db, "RulesContentBuild"), normalizedCommitted); assert.deepEqual(rows(db, "I18nSpellSummaryText"), summaryCommitted);
    const completed = sequenceSnapshot(db), completedFiles = dataFiles();
    assert.equal(applied(first).search.application, "no-op"); assert.equal(runContentSequenceFile(file, first).complete, true);
    assert.deepEqual(sequenceSnapshot(db), completed); assert.deepEqual(dataFiles(), completedFiles);
    // A later externally stale index is repaired even with both upstream no-ops.
    db.exec("UPDATE SpellSearchIndexState SET schemaVersion=1");
    const searchOnly = applied(first);
    assert.equal(searchOnly.normalized.result!.changed, false); assert.equal(searchOnly.summaries.result!.changed, false);
    assert.equal(searchOnly.search.result!.changed, true);
    // A fresh final check failure keeps successful application evidence. The
    // checker is unavailable only at the final readonly snapshot in this test.
    db.exec("UPDATE SpellSearchIndexState SET schemaVersion=1");
    let integrityCalls = 0;
    Database.prototype.prepare = function(this: Database.Database, sql: string) {
      return prepare.call(this, sql === "SELECT sqlite_version()" && ++integrityCalls === 6 ? "SELECT '3.43.0'" : sql);
    } as typeof prepare;
    try {
      assert.throws(() => runContentSequenceFile(file, first, "apply"), (error: unknown) =>
        error instanceof ContentSequenceError && error.phase === "final-check" && error.stage === "search" &&
        error.result.normalized.application === "no-op" && error.result.summaries.application === "no-op" &&
        error.result.search.application === "committed" && error.result.normalized.final?.state === "after" &&
        error.result.summaries.final?.state === "after" && !error.result.complete);
    } finally {Database.prototype.prepare = prepare;}
    assert.equal(runContentSequenceFile(file, first).complete, true);
    // Change input bytes only after maintained importer SQL has actually run.
    // Its existing post-write guard must roll back the whole normalized stage.
    const sqlBytes = fs.readFileSync(second.normalizedInput), sqlBefore = sequenceSnapshot(db);
    let inputChangedInSql = false;
    Database.prototype.prepare = function(this: Database.Database, sql: string) {
      const statement = prepare.call(this, sql);
      if (sql.includes('INSERT INTO "SpellContent"')) {
        const run = statement.run.bind(statement);
        statement.run = ((...args: unknown[]) => {
          const result = (run as (...args: unknown[]) => Database.RunResult)(...args);
          if (!inputChangedInSql) {inputChangedInSql = true; fs.appendFileSync(second.normalizedInput, "\n", "utf8");}
          return result;
        }) as typeof statement.run;
      }
      return statement;
    } as typeof prepare;
    try {
      assert.throws(() => runContentSequenceFile(file, second, "apply"), (error: unknown) =>
        error instanceof ContentSequenceError && error.stage === "normalized" && error.result.normalized.application === "failed");
      assert.deepEqual(sequenceSnapshot(db), sqlBefore, "input change during normalized SQL did not roll back");
    } finally {Database.prototype.prepare = prepare; fs.writeFileSync(second.normalizedInput, sqlBytes);}
    assert.equal(inputChangedInSql, true);
    // Replace accepted bytes between the sequence guard and the stage's first
    // read, after both preflight passes. Stage-local repinning must not accept
    // the replacement as this invocation's handoff.
    for (const readBoundary of ["normalizedImportStep", "readGenerated"]) {
      const raceRead = fs.readFileSync, raceBytes = raceRead(second.normalizedInput), raceBefore = sequenceSnapshot(db);
      let preflightChecks = 0, raced = false;
      Database.prototype.prepare = function(this: Database.Database, sql: string) {
        if (sql === "SELECT sqlite_version()") preflightChecks++;
        return prepare.call(this, sql);
      } as typeof prepare;
      fs.readFileSync = ((...args: Parameters<typeof raceRead>) => {
        if (!raced && preflightChecks >= 2 && args[0] === second.normalizedInput &&
          new Error().stack?.includes(readBoundary)) {
          raced = true;
          const replaced = structuredClone(fixture.third);
          replaced.spells.find(row => row.legacySpellId === 2)!.descriptionText = "unpinnedreplacementtoken";
          writeJson(second.normalizedInput, replaced);
        }
        return (raceRead as (...args: unknown[]) => unknown)(...args);
      }) as typeof raceRead;
      try {
        assert.throws(() => runContentSequenceFile(file, second, "apply"), (error: unknown) =>
          error instanceof ContentSequenceError && error.stage === "normalized" && error.result.normalized.application === "failed");
        assert.deepEqual(sequenceSnapshot(db), raceBefore, "replacement bytes committed at " + readBoundary);
      } finally {
        fs.readFileSync = raceRead; Database.prototype.prepare = prepare;
        fs.writeFileSync(second.normalizedInput, raceBytes);
      }
      assert.equal(raced, true);
    }
    // Invocation-level byte pin survives the upstream transaction boundary.
    const read = fs.readFileSync, secondBytes = read(second.summaryInput);
    let changed = false;
    fs.readFileSync = ((...args: Parameters<typeof read>) => {
      if (!changed && args[0] === second.summaryInput &&
        (db.prepare("SELECT descriptionText FROM SpellContent WHERE legacySpellId=2").pluck().get() === "secondbodytoken")) {
        changed = true; fs.appendFileSync(second.summaryInput, "\n", "utf8");
      }
      return (read as (...args: unknown[]) => unknown)(...args);
    }) as typeof read;
    try {
      assert.throws(() => runContentSequenceFile(file, second, "apply"), (error: unknown) =>
        error instanceof ContentSequenceError && error.stage === "inputs" && error.result.normalized.application === "committed" &&
        error.result.summaries.application === "not-attempted" && /input changed/.test(error.message));
    } finally {fs.readFileSync = read; fs.writeFileSync(second.summaryInput, secondBytes);}
    assert.equal(changed, true);
    const secondNormalized = rows(db, "RulesContentBuild");
    const summaryRead = fs.readFileSync, summaryBytes = summaryRead(second.summaryInput), summaryRaceBefore = sequenceSnapshot(db);
    let summaryRaced = false;
    fs.readFileSync = ((...args: Parameters<typeof summaryRead>) => {
      if (!summaryRaced && args[0] === second.summaryInput && new Error().stack?.includes("summaryImportStep")) {
        summaryRaced = true;
        writeSummaries(second.summaryInput, fixture.thirdSummaries.map(row => row.spellId === 9876 ?
          {...row, summaryText: "unpinnedsummarytoken"} : row));
      }
      return (summaryRead as (...args: unknown[]) => unknown)(...args);
    }) as typeof summaryRead;
    try {
      assert.throws(() => runContentSequenceFile(file, second, "apply"), (error: unknown) =>
        error instanceof ContentSequenceError && error.stage === "summaries" &&
        error.result.normalized.application === "no-op" && error.result.summaries.application === "failed");
      assert.deepEqual(sequenceSnapshot(db), summaryRaceBefore, "summary stage repinned replacement bytes");
    } finally {fs.readFileSync = summaryRead; fs.writeFileSync(second.summaryInput, summaryBytes);}
    assert.equal(summaryRaced, true);
    let summaryChangedInSql = false;
    Database.prototype.prepare = function(this: Database.Database, sql: string) {
      const statement = prepare.call(this, sql);
      if (sql.includes("UPDATE I18nSpellSummaryText")) {
        const run = statement.run.bind(statement);
        statement.run = ((...args: unknown[]) => {
          const result = (run as (...args: unknown[]) => Database.RunResult)(...args);
          if (!summaryChangedInSql) {summaryChangedInSql = true; fs.appendFileSync(second.summaryInput, "\n", "utf8");}
          return result;
        }) as typeof statement.run;
      }
      return statement;
    } as typeof prepare;
    try {
      assert.throws(() => runContentSequenceFile(file, second, "apply"), (error: unknown) =>
        error instanceof ContentSequenceError && error.stage === "summaries" &&
        error.result.normalized.application === "no-op" && error.result.summaries.application === "failed");
      assert.deepEqual(sequenceSnapshot(db), summaryRaceBefore, "input change during summary SQL did not roll back");
    } finally {Database.prototype.prepare = prepare; fs.writeFileSync(second.summaryInput, summaryBytes);}
    assert.equal(summaryChangedInSql, true);
    const secondResume = applied(second);
    assert.equal(secondResume.normalized.application, "no-op"); assert.equal(secondResume.summaries.application, "committed");
    assert.equal(secondResume.search.application, "committed"); assert.deepEqual(rows(db, "RulesContentBuild"), secondNormalized);
    assert.equal(db.prepare("SELECT descriptionText FROM SpellContent WHERE legacySpellId=100").pluck().get(), "newbodytoken");
    const secondComplete = sequenceSnapshot(db);
    assert.deepEqual(secondComplete.schema, baseline.schema, "combined sequence changed schema");
    for (const table of ["Control", "I18nSpellText", "I18nEntityTranslation"]) {
      assert.deepEqual(secondComplete.rows.find(row => row[0] === table), baseline.rows.find(row => row[0] === table),
        `combined sequence changed protected ${table}`);
    }
    // Root/package/independent and existing sibling caller paths all use this
    // implementation with checkout-root-relative explicit temporary inputs.
    const pathBaseline = dataFiles(), pathRows = sequenceSnapshot(db);
    for (const cwd of [root, path.join(root, "data-tools"), temp]) {
      const result = run(second, true, cwd, cwd !== temp);
      assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /"complete": true/);
    }
    const primary = path.dirname(execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {cwd: root, encoding: "utf8"}).trim());
    if (primary !== root && fs.existsSync(path.join(primary, "package.json"))) assert.equal(run(second, false, primary).status, 0);
    assert.deepEqual(dataFiles(), pathBaseline); assert.deepEqual(sequenceSnapshot(db), pathRows);
    const missing = path.join(temp, "missing.sqlite");
    assert.throws(() => runContentSequenceFile(missing, second, "apply")); assert(!fs.existsSync(missing));
    const rulesFile = process.env.RULES_DATABASE_URL!.slice(5), rulesBytes = fs.readFileSync(rulesFile);
    assert.throws(() => runContentSequenceFile(rulesFile, second, "apply"), /RULES_DATABASE_URL/);
    assert.deepEqual(fs.readFileSync(rulesFile), rulesBytes);
    const appFile = process.env.APP_STATE_DATABASE_URL!.slice(5), app = new Database(appFile);
    app.exec("CREATE TABLE User(id TEXT PRIMARY KEY); INSERT INTO User VALUES('protected')"); app.close();
    const appBytes = fs.readFileSync(appFile);
    assert.throws(() => runContentSequenceFile(appFile, second, "apply"), /APP_STATE_DATABASE_URL/);
    assert.deepEqual(fs.readFileSync(appFile), appBytes);
    const omitted = spawnSync(process.execPath, ["--import", tsx, cli, ...argsFor(second).slice(0, -2), "--apply"],
      {cwd: temp, env: process.env, encoding: "utf8"});
    assert.notEqual(omitted.status, 0, "repeat accepted a missing inventory pair");
    // Known exact-after annotation can be retained, but a summary predecessor
    // carrying it is a preflight blocker even when normalized already is after.
    const {planFinalOverlay, applyFinalOverlay, verifyFullNormalized} = await import("../dice-intake/final-writer.js");
    const {collectImportContext} = await import("../rules-content/cli.js");
    const {readSummaryJsonlText} = await import("../short-desc/summary-row-schema.js");
    const summaries = readSummaryJsonlText(fs.readFileSync(second.summaryInput, "utf8")).rows;
    const plan = planFinalOverlay(db, [], {sourceRevisions: {original: "5".repeat(40)}, changedNames: 0, changedBodies: 0,
      retained: {names: [], bodies: []}, sourceQuestionIds: []},
    verifyFullNormalized(db, fixture.third, second.normalizedInput, collectImportContext().currentProvenance), "7".repeat(40), summaries);
    applyFinalOverlay(db, plan);
    const annotated = sequenceSnapshot(db);
    const fourth = structuredClone(fixture.third); fourth.generatedAt = "2026-10-02T05:00:00.000Z";
    fourth.spells[0]!.canonicalName = "Blocked annotated transition";
    writeJson(invalidNormalized, fourth);
    assert.match(failed({...second, normalizedInput: invalidNormalized, previousNormalizedInput: second.normalizedInput}, "normalized").error,
      /Annotated predecessor/);
    assert.deepEqual(sequenceSnapshot(db), annotated);
    const nextSummaryPath = path.join(temp, "annotated-next.jsonl");
    writeSummaries(nextSummaryPath, fixture.thirdSummaries.map(row => row.spellId === 9876 ? {...row, summaryText: "blockedtoken"} : row));
    assert.match(failed({...second, summaryInput: nextSummaryPath, previousSummaryInput: second.summaryInput}, "summaries").error, /Annotated predecessor/);
    assert.deepEqual(sequenceSnapshot(db), annotated);
    assert.equal(applied(second).complete, true); assert.deepEqual(sequenceSnapshot(db), annotated);
  } finally {db.close();}
  console.log("Content sequence portable tests passed (future bindings, readonly preflight, durable SQL faults/resume, two handoffs, input pinning, current repeats and caller paths)");
}
main().finally(() => fs.rmSync(temp, {recursive: true, force: true}));
