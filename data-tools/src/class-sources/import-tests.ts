import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import { acceptedClassSourceRevision, importClassSources, loadAcceptedClassSources } from "./import";
import { createClassSourceFixture, seedPreviousClassSources } from "./import-test-fixture";
import { repoRoot } from "../shared/env";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "class-source-upgrade-"));
const fixture = createClassSourceFixture(temp);
const rules = new Database(fixture.rulesPath, { readonly: true });
const writable = new Database(fixture.rulesPath);
const contentPath = path.join(temp, "content.sqlite");
const db = new Database(contentPath);
const migration = fs.readFileSync(path.join(repoRoot(),
  "server/db/content/migrations/20261008200000_add_class_source_mapping/migration.sql"), "utf8");
const load = () => fixture.withGit(() => loadAcceptedClassSources(temp, rules));
const snapshot = () => ({ imports: db.prepare("SELECT * FROM ClassSourceImport").all(),
  rows: db.prepare("SELECT * FROM ClassSourceMapping ORDER BY variantId").all() });
try {
  const handoff = load();
  assert.equal(handoff.revision, acceptedClassSourceRevision);
  assert.equal(handoff.rows.length, 84);
  assert.equal(handoff.rows.filter((r) => r.disposition === "supported").length, 69);
  assert.equal(handoff.rows.filter((r) => r.disposition === "source-uncertain").length, 4);
  assert(Object.isFrozen(handoff) && Object.isFrozen(handoff.rows) && Object.isFrozen(handoff.rows[0]));
  assert.throws(() => importClassSources(db, { ...handoff }), /authenticated/);
  assert.throws(() => importClassSources(db, { ...handoff, revision: "foreign" }), /Unaccepted/);
  // Old input cannot relabel or downgrade the accepted target.
  assert.throws(() => importClassSources(db, { ...handoff, ...handoff.previous }), /downgrade/);
  for (const file of ["class-sources/issue-619/final-handoff.json",
    "class-sources/issue-632/proposed-support-delta.json", "class-sources/issue-632/sources.json"]) {
    const full = path.join(temp, file), before = fs.readFileSync(full);
    fs.appendFileSync(full, " ");
    assert.throws(load, /Changed accepted input/);
    fs.writeFileSync(full, before);
  }
  // Live identities and the whole version set are checked, not only counts.
  for (const [mutate, restore] of [
    ["UPDATE dnd_characterclassvariant SET page=2 WHERE id=974", "UPDATE dnd_characterclassvariant SET page=1 WHERE id=974"],
    ["UPDATE dnd_characterclass SET slug='drift' WHERE id=860", "UPDATE dnd_characterclass SET slug='class-860' WHERE id=860"],
    ["INSERT INTO dnd_characterclassvariant VALUES(999999,860,109,1)", "DELETE FROM dnd_characterclassvariant WHERE id=999999"],
  ]) {
    writable.exec(mutate!);
    try { assert.throws(load); } finally { writable.exec(restore!); }
  }
  writable.close();
  db.exec("CREATE TABLE SpellContent(id TEXT PRIMARY KEY, descriptionText TEXT); INSERT INTO SpellContent VALUES('keep','canonical'); CREATE TABLE ProtectedOverlay(id INTEGER,text TEXT); INSERT INTO ProtectedOverlay VALUES(1,'Chinese/summary/FTS sentinel');");
  assert.equal(importClassSources(db, handoff).predecessor, "empty");
  assert.throws(() => importClassSources(db, handoff, true), /migration/);
  db.exec("CREATE TABLE ClassSourceImport(id INTEGER)");
  assert.throws(() => importClassSources(db, handoff), /Partial/);
  db.exec("DROP TABLE ClassSourceImport");
  db.exec(migration);
  db.exec("CREATE TRIGGER fail_insert BEFORE INSERT ON ClassSourceMapping WHEN NEW.variantId=974 BEGIN SELECT RAISE(ABORT,'insert rollback'); END");
  assert.throws(() => importClassSources(db, handoff, true), /insert rollback/);
  assert.deepEqual(snapshot(), { imports: [], rows: [] });
  db.exec("DROP TRIGGER fail_insert");
  seedPreviousClassSources(db, handoff);
  const old = snapshot();
  assert.equal(importClassSources(db, handoff).predecessor, "previous");
  assert.deepEqual(snapshot(), old);
  const rejectDrift = (sql: string) => {
    db.exec("SAVEPOINT drift"); db.exec(sql); const drift = snapshot();
    assert.throws(() => importClassSources(db, handoff, true));
    assert.deepEqual(snapshot(), drift);
    db.exec("ROLLBACK TO drift; RELEASE drift");
  };
  for (const sql of ["UPDATE ClassSourceImport SET handoffRevision='foreign'",
    "UPDATE ClassSourceImport SET sourceRevision='foreign'",
    "UPDATE ClassSourceImport SET scope='foreign'",
    "INSERT INTO ClassSourceImport SELECT 2,handoffRevision,sourceRevision,scope FROM ClassSourceImport",
    "DELETE FROM ClassSourceMapping WHERE variantId=974",
    "UPDATE ClassSourceMapping SET name='drift' WHERE variantId=10001",
    "UPDATE ClassSourceMapping SET disposition='supported',relation='reprint' WHERE variantId=76",
    "UPDATE ClassSourceMapping SET variantId=999999 WHERE variantId=974",
    "DELETE FROM ClassSourceImport"]) rejectDrift(sql);
  // Mutation between outer inspection and transactional inspection is rejected
  // and rolled back by the transaction, rather than overwritten.
  const transaction = db.transaction.bind(db);
  const raced = new Proxy(db, { get(target, key) {
    if (key === "transaction") return (body: () => unknown) => transaction(() => {
      db.exec("UPDATE ClassSourceMapping SET name='raced' WHERE variantId=10001"); body();
    });
    const value = Reflect.get(target, key);
    return typeof value === "function" ? value.bind(target) : value;
  } });
  assert.throws(() => importClassSources(raced, handoff, true), /differs/);
  assert.deepEqual(snapshot(), old);
  db.exec("CREATE TRIGGER fail_upgrade BEFORE UPDATE ON ClassSourceMapping WHEN NEW.variantId=979 BEGIN SELECT RAISE(ABORT,'upgrade rollback'); END");
  assert.throws(() => importClassSources(db, handoff, true), /upgrade rollback/);
  assert.deepEqual(snapshot(), old);
  db.exec("DROP TRIGGER fail_upgrade; CREATE TRIGGER fail_metadata BEFORE UPDATE ON ClassSourceImport BEGIN SELECT RAISE(ABORT,'metadata rollback'); END");
  assert.throws(() => importClassSources(db, handoff, true), /metadata rollback/);
  assert.deepEqual(snapshot(), old);
  db.exec("DROP TRIGGER fail_metadata; CREATE TABLE ChangedVariants(id INTEGER); CREATE TRIGGER track_upgrade AFTER UPDATE ON ClassSourceMapping BEGIN INSERT INTO ChangedVariants VALUES(NEW.variantId); END");
  assert.equal(importClassSources(db, handoff, true).changed, true);
  assert.deepEqual(db.prepare("SELECT id FROM ChangedVariants ORDER BY id").all(),
    [76,79,974,977,979].map((id) => ({ id })));
  const next = snapshot();
  const untouched = (rows: unknown[]) => rows.filter((r) => ![76,79,974,977,979].includes((r as {variantId:number}).variantId));
  assert.deepEqual(untouched(next.rows), untouched(old.rows));
  const changes = db.prepare("SELECT total_changes() AS n").get();
  assert.equal(importClassSources(db, handoff, true).changed, false);
  assert.deepEqual(db.prepare("SELECT total_changes() AS n").get(), changes);
  for (const sql of ["UPDATE ClassSourceMapping SET evidenceJson='{}' WHERE variantId=76",
    "UPDATE ClassSourceMapping SET disposition='source-uncertain',relation=NULL WHERE variantId=974",
    "UPDATE ClassSourceImport SET handoffRevision='efe2083c0f5049aabce561517f3f02b9901ba07b'"]) rejectDrift(sql);
  assert.deepEqual(db.prepare("SELECT * FROM SpellContent").all(), [{ id: "keep", descriptionText: "canonical" }]);
  assert.deepEqual(db.prepare("SELECT * FROM ProtectedOverlay").all(), [{ id:1, text:"Chinese/summary/FTS sentinel" }]);
  const external = JSON.parse(handoff.rows.find((r) => r.variantId === 76)!.evidenceJson);
  assert.equal(external.authority, "accepted-external-publisher-evidence");
  assert.equal(external.decision.relation, "reprint");
  assert.equal(external.sourceRevision, undefined);
  db.exec("DELETE FROM ClassSourceMapping; DELETE FROM ClassSourceImport");
  assert.equal(importClassSources(db, handoff, true).changed, true); // clean install
  assert.deepEqual(snapshot(), next);
  db.exec("DELETE FROM ClassSourceMapping; DELETE FROM ClassSourceImport");
  db.close();
  const cli = (cwd: string, args: string[]) => spawnSync(process.execPath,
    ["--import", "tsx", path.join(repoRoot(), "data-tools/src/class-sources/import-cli.ts"), ...args], {
      cwd, encoding: "utf8", env: { ...process.env, DATA_REPO_PATH: temp,
        NODE_OPTIONS: `--require=${JSON.stringify(fixture.hook.replace(/\\/g, "/"))}` },
    });
  const args = ["--rules-db", path.relative(repoRoot(), fixture.rulesPath), "--content-db", path.relative(repoRoot(), contentPath)];
  const bytes = fs.readFileSync(contentPath);
  const check = cli(repoRoot(), args);
  assert.equal(check.status, 0, check.stderr);
  assert.equal(JSON.parse(check.stdout).wouldChange, true);
  assert.deepEqual(fs.readFileSync(contentPath), bytes);
  const apply = cli(repoRoot(), [...args, "--apply"]);
  assert.equal(apply.status, 0, apply.stderr);
  assert.equal(JSON.parse(apply.stdout).changed, true);
  const repeat = cli(path.join(repoRoot(), "data-tools"), [...args, "--apply"]);
  assert.equal(repeat.status, 0, repeat.stderr);
  assert.equal(JSON.parse(repeat.stdout).changed, false);
  assert.notEqual(cli(repoRoot(), ["--rules-db", fixture.rulesPath, "--content-db", fixture.rulesPath]).status, 0);
  const appState = path.join(temp, "app-state.sqlite"); fs.writeFileSync(appState, bytes);
  assert.notEqual(cli(repoRoot(), ["--rules-db", fixture.rulesPath, "--content-db", appState, "--apply"]).status, 0);
  assert.deepEqual(fs.readFileSync(appState), bytes);
  const wrongRole = path.join(temp, "other.sqlite");
  const roleDb = new Database(wrongRole); roleDb.exec("CREATE TABLE UserState(id INTEGER)"); roleDb.close();
  const roleBefore = fs.readFileSync(wrongRole);
  assert.notEqual(cli(repoRoot(), ["--rules-db", fixture.rulesPath, "--content-db", wrongRole, "--apply"]).status, 0);
  assert.deepEqual(fs.readFileSync(wrongRole), roleBefore);
  assert.notEqual(cli(repoRoot(), [...args, "--revision", "arbitrary"]).status, 0);
  console.log("class-source upgrade checks passed: fixed inputs, nine/five keys, empty/old/new, 79 preserved, drift, transaction recheck, rollback, repeat, CLI root/package and role guards");
} finally {
  if (db.open) db.close(); rules.close(); if (writable.open) writable.close();
  fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
