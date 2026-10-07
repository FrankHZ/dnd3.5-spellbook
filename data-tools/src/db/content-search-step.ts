import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { requireContentStepSchema } from "../rules-content/content-step-schema";
import { repoRoot } from "../shared/env";
import { readContentSearchSource } from "./content-search";
import { buildContentSearchDocuments, CONTENT_SEARCH_SCHEMA_VERSION,
  replaceContentSearchIndex, type ContentSearchDocument, type ContentSearchSource } from "./content-search-documents";

const fields = ["spellId", "lang", "variant", "name", "aliases", "summary", "mechanics", "body"] as const;
const ownedTables = new Set(["SpellSearchDocument", "SpellSearchIndexState",
  ...["data", "idx", "content", "docsize", "config"].map(suffix => `SpellSearchDocument_${suffix}`)]);
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

function requireSearchStepSchema(db: Database.Database) {
  requireContentStepSchema(db);
  for (const [table, names] of Object.entries({
    I18nSpellText: "id spellId rulebookId lang variant name descriptionHtml descriptionText sourceKey createdAt updatedAt nameProvenanceJson bodyProvenanceJson",
    I18nSpellSummaryText: "id spellId rulebookId lang variant summaryText sourceKey sourceName sourceKind reviewStatus createdAt updatedAt",
  })) {
    const columns = db.pragma(`table_info(${quote(table)})`) as {name: string; pk: number}[];
    assert.deepEqual(columns.map(c => c.name).sort(), names.split(" ").sort(), `Incomplete/drifted search source schema: ${table}`);
    assert.deepEqual(columns.filter(c => c.pk).map(c => [c.name, c.pk]), [["id", 1]], `Wrong source key: ${table}`);
  }
  // Accept the maintained FTS declaration only: identical columns with a different
  // tokenizer, content mode, detail or UNINDEXED configuration are incompatible.
  const migration = fs.readFileSync(path.join(repoRoot(),
    "server/db/content/migrations/20260716190000_add_spell_search_index/migration.sql"), "utf8");
  const normalize = (sql: string) => sql.replaceAll('"', "").replace(/\s+/g, "").replace(/;$/, "");
  for (const [index, table] of ["SpellSearchDocument", "SpellSearchIndexState"].entries()) {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table) as {sql: string} | undefined;
    assert(row && normalize(row.sql) === normalize(migration.split(";")[index]!), `Missing/incompatible search schema: ${table}`);
  }
}

/** Shared source guards and builder for current rows and accepted future rows. */
export function requireContentSearchSource(source: ContentSearchSource) {
  const spells = new Set<number>();
  for (const spell of source.spells) {
    assert(Number.isSafeInteger(spell.spellId) && !spells.has(spell.spellId), "Invalid/duplicate source spell key");
    spells.add(spell.spellId);
    assert(Object.entries(spell).every(([key, value]) => key === "spellId" ||
      typeof value === "string" || (value === null && !["canonicalName", "slug", "descriptionText"].includes(key))),
    "Invalid source spell values");
  }
  for (const rows of [source.texts, source.summaries]) {
    const seen = new Set<string>();
    for (const row of rows) {
      const key = JSON.stringify([row.spellId, row.lang, row.variant]);
      assert(spells.has(row.spellId) && typeof row.lang === "string" && row.lang.length &&
        typeof row.variant === "string" && row.variant.length && !seen.has(key), "Invalid/orphan/duplicate localized source key");
      seen.add(key);
      assert(Object.entries(row).every(([field, value]) => field === "spellId" || typeof value === "string" ||
        (value === null && ["name", "descriptionText"].includes(field))), "Invalid localized source values");
    }
  }
  for (const row of source.mechanics) {
    assert(spells.has(row.spellId) && typeof row.category === "string" &&
      [row.rawText, row.normalizedText].every(value => value === null || typeof value === "string"), "Invalid mechanic source values");
  }
  return buildContentSearchDocuments(source);
}

function expectedDocuments(db: Database.Database) {
  // The maintained reader joins mechanics to spells. Do not silently discard orphans.
  assert(!db.prepare(`SELECT 1 FROM SpellMechanicFacet m LEFT JOIN SpellContent s ON s.id=m.spellId
    WHERE s.id IS NULL LIMIT 1`).get(), "Orphan mechanic source");
  return requireContentSearchSource(readContentSearchSource(db));
}

function documentsMatch(db: Database.Database, expected: ContentSearchDocument[]) {
  const rows = db.prepare(`SELECT ${fields.map(quote).join(",")} FROM SpellSearchDocument`).safeIntegers().all() as Record<string, unknown>[];
  // FTS has no document-key constraint. Compare the full multiset, not counts or
  // a Map that would collapse duplicates. safeIntegers avoids rounded foreign keys.
  const values = (rows: Record<string, unknown>[]) => rows.map(row => fields.map(field => {
    const value = row[field];
    // FTS has no affinity: the maintained JS writer binds safe IDs as REAL,
    // while SQL imports can store INTEGER. They represent the same exact key.
    return field === "spellId" && typeof value === "bigint" &&
      value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value;
  }));
  const actual = values(rows);
  const wanted = values(expected);
  const sort = (rows: unknown[][]) => rows.sort((a, b) => {
    const key = (row: unknown[]) => row.map(value => typeof value === "bigint" ? `${value}n` : JSON.stringify(value)).join("\0");
    return key(a).localeCompare(key(b));
  });
  return isDeepStrictEqual(sort(actual), sort(wanted));
}

