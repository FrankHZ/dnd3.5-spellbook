import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {candidateRecord, inspectOccurrence, reviewedRecord, scanMarkerCandidates,
  selectMembershipMarkers, selectPrintedMarkers, requireAcceptedMembershipMarkers,
  type ListIdentity, type PdfPage, type PdfSpan} from "./markers";
import {assertNoStoredListMarkers, readPrintedMarkerRecords} from "./storage";
import {main} from "./cli";

const root = path.resolve(__dirname, "../../..");
const extraction = "synthetic/pages.jsonl";
const span = (text: string, flags = 20, size = 10): PdfSpan =>
  ({text, flags, size, font: "Synthetic", bbox: [10, 10, 20, 20], origin: [10, 20]});
const labels = ["M", "F", "X", "MF", "MX", "FX", "MFX"];
const pages: PdfPage[] = [{page_index: 244, source: {kind: "synthetic"}, extractor: {name: "synthetic"},
  blocks: [{number: 4, lines: [
    ...labels.map(mark => ({spans: [span("Synthetic "), span(mark, 21, 6), span(": summary", 4)]})),
    {spans: [span("No marker:"), span(" summary", 4)]},
    {spans: [span("Continued name")]},
    {spans: [span("Odd marker"), span("AF", 21, 6), span(": summary", 4)]},
    {spans: [span("Not superscript"), span("M", 20), span(": summary", 4)]},
    {spans: [span("Split marker"), span("F", 21, 6), span("M", 21, 6), span(": summary", 4)]},
  ]}]}];
const locator = (lineIndex: number) => ({pageIndex: 244, blockIndex: 0, blockNumber: 4, lineIndex, nameSpanIndices: [0]});
const inspect = (line: number) => inspectOccurrence(pages, extraction, 86, locator(line));
const entry: ListIdentity = {id: "list:synthetic", spellId: "spell:123", listType: "class", ownerLegacyId: 4,
  level: 2, rulebookId: 86, sourceRowId: 5, sourceTable: "synthetic-class",
  rawExtra: null, variantLabel: null, note: null, reviewStatus: "accepted"};
const review = (line: number, identity = entry, decision: "candidate" | "accepted" | "rejected" = "accepted") =>
  reviewedRecord(inspect(line), {entry: identity, printedName: inspect(line).printedName,
    reviewer: "synthetic review", note: "Synthetic owner/level/identity and complete name checked"}, pages, decision);

const candidates = scanMarkerCandidates(pages, extraction, 86);
assert.equal(candidates.length, 9); // Seven combinations, malformed, split pair; ordinary 'M' excluded.
assert.deepEqual(candidates.slice(0, 7).map(row => row.markers), labels);
assert.equal(inspect(7).markers, ""); assert.equal(inspect(8).markers, null); assert.equal(inspect(9).markers, null);
assert.equal(inspect(11).markers, "MF");
const incomplete = structuredClone(pages); incomplete[0]!.blocks[0]!.lines[0]!.spans =
  [span("Part of "), span("complete name"), span("M",21,6), span(": summary",4)];
assert.throws(() => inspectOccurrence(incomplete, extraction,86,locator(0)), /Incomplete printed name/);
const undelimited = structuredClone(pages); undelimited[0]!.blocks[0]!.lines[7]!.spans = [span("Maybe continued"),span("ordinary text",4)];
assert.equal(inspectOccurrence(undelimited, extraction,86,locator(7)).markers,null);
assert(candidates.map(candidateRecord).every(row => row.reviewStatus === "candidate" && row.listEntryId === null));
for (const line of [8, 9]) assert.throws(() => review(line), /Unknown markers/);
assert.throws(() => inspectOccurrence(pages, extraction, 86, {...locator(0), blockNumber: 9}), /changed source block/);
assert.throws(() => inspectOccurrence(pages, extraction, 86, {...locator(0), nameSpanIndices: [1]}), /printed label/);
assert.throws(() => inspectOccurrence(pages, "../other.jsonl", 86, locator(0)), /data-root-relative/);
assert.throws(() => scanMarkerCandidates([...pages, ...pages], extraction, 86), /Duplicate source page/);
const tampered = {...inspect(0), markers: "X" as const};
assert.throws(() => reviewedRecord(tampered, {entry, printedName: "Synthetic", reviewer: "reviewer", note: "review"}, pages, "accepted"), /evidence differs/);
assert.deepEqual(selectPrintedMarkers(entry, 86, []), {status: "unknown", reason: "missing"});
assert.deepEqual(selectPrintedMarkers(entry, 86, [review(0, entry, "candidate")]), {status: "unknown", reason: "not-accepted"});
assert.deepEqual(selectPrintedMarkers(entry, 86, [review(0, entry, "rejected")]), {status: "unknown", reason: "not-accepted"});
assert.equal(selectPrintedMarkers(entry, 87, [review(0)]).status, "unknown");
const noMarker = selectPrintedMarkers(entry, 86, [review(7)]); assert(noMarker.status === "accepted" && noMarker.markers === "");
assert.throws(() => selectPrintedMarkers(entry, 86, [review(0), review(1)]), /Conflicting accepted/);
assert.throws(() => selectPrintedMarkers({...entry, level: 3}, 86, [review(0)]), /Stale marker/);
assert.throws(() => selectPrintedMarkers({...entry, rawExtra: "new restriction"}, 86, [review(0)]), /Stale marker/);
const forged = review(0); forged.markers = "X";
forged.sourceJson = JSON.stringify({...JSON.parse(forged.sourceJson), markers: "X"});
assert.throws(() => selectPrintedMarkers(entry, 86, [forged]), /disagrees with printed spans/);
const pendingRelation = {...entry, reviewStatus: "review"};
assert.throws(() => selectPrintedMarkers(pendingRelation, 86, [review(0, pendingRelation)]), /Unaccepted list/);
assert.throws(() => selectPrintedMarkers(entry, 86, [review(0), review(0)]), /Duplicate marker/);
const domain = {...entry, id: "domain:synthetic", listType: "domain", sourceTable: "synthetic-domain"};
assert.equal(selectPrintedMarkers(domain, 86, [review(2, domain)]).status, "accepted");
const duplicateMembership = {...entry, id: "list:synthetic:second", sourceRowId: 6};
assert.equal(selectMembershipMarkers([entry, duplicateMembership], 86, [review(0)]).status, "unknown");
assert.throws(() => requireAcceptedMembershipMarkers([entry], 86, [review(0, entry, "candidate")]), /release export blocked/);
assert.equal(requireAcceptedMembershipMarkers([entry], 86, [review(7)]), "");
const grouped = selectMembershipMarkers([entry, duplicateMembership], 86, [review(0), review(0, duplicateMembership)]);
assert(grouped.status === "accepted" && grouped.markers === "M");
assert.throws(() => selectMembershipMarkers([entry, domain], 86, []), /Mixed display/);
// Complete components have no route into the selector; adding incidental DTO fields changes nothing.
assert.deepEqual(selectPrintedMarkers({...entry, ...{material_component: true, arcane_focus_component: true, xp_component: true}}, 86, []),
  {status: "unknown", reason: "missing"});

