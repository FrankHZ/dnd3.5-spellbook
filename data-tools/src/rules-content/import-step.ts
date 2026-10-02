import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import { isDeepStrictEqual } from "node:util";
import fs from "node:fs";
import { assertImportableRulesContentArtifact, assertRulesContentArtifact } from "./artifact";
import type { RulesContentArtifactProvenance } from "./artifact";
import { GENERATED_CONTENT_TABLES, GENERATED_TABLES, collectImportContext, importGenerated, readGenerated,
  type RulesContentImportContext } from "./cli";
import type { NormalizedRulesContent } from "./normalize";
import { verifyFullNormalized } from "../dice-intake/final-writer";
import { requireKnownAnnotations } from "./known-annotations";

import { contentStepColumns as columns, requireContentStepSchema } from "./content-step-schema";
export { requireContentStepSchema } from "./content-step-schema";

type Row = Record<string, unknown>;

function keys(value: Row, expected: string[]) {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), "unexpected fields");
}

function provenanceKeys(provenance: RulesContentArtifactProvenance) {
  keys(provenance, ["schemaVersion", "parentRepo", "dataRepo", "rulesDb", "canonicalInputs", "contentMigrations"]);
  keys(provenance.parentRepo, ["commit", "dirty"]);
  if (provenance.dataRepo) keys(provenance.dataRepo, ["commit", "dirty"]);
  keys(provenance.canonicalInputs, ["rulesManifest", "rulebookPublicationMetadata", "chmRulebookPublications"]);
  for (const value of [provenance.rulesDb, provenance.contentMigrations, ...Object.values(provenance.canonicalInputs)]) {
    if (value) keys(value, ["path", "sha256"]);
  }
}

function requireCompleteArtifact(content: NormalizedRulesContent) {
  assertImportableRulesContentArtifact(content);
  keys(content.artifact, ["schemaVersion", "scope", "importable", "limitations", "sourceTotals", "provenance"]);
  keys(content.artifact.sourceTotals, ["rulebooks", "spells", "descriptors", "classListEntries", "domainListEntries"]);
  provenanceKeys(content.artifact.provenance);
  assert(Number.isFinite(Date.parse(content.generatedAt)), "Invalid artifact generation timestamp");
  keys(content.counts, Object.values(GENERATED_CONTENT_TABLES));
  for (const [table, key] of Object.entries(GENERATED_CONTENT_TABLES)) {
    const rows: Row[] = content[key];
    assert(Array.isArray(rows), `Missing artifact rows: ${table}`);
    assert.equal(content.counts[key], rows.length, `Artifact row count differs: ${table}`);
    const ids = new Set<string>();
    for (const row of rows) {
      keys(row, columns[table as keyof typeof GENERATED_CONTENT_TABLES].split(" "));
      assert(typeof row.id === "string" && row.id.length && !ids.has(row.id), `Duplicate/invalid artifact key: ${table}`);
      ids.add(row.id);
      assert(Object.values(row).every(value => value === null || typeof value === "string" ||
        typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value) &&
          (!Number.isInteger(value) || Number.isSafeInteger(value)))), `Invalid artifact value: ${table}`);
    }
  }
}

function stableRows(rows: Row[]) {
  return rows.map(row => JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => [key, typeof value === "boolean" ? Number(value) :
      typeof value === "bigint" ? {sqliteInteger: value.toString()} :
        Buffer.isBuffer(value) ? {sqliteBlob: value.toString("base64")} : value])))).sort();
}

/** Full artifact/build matching; historical importer metadata need not equal today's checkout. */
export function requireNormalizedArtifactState(db: Database.Database, content: NormalizedRulesContent, inputPath: string) {
  requireContentStepSchema(db);
  requireCompleteArtifact(content);
  const builds = db.prepare("SELECT * FROM RulesContentBuild").all() as Row[];
  assert.equal(builds.length, 1, "Require exactly one full normalized build");
  const meta = JSON.parse(String(builds[0]!.buildMetaJson)) as Row;
  const importer = meta.importer as {importedAt: string; generatedInput: string; generatedInputSha256: string;
    current: NonNullable<NormalizedRulesContent["artifact"]>["provenance"]};
  keys(importer, ["importedAt", "generatedInput", "generatedInputSha256", "current"]);
  assert(typeof importer.importedAt === "string" && Number.isFinite(Date.parse(importer.importedAt)), "Invalid import timestamp");
  assert(typeof importer.generatedInput === "string" && importer.generatedInput.length, "Missing import path");
  assertRulesContentArtifact({...content, artifact: {...content.artifact!, provenance: importer.current}});
  provenanceKeys(importer.current);
  keys(meta.artifact as Row, ["scope", "sourceTotals", "generation"]);
  requireKnownAnnotations(db, meta);
  // Reuse the maintained full/build/provenance verifier. It validates the stored
  // import-time provenance against generation, not a newly captured predecessor.
  verifyFullNormalized(db, content, inputPath, importer.current);
  for (const [table, key] of Object.entries(GENERATED_CONTENT_TABLES)) {
    assert.deepEqual(stableRows(db.prepare(`SELECT * FROM ${table}`).all() as Row[]), stableRows(content[key]),
      `Complete normalized rows differ: ${table}`);
  }
  return meta;
}

