import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {prepareCloseoutOverlayFixture} from "./closeout-overlay-test-fixtures";
import {closeoutOverlayInput, closeoutRevision, diceCloseoutOverlay} from "./closeout-overlay";
import {runAcceptedOverlay} from "./accepted-overlay-cli";
import {AcceptedOverlayError} from "./accepted-overlay";
import {sequenceSnapshot} from "../db/content-sequence-test-fixtures";

const start = performance.now(), temp = fs.mkdtempSync(path.join(os.tmpdir(), "dice-closeout-overlay-"));
let db: Database.Database | undefined;
try {
  const f = prepareCloseoutOverlayFixture(temp);
  db = new Database(f.contentPath);
  const authenticate = () => f.authenticateCloseout(db!);
  const run = (mode: "check" | "apply" = "check", fault?: Parameters<typeof diceCloseoutOverlay>[3]) => diceCloseoutOverlay(db!, authenticate, mode, fault);
  const snapshot = () => sequenceSnapshot(db!);
  const initial = snapshot();
  assert.equal(run().state, "before"); assert.deepEqual(snapshot(), initial);
  const projected = closeoutOverlayInput(authenticate());
  assert.equal(projected.rows.length, 5);
  const byId = new Map(projected.rows.map(r => [r.spellId, r]));
  assert.equal(JSON.parse(byId.get(356)!.bodyProvenanceJson).origin.kind, "chm");
  assert(!JSON.parse(byId.get(356)!.bodyProvenanceJson).review);
  assert.equal(JSON.parse(byId.get(357)!.bodyProvenanceJson).origin.kind, "english");
  assert.equal(JSON.parse(byId.get(358)!.nameProvenanceJson).origin.kind, "english");
  assert.equal(JSON.parse(byId.get(358)!.bodyProvenanceJson).review.composition, "mixed");
  for (const mutate of [
    (e: ReturnType<typeof authenticate>) => e.fields.push({...e.fields[0]!, after: "conflict"}),
    (e: ReturnType<typeof authenticate>) => {e.fields[0]!.rulebookId = 86;},
    (e: ReturnType<typeof authenticate>) => {e.fields[0]!.after = "";},
    (e: ReturnType<typeof authenticate>) => {e.targets[0]!.english = {...e.targets[0]!.english, description: "stale English"};},
    (e: ReturnType<typeof authenticate>) => {e.targets[0]!.englishHtml = "<p>stale HTML</p>";},
  ]) {
    assert.throws(() => diceCloseoutOverlay(db!, () => {const e = authenticate(); mutate(e); return e;}, "apply"));
    assert.deepEqual(snapshot(), initial);
  }
  // SC target IDs remain forbidden even with a false non-SC book label.
  const guardBefore = snapshot();
  db.exec("UPDATE SpellContent SET sourceRulebookId=53 WHERE legacySpellId=4001");
  const scTampered = snapshot();
  assert.throws(() => diceCloseoutOverlay(db!, () => {
    const e = authenticate(), t = {...e.targets[0]!, targetId: 4001};
    e.targets = [t]; e.fields = [{...e.fields[0]!, targetId: 4001}]; return e;
  }, "apply"), /SC/);
  assert.deepEqual(snapshot(), scTampered);
  db.exec("UPDATE SpellContent SET sourceRulebookId=86 WHERE legacySpellId=4001");
  assert.deepEqual(snapshot(), guardBefore);
  db.exec("CREATE TRIGGER corrupt_sc AFTER INSERT ON I18nSpellText BEGIN UPDATE I18nSpellText SET name='bad' WHERE spellId=4001; END");
  const triggerBefore = snapshot();
  assert.throws(() => run("apply"), /protected rows/);
  assert.deepEqual(snapshot(), triggerBefore);
  db.exec("DROP TRIGGER corrupt_sc");
  assert.throws(() => run("apply", p => {if (p === "inside-overlay") throw Error("rollback");}), /rollback/);
  assert.deepEqual(snapshot(), initial);
  const sourceBefore = fs.readFileSync(f.decisions);
  assert.throws(() => run("apply", p => {if (p === "inside-overlay") fs.appendFileSync(f.decisions, "\n{}\n");}), /changed committed input/);
  fs.writeFileSync(f.decisions, sourceBefore); assert.deepEqual(snapshot(), initial);
  try {run("apply", p => {if (p === "after-overlay") throw Error("interrupt search");}); assert.fail();}
  catch (error) {assert(error instanceof AcceptedOverlayError); assert.equal(error.result.overlay, "committed");}
  assert.equal(run().searchCheck?.state, "stale");
  const overlays = db.prepare("SELECT * FROM I18nSpellText WHERE variant='effective' ORDER BY id").all();
  db.exec("CREATE TRIGGER broken_search BEFORE INSERT ON SpellSearchIndexState BEGIN SELECT RAISE(ABORT,'FTS failure'); END");
  const interrupted = snapshot();
  assert.throws(() => run("apply"), /FTS failure/); assert.deepEqual(snapshot(), interrupted);
  db.exec("DROP TRIGGER broken_search");
  const resumed = run("apply"); assert(resumed.complete); assert.equal(resumed.overlay, "no-op");
  assert.equal(resumed.search, "committed");
  assert.deepEqual(db.prepare("SELECT * FROM I18nSpellText WHERE variant='effective' ORDER BY id").all(), overlays);
  const after = snapshot(), repeat = run("apply");
  assert(repeat.complete); assert.equal(repeat.overlay, "no-op"); assert.equal(repeat.search, "no-op");
  assert.deepEqual(snapshot(), after);
  for (const token of ["uniquenametoken", "newbodytoken", "recoveredtoken", "nameonlytoken", "mixedbodytoken", "nativetoken", "retainedchmtoken"]) {
    assert((db.prepare("SELECT count(*) AS n FROM SpellSearchDocument WHERE SpellSearchDocument MATCH ?").get(token) as {n: number}).n > 0, token);
  }
  const old = db.prepare("SELECT * FROM I18nSpellText WHERE spellId=355 AND variant='effective'").get() as Record<string, any>;
  db.prepare("UPDATE I18nSpellText SET name='foreign' WHERE id=?").run(old.id);
  const drift = snapshot(); assert.throws(() => run("apply"), /overlay drift/); assert.deepEqual(snapshot(), drift);
  db.prepare("UPDATE I18nSpellText SET name=? WHERE id=?").run(old.name, old.id);
  db.exec("UPDATE SpellSearchDocument SET body='expiredtoken' WHERE spellId=355 AND variant='effective'");
  assert.equal(run("apply").search, "committed");
  assert.equal((db.prepare("SELECT count(*) AS n FROM SpellSearchDocument WHERE SpellSearchDocument MATCH 'expiredtoken'").get() as {n: number}).n, 0);
  // Real explicit-root entry uses the same readonly/open-writer/report path.
  // Only this synthetic test supplies an internal authenticator; the public CLI
  // exposes neither a proposal file nor an authentication override.
  const owner = {directory: "issue-587" as const, acceptedRevision: closeoutRevision,
    schema: "synthetic-closeout.v1", authenticate: (_root: string, _rules: Database.Database, content: Database.Database) => closeoutOverlayInput(f.authenticateCloseout(content))};
  const common = ["--data-root", f.root, "--rules-db", f.rulesPath, "--content-db", f.contentPath];
  const reportRoot = path.join(f.root, "dice-handoffs/issue-587");
  const cliBefore = snapshot(), cwd = process.cwd();
  try {
    process.chdir(temp);
    const checked = runAcceptedOverlay([...common, "--report-dir", path.join(reportRoot, "check")], owner);
    assert.equal(checked.complete, true); assert.equal(checked.scope?.acceptedNames, 4); assert.equal(checked.scope?.acceptedBodies, 3);
    assert.deepEqual(snapshot(), cliBefore);
    const repeated = runAcceptedOverlay([...common, "--report-dir", path.join(reportRoot, "repeat"), "--apply"], owner);
    assert.equal(repeated.overlay, "no-op"); assert.equal(repeated.search, "no-op"); assert.deepEqual(snapshot(), cliBefore);
    assert.throws(() => runAcceptedOverlay([...common, "--report-dir", path.join(reportRoot, "repeat")], owner), /fresh/);
    assert.throws(() => runAcceptedOverlay([...common, "--report-dir", f.book], owner), /belong/);
    assert.throws(() => runAcceptedOverlay([...common, "--proposal", f.evidenceFile, "--report-dir", path.join(reportRoot,"forged")], owner), /option/);
  } finally {process.chdir(cwd);}
  const pilotDir = path.join(temp, "cli-first-apply"); fs.mkdirSync(pilotDir);
  const pilot = prepareCloseoutOverlayFixture(pilotDir);
  const pilotOwner = {...owner, authenticate: (_root: string, _rules: Database.Database, content: Database.Database) => closeoutOverlayInput(pilot.authenticateCloseout(content))};
  const pilotArgs = ["--data-root", pilot.root, "--rules-db", pilot.rulesPath, "--content-db", pilot.contentPath];
  assert.equal(runAcceptedOverlay([...pilotArgs, "--report-dir", path.join(pilot.root,"dice-handoffs/issue-587/check")], pilotOwner).state, "before");
  const applied = runAcceptedOverlay([...pilotArgs, "--report-dir", path.join(pilot.root,"dice-handoffs/issue-587/apply"), "--apply"], pilotOwner);
  assert.equal(applied.overlay,"committed");assert.equal(applied.search,"committed");assert(applied.complete);
  console.log(JSON.stringify({suite: "non-SC closeout overlay", targets: 5, fields: 7, scProtected: true,
    rollback: true, resume: true, repeatUnchanged: true, actualFts: true,
    elapsedMs: Math.round(performance.now()-start), peakRssMiB: process.resourceUsage().maxRSS/1024}));
} finally {db?.close(); fs.rmSync(temp, {recursive: true, force: true});}
