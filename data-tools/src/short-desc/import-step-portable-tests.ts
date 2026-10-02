import assert from "node:assert/strict";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { importSummaryRows } from "./import";
import { summaryImportStep } from "./import-step";
import { runSummaryImportStepFile } from "./import-step-cli";
import { readSummaryJsonlText } from "./summary-row-schema";
import { contentSearchStep } from "../db/content-search-step";
import { finalScRevision, finalScSummaryRevision, finalScSummaryCandidate, finalScSummaryPath } from "../dice-intake/final-writer";

const root = path.resolve(__dirname, "../../..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "summary-import-step-"));
process.env.DATA_REPO_PATH = temp;
process.env.RULES_DATABASE_URL = `file:${path.join(temp, "rules.sqlite")}`;
process.env.APP_STATE_DATABASE_URL = `file:${path.join(temp, "app-state.sqlite")}`;
process.env.CONTENT_DATABASE_URL = `file:${path.join(temp, "content.sqlite")}`;
process.env.APP_DATABASE_URL = process.env.CONTENT_DATABASE_URL;

function record(spellId: number, summaryText: string, lang = "zh", variant = "chm") {
  return {schemaVersion: 1, spellId, rulebookId: spellId === 100 ? 6 : 4, lang, variant, summaryText,
    sourceKey: `synthetic:${spellId}`, sourceName: "Synthetic", sourceKind: "reviewed-summary-correction", reviewStatus: "accepted"};
}
function write(file: string, rows: unknown[]) {
  fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
}
const before = [record(100, "合成旧摘要"), record(101, "untouched control", "en", "imarvin")];
const after = [{...before[0]!, summaryText: "合成新摘要", sourceKey: "synthetic:review:1", sourceName: "New synthetic source"},
  before[1]!, record(110, "synthetic addition", "en", "imarvin")];
const beforePath = path.join(temp, "before.jsonl"), afterPath = path.join(temp, "after.jsonl"), thirdPath = path.join(temp, "third.jsonl");
write(beforePath, before); write(afterPath, after);
const third = [{...after[0]!, summaryText: "第二批合成摘要"}, after[1]!, after[2]!, record(2, "second addition")];
write(thirdPath, third);

function seed(db: Database.Database) {
  const migrations = path.join(root, "server/db/content/migrations");
  for (const name of fs.readdirSync(migrations).sort()) {
    if (name !== "migration_lock.toml") db.exec(fs.readFileSync(path.join(migrations, name, "migration.sql"), "utf8"));
  }
  for (const file of ["normalized-rules-spells.jsonl", "rules-content-builds.jsonl"]) {
    for (const line of fs.readFileSync(path.join(root, "server/db/content/fixtures/portable", file), "utf8").split(/\r?\n/).filter(Boolean)) {
      const {table, data} = JSON.parse(line) as {table: string; data: Record<string, unknown>};
      const names = Object.keys(data);
      db.prepare(`INSERT INTO "${table}" (${names.map(name => `"${name}"`).join(",")}) VALUES (${names.map(() => "?").join(",")})`)
        .run(...Object.values(data).map(value => typeof value === "boolean" ? Number(value) : value));
    }
  }
  const sourceBook = db.prepare("SELECT * FROM RulebookContent WHERE legacyRulebookId=6").get() as Record<string, unknown>;
  const scBook = {...sourceBook, id: "rulebook:86", legacyRulebookId: 86, slug: "synthetic-sc"};
  db.prepare(`INSERT INTO RulebookContent (${Object.keys(scBook).join(",")}) VALUES (${Object.keys(scBook).map(() => "?").join(",")})`).run(...Object.values(scBook));
  db.exec("UPDATE SpellContent SET sourceRulebookId=86 WHERE legacySpellId=5020");
  // Synthetic build metadata; no assertion of genuine full source provenance.
  db.prepare("UPDATE RulesContentBuild SET buildMetaJson=?").run(JSON.stringify({schema: "rules-content-build-meta.v2", artifact: {}, importer: {}}));
  db.transaction(() => importSummaryRows(db, readSummaryJsonlText(fs.readFileSync(beforePath, "utf8")).rows, false))();
  db.exec(`UPDATE I18nSpellSummaryText SET createdAt='2026-01-01 01:00:00', updatedAt='2026-01-02T02:00:00.000Z';
    CREATE TABLE Control(id INTEGER PRIMARY KEY, payload BLOB, counter INTEGER, value TEXT);
    INSERT INTO Control VALUES(1,x'00ff0080',9007199254740992,'control');
    INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionText,updatedAt)
      VALUES('synthetic-text',100,6,'zh','chm','合成名称','合成正文','2026-01-01 00:00:00');`);
  contentSearchStep(db, "apply");
}
function snapshot(db: Database.Database) {
  return {schema: db.prepare("SELECT * FROM sqlite_master ORDER BY name").safeIntegers().all(),
    rows: (db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {name: string}[])
      .map(({name}) => [name, db.prepare(`SELECT * FROM "${name}"`).safeIntegers().raw().all()])};
}
function undo(db: Database.Database, change: () => void, check: () => void) {
  const saved = snapshot(db);
  const transaction = db.transaction(() => {change(); check(); throw new Error("undo test");});
  assert.throws(transaction, /undo test/);
  assert.deepEqual(snapshot(db), saved);
}
function dataFiles(file: string) {
  return [file, `${file}-wal`].filter(name => fs.existsSync(name)).map(name => ({name,
    bytes: fs.readFileSync(name), mtime: fs.statSync(name).mtimeMs}));
}
const tsx = pathToFileURL(require.resolve("tsx")).href;
const cli = path.join(root, "data-tools/src/short-desc/import-step-cli.ts");
function run(cwd: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(process.execPath, ["--import", tsx, cli, ...args], {cwd, env, encoding: "utf8"});
}

try {
  // Importing the core and shared validator cannot resolve configured private
  // paths or execute CLI main. Nonexistent DATA_REPO_PATH deliberately fails if
  // any module loads the legacy normalized CLI defaults.
  const safeImport = spawnSync(process.execPath, ["--import", tsx, "--input-type=module", "-e",
    `await import(${JSON.stringify(pathToFileURL(path.join(root, "data-tools/src/short-desc/import-step.ts")).href)})`],
    {cwd: root, env: {...process.env, DATA_REPO_PATH: path.join(temp, "absent-private-data")}, encoding: "utf8"});
  assert.equal(safeImport.status, 0, safeImport.stderr);

  const db = new Database(":memory:"); seed(db);
  try {
    const step = (mode: "check" | "apply" = "check") => summaryImportStep(db, afterPath, beforePath, mode);
    const saved = snapshot(db), writes = db.prepare("SELECT total_changes()").pluck().get();
    db.pragma("query_only=ON");
    assert.deepEqual(step(), {mode: "check", state: "before", changed: false, wouldChange: true});
    assert.equal(db.prepare("SELECT total_changes()").pluck().get(), writes);
    db.pragma("query_only=OFF"); assert.deepEqual(snapshot(db), saved);

    // Every parser field and stable/natural key is checked, with no missing or
    // extra rows tolerated. SQL transactions here only undo deliberate test drift.
    for (const field of ["id", "spellId", "rulebookId", "lang", "variant", "summaryText", "sourceKey", "sourceName", "sourceKind", "reviewStatus"]) {
      undo(db, () => db.prepare(`UPDATE I18nSpellSummaryText SET "${field}"=? WHERE spellId=100`)
        .run(["spellId", "rulebookId"].includes(field) ? 999 : "drift"), () => assert.throws(() => step(), /Unrecognized summary state/));
    }
    for (const value of ["not-a-time", "2026-99-99 10:00:00"]) {
      undo(db, () => db.prepare("UPDATE I18nSpellSummaryText SET updatedAt=?").run(value),
        () => assert.throws(() => step(), /timestamp shape/));
    }
    undo(db, () => db.exec("DELETE FROM I18nSpellSummaryText WHERE spellId=101"),
      () => assert.throws(() => step(), /Unrecognized summary state/));
    undo(db, () => importSummaryRows(db, [readSummaryJsonlText(JSON.stringify(record(104, "extra"))).rows[0]!], false),
      () => assert.throws(() => step(), /Unrecognized summary state/));
    undo(db, () => db.exec(`DROP INDEX I18nSpellSummaryText_spellId_lang_variant_key;
      INSERT INTO I18nSpellSummaryText SELECT 'duplicate',spellId,rulebookId,lang,variant,summaryText,
        sourceKey,sourceName,sourceKind,reviewStatus,createdAt,updatedAt FROM I18nSpellSummaryText LIMIT 1`),
      () => assert.throws(() => step(), /natural key constraint/));
    undo(db, () => db.exec("ALTER TABLE I18nSpellSummaryText DROP COLUMN sourceName"),
      () => assert.throws(() => step(), /summary schema/));
    for (const table of ["dnd_spell", "dnd_rulebook", "User", "FavoriteSpell", "SpellNote"]) {
      undo(db, () => db.exec(`CREATE TABLE ${table}(id TEXT)`), () => assert.throws(() => step(), /content DB role/));
    }
    for (const sql of ["UPDATE SpellContent SET id='reassigned' WHERE legacySpellId=100",
      "UPDATE RulebookContent SET id='reassigned' WHERE legacyRulebookId=6",
      "DELETE FROM SpellContent WHERE legacySpellId=100", "DELETE FROM RulebookContent WHERE legacyRulebookId=6"]) {
      undo(db, () => db.exec(sql), () => assert.throws(() => step(), /spell\/book identity/));
    }

    const invalidPath = path.join(temp, "invalid.jsonl");
    for (const rows of [after.slice(1), [...after, after[0]], [{...after[0], spellId: Number.MAX_SAFE_INTEGER + 1}],
      [{...after[0], reviewStatus: "pending"}], [{...after[0], summaryText: " "}],
      [{...after[0], rulebookId: 999}], [{...after[0], lang: "xx"}]]) {
      write(invalidPath, rows);
      assert.throws(() => summaryImportStep(db, invalidPath, beforePath, "apply"));
      assert.deepEqual(snapshot(db), saved);
    }
    fs.writeFileSync(invalidPath, "{invalid", "utf8");
    assert.throws(() => summaryImportStep(db, invalidPath, beforePath, "apply"), /Invalid accepted/);
    write(invalidPath, [{...before[0], rulebookId: 86}, before[1]]);
    assert.throws(() => summaryImportStep(db, invalidPath, beforePath), /book identity reassignment/);

    // Book membership may be established by an appearance, not only the primary
    // source book. Donor provenance does not rebind the summary's target identity.
    const cross = {...record(100, "appearance summary", "en", "imarvin"), rulebookId: 86, sourceKind: "summary-reuse"};
    const crossBefore = path.join(temp, "cross-before.jsonl"), crossAfter = path.join(temp, "cross-after.jsonl");
    write(crossBefore, [...before, cross]); write(crossAfter, [...before, {...cross, summaryText: "updated appearance"}]);
    undo(db, () => {
      db.exec(`INSERT INTO SpellAppearance(id,spellId,legacySpellId,rulebookId,printedName,sourceSlug,sourceKey) VALUES('cross','spell:100',100,86,'synthetic','synthetic','synthetic')`);
      importSummaryRows(db, readSummaryJsonlText(fs.readFileSync(crossBefore, "utf8")).rows, false);
    }, () => assert.equal(summaryImportStep(db, crossAfter, crossBefore).state, "before"));
    assert.throws(() => summaryImportStep(db, crossAfter, crossBefore), /Unsupported summary spell\/book relationship/);

    // The second statement fails after a real UPDATE has executed successfully.
    db.exec(`CREATE TRIGGER sql_fault BEFORE INSERT ON I18nSpellSummaryText
      BEGIN SELECT RAISE(ABORT,'real summary importer SQL failure'); END`);
    assert.equal(step().state, "before");
    const faultBefore = snapshot(db);
    assert.throws(() => step("apply"), /real summary importer SQL failure/);
    assert.deepEqual(snapshot(db), faultBefore); db.exec("DROP TRIGGER sql_fault");

    for (const sql of ["UPDATE Control SET counter=9007199254740993", "UPDATE Control SET payload=x'00ff0081'",
      "UPDATE RulesContentBuild SET sourceSha256='corrupt'", "UPDATE RulesContentBuild SET buildMetaJson='{}'",
      "UPDATE I18nSpellText SET name='corrupt'", "UPDATE SpellContent SET canonicalName='corrupt'",
      "UPDATE SpellSearchDocument SET summary='corrupt'", "UPDATE SpellSearchIndexState SET documentCount=999"]) {
      db.exec(`CREATE TRIGGER protected_fault AFTER UPDATE ON I18nSpellSummaryText BEGIN ${sql}; END`);
      assert.equal(step().state, "before");
      const beforeFault = snapshot(db);
      assert.throws(() => step("apply"), /changed protected rows\/schema/);
      assert.deepEqual(snapshot(db), beforeFault); db.exec("DROP TRIGGER protected_fault");
    }
    for (const sql of ["UPDATE I18nSpellSummaryText SET createdAt='2026-02-01 00:00:00' WHERE spellId=100",
      "UPDATE I18nSpellSummaryText SET updatedAt='2026-02-01 00:00:00' WHERE spellId=101",
      "UPDATE I18nSpellSummaryText SET id='wrong' WHERE spellId=100"]) {
      db.exec(`CREATE TRIGGER summary_fault AFTER INSERT ON I18nSpellSummaryText BEGIN ${sql}; END`);
      const beforeFault = snapshot(db);
      assert.throws(() => step("apply"), /timestamp changed|complete accepted after/);
      assert.deepEqual(snapshot(db), beforeFault); db.exec("DROP TRIGGER summary_fault");
    }

    // A file changed during real importer SQL must not commit even when all DB
    // rows would otherwise match. Restore only our synthetic input afterwards.
    db.function("change_test_input", () => {fs.appendFileSync(afterPath, " ", "utf8"); return 0;});
    db.exec(`CREATE TRIGGER input_fault AFTER INSERT ON I18nSpellSummaryText BEGIN SELECT change_test_input(); END`);
    const inputFaultBefore = snapshot(db);
    assert.throws(() => step("apply"), /Accepted summary input changed/);
    assert.deepEqual(snapshot(db), inputFaultBefore);
    write(afterPath, after); db.exec("DROP TRIGGER input_fault");

    assert.deepEqual(step("apply"), {mode: "apply", state: "after", changed: true, wouldChange: false});
    for (const [table, rows] of saved.rows) {
      if (table !== "I18nSpellSummaryText") assert.deepEqual(db.prepare(`SELECT * FROM "${table}"`).safeIntegers().raw().all(), rows);
    }
    const committed = snapshot(db), completedWrites = db.prepare("SELECT total_changes()").pluck().get();
    assert.equal(contentSearchStep(db).state, "stale", "summary step unexpectedly rebuilt FTS");
    db.pragma("query_only=ON");
    assert.equal(step("apply").changed, false); assert.equal(step().state, "after");
    assert.equal(db.prepare("SELECT total_changes()").pluck().get(), completedWrites);
    db.pragma("query_only=OFF"); assert.deepEqual(snapshot(db), committed);
    assert.equal(summaryImportStep(db, thirdPath, afterPath, "apply").changed, true);
    const second = snapshot(db);
    assert.equal(summaryImportStep(db, thirdPath, afterPath, "apply").changed, false);
    assert.deepEqual(snapshot(db), second);
    assert.equal((db.prepare("SELECT summaryText FROM I18nSpellSummaryText WHERE spellId=101").get() as {summaryText: string}).summaryText, "untouched control");

    // Real existing annotation shape and fixed revisions, on a complete public
    // content fixture. Recognition protects metadata, without claiming source QA.
    const targets = (db.prepare("SELECT legacySpellId FROM SpellContent WHERE sourceRulebookId=86").pluck().all() as number[]).length;
    const meta = {schema: "rules-content-build-meta.v2", artifact: {}, importer: {}, overlays: {scFinalNameBody: {
      schema: "sc-final-name-body.v1", acceptedRevision: finalScRevision, helperRevision: "7".repeat(40),
      sourceRevisions: {original: "5".repeat(40)}, targets, fields: targets * 2, changedNames: 0, changedBodies: 0,
      retained: {names: [], bodies: []}, sourceQuestionIds: [],
      semanticQa: {nameBody: "accepted-source-bound", summaries: "accepted-source-bound", extraRelationships: "pending", wholeBookComplete: false},
      search: "rebuild-after-final-text-and-summaries", activation: false,
      summaryQa: {schema: "sc-final-summary.v1", acceptedRevision: finalScSummaryRevision, candidateRevision: finalScSummaryCandidate,
        path: finalScSummaryPath, scope: "present-canonical-sc-summaries", canonicalRows: third.length, scRows: 0},
    }}};
    const metaBytes = JSON.stringify(meta, null, 2);
    db.prepare("UPDATE RulesContentBuild SET buildMetaJson=?").run(metaBytes);
    const annotated = snapshot(db);
    assert.equal(summaryImportStep(db, thirdPath, afterPath, "apply").changed, false);
    assert.deepEqual(snapshot(db), annotated);
    assert.equal((db.prepare("SELECT buildMetaJson FROM RulesContentBuild").get() as {buildMetaJson: string}).buildMetaJson, metaBytes);
    const fourthPath = path.join(temp, "fourth.jsonl"); write(fourthPath, [{...third[0], summaryText: "later"}, ...third.slice(1)]);
    assert.throws(() => summaryImportStep(db, fourthPath, thirdPath, "apply"), /Annotated predecessor/);
    assert.deepEqual(snapshot(db), annotated);
    for (const mutate of [
      (m: any) => {m.extra = true;}, (m: any) => {m.overlays.unknown = {};},
      (m: any) => {m.overlays.scFinalNameBody.acceptedRevision = "0".repeat(40);},
      (m: any) => {m.overlays.scFinalNameBody.summaryQa.acceptedRevision = "0".repeat(40);},
      (m: any) => {m.overlays.scFinalNameBody.summaryQa.candidateRevision = "0".repeat(40);},
      (m: any) => {m.overlays.scFinalNameBody.summaryQa.canonicalRows++;},
      (m: any) => {m.overlays.scFinalNameBody.targets++;},
      (m: any) => {m.overlays.scFinalNameBody.semanticQa.wholeBookComplete = true;},
      (m: any) => {m.overlays.scFinalNameBody.summaryQa = null;},
    ]) {
      undo(db, () => {const m = structuredClone(meta); mutate(m); db.prepare("UPDATE RulesContentBuild SET buildMetaJson=?").run(JSON.stringify(m));},
        () => {assert.throws(() => summaryImportStep(db, thirdPath, afterPath)); assert.throws(() => summaryImportStep(db, thirdPath, afterPath, "apply"));});
    }
  } finally {db.close();}

  const dbPath = path.join(temp, "content.sqlite"), fileDb = new Database(dbPath); seed(fileDb); fileDb.close();
  const cliArgs = ["--previous-input", path.relative(root, beforePath), "--input", path.relative(root, afterPath), "--content-db", path.relative(root, dbPath)];
  const beforeFiles = dataFiles(dbPath);
  const cwds = [root, path.join(root, "data-tools"), temp];
  // A separate existing checkout may be the caller; the code checkout still
  // owns relative paths. No writes or copied environments in that checkout.
  const checkout = execFileSync("git", ["worktree", "list", "--porcelain"], {cwd: root, encoding: "utf8"})
    .split(/\r?\n/).filter(line => line.startsWith("worktree ")).map(line => line.slice(9))
    .find(value => path.resolve(value).toLowerCase() !== root.toLowerCase());
  if (checkout) cwds.push(checkout);
  for (const cwd of cwds) {
    const checked = run(cwd, cliArgs); assert.equal(checked.status, 0, checked.stderr);
    assert.equal(JSON.parse(checked.stdout).state, "before"); assert.deepEqual(dataFiles(dbPath), beforeFiles);
  }
  const applied = run(root, [...cliArgs, "--apply"]); assert.equal(applied.status, 0, applied.stderr);
  assert.equal(JSON.parse(applied.stdout).changed, true);
  // Interrupted AFTER commit: only the next process receives the state; no
  // in-memory plan or progress ledger survives. Repeats preserve DB data bytes.
  const afterFiles = dataFiles(dbPath);
  for (const cwd of cwds) {
    const repeated = run(cwd, [...cliArgs, "--apply"]); assert.equal(repeated.status, 0, repeated.stderr);
    assert.deepEqual(JSON.parse(repeated.stdout), {mode: "apply", state: "after", changed: false, wouldChange: false});
    assert.deepEqual(dataFiles(dbPath), afterFiles);
  }
  const noExplicitDb = run(temp, cliArgs.slice(0, 4)); assert.equal(noExplicitDb.status, 0, noExplicitDb.stderr);
  for (const args of [[], ["--input", afterPath], [...cliArgs, "--apply", "--apply"], [...cliArgs, "--force"]]) {
    assert.notEqual(run(root, args).status, 0); assert.deepEqual(dataFiles(dbPath), afterFiles);
  }
  const missingDb = path.join(temp, "absent.sqlite");
  assert.throws(() => runSummaryImportStepFile(missingDb, afterPath, beforePath, "apply")); assert(!fs.existsSync(missingDb));
  const wrong = new Database(path.join(temp, "wrong.sqlite")); wrong.exec("CREATE TABLE User(id TEXT)"); wrong.close();
  assert.throws(() => runSummaryImportStepFile(path.join(temp, "wrong.sqlite"), afterPath, beforePath, "apply"), /content DB role/);
  fs.copyFileSync(dbPath, path.join(temp, "app-state.sqlite"));
  assert.throws(() => runSummaryImportStepFile(path.join(temp, "app-state.sqlite"), afterPath, beforePath, "apply"), /APP_STATE_DATABASE_URL/);

  // Readonly WAL snapshots may coordinate through SQLite sidecars. Main DB and
  // existing WAL bytes/mtimes must remain unchanged; never touch SHM manually.
  const wal = new Database(path.join(temp, "wal.sqlite")); wal.pragma("journal_mode=WAL"); seed(wal);
  try {
    const file = path.join(temp, "wal.sqlite"), beforeWal = dataFiles(file);
    assert.equal(runSummaryImportStepFile(file, afterPath, beforePath).state, "before");
    assert.deepEqual(dataFiles(file), beforeWal);
    assert.equal(runSummaryImportStepFile(file, afterPath, beforePath, "apply").changed, true);
    const committedWal = dataFiles(file), committed = snapshot(wal);
    assert.equal(runSummaryImportStepFile(file, afterPath, beforePath, "apply").changed, false);
    assert.deepEqual(dataFiles(file), committedWal); assert.deepEqual(snapshot(wal), committed);
  } finally {wal.close();}

  const closedWalPath = path.join(temp, "closed-wal.sqlite");
  const closedWal = new Database(closedWalPath); closedWal.pragma("journal_mode=WAL"); seed(closedWal); closedWal.close();
  const closedMain = {bytes: fs.readFileSync(closedWalPath), mtime: fs.statSync(closedWalPath).mtimeMs};
  assert.equal(runSummaryImportStepFile(closedWalPath, afterPath, beforePath).changed, false);
  assert.deepEqual({bytes: fs.readFileSync(closedWalPath), mtime: fs.statSync(closedWalPath).mtimeMs}, closedMain);
  if (fs.existsSync(`${closedWalPath}-wal`)) assert.equal(fs.statSync(`${closedWalPath}-wal`).size, 0);
  console.log(`PASS closed WAL readonly coordination: empty WAL=${fs.existsSync(`${closedWalPath}-wal`)}, SHM=${fs.existsSync(`${closedWalPath}-shm`)}; main data bytes/mtime preserved`);

  // Legacy CLI still uses cwd-relative --input, configured default canonical
  // path, dry-run counts/reports and no-deletion upsert semantics.
  const legacyPath = path.join(temp, "legacy.sqlite"), legacy = new Database(legacyPath); seed(legacy); legacy.close();
  const canonical = path.join(temp, "short-desc-normalized/summaries.generated.jsonl");
  fs.mkdirSync(path.dirname(canonical)); write(canonical, after);
  const legacyEnv = {...process.env, CONTENT_DATABASE_URL: `file:${legacyPath}`};
  const legacyModule = path.join(root, "data-tools/src/short-desc/import.ts");
  const legacyRun = (args: string[]) => {
    const result = spawnSync(process.execPath, ["--import", tsx, legacyModule, ...args], {cwd: temp, env: legacyEnv, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    const reportPath = result.stdout.match(/Report: (.+)/)![1]!.trim();
    assert(reportPath.startsWith(path.join(root, "data-tools/out/short-desc-import")));
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8")); fs.unlinkSync(reportPath);
    return report;
  };
  const legacyBefore = dataFiles(legacyPath);
  const dry = legacyRun(["--input", path.relative(temp, afterPath), "--dry-run"]);
  assert.equal(dry.inserted, 1); assert.equal(dry.updated, 1); assert.equal(dry.unchanged, 1);
  assert.deepEqual(dataFiles(legacyPath), legacyBefore);
  const live = legacyRun([]); assert.equal(live.inserted, 1); assert.equal(live.updated, 1);
  const repeat = legacyRun([]); assert.equal(repeat.unchanged, 3); assert.equal(repeat.inserted + repeat.updated, 0);
  write(canonical, [after[0]]);
  assert.equal(legacyRun([]).unchanged, 1);
  const legacyVerify = new Database(legacyPath, {readonly: true});
  assert.equal(legacyVerify.prepare("SELECT COUNT(*) FROM I18nSpellSummaryText").pluck().get(), 3); legacyVerify.close();
  console.log("Summary import step portable tests passed (complete inventories, SQL rollback, protected exact cells, two batches, annotations, stale FTS, readonly/repeat/WAL, legacy and caller paths)");
} finally {fs.rmSync(temp, {recursive: true, force: true});}
