import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import {isDeepStrictEqual} from "node:util";
import {cityscapeAcceptance as a, type HandoffEvidence} from "./db-english-handoff";
import {applyOverlayRows, overlayColumns, type OverlayRow} from "./effective-writer";
import {contentSearchStep, requireContentSearchSource, type ContentSearchStepResult} from "../db/content-search-step";
import {readContentSearchSource} from "../db/content-search";
import {requireKnownAnnotations} from "../rules-content/known-annotations";
import {assertImportableRulesContentArtifact, verifyRulesContentArtifactProvenance} from "../rules-content/artifact";
import type {NormalizedRulesContent} from "../rules-content/normalize";

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

type Row = Record<string, any>;
function keys(value: Row, expected: string[]) {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), "unexpected build fields");
}

function inspectOverlay(db: Database.Database, rows: OverlayRow[], e: HandoffEvidence) {
  const targets = db.prepare("SELECT legacySpellId FROM SpellContent WHERE sourceRulebookId=53 ORDER BY legacySpellId").all() as Row[];
  assert.deepEqual(targets.map(r => r.legacySpellId), a.targets, "normalized target scope differs");
  for (const {targetId, english} of e.targetInputs) {
    const spell = db.prepare("SELECT canonicalName,descriptionText FROM SpellContent WHERE legacySpellId=?").get(targetId) as Row;
    assert.equal(spell.canonicalName, english.name, "normalized canonical English name drift");
    assert.equal(spell.descriptionText, english.description, "normalized canonical English body drift");
  }
  const actual = db.prepare(`SELECT * FROM I18nSpellText WHERE (lang='zh' AND variant='effective' AND
    (rulebookId=53 OR spellId BETWEEN 355 AND 362)) OR id IN (${rows.map(() => "?").join(",")}) ORDER BY spellId`)
    .all(...rows.map(r => `dice-effective:53:${r.spellId}`)) as Row[];
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
  const note = prior.overlays?.cityscapeDbEnglish;
  if (note !== undefined) {
    assert.deepEqual(note, cityscapeOverlayNote, "Cityscape build note drift");
    delete prior.overlays.cityscapeDbEnglish;
    if (!Object.keys(prior.overlays).length) delete prior.overlays;
  }
  requireKnownAnnotations(db, prior); // SC fixed revisions remain under their existing guard.
  const state: "before" | "after" = actual.length === 0 && note === undefined ? "before" : "after";
  if (state === "after") {
    assert.deepEqual(note, cityscapeOverlayNote, "missing accepted build note");
    assert.equal(actual.length, rows.length, "partial/extra effective target set");
    actual.forEach((old, i) => {
      const row = rows[i]!;
      assert.equal(old.id, `dice-effective:53:${row.spellId}`, "foreign overlay ID");
      assert.equal(old.lang, "zh"); assert.equal(old.variant, "effective");
      for (const key of ["spellId", ...overlayColumns] as const) assert.equal(old[key], row[key], `overlay drift: ${key}`);
      for (const key of ["createdAt", "updatedAt"]) assert(typeof old[key] === "string" && Number.isFinite(Date.parse(old[key])), "invalid overlay timestamp");
    });
  }
  return {state, buildId: build.id as string, meta, nextMeta: {...meta,
    overlays: {...meta.overlays, cityscapeDbEnglish: cityscapeOverlayNote}}};
}

/** Exact raw values, preserving all non-owned rows and complete normalized provenance. */
function protectedState(db: Database.Database) {
  const schema = db.prepare("SELECT * FROM sqlite_master ORDER BY type,name").safeIntegers().all() as Row[];
  const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
  const key = (r: unknown) => JSON.stringify(r, (_k, v) => typeof v === "bigint" ? {integer: String(v)} : v);
  const tables = schema.filter(r => r.type === "table").map(({name}) => {
    let values = db.prepare(`SELECT * FROM ${quote(name)}`).safeIntegers().all() as Row[];
    if (name === "I18nSpellText") values = values.filter(r => !(r.lang === "zh" && r.variant === "effective" && a.targets.some(id => BigInt(id) === r.spellId)));
    if (name === "RulesContentBuild") values = values.map(r => {
      const meta = JSON.parse(r.buildMetaJson);
      if (meta.overlays?.cityscapeDbEnglish) {
        delete meta.overlays.cityscapeDbEnglish;
        if (!Object.keys(meta.overlays).length) delete meta.overlays;
      }
      return {...r, buildMetaJson: meta};
    });
    return [name, values.sort((x, y) => key(x).localeCompare(key(y)))];
  });
  return {schema, tables};
}

