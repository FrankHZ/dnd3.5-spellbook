import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import fs from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { requireContentStepSchema } from "../rules-content/content-step-schema";
import { requireKnownAnnotations } from "../rules-content/known-annotations";
import type { NormalizedRulesContent } from "../rules-content/normalize";
import { importSummaryRows } from "./import";
import { readSummaryJsonlText, type SummaryRow } from "./summary-row-schema";

const table = "I18nSpellSummaryText";
const fields = "id spellId rulebookId lang variant summaryText sourceKey sourceName sourceKind reviewStatus".split(" ");
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
type PersistedRow = Record<string, unknown> & {id: string; createdAt: string; updatedAt: string};

function inventory(bytes: Buffer) {
  const parsed = readSummaryJsonlText(bytes.toString("utf8"));
  assert.equal(parsed.errors.length, 0, `Invalid accepted summary inventory: ${parsed.errors.join("; ")}`);
  for (const row of parsed.rows) {
    assert(Number.isSafeInteger(row.spellId) && Number.isSafeInteger(row.rulebookId), "Unsafe summary identity");
  }
  return parsed.rows;
}

function requireSchema(db: Database.Database) {
  requireContentStepSchema(db);
  const columns = db.pragma(`table_info(${table})`) as {name: string; pk: number}[];
  assert.deepEqual(columns.map(c => c.name).sort(), [...fields, "createdAt", "updatedAt"].sort(), "Incomplete/drifted summary schema");
  assert.deepEqual(columns.filter(c => c.pk).map(c => [c.name, c.pk]), [["id", 1]], "Wrong summary key");
  const indexes = db.pragma(`index_list(${table})`) as {name: string; unique: number; partial: number}[];
  assert(indexes.some(index => index.unique && !index.partial && isDeepStrictEqual(
    (db.pragma(`index_info(${quote(index.name)})`) as {name: string}[]).map(c => c.name),
    ["spellId", "lang", "variant"])), "Missing summary natural key constraint");
}

function requireBinding(row: SummaryRow, spells: {id: string; sourceRulebookId: bigint}[],
  books: {id: string}[], appearance: boolean) {
  assert(spells.length === 1 && spells[0]!.id === `spell:${row.spellId}` &&
    books.length === 1 && books[0]!.id === `rulebook:${row.rulebookId}`, "Missing/drifted summary spell/book identity");
  // Summary IDs refer to legacy spells/books. Reuse/source-gap rows bind to
  // their target book, while an established appearance may bind another book.
  assert(spells[0]!.sourceRulebookId === BigInt(row.rulebookId) || appearance,
    "Unsupported summary spell/book relationship");
}

function requireBindings(db: Database.Database, rows: SummaryRow[]) {
  const spell = db.prepare("SELECT id,sourceRulebookId FROM SpellContent WHERE legacySpellId=?");
  const book = db.prepare("SELECT id FROM RulebookContent WHERE legacyRulebookId=?");
  const appearance = db.prepare("SELECT 1 FROM SpellAppearance WHERE spellId=? AND legacySpellId=? AND rulebookId=?");
  for (const row of rows) {
    const spells = spell.safeIntegers().all(row.spellId) as {id: string; sourceRulebookId: bigint}[];
    const books = book.all(row.rulebookId) as {id: string}[];
    requireBinding(row, spells, books, !!appearance.get(`spell:${row.spellId}`, row.spellId, row.rulebookId));
  }
}

function requirePlannedBindings(content: NormalizedRulesContent, rows: SummaryRow[]) {
  const spells = new Map<number, NormalizedRulesContent["spells"]>();
  const books = new Map<number, NormalizedRulesContent["rulebooks"]>();
  for (const spell of content.spells) spells.set(spell.legacySpellId, [...(spells.get(spell.legacySpellId) ?? []), spell]);
  for (const book of content.rulebooks) books.set(book.legacyRulebookId, [...(books.get(book.legacyRulebookId) ?? []), book]);
  const appearances = new Set(content.appearances.map(row => JSON.stringify([row.spellId, row.legacySpellId, row.rulebookId])));
  for (const row of rows) requireBinding(row,
    (spells.get(row.spellId) ?? []).map(({id, sourceRulebookId}) => ({id, sourceRulebookId: BigInt(sourceRulebookId)})),
    books.get(row.rulebookId) ?? [],
    appearances.has(JSON.stringify([`spell:${row.spellId}`, row.spellId, row.rulebookId])));
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})?$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

