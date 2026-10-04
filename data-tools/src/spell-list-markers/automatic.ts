import assert from "node:assert/strict";
import {inspectOccurrence, listIdentity, reviewedRecord, selectPrintedMarkers, validateBoundMarker,
  type ListIdentity, type MarkerEvidence, type MarkerRecord, type MarkerSelection,
  type PdfPage, type PdfSpan, type PrintedMarkers} from "./markers";

export type SpellName = {id: string; canonicalName: string; sourceRulebookId: number | null};
export type NamedEntry = ListIdentity & {ownerName: string};
type Heading = {pageIndex: number; blockIndex: number; text: string; spans: PdfSpan[]};
type Context = {listType: "class" | "domain"; ownerNames: string[]; level: number | null; heading: Heading;
  levelSource?: MarkerEvidence};
export type MachineMarker = {
  schemaVersion: 1; status: "machine"; method: "sc-complete-label-unique-identity-v1";
  record: MarkerRecord; context: Context; spell: SpellName; ownerName: string;
};
type Reason = "incomplete-label" | "unknown-marker" | "missing-context" | "unmatched-identity" |
  "ambiguous-identity" | "unaccepted-relationship" | "conflicting-occurrences" |
  "missing-source-coverage" | "missing-occurrence";
export type OccurrenceResult = {
  evidence: MarkerEvidence; context: Context | null; status: "machine" | "unknown" | "out-of-scope";
  reason: Reason | null; entryIds: string[];
};
export type RelationshipResult = {entry: ListIdentity; status: "machine" | "unknown";
  markers: PrintedMarkers | null; reason: Reason | null; sourceIds: string[]};
export type AutomaticMarkers = {
  schemaVersion: 1; rulebookId: 86; method: MachineMarker["method"];
  coverage: {pageIndices: number[]; printedPages: number[]; scope: "SC-edition-relationships";
    knownGap: string | null; sourceOccurrences: number; targetRelationships: number;
    occurrences: Record<string, number>; relationships: Record<string, number>};
  occurrences: OccurrenceResult[]; relationships: RelationshipResult[]; machine: MachineMarker[];
};

/** Only typography normalization: ligatures, curly punctuation and layout spacing. */
export function normalizedLabel(name: string) {
  return name.normalize("NFKC").replace(/[‘’]/g, "'").replace(/[‐‑–]/g, "-")
    .replace(/\s+/g, "").toLowerCase();
}
function headingContext(heading: Heading): Context | null {
  const text = heading.text.replace(/\s+/g, " ").trim();
  const cls = /^(\d)(?:ST|ND|RD|TH)?-LEVEL (ASSASSIN|BARD|BLACKGUARD|CLERIC|DRUID|PALADIN|RANGER|SORCERER\/WIZARD) SPELLS?(?: \(\w+\))?$/i.exec(text);
  if (cls) return {listType: "class", ownerNames: cls[2]!.toUpperCase() === "SORCERER/WIZARD"
    ? ["Sorcerer", "Wizard"] : [cls[2]!], level: Number(cls[1]), heading};
  const domain = /^([A-Za-z ]+) DOMAIN SPELLS$/i.exec(text);
  return domain ? {listType: "domain", ownerNames: [domain[1]!.trim()], level: null, heading} : null;
}
function label(evidence: MarkerEvidence, context: Context) {
  const domain = context.listType === "domain" ? /^(\d)\s+(.+)$/.exec(evidence.printedName) : null;
  return {name: (domain ? domain[2]! : evidence.printedName).replace(/†/g, "").trim(),
    level: domain ? Number(domain[1]) : context.level,
    inScope: context.listType === "class" || evidence.printedName.includes("†")};
}
function complete(evidence: MarkerEvidence) {
  const end = evidence.locator.nameSpanIndices.at(-1)!;
  const after = evidence.markerSpanIndices.at(-1) ?? end;
  return /:\s*$/.test(evidence.spans[end]!.text) || /^\s*:/.test(evidence.spans[after + 1]?.text ?? "");
}
function validPrefix(prefix: string, context: Context | null) {
  return !prefix.trim() || (context?.listType === "domain" ? /^\d\s+$/.test(prefix) :
    context?.ownerNames.includes("Wizard") && /^(?:Abjur|Conj|Div|Ench|Evoc|Illus|Necro|Trans|Univ)\s*$/.test(prefix));
}
function domainPrefix(prefix: string) { return /^\d\s+$/.test(prefix) ? prefix : ""; }
function planar(context: Context | null) {
  return context?.listType === "domain" && ["abyss", "arborea", "baator", "celestia", "elysium", "hades", "limbo", "mechanus"]
    .includes(normalizedLabel(context.ownerNames[0]!));
}
function key(type: string, owner: string, level: number | null, name: string) {
  return [type, normalizedLabel(owner), level, normalizedLabel(name)].join("|");
}

