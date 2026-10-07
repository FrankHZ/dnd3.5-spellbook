import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {prepareOverlayFixture} from "./db-english-overlay-test-fixtures";
import {cityscapeOverlay, CityscapeOverlayError} from "./db-english-overlay";
import {checkOverlayArguments, runCityscapeOverlay} from "./db-english-overlay-cli";
import {sequenceSnapshot} from "../db/content-sequence-test-fixtures";
import {cityscapeAcceptance as a} from "./db-english-handoff";

const started = performance.now();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cityscape-overlay-"));
let db: Database.Database | undefined;
try {
  const f = prepareOverlayFixture(temp);
  db = new Database(f.contentPath);
  const snapshot = () => sequenceSnapshot(db!);
  const run = (mode: "check" | "apply" = "check", fault?: Parameters<typeof cityscapeOverlay>[3]) => cityscapeOverlay(db!, f.authenticate, mode, fault);
  const initial = snapshot();
  assert.equal(run().state, "before"); assert.equal(run().complete, false); assert.deepEqual(snapshot(), initial);
  const failure = (point: "inside-overlay" | "after-overlay") => {
    try {run("apply", p => {if (p === point) throw new Error("synthetic interruption");}); assert.fail("fault must fail");}
    catch (error) {assert(error instanceof CityscapeOverlayError); return error;}
  };
  assert.equal(failure("inside-overlay").result.overlay, "failed");
  assert.deepEqual(snapshot(), initial, "row/build rollback is complete");
  // A trigger that mutates an unrelated table is detected in the same transaction.
  db.exec("CREATE TRIGGER bad_side_effect AFTER INSERT ON I18nSpellText BEGIN UPDATE Control SET value='changed'; END");
  const triggerBefore = snapshot();
  assert.throws(() => run("apply"), /protected rows/); assert.deepEqual(snapshot(), triggerBefore);
  db.exec("DROP TRIGGER bad_side_effect");
  const acceptedBefore = fs.readFileSync(f.decisions);
  assert.throws(() => run("apply", p => {
    if (p === "inside-overlay") fs.appendFileSync(f.decisions, "\n{}\n");
  }), /changed committed input/);
  fs.writeFileSync(f.decisions, acceptedBefore);
  assert.deepEqual(snapshot(), initial, "input drift rolls back overlay");
  // State is re-read after preflight, under the immediate write lock.
  assert.throws(() => run("apply", p => {
    if (p === "before-overlay") db!.exec("INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,updatedAt) VALUES('foreign',355,53,'zh','effective','unknown',CURRENT_TIMESTAMP)");
  }), /missing accepted build note/);
  assert.equal((db.prepare("SELECT count(*) AS n FROM I18nSpellText WHERE variant='effective' AND rulebookId=53").get() as {n: number}).n, 1);
  db.exec("DELETE FROM I18nSpellText WHERE id='foreign'");
  const interrupted = failure("after-overlay");
  assert.equal(interrupted.stage, "search");
  assert.equal(interrupted.result.overlay, "committed"); assert.equal(interrupted.result.search, "not-attempted");
  const targetsAfterCommit = db.prepare("SELECT * FROM I18nSpellText WHERE rulebookId=53 ORDER BY id").all();
  assert.equal(run().state, "after"); assert.equal(run().searchCheck?.state, "stale");
  // Actual maintained search transaction fails; the overlay remains committed.
  db.exec("CREATE TRIGGER fail_search BEFORE INSERT ON SpellSearchIndexState BEGIN SELECT RAISE(ABORT,'synthetic FTS failure'); END");
  const afterOverlay = snapshot();
  try {run("apply"); assert.fail("FTS must fail");} catch (error) {
    assert(error instanceof CityscapeOverlayError); assert.equal(error.stage, "search");
    assert.equal(error.result.overlay, "no-op"); assert.equal(error.result.search, "failed");
  }
  assert.deepEqual(snapshot(), afterOverlay, "failed FTS transaction rolls back only search");
  db.exec("DROP TRIGGER fail_search");
  // A concurrent/triggered target edit during the FTS rebuild must fail its
  // lock-local acceptance check and roll back both the edit and derived rows.
  db.exec("CREATE TRIGGER drift_during_search BEFORE INSERT ON SpellSearchIndexState BEGIN UPDATE I18nSpellText SET name='search-drift' WHERE spellId=355 AND variant='effective'; END");
  const searchDriftBefore = snapshot();
  assert.throws(() => run("apply"), /overlay drift: name/);
  assert.deepEqual(snapshot(), searchDriftBefore);
  db.exec("DROP TRIGGER drift_during_search");
  const resumed = run("apply");
  assert(resumed.complete); assert.equal(resumed.overlay, "no-op"); assert.equal(resumed.search, "committed");
  assert.deepEqual(db.prepare("SELECT * FROM I18nSpellText WHERE rulebookId=53 ORDER BY id").all(), targetsAfterCommit);
  const finished = snapshot();
  const repeated = run("apply");
  assert(repeated.complete); assert.equal(repeated.overlay, "no-op"); assert.equal(repeated.search, "no-op");
  assert.deepEqual(snapshot(), finished, "successful repeat preserves every row/timestamp and FTS state");
  assert.equal(run().complete, true);
  const canonical = db.prepare("SELECT descriptionText FROM SpellContent WHERE legacySpellId=355").pluck().get();
  db.exec("UPDATE SpellContent SET descriptionText='foreign English' WHERE legacySpellId=355");
  const canonicalDriftBefore = snapshot();
  assert.throws(() => run("apply"), /normalized canonical English body drift/);
  assert.deepEqual(snapshot(), canonicalDriftBefore);
  db.prepare("UPDATE SpellContent SET descriptionText=? WHERE legacySpellId=355").run(canonical);
  // No previous report can authorize skipping stale derived data.
  db.exec("UPDATE SpellSearchDocument SET body='expiredtoken' WHERE spellId=355 AND variant='effective'");
  assert.equal(run().searchCheck?.state, "stale");
  assert.equal(run("apply").search, "committed");
  assert.equal((db.prepare("SELECT count(*) AS n FROM SpellSearchDocument WHERE SpellSearchDocument MATCH 'expiredtoken'").get() as {n: number}).n, 0);
  const row = db.prepare("SELECT * FROM I18nSpellText WHERE spellId=355 AND variant='effective'").get() as Record<string, any>;
  const restore = () => db!.prepare(`INSERT INTO I18nSpellText(${Object.keys(row).join(",")}) VALUES(${Object.keys(row).map(() => "?").join(",")})`).run(...Object.values(row));
  for (const [field, value] of [["id", "foreign-owner"], ["lang", "en"], ["variant", "foreign"], ["rulebookId", 86], ["name", "drift"],
    ["descriptionHtml", null], ["descriptionText", "drift"], ["sourceKey", "foreign"], ["nameProvenanceJson", "{}"],
    ["bodyProvenanceJson", "{}"], ["updatedAt", "invalid"]] as const) {
    db.prepare(`UPDATE I18nSpellText SET ${field}=? WHERE id=?`).run(value, row.id);
    const before = snapshot(); assert.throws(() => run("apply")); assert.deepEqual(snapshot(), before, `rejected ${field} drift writes nothing`);
    db.prepare("DELETE FROM I18nSpellText WHERE spellId=355 AND id IN (?,?)").run(row.id, "foreign-owner"); restore();
  }
  db.prepare("DELETE FROM I18nSpellText WHERE id=?").run(row.id);
  assert.throws(() => run("apply"), /partial\/extra/); restore();
  db.exec("INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,updatedAt) VALUES('extra',99,53,'zh','effective','unknown',CURRENT_TIMESTAMP)");
  assert.throws(() => run("apply"), /partial\/extra/); db.exec("DELETE FROM I18nSpellText WHERE id='extra'");
  const build = db.prepare("SELECT * FROM RulesContentBuild").get() as Record<string, any>;
  for (const edit of [
    (m: any) => {delete m.overlays.cityscapeDbEnglish;},
    (m: any) => {m.overlays.cityscapeDbEnglish.acceptedRevision = "a".repeat(40);},
    (m: any) => {m.overlays.cityscapeDbEnglish.extra = true;},
    (m: any) => {m.overlays.scFinalNameBody.acceptedRevision = a.revision;},
    (m: any) => {m.artifact.generation.rulesDb.sha256 = "b".repeat(64);},
    (m: any) => {m.foreign = true;},
  ]) {
    const meta = JSON.parse(build.buildMetaJson); edit(meta);
    db.prepare("UPDATE RulesContentBuild SET buildMetaJson=?").run(JSON.stringify(meta));
    const before = snapshot(); assert.throws(() => run("apply")); assert.deepEqual(snapshot(), before);
    db.prepare("UPDATE RulesContentBuild SET buildMetaJson=?").run(build.buildMetaJson);
  }
  // Generic normalized importer still refuses an annotated predecessor.
  const {normalizedImportStep} = require("../rules-content/import-step") as typeof import("../rules-content/import-step");
  assert.throws(() => normalizedImportStep(db!, f.fullPath, f.fullPath, "check"), /unexpected fields/);
  db.exec("ALTER TABLE I18nSpellText ADD COLUMN foreignField TEXT");
  assert.throws(() => run("apply"), /schema/); db.exec("ALTER TABLE I18nSpellText DROP COLUMN foreignField");
  assert.throws(() => checkOverlayArguments(["--apply", "yes"]), /option/);
  for (const args of [["--apply", "--apply"], ["--proposal", "input"], ["--accepted-revision", f.committed], ["--content-db"]]) assert.throws(() => checkOverlayArguments(args));
  const common = ["--data-root", f.root, "--rules-db", f.rulesPath, "--content-db", f.contentPath];
  const report = path.join(f.root, "dice-handoffs/issue-529/reject");
  // The real maintained entry cannot accept this successful synthetic QA or a proposal.
  assert.throws(() => runCityscapeOverlay([...common, "--report-dir", report, "--apply"]), /Command failed/);
  assert(!fs.existsSync(report));
  assert.throws(() => runCityscapeOverlay([...common, "--report-dir", f.book]), /belong/);
  const alias = path.join(temp, "content-alias.sqlite"); fs.linkSync(f.contentPath, alias);
  assert.throws(() => runCityscapeOverlay([...common, "--report-dir", report]), /hard-link/);
  fs.unlinkSync(alias);
  const wrong = path.join(temp, "app-fixture.sqlite"), app = new Database(wrong); app.exec("CREATE TABLE User(id TEXT)"); app.close();
  assert.throws(() => runCityscapeOverlay(["--data-root", f.root, "--rules-db", f.rulesPath, "--content-db", wrong, "--report-dir", report]), /app-state/);
  assert(run().complete);
  console.log(JSON.stringify({suite: "Cityscape overlay portable", targets: 8, rollback: true, committedResume: true,
    ftsFailureResume: true, repeatUnchanged: true, protectedState: true,
    elapsedMs: Math.round(performance.now() - started), peakRssMiB: process.resourceUsage().maxRSS / 1024,
    syntheticDbBytes: fs.statSync(f.contentPath).size}));
} finally {db?.close(); fs.rmSync(temp, {recursive: true, force: true});}
