import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { NormalizedRulesContent } from "../rules-content/normalize";
import type { ContentSequenceInputs } from "./content-sequence";

export const sequenceTestRoot = path.resolve(__dirname, "../../..");
const tables = {RulebookContent: "rulebooks", SpellContent: "spells", SpellAppearance: "appearances",
  SpellTaxonomyFacet: "taxonomyFacets", SpellListEntry: "listEntries", SpellComponent: "components",
  SpellMechanicFacet: "mechanicFacets", RulesContentIssue: "issues"} as const;
export function writeJson(file: string, value: unknown) {fs.writeFileSync(file, JSON.stringify(value), "utf8");}
export function writeSummaries(file: string, rows: unknown[]) {
  fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
}
export function sequenceSnapshot(db: Database.Database) {
  const key = (row: unknown[]) => JSON.stringify(row, (_key, value) => typeof value === "bigint" ? {integer: value.toString()} : value);
  return {schema: db.prepare("SELECT * FROM sqlite_master ORDER BY name").safeIntegers().all(),
    rows: (db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {name: string}[])
      .map(({name}) => [name, (db.prepare(`SELECT * FROM "${name}"`).safeIntegers().raw().all() as unknown[][])
        .sort((a, b) => key(a).localeCompare(key(b)))] as [string, unknown[][]])};
}

/** Task-owned tiny accepted handoffs with real maintained provenance collection.
 * No operator/private inputs, context overrides or copied databases. */
