import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {displayMembershipMarkers, processAutomaticMarkers, selectProcessedMembershipMarkers,
  type MachineMarker, type NamedEntry, type SpellName} from "./automatic";
import {listIdentity, selectPrintedMarkers, type PdfPage, type PdfSpan} from "./markers";
import {main} from "./automatic-cli";

const span = (text: string, y: number, flags = 20, x = 60, size = 10): PdfSpan =>
  ({text, flags, size, font: "Synthetic", bbox: [x,y,x+100,y+10], origin: [x,y+9]});
const head = (text: string, y: number, x = 60) => ({spans: [span(text,y,4,x,13)]});
const row = (name: string, mark: string | null, y: number, x = 60) => ({spans: mark === null
  ? [span(name+":",y,20,x), span(" summary",y,4,x+100)]
  : [span(name,y,20,x), span(mark,y,21,x+100,6), span(":",y,20,x+110), span(" summary",y,4,x+115)]});
const pages: PdfPage[] = [
  {page_index:244, source:{kind:"synthetic"}, extractor:{name:"synthetic"}, blocks:[
    // Extraction block order differs from left-column/right-column reading order.
    {number:0, lines:[{spans:[span("Necro ",25,4,292.5),...row("Fi ligature", "FMX", 25, 322.5).spans]}]},
    {number:1, lines:[head("1ST-LEVEL BARD SPELLS",10), row("Fi ligature","FMX",25),
      row("Empty",null,40), {spans:[span("Incomplete",55)]}, row("Malformed","AF",70), row("Ambiguous",null,85)]},
    {number:2, lines:[head("2ND-LEVEL SORCERER/WIZARD SPELLS",10,283.5),{spans:[span(" ",20,20,292.5)]}]}]},
  {page_index:270, source:{kind:"synthetic"}, extractor:{name:"synthetic"}, blocks:[{number:0, lines:[
    head("Balance Domain Spells",10), row("3 Domain Spell†",null,25), row("4 Other Edition",null,40),
    {spans:[span("5 ",55,4),span("Separate Digit†:",55,20,70),span(" summary",55,4,170)]}]}]},
];
const spells: SpellName[] = [
  {id:"spell:1",canonicalName:"ﬁligature",sourceRulebookId:86},
  ...["Empty","Incomplete","Malformed","Ambiguous","Ambiguous","Domain Spell","Separate Digit","Absent","Outside Owner"]
    .map((name,i)=>({id:`spell:${i+2}`,canonicalName:name,sourceRulebookId:86})),
];
const entry = (id: number, owner = "Bard", level = 1, ownerId = 3): NamedEntry => ({id:`list:${id}:${ownerId}:${level}`,
  spellId:`spell:${id}`,listType:["Balance","Hades"].includes(owner) ? "domain" : "class",ownerName:owner,ownerLegacyId:ownerId,
  level,rulebookId:86,sourceRowId:id,sourceTable:"synthetic",rawExtra:null,variantLabel:null,note:null,reviewStatus:"accepted"});
const entries = [entry(1),entry(2),entry(3),entry(4),entry(5),entry(6),entry(1,"Sorcerer",2,4),entry(1,"Wizard",2,1),
  entry(7,"Balance",3,127),entry(8,"Balance",5,127),entry(9),entry(10,"Healer",1,62)];
