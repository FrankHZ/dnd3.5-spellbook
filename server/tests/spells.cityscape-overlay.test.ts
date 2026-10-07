import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import Database from "better-sqlite3";
import request from "supertest";
import {app} from "#server/app";
import {contentPrisma} from "#server/lib/content-prisma-client";

const root = path.resolve(__dirname, "../..");
const file = process.env.CONTENT_DATABASE_URL!.slice(5);
assert(path.basename(path.dirname(file)).startsWith("spellbook-api-test-"));
const temp = path.join(path.dirname(file), "cityscape-inputs");
const revision = "b8d0dc3f85015533c3e57a293f7a96d5de2d7cb7";
let db: Database.Database;
let fixture: {targets: number[]; accepted: {targetId: number; name: string; descriptionHtml: string}[]; residual: string};

function stage(action: "prepare" | "check" | "apply") {
  const result = spawnSync(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"),
    path.join(root, "data-tools/src/dice-intake/db-english-overlay-test-fixtures.ts"), temp, file, action],
  {cwd: temp, env: process.env, encoding: "utf8"});
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

beforeAll(() => {
  process.env.SPELL_READ_SOURCE = "content";
  const initial = new Database(file);
  initial.exec("DROP TABLE SpellSearchDocument");
  for (const {name} of initial.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name: string}[]) {
    initial.exec(`DROP TABLE "${name}"`);
  }
  initial.close(); fs.mkdirSync(temp);
  fixture = stage("prepare"); db = new Database(file);
});
afterAll(async () => {await contentPrisma.$disconnect(); db?.close();});

async function detail(id: number, context: Record<string, string> = {lang: "zh"}) {
  const res = await request(app).get(`/api/spells/${id}`).query(context);
  expect(res.status).toBe(200); return res.body;
}
async function search(q: string, context: Record<string, string> = {lang: "zh"}, books = "53") {
  const res = await request(app).get("/api/spells/search").query({q, mode: "full", rulebookIds: books, ...context});
  expect(res.status).toBe(200); return res.body.items.map((r: {id: number}) => r.id);
}

it("serves eight accepted overlays through HTTP detail/browse/search while preserving SC and fallback", async () => {
  const beforeSc = await detail(4001), beforeControl = await detail(99);
  const scRow = db.prepare("SELECT * FROM I18nSpellText WHERE rulebookId=86").get();
  const buildBefore = db.prepare("SELECT * FROM RulesContentBuild").get() as Record<string, any>;
  const rowsBefore = Object.fromEntries(["SpellContent", "RulebookContent", "SpellListEntry", "SpellComponent", "SpellMechanicFacet", "SpellAppearance", "SpellTaxonomyFacet", "I18nSpellSummaryText"].map(table => [table, db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]));
  const englishBefore = await Promise.all(fixture.targets.map(id => detail(id, {lang: "en"})));
  expect(stage("check")).toMatchObject({state: "before", complete: false, overlay: "not-attempted"});
  // Valid but obsolete FTS data is deliberately stale before the overlay stage.
  db.exec("UPDATE SpellSearchDocument SET body='expiredcityscapetoken' WHERE spellId=355 AND lang='en'");
  expect(await search("合成审阅355")).toEqual([]);
  expect(stage("apply")).toMatchObject({state: "after", complete: true, overlay: "committed", search: "committed"});
  for (const row of fixture.accepted) {
    const zh = await detail(row.targetId);
    expect(zh.i18n.name).toBe(row.name);
    expect(zh.i18n.description.html).toBe(row.descriptionHtml);
    expect(zh.i18n.nameProvenance).toMatchObject({language: "zh", acceptedRevision: revision,
      review: {kind: "DB-English", disposition: "DB-English-reviewed"}});
    expect(zh.i18n.bodyProvenance.review.composition).toBe(row.targetId === 361 ? "mixed" : "Chinese");
    if (row.targetId === 361) {
      expect(zh.i18n.description.text).toContain(fixture.residual);
      expect(zh.i18n.bodyProvenance.review.residual).toEqual({kind: "retained-DB-English", clauses: 1, ownerIssue: 160});
    } else expect(zh.i18n.bodyProvenance.review.residual).toBeUndefined();
    expect(await detail(row.targetId, {lang: "zh", variant: "effective"})).toEqual(zh);
    const en = englishBefore[fixture.targets.indexOf(row.targetId)];
    expect(await detail(row.targetId, {lang: "en", variant: "effective"})).toEqual(en);
    const chm = await detail(row.targetId, {lang: "zh", variant: "chm"});
    expect(chm.name).toBe(en.name); expect(chm.description).toEqual(en.description);
    expect(chm.i18n?.nameProvenance).toBeUndefined();
    for (const secret of ["dice-baselines/", "semantic-review", "unresolved.jsonl", "englishLines", "originalEntryReviewed", "ProvenanceJson"])
      expect(JSON.stringify(zh)).not.toContain(secret);
    const token = `合成审阅${row.targetId}`;
    expect(await search(token)).toEqual([row.targetId]);
    expect(await search(token, {lang: "zh", variant: "effective"})).toEqual([row.targetId]);
    expect(await search(token, {lang: "zh", variant: "chm"})).toEqual([]);
    expect(await search(token, {lang: "en"})).toEqual([]);
  }
  for (const context of [{lang: "zh"}, {lang: "zh", variant: "effective"}, {lang: "zh", variant: "chm"}, {lang: "en"}])
    expect(await search("expiredcityscapetoken", context)).toEqual([]);
  const batch = await request(app).post("/api/spells/batch").query({lang: "zh"}).send({ids: fixture.targets});
  expect(batch.status).toBe(200); expect(batch.body.items.map((r: {id: number}) => r.id)).toEqual(fixture.targets);
  expect(batch.body.items.every((r: any) => r.i18n.nameProvenance.review.kind === "DB-English")).toBe(true);
  const browse = await request(app).get("/api/spells/by-level").query({lang: "zh", classIds: "1", level: 3, rulebookIds: "53"});
  expect(browse.status).toBe(200);
  const browsed = browse.body.groups.flatMap((g: any) => g.items);
  expect(browsed.map((r: any) => r.id).sort()).toEqual(fixture.targets);
  expect(browsed.every((r: any) => r.i18n.nameProvenance.review.kind === "DB-English")).toBe(true);
  expect(await detail(4001)).toEqual(beforeSc); expect(await detail(99)).toEqual(beforeControl);
  expect(await detail(99, {lang: "zh", variant: "effective"})).toEqual(beforeControl);
  expect(await search("SC合成正文", {lang: "zh"}, "86")).toEqual([4001]);
  expect(await search("controlchmtoken", {lang: "zh"}, "20")).toEqual([99]);
  expect(db.prepare("SELECT * FROM I18nSpellText WHERE rulebookId=86").get()).toEqual(scRow);
  for (const [table, rows] of Object.entries(rowsBefore)) expect(db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).toEqual(rows);
  const buildAfter = db.prepare("SELECT * FROM RulesContentBuild").get() as Record<string, any>;
  const beforeMeta = JSON.parse(buildBefore.buildMetaJson), afterMeta = JSON.parse(buildAfter.buildMetaJson);
  expect(afterMeta.overlays.scFinalNameBody).toEqual(beforeMeta.overlays.scFinalNameBody);
  delete afterMeta.overlays.cityscapeDbEnglish;
  expect(afterMeta).toEqual(beforeMeta);
  expect({...buildAfter, buildMetaJson: buildBefore.buildMetaJson}).toEqual(buildBefore);
  const targetRows = db.prepare("SELECT * FROM I18nSpellText WHERE rulebookId=53 ORDER BY id").all();
  const searchState = db.prepare("SELECT * FROM SpellSearchIndexState").get();
  expect(stage("apply")).toMatchObject({complete: true, overlay: "no-op", search: "no-op"});
  expect(db.prepare("SELECT * FROM I18nSpellText WHERE rulebookId=53 ORDER BY id").all()).toEqual(targetRows);
  expect(db.prepare("SELECT * FROM SpellSearchIndexState").get()).toEqual(searchState);
}, 30_000);

