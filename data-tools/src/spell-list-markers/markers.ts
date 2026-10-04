import assert from "node:assert/strict";

export type PrintedMarkers = "" | "M" | "F" | "X" | "MF" | "MX" | "FX" | "MFX";
export type PdfSpan = {
  text: string; size: number; flags: number; font: string;
  bbox: number[]; origin: number[];
};
export type PdfPage = {
  page_index: number; source: unknown; extractor: unknown;
  blocks: { number: number; lines: { spans: PdfSpan[] }[] }[];
};
export type Locator = {
  pageIndex: number; blockIndex: number; blockNumber: number; lineIndex: number;
  nameSpanIndices: number[];
};
export type MarkerEvidence = {
  schemaVersion: 1; id: string; rulebookId: number; extractionPath: string;
  locator: Locator; printedName: string; markers: PrintedMarkers | null;
  markerSpanIndices: number[]; spans: PdfSpan[];
  source: unknown; extractor: unknown;
};
export type ListIdentity = {
  id: string; spellId: string; listType: string; ownerLegacyId: number; level: number;
  rulebookId: number | null; sourceRowId: number | null; sourceTable: string;
  rawExtra: string | null; variantLabel: string | null; note: string | null; reviewStatus: string;
};
export type MarkerRecord = {
  id: string; sourceKey: string; rulebookId: number; listEntryId: string | null;
  markers: PrintedMarkers | null; reviewStatus: "candidate" | "accepted" | "rejected";
  sourceJson: string; bindingJson: string | null;
};
export function assertMarkers(value: unknown): asserts value is PrintedMarkers | null {
  assert(value === null || (typeof value === "string" && /^(?:M?F?X?)$/.test(value)),
    "Printed markers must be null or canonical M/F/X characters");
}
function index(value: number) { assert(Number.isSafeInteger(value) && value >= 0, "Invalid source index"); }
function sourceLine(pages: readonly PdfPage[], locator: Locator) {
  for (const value of [locator.pageIndex, locator.blockIndex, locator.blockNumber, locator.lineIndex]) index(value);
  const matches = pages.filter(page => page.page_index === locator.pageIndex);
  assert.equal(matches.length, 1, "Missing/duplicate source page");
  const page = matches[0]!, block = page.blocks[locator.blockIndex];
  assert(block && block.number === locator.blockNumber, "Missing/changed source block");
  const line = block.lines[locator.lineIndex];
  assert(line, "Missing source line");
  return { page, line };
}
function isSuperscript(span: PdfSpan) { return Boolean(span.flags & 1); }
function isName(span: PdfSpan) { return Boolean(span.flags & 16) && !isSuperscript(span); }

/** Exact name spans supplied by review; no spell-name matching or component inference. */
export function inspectOccurrence(pages: readonly PdfPage[], extractionPath: string,
  rulebookId: number, locator: Locator): MarkerEvidence {
  assert(Number.isSafeInteger(rulebookId) && rulebookId > 0, "Invalid rulebook identity");
  assert(extractionPath && !extractionPath.includes("\\") && !extractionPath.startsWith("/") &&
    !extractionPath.split("/").some(part => part === ".." || part === ".") && !/^[A-Za-z]:/.test(extractionPath),
  "Extraction path must be data-root-relative");
  const { page, line } = sourceLine(pages, locator);
  for (const span of line.spans) {
    assert(typeof span.text === "string" && typeof span.font === "string" &&
      Number.isSafeInteger(span.flags) && span.flags >= 0 && Number.isFinite(span.size) && span.size > 0 &&
      span.bbox.length === 4 && span.origin.length === 2 && [...span.bbox, ...span.origin].every(Number.isFinite),
    "Malformed source span");
  }
  assert(locator.nameSpanIndices.length > 0, "Explicit name spans required");
  locator.nameSpanIndices.forEach((n, i) => {
    index(n);
    assert(i === 0 || n === locator.nameSpanIndices[i - 1]! + 1, "Name spans must be contiguous");
    assert(line.spans[n] && isName(line.spans[n]!), "Name span is missing or not a printed label");
  });
  const first = locator.nameSpanIndices[0]!, last = locator.nameSpanIndices.at(-1)!;
  assert(first === 0 || !isName(line.spans[first - 1]!), "Incomplete printed name span range start");
  assert(!line.spans[last + 1] || !isName(line.spans[last + 1]!), "Incomplete printed name span range");
  const names = locator.nameSpanIndices.map(n => line.spans[n]!.text);
  const printedName = names.join("").replace(/:\s*$/, "").trim();
  assert(printedName, "Empty printed name");
  const markerSpanIndices: number[] = [];
  let markerText = "", cursor = last + 1;
  while (line.spans[cursor] && isSuperscript(line.spans[cursor]!)) {
    markerSpanIndices.push(cursor); markerText += line.spans[cursor]!.text.trim(); cursor++;
  }
  // A name line can continue in the next extraction line. Absence is unknown
  // unless the label has a visible trailing ':' delimiter.
  const terminated = /:\s*$/.test(names.at(-1)!) || /^\s*:/.test(line.spans[cursor]?.text ?? "");
  let markers: PrintedMarkers | null = null;
  if (markerText && /^[MFX]+$/.test(markerText) && new Set(markerText).size === markerText.length) {
    markers = (["M", "F", "X"] as const).filter(char => markerText.includes(char)).join("") as PrintedMarkers;
  } else if (!markerSpanIndices.length && terminated) markers = "";
  return {
    schemaVersion: 1, id: `book:${rulebookId}:p${locator.pageIndex}:b${locator.blockNumber}:l${locator.lineIndex}:s${first}`,
    rulebookId, extractionPath, locator, printedName, markers, markerSpanIndices,
    spans: line.spans, source: page.source, extractor: page.extractor,
  };
}