function stateMatches(db: Database.Database, count: number) {
  const rows = db.prepare("SELECT * FROM SpellSearchIndexState").safeIntegers().all() as
    {id: bigint; schemaVersion: bigint; documentCount: bigint; rebuiltAt: unknown}[];
  const state = rows[0];
  return rows.length === 1 && state?.id === 1n && state.schemaVersion === BigInt(CONTENT_SEARCH_SCHEMA_VERSION) &&
    state.documentCount === BigInt(count) && typeof state.rebuiltAt === "string" &&
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?$/.test(state.rebuiltAt) &&
    Number.isFinite(Date.parse(state.rebuiltAt));
}

function requireFtsIntegrity(db: Database.Database) {
  // Since SQLite 3.44 the built-in FTS5 xIntegrity invokes the same storage
  // integrity checker as the special INSERT, including ordinary-table content
  // agreement. A partial pragma runs it readonly on this transaction's snapshot.
  const version = db.prepare("SELECT sqlite_version()").pluck().get() as string;
  const [major, minor] = version.split(".").map(Number);
  assert(major! > 3 || (major === 3 && minor! >= 44), "FTS integrity requires SQLite 3.44 or newer");
  let errors: unknown[];
  try {errors = db.prepare("PRAGMA main.integrity_check(SpellSearchDocument)").pluck().all();}
  catch (error) {
    const corrupt = (error as {code?: string}).code?.startsWith("SQLITE_CORRUPT");
    throw new Error(corrupt ? "Corrupt FTS index; search step cannot safely repair internal corruption" :
      "FTS integrity verification unavailable", {cause: error});
  }
  assert(errors.length > 0 && errors.every(value => typeof value === "string"), "FTS integrity verification unavailable: missing result");
  assert(!errors.some(value => String(value).includes("unable to validate")), `FTS integrity verification unavailable: ${errors.join("; ")}`);
  assert(errors.length === 1 && errors[0] === "ok",
    `Corrupt FTS index; search step cannot safely repair internal corruption: ${errors.join("; ")}`);
}

function protectedState(db: Database.Database) {
  const schema = db.prepare("SELECT * FROM sqlite_master ORDER BY type,name").safeIntegers().all() as {type: string; name: string}[];
  // Exact raw SQLite values: bigint, Buffer, null and text remain distinct.
  const rows = schema.filter(row => row.type === "table" && !ownedTables.has(row.name)).map(row => {
    const values = db.prepare(`SELECT * FROM ${quote(row.name)}`).safeIntegers().raw().all() as unknown[][];
    // Row order is not part of table content; retain exact cells, sort by a lossless key.
    const key = (row: unknown[]) => JSON.stringify(row, (_key, value) =>
      typeof value === "bigint" ? {integer: value.toString()} : value);
    values.sort((a, b) => key(a).localeCompare(key(b)));
    return [row.name, values];
  });
  return {schema, rows};
}

export type ContentSearchStepResult = {
  mode: "check" | "apply";
  state: "current" | "stale";
  changed: boolean;
  wouldChange: boolean;
  documents: number;
};

/** Derived search state only. Source QA/accepted handoff is the caller's prerequisite. */
export function contentSearchStep(db: Database.Database, mode: "check" | "apply" = "check",
  requireSource: () => void = () => {}): ContentSearchStepResult {
  assert(mode === "check" || mode === "apply", "Unknown search step mode");
  if (mode === "apply") assert(!db.inTransaction, "Search step owns its content transaction");
  const inspect = () => {
    // A bounded caller can revalidate its accepted source on this transaction's
    // snapshot, including under the rebuild's immediate write lock.
    requireSource();
    requireSearchStepSchema(db);
    const documents = expectedDocuments(db);
    // Always check internal FTS integrity, even when rows/state already differ.
    requireFtsIntegrity(db);
    return {documents, current: documentsMatch(db, documents) && stateMatches(db, documents.length)};
  };
  const result = (current: boolean, count: number, changed = false): ContentSearchStepResult => ({mode,
    state: current ? "current" : "stale", changed, wouldChange: !current, documents: count});
  const initial = db.transaction(inspect)();
  if (mode === "check" || initial.current) return result(initial.current, initial.documents.length);
  assert(!db.readonly, "Apply requires a writable content connection");
  return db.transaction(() => {
    const current = inspect();
    if (current.current) return result(true, current.documents.length);
    const before = protectedState(db);
    replaceContentSearchIndex(db, current.documents);
    const after = inspect();
    assert(after.current && isDeepStrictEqual(after.documents, current.documents), "Search replacement verification failed");
    assert(isDeepStrictEqual(protectedState(db), before), "Search replacement changed protected rows/schema");
    return result(true, after.documents.length, true);
  }).immediate();
}