export async function prepareSequenceFixture(temp: string, file: string) {
  process.env.DATA_REPO_PATH = temp;
  process.env.RULES_DATABASE_URL = `file:${path.join(temp, "rules.sqlite")}`;
  process.env.APP_STATE_DATABASE_URL = `file:${path.join(temp, "app-state.sqlite")}`;
  process.env.RULES_MANIFEST_PATH = path.join(temp, "rules-db-manifest.json");
  const {collectImportContext, importGenerated} = await import("../rules-content/cli.js");
  const {sha256File} = await import("../rules-content/artifact.js");
  const {importSummaryRows} = await import("../short-desc/import.js");
  const {readSummaryJsonlText} = await import("../short-desc/summary-row-schema.js");
  const {contentSearchStep} = await import("./content-search-step.js");
  execFileSync("git", ["init", "-q", temp]);
  fs.writeFileSync(path.join(temp, "source.txt"), "synthetic input", "utf8");
  execFileSync("git", ["-C", temp, "add", "source.txt"]);
  execFileSync("git", ["-C", temp, "-c", "user.name=Portable", "-c", "user.email=portable@example.invalid",
    "commit", "-qm", "synthetic input"]);
  const rulesFile = process.env.RULES_DATABASE_URL.slice(5);
  const rules = new Database(rulesFile); rules.exec("CREATE TABLE dnd_spell(id INTEGER PRIMARY KEY)"); rules.close();
  writeJson(process.env.RULES_MANIFEST_PATH, {database: {sha256: sha256File(rulesFile)}});
  const publications = path.join(temp, "rulebook-publications/publications.jsonl");
  fs.mkdirSync(path.dirname(publications)); fs.writeFileSync(publications, "synthetic publication", "utf8");
  const db = new Database(file);
  const migrations = path.join(sequenceTestRoot, "server/db/content/migrations");
  for (const name of fs.readdirSync(migrations).sort()) {
    if (name !== "migration_lock.toml") db.exec(fs.readFileSync(path.join(migrations, name, "migration.sql"), "utf8"));
  }
  const operations = ["normalized-rules-spells.jsonl", "rules-content-builds.jsonl"].flatMap(name =>
    fs.readFileSync(path.join(sequenceTestRoot, "server/db/content/fixtures/portable", name), "utf8")
      .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as {table: string; data: Record<string, unknown>}));
  const arrays = Object.fromEntries(Object.entries(tables).map(([table, key]) => {
    const names = (db.pragma(`table_info(${table})`) as {name: string}[]).map(c => c.name);
    return [key, operations.filter(row => row.table === table).map(row =>
      Object.fromEntries(names.map(name => [name, row.data[name] ?? (name === "verified" ? false : null)])))];
  })) as Record<string, Array<Record<string, unknown>>>;
  arrays.spells!.forEach(row => {row.sourceRulebookId = 6;});
  arrays.spells!.find(row => row.legacySpellId === 100)!.descriptionText = "oldbodytoken";
  const before = {schemaVersion: 2, generatorVersion: "rules-content-normalizer-v9", generatedAt: "2026-10-02T01:00:00.000Z",
    counts: Object.fromEntries(Object.entries(arrays).map(([key, rows]) => [key, rows.length])), ...arrays,
    artifact: {schemaVersion: 1, scope: "full", importable: true, limitations: [],
      sourceTotals: {rulebooks: arrays.rulebooks!.length, spells: arrays.spells!.length, descriptors: 0,
        classListEntries: 0, domainListEntries: 0}, provenance: collectImportContext().currentProvenance}} as unknown as NormalizedRulesContent;
  const summary = (spellId: number, summaryText: string, lang = "en", variant = "imarvin") => ({schemaVersion: 1,
    spellId, rulebookId: 6, lang, variant, summaryText, sourceKey: `synthetic:${spellId}:${lang}:${variant}`,
    sourceName: "Synthetic", sourceKind: "reviewed-summary-correction", reviewStatus: "accepted"});
  const beforeSummaries = [summary(100, "oldsummarytoken"), summary(101, "controlsummarytoken"),
    summary(100, "zhsummaryoldtoken", "zh", "chm"), summary(100, "othersummarytoken", "zh", "other")];
  const beforePath = path.join(temp, "before.json"), beforeSummaryPath = path.join(temp, "before.jsonl");
  writeJson(beforePath, before); writeSummaries(beforeSummaryPath, beforeSummaries);
  importGenerated(db, before, false, beforePath, {...collectImportContext(), importedAt: "2026-10-02T02:00:00.000Z"});
  db.transaction(() => importSummaryRows(db, readSummaryJsonlText(fs.readFileSync(beforeSummaryPath, "utf8")).rows, false))();
  db.exec(`UPDATE I18nSpellSummaryText SET createdAt='2026-01-01 00:00:00',updatedAt='2026-01-02 00:00:00';
    CREATE TABLE Control(id INTEGER PRIMARY KEY,payload BLOB,counter INTEGER,value TEXT);
    INSERT INTO Control VALUES(1,x'00ff0080',9007199254740992,'control');
    INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionText,updatedAt)
      VALUES('chm',100,6,'zh','chm','合成名称','chmbodytoken','2026-01-01 00:00:00'),
            ('effective',100,6,'zh','effective','合成审核名称','effectivebodytoken','2026-01-01 00:00:00'),
            ('other',100,6,'zh','other','合成其他名称','otherbodytoken','2026-01-01 00:00:00');`);
  contentSearchStep(db, "apply");
  db.close();
  // Genuine changed source fingerprint in the next handoff. Historic before
  // still matches its stored generation/importer provenance, not today's rules.
  const nextRules = new Database(rulesFile); nextRules.exec("INSERT INTO dnd_spell VALUES(1)"); nextRules.close();
  writeJson(process.env.RULES_MANIFEST_PATH, {database: {sha256: sha256File(rulesFile)}});
  const after = structuredClone(before);
  after.artifact!.provenance = collectImportContext().currentProvenance;
  after.generatedAt = "2026-10-02T03:00:00.000Z";
  after.spells.find(row => row.legacySpellId === 100)!.descriptionText = "newbodytoken";
  const added = {...after.spells.find(row => row.legacySpellId === 100)!, id: "spell:9876", legacySpellId: 9876,
    canonicalName: "Synthetic Addition", slug: "synthetic-addition", descriptionText: "addedbodytoken"};
  after.spells.push(added); after.counts.spells = after.spells.length; after.artifact!.sourceTotals.spells = after.spells.length;
  const afterSummaries = beforeSummaries.map(row => row.spellId === 100 && row.variant === "imarvin" ?
    {...row, summaryText: "newsummarytoken"} : row.variant === "chm" ? {...row, summaryText: "zhsummarynewtoken"} : row);
  afterSummaries.push(summary(9876, "addedsummarytoken"));
  const afterPath = path.join(temp, "after.json"), afterSummaryPath = path.join(temp, "after.jsonl");
  writeJson(afterPath, after); writeSummaries(afterSummaryPath, afterSummaries);
  const third = structuredClone(after); third.generatedAt = "2026-10-02T04:00:00.000Z";
  third.spells.find(row => row.legacySpellId === 2)!.descriptionText = "secondbodytoken";
  const thirdSummaries = afterSummaries.map(row => row.spellId === 9876 ? {...row, summaryText: "secondsummarytoken"} : row);
  const thirdPath = path.join(temp, "third.json"), thirdSummaryPath = path.join(temp, "third.jsonl");
  writeJson(thirdPath, third); writeSummaries(thirdSummaryPath, thirdSummaries);
  const first: ContentSequenceInputs = {normalizedInput: afterPath, previousNormalizedInput: beforePath,
    summaryInput: afterSummaryPath, previousSummaryInput: beforeSummaryPath};
  const second: ContentSequenceInputs = {normalizedInput: thirdPath, previousNormalizedInput: afterPath,
    summaryInput: thirdSummaryPath, previousSummaryInput: afterSummaryPath};
  return {first, second, before, after, third, beforeSummaries, afterSummaries, thirdSummaries};
}

// Test setup also runs in its own process so server compilation never imports
// data-tools source or changes its package root to accommodate a fixture.
if (require.main === module) {
  const [temp, file] = process.argv.slice(2);
  if (!temp || !file) throw new Error("Synthetic sequence fixture requires its owned temporary input directory and DB");
  prepareSequenceFixture(temp, file).then(({first, second}) => console.log(JSON.stringify({first, second})))
    .catch(error => {console.error(error); process.exitCode = 1;});
}