/** Find superscript candidates. Unmarked lines are inspected only with explicit locators. */
export function scanMarkerCandidates(pages: readonly PdfPage[], extractionPath: string, rulebookId: number) {
  const candidates: MarkerEvidence[] = [], ids = new Set<string>(), pageIds = new Set<number>();
  for (const page of pages) {
    index(page.page_index); assert(!pageIds.has(page.page_index), "Duplicate source page"); pageIds.add(page.page_index);
    page.blocks.forEach((block, blockIndex) => block.lines.forEach((line, lineIndex) => {
      line.spans.forEach((span, spanIndex) => {
        if (!isSuperscript(span) || !spanIndex || !isName(line.spans[spanIndex - 1]!)) return;
        const nameSpanIndices = [spanIndex - 1];
        for (let n = spanIndex - 2; n >= 0 && isName(line.spans[n]!); n--) nameSpanIndices.unshift(n);
        const evidence = inspectOccurrence([page], extractionPath, rulebookId,
          { pageIndex: page.page_index, blockIndex, blockNumber: block.number, lineIndex, nameSpanIndices });
        assert(!ids.has(evidence.id), "Duplicate source occurrence"); ids.add(evidence.id); candidates.push(evidence);
      });
    }));
  }
  return candidates;
}

export function candidateRecord(evidence: MarkerEvidence): MarkerRecord {
  assertMarkers(evidence.markers);
  return { id: evidence.id, sourceKey: evidence.id, rulebookId: evidence.rulebookId, listEntryId: null,
    markers: evidence.markers, reviewStatus: "candidate", sourceJson: JSON.stringify(evidence), bindingJson: null };
}

/** A reviewed explicit relation binding; this function does not grant source acceptance. */
export type MarkerBinding = {
  entry: ListIdentity; printedName: string; reviewer: string; note: string;
};
export function reviewedRecord(evidence: MarkerEvidence, binding: MarkerBinding,
  pages: readonly PdfPage[], decision: "candidate" | "accepted" | "rejected"): MarkerRecord {
  assert(["candidate", "accepted", "rejected"].includes(decision), "Unknown marker review decision");
  const current = inspectOccurrence(pages, evidence.extractionPath, evidence.rulebookId, evidence.locator);
  assert.deepEqual(current, evidence, "Marker evidence differs from the supplied extraction");
  assert(binding.printedName === evidence.printedName && binding.reviewer.trim() && binding.note.trim(),
    "Explicit label, reviewer and relationship/source review note required");
  assertIdentity(binding.entry);
  if (decision === "accepted") assert(evidence.markers !== null, "Unknown markers cannot be accepted");
  // One printed Sorcerer/Wizard row can bind two distinct generated memberships.
  return { ...candidateRecord(evidence), id: `${evidence.id}:entry:${binding.entry.id}`, listEntryId: binding.entry.id,
    reviewStatus: decision, bindingJson: JSON.stringify({...binding, entry: listIdentity(binding.entry)}) };
}
export function listIdentity(entry: ListIdentity): ListIdentity {
  assertIdentity(entry);
  return {id: entry.id, spellId: entry.spellId, listType: entry.listType, ownerLegacyId: entry.ownerLegacyId,
    level: entry.level, rulebookId: entry.rulebookId, sourceRowId: entry.sourceRowId, sourceTable: entry.sourceTable,
    rawExtra: entry.rawExtra, variantLabel: entry.variantLabel, note: entry.note, reviewStatus: entry.reviewStatus};
}
function assertIdentity(entry: ListIdentity) {
  assert(entry && typeof entry.id === "string" && entry.id.length && /^spell:\d+$/.test(entry.spellId), "Invalid stable list/spell ID");
  assert(["class", "domain"].includes(entry.listType) && Number.isSafeInteger(entry.ownerLegacyId) && entry.ownerLegacyId > 0 &&
    Number.isSafeInteger(entry.level) && entry.level >= 0 && entry.level <= 9 &&
    (entry.rulebookId === null || (Number.isSafeInteger(entry.rulebookId) && entry.rulebookId > 0)) &&
    (entry.sourceRowId === null || (Number.isSafeInteger(entry.sourceRowId) && entry.sourceRowId >= 0)) &&
    typeof entry.sourceTable === "string" && entry.sourceTable.length &&
    [entry.rawExtra, entry.variantLabel, entry.note].every(value => value === null || typeof value === "string") &&
    typeof entry.reviewStatus === "string" && entry.reviewStatus.length, "Invalid list relationship snapshot");
}

