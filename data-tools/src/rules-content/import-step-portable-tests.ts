import assert from "node:assert/strict";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import type { NormalizedRulesContent } from "./normalize";
import type { RulesContentArtifactProvenance } from "./artifact";

const root = path.resolve(__dirname, "../../..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "normalized-import-step-"));
// Set every data/DB input before loading CLI modules, which capture configuration.
process.env.DATA_REPO_PATH = temp;
process.env.RULES_DATABASE_URL = `file:${path.join(temp, "rules.sqlite")}`;
process.env.CONTENT_DATABASE_URL = `file:${path.join(temp, "content.sqlite")}`;
process.env.APP_DATABASE_URL = process.env.CONTENT_DATABASE_URL;
process.env.APP_STATE_DATABASE_URL = `file:${path.join(temp, "app-state.sqlite")}`;
process.env.RULES_MANIFEST_PATH = path.join(temp, "rules-db-manifest.json");

const tables = {RulebookContent: "rulebooks", SpellContent: "spells", SpellAppearance: "appearances",
  SpellTaxonomyFacet: "taxonomyFacets", SpellListEntry: "listEntries", SpellComponent: "components",
  SpellMechanicFacet: "mechanicFacets", RulesContentIssue: "issues"} as const;
const migrations = path.join(root, "server/db/content/migrations");
function schema(db: Database.Database) {
  for (const name of fs.readdirSync(migrations).sort()) {
    if (name !== "migration_lock.toml") db.exec(fs.readFileSync(path.join(migrations, name, "migration.sql"), "utf8"));
  }
}
function fixture(db: Database.Database, current: RulesContentArtifactProvenance): NormalizedRulesContent {
  const operations = ["normalized-rules-spells.jsonl", "rules-content-builds.jsonl"].flatMap(name =>
    fs.readFileSync(path.join(root, "server/db/content/fixtures/portable", name), "utf8")
      .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as {table: string; data: Record<string, unknown>}));
  const arrays = Object.fromEntries(Object.entries(tables).map(([table, key]) => {
    const names = (db.pragma(`table_info(${table})`) as {name: string}[]).map(c => c.name);
    return [key, operations.filter(row => row.table === table).map(row =>
      Object.fromEntries(names.map(name => [name, row.data[name] ?? (name === "verified" ? false : null)])))];
  })) as Record<string, Array<Record<string, unknown>>>;
  arrays.spells![0]!.sourceRulebookId = 86;
  arrays.spells!.slice(1).forEach(row => {row.sourceRulebookId = 9;});
  const first = arrays.spells![0]!;
  arrays.appearances = [{id: "appearance:synthetic", spellId: first.id, legacySpellId: first.legacySpellId,
    rulebookId: first.sourceRulebookId, page: first.sourcePage, printedName: first.canonicalName,
    sourceSlug: first.slug, sourceKey: "synthetic", sourceNote: null}];
  return {schemaVersion: 2, generatorVersion: "rules-content-normalizer-v9", generatedAt: "2026-10-02T01:00:00.000Z",
    counts: Object.fromEntries(Object.entries(arrays).map(([key, rows]) => [key, rows.length])), ...arrays,
    artifact: {schemaVersion: 1, scope: "full", importable: true, limitations: [],
      sourceTotals: {rulebooks: arrays.rulebooks!.length, spells: arrays.spells!.length, descriptors: 0,
        classListEntries: 0, domainListEntries: 0}, provenance: current}} as unknown as NormalizedRulesContent;
}
function snapshot(db: Database.Database) {
  return {schema: db.prepare("SELECT * FROM sqlite_master ORDER BY name").all(),
    rows: (db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {name: string}[])
      .map(({name}) => [name, db.prepare(`SELECT * FROM "${name.replace(/"/g, '""')}"`).all()])};
}
function write(file: string, value: unknown) { fs.writeFileSync(file, JSON.stringify(value), "utf8"); }

