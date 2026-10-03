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
 * calling this internal primitive. No general annotated replacement is allowed. The sourcePairs branch supports
 * only the fixed #461 transition from the accepted #434 predecessor. */
export function comparePrismaticArtifacts(previous: NormalizedRulesContent, next: NormalizedRulesContent, patch: Patch, sourcePairs = false) {
  const target = sourcePairs ? 3934 : 3958;
  assert.equal(patch.id, target);
  assert.deepEqual(Object.keys(patch.spell).sort(), ['description', 'descriptionHtml']);
  assert.deepEqual(Object.keys(patch.expected.spell).sort(), ['description', 'descriptionHtml']);
  if (sourcePairs) {
    for (const key of ['description', 'descriptionHtml'] as const) {
      const before = patch.expected.spell[key], after = patch.spell[key];
      const offset = key === 'description' ? 6 : 13;
      assert.equal(before.slice(offset, offset + 2), 'a ');
      assert.equal(after, before.slice(0, offset) + before.slice(offset + 2), 'unlisted source pair change');
    }
  } else {
    assert.equal(patch.expected.spell.description.split('h4. PRISMATIC RAY\n\n').length, 2);
    assert.equal(patch.spell.description, patch.expected.spell.description.replace('h4. PRISMATIC RAY\n\n', ''));
    const heading = '<h4><span class="caps">PRISMATIC</span> <span class="caps">RAY</span></h4>';
    assert.equal(patch.expected.spell.descriptionHtml.split(heading).length, 2);
    assert.equal(patch.spell.descriptionHtml, patch.expected.spell.descriptionHtml.replace(heading, ''));
  }
  const old = previous.spells.filter(row => row.legacySpellId === target);
  assert.equal(old.length, 1); assert.equal(old[0]!.sourceRulebookId, 86);
  assert.equal(old[0]!.descriptionText, patch.expected.spell.description);
  assert.equal(old[0]!.descriptionHtml, patch.expected.spell.descriptionHtml);
  const changed = next.spells.filter(row => row.legacySpellId === target);
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
  assert.deepEqual(changed[0], expected, 'unlisted normalized source pair change');
  const rebound = structuredClone(next);
  rebound.spells = next.spells.map(row => row.legacySpellId === target ? old[0]! : row);
  // The new genuine generation owns only its timestamp and provenance changes.
  rebound.generatedAt = previous.generatedAt;
  assert(previous.artifact && rebound.artifact);
  rebound.artifact.provenance = previous.artifact.provenance;
  assert.deepEqual(rebound, previous, 'source pair upgrade changes unrelated normalized fields');
}

