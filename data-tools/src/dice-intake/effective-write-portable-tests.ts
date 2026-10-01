import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repoRoot } from "../shared/env";
import { fieldProvenanceMigration, writeEffectiveOverlay } from "./effective-writer";
import { syntheticProjection, projectSynthetic, syntheticIndependent } from "./effective-portable-tests";

const root = repoRoot();
const baseline = "a".repeat(40);
const rows = syntheticProjection.output;
const migrationsRoot = join(root, "server/db/content/migrations");
function seed(db: Database.Database, legacy = false) {
  for (const migration of readdirSync(migrationsRoot).sort()) {
    if (legacy && migration === fieldProvenanceMigration) continue;
    if (migration !== "migration_lock.toml") db.exec(readFileSync(join(migrationsRoot, migration, "migration.sql"), "utf8"));
  }
  // Unused normalized columns are seeded by the real schema, not a fake writer table.
  const insert = db.prepare(`INSERT INTO SpellContent (id, legacySpellId, canonicalName, slug, sourceRulebookId,
    descriptionText, descriptionHash, addedAt) VALUES (?, ?, 'Synthetic English', ?, 10, 'Protected English', 'fixture', CURRENT_TIMESTAMP)`);
  for (const row of rows) insert.run(`spell:${row.targetId}`, row.targetId, `fixture-${row.targetId}`);
  db.exec(`INSERT INTO RulesContentBuild (id, generatorVersion, spellCount, issueCount, sourceSha256, parentRepoCommit, buildMetaJson)
    VALUES ('old-full', 'fixture', 5, 0, 'old-hash', 'old-commit', '{"artifact":{"scope":"full"}}');
    INSERT INTO I18nSpellText (id, spellId, rulebookId, lang, variant, name, descriptionText, sourceKey, updatedAt)
    VALUES ('chm:1', 1, 10, 'zh', 'chm', '原名', '原文', 'chm:1', CURRENT_TIMESTAMP),
      ('other:1', 1, 10, 'zh', 'other', '其他', '其他正文', 'other:1', CURRENT_TIMESTAMP),
      ('outside', 99, 99, 'zh', 'effective', '外书', '外书正文', 'outside', CURRENT_TIMESTAMP);
    INSERT INTO I18nSpellSummaryText (id, spellId, rulebookId, lang, summaryText, updatedAt)
    VALUES ('summary:1', 1, 10, 'zh', '保留摘要', CURRENT_TIMESTAMP);`);
}
const overlays = (db: Database.Database) => db.prepare("SELECT * FROM I18nSpellText WHERE rulebookId=10 AND variant='effective' ORDER BY spellId").all();
const dump = (db: Database.Database) => db.serialize();
const db = new Database(":memory:");
try {
  seed(db, true);
  const before = dump(db);
  const plan = writeEffectiveOverlay(db, rows, baseline, true);
  assert.deepEqual(dump(db), before, "dry-run must not migrate or mutate metadata");
  assert.equal(plan.migrate, true);
  assert.equal(plan.inserts, 5);
  // An actual SQLite trigger fails after earlier rows have been written.
  db.exec(`CREATE TRIGGER fail_middle BEFORE INSERT ON I18nSpellText
    WHEN NEW.variant='effective' AND NEW.spellId=3 BEGIN SELECT RAISE(ABORT, 'middle failure'); END`);
  const triggered = dump(db);
  assert.throws(() => writeEffectiveOverlay(db, rows, baseline, false), /middle failure/);
  assert.deepEqual(dump(db), triggered, "schema, overlay and build marker all roll back");
  db.exec("DROP TRIGGER fail_middle");
  db.exec(`CREATE TRIGGER fail_metadata BEFORE DELETE ON RulesContentBuild BEGIN SELECT RAISE(ABORT, 'metadata failure'); END`);
  const metadataTriggered = dump(db);
  assert.throws(() => writeEffectiveOverlay(db, rows, baseline, false), /metadata failure/);
  assert.deepEqual(dump(db), metadataTriggered, "failure after all overlay rows still rolls everything back");
  db.exec("DROP TRIGGER fail_metadata");
  const original = db.prepare("SELECT id, spellId, name, descriptionText, sourceKey, createdAt, updatedAt FROM I18nSpellText").all();
  const protectedTables = ["SpellContent", "SpellAppearance", "RulebookContent", "SpellComponent", "SpellListEntry",
    "SpellTaxonomyFacet", "SpellMechanicFacet", "RulesContentIssue", "I18nSpellSummaryText", "SpellSearchIndexState", "SpellSearchDocument"];
  const snapshot = () => protectedTables.map(table => db.prepare(`SELECT * FROM "${table}"`).all());
  const protectedBefore = snapshot();
  assert.deepEqual(writeEffectiveOverlay(db, rows, baseline, false), plan);
  assert.deepEqual(snapshot(), protectedBefore);
  for (const old of original as Array<{ id: string }>) assert.deepEqual(db.prepare(`SELECT id, spellId, name, descriptionText,
    sourceKey, createdAt, updatedAt FROM I18nSpellText WHERE id=?`).get(old.id), old);
  const stored = overlays(db) as Array<Record<string, unknown>>;
  for (const [index, row] of rows.entries()) {
    assert.equal(stored[index]!.name, row.name.text);
    assert.equal(stored[index]!.descriptionText, row.body.text);
    assert.equal(stored[index]!.descriptionHtml, row.body.html);
    for (const field of ["name", "body"] as const) {
      const p = JSON.parse(stored[index]![`${field}ProvenanceJson`] as string);
      assert.deepEqual(p.origin, row[field].origin);
      assert.equal(p.acceptedRevision, baseline);
      assert.equal(p.targetId, row.targetId);
      assert.equal(p.field, field);
      assert.equal(p.language, row[field].origin.kind === "english" ? "en" : "zh");
      assert.equal(p.input.targetId, row.targetId);
    }
  }
  assert.equal(stored[0]!.sourceKey, null, "mixed provenance must not claim one source");
  assert.equal(stored[2]!.sourceKey, "chm:3");
  assert.equal(stored[3]!.sourceKey, null, "English fallback is explicit");
  const meta = db.prepare("SELECT * FROM RulesContentBuild").get() as Record<string, unknown>;
  assert.equal(meta.sourceKind, "dice-effective-experiment");
  for (const col of ["sourceSha256", "rulesDbSha256", "migrationSetSha256", "parentRepoCommit", "dataRepoCommit"]) assert.equal(meta[col], null);
  assert.equal(JSON.parse(meta.buildMetaJson as string).artifact.importable, false);
  const after = dump(db);
  const repeat = writeEffectiveOverlay(db, rows, baseline, false);
  assert.equal(repeat.inserts + repeat.updates, 0);
  assert.equal(repeat.unchanged, 5);
  assert.equal(repeat.markExperiment, false);
  assert.deepEqual(dump(db), after, "repeat leaves values, timestamps and metadata unchanged");
  const altered = structuredClone(rows); altered[0]!.name.text = "Different synthetic name";
  const updatePlan = writeEffectiveOverlay(db, altered, baseline, true);
  assert.equal(updatePlan.updates, 1);
  assert.deepEqual(writeEffectiveOverlay(db, altered, baseline, false), updatePlan);
  // Validation errors occur before the writer. Use the same pure validation as
  // preflight; actual source/revision/PDF rejection cases are covered by the CLI.
  for (const reviews of [[syntheticIndependent, syntheticIndependent],
    [{ ...syntheticIndependent, status: "deferred" as const }],
    [{ ...syntheticIndependent, input: { ...syntheticIndependent.input,
      chinese: { ...syntheticIndependent.input.chinese, name: "stale" } } }]]) {
    const prior = dump(db);
    assert.throws(() => writeEffectiveOverlay(db, projectSynthetic(reviews).output, baseline, false), /duplicate|unaccepted|Chinese/);
    assert.deepEqual(dump(db), prior);
  }
  for (const broken of [rows.slice(1), [...rows, rows[0]!]]) {
    const prior = dump(db);
    assert.throws(() => writeEffectiveOverlay(db, broken, baseline, false), /exactly|duplicate/);
    assert.deepEqual(dump(db), prior);
  }
} finally { db.close(); }

