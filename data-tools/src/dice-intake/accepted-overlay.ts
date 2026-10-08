import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import {isDeepStrictEqual} from "node:util";
import {applyOverlayRows, overlayColumns, type OverlayRow} from "./effective-writer";
import {contentSearchStep, requireContentSearchSource, type ContentSearchStepResult} from "../db/content-search-step";
import {readContentSearchSource} from "../db/content-search";
import {requireKnownAnnotations} from "../rules-content/known-annotations";
import {assertImportableRulesContentArtifact, verifyRulesContentArtifactProvenance} from "../rules-content/artifact";
import type {NormalizedRulesContent} from "../rules-content/normalize";

/** Authenticated source owners supply rows and a fixed public-safe build note.
 * This internal primitive never interprets a proposal or grants acceptance. */
export type AcceptedOverlayInput = {
  rows: OverlayRow[];
  noteKey: string;
  note: Record<string, unknown>;
  verifyTargets: (db: Database.Database) => void;
  /** A whole-book owner may reject additional effective rows outside its targets. */
  verifyScope?: (db: Database.Database) => void;
  /** The fixed clause owner alone supports exact present predecessors. */
  correction?: { before: (Record<string, unknown> | null)[];
    verifyPriorAnnotations: (db: Database.Database, meta: Record<string, unknown>) => void };
};

type Row = Record<string, any>;
function keys(value: Row, expected: string[]) {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), "unexpected build fields");
}

function inspectOverlay(db: Database.Database, input: AcceptedOverlayInput) {
  const {rows, noteKey, note: acceptedNote} = input;
  assert(rows.length > 0, "empty accepted overlay");
  assert.equal(new Set(rows.map(r => r.spellId)).size, rows.length, "duplicate accepted target");
  assert(["cityscapeDbEnglish", "diceDbEnglishCloseout", "actionClauseCorrections"].includes(noteKey), "unsupported annotation owner");
  assert.equal(Boolean(input.correction), noteKey === "actionClauseCorrections", "correction requires its fixed owner");
  if (input.correction) assert.equal(input.correction.before.length, rows.length, "predecessor scope differs");
  const scIds = new Set((db.prepare(`SELECT legacySpellId AS id FROM SpellContent WHERE sourceRulebookId=86
    UNION SELECT spellId AS id FROM I18nSpellText WHERE rulebookId=86`).all() as {id: number}[]).map(r => r.id));
  for (const [index,row] of rows.entries()) {
    assert(row.rulebookId !== 86 && !scIds.has(row.spellId), "SC is outside the accepted write set");
    assert.equal(row.action, input.correction?.before[index] ? "update" : "insert", "unsupported predecessor operation");
    const spell = db.prepare("SELECT sourceRulebookId FROM SpellContent WHERE legacySpellId=?").get(row.spellId) as Row;
    assert(spell && spell.sourceRulebookId === row.rulebookId, "normalized target book differs");
  }
  input.verifyTargets(db);
  input.verifyScope?.(db);
  const byId = new Map(rows.map(r => [`dice-effective:${r.rulebookId}:${r.spellId}`, r]));
  const targets = new Set(rows.map(r => r.spellId));
  const actual = (db.prepare("SELECT * FROM I18nSpellText ORDER BY spellId").all() as Row[])
    .filter(r => (r.lang === 'zh' && r.variant === 'effective' && targets.has(r.spellId)) || byId.has(r.id));
  const builds = db.prepare("SELECT * FROM RulesContentBuild").all() as Row[];
  assert.equal(builds.length, 1, "require one full normalized build");
  const build = builds[0]!;
  assert.equal(build.sourceKind, "rules-clean", "require full normalized generation");
  const meta = JSON.parse(build.buildMetaJson) as Row;
  keys(meta, ["schema", "artifact", "importer", ...(Object.hasOwn(meta, "overlays") ? ["overlays"] : [])]);
  assert.equal(meta.schema, "rules-content-build-meta.v2");
  keys(meta.artifact, ["scope", "sourceTotals", "generation"]);
  keys(meta.importer, ["importedAt", "generatedInput", "generatedInputSha256", "current"]);
  assert.equal(meta.artifact.scope, "full");
  const counts = {spells: (db.prepare("SELECT count(*) AS n FROM SpellContent").get() as Row).n,
    rulebooks: (db.prepare("SELECT count(*) AS n FROM RulebookContent").get() as Row).n};
  assertImportableRulesContentArtifact({schemaVersion: 2, counts, artifact: {schemaVersion: 1, scope: "full",
    importable: true, limitations: [], sourceTotals: meta.artifact.sourceTotals,
    provenance: meta.artifact.generation}} as unknown as NormalizedRulesContent);
  verifyRulesContentArtifactProvenance(meta.artifact.generation, meta.importer.current);
  assert.equal(build.parentRepoCommit, meta.artifact.generation.parentRepo.commit);
  assert.equal(build.dataRepoCommit, meta.artifact.generation.dataRepo.commit);
  assert.equal(build.rulesDbSha256, meta.artifact.generation.rulesDb.sha256);
  assert.equal(build.rulesManifestSha256, meta.artifact.generation.canonicalInputs.rulesManifest.sha256);
  assert.equal(build.migrationSetSha256, meta.artifact.generation.contentMigrations.sha256);
  assert.equal(build.sourceSha256, meta.importer.generatedInputSha256);
  assert.equal(build.spellCount, counts.spells);
  assert.equal(build.issueCount, (db.prepare("SELECT count(*) AS n FROM RulesContentIssue").get() as Row).n);
  assert(Number.isFinite(Date.parse(meta.importer.importedAt)) && typeof meta.importer.generatedInput === "string" && meta.importer.generatedInput.length);
  const prior = structuredClone(meta);
  const note = prior.overlays?.[noteKey];
  if (note !== undefined) {
    assert.deepEqual(note, acceptedNote, "accepted build note drift");
    delete prior.overlays[noteKey];
    if (!Object.keys(prior.overlays).length) delete prior.overlays;
  }
  if (input.correction) input.correction.verifyPriorAnnotations(db, prior);
  else requireKnownAnnotations(db, prior); // Existing owners retain their original refusal semantics.
  const state: "before" | "after" = input.correction ? note === undefined ? "before" : "after"
    : actual.length === 0 && note === undefined ? "before" : "after";
  if (state === "before" && input.correction) {
    assert.equal(actual.length, input.correction.before.filter(Boolean).length, "partial/foreign predecessor set");
    rows.forEach((row, index) => {
      const old = actual.find(r => r.spellId === row.spellId);
      assert.deepEqual(old ?? null, input.correction!.before[index], "complete effective predecessor differs");
    });
  }
  if (state === "after") {
    assert.deepEqual(note, acceptedNote, "missing accepted build note");
    assert.equal(actual.length, rows.length, "partial/extra effective target set");
    actual.forEach((old, i) => {
      const row = rows[i]!;
      assert.equal(old.id, `dice-effective:${row.rulebookId}:${row.spellId}`, "foreign overlay ID");
      assert.equal(old.lang, "zh"); assert.equal(old.variant, "effective");
      for (const key of ["spellId", ...overlayColumns] as const) assert.equal(old[key], row[key], `overlay drift: ${key}`);
      for (const key of ["createdAt", "updatedAt"]) assert(typeof old[key] === "string" && Number.isFinite(Date.parse(old[key])), "invalid overlay timestamp");
      const predecessor = input.correction?.before[i];
      if (predecessor) for (const key of Object.keys(predecessor)) {
        if (!["descriptionText", "descriptionHtml", "bodyProvenanceJson", "updatedAt"].includes(key))
          assert.deepEqual(old[key], predecessor[key], `changed protected predecessor field: ${key}`);
      }
    });
  }
  return {state, buildId: build.id as string, meta, nextMeta: {...meta,
    overlays: {...meta.overlays, [noteKey]: acceptedNote}}};
}