export function prismaticRayUpgrade(db: Database.Database, previous: NormalizedRulesContent,
  next: NormalizedRulesContent, previousPath: string, nextPath: string, patch: Patch,
  fields: FinalField[], report: Report, summaries: SummaryRow[], helper: string,
  context: RulesContentImportContext, requireInputs: () => void, mode: 'check' | 'apply' = 'check',
  afterWrite: () => void = () => {}, authenticateBeforeWrite: () => void = () => {}, sourcePairs = false) {
  assert(mode === 'check' || mode === 'apply'); assert(!db.inTransaction, 'English title upgrade owns its transaction');
  comparePrismaticArtifacts(previous, next, patch, sourcePairs);
  const bytes = [fs.readFileSync(previousPath), fs.readFileSync(nextPath)];
  const priorReport = structuredClone(report);
  const authorityKeys = sourcePairs ? ['sourcePairCandidate', 'sourcePairAcceptance'] : ['englishTitleCandidate', 'englishTitleAcceptance'];
  for (const key of authorityKeys) {
    assert.match(report.sourceRevisions[key] ?? '', /^[a-f0-9]{40}$/, 'missing authenticated source pair authority');
    delete priorReport.sourceRevisions[key];
  }
  const priorFields = sourcePairs ? fields.map(field => field.sourceCorrection ? field.sourceCorrection.prior : field) : fields;
  if (sourcePairs) {
    assert.equal(report.sourceRevisions.englishTitleCandidate, '790f9ebbd024916d16577d69c01d868155a9ccfd', 'accepted title predecessor required');
    assert.equal(report.sourceRevisions.englishTitleAcceptance, '7f8ea2df1104fe4345141f0712dbb43739e98b7e');
    assert.equal(report.sourceRevisions.sourcePairCandidate, 'ebc3a6615002de6dac1f1c4a636e19757d7b0c8f');
    assert.equal(report.sourceRevisions.sourcePairAcceptance, '5f05fad7df5256a9c3c998d3be77aac238445107');
    const corrected = fields.filter(field => field.sourceCorrection);
    assert.equal(corrected.length, 1, 'missing/extra paired Chinese correction');
    assert.equal(corrected[0]!.targetId, 3930); assert.equal(corrected[0]!.field, 'body');
    for (const key of ['text', 'html'] as const) {
      const before = corrected[0]!.sourceCorrection!.prior[key]!, after = corrected[0]![key]!;
      let start = 0; while (before[start] === after[start] && start < after.length) start++;
      const removed = before.slice(start, start + 29);
      assert.equal([...removed].length, 29);
      assert(!/\s/.test(removed), 'Chinese correction cannot remove surrounding whitespace');
      assert.equal(after, before.slice(0, start) + before.slice(start + 29), 'unlisted Chinese correction');
    }
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
    const after = authorityKeys.some(key => Object.hasOwn(overlay.sourceRevisions, key));
    const content = after ? next : previous, inputPath = after ? nextPath : previousPath;
    // The prior genuine generation is validated against its original importer,
    // while the new artifact is checked against current patched rules provenance.
    requireNormalizedArtifactState(db, content, inputPath);
    const full = verifyFullNormalized(db, content, inputPath, after ? context.currentProvenance : meta.importer.current);
    const plan = planFinalOverlay(db, after ? fields : priorFields, after ? report : priorReport, full, overlay.helperRevision, summaries);
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
    if (sourcePairs) {
      const targetColumns = (db.pragma('table_info(I18nSpellText)') as {name: string}[]).map(row => row.name);
      const state = protectedBefore.find(table => table.name === 'I18nSpellText')!;
      // Keep all other fields and all other rows byte-exact, including CHM/notes.
      const at = (state.rows as unknown[][]).findIndex((row: unknown[]) => row[targetColumns.indexOf('spellId')] === 3930n &&
        Buffer.isBuffer(row[targetColumns.indexOf('lang')]) && (row[targetColumns.indexOf('lang')] as Buffer).toString() === 'zh' &&
        (row[targetColumns.indexOf('variant')] as Buffer).toString() === 'effective');
      assert(at >= 0, 'missing protected predecessor effective row');
      const planned = planFinalOverlay(db, fields, report, verifyFullNormalized(db, previous, previousPath,
        JSON.parse(String(db.prepare('SELECT buildMetaJson FROM RulesContentBuild').pluck().get())).importer.current), helper, summaries);
      assert.equal(planned.inserts, 0); assert.equal(planned.updates, 1);
      const correction = planned.rows.find(row => row.spellId === 3930)!;
      for (const key of ['descriptionText', 'descriptionHtml', 'bodyProvenanceJson'] as const)
        (state.rows[at] as unknown[])[targetColumns.indexOf(key)] = Buffer.from(correction[key]!);
      // The maintained overlay owns the changed body's updatedAt only.
      (state.rows[at] as unknown[])[targetColumns.indexOf('updatedAt')] = null;
    }
    // Complete external source QA must read CHM before the first SQL write.
    // The immediate transaction already prevents a concurrent content writer;
    // protected tables/schema are compared through this connection afterward.
    authenticateBeforeWrite(); checkInputs();
    importGenerated(db, next, false, nextPath, context);
    const full = verifyFullNormalized(db, next, nextPath, context.currentProvenance);
    // Reattach the exact accepted predecessor envelope before deriving its new
    // source binding. Only the bound #461 effective body may change; summaries
    // and every other Chinese field remain exact.
    full.meta.overlays = before.overlays;
    const plan = planFinalOverlay(db, fields, report, full, helper, summaries);
    assert.equal(plan.inserts, 0); assert.equal(plan.updates, sourcePairs ? 1 : 0); assert.equal(plan.migrate, false);
    applyFinalOverlay(db, plan);
    afterWrite(); checkInputs(); inspect();
    const protectedAfter = protectedState();
    if (sourcePairs) {
      const columns = (db.pragma('table_info(I18nSpellText)') as {name: string}[]).map(row => row.name);
      const state = protectedAfter.find(table => table.name === 'I18nSpellText')!;
      const row = (state.rows as unknown[][]).find((row: unknown[]) => row[columns.indexOf('spellId')] === 3930n &&
        (row[columns.indexOf('lang')] as Buffer).toString() === 'zh' && (row[columns.indexOf('variant')] as Buffer).toString() === 'effective') as unknown[];
      row[columns.indexOf('updatedAt')] = null;
    }
    assert.deepEqual(protectedAfter, protectedBefore, 'source upgrade changed protected tables');
    assert.deepEqual(db.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all(), schema, 'English title upgrade changed schema');
    checkInputs();
    return result('after', true);
  }).immediate();
}
