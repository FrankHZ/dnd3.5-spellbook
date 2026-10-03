import assert from "node:assert/strict";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { queryNormalizedFullTextSearch as search, type NormalizedFullTextSearchInput } from "#server/services/spells/spells.repo.normalized-content";
import { contentPrisma } from "#server/lib/content-prisma-client";

const root = path.resolve(__dirname, "../..");
const file = process.env.CONTENT_DATABASE_URL!.slice(5);
assert(path.basename(path.dirname(file)).startsWith("spellbook-api-test-"));
const temp = path.join(path.dirname(file), "sequence-inputs");
type Inputs = {normalizedInput: string; previousNormalizedInput: string; summaryInput: string; previousSummaryInput: string};
type Observation = {application: string; preflight?: {state: string}};
type SequenceResult = {complete: boolean; normalized: Observation; summaries: Observation; search: Observation; searchRecheckRequired: boolean};
let fixture: {first: Inputs; second: Inputs};
let db: Database.Database;
const sequenceEnv = {...process.env, DATA_REPO_PATH: temp, RULES_DATABASE_URL: `file:${path.join(temp, "rules.sqlite")}`,
  APP_STATE_DATABASE_URL: `file:${path.join(temp, "app-state.sqlite")}`, RULES_MANIFEST_PATH: path.join(temp, "rules-db-manifest.json")};

function sequence(inputs: Inputs, apply = false) {
  const result = spawnSync(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"),
    path.join(root, "data-tools/src/db/content-sequence-cli.ts"), "--content-db", file,
    "--previous-normalized-input", inputs.previousNormalizedInput, "--normalized-input", inputs.normalizedInput,
    "--previous-summary-input", inputs.previousSummaryInput, "--summary-input", inputs.summaryInput, ...(apply ? ["--apply"] : [])],
  {cwd: temp, env: sequenceEnv, encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as SequenceResult;
}
async function ids(q: string, i18n: NormalizedFullTextSearchInput["i18n"] = {lang: "en"}) {
  const result = await search({q, i18n, rulebookIds: [6], classIds: [], domainIds: [], level: null,
    taxonomyFilters: {schoolIds: [], subschoolIds: [], descriptorIds: [], descriptorBuckets: []}, componentFilters: {componentKeys: []},
    mechanicFilters: {castingTimeKeys: [], rangeKeys: [], durationKeys: [], savingThrowKeys: [], spellResistanceKeys: []}, page: 1, pageSize: 100});
  expect(result?.total).toBe(result?.ids.length);
  return result?.ids;
}
beforeAll(() => {
  const initial = new Database(file);
  initial.exec("DROP TABLE SpellSearchDocument");
  for (const {name} of initial.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name: string}[]) {
    initial.exec(`DROP TABLE "${name}"`);
  }
  initial.close();
  fs.mkdirSync(temp);
  const setup = spawnSync(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"),
    path.join(root, "data-tools/src/db/content-sequence-test-fixtures.ts"), temp, file],
  {cwd: temp, env: sequenceEnv, encoding: "utf8"});
  assert.ifError(setup.error); assert.equal(setup.status, 0, setup.stderr);
  fixture = JSON.parse(setup.stdout) as typeof fixture;
  db = new Database(file);
});
afterAll(async () => {
  await contentPrisma.$disconnect(); db?.close();
});