// Exercise the actual maintained CHM importer on a fully migrated synthetic DB.
// No source path/default operator DB is used. It erases a previously applied
// effective variant, so a complete CHM import must precede this writer.
const scratch = mkdtempSync(join(tmpdir(), "dice-effective-chm-order-"));
try {
  const path = join(scratch, "content.sqlite");
  const fixture = new Database(path); seed(fixture); writeEffectiveOverlay(fixture, rows, baseline, false); fixture.close();
  const matched = join(scratch, "matched.json");
  writeFileSync(matched, JSON.stringify(rows.map(row => ({ spellId: row.targetId, rulebookId: 10,
    sourceKey: `chm:${row.targetId}`, zhName: "原名", enName: "Synthetic", zhDescriptionHtml: "<p>原文</p>" }))), "utf8");
  execFileSync(process.execPath, ["--conditions=source", "--import", "tsx", join(root, "server/scripts/import-zh-chm.ts"), matched],
    { cwd: join(root, "server"), env: { ...process.env, CONTENT_DATABASE_URL: `file:${path.replace(/\\/g, "/")}` }, stdio: "pipe" });
  const check = new Database(path);
  try {
    assert.equal(overlays(check).length, 0, "real later CHM import erases effective rows");
    assert.equal((check.prepare("SELECT count(*) AS n FROM I18nSpellText WHERE lang='zh' AND variant='chm'").get() as { n: number }).n, 5);
    writeEffectiveOverlay(check, rows, baseline, false);
    assert.equal(overlays(check).length, 5, "CHM then overlay restores the complete projection");
  } finally { check.close(); }
} finally { rmSync(scratch, { recursive: true }); }
console.log("effective writer portable tests passed (tracked old/new migrations, transaction rollback, repeat, provenance, real CHM order)");