it("rejects malformed DB-English metadata and SC relabeling at the HTTP boundary", async () => {
  const original = db.prepare("SELECT nameProvenanceJson,bodyProvenanceJson FROM I18nSpellText WHERE spellId=361 AND variant='effective'").get() as Record<string, string>;
  const mutations = [
    (v: any) => {v.acceptedRevision = "a".repeat(40);},
    (v: any) => {v.review.composition = "Chinese";},
    (v: any) => {delete v.review.residual;},
    (v: any) => {v.review.residual.ownerIssue = 529;},
    (v: any) => {v.review.residual.clauses = 2;},
    (v: any) => {v.review.originalEntryReviewed = true;},
    (v: any) => {v.review.kind = "source-bound";},
    (v: any) => {v.input.path = "private/forged";},
    (v: any) => {v.evidence.privateAudit = "forged";},
    (v: any) => {v.language = "en";},
    (v: any) => {v.origin.kind = "chm";},
  ];
  for (const mutate of mutations) {
    const v = JSON.parse(original.bodyProvenanceJson!); mutate(v);
    db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=361 AND variant='effective'").run(JSON.stringify(v));
    const res = await request(app).get("/api/spells/361").query({lang: "zh"});
    expect(res.status).toBe(500); expect(res.body.code).toBe("INVALID_EFFECTIVE_PROVENANCE");
    expect(JSON.stringify(res.body)).not.toContain("private/");
  }
  db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=361 AND variant='effective'").run(original.bodyProvenanceJson);
  const sc = db.prepare("SELECT nameProvenanceJson FROM I18nSpellText WHERE spellId=4001").get() as {nameProvenanceJson: string};
  const forged = JSON.parse(original.nameProvenanceJson!); forged.targetId = 4001; forged.input.targetId = 4001; forged.evidence.targetId = 4001;
  db.prepare("UPDATE I18nSpellText SET nameProvenanceJson=? WHERE spellId=4001").run(JSON.stringify(forged));
  const res = await request(app).get("/api/spells/4001").query({lang: "zh"});
  expect(res.status).toBe(500); expect(res.body.code).toBe("INVALID_EFFECTIVE_PROVENANCE");
  db.prepare("UPDATE I18nSpellText SET nameProvenanceJson=? WHERE spellId=4001").run(sc.nameProvenanceJson);
  expect((await detail(4001)).i18n.nameProvenance.review.disposition).toBe("source-reviewed-retention");
});
