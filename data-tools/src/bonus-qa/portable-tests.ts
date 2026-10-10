import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {bonusSeeds,bonusControls,bonusFrequency} from './bonus';
import {bonusInventory,main,acceptedPendingIds} from './cli';
assert.equal(acceptedPendingIds.size,50);
assert.deepEqual(bonusSeeds('A natural armor bonus and two enhancement bonuses.').map(s=>s.family),['natural armor','enhancement']);
for(const text of ['A +2 bonus on attacks.','Bonus damage.','A 1d6 penalty to Intelligence.','Charisma increases by 2.'])assert.equal(bonusSeeds(text).length,0);
assert(bonusControls('Bonus damage and bonus spells.').ordinaryPhrase);
assert(bonusControls('You gain +2 on Strength.').abilityChange);
assert(bonusControls('A morale penalty applies.').penalty);
// Different recipients/statistics, remote words and conditions do not confer a pass.
for(const text of ['An ally gains an insight bonus to AC. You gain a luck bonus to attack.','The guard gains a morale bonus.\nAn opponent has a penalty.','Only against fire, a resistance bonus applies.'])assert(bonusSeeds(text).every(s=>s.status==='context-unverified'));
const f=bonusFrequency([1,2,3].map(spellId=>({spellId,english:'A luck bonus and a luck bonus.',chinese:'幸运加值。幸运加值。'})));
assert.equal(f.english[0]!.occurrences,6);assert.equal(f.english[0]!.documentFrequency,3);assert.equal(f.english[0]!.examples.length,2);
const literal=bonusFrequency([1,2].map(spellId=>({spellId,english:'',chinese:'幸运加成和幸运加值'})));
assert(literal.chineseSuffixCandidates.some(c=>c.phrase==='幸运加成'));assert(literal.chineseSuffixCandidates.some(c=>c.phrase==='幸运加值'));
assert.equal(f.chineseLabels[0]!.documentFrequency,3);assert.equal(f.chineseLabels[0]!.occurrences,6);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'bonus-qa-')),previous=process.env.DATA_REPO_PATH;
try {
 process.env.DATA_REPO_PATH=temp;const file=path.join(temp,'content.sqlite'),db=new Database(file);
 db.exec(`CREATE TABLE SpellContent(legacySpellId INTEGER,sourceRulebookId INTEGER,descriptionText TEXT);
 CREATE TABLE I18nSpellText(spellId INTEGER,rulebookId INTEGER,lang TEXT,variant TEXT,descriptionText TEXT,bodyProvenanceJson TEXT);
 INSERT INTO SpellContent VALUES(1,1,'You gain a luck bonus.'),(2,1,'A morale bonus.'),(3,1,'A sacred bonus.'),(4,86,'A luck bonus.'),(84,1,'A luck bonus.'),(5,1,'A deflection bonus.'),(6,1,'Ordinary.'),(7,1,'A bonus.');
 INSERT INTO I18nSpellText VALUES(1,1,'zh','chm','旧正文',NULL),(1,1,'zh','effective','幸运加值',NULL),(2,1,'zh','chm','士气加值',NULL),(2,1,'zh','effective','',NULL),(3,1,'zh','effective','A sacred bonus.','{"language":"en"}'),(4,86,'zh','chm','幸运加值',NULL),(84,1,'zh','effective','幸运加值',NULL),(5,1,'zh','chm','偏斜加值',NULL),(7,99,'zh','chm','加值',NULL);`);db.close();
 const before=fs.readFileSync(file),result=bonusInventory(file,[5]);assert.equal(result.records.length,8);assert.equal(result.frequency.entries,5);
 assert.equal(result.records[0]!.selectedVariant,'effective');assert.equal(result.records[1]!.languageStatus,'missing-Chinese');assert.equal(result.records[2]!.languageStatus,'English-fallback');
 assert.equal(result.records.find(r=>r.spellId===4)!.partition,'SC-excluded');assert.equal(result.records.find(r=>r.spellId===84)!.partition,'accepted-pending-excluded');
 assert.equal(result.records.find(r=>r.spellId===5)!.partition,'registered-residual-excluded');assert.equal(result.records.find(r=>r.spellId===7)!.identityStatus,'book-mismatch');
 const out=path.join(temp,'term-qa','new');main(['--content-db',file,'--out',out,'--exclude-ids','5']);assert.deepEqual(fs.readFileSync(file),before);
 assert.throws(()=>main(['--content-db',file,'--out',out]),/already exists/);
 for(const ids of ['1,1','0','1.5','1,'])assert.throws(()=>main(['--content-db',file,'--out',path.join(temp,'term-qa','bad'),'--exclude-ids',ids]),/Exclusions/);
 assert.throws(()=>main(['--content-db',file,'--out',path.join(temp,'outside')]),/new child/);
 assert.throws(()=>main(['--content-db',file,'--out',path.join(temp,'term-qa','bad'),'--apply']),/Invalid/);
}finally{if(previous===undefined)delete process.env.DATA_REPO_PATH;else process.env.DATA_REPO_PATH=previous;fs.rmSync(temp,{recursive:true,force:true});}
console.log('Bonus QA portable checks passed: literal seeds, DF, local-role limits, row presence, exclusions, language/identity gaps and readonly outputs');
