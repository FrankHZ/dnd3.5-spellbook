import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import Database from 'better-sqlite3';
import request from 'supertest';
import {app} from '#server/app';
import {contentPrisma} from '#server/lib/content-prisma-client';
import {ACTION_ROLLOUT_TARGETS as targets,ACTION_ROLLOUT_INPUTS as sources} from '@dnd/contracts';
const root=path.resolve(__dirname,'../..'),file=process.env.CONTENT_DATABASE_URL!.slice(5);
assert(path.basename(path.dirname(file)).startsWith('spellbook-api-test-'));
const temp=path.join(path.dirname(file),'rollout-inputs');let db:Database.Database;
function stage(action:'prepare'|'check'|'apply'|'apply629') {
  const r=spawnSync(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),path.join(root,'data-tools/src/action-qa/rollout-test-fixtures.ts'),temp,file,action],{cwd:temp,env:process.env,encoding:'utf8'});
  assert.ifError(r.error);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);
}
beforeAll(()=>{
  process.env.SPELL_READ_SOURCE='content';const initial=new Database(file);initial.exec('DROP TABLE SpellSearchDocument');
  for(const {name} of initial.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name:string}[])initial.exec(`DROP TABLE "${name}"`);
  initial.close();fs.mkdirSync(temp);stage('prepare');db=new Database(file);
});
afterAll(async()=>{await contentPrisma.$disconnect();db?.close();});
async function detail(id:number,context={lang:'zh'} as Record<string,string>) {
  const r=await request(app).get(`/api/spells/${id}`).query(context);expect(r.status,JSON.stringify(r.body)).toBe(200);return r.body;
}
it('serves every fixed successor overlay through detail/batch/browse/search with clause-only authority',async()=>{
  const before=await Promise.all(targets.map(t=>detail(t.id)));
  const english=await Promise.all(targets.map(t=>detail(t.id,{lang:'en'})));
  const chm=await Promise.all(targets.map(t=>detail(t.id,{lang:'zh',variant:'chm'})));
  const sc=await detail(4001),control=await detail(99);
  expect(stage('apply629')).toMatchObject({complete:true,overlay:'committed',search:'committed'});
  const prior629=await Promise.all([84,523,2165,2474].map(id=>detail(id)));
  expect(stage('check')).toMatchObject({state:'before',scope:{targets:37,acceptedClauses:40,acceptedNames:0,acceptedBodies:0}});
  expect(stage('apply')).toMatchObject({complete:true,overlay:'committed',search:'committed'});
  for(const [i,t] of targets.entries()) {
    const s=sources.find(s=>s.issue===t.issue)!,zh=await detail(t.id),p=zh.i18n.bodyProvenance;
    expect(await detail(t.id,{lang:'zh',variant:'effective'})).toEqual(zh);
    expect(await detail(t.id,{lang:'en'})).toEqual(english[i]);expect(await detail(t.id,{lang:'zh',variant:'chm'})).toEqual(chm[i]);
    expect(zh.i18n.name).toEqual(before[i].i18n.name);
    if(t.operation==='update') {
      expect(zh.i18n.nameProvenance).toEqual(before[i].i18n.nameProvenance);
      expect(p.clauseReview.prior.review.authority).toBe(t.authority);
    } else {
      expect(zh.i18n.nameProvenance).toMatchObject({origin:{kind:'chm'},retainedReference:{kind:'CHM',reviewed:false}});
      expect(zh.i18n.nameProvenance.origin.sourceKey).toBe(`chm-reference:${t.id}`);
      expect(p.origin.sourceKey).toBe(`chm-reference:${t.id}`);
      expect(p.clauseReview.prior).toBeUndefined();
    }
    expect(p).toMatchObject({acceptedRevision:s.revision,origin:{kind:t.origin},clauseReview:{kind:'DB-English',scope:'clauses',acceptedRevision:s.revision,proposalIds:[...t.proposals],wholeBodyReviewed:false}});
    expect(p.review).toBeUndefined();
    for(const secret of ['term-qa/','synthetic/accepted','nested/reference','ProvenanceJson','expectedPredecessor','actionClauseRollout','"input":','"evidence":'])expect(JSON.stringify(zh)).not.toContain(secret);
  }
  for(const id of [443,498,578,818,2166]) {
    const token=`new${id}x0token`,book=targets.find(t=>t.id===id)!.book;
    for(const context of [{lang:'zh'},{lang:'zh',variant:'effective'},{lang:'zh',variant:'chm'},{lang:'en'}]) {
      const r=await request(app).get('/api/spells/search').query({q:token,mode:'full',rulebookIds:String(book),...context});expect(r.status).toBe(200);
      expect(r.body.items.map((s:any)=>s.id)).toEqual(context.lang==='zh'&&context.variant!=='chm'?[id]:[]);
    }
  }
  for(const context of [{lang:'zh'},{lang:'zh',variant:'effective'},{lang:'zh',variant:'chm'},{lang:'en'}]) {
    const ids=targets.map(t=>t.id),batch=await request(app).post('/api/spells/batch').query(context).send({ids});expect(batch.status).toBe(200);
    expect(batch.body.items.map((r:any)=>r.id)).toEqual(ids);
    for(const item of batch.body.items) if(context.lang==='zh'&&context.variant!=='chm') {
      expect(item.i18n.variant).toBe('effective');
      expect(item.i18n.name).toBe(before[targets.findIndex(t=>t.id===item.id)].i18n.name);
      expect(item.i18n.nameProvenance).toBeDefined();
    }
    const browse=await request(app).get('/api/spells/by-level').query({...context,classIds:'1',level:3,pageSize:100,rulebookIds:[...new Set(targets.map(t=>t.book))].join(',')});expect(browse.status).toBe(200);
    const items=browse.body.groups.flatMap((g:any)=>g.items);expect(items.map((r:any)=>r.id)).toEqual(expect.arrayContaining(ids));
    for(const item of items.filter((r:any)=>ids.includes(r.id))) if(context.lang==='zh'&&context.variant!=='chm') expect(item.i18n.variant).toBe('effective');
  }
  expect(await Promise.all([84,523,2165,2474].map(id=>detail(id)))).toEqual(prior629);
  expect(await detail(4001)).toEqual(sc);expect(await detail(99)).toEqual(control);
  const rows=db.prepare('SELECT * FROM I18nSpellText ORDER BY id').all(),search=db.prepare('SELECT * FROM SpellSearchIndexState').get();
  expect(stage('apply')).toMatchObject({complete:true,overlay:'no-op',search:'no-op'});
  expect(db.prepare('SELECT * FROM I18nSpellText ORDER BY id').all()).toEqual(rows);expect(db.prepare('SELECT * FROM SpellSearchIndexState').get()).toEqual(search);
},40_000);
it('fails visibly for foreign acceptance, unsupported prior metadata or invented name review',async()=>{
  const old=db.prepare("SELECT bodyProvenanceJson FROM I18nSpellText WHERE spellId=498 AND variant='effective'").get() as {bodyProvenanceJson:string};
  for(const mutate of [
    (v:any)=>{v.acceptedRevision=sources[0].revision;},
    (v:any)=>{v.evidence.proposalIds=['unaccepted'];},
    (v:any)=>{v.evidence.comment=0;},
    (v:any)=>{v.actionClauseRollout.wholeBodyReviewed=true;},
    (v:any)=>{v.prior.provenance.review.authority='invented';},
    (v:any)=>{v.prior.provenance.origin.kind='independent';},
    (v:any)=>{v.prior.provenance.input.private='unknown';},
    (v:any)=>{v.origin.kind='chm';},
    (v:any)=>{v.review={disposition:'accepted-native-source-bound'};},
    (v:any)=>{v.input.path='term-qa/foreign';},
  ]) {
    const v=JSON.parse(old.bodyProvenanceJson);mutate(v);db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=498 AND variant='effective'").run(JSON.stringify(v));
    const r=await request(app).get('/api/spells/498').query({lang:'zh'});expect(r.status).toBe(500);expect(r.body.code).toBe('INVALID_EFFECTIVE_PROVENANCE');
    expect((await request(app).get('/api/spells/498').query({lang:'zh',variant:'chm'})).status).toBe(200);
  }
  db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=498 AND variant='effective'").run(old.bodyProvenanceJson);
  const name=db.prepare("SELECT nameProvenanceJson FROM I18nSpellText WHERE spellId=443 AND variant='effective'").get() as {nameProvenanceJson:string};
  const v=JSON.parse(name.nameProvenanceJson);v.actionRolloutNameRetention.reviewed=true;
  db.prepare("UPDATE I18nSpellText SET nameProvenanceJson=? WHERE spellId=443 AND variant='effective'").run(JSON.stringify(v));
  expect((await request(app).post('/api/spells/batch').query({lang:'zh'}).send({ids:[443]})).status).toBe(500);
  db.prepare("UPDATE I18nSpellText SET nameProvenanceJson=? WHERE spellId=443 AND variant='effective'").run(name.nameProvenanceJson);
  const nested=db.prepare("SELECT bodyProvenanceJson FROM I18nSpellText WHERE spellId=3594 AND variant='effective'").get() as {bodyProvenanceJson:string};
  for(const bad of ['/private/reference','../reference','C:/private/reference','bad\\reference']) {
    const v=JSON.parse(nested.bodyProvenanceJson);v.origin.sourceKey=bad;v.prior.sourceKey=bad;
    db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=3594 AND variant='effective'").run(JSON.stringify(v));
    expect((await request(app).get('/api/spells/3594').query({lang:'zh'})).status).toBe(500);
  }
  db.prepare("UPDATE I18nSpellText SET bodyProvenanceJson=? WHERE spellId=3594 AND variant='effective'").run(nested.bodyProvenanceJson);
});