/** SC's cached two-column list pages; no PDF, DB, components or model calls. */
export function processAutomaticMarkers(pages: readonly PdfPage[], extractionPath: string,
  spells: readonly SpellName[], entries: readonly NamedEntry[],
  pageExtractionPaths: ReadonlyMap<number, string> = new Map()): AutomaticMarkers {
  assert.equal(new Set(pages.map(p => p.page_index)).size, pages.length, "Duplicate source page");
  assert(pages.every(p => p.page_index >= 244 && p.page_index <= 284), "SC list pages must be p245–285");
  const spellMap = new Map(spells.map(s => [s.id, {id: s.id, canonicalName: s.canonicalName, sourceRulebookId: s.sourceRulebookId}]));
  assert.equal(spellMap.size, spells.length, "Duplicate spell identity");
  const targets = entries.filter(e => e.rulebookId === 86 && spellMap.get(e.spellId)?.sourceRulebookId === 86);
  assert.equal(new Set(targets.map(e => e.id)).size, targets.length, "Duplicate relationship identity");
  const lookup = new Map<string, NamedEntry[]>(), covered = new Set<string>();
  for (const entry of targets) {
    listIdentity(entry);
    const k = key(entry.listType, entry.ownerName, entry.level, spellMap.get(entry.spellId)!.canonicalName);
    lookup.set(k, [...(lookup.get(k) ?? []), entry]);
  }
  const occurrences: OccurrenceResult[] = [], machine: MachineMarker[] = [];
  const failures = new Map<string, {reason: Reason; sourceIds: string[]}>();
  let context: Context | null = null, previousPage: number | null = null;
  let levelSource: MarkerEvidence | undefined;
  for (const page of [...pages].sort((a, b) => a.page_index - b.page_index)) {
    // Never carry a heading through absent pages or across the appendix boundary.
    if (previousPage === null || page.page_index !== previousPage + 1 || page.page_index === 270) {
      context = null; levelSource = undefined;
    }
    previousPage = page.page_index;
    // Recto/verso columns shift (right heading x=283.5 or 310.5).
    // 280 is the gutter boundary for both cached page layouts.
    const split = 280;
    // The full-width sources footer follows both columns, even when extracted
    // in a left-column block before the remaining right-column list rows.
    const footerY = Math.min(Infinity, ...page.blocks.flatMap(b => b.lines)
      .flatMap(l => l.spans.filter(s => s.text === "SOURCES" && s.size >= 11.5).map(s => s.bbox[1]!)));
    const events = page.blocks.flatMap((block, blockIndex) => {
      const headingSpans = block.lines.flatMap(l => l.spans.filter(s => s.size >= 11.5 && s.size < 15));
      const heading: Heading = {pageIndex: page.page_index, blockIndex,
        text: headingSpans.map(s => s.text).join(" "), spans: headingSpans};
      const parsed = headingContext(heading);
      const boundary = /^(?:[A-Za-z ]+ DOMAIN|SOURCES)$/.test(heading.text.trim());
      const rows = block.lines.map((line, lineIndex) => ({line, lineIndex, blockIndex, blockNumber: block.number,
        heading: null as Context | null, boundary: false, x: line.spans[0]?.bbox[0] ?? 0, y: line.spans[0]?.bbox[1] ?? 0}));
      if (parsed || boundary) rows.push({line: {spans: []}, lineIndex: -1, blockIndex, blockNumber: block.number,
        heading: parsed, boundary, x: headingSpans[0]!.bbox[0]!, y: headingSpans[0]!.bbox[1]!});
      return rows;
    }).filter(event => event.y < footerY)
      .sort((a, b) => Number(a.x >= split) - Number(b.x >= split) || a.y - b.y || a.lineIndex - b.lineIndex);
    for (const event of events) {
      if (event.heading || event.boundary) { context = event.heading; levelSource = undefined; continue; }
      const spans = event.line.spans;
      let first = spans.findIndex(s => Boolean(s.flags & 16) && !(s.flags & 1));
      if (context?.listType === "domain" && /^[1-9]$/.test(spans[first]?.text ?? "") &&
        /^\s+$/.test(spans[first+1]?.text ?? "") && Boolean((spans[first+2]?.flags ?? 0) & 16)) first += 2;
      if (first < 0 || spans[first]!.size < 9 || spans[first]!.size > 10.5) continue;
      const prefix = spans.slice(0, first).map(s => s.text).join("");
      if (!validPrefix(prefix, context)) continue;
      const nameSpanIndices: number[] = [];
      for (let i = first; spans[i] && (spans[i]!.flags & 16) && !(spans[i]!.flags & 1); i++) nameSpanIndices.push(i);
      if (!nameSpanIndices.map(i => spans[i]!.text).join("").replace(/:\s*$/, "").trim()) continue;
      const domainRow = /^\d\s+/.test(prefix + nameSpanIndices.map(i => spans[i]!.text).join(""));
      const continuation = !domainRow && planar(context) && levelSource !== undefined;
      if (page.page_index >= 270 && !domainRow && !continuation) continue;
      const evidence = inspectOccurrence([page], pageExtractionPaths.get(page.page_index) ?? extractionPath, 86, {pageIndex: page.page_index,
        blockIndex: event.blockIndex, blockNumber: event.blockNumber, lineIndex: event.lineIndex, nameSpanIndices});
      const row: OccurrenceResult = {evidence, context, status: "unknown", reason: null, entryIds: []};
      occurrences.push(row);
      if (!context || (context.listType === "domain") !== (domainRow || continuation)) { row.reason = "missing-context"; continue; }
      // A separately extracted non-bold domain digit is still an explicit level.
      const previousLevel = levelSource ? label({...levelSource, printedName:
        domainPrefix(levelSource.spans.slice(0, levelSource.locator.nameSpanIndices[0]).map(s => s.text).join("")) + levelSource.printedName}, context).level : null;
      const parsed = label({...evidence, printedName: domainPrefix(prefix) + evidence.printedName},
        continuation ? {...context, level: previousLevel} : context);
      const rowContext: Context = {...context, level: parsed.level, ...(continuation ? {levelSource: levelSource!} : {})}; row.context = rowContext;
      if (domainRow) levelSource = evidence;
      for (const owner of context.ownerNames) covered.add(key(context.listType, owner, parsed.level, ""));
      if (!parsed.inScope) { row.status = "out-of-scope"; continue; }
      let reason: Reason | null = !complete(evidence) ? "incomplete-label" : evidence.markers === null ? "unknown-marker" : null;
      for (const owner of context.ownerNames) {
        const matches = lookup.get(key(context.listType, owner, parsed.level, parsed.name)) ?? [];
        row.entryIds.push(...matches.map(e => e.id));
        const failure: Reason | null = matches.length !== 1 ? (matches.length ? "ambiguous-identity" : "unmatched-identity")
          : matches[0]!.reviewStatus !== "accepted" ? "unaccepted-relationship" : reason;
        if (failure) {
          reason = failure;
          for (const entry of matches) failures.set(entry.id, {reason: failure, sourceIds: [evidence.id]});
          continue;
        }
        const entry = matches[0]!;
        const record = reviewedRecord(evidence, {entry, printedName: evidence.printedName,
          reviewer: "automatic SC list processor v1", note: "Machine match: complete label, printed owner/level and unique SC-edition relationship; no human acceptance"}, [page], "candidate");
        machine.push({schemaVersion: 1, status: "machine", method: "sc-complete-label-unique-identity-v1",
          record, context: rowContext, spell: spellMap.get(entry.spellId)!, ownerName: entry.ownerName});
      }
      row.reason = reason; row.status = reason ? "unknown" : "machine";
    }
  }
  assert.equal(new Set(occurrences.map(o => o.evidence.id)).size, occurrences.length, "Duplicate source occurrence");
  const byEntry = new Map<string, MachineMarker[]>();
  for (const m of machine) byEntry.set(m.record.listEntryId!, [...(byEntry.get(m.record.listEntryId!) ?? []), m]);
  const relationships: RelationshipResult[] = targets.map(entry => {
    const rows = byEntry.get(entry.id) ?? [], failure = failures.get(entry.id);
    const reason = failure?.reason ?? (new Set(rows.map(m => m.record.markers)).size > 1 ? "conflicting-occurrences" :
      !rows.length ? covered.has(key(entry.listType, entry.ownerName, entry.level, "")) ? "missing-occurrence" : "missing-source-coverage" : null);
    return {entry: listIdentity(entry), status: reason ? "unknown" : "machine", markers: reason ? null : rows[0]!.record.markers,
      reason, sourceIds: [...new Set([...rows.map(m => m.record.sourceKey), ...(failure?.sourceIds ?? [])])]};
  });
  const unknown = new Map(relationships.filter(r => r.status === "unknown").map(r => [r.entry.id, r.reason]));
  for (const o of occurrences) if (o.entryIds.some(id => unknown.has(id))) {
    o.status = "unknown"; o.reason = unknown.get(o.entryIds.find(id => unknown.has(id))!)!;
  }
  const count = (rows: {status: string; reason: string | null; markers?: PrintedMarkers | null}[]) => {
    const result: Record<string, number> = {};
    for (const r of rows) { const k = r.status === "machine" ? r.markers === "" ? "explicit-empty" : "marked" : r.reason ?? r.status;
      result[k] = (result[k] ?? 0) + 1; }
    return result;
  };
  return {schemaVersion: 1, rulebookId: 86, method: "sc-complete-label-unique-identity-v1",
    coverage: {pageIndices: pages.map(p => p.page_index).sort((a,b) => a-b), printedPages: pages.map(p => p.page_index+1).sort((a,b) => a-b),
      scope: "SC-edition-relationships", knownGap: Array.from({length: 15}, (_, i) => i + 270).every(index => pages.some(p => p.page_index === index))
        ? null : pages.every(p => p.page_index <= 276)
          ? "Cached p245–277 only; Oracle p277 contains levels 1–5. Remaining domain appendix pages are absent."
          : "Incomplete p271–285 appendix input.",
      sourceOccurrences: occurrences.length, targetRelationships: targets.length,
      occurrences: count(occurrences.map(o => ({...o, markers: o.evidence.markers}))), relationships: count(relationships)},
    occurrences, relationships, machine: machine.filter(m => !unknown.has(m.record.listEntryId!))};
}