/** Exact raw values, preserving all non-owned rows and complete normalized provenance. */
function protectedState(db: Database.Database, input: AcceptedOverlayInput) {
  const {noteKey, rows} = input;
  const schema = db.prepare("SELECT * FROM sqlite_master ORDER BY type,name").safeIntegers().all() as Row[];
  const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
  const key = (r: unknown) => JSON.stringify(r, (_k, v) => typeof v === "bigint" ? {integer: String(v)} : v);
  // FTS shadow storage duplicates the virtual documents. Compare every logical
  // search document and its state exactly; contentSearchStep checks SQLite FTS
  // storage integrity before/after. Do not allocate another full shadow copy.
  const searchShadows = new Set(["data", "idx", "content", "docsize", "config"].map(s => `SpellSearchDocument_${s}`));
  const tables = schema.filter(r => r.type === "table" && !searchShadows.has(r.name)).map(({name}) => {
    let values = db.prepare(`SELECT * FROM ${quote(name)}`).safeIntegers().all() as Row[];
    if (name === "I18nSpellText") values = values.filter(r => !(r.lang === "zh" && r.variant === "effective" && rows.some(row => BigInt(row.spellId) === r.spellId)));
    if (name === "RulesContentBuild") values = values.map(r => {
      const meta = JSON.parse(r.buildMetaJson);
      if (meta.overlays?.[noteKey]) {
        delete meta.overlays[noteKey];
        if (!Object.keys(meta.overlays).length) delete meta.overlays;
      }
      return {...r, buildMetaJson: meta};
    });
    return [name, values.sort((x, y) => key(x).localeCompare(key(y)))];
  });
  return {schema, tables};
}

