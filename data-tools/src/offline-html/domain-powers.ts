import { execFileSync } from "node:child_process";
import { localDataDir } from "../shared/env";

export type DomainPower = {
  ownerLegacyId: number; ownerName: string; entryIds: string[];
  grantedPowerText: string; requirementText: string | null;
  sharedRulesKey: string | null; readerNotes: string[];
};
export type DomainPowers = {
  schemaVersion: 1; rulebookId: 86; language: "zh";
  sharedRules: Record<string, string[]>; domains: DomainPower[];
};

// #504 content accepted by main-gate; the candidate-named path is frozen.
export const scDomainPowersRevision = "e2e4b698eee3c9339303fa1b233c646fd993c702";
export function readScDomainPowers(dataRoot = localDataDir()): DomainPowers {
  return JSON.parse(execFileSync("git", ["-C", dataRoot, "show",
    `${scDomainPowersRevision}:dice-qa/books/86/issue-504/candidate/html-domain-powers.zh.json`],
  { encoding: "utf8", maxBuffer: 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }));
}
