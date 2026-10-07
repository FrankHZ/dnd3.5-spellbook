import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {prepareHandoffFixture} from "./db-english-test-fixtures";
import {repoRoot} from "../shared/env";
import {cityscapeOverlay} from "./db-english-overlay";
import {validateQaInputs} from "./qa";
import {bindCommittedInputs, validateHandoffEvidence} from "./db-english-handoff";
import {contentSearchStep} from "../db/content-search-step";
import type {NormalizedRulesContent} from "../rules-content/normalize";

export function scFixtureEnvelope(field: "name" | "body") {
  const revision = "0688739d92a2aa9fb3eceeb444daa7260e711058";
  const coverage = "a9cbe07747b1bc908ff4ebcd24244e38e58cb411";
  const pages = [{sourceId: "synthetic", pageIndex: 0, printedPage: 1, spanRefs: [[0, 0, 0]]}];
  const rowRef = "dice-qa/books/86/issue-259/review-a/joint-review-results.jsonl:1";
  const review = {disposition: "source-reviewed-retention", revision: coverage, rowRef, sourcePages: pages,
    priorDisposition: "source-correct", originalEntry: {revision: coverage, rowRef, sourcePages: pages,
      englishDisposition: "source-correct"}, ...(field === "body" ? {htmlEvidence: "synthetic parity", priorReviewBoundHtml: false, newVisualHtmlReview: false} : {})};
  return JSON.stringify({schemaVersion: 1, acceptedRevision: revision, targetId: 4001, field, language: "zh",
    origin: {kind: "chm", sourceKey: "sc-source"}, input: {revision, path: "dice-qa/books/86/issue-365/field-dispositions.jsonl",
      targetId: 4001, field}, evidence: review, review});
}

