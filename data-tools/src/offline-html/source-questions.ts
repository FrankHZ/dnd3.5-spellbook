import { execFileSync } from "node:child_process";
import { localDataDir } from "../shared/env";

type SourcePage = { sourceId: string; printedPage: number | null; physicalPage: number };
export type SourceQuestion = {
  targetId: number; questionId: string; language: "zh-CN";
  chineseName: string; englishName: string; state: "source-unresolved";
  kind: "conflict" | "interpretation" | "missing-explanation";
  currentNote: string; bodyText: string; bodyHtml: string; errataFinding: string;
  sourceIssue: { impact: string };
  statements: (SourcePage & { sourceQuote: string })[];
  contextPages: (SourcePage & { readText: string })[];
};

// #416 / PR #417 freezes the existing review checklist, not a rules ruling.
export const scSourceQuestionsRevision = "dac21d3e4070e5c1c6c6bc3a01e5e2a095b917b2";
export const scSourceQuestionsPath = "dice-qa/books/86/issue-416/question-bindings.jsonl";
export function readScSourceQuestions(dataRoot = localDataDir()): SourceQuestion[] {
  const raw = execFileSync("git", ["-C", dataRoot, "show", `${scSourceQuestionsRevision}:${scSourceQuestionsPath}`],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  const rows: SourceQuestion[] = raw.trim().split(/\r?\n/u).map(line => JSON.parse(line));
  if (rows.length !== 40 || new Set(rows.map(row => row.targetId)).size !== 38) {
    throw new Error("Incomplete fixed SC source-question checklist");
  }
  return rows;
}
