import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import type { NormalizedFullTextSearchInput } from "#server/services/spells/spells.repo.normalized-content";
import { queryNormalizedFullTextSearch as search } from "#server/services/spells/spells.repo.normalized-content";
import { contentPrisma } from "#server/lib/content-prisma-client";

const root = path.resolve(__dirname, "../..");
// setup-test-dbs owns this disposable public fixture, isolated per test file.
const file = process.env.CONTENT_DATABASE_URL!.slice(5);
assert(path.basename(path.dirname(file)).startsWith("spellbook-api-test-"));
const temp = path.dirname(file);
const db = new Database(file);

function step(apply = false) {
  const run = spawnSync(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"),
    path.join(root, "data-tools/src/db/content-search-step-cli.ts"), "--content-db", file, ...(apply ? ["--apply"] : [])],
  {cwd: temp, env: process.env, encoding: "utf8"});
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout) as {state: string; changed: boolean};
}

beforeAll(async () => {
  // This consumer slice needs the full maintained schema instead of the setup's
  // intentionally minimal API shape. Replace only this test's disposable fixture.
  db.exec("DROP TABLE SpellSearchDocument");
  for (const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name: string}[]) {
    db.exec(`DROP TABLE "${name}"`);
  }
  const migrations = path.join(root, "server/db/content/migrations");
  for (const name of fs.readdirSync(migrations).sort()) {
    if (name !== "migration_lock.toml") db.exec(fs.readFileSync(path.join(migrations, name, "migration.sql"), "utf8"));
  }
  for (const file of ["normalized-rules-spells.jsonl", "rules-content-builds.jsonl", "i18n-spell-overlays.jsonl"]) {
    for (const line of fs.readFileSync(path.join(root, "server/db/content/fixtures/portable", file), "utf8").split(/\r?\n/).filter(Boolean)) {
      const {table, data} = JSON.parse(line) as {table: string; data: Record<string, unknown>};
      if (["I18nSpellText", "I18nSpellSummaryText"].includes(table) &&
        !db.prepare("SELECT 1 FROM SpellContent WHERE legacySpellId=?").get(data.spellId)) continue;
      if (table.startsWith("I18n")) data.updatedAt ??= "2026-10-02T00:00:00.000Z";
      const names = Object.keys(data);
      db.prepare(`INSERT INTO "${table}" (${names.map(name => `"${name}"`).join(",")}) VALUES (${names.map(() => "?").join(",")})`)
        .run(...Object.values(data).map(value => typeof value === "boolean" ? Number(value) : value));
    }
  }
});

afterAll(async () => {
  await contentPrisma.$disconnect();
  db.close();
});

async function ids(q: string, i18n: NormalizedFullTextSearchInput["i18n"] = {lang: "en"}) {
  const result = await search({q, i18n, rulebookIds: [4, 6], classIds: [], domainIds: [], level: null,
    taxonomyFilters: {schoolIds: [], subschoolIds: [], descriptorIds: [], descriptorBuckets: []},
    componentFilters: {componentKeys: []},
    mechanicFilters: {castingTimeKeys: [], rangeKeys: [], durationKeys: [], savingThrowKeys: [], spellResistanceKeys: []},
    page: 1, pageSize: 100});
  expect(result?.total).toBe(result?.ids.length);
  return result?.ids;
}