/** Full maintained migrations/importer and complete synthetic QA; no operator copy. */
export function prepareOverlayFixture(temp: string, contentFile?: string) {
  const f = prepareHandoffFixture(temp, contentFile);
  process.env.DATA_REPO_PATH = f.root;
  process.env.RULES_DATABASE_URL = `file:${f.rulesPath}`;
  process.env.RULES_MANIFEST_PATH = path.join(f.root, "rules-db-manifest.json");
  const {collectImportContext, importGenerated, GENERATED_CONTENT_TABLES} = require("../rules-content/cli") as typeof import("../rules-content/cli");
  const fullPath = path.join(temp, "normalized.json");
  const db = new Database(f.contentPath);
  try {
    for (const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {name: string}[]) db.exec(`DROP TABLE "${name}"`);
    const migrations = path.join(repoRoot(), "server/db/content/migrations");
    for (const name of fs.readdirSync(migrations).sort()) if (name !== "migration_lock.toml") db.exec(fs.readFileSync(path.join(migrations, name, "migration.sql"), "utf8"));
    const operations = fs.readFileSync(path.join(repoRoot(), "server/db/content/fixtures/portable/normalized-rules-spells.jsonl"), "utf8")
      .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as {table: string; data: Record<string, any>});
    const arrays = Object.fromEntries(Object.entries(GENERATED_CONTENT_TABLES).map(([table, key]) => {
      const names = (db.pragma(`table_info(${table})`) as {name: string}[]).map(c => c.name);
      return [key, operations.filter(r => r.table === table).map(r => Object.fromEntries(names.map(name => [name, r.data[name] ?? (name === "verified" ? false : null)])))];
    })) as Record<string, Record<string, any>[]>;
    const book = arrays.rulebooks!.find(r => r.legacyRulebookId === 6)!;
    for (const id of [53, 86, 20]) arrays.rulebooks!.push({...book, id: `rulebook:${id}`, legacyRulebookId: id, editionId: 5, name: `Synthetic book ${id}`, slug: `book-${id}`});
    const spell = arrays.spells!.find(r => r.legacySpellId === 100)!;
    for (const id of [355, 356, 357, 358, 359, 360, 361, 362, 4001, 99]) {
      const text = f.english.get(id)?.description ?? `Synthetic English control ${id}`;
      arrays.spells!.push({...spell, id: `spell:${id}`, legacySpellId: id, canonicalName: `Spell ${id}`, slug: `spell-${id}`,
        sourceRulebookId: id === 4001 ? 86 : id === 99 ? 20 : 53, descriptionText: text, descriptionHtml: `<p>${text}</p>`});
    }
    const list = arrays.listEntries!.find(r => r.spellId === "spell:100" && r.listType === "class")!;
    assert(list);
    for (const id of [355, 356, 357, 358, 359, 360, 361, 362]) arrays.listEntries!.push({...list,
      id: `list:${id}`, spellId: `spell:${id}`, ownerLegacyId: 1, level: 3, rulebookId: 53, sourceRowId: id});
    const {sha256File} = require("../rules-content/artifact") as typeof import("../rules-content/artifact");
    fs.writeFileSync(process.env.RULES_MANIFEST_PATH, JSON.stringify({database: {sha256: sha256File(f.rulesPath)}}));
    fs.mkdirSync(path.join(f.root, "rulebook-publications"));
    fs.writeFileSync(path.join(f.root, "rulebook-publications/publications.jsonl"), "synthetic publication");
    const context = collectImportContext();
    const full = {schemaVersion: 2, generatorVersion: "rules-content-normalizer-v9", generatedAt: "2026-10-02T01:00:00.000Z",
      counts: Object.fromEntries(Object.entries(arrays).map(([key, rows]) => [key, rows.length])), ...arrays,
      artifact: {schemaVersion: 1, scope: "full", importable: true, limitations: [],
        sourceTotals: {rulebooks: arrays.rulebooks!.length, spells: arrays.spells!.length, descriptors: 0, classListEntries: 0, domainListEntries: 0},
        provenance: context.currentProvenance}} as unknown as NormalizedRulesContent;
    fs.writeFileSync(fullPath, JSON.stringify(full));
    importGenerated(db, full, false, fullPath, context);
    db.prepare(`INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionHtml,descriptionText,sourceKey,createdAt,updatedAt,nameProvenanceJson,bodyProvenanceJson)
      VALUES('sc',4001,86,'zh','effective','SC合成名称','<p>SC合成正文</p>','SC合成正文','sc-source','2026-01-01 00:00:00','2026-01-02 00:00:00',?,?)`)
      .run(scFixtureEnvelope("name"), scFixtureEnvelope("body"));
    db.exec(`INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionText,sourceKey,updatedAt)
      VALUES('other',99,20,'zh','chm','对照名称','controlchmtoken','other-source','2026-01-02 00:00:00');
      INSERT INTO I18nSpellSummaryText(id,spellId,rulebookId,lang,variant,summaryText,reviewStatus,updatedAt)
        VALUES('summary',355,53,'zh','chm','controlsummarytoken','accepted','2026-01-02 00:00:00');
      CREATE TABLE Control(id INTEGER PRIMARY KEY,payload BLOB,counter INTEGER,value TEXT);
      INSERT INTO Control VALUES(1,x'00ff0080',9007199254740992,'control');`);
    const build = db.prepare("SELECT * FROM RulesContentBuild").get() as {id: string; buildMetaJson: string};
    const meta = JSON.parse(build.buildMetaJson);
    meta.overlays = {scFinalNameBody: {schema: "sc-final-name-body.v1", acceptedRevision: "0688739d92a2aa9fb3eceeb444daa7260e711058",
      helperRevision: "a".repeat(40), sourceRevisions: {coverage: "a9cbe07747b1bc908ff4ebcd24244e38e58cb411"}, targets: 1, fields: 2,
      changedNames: 0, changedBodies: 0, retained: {names: [4001], bodies: [4001]}, sourceQuestionIds: [],
      semanticQa: {nameBody: "accepted-source-bound", summaries: "pending", extraRelationships: "pending", wholeBookComplete: false},
      search: "rebuild-after-final-text-and-summaries", activation: false}};
    db.prepare("UPDATE RulesContentBuild SET buildMetaJson=? WHERE id=?").run(JSON.stringify(meta), build.id);
    contentSearchStep(db, "apply");
  } finally {db.close();}
  fs.writeFileSync(path.join(f.book, "synthetic-overlay-evidence.json"), JSON.stringify(f.e));
  f.git("add", "dice-baselines", "rules-db-manifest.json", "rulebook-publications");
  f.git("-c", "user.name=Portable", "-c", "user.email=portable@example.invalid", "commit", "-qm", "synthetic QA evidence");
  const committed = f.git("rev-parse", "HEAD");
  // Synthetic certification is confined to this test helper. Production CLI
  // always rejects this Git revision and authenticates the fixed real handoff.
  const authenticate = () => {
    bindCommittedInputs(f.root, committed, [f.decisions, path.join(f.intake, "candidates.jsonl")]);
    const qa = validateQaInputs(f.args);
    validateHandoffEvidence(qa, f.e); return f.e;
  };
  return {...f, authenticate, fullPath, committed};
}

if (require.main === module) {
  const [temp, file, action = "prepare"] = process.argv.slice(2);
  assert(temp && file);
  if (action === "prepare") {
    const f = prepareOverlayFixture(temp, file);
    console.log(JSON.stringify({targets: f.e.accepted.map(r => r.targetId), accepted: f.e.accepted, residual: f.e.unresolved[0]!.english}));
  } else {
    assert(action === "apply" || action === "check");
    const root = path.join(temp, "data"), rulesPath = path.join(temp, "rules.sqlite");
    const book = path.join(root, "dice-baselines/issue-520/qa/books/53");
    const evidenceFile = path.join(book, "synthetic-overlay-evidence.json");
    const {execFileSync} = require("node:child_process") as typeof import("node:child_process");
    const revision = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {encoding: "utf8"}).trim();
    const authenticate = () => {
      bindCommittedInputs(root, revision, [evidenceFile, path.join(book, "decisions.jsonl")]);
      const e = JSON.parse(fs.readFileSync(evidenceFile, "utf8"));
      const qa = validateQaInputs(["--data-root", root, "--baseline-dir", path.join(root, "dice-baselines/issue-520"),
        "--rules-db", rulesPath, "--content-db", file, "--rulebook-id", "53"]);
      validateHandoffEvidence(qa, e); return e;
    };
    const db = new Database(file, {readonly: action === "check", fileMustExist: true});
    try {console.log(JSON.stringify(cityscapeOverlay(db, authenticate, action)));}
    finally {db.close();}
  }
}
