import type { DiceRecord } from "./parse";
import { normalizeEnName } from "../zh-parser/header";

export type PublicationMap = { file: string; rulebookIds: number[]; editionIds: number[]; status: string; basis: string };
export type Rulebook = { id: number; editionId: number; name: string };
export type Target = { id: number; rulebookId: number; enName: string; zhName: string | null; zhBody: string | null };
export type Disposition = "exact" | "formatting-only" | "substantive" | "missing-current-Chinese" | "ambiguous-unmatched" | "malformed-incomplete" | "out-of-scope";
export type Candidate = {
  sourceKey: string; file: string; ordinal: number; startLine: number; endLine: number; rawHeader: string;
  targetId: number | null; rulebookId: number | null; editionId: number | null;
  publicationRulebookIds: number[]; publicationEditionIds: number[]; publicationBasis: string[]; sourceBookLabels: string[];
  field: "descriptionHtml"; zhName: string | null; enName: string | null;
  rawBody: string; bodyText: string; bodyHtml: string;
  baselineName: string | null; baselineBody: string | null; baselineKind: "I18nSpellText:zh:chm";
  nameHintTargetIds: number[]; aliasHintTargetIds: number[];
  classification: Disposition; problems: string[]; duplicateDecision: "single" | "review-required" | "not-applicable";
};

const key = (value: string) => normalizeEnName(value).toLocaleLowerCase("en").replace(/\s+/g, " ");
const plain = (value: string) => value.replace(/\r\n?/g, "\n").trim();
const compact = (value: string) => plain(value).replace(/[ \t\n]+/g, "");
const TABLE = /\t| {2,}|[│┌┐└┘┬┴┼]|\|.*\||(?:^|\n)表\s*\d/m;

export function compareBody(candidate: string, baseline: string | null): Disposition {
  if (!baseline) return "missing-current-Chinese";
  if (plain(candidate) === plain(baseline)) return "exact";
  if (!TABLE.test(candidate) && !TABLE.test(baseline) && compact(candidate) === compact(baseline)) return "formatting-only";
  return "substantive";
}

