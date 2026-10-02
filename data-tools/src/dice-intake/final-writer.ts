import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import { applyOverlayRows, overlayColumns, type OverlayRow } from "./effective-writer";
import { assertImportableRulesContentArtifact, sha256File, verifyRulesContentArtifactProvenance,
  type RulesContentArtifactProvenance } from "../rules-content/artifact";
import type { NormalizedRulesContent } from "../rules-content/normalize";
import type { FieldOrigin } from "./effective";
import type { SummaryRow } from "../short-desc/summary-row-schema";

export const finalScRevision = "0688739d92a2aa9fb3eceeb444daa7260e711058";
export const finalScNoteRevision = "c61b9dea676cfd89bdfcaa6dcbcccbc99280d7c4";
export const finalScSummaryRevision = "0b6fd8b88c1609cfdae50d8943d77eda13750ea8";
export const finalScSummaryCandidate = "c4fe0c0a7b14aafed04bc9e733387afb51ae45eb";
export const finalScSummaryPath = "short-desc-normalized/summaries.generated.jsonl";
export type FinalField = { targetId: number; rulebookId: number; field: "name" | "body";
  text: string; html?: string | null; origin: FieldOrigin; review: Record<string, unknown>;
  readerNoteAddendum?: {revision: string; path: string; rowRef: string; amendment: Record<string, unknown>} };
const tables = { RulebookContent: "rulebooks", SpellContent: "spells", SpellAppearance: "appearances",
  SpellTaxonomyFacet: "taxonomyFacets", SpellListEntry: "listEntries", SpellComponent: "components",
  SpellMechanicFacet: "mechanicFacets", RulesContentIssue: "issues" } as const;

/** Compare every normalized value, not just IDs/counts. i18n overlays are separate. */
export function verifyFullNormalized(db: Database.Database, content: NormalizedRulesContent,
  inputPath: string, current: RulesContentArtifactProvenance) {
  assertImportableRulesContentArtifact(content);
  verifyRulesContentArtifactProvenance(content.artifact.provenance, current);
  for (const [table, key] of Object.entries(tables)) {
    const expected = content[key as typeof tables[keyof typeof tables]];
    const rows = expected as Array<Record<string, unknown>>;
    const columns = rows.length ? Object.keys(rows[0]!) : [];
    const actual = db.prepare(`SELECT ${columns.length ? columns.map(c => `"${c}"`).join(',') : '*'} FROM "${table}"`).all();
    const stable = (values: unknown[]) => values.map(row => JSON.stringify(Object.fromEntries(
      Object.entries(row as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, typeof v === 'boolean' ? Number(v) : v ?? null])))).sort();
    assert.deepEqual(stable(actual), stable(rows), `full normalized values differ: ${table}`);
  }
  const builds = db.prepare('SELECT * FROM RulesContentBuild').all() as Array<Record<string, unknown>>;
  assert.equal(builds.length, 1, 'require one genuine full normalized build');
  const build = builds[0]!;
  const generation = content.artifact.provenance;
  const expected = {id: `rules-content:${content.generatedAt}`, sourceKind: 'rules-clean',
    sourceSha256: sha256File(inputPath), generatorVersion: content.generatorVersion, generatedAt: content.generatedAt,
    spellCount: content.counts.spells, issueCount: content.counts.issues,
    parentRepoCommit: generation.parentRepo.commit, dataRepoCommit: generation.dataRepo?.commit ?? null,
    rulesManifestSha256: generation.canonicalInputs.rulesManifest?.sha256 ?? null,
    rulesDbSha256: generation.rulesDb.sha256, migrationSetSha256: generation.contentMigrations.sha256};
  for (const [key, value] of Object.entries(expected)) assert.equal(build[key], value, `stale full build: ${key}`);
  const meta = JSON.parse(String(build.buildMetaJson));
  assert.equal(meta.schema, 'rules-content-build-meta.v2');
  assert.equal(meta.artifact.scope, 'full');
  assert.deepEqual(meta.artifact.generation, generation, 'generation provenance differs');
  assert.deepEqual(meta.artifact.sourceTotals, content.artifact.sourceTotals);
  assert.equal(meta.importer.generatedInputSha256, expected.sourceSha256);
  verifyRulesContentArtifactProvenance(generation, meta.importer.current);
  return {build, meta};
}

