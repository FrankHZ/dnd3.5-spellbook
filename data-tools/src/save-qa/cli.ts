import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {repoRoot} from '../shared/env';
import {scan,outputDirectory} from '../action-qa/cli';
import {fieldKinds,savingParts,inspectSavingThrows} from './saves';
type InventoryRow={spellId:number;book:number;savingThrow:string|null;selectedVariant:string|null;selectedBook:number|null;chinese:string|null;languageStatus:string};
export function saveInventory(file:string) {
  const db=new Database(file,{readonly:true,fileMustExist:true});
  try {
    const rows=db.prepare(`SELECT s.legacySpellId spellId,s.sourceRulebookId book,s.savingThrowRaw savingThrow,
      i.variant selectedVariant,i.rulebookId selectedBook,i.descriptionText chinese,
      CASE WHEN i.descriptionText IS NULL OR trim(i.descriptionText)='' THEN 'missing-Chinese'
      WHEN (json_valid(i.bodyProvenanceJson) AND json_extract(i.bodyProvenanceJson,'$.language')='en') OR trim(i.descriptionText)=trim(s.descriptionText) THEN 'English-fallback'
      ELSE 'Chinese-present-unverified' END languageStatus
      FROM SpellContent s LEFT JOIN I18nSpellText i ON i.spellId=s.legacySpellId AND i.lang='zh' AND i.variant=CASE WHEN EXISTS
      (SELECT 1 FROM I18nSpellText e WHERE e.spellId=s.legacySpellId AND e.lang='zh' AND e.variant='effective') THEN 'effective' ELSE 'chm' END ORDER BY s.legacySpellId`).all() as InventoryRow[];
    if(new Set(rows.map(r=>r.spellId)).size!==rows.length)throw Error('Duplicate canonical identity');
    return rows.map(({chinese,...r})=>({...r,kinds:fieldKinds(r.savingThrow),translatedHeaderPresent:savingParts(chinese??'').header.length>0,
      scReadonly:r.book===86,identityStatus:r.selectedBook!=null&&r.selectedBook!==r.book?'book-mismatch':r.selectedVariant?'selected':'missing-Chinese'}));
  } finally {db.close();}
}
export function scanSaves(file:string,ids:number[]) {
  const contexts=scan(file,ids),db=new Database(file,{readonly:true,fileMustExist:true});
  try {
    return contexts.map(({findings:actionFindings,chmContrast,...row})=>{
      const mechanics=db.prepare('SELECT * FROM SpellContent WHERE legacySpellId=?').get(row.spellId) as Record<string,any>;
      const findings=inspectSavingThrows(row.english,mechanics.savingThrowRaw,row.selected?.descriptionText??null);
      const provenanceEnglish=(()=>{try{return JSON.parse(row.selected?.bodyProvenanceJson??'null')?.language==='en';}catch{return false;}})();
      const languageStatus=!row.selected?.descriptionText?.trim()?'missing-Chinese':provenanceEnglish||row.selected.descriptionText.trim()===row.english.trim()?'English-fallback':'Chinese-present-unverified';
      if(row.identityStatus==='book-mismatch'||languageStatus==='English-fallback')
        findings.forEach(f=>{f.status='unknown';f.reason=row.identityStatus==='book-mismatch'?'selected-book-mismatch':'selected-English-fallback';});
      return {...row,languageStatus,scReadonly:row.book===86,savingThrow:mechanics.savingThrowRaw,canonicalMechanics:mechanics,
        facets:db.prepare('SELECT * FROM SpellMechanicFacet WHERE spellId=? ORDER BY id').all(mechanics.id),findings};
    });
  } finally {db.close();}
}
export function main(args:string[]) {
  if(args.length===1&&args[0]==='--help') {console.log('save:qa --content-db <file> --out <fresh-private-directory> (--inventory | --ids 1,2). Metadata inventory or bounded full contexts; readonly, no acceptance/writer. Paths resolve from checkout root.');return;}
  const flags=new Map<string,string>();
  for(let i=0;i<args.length;) {
    const key=args[i++]!;if(key==='--inventory'&&!flags.has(key)){flags.set(key,'true');continue;}
    const value=args[i++];if(!['--content-db','--out','--ids'].includes(key)||flags.has(key)||!value||value.startsWith('--'))throw Error('Invalid/duplicate save:qa arguments');flags.set(key,value);
  }
  if(!flags.has('--content-db')||!flags.has('--out')||flags.has('--inventory')===flags.has('--ids'))throw Error('Specify inventory or explicit IDs');
  const file=path.resolve(repoRoot(),flags.get('--content-db')!),out=outputDirectory(path.resolve(repoRoot(),flags.get('--out')!)),before=fs.statSync(file),started=performance.now();
  const ids=flags.has('--ids')?flags.get('--ids')!.split(',').map(Number):[];
  if(flags.has('--ids')&&(!ids.length||ids.length>1000||new Set(ids).size!==ids.length||ids.some(id=>!Number.isSafeInteger(id)||id<=0)))throw Error('IDs must be unique positive integers, at most1000');
  const records=flags.has('--inventory')?saveInventory(file):scanSaves(file,ids),serialized=records.map(r=>JSON.stringify(r)).join('\n')+'\n';
  if(Buffer.byteLength(serialized)>50*1024*1024)throw Error('Save QA output exceeds50MiB');
  const after=fs.statSync(file);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw Error('DB metadata changed during readonly retrieval');
  const report={schema:'save-qa-retrieval.v1',mode:flags.has('--inventory')?'metadata-inventory':'explicit-contexts',entries:records.length,
    baseline:'canonical DB English/mechanics; no original-book verification',
    selection:flags.has('--inventory')?'all canonical identities, ascending stable ID; metadata only':'caller-frozen IDs; no corpus precision/recall estimate',review:'unperformed',
    elapsedMs:performance.now()-started,peakRssBytes:process.resourceUsage().maxRSS*1024,evidenceBytes:Buffer.byteLength(serialized),DBMetadataUnchanged:true,DBWrites:0,modelApiCalls:0};
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,flags.has('--inventory')?'inventory.jsonl':'evidence.jsonl'),serialized,{encoding:'utf8',flag:'wx'});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'wx'});console.log(JSON.stringify(report));
}
if(require.main===module)main(process.argv.slice(2));