export type MarkerSelection = { status: "accepted"; markers: PrintedMarkers; sourceIds: string[] } |
  { status: "unknown"; reason: "missing" | "not-accepted" };

/** Select a printed list's markers, never global spell components. */
export function selectPrintedMarkers(entry: ListIdentity, rulebookId: number,
  records: readonly MarkerRecord[]): MarkerSelection {
  assertIdentity(entry);
  const rows = records.filter(row => row.listEntryId === entry.id && row.rulebookId === rulebookId);
  if (!rows.length) return { status: "unknown", reason: "missing" };
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length, "Duplicate marker occurrence");
  const accepted = rows.filter(row => row.reviewStatus === "accepted");
  if (!accepted.length) return { status: "unknown", reason: "not-accepted" };
  for (const row of accepted) {
    assertMarkers(row.markers); assert(row.markers !== null, "Accepted marker cannot be unknown");
    const evidence = JSON.parse(row.sourceJson) as MarkerEvidence;
    const binding = JSON.parse(row.bindingJson ?? "null") as MarkerBinding | null;
    assert(evidence.schemaVersion === 1 && evidence.id === row.sourceKey &&
      row.id === `${row.sourceKey}:entry:${entry.id}` && evidence.rulebookId === rulebookId &&
      evidence.markers === row.markers, "Stored marker source identity/value mismatch");
    const loc = evidence.locator;
    for (const value of [loc.pageIndex, loc.blockIndex, loc.blockNumber, loc.lineIndex]) index(value);
    assert.equal(evidence.id, `book:${rulebookId}:p${loc.pageIndex}:b${loc.blockNumber}:l${loc.lineIndex}:s${loc.nameSpanIndices[0]}`,
      "Stored marker occurrence locator mismatch");
    const fromSpans = inspectOccurrence([{page_index: loc.pageIndex, source: evidence.source, extractor: evidence.extractor,
      blocks: [{number: loc.blockNumber, lines: [{spans: evidence.spans}]}]}], evidence.extractionPath, rulebookId,
    {...loc, blockIndex: 0, lineIndex: 0});
    assert(fromSpans.printedName === evidence.printedName && fromSpans.markers === row.markers,
      "Stored marker disagrees with printed spans");
    assert.deepEqual(fromSpans.markerSpanIndices, evidence.markerSpanIndices, "Stored marker span indices differ");
    assert(binding && binding.reviewer.trim() && binding.note.trim() && binding.printedName === evidence.printedName,
      "Accepted marker lacks independent source/binding review");
    assert.deepEqual(binding.entry, listIdentity(entry), "Stale marker relationship binding");
    assert.equal(entry.reviewStatus, "accepted", "Unaccepted list relationship cannot publish markers");
  }
  assert.equal(new Set(accepted.map(row => row.markers)).size, 1, "Conflicting accepted printed markers");
  return { status: "accepted", markers: accepted[0]!.markers!, sourceIds: [...new Set(accepted.map(row => row.sourceKey))] };
}

/** The HTML consumer groups multiple memberships into a single displayed row. */
export function selectMembershipMarkers(entries: readonly ListIdentity[], rulebookId: number,
  records: readonly MarkerRecord[]): MarkerSelection {
  assert(entries.length, "No list memberships");
  const first = entries[0]!;
  assert(entries.every(entry => entry.spellId === first.spellId && entry.listType === first.listType &&
    entry.ownerLegacyId === first.ownerLegacyId && entry.level === first.level), "Mixed display memberships");
  const selected = entries.map(entry => selectPrintedMarkers(entry, rulebookId, records));
  const unknown = selected.find(row => row.status === "unknown");
  if (unknown) return unknown;
  const accepted = selected as Extract<MarkerSelection, {status: "accepted"}>[];
  assert.equal(new Set(accepted.map(row => row.markers)).size, 1, "Conflicting display membership markers");
  return { status: "accepted", markers: accepted[0]!.markers, sourceIds: [...new Set(accepted.flatMap(row => row.sourceIds))] };
}

/** Release export must stop on unknown/candidate rows instead of silently omitting a required marker. */
export function requireAcceptedMembershipMarkers(entries: readonly ListIdentity[], rulebookId: number,
  records: readonly MarkerRecord[]): PrintedMarkers {
  const selected = selectMembershipMarkers(entries, rulebookId, records);
  assert(selected.status === "accepted", "Printed list markers remain unknown/unaccepted; release export blocked");
  return selected.markers;
}