export type ProcessedMarkerSelection = MarkerSelection | {status: "machine"; markers: PrintedMarkers; sourceIds: string[]};

/** Explicit machine wrappers are eligible; ordinary candidate records remain ineligible. */
export function selectProcessedMembershipMarkers(entries: readonly ListIdentity[], rulebookId: number,
  records: readonly MarkerRecord[], machine: readonly MachineMarker[]): ProcessedMarkerSelection {
  assert(entries.length, "No list memberships");
  const first = entries[0]!;
  assert(entries.every(e => e.spellId === first.spellId && e.listType === first.listType &&
    e.ownerLegacyId === first.ownerLegacyId && e.level === first.level), "Mixed display memberships");
  const selected = entries.map(entry => {
    const accepted = selectPrintedMarkers(entry, rulebookId, records);
    const rows = machine.filter(m => m.record.listEntryId === entry.id && m.record.rulebookId === rulebookId);
    assert.equal(new Set(rows.map(m => m.record.id)).size, rows.length, "Duplicate machine occurrence");
    for (const m of rows) {
      assert(m.schemaVersion === 1 && m.status === "machine" && m.method === "sc-complete-label-unique-identity-v1" &&
        m.record.reviewStatus === "candidate" && rulebookId === 86, "Invalid machine marker contract");
      const evidence = validateBoundMarker(m.record, entry, rulebookId);
      const heading = headingContext(m.context.heading);
      assert.equal(m.context.heading.text, m.context.heading.spans.map(s => s.text).join(" "), "Machine heading evidence differs");
      assert(heading && heading.listType === m.context.listType &&
        heading.ownerNames.map(normalizedLabel).join("|") === m.context.ownerNames.map(normalizedLabel).join("|") &&
        (heading.level === null || heading.level === m.context.level), "Machine heading/context mismatch");
      const prefix = evidence.spans.slice(0, evidence.locator.nameSpanIndices[0]).map(s => s.text).join("");
      const parsed = label({...evidence, printedName: domainPrefix(prefix) + evidence.printedName}, m.context);
      if (m.context.levelSource) {
        const source = m.context.levelSource, loc = source.locator;
        assert(source.schemaVersion === 1 && source.rulebookId === rulebookId &&
          [loc.pageIndex,loc.blockIndex,loc.blockNumber,loc.lineIndex].every(i => Number.isSafeInteger(i) && i >= 0) &&
          source.id === `book:${rulebookId}:p${loc.pageIndex}:b${loc.blockNumber}:l${loc.lineIndex}:s${loc.nameSpanIndices[0]}`,
        "Machine level source identity differs");
        const inspected = inspectOccurrence([{page_index: loc.pageIndex, source: source.source, extractor: source.extractor,
          blocks: [{number: loc.blockNumber, lines: [{spans: source.spans}]}]}], source.extractionPath, rulebookId,
        {...loc, blockIndex: 0, lineIndex: 0});
        assert(inspected.printedName === source.printedName && inspected.markers === source.markers,
          "Machine level source evidence differs");
        assert.deepEqual(inspected.markerSpanIndices, source.markerSpanIndices, "Machine level source marker indices differ");
        const numberedName = domainPrefix(source.spans.slice(0, loc.nameSpanIndices[0]).map(s => s.text).join("")) + inspected.printedName;
        assert(/^\d\s+/.test(numberedName), "Machine level source lacks a printed digit");
        const level = label({...inspected, printedName: numberedName}, m.context).level;
        assert(planar(m.context) && level === entry.level && source.locator.pageIndex <= evidence.locator.pageIndex &&
          source.locator.pageIndex >= m.context.heading.pageIndex, "Machine continued domain level differs");
      } else if (m.context.listType === "domain") {
        assert(/^\d\s+/.test(domainPrefix(prefix) + evidence.printedName), "Machine domain level lacks printed evidence");
      }
      assert(validPrefix(prefix, m.context) && complete(evidence) && parsed.inScope && parsed.level === entry.level && m.context.level === entry.level &&
        m.context.listType === entry.listType && m.context.ownerNames.some(n => normalizedLabel(n) === normalizedLabel(m.ownerName)) &&
        m.spell.id === entry.spellId && m.spell.sourceRulebookId === 86 && entry.rulebookId === 86 &&
        normalizedLabel(parsed.name) === normalizedLabel(m.spell.canonicalName), "Machine source/identity match differs");
    }
    const values = [...rows.map(m => m.record.markers), ...(accepted.status === "accepted" ? [accepted.markers] : [])];
    assert(new Set(values).size <= 1, "Conflicting processed printed markers");
    if (accepted.status === "accepted") return accepted;
    return rows.length ? {status: "machine" as const, markers: rows[0]!.record.markers!, sourceIds: rows.map(m => m.record.sourceKey)} : accepted;
  });
  const unknown = selected.find(s => s.status === "unknown"); if (unknown) return unknown;
  const known = selected as Exclude<ProcessedMarkerSelection, {status: "unknown"}>[];
  assert.equal(new Set(known.map(s => s.markers)).size, 1, "Conflicting display membership markers");
  return {status: known.every(s => s.status === "accepted") ? "accepted" : "machine", markers: known[0]!.markers,
    sourceIds: [...new Set(known.flatMap(s => s.sourceIds))]};
}

/** HTML omits null; an explicit empty string is a known unmarked label. */
export function displayMembershipMarkers(entries: readonly ListIdentity[], rulebookId: number,
  records: readonly MarkerRecord[], machine: readonly MachineMarker[]): PrintedMarkers | null {
  const selected = selectProcessedMembershipMarkers(entries, rulebookId, records, machine);
  return selected.status === "unknown" ? null : selected.markers;
}
