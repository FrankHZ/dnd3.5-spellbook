import assert from 'node:assert/strict';
import type Database from 'better-sqlite3';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {importGenerated, GENERATED_TABLES, type RulesContentImportContext} from '../rules-content/cli';
import {requireNormalizedArtifactState} from '../rules-content/import-step';
import type {NormalizedRulesContent} from '../rules-content/normalize';
import {planFinalOverlay, applyFinalOverlay, validateFinalOverlay, verifyFullNormalized,
  finalScSummaryRevision, finalScSummaryCandidate, type FinalField} from './final-writer';
import type {SummaryRow} from '../short-desc/summary-row-schema';

type Pair = {description: string; descriptionHtml: string};
type Patch = {id: number; expected: {spell: Pair}; spell: Pair};
type Report = Record<string, unknown> & {sourceRevisions: Record<string, string>};

/** The owning entry authenticates the fixed source candidate/acceptance before
 * calling this internal primitive. No general annotated replacement is allowed. */
export function comparePrismaticArtifacts(previous: NormalizedRulesContent, next: NormalizedRulesContent, patch: Patch) {
  assert.equal(patch.id, 3958);
  assert.deepEqual(Object.keys(patch.spell).sort(), ['description', 'descriptionHtml']);
  assert.deepEqual(Object.keys(patch.expected.spell).sort(), ['description', 'descriptionHtml']);
  assert.equal(patch.expected.spell.description.split('h4. PRISMATIC RAY\n\n').length, 2);
  assert.equal(patch.spell.description, patch.expected.spell.description.replace('h4. PRISMATIC RAY\n\n', ''));
  const heading = '<h4><span class="caps">PRISMATIC</span> <span class="caps">RAY</span></h4>';
  assert.equal(patch.expected.spell.descriptionHtml.split(heading).length, 2);
  assert.equal(patch.spell.descriptionHtml, patch.expected.spell.descriptionHtml.replace(heading, ''));
  const old = previous.spells.filter(row => row.legacySpellId === 3958);
  assert.equal(old.length, 1); assert.equal(old[0]!.sourceRulebookId, 86);
  assert.equal(old[0]!.descriptionText, patch.expected.spell.description);
  assert.equal(old[0]!.descriptionHtml, patch.expected.spell.descriptionHtml);
  const changed = next.spells.filter(row => row.legacySpellId === 3958);
  assert.equal(changed.length, 1);
  const expected = structuredClone(old[0]!);
  expected.descriptionText = patch.spell.description;
  expected.descriptionHtml = patch.spell.descriptionHtml;
  expected.descriptionHash = createHash('sha256').update(patch.spell.descriptionHtml).digest('hex');
  const raw = JSON.parse(expected.rawJson);
  assert.equal(raw.description, patch.expected.spell.description);
  assert.equal(raw.descriptionHtml, patch.expected.spell.descriptionHtml);
  raw.description = patch.spell.description; raw.descriptionHtml = patch.spell.descriptionHtml;
  // normalizeRulesContent serializes rawJson using sorted top-level keys.
  expected.rawJson = JSON.stringify(Object.fromEntries(Object.entries(raw).sort(([a], [b]) => a.localeCompare(b))));
  assert.deepEqual(changed[0], expected, 'unlisted normalized Prismatic Ray change');
  const rebound = structuredClone(next);
  rebound.spells = next.spells.map(row => row.legacySpellId === 3958 ? old[0]! : row);
  // The new genuine generation owns only its timestamp and provenance changes.
  rebound.generatedAt = previous.generatedAt;
  assert(previous.artifact && rebound.artifact);
  rebound.artifact.provenance = previous.artifact.provenance;
  assert.deepEqual(rebound, previous, 'English title upgrade changes unrelated normalized fields');
}