function readRows(db: Database.Database) {
  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id`).safeIntegers().all() as PersistedRow[];
  for (const row of rows) assert(timestamp(row.createdAt) && timestamp(row.updatedAt), "Invalid summary timestamp shape");
  return rows;
}

function matches(actual: PersistedRow[], expected: SummaryRow[]) {
  const values = (row: Record<string, unknown>) => fields.map(field =>
    ["spellId", "rulebookId"].includes(field) && typeof row[field] === "number" ? BigInt(row[field] as number) : row[field]);
  const order = (a: {id: string}, b: {id: string}) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  return isDeepStrictEqual([...actual].sort(order).map(values), [...expected].sort(order).map(values));
}

function protectedState(db: Database.Database) {
  const schema = db.prepare("SELECT * FROM sqlite_master ORDER BY type,name").safeIntegers().all() as {type: string; name: string}[];
  const key = (row: unknown[]) => JSON.stringify(row, (_key, value) => typeof value === "bigint" ? {integer: value.toString()} : value);
  const rows = schema.filter(row => row.type === "table" && row.name !== table).map(row => {
    const values = db.prepare(`SELECT * FROM ${quote(row.name)}`).safeIntegers().raw().all() as unknown[][];
    values.sort((a, b) => key(a).localeCompare(key(b)));
    return [row.name, values];
  });
  return {schema, rows};
}

export type SummaryImportStepResult = {
  mode: "check" | "apply";
  state: "before" | "after";
  changed: boolean;
  wouldChange: boolean;
};

function prepareInputs(inputPath: string, previousInputPath: string, expectedBytes?: {input: Buffer; previous: Buffer}) {
  const inputBytes = expectedBytes ? expectedBytes.input : fs.readFileSync(inputPath);
  const previousBytes = expectedBytes ? expectedBytes.previous : fs.readFileSync(previousInputPath);
  const next = inventory(inputBytes), previous = inventory(previousBytes);
  const byId = new Map(next.map(row => [row.id, row]));
  for (const row of previous) {
    assert(byId.has(row.id), "Summary deletion/identity reassignment is unsupported");
    assert.equal(byId.get(row.id)!.rulebookId, row.rulebookId, "Summary book identity reassignment is unsupported");
  }
  const requireInputs = () => assert(fs.readFileSync(inputPath).equals(inputBytes) &&
    fs.readFileSync(previousInputPath).equals(previousBytes), "Accepted summary input changed during import step");
  return {next, previous, requireInputs};
}

function inspectState(db: Database.Database, next: SummaryRow[], previous: SummaryRow[]) {
  const actual = readRows(db);
  const metadata = (db.prepare("SELECT buildMetaJson FROM RulesContentBuild").all() as {buildMetaJson: string}[])
    .map(row => JSON.parse(row.buildMetaJson) as Record<string, unknown>);
  for (const meta of metadata) requireKnownAnnotations(db, meta);
  if (matches(actual, next)) return {state: "after" as const, actual};
  assert(matches(actual, previous), "Unrecognized summary state; neither complete accepted before nor after matches");
  for (const meta of metadata) {
    assert(!Object.hasOwn(meta, "overlays"),
      "Annotated predecessor cannot change summaries; later #420 coordination must invalidate/revalidate downstream acceptance first");
  }
  return {state: "before" as const, actual};
}

/** Readonly sequence preflight against an already validated accepted next full
 * normalized artifact. Both inventories must bind after normalized replacement;
 * today's persisted inventory must also bind to today's normalized rows. */
export function preflightSummaryImport(db: Database.Database, inputPath: string, previousInputPath: string,
  plannedNormalized: NormalizedRulesContent, expectedBytes?: {input: Buffer; previous: Buffer}) {
  const {next, previous, requireInputs} = prepareInputs(inputPath, previousInputPath, expectedBytes);
  return db.transaction(() => {
    requireInputs(); requireSchema(db);
    requirePlannedBindings(plannedNormalized, previous); requirePlannedBindings(plannedNormalized, next);
    const current = inspectState(db, next, previous);
    requireBindings(db, current.state === "after" ? next : previous);
    return {result: {mode: "check" as const, state: current.state, changed: false,
      wouldChange: current.state === "before"}, next};
  })();
}

/** Paths identify the owning handoff's already accepted COMPLETE inventories.
 * Syntax/reviewStatus and optional expected bytes never establish source acceptance. */
export function summaryImportStep(db: Database.Database, inputPath: string, previousInputPath: string,
  mode: "check" | "apply" = "check", expectedBytes?: {input: Buffer; previous: Buffer}): SummaryImportStepResult {
  assert(mode === "check" || mode === "apply", "Unknown summary import mode");
  if (mode === "apply") assert(!db.inTransaction, "Summary import step owns its content transaction");
  const {next, previous, requireInputs} = prepareInputs(inputPath, previousInputPath, expectedBytes);
  const inspect = () => {
    requireInputs(); requireSchema(db);
    requireBindings(db, previous); requireBindings(db, next);
    return inspectState(db, next, previous);
  };
  const result = (state: "before" | "after", changed = false): SummaryImportStepResult =>
    ({mode, state, changed, wouldChange: state === "before"});
  const initial = db.transaction(inspect)();
  if (mode === "check" || initial.state === "after") return result(initial.state);
  assert(!db.readonly, "Apply requires a writable content connection");
  return db.transaction(() => {
    const current = inspect();
    if (current.state === "after") return result("after");
    const protectedBefore = protectedState(db);
    const started = db.prepare("SELECT CURRENT_TIMESTAMP").pluck().get() as string;
    importSummaryRows(db, next, false);
    requireInputs(); requireSchema(db);
    const actual = readRows(db);
    assert(matches(actual, next), "Summary SQL did not produce complete accepted after");
    const finished = db.prepare("SELECT CURRENT_TIMESTAMP").pluck().get() as string;
    const oldRows = new Map(current.actual.map(row => [row.id, row]));
    for (const row of actual) {
      const old = oldRows.get(row.id);
      if (old) assert.equal(row.createdAt, old.createdAt, "Summary creation timestamp changed");
      if (old && fields.every(field => isDeepStrictEqual(row[field], old[field]))) {
        assert.deepEqual(row, old, "Unchanged summary row/timestamp changed");
      } else {
        assert(row.updatedAt >= started && row.updatedAt <= finished && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(row.updatedAt),
          "Changed summary timestamp does not match importer SQL");
        if (!old) assert.equal(row.createdAt, row.updatedAt, "Inserted summary creation timestamp differs");
      }
    }
    assert(isDeepStrictEqual(protectedState(db), protectedBefore), "Summary import changed protected rows/schema");
    return result("after", true);
  }).immediate();
}
