import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
import { parseDiceFile } from "./parse";
import { reconcile, type PublicationMap, type Rulebook, type Target } from "./reconcile";

function arg(name: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at < 0 || !process.argv[at + 1]) throw new Error(`missing --${name}`);
  return resolve(process.argv[at + 1]!);
}
function jsonl(rows: unknown[]): string { return rows.map((row) => JSON.stringify(row)).join("\n") + "\n"; }
function count(values: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return result;
}

function main(): void {
  const dataRoot = arg("data-root");
  const rulesPath = arg("rules-db");
  const contentPath = arg("content-db");
  const reportDir = arg("report-dir");
  const inputDir = join(dataRoot, "spells-dice-db-by-mo");
  const privateDir = join(dataRoot, "dice-intake");
  const revision = execFileSync("git", ["-C", dataRoot, "log", "-1", "--format=%H", "--", "spells-dice-db-by-mo"], { encoding: "utf8" }).trim();
  const mappingRevision = execFileSync("git", ["-C", dataRoot, "log", "-1", "--format=%H", "--", "dice-intake/publication-map.json"], { encoding: "utf8" }).trim();
  if (!revision || !mappingRevision) throw new Error("source and publication map must be committed before inventory");
  const dirtyInputs = execFileSync("git", ["-C", dataRoot, "status", "--porcelain", "--", "spells-dice-db-by-mo", "dice-intake/publication-map.json"], { encoding: "utf8" }).trim();
  if (dirtyInputs) throw new Error("source or publication map has uncommitted changes");
  const mappings = JSON.parse(readFileSync(join(privateDir, "publication-map.json"), "utf8")) as PublicationMap[];
  const aliases = JSON.parse(readFileSync(join(dataRoot, "chm-mapping", "enName-aliases-global.json"), "utf8")) as Record<string, string>;
  const names = readdirSync(inputDir).filter((name) => name.endsWith(".txt")).sort();
  if (mappings.length !== names.length || names.some((name) => !mappings.some((row) => row.file === name))) {
    throw new Error("publication map must have exactly one row per source file");
  }
  const files = names.map((name) => {
    const bytes = readFileSync(join(inputDir, name));
    return { bytes: bytes.length, parsed: parseDiceFile(name, bytes) };
  });
  const rules = new Database(rulesPath, { readonly: true, fileMustExist: true });
  const content = new Database(contentPath, { readonly: true, fileMustExist: true });
  rules.pragma("query_only = ON"); content.pragma("query_only = ON");
  const rulebooks = rules.prepare("SELECT id, dnd_edition_id AS editionId, name FROM dnd_rulebook")
    .all() as Rulebook[];
  const booksById = new Map(rulebooks.map((book) => [book.id, book]));
  for (const row of mappings) {
    for (const id of row.rulebookIds) {
      const book = booksById.get(id);
      if (!book || !row.editionIds.includes(book.editionId)) {
        throw new Error(`publication map has unsupported rulebook or edition: ${row.file}`);
      }
    }
  }
  const zh = new Map<number, { name: string | null; body: string | null }>();
  for (const row of content.prepare("SELECT spellId, name, descriptionText FROM I18nSpellText WHERE lang='zh' AND variant='chm'")
    .all() as Array<{ spellId: number; name: string | null; descriptionText: string | null }>) {
    zh.set(row.spellId, { name: row.name, body: row.descriptionText });
  }
  const targets = (rules.prepare("SELECT id, rulebook_id AS rulebookId, name AS enName FROM dnd_spell")
    .all() as Array<{ id: number; rulebookId: number; enName: string }>).map((row): Target => ({
      ...row, zhName: zh.get(row.id)?.name ?? null, zhBody: zh.get(row.id)?.body ?? null,
    }));
  rules.close(); content.close();
  const { candidates, targetDispositions } = reconcile(files.flatMap(({ parsed }) => parsed.records), mappings, rulebooks, targets, revision, aliases);
  mkdirSync(privateDir, { recursive: true }); mkdirSync(reportDir, { recursive: true });
  const inventory = files.map(({ bytes, parsed }) => ({
    file: parsed.file, bytes, encoding: parsed.encoding, lineCount: parsed.lineCount,
    preamble: parsed.preamble, credit: null, version: null, metadataStatus: "unknown-unless-evidenced-in-preamble",
    recordCount: parsed.records.length,
    disposition: parsed.records.length ? "records-in-candidates" : "no-parsed-records-preamble-preserved",
    publication: mappings.find((row) => row.file === parsed.file),
  }));
  writeFileSync(join(privateDir, "source-inventory.jsonl"), jsonl(inventory), "utf8");
  writeFileSync(join(privateDir, "candidates.jsonl"), jsonl(candidates), "utf8");
  writeFileSync(join(privateDir, "target-inventory.jsonl"), jsonl(targetDispositions), "utf8");
  const pilotCases: Array<[string, (row: typeof candidates[number]) => boolean]> = [
    ["ordinary-substantive", (row) => row.classification === "substantive" && row.publicationRulebookIds.length === 1],
    ["missing-current-Chinese", (row) => row.classification === "missing-current-Chinese"],
    ["duplicate-target", (row) => row.duplicateDecision === "review-required"],
    ["multiple-publications", (row) => row.problems.includes("multiple-publications-in-header")],
    ["unmatched-target", (row) => row.problems.includes("no-target-in-publication")],
    ["unmatched-publication", (row) => row.classification === "out-of-scope"],
    ["malformed", (row) => row.classification === "malformed-incomplete"],
    ["table-or-layout", (row) => /\n[^\n]*\|[^\n]*\n|\t/.test(row.rawBody)],
    ["alternate-field-label", (row) => /(?:法术抗性|影响区域|范围)\s*[:：]/.test(row.rawBody)],
    ["header-like-body", (row) => /[（(][A-Za-z][^）)]{1,80}[）)][（(][^）)]{1,30}[）)]/.test(row.rawBody)],
  ];
  const pilot = pilotCases.map(([pilotCase, predicate]) => ({ pilotCase, candidate: candidates.find(predicate) ?? null }));
  writeFileSync(join(privateDir, "pilot.jsonl"), jsonl(pilot), "utf8");
  const report = {
    sourceRevision: revision, mappingRevision, files: files.length, bytes: files.reduce((sum, row) => sum + row.bytes, 0),
    encodings: count(files.map((row) => row.parsed.encoding)),
    publicationStatus: count(mappings.map((row) => row.status)),
    rawRecords: candidates.length,
    sourceDispositions: { exact: 0, "formatting-only": 0, substantive: 0, "missing-current-Chinese": 0,
      "ambiguous-unmatched": 0, "malformed-incomplete": 0, "out-of-scope": 0,
      ...count(candidates.map((row) => row.classification)) },
    sourceProblems: count(candidates.flatMap((row) => row.problems)),
    uniqueMatchedTargets: new Set(candidates.flatMap((row) => row.targetId === null ? [] : [row.targetId])).size,
    duplicateCandidateOccurrences: candidates.filter((row) => row.duplicateDecision === "review-required").length,
    duplicateTargets: new Set(candidates.filter((row) => row.duplicateDecision === "review-required").map((row) => row.targetId)).size,
    unsupportedOrNewOccurrences: candidates.filter((row) => row.classification === "out-of-scope" || row.problems.includes("no-target-in-publication")).length,
    editionMismatchOccurrences: candidates.filter((row) => row.problems.includes("edition-mismatch-or-other-edition-reprint")).length,
    reviewedAliasHintsOnly: candidates.filter((row) => row.aliasHintTargetIds.length > 0).length,
    chineseNameHintsOnly: candidates.filter((row) => row.nameHintTargetIds.length > 0 && row.targetId === null).length,
    existingTargets: targets.length, targetDispositions: count(targetDispositions.map((row) => row.disposition)),
    targetsWithoutCandidates: targetDispositions.filter((row) => row.sourceKeys.length === 0).length,
    currentFallback: count(targetDispositions.map((row) => row.currentFallback)),
    filesWithoutRecords: files.filter((row) => row.parsed.records.length === 0).length,
    pilotCases: Object.fromEntries(pilot.map((row) => [row.pilotCase, row.candidate !== null])),
  };
  writeFileSync(join(reportDir, "coverage.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

main();
