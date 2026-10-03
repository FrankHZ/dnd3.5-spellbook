import assert from "node:assert/strict";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { pathToFileURL } from "node:url";
import { contentSearchStep } from "./content-search-step";
import { runContentSearchStepFile } from "./content-search-step-cli";
import { readContentSearchSource, rebuildContentSearchIndex } from "./content-search";
import { buildContentSearchDocuments, replaceContentSearchIndex } from "./content-search-documents";

const root = path.resolve(__dirname, "../../..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "content-search-step-"));
process.env.DATA_REPO_PATH = temp;
process.env.RULES_DATABASE_URL = `file:${path.join(temp, "rules.sqlite")}`;
process.env.APP_STATE_DATABASE_URL = `file:${path.join(temp, "app-state.sqlite")}`;
process.env.CONTENT_DATABASE_URL = `file:${path.join(temp, "content.sqlite")}`;

function seed(db: Database.Database) {
  const migrations = path.join(root, "server/db/content/migrations");
  for (const name of fs.readdirSync(migrations).sort()) {
    if (name !== "migration_lock.toml") db.exec(fs.readFileSync(path.join(migrations, name, "migration.sql"), "utf8"));
  }
  for (const file of ["normalized-rules-spells.jsonl", "rules-content-builds.jsonl", "i18n-spell-overlays.jsonl"]) {
    for (const line of fs.readFileSync(path.join(root, "server/db/content/fixtures/portable", file), "utf8").split(/\r?\n/).filter(Boolean)) {
      const {table, data} = JSON.parse(line) as {table: string; data: Record<string, unknown>};
      if (["I18nSpellText", "I18nSpellSummaryText"].includes(table) &&
        !db.prepare("SELECT 1 FROM SpellContent WHERE legacySpellId=?").get(data.spellId)) continue;
      if (table.startsWith("I18n")) data.updatedAt ??= "2026-10-02T00:00:00.000Z";
      const names = Object.keys(data);
      db.prepare(`INSERT INTO "${table}" (${names.map(name => `"${name}"`).join(",")}) VALUES (${names.map(() => "?").join(",")})`)
        .run(...Object.values(data).map(value => typeof value === "boolean" ? Number(value) : value));
    }
  }
  db.exec(`CREATE TABLE Control(id INTEGER PRIMARY KEY, payload BLOB, counter INTEGER, value TEXT);
    INSERT INTO Control VALUES (1, x'00ff0080', 9007199254740992, 'synthetic control');`);
}
function snapshot(db: Database.Database) {
  return {schema: db.prepare("SELECT * FROM sqlite_master ORDER BY name").safeIntegers().all(),
    rows: (db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {name: string}[])
      .map(({name}) => [name, db.prepare(`SELECT * FROM "${name}"`).safeIntegers().raw().all()])};
}
function match(db: Database.Database, text: string, lang = "en", variant = "default") {
  return db.prepare(`SELECT spellId FROM SpellSearchDocument WHERE SpellSearchDocument MATCH ? AND lang=? AND variant=? ORDER BY spellId`)
    .pluck().all(`"${text}"`, lang, variant);
}
function staleThenRepair(db: Database.Database) {
  const before = snapshot(db);
  const check = contentSearchStep(db);
  assert.equal(check.state, "stale"); assert.equal(check.changed, false); assert.equal(check.wouldChange, true);
  assert.deepEqual(snapshot(db), before);
  const applied = contentSearchStep(db, "apply");
  assert.equal(applied.state, "current"); assert.equal(applied.changed, true); assert.equal(applied.wouldChange, false);
  const after = snapshot(db);
  assert.equal(contentSearchStep(db, "apply").changed, false);
  assert.deepEqual(snapshot(db), after);
}
function unchangedFiles(file: string) {
  return [file, `${file}-wal`].filter(name => fs.existsSync(name)).map(name => ({name,
    bytes: fs.readFileSync(name), mtime: fs.statSync(name).mtimeMs}));
}

try {
  const db = new Database(":memory:"); seed(db);
  try {
    staleThenRepair(db);
    const changes = db.prepare("SELECT total_changes()").pluck().get();
    db.pragma("query_only=ON");
    assert.equal(contentSearchStep(db).state, "current");
    assert.equal(db.prepare("SELECT total_changes()").pluck().get(), changes);
    db.pragma("query_only=OFF");
    // Complete persisted fields and key multiset, including same-count drift.
    for (const field of ["name", "aliases", "summary", "mechanics", "body", "lang", "variant", "spellId"]) {
      db.exec(`UPDATE SpellSearchDocument SET "${field}"=${field === "spellId" ? "999999" : "'synthetic drift'"} WHERE rowid=(SELECT MIN(rowid) FROM SpellSearchDocument)`);
      staleThenRepair(db);
    }
    db.exec("DELETE FROM SpellSearchDocument WHERE rowid=(SELECT MIN(rowid) FROM SpellSearchDocument)");
    staleThenRepair(db);
    db.exec("INSERT INTO SpellSearchDocument SELECT * FROM SpellSearchDocument LIMIT 1");
    staleThenRepair(db);
    // Duplicate replaces another key, so counts still equal expected.
    db.exec(`DELETE FROM SpellSearchDocument WHERE rowid=(SELECT MIN(rowid) FROM SpellSearchDocument);
      INSERT INTO SpellSearchDocument SELECT * FROM SpellSearchDocument LIMIT 1;`);
    staleThenRepair(db);
    db.exec(`INSERT INTO SpellSearchDocument VALUES (99999,'en','default','extra','','','','')`);
    staleThenRepair(db);
    for (const change of ["schemaVersion=1", "documentCount=1", "rebuiltAt='yesterday'", "rebuiltAt='2026-99-99 11:12:13'"]) {
      db.exec(`UPDATE SpellSearchIndexState SET ${change}`); staleThenRepair(db);
    }
    db.exec("DELETE FROM SpellSearchIndexState"); staleThenRepair(db);

    // Two committed source batches; stale FTS is independent of upstream repeat flags.
    const protectedControl = db.prepare("SELECT * FROM Control").safeIntegers().get();
    db.exec("UPDATE SpellContent SET descriptionText='firstbatchtoken' WHERE legacySpellId=100");
    assert.deepEqual(match(db, "firstbatchtoken"), []);
    staleThenRepair(db); assert.deepEqual(match(db, "firstbatchtoken"), [100]);
    db.exec("UPDATE SpellContent SET descriptionText='secondbatchtoken' WHERE legacySpellId=2");
    staleThenRepair(db);
    assert.deepEqual(match(db, "firstbatchtoken"), [100]); assert.deepEqual(match(db, "secondbatchtoken"), [2]);
    assert.deepEqual(db.prepare("SELECT * FROM Control").safeIntegers().get(), protectedControl);
    db.exec("UPDATE SpellContent SET descriptionText='replacementtoken' WHERE legacySpellId=100");
    staleThenRepair(db);
    assert.deepEqual(match(db, "firstbatchtoken"), []); assert.deepEqual(match(db, "replacementtoken"), [100]);
    db.exec(`UPDATE I18nSpellSummaryText SET summaryText='acceptedsummarytoken' WHERE spellId=2441 AND lang='en';`);
    staleThenRepair(db); assert.deepEqual(match(db, "acceptedsummarytoken"), [2441]);
    db.exec(`UPDATE I18nSpellSummaryText SET reviewStatus='review' WHERE spellId=2441 AND lang='en';`);
    staleThenRepair(db); assert.deepEqual(match(db, "acceptedsummarytoken"), []);

    // Real SQL failure occurs after delete/document inserts inside maintained replacement.
    db.exec(`UPDATE SpellContent SET descriptionText='pendingtoken' WHERE legacySpellId=100;
      CREATE TRIGGER FailSearch BEFORE INSERT ON SpellSearchIndexState BEGIN SELECT RAISE(ABORT,'real replacement failure'); END;`);
    const failBefore = snapshot(db);
    assert.throws(() => contentSearchStep(db, "apply"), /real replacement failure/);
    assert.deepEqual(snapshot(db), failBefore); db.exec("DROP TRIGGER FailSearch");
    staleThenRepair(db);

    // Real side effects on source/build/i18n/summary/provenance and exact SQLite values.
    for (const sql of [
      "UPDATE SpellContent SET rawJson='changed' WHERE legacySpellId=100",
      "UPDATE RulesContentBuild SET buildMetaJson='changed'",
      "UPDATE I18nSpellText SET nameProvenanceJson='changed' WHERE spellId=100",
      "UPDATE I18nSpellSummaryText SET sourceKey='changed' WHERE spellId=2441",
      "UPDATE Control SET counter=9007199254740993 WHERE id=1",
      "UPDATE Control SET payload=x'00ff0081' WHERE id=1",
      "UPDATE SpellContent SET descriptionText='unexpectedaftertoken' WHERE legacySpellId=100",
    ]) {
      db.exec(`UPDATE SpellSearchIndexState SET schemaVersion=1;
        CREATE TRIGGER SideEffect AFTER INSERT ON SpellSearchIndexState BEGIN ${sql}; END;`);
      const before = snapshot(db);
      assert.throws(() => contentSearchStep(db, "apply"), /protected rows\/schema|replacement verification/);
      assert.deepEqual(snapshot(db), before); db.exec("DROP TRIGGER SideEffect"); staleThenRepair(db);
    }
    // A malicious state trigger leaves source intact but changes a complete document.
    db.exec(`UPDATE SpellSearchIndexState SET schemaVersion=1;
      CREATE TRIGGER AfterSearch AFTER INSERT ON SpellSearchIndexState BEGIN
      UPDATE SpellSearchDocument SET body='aftercorruptiontoken' WHERE spellId=100; END;`);
    const afterFault = snapshot(db);
    assert.throws(() => contentSearchStep(db, "apply"), /replacement verification/);
    assert.deepEqual(snapshot(db), afterFault); db.exec("DROP TRIGGER AfterSearch"); staleThenRepair(db);
    // Real trigger damage to FTS internals during replacement must also roll back.
    // Unsafe mode permits fault injection only in this task-owned memory fixture.
    db.unsafeMode(true);
    db.exec(`UPDATE SpellSearchIndexState SET schemaVersion=1;
      CREATE TRIGGER InternalEffect AFTER INSERT ON SpellSearchIndexState BEGIN
      UPDATE SpellSearchDocument_docsize SET sz=zeroblob(length(sz)); END;`);
    const internalBefore = snapshot(db);
    assert.throws(() => contentSearchStep(db, "apply"), /Corrupt FTS index/);
    assert.deepEqual(snapshot(db), internalBefore);
    db.exec("DROP TRIGGER InternalEffect"); db.unsafeMode(false); staleThenRepair(db);

    // SELECT rows/counts stay exact while segment data becomes corrupt; the
    // readonly partial integrity check must recognize this virtual index corruption.
    const originalRows = db.prepare("SELECT * FROM SpellSearchDocument").all();
    db.unsafeMode(true);
    db.exec("UPDATE SpellSearchDocument_data SET block=zeroblob(length(block)) WHERE id>10");
    db.unsafeMode(false);
    assert.deepEqual(db.prepare("SELECT * FROM SpellSearchDocument").all(), originalRows);
    assert.match(String(db.pragma("integrity_check(SpellSearchDocument)", {simple: true})), /fts5|FTS5/);
    const corrupt = snapshot(db);
    for (const mode of ["check", "apply"] as const) assert.throws(() => contentSearchStep(db, mode), /Corrupt FTS index/);
    assert.deepEqual(snapshot(db), corrupt);
  } finally {db.close();}

  const file = path.join(temp, "content.sqlite");
  const writer = new Database(file); seed(writer);
  let closedWalRows: ReturnType<typeof snapshot> | undefined;
  try {
    writer.pragma("journal_mode = WAL"); writer.pragma("wal_autocheckpoint = 0");
    replaceContentSearchIndex(writer, buildContentSearchDocuments(readContentSearchSource(writer)));
    // The unchanged base file predates the source + FTS commit in WAL frames.
    writer.exec("UPDATE SpellContent SET descriptionText='walcurrenttoken' WHERE legacySpellId=100");
    assert.equal(runContentSearchStepFile(file).state, "stale");
    assert.equal(runContentSearchStepFile(file, "apply").changed, true);
    assert.deepEqual(match(writer, "walcurrenttoken"), [100]);
    const before = unchangedFiles(file), rows = snapshot(writer);
    for (const mode of ["check", "apply"] as const) {
      assert.equal(runContentSearchStepFile(file, mode).changed, false);
      assert.deepEqual(unchangedFiles(file), before);
      assert.deepEqual(snapshot(writer), rows);
    }
    // Inspection after real uncommitted DELETE/INSERT is proven by every apply's
    // after check. Force a concurrent source commit after the first read-only
    // integrity query, then prove apply uses the rechecked transaction source.
    const concurrent = new Database(file);
    writer.exec("UPDATE SpellSearchIndexState SET schemaVersion=1");
    const prepare = writer.prepare.bind(writer);
    let once = true;
    writer.prepare = ((sql: string) => {
      const statement = prepare(sql);
      if (sql.includes("PRAGMA main.integrity_check") && once) {
        const pluck = statement.pluck.bind(statement);
        statement.pluck = (() => {
          const selected = pluck();
          const all = selected.all.bind(selected);
          selected.all = ((...args: unknown[]) => {
            const rows = all(...args);
            once = false;
            concurrent.exec("UPDATE SpellContent SET descriptionText='concurrenttoken' WHERE legacySpellId=100");
            return rows;
          }) as typeof selected.all;
          return selected;
        }) as typeof statement.pluck;
      }
      return statement;
    }) as typeof writer.prepare;
    try {
      assert.equal(contentSearchStep(writer, "apply").changed, true);
      assert.deepEqual(match(writer, "concurrenttoken"), [100]);
    } finally {writer.prepare = prepare; concurrent.close();}

    // Default mode and independent caller paths exercise actual maintained CLI.
    const cliBefore = unchangedFiles(file), cliRows = snapshot(writer);
    const tsx = path.join(root, "node_modules/tsx/dist/cli.mjs");
    const cli = path.join(root, "data-tools/src/db/content-search-step-cli.ts");
    const npm = process.env.npm_execpath;
    assert(npm, "Run this maintained test through npm");
    for (const packageDir of [root, path.join(root, "data-tools")]) {
      const args = packageDir === root ? ["run", "-w", "data-tools", "content:search:step", "--", "--content-db", file] :
        ["run", "content:search:step", "--", "--content-db", file];
      const run: SpawnSyncReturns<string> = spawnSync(process.execPath, [npm, ...args], {cwd: packageDir, env: process.env, encoding: "utf8"});
      assert.equal(run.status, 0, run.stderr); assert.match(run.stdout, /"state": "current"/);
    }
    const invoke = (args: string[], cwd = temp, env = process.env) => spawnSync(process.execPath, [tsx, cli, ...args], {cwd, env, encoding: "utf8"});
    assert.equal(invoke(["--content-db", path.relative(root, file)]).status, 0);
    const envPath = `file:${path.relative(path.join(root, "server"), file)}`;
    assert.equal(invoke([], temp, {...process.env, CONTENT_DATABASE_URL: envPath}).status, 0);
    for (const args of [["--dry-run"], ["--apply", "--apply"], ["--content-db"], ["--content-db", path.join(temp, "missing.sqlite")]]) {
      assert.notEqual(invoke(args).status, 0);
    }
    assert(!fs.existsSync(path.join(temp, "missing.sqlite")));
    const unavailable = invoke(["--content-db", file], temp, {...process.env, RULES_DATABASE_URL: `file:${file}`});
    assert.notEqual(unavailable.status, 0); assert.match(unavailable.stderr, /must differ/);
    // No-op apply works through a readonly connection; no writable handle needed.
    const readonly = new Database(file, {readonly: true});
    try {assert.equal(contentSearchStep(readonly, "apply").changed, false);}
    finally {readonly.close();}
    assert.equal(invoke(["--apply"]).status, 0);
    // Verify code resolves the supplied checkout, not the primary dependency host.
    const checkRoot = spawnSync(process.execPath, [tsx, "--eval",
      `import {repoRoot} from ${JSON.stringify(pathToFileURL(path.join(root, "data-tools/src/shared/env.ts")).href)}; console.log(repoRoot())`],
      {cwd: temp, env: process.env, encoding: "utf8"});
    assert.equal(checkRoot.status, 0, checkRoot.stderr); assert.equal(checkRoot.stdout.trim(), root);
    assert.deepEqual(unchangedFiles(file), cliBefore);
    assert.deepEqual(snapshot(writer), cliRows);
    // Ordinary rebuild retains the legacy unconditional replacement contract.
    assert.equal(rebuildContentSearchIndex(writer, false).mode, "rebuild");
    closedWalRows = snapshot(writer);
  } finally {writer.close();}

  // A readonly WAL reader may create SQLite coordination sidecars when none
  // existed. The database data/main bytes and any existing WAL frames stay exact.
  assert(!fs.existsSync(`${file}-wal`) && !fs.existsSync(`${file}-shm`));
  const closedWalBefore = unchangedFiles(file);
  for (const mode of ["check", "apply"] as const) {
    const existing = unchangedFiles(file);
    assert.equal(runContentSearchStepFile(file, mode).changed, false);
    assert.deepEqual(unchangedFiles(file).filter(row => existing.some(before => before.name === row.name)), existing);
  }
  assert.deepEqual(unchangedFiles(file).filter(row => row.name === file), closedWalBefore);
  if (fs.existsSync(`${file}-wal`)) assert.equal(fs.statSync(`${file}-wal`).size, 0);
  const closedWalCheck = new Database(file, {readonly: true});
  try {
    assert.deepEqual(snapshot(closedWalCheck), closedWalRows);
    assert.equal(contentSearchStep(closedWalCheck).state, "current");
    assert.equal(closedWalCheck.prepare("SELECT total_changes()").pluck().get(), 0);
  } finally {closedWalCheck.close();}
  console.log(`PASS closed WAL readonly coordination: created empty WAL=${fs.existsSync(`${file}-wal`)}, SHM=${fs.existsSync(`${file}-shm`)}; main bytes/mtime and rows preserved`);

  const plainFile = path.join(temp, "plain.sqlite");
  const plain = new Database(plainFile); seed(plain);
  assert.equal(contentSearchStep(plain, "apply").changed, true); plain.close();
  const closedBefore = unchangedFiles(plainFile);
  for (const mode of ["check", "apply"] as const) {
    assert.equal(runContentSearchStepFile(plainFile, mode).changed, false);
    assert.deepEqual(unchangedFiles(plainFile), closedBefore);
  }

  const old = new Database(":memory:"); seed(old);
  old.function("sqlite_version", () => "3.43.2");
  const oldBefore = snapshot(old);
  for (const mode of ["check", "apply"] as const) assert.throws(() => contentSearchStep(old, mode), /requires SQLite 3.44/);
  assert.deepEqual(snapshot(old), oldBefore); old.close();

  const wrongFile = path.join(temp, "wrong-role.sqlite"), wrong = new Database(wrongFile);
  wrong.exec("CREATE TABLE User(id INTEGER PRIMARY KEY)"); wrong.close();
  const wrongBefore = unchangedFiles(wrongFile);
  for (const mode of ["check", "apply"] as const) assert.throws(() => runContentSearchStepFile(wrongFile, mode), /content DB role/);
  assert.deepEqual(unchangedFiles(wrongFile), wrongBefore);

  const unavailable = new Database(":memory:"); seed(unavailable);
  const nativePrepare = unavailable.prepare.bind(unavailable);
  unavailable.prepare = ((sql: string) => {
    if (sql.includes("PRAGMA main.integrity_check")) throw new Error("synthetic runtime unavailable");
    return nativePrepare(sql);
  }) as typeof unavailable.prepare;
  const unavailableBefore = snapshot(unavailable);
  for (const mode of ["check", "apply"] as const) assert.throws(() => contentSearchStep(unavailable, mode), /FTS integrity verification unavailable/);
  assert.deepEqual(snapshot(unavailable), unavailableBefore); unavailable.close();

  for (const defect of ["CREATE TABLE User(id INTEGER)", "CREATE TABLE dnd_spell(id INTEGER)",
    "DROP TABLE SpellMechanicFacet", "ALTER TABLE I18nSpellText DROP COLUMN nameProvenanceJson",
    "DROP TABLE SpellSearchIndexState", "DROP TABLE SpellSearchDocument; CREATE TABLE SpellSearchDocument(spellId INTEGER)",
    `DROP TABLE SpellSearchDocument; CREATE VIRTUAL TABLE SpellSearchDocument USING fts5(spellId UNINDEXED,lang UNINDEXED,variant UNINDEXED,name,aliases,summary,mechanics,body,tokenize='unicode61')`,
    "UPDATE SpellContent SET legacySpellId=9007199254740993 WHERE legacySpellId=100",
    "UPDATE I18nSpellText SET spellId=999999 WHERE spellId=100",
    "UPDATE SpellMechanicFacet SET spellId='orphan' WHERE id=(SELECT MIN(id) FROM SpellMechanicFacet)",
  ]) {
    const bad = new Database(":memory:"); seed(bad); bad.exec(defect);
    const before = snapshot(bad);
    for (const mode of ["check", "apply"] as const) assert.throws(() => contentSearchStep(bad, mode));
    assert.deepEqual(snapshot(bad), before); bad.close();
  }
  console.log("PASS content search step: exact rows/state, WAL snapshots, zero writes, SQL rollback, FTS corruption and caller paths");
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}