export type AcceptedOverlayResult = {
  mode: "check" | "apply"; complete: boolean; state?: "before" | "after";
  overlay: "not-attempted" | "committed" | "no-op" | "failed";
  search: "not-attempted" | "committed" | "no-op" | "failed";
  searchCheck?: ContentSearchStepResult;
  scope?: {targets: number; rulebookIds: number[]; acceptedNames: number; acceptedBodies: number; acceptedClauses?: number};
};
export class AcceptedOverlayError extends Error {
  constructor(public readonly stage: "preflight" | "overlay" | "search" | "final-check" | "report",
    public readonly result: AcceptedOverlayResult, cause: unknown) {
    super(`Accepted overlay failed during ${stage}: ${String(cause)}`, {cause});
  }
}

/** Same bounded stage path for check, apply and recovery. Authentication runs on
 * the current transaction snapshot, including after opening a writable handle.
 * Fault hook is internal test injection; the CLI exposes no override/SQL option. */
export function acceptedOverlay(db: Database.Database, authenticate: () => AcceptedOverlayInput,
  mode: "check" | "apply" = "check", fault: (point: "before-overlay" | "inside-overlay" | "after-overlay" | "after-search") => void = () => {}) {
  const report: AcceptedOverlayResult = {mode, complete: false, overlay: "not-attempted", search: "not-attempted"};
  let stage: AcceptedOverlayError["stage"] = "preflight";
  try {
    assert(mode === "check" || mode === "apply");
    assert(!db.inTransaction, "overlay sequence owns its stage transactions");
    const inspectTarget = () => {
      const input = authenticate();
      const rows = [...input.rows].sort((a, b) => a.spellId - b.spellId);
      return {rows, input: {...input, rows}, plan: inspectOverlay(db, {...input, rows})};
    };
    const inspect = () => {
      const {rows, input, plan} = inspectTarget();
      // Schema + FTS integrity and actual source validity before the first write.
      const search = contentSearchStep(db);
      const source = readContentSearchSource(db);
      source.texts = source.texts.filter(r => !(r.lang === "zh" && r.variant === "effective" && rows.some(row => row.spellId === r.spellId)));
      source.texts.push(...rows.map(r => ({spellId: r.spellId, lang: "zh", variant: "effective", name: r.name, descriptionText: r.descriptionText})));
      requireContentSearchSource(source);
      return {rows, input, plan, search};
    };
    const initial = db.transaction(inspect)();
    report.state = initial.plan.state;
    report.scope = {targets: initial.rows.length,
      rulebookIds: [...new Set(initial.rows.map(r => r.rulebookId))].sort((a,b) => a-b),
      acceptedNames: initial.input.correction ? 0 : initial.rows.filter(r => r.nameProvenanceJson && JSON.parse(r.nameProvenanceJson).review?.kind === "DB-English").length,
      acceptedBodies: initial.rows.filter(r => JSON.parse(r.bodyProvenanceJson).review?.kind === "DB-English").length,
      ...(initial.input.correction ? {acceptedClauses:initial.rows.reduce((n,r)=>n+JSON.parse(r.bodyProvenanceJson).evidence.proposalIds.length,0)} : {})};
    report.searchCheck = initial.search;
    if (mode === "check") {
      report.complete = initial.plan.state === "after" && initial.search.state === "current";
      return report;
    }
    fault("before-overlay");
    stage = "overlay"; report.overlay = "failed";
    // applyOverlayRows nests its savepoint in this immediate transaction. No
    // source checks occur after the lock but before the transaction snapshot.
    const changed = db.transaction(() => {
      const current = inspect();
      if (current.plan.state === "after") return false;
      assert(!db.readonly, "apply requires writable content");
      const protectedBefore = protectedState(db, current.input);
      applyOverlayRows(db, current.rows, false, () => {
        db.prepare("UPDATE RulesContentBuild SET buildMetaJson=? WHERE id=?")
          .run(JSON.stringify(current.plan.nextMeta), current.plan.buildId);
        fault("inside-overlay");
        const next = inspect();
        assert.equal(next.plan.state, "after");
        assert.deepEqual(next.rows, current.rows, "accepted inputs changed during transaction");
        assert(isDeepStrictEqual(protectedState(db, current.input), protectedBefore), "overlay changed protected rows/schema");
      });
      return true;
    }).immediate();
    report.overlay = changed ? "committed" : "no-op"; report.state = "after";
    stage = "search";
    fault("after-overlay");
    // Re-authenticate exact after before any subsequent search mutation.
    db.transaction(() => assert.equal(inspect().plan.state, "after"))();
    report.search = "failed";
    const search = contentSearchStep(db, "apply", () => assert.equal(inspectTarget().plan.state, "after"));
    report.search = search.changed ? "committed" : "no-op";
    report.searchCheck = search;
    fault("after-search");
    stage = "final-check";
    const final = db.transaction(inspect)();
    assert.equal(final.plan.state, "after"); assert.equal(final.search.state, "current");
    report.searchCheck = final.search; report.complete = true;
    return report;
  } catch (error) {throw new AcceptedOverlayError(stage, report, error);}
}