export function prismaticRayUpgrade(db: Database.Database, previous: NormalizedRulesContent,
  next: NormalizedRulesContent, previousPath: string, nextPath: string, patch: Patch,
  fields: FinalField[], report: Report, summaries: SummaryRow[], helper: string,
  context: RulesContentImportContext, requireInputs: () => void, mode: 'check' | 'apply' = 'check',
  afterWrite: () => void = () => {}) {
  assert(mode === 'check' || mode === 'apply'); assert(!db.inTransaction, 'English title upgrade owns its transaction');
  comparePrismaticArtifacts(previous, next, patch);
  const bytes = [fs.readFileSync(previousPath), fs.readFileSync(nextPath)];
  const priorReport = structuredClone(report);
  for (const key of ['englishTitleCandidate', 'englishTitleAcceptance']) {
    assert.match(report.sourceRevisions[key] ?? '', /^[a-f0-9]{40}$/, 'missing authenticated English title authority');
    delete priorReport.sourceRevisions[key];
  }
  const checkInputs = () => {
    requireInputs();
    assert(fs.readFileSync(previousPath).equals(bytes[0]!) && fs.readFileSync(nextPath).equals(bytes[1]!),
      'English title normalized inputs changed');
  };
  const inspect = () => {
    checkInputs();
    importGenerated(db, next, true, nextPath, context);
    const build = db.prepare('SELECT buildMetaJson FROM RulesContentBuild').get() as {buildMetaJson: string};
    const meta = JSON.parse(build.buildMetaJson), overlay = meta.overlays?.scFinalNameBody;
    assert(overlay, 'English title upgrade requires accepted annotated predecessor');
    assert.equal(overlay.summaryQa?.acceptedRevision, finalScSummaryRevision, 'accepted 6837 summary authority required');
    assert.equal(overlay.summaryQa?.candidateRevision, finalScSummaryCandidate);
    const after = Object.hasOwn(overlay.sourceRevisions, 'englishTitleCandidate') ||
      Object.hasOwn(overlay.sourceRevisions, 'englishTitleAcceptance');
    const content = after ? next : previous, inputPath = after ? nextPath : previousPath;
    // The prior genuine generation is validated against its original importer,
    // while the new artifact is checked against current patched rules provenance.
    requireNormalizedArtifactState(db, content, inputPath);
    const full = verifyFullNormalized(db, content, inputPath, after ? context.currentProvenance : meta.importer.current);
    const plan = planFinalOverlay(db, fields, after ? report : priorReport, full, overlay.helperRevision, summaries);
    assert.equal(plan.migrate, false); assert.equal(plan.inserts + plan.updates, 0, 'English upgrade cannot repair final fields');
    validateFinalOverlay(db, plan);
    return {state: after ? 'after' as const : 'before' as const, overlays: meta.overlays};
  };
  const initial = db.transaction(inspect)();
  const result = (state: 'before' | 'after', changed = false) => ({mode, state, changed, wouldChange: state === 'before'});
  if (mode === 'check' || initial.state === 'after') return result(initial.state);
  assert(!db.readonly, 'Apply requires writable content');
  return db.transaction(() => {
    const before = inspect(); if (before.state === 'after') return result('after');
    const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
    const protectedState = () => (db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all() as {name: string}[])
      .filter(({name}) => !(GENERATED_TABLES as readonly string[]).includes(name)).map(({name}) => {
        const cols = (db.pragma(`table_info(${quote(name)})`) as {name: string}[]).map(row => quote(row.name));
        return {name, rows: db.prepare(`SELECT ${cols.map(c => `CASE WHEN typeof(${c})='text' THEN CAST(${c} AS BLOB) ELSE ${c} END`).join(',')}
          FROM ${quote(name)} ORDER BY ${cols.join(',')}`).safeIntegers().raw().all()};
      });
    const schema = db.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all(), protectedBefore = protectedState();
    importGenerated(db, next, false, nextPath, context);
    const full = verifyFullNormalized(db, next, nextPath, context.currentProvenance);
    // Reattach the exact accepted predecessor envelope before deriving its new
    // source binding; no Chinese row or summary is written by this upgrade.
    full.meta.overlays = before.overlays;
    const plan = planFinalOverlay(db, fields, report, full, helper, summaries);
    assert.equal(plan.inserts + plan.updates, 0); assert.equal(plan.migrate, false);
    applyFinalOverlay(db, plan);
    afterWrite(); checkInputs(); inspect();
    assert.deepEqual(protectedState(), protectedBefore, 'English title upgrade changed protected tables');
    assert.deepEqual(db.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all(), schema, 'English title upgrade changed schema');
    return result('after', true);
  }).immediate();
}
