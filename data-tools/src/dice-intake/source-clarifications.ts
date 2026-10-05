import assert from 'node:assert/strict';
import type Database from 'better-sqlite3';
import {applyFinalOverlay, planFinalOverlay, validateFinalOverlay, verifyFullNormalized, type FinalField} from './final-writer';
import {punctuationCandidate, punctuationAcceptance} from './source-fidelity';
import {requireKnownAnnotations} from '../rules-content/known-annotations';
import type {SummaryRow} from '../short-desc/summary-row-schema';

export const clarificationCandidate = 'cb2f661ef8935ecbf6bd09bae106e067493d5c67';
export const clarificationAcceptance = '10c65744f9b525db0c48115eea6ccefd96f4b4cd';
export const clarificationPath = 'dice-qa/books/86/issue-476/main-gate-source-review/selected-candidates.json';
export const clarificationIds = [3901, 4465, 4564];

/** Structural guard for the fixed six fields. Full strings are authenticated
 * against the private accepted candidate by the maintained source reader. */
export function validateClarificationChinese(id: number, key: 'text' | 'html', before: string, after: string) {
  assert(clarificationIds.includes(id), 'unlisted Chinese clarification target');
  const b = Array.from(before), a = Array.from(after), offset = key === 'html' ? 5 : 0;
  const edits = id === 4465 ? [[257, 0, 8]] : id === 4564 ? [[314, 0, 7]] : [[221, 0, 8], [260, 7, 2]];
  let delta = 0;
  for (const [position, removed, inserted] of edits as [number, number, number][]) {
    const at = position + offset + delta;
    assert(b.length >= at + removed, 'stale Chinese clarification position');
    const replacement = a.slice(at, at + inserted);
    assert.equal(replacement.length, inserted);
    assert(!replacement.some(char => /[\s<>]/u.test(char)), 'clarification changes structure/whitespace');
    b.splice(at, removed, ...replacement);
    delta += inserted - removed;
  }
  assert.equal(b.join(''), after, 'unlisted Chinese clarification change');
}

/** One source-authenticated, content-only successor of #473. The existing
 * overlay writer owns SQL; normalized content, summaries and schema stay exact. */
export function finalChineseClarificationUpgrade(db: Database.Database, fields: FinalField[],
  report: Record<string, unknown> & {sourceRevisions: Record<string, string>},
  verifyFull: () => ReturnType<typeof verifyFullNormalized>, summaries: SummaryRow[],
  requireInputs: () => void, mode: 'check' | 'apply' = 'check', afterWrite: () => void = () => {},
  authenticateBeforeWrite: () => void = () => {}) {
  assert(mode === 'check' || mode === 'apply');
  assert(!db.inTransaction, 'Chinese clarification upgrade owns its transaction');
  assert.equal(report.sourceRevisions.sourcePunctuationCandidate, punctuationCandidate, 'accepted #473 predecessor required');
  assert.equal(report.sourceRevisions.sourcePunctuationAcceptance, punctuationAcceptance);
  assert.equal(report.sourceRevisions.sourceClarificationCandidate, clarificationCandidate);
  assert.equal(report.sourceRevisions.sourceClarificationAcceptance, clarificationAcceptance);
  const corrected = fields.filter(f => f.sourceCorrection?.revision === clarificationCandidate);
  assert.deepEqual(corrected.map(f => f.targetId).sort((a, b) => a - b), clarificationIds);
  const priorFields = fields.map(f => f.sourceCorrection?.revision === clarificationCandidate ? f.sourceCorrection.prior : f);
  const priorReport = structuredClone(report);
  delete priorReport.sourceRevisions.sourceClarificationCandidate;
  delete priorReport.sourceRevisions.sourceClarificationAcceptance;
  const inspect = () => {
    requireInputs();
    const full = verifyFull();
    requireKnownAnnotations(db, full.meta);
    const overlay = full.meta.overlays?.scFinalNameBody;
    assert(overlay?.summaryQa, 'Chinese clarification requires accepted annotated predecessor');
    const after = Object.hasOwn(overlay.sourceRevisions, 'sourceClarificationCandidate') ||
      Object.hasOwn(overlay.sourceRevisions, 'sourceClarificationAcceptance');
    const plan = planFinalOverlay(db, after ? fields : priorFields, after ? report : priorReport,
      full, overlay.helperRevision, summaries);
    assert.equal(plan.migrate, false);
    assert.equal(plan.inserts + plan.updates, 0, 'Chinese clarification cannot repair partial fields');
    validateFinalOverlay(db, plan);
    return {full, plan, state: after ? 'after' as const : 'before' as const};
  };
  const result = (state: 'before' | 'after', changed = false) => ({mode, state, changed, wouldChange: state === 'before'});
  const initial = db.transaction(inspect)();
  if (mode === 'check' || initial.state === 'after') return result(initial.state);
  assert(!db.readonly, 'Apply requires writable content');
  return db.transaction(() => {
    const current = inspect();
    if (current.state === 'after') return result('after');
    const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
    const snapshot = () => (db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all() as {name: string}[])
      .map(({name}) => {
        const columns = (db.pragma(`table_info(${quote(name)})`) as {name: string}[]).map(row => row.name);
        const rows = db.prepare(`SELECT ${columns.map(column => {
          const c = quote(column);
          return `CASE WHEN typeof(${c})='text' THEN CAST(${c} AS BLOB) ELSE ${c} END`;
        }).join(',')} FROM ${quote(name)} ORDER BY ${columns.map(quote).join(',')}`).safeIntegers().raw().all() as unknown[][];
        return {name, columns, rows};
      });
    const expected = snapshot(), schema = db.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all();
    const plan = planFinalOverlay(db, fields, report, current.full,
      current.full.meta.overlays.scFinalNameBody.helperRevision, summaries);
    assert.equal(plan.migrate, false); assert.equal(plan.inserts, 0); assert.equal(plan.updates, 3);
    const normalizeAllowed = (tables: ReturnType<typeof snapshot>, expectedState: boolean) => {
      const table = tables.find(t => t.name === 'I18nSpellText')!;
      for (const id of clarificationIds) {
        const row = table.rows.find(r => r[table.columns.indexOf('spellId')] === BigInt(id) &&
          (r[table.columns.indexOf('lang')] as Buffer).toString() === 'zh' &&
          (r[table.columns.indexOf('variant')] as Buffer).toString() === 'effective');
        assert(row, 'missing clarification effective row');
        if (expectedState) for (const key of ['descriptionText', 'descriptionHtml', 'bodyProvenanceJson'] as const)
          row[table.columns.indexOf(key)] = Buffer.from(plan.rows.find(r => r.spellId === id)![key]!);
        row[table.columns.indexOf('updatedAt')] = null;
      }
      if (expectedState) {
        const build = tables.find(t => t.name === 'RulesContentBuild')!;
        assert.equal(build.rows.length, 1);
        build.rows[0]![build.columns.indexOf('buildMetaJson')] = Buffer.from(plan.buildMetaJson);
      }
    };
    normalizeAllowed(expected, true);
    authenticateBeforeWrite(); requireInputs();
    applyFinalOverlay(db, plan);
    afterWrite(); requireInputs(); inspect();
    const actual = snapshot(); normalizeAllowed(actual, false);
    assert.deepEqual(actual, expected, 'Chinese clarification changed protected content or provenance');
    assert.deepEqual(db.prepare('SELECT * FROM sqlite_schema ORDER BY type,name').all(), schema, 'Chinese clarification changed schema');
    return result('after', true);
  }).immediate();
}