function persistedField(value: FinalField) {
  return JSON.stringify({schemaVersion: 1, acceptedRevision: finalScRevision,
    targetId: value.targetId, field: value.field, language: 'zh', origin: value.origin,
    input: {revision: finalScRevision, path: 'dice-qa/books/86/issue-365/field-dispositions.jsonl',
      targetId: value.targetId, field: value.field}, evidence: value.review, review: value.review,
    ...(value.readerNoteAddendum ? {readerNoteAddendum: value.readerNoteAddendum} : {})});
}

function verifyAcceptedSummaries(db: Database.Database, acceptedSummaries: SummaryRow[]) {
  assert(acceptedSummaries.length > 0, 'empty accepted summary inventory');
  const expected = new Map(acceptedSummaries.map(row => [row.id, row]));
  assert.equal(expected.size, acceptedSummaries.length, 'duplicate accepted summary key');
  const actual = db.prepare('SELECT * FROM I18nSpellSummaryText').all() as Array<Record<string, unknown>>;
  assert.equal(actual.length, expected.size, 'accepted summary inventory differs');
  const columns = ['id', 'spellId', 'rulebookId', 'lang', 'variant', 'summaryText',
    'sourceKey', 'sourceName', 'sourceKind', 'reviewStatus'] as const;
  for (const row of actual) {
    const next = expected.get(String(row.id));
    assert(next, 'extra/missing accepted summary key');
    for (const column of columns) assert.equal(row[column], next[column], 'accepted summary column differs: ' + column);
  }
}

/** Internal SQL primitive. The maintained entry derives these fields through
 * complete source QA/PDF verification; no caller projection file is accepted. */