const result = processAutomaticMarkers(pages,"synthetic/sc-lists.jsonl",spells,entries);
assert.equal(result.coverage.sourceOccurrences,9);
assert.equal(result.coverage.targetRelationships,12);
assert.equal(result.machine.length,6);
assert.equal(result.occurrences.filter(o=>o.status === "out-of-scope").length,1);
assert.equal(result.machine[0]!.record.markers,"MFX");
assert(result.machine.every(m=>m.status === "machine" && m.record.reviewStatus === "candidate"));
const reason = (id:number) => result.relationships.find(r=>r.entry.spellId===`spell:${id}`)!.reason;
assert.equal(reason(3),"incomplete-label"); assert.equal(reason(4),"unknown-marker");
assert.equal(reason(5),"ambiguous-identity"); assert.equal(reason(6),"ambiguous-identity");
assert.equal(reason(9),"missing-occurrence"); assert.equal(reason(10),"missing-source-coverage");
const bard = entries[0]!, machine = result.machine;
assert.deepEqual(selectPrintedMarkers(bard,86,machine.map(m=>m.record)),{status:"unknown",reason:"not-accepted"});
assert.equal(selectProcessedMembershipMarkers([bard],86,[],machine).status,"machine");
assert.equal(displayMembershipMarkers([bard],86,[],machine),"MFX");
assert.equal(displayMembershipMarkers([entries[1]!],86,[],machine),"");
assert.equal(displayMembershipMarkers([entries[2]!],86,[],machine),null);
assert.equal(displayMembershipMarkers([bard],86,machine.map(m=>m.record),[]),null);
assert.equal(displayMembershipMarkers([{...entries[2]!,...{materialComponent:true,arcaneFocusComponent:true,xpComponent:true}}],86,[],machine),null);
const m = machine.find(m=>m.record.listEntryId===bard.id)!;
const accepted = {...m.record,reviewStatus:"accepted" as const};
assert.equal(selectProcessedMembershipMarkers([bard],86,[accepted],machine).status,"accepted");
assert.throws(()=>selectProcessedMembershipMarkers([{...bard,rawExtra:"restricted"}],86,[],machine),/Stale marker/);
assert.throws(()=>selectProcessedMembershipMarkers([bard],86,[],[m,m]),/Duplicate machine/);
function mutate(change:(copy:MachineMarker)=>void,pattern:RegExp) {
  const copy = structuredClone(m); change(copy);
  assert.throws(()=>selectProcessedMembershipMarkers([bard],86,[],[copy]),pattern);
}
mutate(copy=>copy.record.reviewStatus="accepted",/Invalid machine/);
mutate(copy=>copy.spell.id="spell:999",/identity match/);
mutate(copy=>copy.spell.sourceRulebookId=34,/identity match/);
mutate(copy=>copy.spell.canonicalName="Wrong name",/identity match/);
mutate(copy=>copy.context.level=2,/heading\/context/);
mutate(copy=>copy.ownerName="Wizard",/identity match/);
mutate(copy=>{copy.record.markers="F";copy.record.sourceJson=JSON.stringify({...JSON.parse(copy.record.sourceJson),markers:"F"});},/disagrees with printed spans/);
mutate(copy=>{const e=JSON.parse(copy.record.sourceJson);e.locator.lineIndex++;copy.record.sourceJson=JSON.stringify(e);},/locator mismatch/);
mutate(copy=>copy.context.heading.text="2ND-LEVEL BARD SPELLS",/heading evidence/);
const repeated = structuredClone(pages);
repeated[0]!.blocks[1]!.lines.push(row("Fi ligature","M",100));
const conflict = processAutomaticMarkers(repeated,"synthetic/sc-lists.jsonl",spells,entries);
assert.equal(conflict.relationships.find(r=>r.entry.id===bard.id)!.reason,"conflicting-occurrences");
assert(!conflict.machine.some(r=>r.record.listEntryId===bard.id));
const alternative = structuredClone(m);
const e = JSON.parse(alternative.record.sourceJson); e.locator.lineIndex=99; e.id="book:86:p244:b1:l99:s0";
e.markers="M";e.spans[e.markerSpanIndices[0]].text="M";
alternative.record={...alternative.record,id:`${e.id}:entry:${bard.id}`,sourceKey:e.id,markers:"M",sourceJson:JSON.stringify(e)};
assert.throws(()=>selectProcessedMembershipMarkers([bard],86,[accepted],[alternative]),/Conflicting processed/);
assert.throws(()=>selectProcessedMembershipMarkers([bard],86,[],[m,alternative]),/Conflicting processed/);
const pendingEntries = entries.map(e=>({...e,reviewStatus:"pending"}));
assert.equal(processAutomaticMarkers(pages,"synthetic/sc-lists.jsonl",spells,pendingEntries).machine.length,0);
assert.throws(()=>processAutomaticMarkers([...pages,...pages],"synthetic/sc-lists.jsonl",spells,entries),/Duplicate source page/);
assert.throws(()=>selectProcessedMembershipMarkers([bard,entries[6]!],86,[],machine),/Mixed display/);
const extra = {...bard,id:"list:duplicate",sourceRowId:999};
const extraMachine = structuredClone(m);
extraMachine.record.listEntryId=extra.id;extraMachine.record.id=`${extraMachine.record.sourceKey}:entry:${extra.id}`;
extraMachine.record.bindingJson=JSON.stringify({...JSON.parse(extraMachine.record.bindingJson!),entry:listIdentity(extra)});
assert.equal(selectProcessedMembershipMarkers([bard,extra],86,[],[m,extraMachine]).status,"machine");
assert.equal(displayMembershipMarkers([bard,extra],86,[],[m]),null);
const gap: PdfPage = {page_index:246,source:{kind:"synthetic"},extractor:{name:"synthetic"},
  blocks:[{number:0,lines:[row("Fi ligature","M",25)]}]};