function quote(name: string) { return `"${name.replace(/"/g, '""')}"`; }

function protectedState(db: Database.Database) {
  const schema = db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name").all() as Row[];
  const tables = schema.filter(row => row.type === "table" && !(GENERATED_TABLES as readonly string[]).includes(String(row.name)));
  return {schema, rows: tables.map(row => [row.name, stableRows(db.prepare(`SELECT * FROM ${quote(String(row.name))}`).safeIntegers().all() as Row[])])};
}

export type NormalizedImportStepResult = {
  mode: "check" | "apply";
  state: "before" | "after";
  changed: boolean;
  wouldChange: boolean;
};

/** Both paths identify the owning handoff's already accepted full artifacts.
 * This internal context override has the same synthetic-test boundary as
 * importGenerated; the production entry always collects actual current inputs.
 */
export function normalizedImportStep(db: Database.Database, inputPath: string, previousInputPath: string,
  mode: "check" | "apply" = "check", importContext?: RulesContentImportContext): NormalizedImportStepResult {
  assert(mode === "check" || mode === "apply", "Unknown normalized import mode");
  if (mode === "apply") assert(!db.inTransaction, "Normalized import step owns its content transaction");
  // Pin the bytes for this invocation without adding a detection hash. A second
  // read in the transaction must agree; existing source hashes remain provenance.
  const inputBytes = fs.readFileSync(inputPath), previousBytes = fs.readFileSync(previousInputPath);
  const inspect = () => {
    assert(fs.readFileSync(inputPath).equals(inputBytes) && fs.readFileSync(previousInputPath).equals(previousBytes),
      "Accepted artifact input changed during normalized import step");
    requireContentStepSchema(db);
    const content = readGenerated(inputPath), previous = readGenerated(previousInputPath);
    requireCompleteArtifact(content); requireCompleteArtifact(previous);
    const context = importContext ?? collectImportContext();
    // Dry-run reuses all maintained current input/source checks; it does not
    // determine the target's state. Full row/build matching below does that.
    importGenerated(db, content, true, inputPath, context);
    let afterError: unknown;
    try {
      requireNormalizedArtifactState(db, content, inputPath);
      return {state: "after" as const, content, context};
    } catch (error) {afterError = error;}
    let meta: Row;
    try {meta = requireNormalizedArtifactState(db, previous, previousInputPath);}
    catch (beforeError) {
      throw new Error(`Unrecognized normalized content state; neither accepted before nor after matches.\nAfter: ${String(afterError)}\nBefore: ${String(beforeError)}`);
    }
    assert(!Object.hasOwn(meta, "overlays"),
      "Annotated predecessor cannot be replaced by this normalized step; later #420 coordination must invalidate/revalidate downstream acceptance first");
    return {state: "before" as const, content, context};
  };
  const initial = db.transaction(inspect)();
  if (mode === "check" || initial.state === "after") {
    return {mode, state: initial.state, changed: false, wouldChange: initial.state === "before"};
  }
  assert(!db.readonly, "Apply requires a writable content connection");
  return db.transaction(() => {
    const current = inspect();
    if (current.state === "after") return {mode, state: "after" as const, changed: false, wouldChange: false};
    const protectedBefore = protectedState(db);
    // Existing importer uses a savepoint when called in our write transaction.
    const imported = importGenerated(db, current.content, false, inputPath, current.context);
    assert(fs.readFileSync(inputPath).equals(inputBytes) && fs.readFileSync(previousInputPath).equals(previousBytes),
      "Accepted artifact input changed during normalized import step");
    const afterMeta = requireNormalizedArtifactState(db, current.content, inputPath);
    assert.deepEqual(afterMeta, JSON.parse(imported.provenance.buildMetaJson), "Build metadata changed during SQL execution");
    assert(isDeepStrictEqual(protectedState(db), protectedBefore), "Normalized import changed protected rows/schema");
    return {mode, state: "after" as const, changed: true, wouldChange: false};
  }).immediate();
}