export function planFinalOverlay(db: Database.Database, fields: FinalField[], sourceReport: Record<string, unknown>,
  full: ReturnType<typeof verifyFullNormalized>, helperRevision: string, acceptedSummaries?: SummaryRow[]) {
  assert.match(helperRevision, /^[0-9a-f]{40}$/);
  const names = fields.filter(f => f.field === 'name'), bodies = new Map(fields.filter(f => f.field === 'body').map(f => [f.targetId, f]));
  assert.equal(fields.length, names.length * 2, 'duplicate/missing field');
  assert.equal(bodies.size, names.length, 'duplicate/missing body');
  const ids = names.map(f => f.targetId).sort((a, b) => a - b);
  assert.equal(new Set(ids).size, ids.length, 'duplicate name');
  assert.deepEqual(ids, (db.prepare('SELECT legacySpellId AS id FROM SpellContent WHERE sourceRulebookId=86 ORDER BY legacySpellId')
    .all() as Array<{id: number}>).map(r => r.id), 'exact final SC scope differs');
  const schema = new Set((db.prepare('PRAGMA table_info(I18nSpellText)').all() as Array<{name: string}>).map(r => r.name));
  const migrate = !schema.has('nameProvenanceJson');
  assert.equal(schema.has('bodyProvenanceJson'), !migrate, 'partial provenance schema');
  const existing = db.prepare(`SELECT spellId,${overlayColumns.map(c => schema.has(c) ? c : `NULL AS ${c}`).join(',')}
    FROM I18nSpellText WHERE lang='zh' AND variant='effective'`).all() as Array<Record<string, unknown>>;
  assert(existing.filter(r => r.rulebookId === 86).every(r => ids.includes(Number(r.spellId))), 'extra SC effective target');
  const previous = new Map(existing.map(r => [Number(r.spellId), r]));
  const rows: OverlayRow[] = names.sort((a, b) => a.targetId - b.targetId).map(name => {
    const body = bodies.get(name.targetId)!;
    for (const field of [name, body]) if (field.readerNoteAddendum) {
      assert.equal(field.field, 'body', 'reader note belongs to body');
      assert.equal(field.readerNoteAddendum.revision, finalScNoteRevision, 'unsupported reader-note revision');
      assert.equal(field.readerNoteAddendum.path, 'dice-qa/books/86/issue-407/amendments.jsonl');
      assert([4088, 4111, 4229].includes(field.targetId), 'unsupported reader-note target');
    }
    assert(name.rulebookId === 86 && body.rulebookId === 86 && name.text && body.text && body.html,
      'incomplete final Chinese field');
    assert(name.origin.kind !== 'english' && body.origin.kind !== 'english', 'unreviewed final fallback');
    const sourceKey = !name.origin.activeAmendment && !body.origin.activeAmendment && name.origin.kind === body.origin.kind
      && name.origin.sourceKey === body.origin.sourceKey ? name.origin.sourceKey : null;
    const values = {spellId: name.targetId, rulebookId: 86, name: name.text, descriptionText: body.text,
      descriptionHtml: body.html, sourceKey, nameProvenanceJson: persistedField(name), bodyProvenanceJson: persistedField(body)};
    const old = previous.get(name.targetId);
    assert(!old || old.rulebookId === 86, 'effective target belongs to another book');
    return {...values, action: !old ? 'insert' : overlayColumns.every(c => old[c] === values[c]) ? 'unchanged' : 'update'};
  });
  // The maintained entry authenticates these complete rows against fixed Git inputs.
  // Check every parser column and the entire inventory, including protected books.
  // Timestamps are importer-owned and intentionally excluded from this matching boundary.
  let summaryQa;
  if (acceptedSummaries) {
    verifyAcceptedSummaries(db, acceptedSummaries);
    summaryQa = {schema: 'sc-final-summary.v1', acceptedRevision: finalScSummaryRevision,
      candidateRevision: finalScSummaryCandidate, path: finalScSummaryPath,
      scope: 'present-canonical-sc-summaries', canonicalRows: acceptedSummaries.length,
      scRows: acceptedSummaries.filter(row => row.rulebookId === 86).length};
  }
  const overlay = {schema: 'sc-final-name-body.v1', acceptedRevision: finalScRevision, helperRevision,
    sourceRevisions: sourceReport.sourceRevisions, targets: rows.length, fields: fields.length,
    changedNames: sourceReport.changedNames, changedBodies: sourceReport.changedBodies,
    retained: sourceReport.retained, sourceQuestionIds: sourceReport.sourceQuestionIds,
    ...(sourceReport.readerNoteAddendum ? {readerNoteAddendum: sourceReport.readerNoteAddendum} : {}),
    ...(summaryQa ? {summaryQa} : {}),
    semanticQa: {nameBody: 'accepted-source-bound', summaries: summaryQa ? 'accepted-source-bound' : 'pending', extraRelationships: 'pending',
      wholeBookComplete: false}, search: 'rebuild-after-final-text-and-summaries', activation: false};
  // Preserve exact generation/importer provenance, adding only the accepted overlay.
  const buildMetaJson = JSON.stringify({...full.meta, overlays: {...full.meta.overlays, scFinalNameBody: overlay}});
  return {migrate, targets: rows.length, inserts: rows.filter(r => r.action === 'insert').length,
    updates: rows.filter(r => r.action === 'update').length, unchanged: rows.filter(r => r.action === 'unchanged').length,
    markBuild: full.build.buildMetaJson !== buildMetaJson, buildId: String(full.build.id), buildMetaJson, rows,
    acceptedSummaries};
}

export function applyFinalOverlay(db: Database.Database, plan: ReturnType<typeof planFinalOverlay>,
  afterWrite: () => void = () => {}) {
  applyOverlayRows(db, plan.rows, plan.migrate, () => {
    if (plan.markBuild) db.prepare('UPDATE RulesContentBuild SET buildMetaJson=? WHERE id=?').run(plan.buildMetaJson, plan.buildId);
    // A validator/fault here rolls back every row and the metadata together.
    afterWrite();
    validateFinalOverlay(db, plan);
  });
}

export function validateFinalOverlay(db: Database.Database, plan: ReturnType<typeof planFinalOverlay>) {
  if (plan.acceptedSummaries) verifyAcceptedSummaries(db, plan.acceptedSummaries);
  const rows = db.prepare(`SELECT spellId,${overlayColumns.join(',')} FROM I18nSpellText
    WHERE lang='zh' AND variant='effective' AND rulebookId=86 ORDER BY spellId`).all();
  assert.deepEqual(rows, plan.rows.map(({action: _action, ...row}) => row), 'persisted final fields/provenance differ');
  const build = db.prepare('SELECT buildMetaJson FROM RulesContentBuild WHERE id=?').get(plan.buildId) as {buildMetaJson: string};
  assert.equal(build.buildMetaJson, plan.buildMetaJson, 'persisted final build differs');
}