async function main() {
  const {importGenerated, readGenerated} = await import("./cli.js");
  const {requireNormalizedArtifactState, normalizedImportStep} = await import("./import-step.js");
  const {collectRulesContentArtifactProvenance, sha256File} = await import("./artifact.js");
  const {applyFinalOverlay, planFinalOverlay, verifyFullNormalized} = await import("../dice-intake/final-writer.js");
  execFileSync("git", ["init", "-q", temp]);
  fs.writeFileSync(path.join(temp, "source.txt"), "synthetic source input", "utf8");
  execFileSync("git", ["-C", temp, "add", "source.txt"]);
  execFileSync("git", ["-C", temp, "-c", "user.name=Portable", "-c", "user.email=portable@example.invalid",
    "commit", "-qm", "synthetic input"]);
  const rulesPath = path.join(temp, "rules.sqlite");
  const rules = new Database(rulesPath); rules.exec("CREATE TABLE dnd_spell(id INTEGER PRIMARY KEY)"); rules.close();
  write(process.env.RULES_MANIFEST_PATH!, {database: {sha256: sha256File(rulesPath)}});
  const publications = path.join(temp, "rulebook-publications/publications.jsonl");
  fs.mkdirSync(path.dirname(publications)); fs.writeFileSync(publications, "synthetic publication", "utf8");
  const provenancePaths = {parentRepoRoot: root, dataRepoRoot: temp,
    rulesDbPath: rulesPath, rulesManifestPath: process.env.RULES_MANIFEST_PATH!,
    rulebookPublicationMetadataPath: publications, chmRulebookPublicationsPath: path.join(temp, "rulebook-labels/chm-publications.jsonl"),
    contentMigrationsPath: migrations};
  const collect = () => collectRulesContentArtifactProvenance(provenancePaths,
    {requireDataRepo: true, requireRulesManifest: true, requirePublicationMetadata: true});
  const current = collect();
  const db = new Database(":memory:"); schema(db);
  try {
    const before = fixture(db, current), beforePath = path.join(temp, "before.json");
    write(beforePath, before);
    // Older supported schemas without the new annotation table still import.
    const oldSchema = new Database(":memory:"); schema(oldSchema);
    try {
      oldSchema.exec("DROP TABLE SpellListMarker");
      importGenerated(oldSchema, readGenerated(beforePath), false, beforePath,
        {currentProvenance: current, importedAt: "2026-10-02T02:00:00.000Z"});
      assert.equal((oldSchema.prepare("SELECT COUNT(*) AS n FROM SpellContent").get() as {n: number}).n, before.spells.length);
    } finally { oldSchema.close(); }
    importGenerated(db, readGenerated(beforePath), false, beforePath, {currentProvenance: current, importedAt: "2026-10-02T02:00:00.000Z"});
    const persisted = snapshot(db);
    requireNormalizedArtifactState(db, before, beforePath);
    assert.deepEqual(snapshot(db), persisted, "state inspection wrote");
    // Every generated table must compare complete values, keys and inventories.
    for (const table of Object.keys(tables)) {
      const row = db.prepare(`SELECT * FROM ${table} LIMIT 1`).get() as Record<string, unknown>;
      assert(row, `expected fixture rows for ${table}`);
      const column = Object.keys(row).find(key => key !== "id" && typeof row[key] === "string")!;
      const runDrift = (sql: string) => {
        const fault = db.transaction(() => {db.exec(sql); assert.throws(() => requireNormalizedArtifactState(db, before, beforePath)); throw new Error("undo drift");});
        assert.throws(fault, /undo drift/);
      };
      // Execute the value drift transaction separately so it rolls back.
      const valueDrift = db.transaction(() => {
        db.prepare(`UPDATE ${table} SET ${column}=? WHERE id=?`).run("drift", row.id);
        assert.throws(() => requireNormalizedArtifactState(db, before, beforePath)); throw new Error("undo drift");
      });
      assert.throws(valueDrift, /undo drift/);
      runDrift(`UPDATE ${table} SET id='extra-key' WHERE id='${String(row.id).replace(/'/g, "''")}'`);
      runDrift(`DELETE FROM ${table} WHERE id='${String(row.id).replace(/'/g, "''")}'`);
      const extra = db.transaction(() => {
        const names = Object.keys(row), values: unknown[] = Object.values({...row, id: "unexpected-row"});
        if (Object.hasOwn(row, "legacySpellId")) values[names.indexOf("legacySpellId")] = 987654;
        if (Object.hasOwn(row, "legacyRulebookId")) values[names.indexOf("legacyRulebookId")] = 987654;
        for (const key of ["spellId", "printedName"]) if (names.includes(key)) values[names.indexOf(key)] = "unexpected-row";
        db.prepare(`INSERT INTO ${table} (${names.join(",")}) VALUES (${names.map(() => "?").join(",")})`).run(...values);
        assert.throws(() => requireNormalizedArtifactState(db, before, beforePath)); throw new Error("undo extra row");
      });
      assert.throws(extra, /undo extra row/);
      assert.deepEqual(snapshot(db), persisted);
    }
    const build = db.prepare("SELECT * FROM RulesContentBuild").get() as Record<string, unknown>;
    for (const key of Object.keys(build)) {
      const corrupt = db.transaction(() => {
        db.prepare(`UPDATE RulesContentBuild SET ${key}=?`).run(typeof build[key] === "number" ? 99999 : "wrong");
        assert.throws(() => requireNormalizedArtifactState(db, before, beforePath)); throw new Error("undo corrupt build");
      });
      assert.throws(corrupt, /undo corrupt build/);
    }
    for (const mutate of [
      (meta: any) => {meta.importer.current.rulesDb.sha256 = "0".repeat(64);},
      (meta: any) => {meta.importer.importedAt = "invalid";},
      (meta: any) => {meta.importer.extra = "unknown";},
      (meta: any) => {meta.artifact.extra = "unknown";},
      (meta: any) => {meta.unreviewed = true;},
      (meta: any) => {meta.overlays = {unknown: {schema: "unknown"}};},
    ]) {
      const corrupt = db.transaction(() => {
        const meta = JSON.parse(String(build.buildMetaJson)); mutate(meta);
        db.prepare("UPDATE RulesContentBuild SET buildMetaJson=?").run(JSON.stringify(meta));
        assert.throws(() => requireNormalizedArtifactState(db, before, beforePath)); throw new Error("undo corrupt metadata");
      });
      assert.throws(corrupt, /undo corrupt metadata/);
    }
    for (const table of ["User", "FavoriteSpell", "SpellNote", "dnd_spell", "dnd_rulebook"]) {
      const wrongRole = db.transaction(() => {
        db.exec(`CREATE TABLE ${table}(id TEXT)`);
        assert.throws(() => requireNormalizedArtifactState(db, before, beforePath), /content DB role/);
        throw new Error("undo wrong role");
      });
      assert.throws(wrongRole, /undo wrong role/);
    }
    const missingColumn = db.transaction(() => {
      db.exec("DELETE FROM RulesContentIssue; ALTER TABLE RulesContentIssue DROP COLUMN detail");
      assert.throws(() => requireNormalizedArtifactState(db, before, beforePath), /Incomplete.*schema/);
      throw new Error("undo schema");
    });
    assert.throws(missingColumn, /undo schema/);
    const limited = structuredClone(before); limited.artifact!.scope = "limited";
    limited.artifact!.importable = false; limited.artifact!.limitations = ["synthetic limit"];
    assert.throws(() => requireNormalizedArtifactState(db, limited, beforePath), /Limited.*cannot be imported/);
    const changedInput = path.join(temp, "arbitrary.json"); write(changedInput, {...before, generatedAt: "2026-10-03T00:00:00.000Z"});
    assert.throws(() => requireNormalizedArtifactState(db, readGenerated(changedInput), changedInput));
    assert.deepEqual(snapshot(db), persisted);
    // The next accepted batch has genuinely different source fingerprints. The
    // predecessor must match historic importer.current rather than today's rules.
    const changedRules = new Database(rulesPath); changedRules.exec("INSERT INTO dnd_spell VALUES(1)"); changedRules.close();
    write(process.env.RULES_MANIFEST_PATH!, {database: {sha256: sha256File(rulesPath)}});
    const nextCurrent = collect();
    assert.notEqual(current.rulesDb.sha256, nextCurrent.rulesDb.sha256);
    let after = structuredClone(before), afterPath = path.join(temp, "after.json"), activePreviousPath = beforePath;
    after.generatedAt = "2026-10-02T03:00:00.000Z";
    after.artifact!.provenance = nextCurrent;
    after.spells[0]!.canonicalName = "Synthetic Next Batch";
    write(afterPath, after);
    const context = {currentProvenance: nextCurrent, importedAt: "2026-10-02T04:00:00.000Z"};
    const step = (mode: "check" | "apply") => normalizedImportStep(db, afterPath, activePreviousPath, mode, context);
    db.exec(`CREATE TABLE Control(id INTEGER PRIMARY KEY, value TEXT);
      INSERT INTO Control VALUES(1,'protected');
      CREATE TABLE ExactControl(id INTEGER PRIMARY KEY, value INTEGER, bytes BLOB);
      INSERT INTO ExactControl VALUES(1,9007199254740992,X'000102');
      INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionText,updatedAt)
        VALUES('protected-chm',100,9,'zh','chm','原名','原文','2026-01-01');
      INSERT INTO I18nSpellSummaryText(id,spellId,rulebookId,lang,variant,summaryText,updatedAt)
        VALUES('summary',100,9,'zh','default','受保护摘要','2026-01-01');
      INSERT INTO SpellSearchDocument(spellId,lang,variant,name,body) VALUES('100','zh','chm','原名','原文');
      INSERT INTO SpellSearchIndexState VALUES(1,1,'2026-01-01',1)`);
    const protectedBaseline = snapshot(db);
    // Refuse both direct and step replacement before deleting any generated row.
    db.exec("INSERT INTO SpellListMarker(id,sourceKey,rulebookId,markers,sourceJson) VALUES('synthetic-source','synthetic-source',86,'M','{}')");
    try {
      const markedState = snapshot(db);
      for (const dryRun of [true, false]) assert.throws(() => importGenerated(db, readGenerated(afterPath), dryRun, afterPath, context), /SpellListMarker bindings/);
      for (const mode of ["check", "apply"] as const) assert.throws(() => step(mode), /SpellListMarker bindings/);
      assert.deepEqual(snapshot(db), markedState, "marker refusal changed content");
    } finally { db.exec("DELETE FROM SpellListMarker WHERE id='synthetic-source'"); }
    assert.deepEqual(snapshot(db), protectedBaseline);
    assert.deepEqual(step("check"), {mode: "check", state: "before", changed: false, wouldChange: true});
    assert.deepEqual(snapshot(db), protectedBaseline, "check mutated baseline");
    // Real importer SQL fails after it has replaced the build and inserted books.
    db.exec(`CREATE TRIGGER importer_fault BEFORE INSERT ON SpellContent
      BEGIN SELECT RAISE(ABORT,'real importer SQL fault'); END`);
    assert.equal(step("check").state, "before", "SQL fault incorrectly triggered in preflight");
    const faultBefore = snapshot(db);
    assert.throws(() => step("apply"), /real importer SQL fault/);
    assert.deepEqual(snapshot(db), faultBefore, "mid-import SQL failure did not roll back");
    db.exec("DROP TRIGGER importer_fault");
    // An importer-side trigger affecting a protected row must fail acceptance
    // and roll back the complete normalized step, even when all new rows match.
    db.exec(`CREATE TRIGGER protected_fault AFTER INSERT ON SpellContent
      BEGIN UPDATE Control SET value='corrupt'; END`);
    const protectedFaultBefore = snapshot(db);
    assert.throws(() => step("apply"), /changed protected rows\/schema/);
    assert.deepEqual(snapshot(db), protectedFaultBefore, "protected-scope failure did not roll back");
    db.exec("DROP TRIGGER protected_fault");
    db.exec(`CREATE TRIGGER integer_fault AFTER INSERT ON SpellContent
      BEGIN UPDATE ExactControl SET value=9007199254740993; END`);
    const exactBefore = db.prepare("SELECT * FROM ExactControl").safeIntegers().all();
    assert.throws(() => step("apply"), /changed protected rows\/schema/);
    assert.deepEqual(db.prepare("SELECT * FROM ExactControl").safeIntegers().all(), exactBefore,
      "integer drift hidden by JS number rounding escaped protected scope");
    db.exec("DROP TRIGGER integer_fault");
    for (const stale of ["rulesDb", "rulesManifest", "publications", "migrations"] as const) {
      const wrong = structuredClone(context);
      const fingerprint = stale === "rulesDb" ? wrong.currentProvenance.rulesDb : stale === "rulesManifest"
        ? wrong.currentProvenance.canonicalInputs.rulesManifest! : stale === "publications"
          ? wrong.currentProvenance.canonicalInputs.rulebookPublicationMetadata! : wrong.currentProvenance.contentMigrations;
      fingerprint.sha256 = "0".repeat(64);
      assert.throws(() => normalizedImportStep(db, afterPath, beforePath, "apply", wrong), /provenance does not match/);
      assert.deepEqual(snapshot(db), protectedBaseline);
    }
    assert.deepEqual(step("apply"), {mode: "apply", state: "after", changed: true, wouldChange: false});
    assert.equal((db.prepare("SELECT canonicalName FROM SpellContent WHERE id=?").get(after.spells[0]!.id) as {canonicalName: string}).canonicalName, "Synthetic Next Batch");
    assert.deepEqual(db.prepare("SELECT * FROM SpellContent WHERE id<>?").all(after.spells[0]!.id),
      (protectedBaseline.rows.find(row => row[0] === "SpellContent")![1] as {id: string}[]).filter(row => row.id !== after.spells[0]!.id), "control spells changed");
    for (const [table, rows] of protectedBaseline.rows) {
      if (!["RulesContentBuild", ...Object.keys(tables)].includes(String(table))) {
        assert.deepEqual(db.prepare(`SELECT * FROM "${table}"`).all(), rows, `protected ${table} changed`);
      }
    }
    // Simulate process interruption only after commit: the next invocation must
    // recognize persisted after without touching importer timestamps or rows.
    const committed = snapshot(db), writes = db.prepare("SELECT total_changes() AS n").get();
    assert.deepEqual(step("check"), {mode: "check", state: "after", changed: false, wouldChange: false});
    assert.deepEqual(step("apply"), {mode: "apply", state: "after", changed: false, wouldChange: false});
    assert.deepEqual(db.prepare("SELECT total_changes() AS n").get(), writes, "repeat executed writes");
    assert.deepEqual(snapshot(db), committed, "repeat changed importedAt/metadata");
    const second = structuredClone(after), secondPath = path.join(temp, "second.json");
    second.generatedAt = "2026-10-02T05:00:00.000Z"; second.spells[0]!.slug = "synthetic-second-batch";
    write(secondPath, second);
    activePreviousPath = afterPath; afterPath = secondPath; after = second;
    assert.equal(step("check").state, "before");
    assert.equal(step("apply").changed, true);
    assert.equal((db.prepare("SELECT canonicalName FROM SpellContent WHERE id=?").get(after.spells[0]!.id) as {canonicalName: string}).canonicalName,
      "Synthetic Next Batch", "second batch lost first accepted change");
    const secondCommit = snapshot(db);
    assert.equal(step("apply").changed, false);
    assert.deepEqual(snapshot(db), secondCommit);
    const first = after.spells[0]!;
    const fields = [{targetId: first.legacySpellId, rulebookId: 86, field: "name" as const, text: "合成名称",
      origin: {kind: "native" as const, sourceKey: "synthetic"}, review: {}},
      {targetId: first.legacySpellId, rulebookId: 86, field: "body" as const, text: "合成正文", html: "<p>合成正文</p>",
        origin: {kind: "native" as const, sourceKey: "synthetic"}, review: {}}];
    const plan = planFinalOverlay(db, fields, {sourceRevisions: {original: "5".repeat(40)}, changedNames: 1, changedBodies: 1,
      retained: {names: [], bodies: []}, sourceQuestionIds: []}, verifyFullNormalized(db, after, afterPath, nextCurrent), "7".repeat(40),
      db.prepare("SELECT id,spellId,rulebookId,lang,variant,summaryText,sourceKey,sourceName,sourceKind,reviewStatus FROM I18nSpellSummaryText").all() as import("../short-desc/summary-row-schema").SummaryRow[]);
    applyFinalOverlay(db, plan);
    const annotated = snapshot(db);
    requireNormalizedArtifactState(db, after, afterPath);
    assert.equal(step("apply").changed, false);
    assert.deepEqual(snapshot(db), annotated, "known downstream metadata changed");
    const third = structuredClone(after), thirdPath = path.join(temp, "third.json");
    third.generatedAt = "2026-10-02T06:00:00.000Z"; third.spells[0]!.canonicalName = "Third synthetic batch";
    write(thirdPath, third);
    assert.throws(() => normalizedImportStep(db, thirdPath, afterPath, "apply", context), /Annotated predecessor/);
    assert.deepEqual(snapshot(db), annotated, "annotated predecessor was overwritten");
    for (const mutate of [
      (meta: any) => {meta.overlays.scFinalNameBody.acceptedRevision = "0".repeat(40);},
      (meta: any) => {meta.overlays.scFinalNameBody.semanticQa.wholeBookComplete = true;},
      (meta: any) => {meta.overlays.scFinalNameBody.summaryQa.acceptedRevision = "0".repeat(40);},
      (meta: any) => {meta.overlays.scFinalNameBody.targets = 99999;},
      (meta: any) => {meta.overlays.scFinalNameBody.summaryQa.canonicalRows++;},
      (meta: any) => {meta.overlays.scFinalNameBody.summaryQa = null; meta.overlays.scFinalNameBody.semanticQa.summaries = "pending";},
      (meta: any) => {meta.overlays.scFinalNameBody.readerNoteAddendum = null;},
      (meta: any) => {meta.overlays.scFinalNameBody.unknown = true;},
    ]) {
      const corrupt = db.transaction(() => {
        const meta = JSON.parse(String((db.prepare("SELECT buildMetaJson FROM RulesContentBuild").get() as {buildMetaJson: string}).buildMetaJson));
        mutate(meta); db.prepare("UPDATE RulesContentBuild SET buildMetaJson=?").run(JSON.stringify(meta));
        assert.throws(() => step("check")); assert.throws(() => step("apply")); throw new Error("undo malformed downstream");
      });
      assert.throws(corrupt, /undo malformed downstream/);
      assert.deepEqual(snapshot(db), annotated);
    }
    // Exercise maintained root/package entrypoints plus an unrelated caller CWD
    // against a task-owned tiny file DB. Relative artifact/--content-db paths are
    // resolved from the code checkout, not those three caller directories.
    const filePath = path.join(temp, "cli-content.sqlite");
    const fileDb = new Database(filePath); schema(fileDb);
    importGenerated(fileDb, before, false, beforePath, {currentProvenance: current, importedAt: "2026-10-02T02:00:00.000Z"});
    fileDb.close();
    const relativeArgs = ["--previous-input", path.relative(root, beforePath), "--input", path.relative(root, afterPath),
      "--content-db", path.relative(root, filePath)];
    const cli = path.join(__dirname, "import-step-cli.ts");
    const invoke = (cwd: string, args: string[], npm = false) => {
      const npmCli = process.env.npm_execpath;
      const invocation = npm && npmCli
        ? [npmCli, "run", ...(cwd === root ? ["-w", "data-tools"] : []), "rules:content:step", "--", ...args]
        : ["--import", pathToFileURL(require.resolve("tsx")).href, cli, ...args];
      const result = spawnSync(process.execPath, invocation, {cwd, env: {...process.env}, encoding: "utf8"});
      assert.ifError(result.error);
      return result;
    };
    for (const cwd of [root, path.join(root, "data-tools"), temp]) {
      const bytes = fs.readFileSync(filePath), result = invoke(cwd, relativeArgs, cwd !== temp);
      assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /"state": "before"/);
      assert.deepEqual(fs.readFileSync(filePath), bytes, "CLI check wrote bytes");
    }
    // Use an existing sibling checkout as caller when this test runs in a
    // worktree; no new checkout/runtime and no inputs from that checkout.
    const commonGit = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {cwd: root, encoding: "utf8"}).trim();
    const primary = path.dirname(commonGit);
    if (primary !== root && fs.existsSync(path.join(primary, "package.json"))) {
      const bytes = fs.readFileSync(filePath), result = invoke(primary, relativeArgs);
      assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /"state": "before"/);
      assert.deepEqual(fs.readFileSync(filePath), bytes, "sibling caller check wrote bytes");
    }
    const applied = invoke(root, [...relativeArgs, "--apply"], true);
    assert.equal(applied.status, 0, applied.stderr); assert.match(applied.stdout, /"changed": true/);
    const appliedBytes = fs.readFileSync(filePath);
    const repeat = invoke(path.join(root, "data-tools"), [...relativeArgs, "--apply"], true);
    assert.equal(repeat.status, 0, repeat.stderr); assert.match(repeat.stdout, /"changed": false/);
    assert.deepEqual(fs.readFileSync(filePath), appliedBytes, "file repeat wrote bytes");
    assert.notEqual(invoke(root, ["--input", afterPath, "--apply"]).status, 0, "missing predecessor accepted on repeat");
    const missing = path.join(temp, "missing.sqlite");
    const missingResult = invoke(root, [...relativeArgs.slice(0, 4), "--content-db", missing, "--apply"]);
    assert.notEqual(missingResult.status, 0); assert(!fs.existsSync(missing), "missing database created");
    assert.notEqual(invoke(root, [...relativeArgs.slice(0, 4), "--content-db", rulesPath, "--apply"]).status, 0, "configured rules target accepted");
    const statePath = path.join(temp, "app-state.sqlite"), stateDb = new Database(statePath);
    stateDb.exec("CREATE TABLE User(id TEXT PRIMARY KEY); INSERT INTO User VALUES('control')"); stateDb.close();
    const stateBytes = fs.readFileSync(statePath);
    assert.notEqual(invoke(root, [...relativeArgs.slice(0, 4), "--content-db", statePath, "--apply"]).status, 0);
    assert.deepEqual(fs.readFileSync(statePath), stateBytes, "synthetic app-state mutated");
    const staleArtifact = structuredClone(after); staleArtifact.artifact!.provenance.rulesDb.sha256 = "0".repeat(64);
    const stalePath = path.join(temp, "stale.json"); write(stalePath, staleArtifact);
    assert.notEqual(invoke(root, ["--previous-input", beforePath, "--input", stalePath, "--content-db", filePath, "--apply"]).status, 0);
    assert.deepEqual(fs.readFileSync(filePath), appliedBytes, "stale current provenance mutated target");
  } finally {db.close();}
  console.log("Normalized import step portable tests passed (complete rows/build, SQL rollback, protected scope, two batches, exact repeat, CLI paths)");
}
main().finally(() => fs.rmSync(temp, {recursive: true, force: true}));
