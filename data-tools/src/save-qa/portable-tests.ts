import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {fieldKinds,inspectSavingThrows,savingParts,savingOccurrences} from './saves';
import {main,saveInventory,scanSaves} from './cli';

assert.deepEqual(fieldKinds('Fortitude partial; Reflex half; Will negates (harmless, object)'),['fortitude','reflex','will']);
const split=inspectSavingThrows('If moved by an external effect, make a Fortitude save.','Will negates (harmless)','豁免检定：意志（无害）\n被移动时进行强韧豁免。');
assert.deepEqual(split.map(f=>[f.field,f.kind,f.role,f.status]),[['saving-throw','will','canonical-field','unverified'],['body','fortitude','conditional-save','unverified']]);
assert.deepEqual(split[0]!.qualifiers,['negates','harmless']);
assert.equal(inspectSavingThrows('Make a Reflex save.','Reflex half','豁免检定：反射，通过则减半\n普通叙述。')[1]!.status,'candidate');
assert.equal(inspectSavingThrows('','Fortitude negates','普通叙述。')[0]!.reason,'Chinese-save-header-unavailable-structured-field-retained');
assert.deepEqual(savingParts('持续时间：1轮/等级 豁免检定：见说明\n正文提到豁免：强韧。').header,['豁免检定：见说明']);
assert.equal(savingParts('正文提到豁免：强韧。').header.length,0);
assert.equal(inspectSavingThrows('Make a Fortitude save.','See text','持续时间：1轮 豁免检定：见说明\n进行坚韧豁免。')[0]!.status,'unverified');
assert.equal(savingOccurrences('You will save the object. Your reflex improves. Great fortitude helps.','body').length,0);
assert.equal(inspectSavingThrows('Ordinary text.','None','豁免检定：无').length,0);
const repeated=inspectSavingThrows('Each round make a new Will save. If ordered into danger, it gets another saving throw.','Will negates','豁免检定：意志，通过则无效\n每轮进行意志豁免。危险命令允许再次豁免。');
assert.equal(repeated[1]!.role,'repeated-save');
assert.equal(repeated[2]!.kind,'unspecified');
assert.equal(repeated[2]!.status,'unknown');
assert.deepEqual(repeated[2]!.chineseEvidence,[]);
assert.equal(savingOccurrences('First line.\nThen make a Reflex save.','body')[0]!.line,1);
assert.equal(savingOccurrences('First sentence. Then make a Reflex save.','body')[0]!.offset,'First sentence. Then make a Reflex save.'.indexOf('Reflex'));
assert.equal(inspectSavingThrows('','Will negates',null)[0]!.reason,'missing-selected-Chinese');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'save-qa-')),previous=process.env.DATA_REPO_PATH;
try {
  process.env.DATA_REPO_PATH=dir;
  const file=path.join(dir,'content.sqlite'),db=new Database(file);
  db.exec(`CREATE TABLE SpellContent (id INTEGER,legacySpellId INTEGER,sourceRulebookId INTEGER,canonicalName TEXT,descriptionText TEXT,castingTimeRaw TEXT,savingThrowRaw TEXT);
    CREATE TABLE I18nSpellText (spellId INTEGER,rulebookId INTEGER,lang TEXT,variant TEXT,name TEXT,descriptionText TEXT,sourceKey TEXT,nameProvenanceJson TEXT,bodyProvenanceJson TEXT);
    CREATE TABLE SpellMechanicFacet (id INTEGER,spellId INTEGER,category TEXT);
    INSERT INTO SpellContent VALUES (1,1,1,'Synthetic','Make a Reflex save.','1 standard action','Reflex half'),(2,2,86,'Empty','Ordinary text.',NULL,'Will negates'),(3,3,1,'Fallback','Ordinary text.',NULL,'None'),(4,4,1,'Missing','Ordinary text.',NULL,'None');
    INSERT INTO I18nSpellText VALUES (1,1,'zh','chm','Old','旧正文。',NULL,NULL,NULL),(1,1,'zh','effective','Current','豁免检定：反射减半\n进行反射豁免。','synthetic','{}','{"targetId":1,"field":"body"}'),(2,86,'zh','chm','Old','豁免检定：意志。',NULL,NULL,NULL),(2,86,'zh','effective','Empty',NULL,NULL,NULL,NULL),(3,1,'zh','effective','Fallback','Ordinary text.',NULL,NULL,'{"language":"en"}');
    INSERT INTO SpellMechanicFacet VALUES (1,1,'saving-throw');`);
  db.close();
  const before=fs.readFileSync(file),rows=scanSaves(file,[1,2,3,4]);
  assert.equal(rows[0]!.selected!.variant,'effective');
  assert.equal(rows[0]!.provenanceStatus,'identity-bound-raw-metadata');
  assert.equal(rows[0]!.facets.length,1);
  assert.equal(rows[1]!.selected!.descriptionText,null);
  assert.equal(rows[1]!.scReadonly,true);
  assert.equal(rows[1]!.languageStatus,'missing-Chinese');
  assert.equal(rows[2]!.languageStatus,'English-fallback');
  assert.equal(rows[2]!.findings.length,0);
  assert.equal(rows[3]!.languageStatus,'missing-Chinese');
  assert.equal(saveInventory(file).length,4);
  assert.equal(saveInventory(file)[1]!.selectedVariant,'effective');
  assert.deepEqual(fs.readFileSync(file),before);
  const out=path.join(dir,'term-qa','fresh');
  main(['--content-db',file,'--out',out,'--ids','1,2,3,4']);
  assert.deepEqual(fs.readFileSync(file),before);
  assert.deepEqual(fs.readFileSync(path.join(out,'evidence.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line)),rows);
  assert.throws(()=>main(['--content-db',file,'--out',out,'--ids','1']),/already exists/);
  for(const ids of ['1,1','0','-1','1.5','1,',Array.from({length:1001},(_,i)=>i+1).join(',')])
    assert.throws(()=>main(['--content-db',file,'--out',path.join(dir,'term-qa','bad'),'--ids',ids]),/IDs|Invalid/);
  assert.throws(()=>main(['--content-db',file,'--out',path.join(dir,'outside'),'--ids','1']),/new child/);
  assert.throws(()=>main(['--content-db',file,'--out',path.join(dir,'term-qa','bad'),'--inventory','--ids','1']),/Specify/);
  assert.throws(()=>scanSaves(file,[999]),/Unknown stable ID/);
  const changed=new Database(file);
  changed.exec("UPDATE I18nSpellText SET rulebookId=99 WHERE spellId=1 AND variant='effective'");changed.close();
  assert(scanSaves(file,[1])[0]!.findings.every(f=>f.reason==='selected-book-mismatch'&&f.status==='unknown'));
  const fallback=new Database(file);
  fallback.exec(`UPDATE I18nSpellText SET rulebookId=1,bodyProvenanceJson='{"language":"en"}' WHERE spellId=1 AND variant='effective'`);fallback.close();
  assert(scanSaves(file,[1])[0]!.findings.every(f=>f.reason==='selected-English-fallback'&&f.status==='unknown'));
} finally {
  if(previous===undefined)delete process.env.DATA_REPO_PATH;else process.env.DATA_REPO_PATH=previous;
  // This test owns the fresh temporary directory; no operator files are inside it.
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log('Save QA portable regressions passed (role/scope, inline headers, anonymous saves, row presence, language gaps, readonly evidence)');
