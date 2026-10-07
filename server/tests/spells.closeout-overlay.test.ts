import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import Database from "better-sqlite3";
import request from "supertest";
import {app} from "#server/app";
import {contentPrisma} from "#server/lib/content-prisma-client";
import {DICE_CLOSEOUT_REVISION} from "@dnd/contracts";

const root = path.resolve(__dirname, "../.."), file = process.env.CONTENT_DATABASE_URL!.slice(5);
assert(path.basename(path.dirname(file)).startsWith("spellbook-api-test-"));
const temp = path.join(path.dirname(file), "closeout-inputs");
let db: Database.Database;
function stage(action: "prepare" | "check" | "apply") {
  const result = spawnSync(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"),
    path.join(root, "data-tools/src/dice-intake/closeout-overlay-test-fixtures.ts"), temp, file, action],
    {cwd: temp, env: process.env, encoding: "utf8"});
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
}
beforeAll(() => {
  process.env.SPELL_READ_SOURCE = "content";
  const initial = new Database(file);
  initial.exec("DROP TABLE SpellSearchDocument");
  for (const {name} of initial.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name: string}[])
    initial.exec(`DROP TABLE "${name}"`);
  initial.close(); fs.mkdirSync(temp); stage("prepare"); db = new Database(file);
});
afterAll(async () => {await contentPrisma.$disconnect(); db?.close();});
async function detail(id: number, query = {lang: "zh"} as Record<string, string>) {
  const res = await request(app).get(`/api/spells/${id}`).query(query); expect(res.status).toBe(200); return res.body;
}
async function search(q: string, query = {lang: "zh"} as Record<string, string>) {
  const res = await request(app).get("/api/spells/search").query({q, mode: "full", rulebookIds: "53", ...query});
  expect(res.status).toBe(200); return res.body.items.map((r: any) => r.id);
}

it("serves accepted fields and honest retained CHM/English through default, explicit, browse and search HTTP", async () => {
  const targets = [355,356,357,358,359];
  const beforeSc = await detail(4001), beforeControl = await detail(99);
  const original = db.prepare("SELECT * FROM I18nSpellText ORDER BY id").all() as Record<string, any>[];
  const english = await Promise.all(targets.map(id => detail(id, {lang: "en"})));
  const chm = await Promise.all(targets.map(id => detail(id, {lang: "zh", variant: "chm"})));
  const buildBefore = db.prepare("SELECT * FROM RulesContentBuild").get() as Record<string, any>;
  expect(stage("check")).toMatchObject({state: "before", complete: false});
  expect(await search("newbodytoken")).toEqual([]);
  db.exec("UPDATE SpellSearchDocument SET body='obsoletecloseouttoken' WHERE spellId=355 AND lang='en'");
  expect(stage("apply")).toMatchObject({complete: true, overlay: "committed", search: "committed"});
  for (const [index,id] of targets.entries()) {
    const zh = await detail(id);
    expect(await detail(id, {lang: "zh", variant: "effective"})).toEqual(zh);
    expect(await detail(id, {lang: "en"})).toEqual(english[index]);
    expect(await detail(id, {lang: "zh", variant: "chm"})).toEqual(chm[index]);
    for (const p of [zh.i18n.nameProvenance, zh.i18n.bodyProvenance])
      expect(p.acceptedRevision).toBe(DICE_CLOSEOUT_REVISION);
    for (const secret of ["dice-baselines/", "synthetic-closeout", "publicHead", "historicalRevision", "ProvenanceJson"])
      expect(JSON.stringify(zh)).not.toContain(secret);
  }
  const independent = await detail(355);
  expect(independent.i18n.nameProvenance.origin.kind).toBe("independent");
  expect(independent.i18n.bodyProvenance.review.authority).toBe("independent-db-english");
  expect(independent.i18n.description.text).toContain("第一项\n第二项");
  const recovered = await detail(356);
  expect(recovered.i18n.nameProvenance.review.authority).toBe("recovered-db-english");
  expect(recovered.i18n.bodyProvenance.origin.kind).toBe("chm");
  expect(recovered.i18n.bodyProvenance.review).toBeUndefined();
  expect(recovered.i18n.description.text).toBe("保留CHM正文 retainedchmtoken");
  const nameOnly = await detail(357);
  expect(nameOnly.i18n.bodyProvenance).toMatchObject({language: "en", origin: {kind: "english"}});
  expect(nameOnly.i18n.bodyProvenance.review).toBeUndefined();
  const mixed = await detail(358);
  expect(mixed.i18n.nameProvenance).toMatchObject({language: "en", origin: {kind: "english"}});
  expect(mixed.i18n.bodyProvenance.review).toMatchObject({composition: "mixed", unresolved: {ownerIssues: [201]}});
  for (const [token,id] of [["uniquenametoken",355],["newbodytoken",355],["recoveredtoken",356],["nameonlytoken",357],["mixedbodytoken",358],["nativetoken",359]] as const) {
    expect(await search(token)).toEqual([id]);
    expect(await search(token,{lang:"zh",variant:"effective"})).toEqual([id]);
    expect(await search(token,{lang:"zh",variant:"chm"})).toEqual([]);
    expect(await search(token,{lang:"en"})).toEqual([]);
  }
  expect(await search("retainedchmtoken")).toEqual([356]);
  expect(await search("retainedchmtoken",{lang:"zh",variant:"chm"})).toEqual([356]);
  for (const context of [{lang:"zh"},{lang:"zh",variant:"effective"},{lang:"zh",variant:"chm"},{lang:"en"}])
    expect(await search("obsoletecloseouttoken",context)).toEqual([]);
  const browse = await request(app).get("/api/spells/by-level").query({lang:"zh",classIds:"1",level:3,rulebookIds:"53"});
  expect(browse.status).toBe(200);
  const items = browse.body.groups.flatMap((g: any) => g.items);
  expect(items.find((r: any)=>r.id===355).i18n.nameProvenance.review.authority).toBe("independent-db-english");
  expect(items.find((r: any)=>r.id===358).i18n.nameProvenance.origin.kind).toBe("english");
  expect(await detail(4001)).toEqual(beforeSc); expect(await detail(99)).toEqual(beforeControl);
  for (const row of original) expect(db.prepare("SELECT * FROM I18nSpellText WHERE id=?").get(row.id)).toEqual(row);
  const buildAfter = db.prepare("SELECT * FROM RulesContentBuild").get() as Record<string, any>;
  const metadata = JSON.parse(buildAfter.buildMetaJson); delete metadata.overlays.diceDbEnglishCloseout;
  expect(metadata).toEqual(JSON.parse(buildBefore.buildMetaJson));
  expect({...buildAfter,buildMetaJson:buildBefore.buildMetaJson}).toEqual(buildBefore);
  const rows = db.prepare("SELECT * FROM I18nSpellText ORDER BY id").all(), state = db.prepare("SELECT * FROM SpellSearchIndexState").get();
  expect(stage("apply")).toMatchObject({complete:true,overlay:"no-op",search:"no-op"});
  expect(db.prepare("SELECT * FROM I18nSpellText ORDER BY id").all()).toEqual(rows);
  expect(db.prepare("SELECT * FROM SpellSearchIndexState").get()).toEqual(state);
}, 30_000);

