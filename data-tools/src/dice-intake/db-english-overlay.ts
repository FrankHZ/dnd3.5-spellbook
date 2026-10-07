import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import {cityscapeAcceptance as a, type HandoffEvidence} from "./db-english-handoff";
import type {OverlayRow} from "./effective-writer";
import {acceptedOverlay, type AcceptedOverlayInput} from "./accepted-overlay";
export {AcceptedOverlayError as CityscapeOverlayError} from "./accepted-overlay";
export type {AcceptedOverlayResult as CityscapeOverlayResult} from "./accepted-overlay";

export const cityscapeOverlayNote = {
  schema: "cityscape-db-english-overlay.v1", acceptedRevision: a.revision,
  preparedRevision: a.preparedRevision, sourceRevision: a.sourceRevision,
  reviewedPublicHead: a.reviewedPublicHead, rulebookId: a.rulebookId, targets: a.targets,
  fields: ["name", "descriptionHtml", "descriptionText"], authority: "DB-English",
  fullyChineseBodies: 7, mixedBodies: 1, residual: {targetId: 361, clauses: 1, ownerIssue: 160},
  search: "rebuild-after-overlay", activation: false,
} as const;

/** Internal materialization only; the maintained entry authenticates original inputs. */
export function cityscapeOverlayRows(e: HandoffEvidence): OverlayRow[] {
  assert.deepEqual(e.accepted.map(r => r.targetId).sort((x, y) => x - y), a.targets);
  return [...e.accepted].sort((x, y) => x.targetId - y.targetId).map(row => {
    assert.equal(row.rulebookId, a.rulebookId);
    const entry = e.semantic.entries.find(r => r.targetId === row.targetId)!;
    const descriptionText = entry.segments.map(s => s.kind === "english-fallback" ? s.text : s.zh).join("\n");
    assert(row.name && row.descriptionHtml && descriptionText);
    const provenance = (field: "name" | "body") => JSON.stringify({
      schemaVersion: 1, acceptedRevision: a.revision, targetId: row.targetId, field, language: "zh",
      origin: {kind: "native", sourceKey: row.sourceKey},
      input: {revision: a.revision, path: `${a.directory}/out/accepted.jsonl`, targetId: row.targetId,
        field: field === "name" ? "name" : "descriptionHtml", sourceKey: row.sourceKey},
      evidence: {revision: a.revision, path: `${a.directory}/semantic-review.json`, targetId: row.targetId,
        ...(field === "body" && row.targetId === 361 ? {residualPath: `${a.directory}/unresolved.jsonl:1`} : {})},
      review: {kind: "DB-English", disposition: "DB-English-reviewed", acceptedRevision: a.revision,
        ...(field === "body" ? {composition: row.targetId === 361 ? "mixed" : "Chinese",
          ...(row.targetId === 361 ? {residual: {kind: "retained-DB-English", clauses: 1, ownerIssue: 160}} : {})} : {})},
    });
    return {spellId: row.targetId, rulebookId: a.rulebookId, name: row.name, descriptionHtml: row.descriptionHtml,
      descriptionText, sourceKey: row.sourceKey, nameProvenanceJson: provenance("name"),
      bodyProvenanceJson: provenance("body"), action: "insert"};
  });
}


/** Preserve the pilot's whole-book scope and exact original source contract. */
export function cityscapeOverlayInput(e: HandoffEvidence): AcceptedOverlayInput {
  return {rows: cityscapeOverlayRows(e), noteKey: "cityscapeDbEnglish", note: cityscapeOverlayNote,
    verifyTargets(db) {
      const targets = db.prepare("SELECT legacySpellId FROM SpellContent WHERE sourceRulebookId=53 ORDER BY legacySpellId").all() as {legacySpellId: number}[];
      assert.deepEqual(targets.map(r => r.legacySpellId), a.targets, "normalized target scope differs");
      for (const {targetId, english} of e.targetInputs) {
        const spell = db.prepare("SELECT canonicalName,descriptionText FROM SpellContent WHERE legacySpellId=?").get(targetId) as Record<string, unknown>;
        assert.equal(spell.canonicalName, english.name, "normalized canonical English name drift");
        assert.equal(spell.descriptionText, english.description, "normalized canonical English body drift");
      }
    },
    verifyScope(db) {
      const actual = db.prepare("SELECT spellId FROM I18nSpellText WHERE lang='zh' AND variant='effective' AND rulebookId=53").all() as {spellId: number}[];
      assert(actual.every(r => (a.targets as readonly number[]).includes(r.spellId)), "partial/extra effective target set");
    }};
}

export function cityscapeOverlay(db: Database.Database, authenticate: () => HandoffEvidence,
  mode: "check" | "apply" = "check", fault?: Parameters<typeof acceptedOverlay>[3]) {
  return acceptedOverlay(db, () => cityscapeOverlayInput(authenticate()), mode, fault);
}