it("serves both accepted handoffs through the real search consumer after the fixed content sequence", async () => {
  const protectedControl = db.prepare("SELECT * FROM Control").safeIntegers().get();
  const protectedTexts = db.prepare("SELECT * FROM I18nSpellText ORDER BY id").all();
  const controlSummary = db.prepare("SELECT * FROM I18nSpellSummaryText WHERE spellId=101").get();
  const untouched = db.prepare("SELECT * FROM SpellContent WHERE legacySpellId NOT IN (100,2,9876) ORDER BY id").all();
  expect(await ids("oldbodytoken")).toEqual([100]);
  expect(await ids("oldsummarytoken")).toEqual([100]);
  expect(await ids("addedsummarytoken")).toEqual([]);
  const before = sequence(fixture.first);
  expect(before.complete).toBe(false); expect(before.search.preflight?.state).toBe("current");
  expect(before.searchRecheckRequired).toBe(true);
  const first = sequence(fixture.first, true);
  expect(first.complete).toBe(true);
  expect([first.normalized.application, first.summaries.application, first.search.application]).toEqual(["committed", "committed", "committed"]);
  for (const token of ["oldbodytoken", "oldsummarytoken", "zhsummaryoldtoken"]) {
    expect(await ids(token)).toEqual([]); expect(await ids(token, {lang: "zh"})).toEqual([]);
  }
  for (const token of ["newbodytoken", "newsummarytoken"]) expect(await ids(token)).toEqual([100]);
  for (const token of ["addedbodytoken", "addedsummarytoken"]) expect(await ids(token)).toEqual([9876]);
  expect(await ids("zhsummarynewtoken", {lang: "zh"})).toEqual([100]);
  expect(await ids("zhsummarynewtoken", {lang: "zh", variant: "effective"})).toEqual([100]);
  expect(await ids("zhsummarynewtoken", {lang: "zh", variant: "chm"})).toEqual([100]);
  expect(await ids("effectivebodytoken", {lang: "zh"})).toEqual([100]);
  expect(await ids("effectivebodytoken", {lang: "zh", variant: "chm"})).toEqual([]);
  expect(await ids("chmbodytoken", {lang: "zh", variant: "chm"})).toEqual([100]);
  expect(await ids("chmbodytoken", {lang: "zh"})).toEqual([]);
  expect(await ids("othersummarytoken", {lang: "zh", variant: "other"})).toEqual([100]);
  expect(await ids("othersummarytoken", {lang: "zh"})).toEqual([]);
  expect(await ids("controlsummarytoken")).toEqual([101]);
  const second = sequence(fixture.second, true);
  expect(second.complete).toBe(true);
  expect(await ids("secondbodytoken")).toEqual([2]);
  expect(await ids("secondsummarytoken")).toEqual([9876]);
  expect(await ids("addedsummarytoken")).toEqual([]);
  expect(await ids("newbodytoken")).toEqual([100]);
  expect(await ids("newsummarytoken")).toEqual([100]);
  expect(await ids("controlsummarytoken")).toEqual([101]);
  const build = db.prepare("SELECT * FROM RulesContentBuild").get();
  const summaries = db.prepare("SELECT * FROM I18nSpellSummaryText ORDER BY id").all();
  const searchState = db.prepare("SELECT * FROM SpellSearchIndexState").get();
  const repeat = sequence(fixture.second, true);
  expect(repeat.complete).toBe(true);
  expect([repeat.normalized.application, repeat.summaries.application, repeat.search.application]).toEqual(["no-op", "no-op", "no-op"]);
  expect(db.prepare("SELECT * FROM RulesContentBuild").get()).toEqual(build);
  expect(db.prepare("SELECT * FROM I18nSpellSummaryText ORDER BY id").all()).toEqual(summaries);
  expect(db.prepare("SELECT * FROM SpellSearchIndexState").get()).toEqual(searchState);
  expect(db.prepare("SELECT * FROM Control").safeIntegers().get()).toEqual(protectedControl);
  expect(db.prepare("SELECT * FROM I18nSpellText ORDER BY id").all()).toEqual(protectedTexts);
  expect(db.prepare("SELECT * FROM I18nSpellSummaryText WHERE spellId=101").get()).toEqual(controlSummary);
  expect(db.prepare("SELECT * FROM SpellContent WHERE legacySpellId NOT IN (100,2,9876) ORDER BY id").all()).toEqual(untouched);
}, 30000);
