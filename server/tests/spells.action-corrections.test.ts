import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import Database from "better-sqlite3";
import request from "supertest";
import {app} from "#server/app";
import {contentPrisma} from "#server/lib/content-prisma-client";
import {ACTION_CORRECTION_REVISION} from "@dnd/contracts";

const root=path.resolve(__dirname,'../..'),file=process.env.CONTENT_DATABASE_URL!.slice(5);
assert(path.basename(path.dirname(file)).startsWith('spellbook-api-test-'));
const temp=path.join(path.dirname(file),'action-inputs');let db:Database.Database;
function stage(action:'prepare'|'check'|'apply') {
  const r=spawnSync(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),
    path.join(root,'data-tools/src/action-qa/corrections-test-fixtures.ts'),temp,file,action],{cwd:temp,env:process.env,encoding:'utf8'});
  assert.ifError(r.error);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);
}
beforeAll(()=>{
  process.env.SPELL_READ_SOURCE='content';const initial=new Database(file);initial.exec('DROP TABLE SpellSearchDocument');
  for(const {name} of initial.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name:string}[])initial.exec(`DROP TABLE "${name}"`);
  initial.close();fs.mkdirSync(temp);stage('prepare');db=new Database(file);
});
afterAll(async()=>{await contentPrisma.$disconnect();db?.close();});
async function detail(id:number,query={lang:'zh'} as Record<string,string>) {
  const r=await request(app).get(`/api/spells/${id}`).query(query);expect(r.status,`detail ${id} ${JSON.stringify(query)} ${JSON.stringify(r.body)}`).toBe(200);return r.body;
}
async function search(q:string,query={lang:'zh'} as Record<string,string>) {
  const r=await request(app).get('/api/spells/search').query({q,mode:'full',rulebookIds:'6,52,55,79',...query});
  expect(r.status).toBe(200);return r.body.items.map((s:any)=>s.id);
}
it('serves fixed local corrections through detail/batch/browse/search and exposes only clause authority',async()=>{
  const ids=[84,523,2165,2474],before=await Promise.all(ids.map(id=>detail(id)));
  const english=await Promise.all(ids.map(id=>detail(id,{lang:'en'}))),chm=await Promise.all(ids.map(id=>detail(id,{lang:'zh',variant:'chm'})));
  const sc=await detail(4001),control=await detail(99);
  expect(stage('check')).toMatchObject({state:'before',scope:{acceptedNames:0,acceptedBodies:0,acceptedClauses:7}});
  expect(stage('apply')).toMatchObject({complete:true,overlay:'committed',search:'committed'});
  for(const [i,id] of ids.entries()) {
    const zh=await detail(id),p=zh.i18n.bodyProvenance;
    expect(await detail(id,{lang:'zh',variant:'effective'})).toEqual(zh);
    expect(await detail(id,{lang:'en'})).toEqual(english[i]);expect(await detail(id,{lang:'zh',variant:'chm'})).toEqual(chm[i]);
    expect(zh.i18n.name).toEqual(before[i].i18n.name);
    if(id!==2474)expect(zh.i18n.nameProvenance).toEqual(before[i].i18n.nameProvenance);
    else expect(zh.i18n.nameProvenance).toMatchObject({origin:{kind:'chm'},retainedReference:{kind:'CHM',reviewed:false}});
    expect(p).toMatchObject({acceptedRevision:ACTION_CORRECTION_REVISION,language:'zh',clauseReview:{kind:'DB-English',scope:'clauses',wholeBodyReviewed:false}});
    expect(p.review).toBeUndefined();
    expect(p.clauseReview.proposalIds).toHaveLength(id===84?4:1);
    if(id===523)expect(p.clauseReview.prior.review.authority).toBe('recovered-db-english');
    if(id===2165)expect(p.clauseReview.prior.review.authority).toBe('independent-db-english');
    if(id===84)expect(p.clauseReview.prior.review).toBeUndefined();
    if(id===2474){expect(p.origin.kind).toBe('chm');expect(p.clauseReview.prior).toBeUndefined();}
    for(const secret of ['term-qa/','synthetic/accepted','ProvenanceJson','expectedPredecessor','actionClauseCorrection','"input":','"evidence":'])expect(JSON.stringify(zh)).not.toContain(secret);
  }
  for(const [token,id] of [['newcreationtoken',84],['newforcetoken',84],['newactiontoken',84],['newboundtoken',84],['new523token',523],['new2165token',2165],['new2474token',2474]] as const) {
    expect(await search(token)).toEqual([id]);expect(await search(token,{lang:'zh',variant:'effective'})).toEqual([id]);
    expect(await search(token,{lang:'zh',variant:'chm'})).toEqual([]);expect(await search(token,{lang:'en'})).toEqual([]);
  }
  for(const context of [{lang:'zh'},{lang:'zh',variant:'effective'},{lang:'zh',variant:'chm'},{lang:'en'}]) {
    const batch=await request(app).post('/api/spells/batch').query(context).send({ids});expect(batch.status).toBe(200);
    expect(batch.body.items.map((r:any)=>r.id)).toEqual(ids);
    const browse=await request(app).get('/api/spells/by-level').query({...context,classIds:'1',level:3,rulebookIds:'6,52,55,79'});
    expect(browse.status).toBe(200);expect(browse.body.groups.flatMap((g:any)=>g.items).map((r:any)=>r.id)).toEqual(expect.arrayContaining(ids));
  }
  expect(await detail(4001)).toEqual(sc);expect(await detail(99)).toEqual(control);
  const rows=db.prepare('SELECT * FROM I18nSpellText ORDER BY id').all(),state=db.prepare('SELECT * FROM SpellSearchIndexState').get();
  expect(stage('apply')).toMatchObject({complete:true,overlay:'no-op',search:'no-op'});
  expect(db.prepare('SELECT * FROM I18nSpellText ORDER BY id').all()).toEqual(rows);expect(db.prepare('SELECT * FROM SpellSearchIndexState').get()).toEqual(state);
},30_000);
it('rejects invented clause authority, unknown prior owners and source-bound substitutions',async()=>{
  const old=db.prepare("SELECT bodyProvenanceJson FROM I18nSpellText WHERE spellId=523 AND variant='effective'").get() as {bodyProvenanceJson:string};
  for(const mutate of [
    (v:any)=>{v.acceptedRevision='a'.repeat(40);},
    (v:any)=>{v.evidence.proposalIds=['foreign-proposal'];},
    (v:any)=>{v.actionClauseCorrection.wholeBodyReviewed=true;},
    (v:any)=>{v.evidence.issue=629;},
    (v:any)=>{v.prior.provenance.review.authority='invented';},
    (v:any)=>{v.prior.provenance.acceptedRevision='a'.repeat(40);},
    (v:any)=>{v.origin={kind:'independent',sourceKey:null};v.prior.provenance.origin=v.origin;
      v.prior.provenance.input.sourceKey=null;v.prior.provenance.evidence.historicalRevision=null;
      v.prior.provenance.evidence.historicalContinuityAuthenticated=true;v.prior.provenance.review.authority='independent-db-english';},
    (v:any)=>{v.origin.kind='chm';},
    (v:any)=>{v.privateText='must not escape';},
    (v:any)=>{v.input.path='term-qa/issue-999/invented.json';},
  ]) {
    const v=JSON.parse(old.bodyProvenanceJson);mutate(v);db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=523 AND variant='effective'").run(JSON.stringify(v));
    const r=await request(app).get('/api/spells/523').query({lang:'zh'});expect(r.status).toBe(500);expect(r.body.code).toBe('INVALID_EFFECTIVE_PROVENANCE');
    expect((await request(app).get('/api/spells/523').query({lang:'zh',variant:'chm'})).status).toBe(200);
  }
  db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=523 AND variant='effective'").run(old.bodyProvenanceJson);
  const sc=db.prepare("SELECT bodyProvenanceJson FROM I18nSpellText WHERE spellId=4001 AND variant='effective'").get() as {bodyProvenanceJson:string};
  const forged=JSON.parse(old.bodyProvenanceJson);forged.targetId=4001;
  db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=4001 AND variant='effective'").run(JSON.stringify(forged));
  expect((await request(app).get('/api/spells/4001').query({lang:'zh'})).status).toBe(500);
  db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=4001 AND variant='effective'").run(sc.bodyProvenanceJson);
  const name=db.prepare("SELECT nameProvenanceJson FROM I18nSpellText WHERE spellId=2474 AND variant='effective'").get() as {nameProvenanceJson:string};
  const reviewed=JSON.parse(name.nameProvenanceJson);reviewed.actionClauseNameRetention.reviewed=true;
  db.prepare("UPDATE I18nSpellText SET nameProvenanceJson=? WHERE spellId=2474 AND variant='effective'").run(JSON.stringify(reviewed));
  expect((await request(app).post('/api/spells/batch').query({lang:'zh'}).send({ids:[2474]})).status).toBe(500);
  db.prepare("UPDATE I18nSpellText SET nameProvenanceJson=? WHERE spellId=2474 AND variant='effective'").run(name.nameProvenanceJson);
});
