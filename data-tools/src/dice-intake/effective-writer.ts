import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { repoRoot } from "../shared/env";
import type { EffectiveChinese, FieldOrigin } from "./effective";

const handoff = "dice-qa/books/86/issue-311/batch-06";
export const fieldProvenanceMigration = "20261001233000_add_spell_field_provenance";
const columns = ["rulebookId", "name", "descriptionText", "descriptionHtml", "sourceKey",
  "nameProvenanceJson", "bodyProvenanceJson"] as const;

function provenance(row: EffectiveChinese, field: "name" | "body", acceptedRevision: string) {
  const origin = row[field].origin;
  const acceptedField = field === "name" ? "name" : origin.kind === "native" ? "descriptionHtml" : "descriptionText";
  const locator = { targetId: row.targetId, field: acceptedField, sourceKey: origin.sourceKey };
  return JSON.stringify({ schemaVersion: 1, acceptedRevision, targetId: row.targetId, field,
    language: origin.kind === "english" ? "en" : "zh", origin,
    input: origin.kind === "native" || origin.kind === "independent"
      ? { path: `${handoff}/${origin.kind}-accepted.jsonl`, ...locator }
      : { path: `${handoff}/current-inputs.json`, targetId: row.targetId,
          field: origin.kind === "english" ? `english.${field === "name" ? "name" : "description"}`
            : `chinese.${field === "name" ? "name" : "descriptionText"}` },
    evidence: origin.kind === "native"
      ? { path: "dice-qa/books/86/issue-259/fresh-qa/supplemental-pdf-evidence.json", ...locator }
      : origin.kind === "chm"
        ? { table: "I18nSpellText", spellId: row.targetId, lang: "zh", variant: "chm", sourceKey: origin.sourceKey }
        : origin.kind === "english" ? { table: "dnd_spell", id: row.targetId,
            field: field === "name" ? "name" : "description" } : { sourceRef: origin.sourceRef, pages: origin.sourcePages } });
}

function rowSource(name: FieldOrigin, body: FieldOrigin) {
  return name.kind === body.kind && name.sourceKey !== null && name.sourceKey === body.sourceKey
    ? name.sourceKey : null;
}

/** Internal storage primitive for the already verified pure projection. Only
 * effective-write-cli exposes a write entry, and always re-runs source preflight.
 * Portable tests use this same real SQL writer on synthetic databases. */
export function writeEffectiveOverlay(db: Database.Database, projection: EffectiveChinese[],
  acceptedRevision: string, dryRun: boolean) {
  assert(/^[0-9a-f]{40}$/.test(acceptedRevision), "accepted revision must be an exact commit");
  assert(projection.length > 0, "empty overlay");
  const book = projection[0]!.rulebookId;
  const ids = projection.map(row => row.targetId).sort((a, b) => a - b);
  assert.equal(new Set(ids).size, ids.length, "duplicate overlay target");
  assert(projection.every(row => row.rulebookId === book), "overlay book mismatch");
  const normalizedIds = (db.prepare("SELECT legacySpellId AS id FROM SpellContent WHERE sourceRulebookId=? ORDER BY legacySpellId")
    .all(book) as Array<{ id: number }>).map(row => row.id);
  assert.deepEqual(ids, normalizedIds, "overlay must cover exactly the existing normalized book targets");
  const schema = new Set((db.prepare("PRAGMA table_info(I18nSpellText)").all() as Array<{ name: string }>).map(row => row.name));
  const migrate = !schema.has("nameProvenanceJson");
  assert.equal(schema.has("bodyProvenanceJson"), !migrate, "partial field provenance migration");
  const existing = db.prepare(`SELECT spellId, ${columns.map(col => schema.has(col) ? col : `NULL AS ${col}`).join(", ")}
    FROM I18nSpellText WHERE lang='zh' AND variant='effective'`).all() as Array<Record<string, unknown>>;
  assert(existing.filter(row => row.rulebookId === book).every(row => ids.includes(Number(row.spellId))), "unexpected effective target");
  const previous = new Map(existing.map(row => [Number(row.spellId), row]));
  const rows = projection.map(row => {
    const values = { spellId: row.targetId, rulebookId: row.rulebookId, name: row.name.text,
      descriptionText: row.body.text, descriptionHtml: row.body.html,
      sourceKey: rowSource(row.name.origin, row.body.origin),
      nameProvenanceJson: provenance(row, "name", acceptedRevision), bodyProvenanceJson: provenance(row, "body", acceptedRevision) };
    const old = previous.get(row.targetId);
    assert(!old || old.rulebookId === book, "effective target belongs to another book");
    return { ...values, action: !old ? "insert" : columns.every(col => old[col] === values[col]) ? "unchanged" : "update" };
  });
  const buildMetaJson = JSON.stringify({ schema: "dice-effective-experiment.v1", artifact: {
    scope: "limited", importable: false, activation: false,
    limitations: ["disposable SC overlay experiment", "search and consumers unvalidated", "full artifact provenance invalidated"] },
    acceptedRevision, rulebookId: book, targets: rows.length });
  const totals = db.prepare(`SELECT (SELECT count(*) FROM SpellContent) AS spellCount,
    (SELECT count(*) FROM RulesContentIssue) AS issueCount`).get() as { spellCount: number; issueCount: number };
  const experimentBuild = { id: "dice-effective-experiment", sourceKind: "dice-effective-experiment",
    generatorVersion: "dice-effective-experiment.v1", ...totals, buildMetaJson,
    sourceSha256: null, parentRepoCommit: null, dataRepoCommit: null, rulesManifestSha256: null,
    rulesDbSha256: null, migrationSetSha256: null };
  const builds = db.prepare("SELECT * FROM RulesContentBuild").all() as Array<Record<string, unknown>>;
  const markExperiment = builds.length !== 1 || Object.entries(experimentBuild)
    .some(([key, value]) => builds[0]![key] !== value);
  const plan = { migrate, markExperiment, targets: rows.length,
    inserts: rows.filter(row => row.action === "insert").length,
    updates: rows.filter(row => row.action === "update").length,
    unchanged: rows.filter(row => row.action === "unchanged").length, rows };
  if (dryRun) return plan;
  db.transaction(() => {
    if (migrate) db.exec(readFileSync(join(repoRoot(), "server/db/content/migrations", fieldProvenanceMigration, "migration.sql"), "utf8"));
    const insert = db.prepare(`INSERT INTO I18nSpellText
      (id, spellId, lang, variant, ${columns.join(", ")}, updatedAt)
      VALUES (@id, @spellId, 'zh', 'effective', ${columns.map(col => `@${col}`).join(", ")}, CURRENT_TIMESTAMP)`);
    const update = db.prepare(`UPDATE I18nSpellText SET ${columns.map(col => `${col}=@${col}`).join(", ")}, updatedAt=CURRENT_TIMESTAMP
      WHERE spellId=@spellId AND lang='zh' AND variant='effective'`);
    for (const row of rows) {
      if (row.action === "insert") insert.run({ ...row, id: `dice-effective:${book}:${row.spellId}` });
      if (row.action === "update") update.run(row);
    }
    if (markExperiment) {
      // Retire old full-build claims in this disposable copy. Keep no old hashes
      // or deployment-looking commits attached to the altered database.
      db.prepare("DELETE FROM RulesContentBuild").run();
      db.prepare(`INSERT INTO RulesContentBuild (id, sourceKind, generatorVersion, spellCount, issueCount, buildMetaJson)
        VALUES (@id, @sourceKind, @generatorVersion, @spellCount, @issueCount, @buildMetaJson)`).run(experimentBuild);
    }
  }).immediate();
  return plan;
}