const db = new Database(":memory:");
try {
  assertNoStoredListMarkers(db); assert.deepEqual(readPrintedMarkerRecords(db, 86), []);
  db.exec(fs.readFileSync(path.join(root, "server/db/content/migrations/20261004000000_add_printed_list_markers/migration.sql"), "utf8"));
  assertNoStoredListMarkers(db);
  const insert = db.prepare(`INSERT INTO SpellListMarker(id,sourceKey,rulebookId,listEntryId,markers,reviewStatus,sourceJson,bindingJson)
    VALUES(@id,@sourceKey,@rulebookId,@listEntryId,@markers,@reviewStatus,@sourceJson,@bindingJson)`);
  insert.run(review(5));
  insert.run(review(5, {...entry, id: "shared-row:wizard", ownerLegacyId: 1}));
  const stored = readPrintedMarkerRecords(db, 86), before = JSON.stringify(stored);
  assert.equal(selectPrintedMarkers(entry, 86, stored).status, "accepted");
  assert.throws(() => assertNoStoredListMarkers(db), /coordinate a source-bound marker rebuild/);
  assert.equal(JSON.stringify(readPrintedMarkerRecords(db, 86)), before);
  for (const row of [ {...candidateRecord(inspect(0)), id: "bad:review", reviewStatus: "accepted"},
    {...review(0), id: "bad:letters", markers: "AF"}, {...review(0), id: "bad:unknown", markers: null} ]) {
    assert.throws(() => insert.run(row), /CHECK constraint/);
  }
  db.prepare("INSERT INTO SpellListMarker(id,sourceKey,rulebookId,markers,sourceJson) VALUES('default','default',86,NULL,'{}')").run();
  assert.equal((db.prepare("SELECT reviewStatus FROM SpellListMarker WHERE id='default'").get() as {reviewStatus: string}).reviewStatus, "candidate");
} finally { db.close(); }

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "printed-list-markers-"));
try {
  fs.mkdirSync(path.join(temp, "synthetic")); fs.writeFileSync(path.join(temp, extraction), pages.map(page => JSON.stringify(page)).join("\n"), "utf8");
  const args = ["--data-root", temp, "--input", extraction, "--output", "synthetic/candidates.json"];
  main(args);
  const result = JSON.parse(fs.readFileSync(path.join(temp, "synthetic/candidates.json"), "utf8"));
  assert.equal(result.coverage, "marked-occurrence-candidates-only"); assert.equal(result.records.length, 9);
  const output = fs.readFileSync(path.join(temp, "synthetic/candidates.json"));
  assert.throws(() => main(args), /EEXIST/); assert(fs.readFileSync(path.join(temp, "synthetic/candidates.json")).equals(output));
  assert.throws(() => main(["--data-root", temp, "--input", extraction, "--output", "../public.json"]), /inside data root/);
  assert.throws(() => main([...args, "--output", "synthetic/second.json"]), /Usage/);
} finally { fs.rmSync(temp, {recursive: true, force: true}); }
process.stdout.write("Printed list marker extraction, review, selection, schema and private-output checks passed\n");
