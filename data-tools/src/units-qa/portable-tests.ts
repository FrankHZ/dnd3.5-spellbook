import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {unitSeeds,unitParts,unitFrequency} from './units';
import {unitsInventory,main} from './cli';
assert.deepEqual(unitSeeds('1 round/level, then 2 hours','duration-field').map(s=>s.token),['round','hours']);
assert(unitSeeds('Concentration, up to 20 minutes or until discharged','duration-field').every(s=>s.status==='context-unverified'&&s.qualifiers.maximum&&s.qualifiers.conditional));
// Ordinal, geometry, speed and action costs are retrieval only, never elapsed time.
for(const text of ['The second target.','A round stone, 5 feet wide.','30 feet per round as a move action.','Three standard actions.'])assert(unitSeeds(text,'body').every(s=>s.status==='context-unverified'));
assert.equal(unitSeeds('Three standard actions.','body').length,0);
assert.deepEqual(unitParts('距离：30尺 持续时间：1轮\n每轮移动30尺。').map(p=>p.scope),['range-header','duration-header','body']);
assert.equal(unitParts('材料：一尺长的绳子')[0]!.scope,'body');
const f=unitFrequency([1,2,3].map(spellId=>({spellId,english:'One round then another round.',chinese:'持续时间：1轮\n每轮重复。',duration:'1 round/level',range:'Touch',geometry:'5 feet wide'})));
const body=f.phrases.find(p=>p.phrase==='en:body:round')!;
assert.equal(body.occurrences,6);assert.equal(body.documentFrequency,3);assert.equal(body.examples.length,2);
assert(f.phrases.some(p=>p.phrase==='zh:duration-header:轮'));assert(f.phrases.some(p=>p.phrase==='zh:body:轮'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'units-qa-')),previous=process.env.DATA_REPO_PATH;
try {
 process.env.DATA_REPO_PATH=temp;const file=path.join(temp,'content.sqlite'),db=new Database(file);
 db.exec(`CREATE TABLE SpellContent(legacySpellId INTEGER,sourceRulebookId INTEGER,descriptionText TEXT,durationRaw TEXT,rangeRaw TEXT,targetRaw TEXT,areaRaw TEXT,effectRaw TEXT);
 CREATE TABLE I18nSpellText(spellId INTEGER,rulebookId INTEGER,lang TEXT,variant TEXT,descriptionText TEXT,bodyProvenanceJson TEXT);
 INSERT INTO SpellContent VALUES(1,1,'One round','1 round/level','Touch',NULL,NULL,NULL),(2,1,'Two minutes','2 minutes','Personal',NULL,NULL,NULL),(3,1,'Instantaneous','Instantaneous','30 ft.',NULL,NULL,NULL),(4,86,'Permanent','Permanent','Touch',NULL,NULL,NULL),(84,1,'One day','1 day','Touch',NULL,NULL,NULL),(5,1,'One hour','1 hour','Touch',NULL,NULL,NULL),(6,1,'None',NULL,NULL,NULL,NULL,NULL),(7,1,'Second target',NULL,NULL,NULL,NULL,NULL);
 INSERT INTO I18nSpellText VALUES(1,1,'zh','chm','旧正文',NULL),(1,1,'zh','effective','持续时间：1轮/等级',NULL),(2,1,'zh','chm','旧正文',NULL),(2,1,'zh','effective','',NULL),(3,1,'zh','effective','Instantaneous','{"language":"en"}'),(7,99,'zh','chm','第二个目标',NULL);`);db.close();
 const before=fs.readFileSync(file),result=unitsInventory(file,[5]);assert.equal(result.records.length,8);assert.equal(result.frequency.entries,5);
 assert.equal(result.records[0]!.selectedVariant,'effective');assert.equal(result.records[1]!.languageStatus,'missing-Chinese');assert.equal(result.records[2]!.languageStatus,'English-fallback');
 assert.equal(result.records.find(r=>r.spellId===4)!.partition,'SC-excluded');assert.equal(result.records.find(r=>r.spellId===84)!.partition,'accepted-pending-excluded');assert.equal(result.records.find(r=>r.spellId===5)!.partition,'registered-residual-excluded');assert.equal(result.records.find(r=>r.spellId===7)!.identityStatus,'book-mismatch');
 const out=path.join(temp,'term-qa','new');main(['--content-db',file,'--out',out,'--exclude-ids','5']);assert.deepEqual(fs.readFileSync(file),before);
 assert.throws(()=>main(['--content-db',file,'--out',out]),/already exists/);
 for(const ids of ['1,1','0','1.5','1,'])assert.throws(()=>main(['--content-db',file,'--out',path.join(temp,'term-qa','bad'),'--exclude-ids',ids]),/Exclusions/);
 assert.throws(()=>main(['--content-db',file,'--out',path.join(temp,'outside')]),/new child/);assert.throws(()=>main(['--content-db',file,'--out',path.join(temp,'term-qa','bad'),'--apply']),/Invalid/);
}finally{if(previous===undefined)delete process.env.DATA_REPO_PATH;else process.env.DATA_REPO_PATH=previous;fs.rmSync(temp,{recursive:true,force:true});}
console.log('Units QA portable checks passed: literal roles/qualifiers, field/header/body separation, DF, row presence, exclusions and readonly outputs');