it("rejects forged closeout authority, fallback review labels and relabeled SC provenance", async () => {
  const original = db.prepare("SELECT nameProvenanceJson,bodyProvenanceJson FROM I18nSpellText WHERE spellId=356 AND variant='effective'").get() as Record<string,string>;
  for (const mutate of [
    (v:any)=>{v.acceptedRevision="a".repeat(40);},
    (v:any)=>{v.closeout.issue=529;},
    (v:any)=>{v.review.authority="native-db-english";v.evidence.historicalContinuityAuthenticated=true;},
    (v:any)=>{v.input.path="../private";},
    (v:any)=>{v.review.originalEntryReviewed=true;},
    (v:any)=>{v.evidence.extra="private";},
  ]) {
    const v=JSON.parse(original.nameProvenanceJson!);mutate(v);
    db.prepare("UPDATE I18nSpellText SET nameProvenanceJson=? WHERE spellId=356 AND variant='effective'").run(JSON.stringify(v));
    const res=await request(app).get("/api/spells/356").query({lang:"zh"});
    expect(res.status).toBe(500);expect(res.body.code).toBe("INVALID_EFFECTIVE_PROVENANCE");
  }
  db.prepare("UPDATE I18nSpellText SET nameProvenanceJson=? WHERE spellId=356 AND variant='effective'").run(original.nameProvenanceJson);
  const fallback=JSON.parse(original.bodyProvenanceJson!);fallback.review={kind:"DB-English"};
  db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=356 AND variant='effective'").run(JSON.stringify(fallback));
  expect((await request(app).get("/api/spells/356").query({lang:"zh"})).status).toBe(500);
  db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=356 AND variant='effective'").run(original.bodyProvenanceJson);
  const sc=db.prepare("SELECT nameProvenanceJson FROM I18nSpellText WHERE spellId=4001").get() as {nameProvenanceJson:string};
  const forged=JSON.parse(original.nameProvenanceJson!);forged.targetId=4001;forged.input.targetId=4001;
  db.prepare("UPDATE I18nSpellText SET nameProvenanceJson=? WHERE spellId=4001").run(JSON.stringify(forged));
  expect((await request(app).get("/api/spells/4001").query({lang:"zh"})).status).toBe(500);
  db.prepare("UPDATE I18nSpellText SET nameProvenanceJson=? WHERE spellId=4001").run(sc.nameProvenanceJson);
  expect((await detail(4001)).i18n.nameProvenance.review.disposition).toBe("source-reviewed-retention");
});