it("rebuilds committed batches for the real search consumer with variant/summary fallback and removed tokens", async () => {
  db.exec(`UPDATE SpellContent SET descriptionText='oldenglishtoken' WHERE legacySpellId=100;
    UPDATE I18nSpellText SET descriptionText='oldchinesetoken' WHERE spellId=100;
    INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionText,updatedAt)
      VALUES ('effective',100,6,'zh','effective','审核名称','oldeffectivetoken',CURRENT_TIMESTAMP),
             ('other',100,6,'zh','other','其他名称','oldothertoken',CURRENT_TIMESTAMP);
    INSERT INTO I18nSpellSummaryText(id,spellId,rulebookId,lang,variant,summaryText,reviewStatus,updatedAt)
      VALUES ('en-owner',100,6,'en','imarvin','oldenglishsummary','accepted',CURRENT_TIMESTAMP),
        ('zh-owner',100,6,'zh','chm','oldchinesesummary','accepted',CURRENT_TIMESTAMP),
        ('zh-other',100,6,'zh','other','oldothersummary','accepted',CURRENT_TIMESTAMP),
        ('zh-effective',100,6,'zh','effective','unselectedsummarytoken','accepted',CURRENT_TIMESTAMP),
        ('en-pending',100,6,'en','pending','pendingreviewtoken','review',CURRENT_TIMESTAMP);`);
  expect(step(true).changed).toBe(true);
  expect(await ids("oldenglishtoken")).toEqual([100]);
  expect(await ids("oldeffectivetoken", {lang: "zh"})).toEqual([100]);
  db.exec(`UPDATE SpellContent SET descriptionText='newenglishtoken' WHERE legacySpellId=100;
    UPDATE I18nSpellText SET descriptionText='newchinesetoken' WHERE spellId=100 AND variant='chm';
    UPDATE I18nSpellText SET descriptionText='neweffectivetoken' WHERE spellId=100 AND variant='effective';
    UPDATE I18nSpellText SET descriptionText='newothertoken' WHERE spellId=100 AND variant='other';
    UPDATE I18nSpellSummaryText SET summaryText='newenglishsummary' WHERE id='en-owner';
    UPDATE I18nSpellSummaryText SET summaryText='newchinesesummary' WHERE id='zh-owner';
    UPDATE I18nSpellSummaryText SET summaryText='newothersummary' WHERE id='zh-other';`);
  // Committed content/summary, followed by a resumed derived step. Counts match.
  expect(step().state).toBe("stale");
  expect(await ids("newenglishtoken")).toEqual([]);
  expect(step(true).changed).toBe(true);
  expect(await ids("newenglishtoken")).toEqual([100]);
  expect(await ids("newenglishtoken", {lang: "zh"})).toEqual([100]);
  expect(await ids("neweffectivetoken", {lang: "zh"})).toEqual([100]);
  expect(await ids("neweffectivetoken", {lang: "zh", variant: "effective"})).toEqual([100]);
  expect(await ids("neweffectivetoken", {lang: "zh", variant: "chm"})).toEqual([]);
  expect(await ids("neweffectivetoken", {lang: "en", variant: "effective"})).toEqual([]);
  expect(await ids("newchinesetoken", {lang: "zh"})).toEqual([]);
  expect(await ids("newchinesetoken", {lang: "zh", variant: "chm"})).toEqual([100]);
  expect(await ids("newothertoken", {lang: "zh"})).toEqual([]);
  expect(await ids("newothertoken", {lang: "zh", variant: "other"})).toEqual([100]);
  expect(await ids("newenglishsummary")).toEqual([100]);
  expect(await ids("newchinesesummary", {lang: "zh"})).toEqual([100]);
  expect(await ids("newchinesesummary", {lang: "zh", variant: "chm"})).toEqual([100]);
  expect(await ids("newothersummary", {lang: "zh"})).toEqual([]);
  expect(await ids("newothersummary", {lang: "zh", variant: "other"})).toEqual([100]);
  for (const token of ["pendingreviewtoken", "unselectedsummarytoken", "oldenglishsummary", "oldchinesesummary",
    "oldenglishtoken", "oldchinesetoken", "oldeffectivetoken", "oldothertoken", "oldothersummary"]) {
    for (const context of [{lang: "en"}, {lang: "zh"}, {lang: "zh", variant: "other"}] as const) {
      expect(await ids(token, context)).toEqual([]);
    }
  }
  // Second batch leaves the first intact; summary-only effective document does
  // not override CHM fallback without an effective text source row.
  db.exec(`UPDATE SpellContent SET descriptionText='secondbatchtoken' WHERE legacySpellId=2;
    DELETE FROM I18nSpellText WHERE id='effective';
    UPDATE I18nSpellSummaryText SET reviewStatus='review' WHERE id='en-owner';`);
  expect(step(true).changed).toBe(true);
  expect(await ids("newenglishtoken")).toEqual([100]);
  expect(await ids("secondbatchtoken")).toEqual([2]);
  expect(await ids("newenglishsummary")).toEqual([]);
  expect(await ids("newchinesetoken", {lang: "zh"})).toEqual([100]);
  expect(await ids("newchinesetoken", {lang: "zh", variant: "effective"})).toEqual([100]);
  expect(await ids("neweffectivetoken", {lang: "zh"})).toEqual([]);
  expect(step(true).changed).toBe(false);
});