export function reconcile(
  records: DiceRecord[], mappings: PublicationMap[], rulebooks: Rulebook[], targets: Target[], revision: string,
  aliases: Record<string, string> = {},
): { candidates: Candidate[]; targetDispositions: Array<{ targetId: number; rulebookId: number; disposition: string; currentFallback: "existing-Chinese" | "English"; sourceKeys: string[] }> } {
  const mappingByName = new Map(mappings.map((row) => [row.file.replace(/\.txt$/i, ""), row]));
  const bookById = new Map(rulebooks.map((row) => [row.id, row]));
  const targetByBookName = new Map<string, Target[]>();
  const targetByName = new Map<string, Target[]>();
  for (const target of targets) {
    for (const name of [target.enName, target.zhName].filter((n): n is string => Boolean(n))) {
      const lookup = `${target.rulebookId}:${key(name)}`;
      targetByBookName.set(lookup, [...(targetByBookName.get(lookup) ?? []), target]);
      targetByName.set(key(name), [...(targetByName.get(key(name)) ?? []), target]);
    }
  }
  const candidates: Candidate[] = [];
  for (const record of records) {
    const sourceKey = `${revision}:${record.file}:${record.startLine}:${record.ordinal}`;
    const fileMap = mappingByName.get(record.file.replace(/\.txt$/i, ""));
    const labels = record.bookLabels.length ? record.bookLabels : [record.file.replace(/\.txt$/i, "")];
    const maps = labels.map((label) => mappingByName.get(label) ?? (label === record.file.replace(/\.txt$/i, "") ? fileMap : undefined));
    const problems = [...record.problems];
    if (maps.some((map) => !map)) problems.push("unmapped-publication-label");
    const bookIds = [...new Set(maps.flatMap((map) => map?.rulebookIds ?? []))];
    const publication = { rulebookIds: bookIds, editionIds: [...new Set(maps.flatMap((map) => map?.editionIds ?? []))], basis: maps.flatMap((map) => map ? [map.basis] : []) };
    if (maps.some((map) => map?.status === "ambiguous")) problems.push("ambiguous-publication-or-edition");
    if (bookIds.length === 0 || problems.includes("ambiguous-publication-or-edition") || maps.some((map) => !map)) {
      candidates.push(make(record, sourceKey, null, null, null, null, null,
        record.problems.length ? "malformed-incomplete" : bookIds.length ? "ambiguous-unmatched" : "out-of-scope", problems, publication));
      continue;
    }
    if (bookIds.length > 1) problems.push("multiple-publications-in-header");
    const matched = new Map<number, Target>();
    for (const bookId of bookIds) {
      if (record.enName) {
        for (const target of targetByBookName.get(`${bookId}:${key(record.enName)}`) ?? []) {
          if (key(target.enName) === key(record.enName)) matched.set(target.id, target);
        }
      }
    }
    if (matched.size !== 1 || bookIds.length > 1) {
      if (matched.size === 0) {
        problems.push("no-target-in-publication");
        const other = (record.enName ? targetByName.get(key(record.enName)) : []) ?? [];
        if (other.some((target) => !publication.editionIds.includes(bookById.get(target.rulebookId)?.editionId ?? -1))) {
          problems.push("edition-mismatch-or-other-edition-reprint");
        } else if (other.length) problems.push("other-publication-reprint");
      }
      else problems.push("homonym-or-reprint-needs-review");
      candidates.push(make(record, sourceKey, null, null, null, null, null,
        record.problems.length ? "malformed-incomplete" : "ambiguous-unmatched", problems, publication));
      continue;
    }
    const target = [...matched.values()][0]!;
    const book = bookById.get(target.rulebookId);
    candidates.push(make(record, sourceKey, target.id, target.rulebookId, book?.editionId ?? null,
      target.zhName, target.zhBody,
      record.problems.length ? "malformed-incomplete" : compareBody(record.bodyText, target.zhBody), problems, publication));
  }
  const aliasesByKey = new Map(Object.entries(aliases).map(([from, to]) => [key(from), to]));
  for (const candidate of candidates) {
    const alias = candidate.enName ? aliasesByKey.get(key(candidate.enName)) : undefined;
    for (const bookId of candidate.publicationRulebookIds) {
      if (candidate.zhName) {
        for (const target of targetByBookName.get(`${bookId}:${key(candidate.zhName)}`) ?? []) {
          if (target.zhName && key(target.zhName) === key(candidate.zhName)) candidate.nameHintTargetIds.push(target.id);
        }
      }
      if (alias) {
        for (const target of targetByBookName.get(`${bookId}:${key(alias)}`) ?? []) {
          if (key(target.enName) === key(alias)) candidate.aliasHintTargetIds.push(target.id);
        }
      }
    }
    candidate.nameHintTargetIds = [...new Set(candidate.nameHintTargetIds)];
    candidate.aliasHintTargetIds = [...new Set(candidate.aliasHintTargetIds)];
  }
  const byTarget = new Map<number, Candidate[]>();
  for (const candidate of candidates) {
    if (candidate.targetId === null) continue;
    byTarget.set(candidate.targetId, [...(byTarget.get(candidate.targetId) ?? []), candidate]);
  }
  for (const group of byTarget.values()) {
    for (const row of group) row.duplicateDecision = group.length > 1 ? "review-required" : "single";
  }
  const targetDispositions = targets.map((target) => {
    const group = byTarget.get(target.id) ?? [];
    return { targetId: target.id, rulebookId: target.rulebookId,
      disposition: group.length === 0 ? target.zhBody ? "fallback-existing-Chinese" : "fallback-English"
        : group.length > 1 ? "multiple-candidates-review-required" : group[0]!.classification,
      currentFallback: target.zhBody ? "existing-Chinese" as const : "English" as const,
      sourceKeys: group.map((row) => row.sourceKey) };
  });
  return { candidates, targetDispositions };
}

function make(record: DiceRecord, sourceKey: string, targetId: number | null, rulebookId: number | null,
  editionId: number | null, baselineName: string | null, baselineBody: string | null,
  classification: Disposition, problems: string[], publication: { rulebookIds: number[]; editionIds: number[]; basis: string[] }): Candidate {
  return { sourceKey, file: record.file, ordinal: record.ordinal, startLine: record.startLine,
    rawHeader: record.header,
    endLine: record.endLine, targetId, rulebookId, editionId, field: "descriptionHtml",
    publicationRulebookIds: publication.rulebookIds, publicationEditionIds: publication.editionIds,
    publicationBasis: publication.basis, sourceBookLabels: record.bookLabels,
    zhName: record.zhName, enName: record.enName, rawBody: record.rawBody, bodyText: record.bodyText,
    bodyHtml: record.bodyHtml, baselineName, baselineBody, baselineKind: "I18nSpellText:zh:chm",
    nameHintTargetIds: [], aliasHintTargetIds: [], classification, problems,
    duplicateDecision: "not-applicable" };
}