export type CityscapeOverlayResult = {
  mode: "check" | "apply"; complete: boolean; state?: "before" | "after";
  overlay: "not-attempted" | "committed" | "no-op" | "failed";
  search: "not-attempted" | "committed" | "no-op" | "failed";
  searchCheck?: ContentSearchStepResult;
};
export class CityscapeOverlayError extends Error {
  constructor(public readonly stage: "preflight" | "overlay" | "search" | "final-check" | "report",
    public readonly result: CityscapeOverlayResult, cause: unknown) {
    super(`Cityscape overlay failed during ${stage}: ${String(cause)}`, {cause});
  }
}

/** Same bounded stage path for check, apply and recovery. Authentication runs on
 * the current transaction snapshot, including after opening a writable handle.
 * Fault hook is internal test injection; the CLI exposes no override/SQL option. */
export function cityscapeOverlay(db: Database.Database, authenticate: () => HandoffEvidence,
  mode: "check" | "apply" = "check", fault: (point: "before-overlay" | "inside-overlay" | "after-overlay" | "after-search") => void = () => {}) {
  const report: CityscapeOverlayResult = {mode, complete: false, overlay: "not-attempted", search: "not-attempted"};
  let stage: CityscapeOverlayError["stage"] = "preflight";
  try {
    assert(mode === "check" || mode === "apply");
    assert(!db.inTransaction, "overlay sequence owns its stage transactions");
    const inspectTarget = () => {
      const evidence = authenticate();
      const rows = cityscapeOverlayRows(evidence);
      return {rows, plan: inspectOverlay(db, rows, evidence)};
    };
    const inspect = () => {
      const {rows, plan} = inspectTarget();
      // Schema + FTS integrity and actual source validity before the first write.
      const search = contentSearchStep(db);
      const source = readContentSearchSource(db);
      source.texts = source.texts.filter(r => !(r.lang === "zh" && r.variant === "effective" && a.targets.some(id => id === r.spellId)));
      source.texts.push(...rows.map(r => ({spellId: r.spellId, lang: "zh", variant: "effective", name: r.name, descriptionText: r.descriptionText})));
      requireContentSearchSource(source);
      return {rows, plan, search};
    };
    const initial = db.transaction(inspect)();
    report.state = initial.plan.state;
    report.searchCheck = initial.search;
    if (mode === "check") {
      report.complete = initial.plan.state === "after" && initial.search.state === "current";
      return report;
    }
    fault("before-overlay");
    stage = "overlay"; report.overlay = "failed";
    // The immediate outer transaction owns revalidation and protection; the
    // existing materializer nests its SQL in a savepoint on the same snapshot.
    const changed = db.transaction(() => {
      const current = inspect();
      if (current.plan.state === "after") return false;
      assert(!db.readonly, "apply requires writable content");
      const protectedBefore = protectedState(db);
      applyOverlayRows(db, current.rows, false, () => {
        db.prepare("UPDATE RulesContentBuild SET buildMetaJson=? WHERE id=?")
          .run(JSON.stringify(current.plan.nextMeta), current.plan.buildId);
        fault("inside-overlay");
        const next = inspect();
        assert.equal(next.plan.state, "after");
        assert.deepEqual(next.rows, current.rows, "accepted inputs changed during transaction");
        assert(isDeepStrictEqual(protectedState(db), protectedBefore), "overlay changed protected rows/schema");
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
  } catch (error) {throw new CityscapeOverlayError(stage, report, error);}
}
