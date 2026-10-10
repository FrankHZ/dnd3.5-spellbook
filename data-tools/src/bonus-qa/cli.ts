import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {repoRoot} from '../shared/env';
import {outputDirectory} from '../action-qa/cli';
import {bonusSeeds,bonusControls,bonusFrequency} from './bonus';
const {ACTION_CORRECTION_TARGETS,ACTION_ROLLOUT_TARGETS,SAVE_CORRECTION_TARGETS}=require('@dnd/contracts') as typeof import('@dnd/contracts',{with:{'resolution-mode':'import'}});
export const acceptedPendingIds=new Set<number>([...ACTION_CORRECTION_TARGETS,...ACTION_ROLLOUT_TARGETS,...SAVE_CORRECTION_TARGETS].map(t=>t.id));
type Row={spellId:number;book:number;english:string;chinese:string|null;selectedVariant:string|null;selectedBook:number|null;provenance:string|null};
export function bonusInventory(file:string,exclude:number[]=[]) {
  const db=new Database(file,{readonly:true,fileMustExist:true}),extra=new Set(exclude);
  try {
    const records:Record<string,any>[]=[],eligible:{spellId:number;english:string;chinese:string|null}[]=[];
    for(const r of db.prepare(`SELECT s.legacySpellId spellId,s.sourceRulebookId book,s.descriptionText english,
      i.descriptionText chinese,i.variant selectedVariant,i.rulebookId selectedBook,i.bodyProvenanceJson provenance
      FROM SpellContent s LEFT JOIN I18nSpellText i ON i.spellId=s.legacySpellId AND i.lang='zh' AND i.variant=CASE WHEN EXISTS
      (SELECT 1 FROM I18nSpellText e WHERE e.spellId=s.legacySpellId AND e.lang='zh' AND e.variant='effective') THEN 'effective' ELSE 'chm' END ORDER BY s.legacySpellId`).iterate() as Iterable<Row>) {
      let language:string|null=null;try{language=JSON.parse(r.provenance??'null')?.language??null;}catch{}
      const languageStatus=!r.chinese?.trim()?'missing-Chinese':language==='en'||r.chinese.trim()===r.english.trim()?'English-fallback':'Chinese-present-unverified';
      const partition=r.book===86?'SC-excluded':acceptedPendingIds.has(r.spellId)?'accepted-pending-excluded':extra.has(r.spellId)?'registered-residual-excluded':'eligible-unreviewed';
      const identityStatus=r.selectedBook!=null&&r.selectedBook!==r.book?'book-mismatch':r.selectedVariant?'selected':'missing-Chinese';
      records.push({spellId:r.spellId,book:r.book,selectedVariant:r.selectedVariant,identityStatus,languageStatus,partition,
        seeds:bonusSeeds(r.english),controls:bonusControls(r.english)});
      if(partition==='eligible-unreviewed')eligible.push(r);
    }
    if(new Set(records.map(r=>r.spellId)).size!==records.length)throw Error('Duplicate canonical identity');
    return {records,frequency:bonusFrequency(eligible)};
  }finally{db.close();}
}
export function main(args:string[]) {
  if(args.length===1&&args[0]==='--help'){console.log('bonus:qa --content-db <file> --out <fresh-private-directory> [--exclude-ids 1,2]. Compact all-identity inventory and eligible literal frequencies only. Relative paths use checkout root. No context review, acceptance or writer.');return;}
  const flags=new Map<string,string>();
  for(let i=0;i<args.length;){const key=args[i++]!,value=args[i++];if(!['--content-db','--out','--exclude-ids'].includes(key)||flags.has(key)||!value||value.startsWith('--'))throw Error('Invalid/duplicate bonus:qa arguments');flags.set(key,value);}
  if(!flags.has('--content-db')||!flags.has('--out'))throw Error('Specify content DB and fresh private output');
  const exclude=flags.has('--exclude-ids')?flags.get('--exclude-ids')!.split(',').map(Number):[];
  if(exclude.length>1000||new Set(exclude).size!==exclude.length||exclude.some(id=>!Number.isSafeInteger(id)||id<=0))throw Error('Exclusions must be unique positive IDs, at most1000');
  const file=path.resolve(repoRoot(),flags.get('--content-db')!),out=outputDirectory(path.resolve(repoRoot(),flags.get('--out')!)),stamp=()=>{const s=fs.statSync(file);return [s.size,s.mtimeMs];},before=stamp(),started=performance.now();
  const result=bonusInventory(file,exclude),inventory=result.records.map(r=>JSON.stringify(r)).join('\n')+'\n',frequency=JSON.stringify(result.frequency,null,2)+'\n';
  const bytes=Buffer.byteLength(inventory)+Buffer.byteLength(frequency);if(bytes>50*1024*1024)throw Error('Bonus inventory exceeds50MiB');
  if(JSON.stringify(before)!==JSON.stringify(stamp()))throw Error('DB metadata changed during readonly inventory');
  const partitions=Object.fromEntries([...new Set(result.records.map(r=>r.partition))].map(p=>[p,result.records.filter(r=>r.partition===p).length]));
  const report={schema:'bonus-qa-inventory.v1',entries:result.records.length,partitions,excludedResidualIds:exclude,
    candidateEntries:result.records.filter(r=>r.partition==='eligible-unreviewed'&&r.seeds.length).length,
    baseline:'canonical DB English; selected effective row if present, otherwise CHM; no semantic pass',selectionBias:'Literal seed families; suffix/concordance favors early IDs; no precision/recall estimate',
    review:'unperformed',elapsedMs:performance.now()-started,peakRssBytes:process.resourceUsage().maxRSS*1024,evidenceBytes:bytes,DBMetadataUnchanged:true,DBWrites:0,modelApiCalls:0};
  fs.mkdirSync(out,{recursive:true});for(const [name,text] of [['inventory.jsonl',inventory],['frequency.json',frequency],['report.json',JSON.stringify(report,null,2)+'\n']])fs.writeFileSync(path.join(out,name!),text!,{encoding:'utf8',flag:'wx'});
  console.log(JSON.stringify(report));
}
if(require.main===module)main(process.argv.slice(2));