const gapped = processAutomaticMarkers([pages[0]!,gap],"synthetic/sc-lists.jsonl",spells,entries);
assert.equal(gapped.occurrences.at(-1)!.reason,"missing-context");
const additionalPath = "synthetic/additional-domains.jsonl";
const planePages: PdfPage[] = [
  {page_index:282,source:{kind:"synthetic"},extractor:{name:"synthetic"},blocks:[{number:0,
    lines:[head("Hades Domain Spells",10),row("1 Domain Spell†",null,25)]}]},
  {page_index:283,source:{kind:"synthetic"},extractor:{name:"synthetic"},blocks:[{number:0,
    lines:[row("Separate Digit†","M",25),head("SOURCES",40),row("Bibliography†",null,55)]}]},
];
const planeEntries = [entry(7,"Hades",1,139),entry(8,"Hades",1,139)];
const planes = processAutomaticMarkers(planePages,"synthetic/base.jsonl",spells,planeEntries,
  new Map(planePages.map(p=>[p.page_index,additionalPath])));
assert.equal(planes.occurrences.length,2); assert.equal(planes.machine.length,2);
assert(planes.machine.every(m=>JSON.parse(m.record.sourceJson).extractionPath===additionalPath));
assert.equal(planes.machine[1]!.context.levelSource!.printedName,"1 Domain Spell†");
assert.equal(displayMembershipMarkers([planeEntries[1]!],86,[],planes.machine),"M");
const wrongLevel = structuredClone(planes.machine[1]!);
wrongLevel.context.levelSource!.spans[0]!.text="2 Domain Spell†:";
assert.throws(()=>selectProcessedMembershipMarkers([planeEntries[1]!],86,[],[wrongLevel]),/level source evidence/);
const unsupported = structuredClone(planePages);
unsupported[0]!.blocks[0]!.lines[0]=head("Balance Domain Spells",10);
assert.equal(processAutomaticMarkers(unsupported,"synthetic/base.jsonl",spells,planeEntries).occurrences.length,1);
const footer: PdfPage = {page_index:284,source:{kind:"synthetic"},extractor:{name:"synthetic"},blocks:[
  {number:0,lines:[head("Hades Domain Spells",10),{spans:[span("1",25),span(" ",25,4,65),
    span("Domain Spell†:",25,20,70),span(" summary",25,4,170)]}]},
  {number:1,lines:[row("Separate Digit†","M",25,292.5)]},
  {number:2,lines:[head("SOURCES",100),row("Bibliography†",null,120)]},
]};
const footerResult = processAutomaticMarkers([footer],additionalPath,spells,planeEntries);
assert.equal(footerResult.occurrences.length,2); assert.equal(footerResult.machine.length,2);
assert.equal(footerResult.occurrences[0]!.evidence.locator.nameSpanIndices[0],2);
assert.equal(displayMembershipMarkers([planeEntries[1]!],86,[],footerResult.machine),"M");
const temp = fs.mkdtempSync(path.join(os.tmpdir(),"automatic-markers-"));
try {
  fs.writeFileSync(path.join(temp,"existing.json"),"preserved","utf8");
  assert.throws(()=>main(["--data-root",temp,"--output","existing.json"]),/already exists/);
  assert.equal(fs.readFileSync(path.join(temp,"existing.json"),"utf8"),"preserved");
  assert.throws(()=>main(["--data-root",temp,"--output","../public.json"]),/inside data root/);
  assert.throws(()=>main(["--data-root",temp,"--input-revision","main","--output","new.json"]),/full Git commit/);
  assert.throws(()=>main(["--data-root","relative","--output","new.json"]),/must be absolute/);
  assert.throws(()=>main(["--data-root",temp,"--output","new.json","--force","true"]),/Usage/);
  assert.throws(()=>main(["--data-root",temp,"--output","new.json","--domain-input",additionalPath]),/supplied together/);
  assert.throws(()=>main(["--data-root",temp,"--output","new.json","--domain-input","../outside.jsonl",
    "--domain-revision","a".repeat(40)]),/data-root-relative/);
} finally {
  assert(path.isAbsolute(temp) && path.dirname(temp) === path.resolve(os.tmpdir()));
  fs.rmSync(temp,{recursive:true,force:true});
}
process.stdout.write("Automatic SC marker coverage, machine/accepted distinction, omission, identity and conflict checks passed\n");
