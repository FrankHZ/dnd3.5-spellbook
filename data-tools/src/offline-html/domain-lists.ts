import { execFileSync } from "node:child_process";
import { localDataDir } from "../shared/env";

export type DomainListBinding = {
  spellId: string; spellLegacyId: number; sourceRulebookId: number;
  canonicalName: string; nameZh: string; summaryText: string; daggerDisplay: boolean;
  relationshipEntryIds: string[]; relationshipDisposition: string;
  link: { kind: "local" | "online"; href: string };
};
export type DomainListOccurrence = {
  sourceKey: string; level: number; choiceGroup: string | null;
  alternativePolicy: "alignment" | null; bindings: DomainListBinding[];
  summaryText: string; printedMarkers: string | null; markerStatus: string;
  footnoteSymbols: string[]; readerNotes: string[];
};
export type CompleteDomainList = {
  ownerLegacyId: number; ownerName: string; nameZh: string;
  planar: boolean; levelChoiceCount: number;
  footnotes: { symbol: string; text: string }[]; occurrences: DomainListOccurrence[];
};
export type CompleteDomainLists = {
  schemaVersion: 1; rulebookId: 86; language: "zh"; reviewStatus: "source-reviewed-proposal-awaiting-main-gate";
  domains: CompleteDomainList[];
};

// Main-gate accepted this immutable #507 file; its original proposal status is retained.
export const scDomainListsRevision = "b18fbf663f605fe9d2f860f6265daf2d998c7533";
export function readScDomainLists(dataRoot = localDataDir()): CompleteDomainLists {
  return JSON.parse(execFileSync("git", ["-C", dataRoot, "show",
    `${scDomainListsRevision}:dice-qa/books/86/issue-507/html-domain-lists.zh.json`],
  { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }));
}
