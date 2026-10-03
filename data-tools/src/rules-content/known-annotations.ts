import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import { finalScRevision, finalScNoteRevision, finalScSummaryRevision,
  finalScSummaryCandidate, finalScSummaryPath } from "../dice-intake/final-writer";

type Row = Record<string, unknown>;
function keys(value: Row, expected: string[]) {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), "unexpected fields");
}

// This stage checks normalized ownership, not source acceptance of later overlays.
// Recognize only the existing downstream namespace/schema and fixed revisions;
// its source/field verification stays with the final overlay workflow. Preserve it
// byte-for-byte on exact-after; it must never authorize a normalized replacement.
export function requireKnownAnnotations(db: Database.Database, meta: Row) {
  keys(meta, ["schema", "artifact", "importer", ...(Object.hasOwn(meta, "overlays") ? ["overlays"] : [])]);
  if (!Object.hasOwn(meta, "overlays")) return;
  const overlays = meta.overlays as Row;
  keys(overlays, ["scFinalNameBody"]);
  const overlay = overlays.scFinalNameBody as Row;
  keys(overlay, ["schema", "acceptedRevision", "helperRevision", "sourceRevisions", "targets", "fields",
    "changedNames", "changedBodies", "retained", "sourceQuestionIds", "semanticQa", "search", "activation",
    ...(Object.hasOwn(overlay, "readerNoteAddendum") ? ["readerNoteAddendum"] : []),
    ...(Object.hasOwn(overlay, "summaryQa") ? ["summaryQa"] : [])]);
  assert.equal(overlay.schema, "sc-final-name-body.v1");
  assert.equal(overlay.acceptedRevision, finalScRevision);
  assert.match(String(overlay.helperRevision), /^[a-f0-9]{40}$/);
  for (const key of ["targets", "fields", "changedNames", "changedBodies"]) {
    assert(Number.isInteger(overlay[key]) && Number(overlay[key]) >= 0, `Invalid downstream ${key}`);
  }
  assert.equal(overlay.fields, Number(overlay.targets) * 2);
  const ids = (db.prepare("SELECT legacySpellId FROM SpellContent WHERE sourceRulebookId=86").all() as {legacySpellId: number}[])
    .map(row => row.legacySpellId);
  assert.equal(overlay.targets, ids.length, "Downstream target scope differs from normalized SC scope");
  assert(Number(overlay.changedNames) <= ids.length && Number(overlay.changedBodies) <= ids.length);
  assert.equal(overlay.search, "rebuild-after-final-text-and-summaries");
  assert.equal(overlay.activation, false);
  assert.deepEqual(overlay.semanticQa, {nameBody: "accepted-source-bound",
    summaries: overlay.summaryQa ? "accepted-source-bound" : "pending", extraRelationships: "pending", wholeBookComplete: false});
  assert(overlay.sourceRevisions && typeof overlay.sourceRevisions === "object" && !Array.isArray(overlay.sourceRevisions));
  assert(Object.values(overlay.sourceRevisions).length > 0 && Object.values(overlay.sourceRevisions)
    .every(value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value)), "Malformed downstream source revisions");
  assert(Array.isArray(overlay.sourceQuestionIds));
  for (const question of overlay.sourceQuestionIds as Row[]) {
    keys(question, ["targetId", "ids", ...(Object.hasOwn(question, "field") ? ["field"] : [])]);
    assert(ids.includes(Number(question.targetId)) && typeof question.targetId === "number");
    assert(Array.isArray(question.ids) && question.ids.every(id => typeof id === "string" && id.length));
    if (Object.hasOwn(question, "field")) assert(question.field === "name" || question.field === "body");
  }
  const retained = overlay.retained as Row;
  keys(retained, ["names", "bodies"]);
  assert(Array.isArray(retained.names) && Array.isArray(retained.bodies));
  for (const values of [retained.names, retained.bodies]) {
    assert.equal(new Set(values).size, values.length, "Duplicate downstream retained target");
    assert(values.every((id: unknown) => typeof id === "number" && ids.includes(id)), "Unknown downstream retained target");
  }
  if (Object.hasOwn(overlay, "readerNoteAddendum")) {
    const note = overlay.readerNoteAddendum as Row;
    keys(note, ["revision", "targets", ...(Object.hasOwn(note, "path") ? ["path"] : []),
      ...(Object.hasOwn(note, "verification") ? ["verification"] : [])]);
    assert.equal(note.revision, finalScNoteRevision);
    assert.deepEqual(note.targets, [4088, 4111, 4229]);
    if (Object.hasOwn(note, "path")) assert.equal(note.path, "dice-qa/books/86/issue-407/amendments.jsonl");
    if (Object.hasOwn(note, "verification")) assert(note.verification && typeof note.verification === "object" && !Array.isArray(note.verification));
  }
  if (Object.hasOwn(overlay, "summaryQa")) {
    const summary = overlay.summaryQa as Row;
    keys(summary, ["schema", "acceptedRevision", "candidateRevision", "path", "scope", "canonicalRows", "scRows"]);
    assert.equal(summary.schema, "sc-final-summary.v1");
    assert.equal(summary.acceptedRevision, finalScSummaryRevision);
    assert.equal(summary.candidateRevision, finalScSummaryCandidate);
    assert.equal(summary.path, finalScSummaryPath);
    assert.equal(summary.scope, "present-canonical-sc-summaries");
    assert(Number.isInteger(summary.canonicalRows) && Number(summary.canonicalRows) > 0);
    assert(Number.isInteger(summary.scRows) && Number(summary.scRows) >= 0 && Number(summary.scRows) <= Number(summary.canonicalRows));
    assert.equal(summary.canonicalRows, (db.prepare("SELECT COUNT(*) AS n FROM I18nSpellSummaryText").get() as {n: number}).n);
    assert.equal(summary.scRows, (db.prepare("SELECT COUNT(*) AS n FROM I18nSpellSummaryText WHERE rulebookId=86").get() as {n: number}).n);
  }
}
