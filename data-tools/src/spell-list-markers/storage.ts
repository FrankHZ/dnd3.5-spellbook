import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import type { MarkerRecord } from "./markers";

function tableExists(db: Database.Database) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='SpellListMarker' COLLATE NOCASE").get());
}

/** Caller owns opening a readonly content connection; no implicit DB/file access. */
export function readPrintedMarkerRecords(db: Database.Database, rulebookId: number): MarkerRecord[] {
  if (!tableExists(db)) return [];
  return db.prepare(`SELECT id, sourceKey, rulebookId, listEntryId, markers, reviewStatus, sourceJson, bindingJson
    FROM SpellListMarker WHERE rulebookId=? ORDER BY id`).all(rulebookId) as MarkerRecord[];
}

/** Existing regeneration does not own reviewed print annotations. Preserve them by refusing replacement. */
export function assertNoStoredListMarkers(db: Database.Database) {
  assert(!tableExists(db) || !db.prepare("SELECT 1 FROM SpellListMarker LIMIT 1").get(),
    "Normalized replacement cannot preserve SpellListMarker bindings; coordinate a source-bound marker rebuild first");
}
