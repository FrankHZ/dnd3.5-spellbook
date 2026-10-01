import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { bindRestoredScQaInputs, validateQaInputs, type EnglishRecord } from "./qa";
import { projectEffectiveChinese, type EffectiveChinese } from "./effective";
import type { ChineseTextBinding, SourceBoundFallbackReview } from "./source-bound-fallback";
import { localDataDir, repoRoot } from "../shared/env";
import Database from "better-sqlite3";

const restoredBaseline = "fe089990e2a5eeac69c92e068ca695f10c42ec58";
const jsonRows = <T>(path: string): T[] => readFileSync(path, "utf8").split(/\r?\n/)
  .filter(line => line.trim()).map(line => JSON.parse(line) as T);

/** Only SC's accepted #311 handoff is supported. The explicit revision is the
 * caller's main-gate accepted revision, not a discovery/acceptance registry.
 * Outputs are inspection evidence, never an importer/writer input.
 */
export function preflightEffectiveSc(dataRoot: string, acceptedBaseline: string,
  rulesPath: string, contentPath: string) {
  assert(/^[0-9a-f]{40}$/.test(acceptedBaseline), "accepted baseline must be an exact commit");
  const book = join(dataRoot, "dice-qa/books/86");
  const old = join(book, "issue-259/fresh-qa");
  const args = ["--data-root", dataRoot, "--rules-db", rulesPath, "--content-db", contentPath,
    "--rulebook-id", "86", "--restored-sc-baseline", restoredBaseline,
    "--reviews", join(old, "decisions.jsonl"), "--corrections", join(old, "corrections.jsonl"),
    "--full-body-audit", join(old, "full-body-audit.jsonl"), "--boundaries", join(old, "boundary-decisions.jsonl"),
    "--source-bound-fallback-reviews", join(book, "issue-292/independent-accepted.jsonl")];
  const qa = validateQaInputs(args);
  const handoff = join(book, "issue-311/batch-06");
  const paths = ["native-accepted.jsonl", "independent-accepted.jsonl", "current-inputs.json"]
    .map(file => join(handoff, file));
  const binding = bindRestoredScQaInputs(dataRoot, acceptedBaseline, paths,
    qa.result.accepted.map(row => row.sourceKey), qa.reviews.map(row => row.mappingRevision));
  const native = jsonRows<typeof qa.result.accepted[number]>(paths[0]!);
  const independent = jsonRows<SourceBoundFallbackReview>(paths[1]!);
  const snapshot = JSON.parse(readFileSync(paths[2]!, "utf8")) as { inputs: Array<{
    targetId: number; english: EnglishRecord; englishHtml: string | null; chinese: ChineseTextBinding }> };
  const current = [...qa.english].filter(([, en]) => en.rulebookId === 86).map(([targetId, english]) => ({
    targetId, english, englishHtml: qa.englishHtml.get(targetId),
    chinese: qa.chinese.get(targetId) ?? { name: null, descriptionText: null, descriptionHtml: null },
  }));
  assert.deepEqual(snapshot.inputs, current, "complete accepted current snapshot differs from current inputs");
  const content = new Database(contentPath, { readonly: true, fileMustExist: true });
  let chineseSources: Map<number, string | null>;
  try {
    content.pragma("query_only = ON");
    chineseSources = new Map((content.prepare("SELECT spellId, sourceKey FROM I18nSpellText WHERE lang='zh' AND variant='chm'")
      .all() as Array<{ spellId: number; sourceKey: string | null }>).map(row => [row.spellId, row.sourceKey]));
  } finally { content.close(); }
  const projected = projectEffectiveChinese({ ...qa, rulebookId: 86, chineseSources },
    qa.result, native, independent);
  assert.deepEqual([projected.summary.targets, projected.summary.fields, projected.summary.native,
    projected.summary.independent, projected.summary.acceptedNames, projected.summary.acceptedBodies],
  [1002, 2004, 658, 221, 41, 838], "SC accepted partition changed");
  return { ...projected, reviews: [...qa.reviews, ...independent], summary: { ...projected.summary, rulebookId: 86,
    acceptedInputBinding: binding, restoredInputBinding: qa.result.summary.restoredInputBinding,
    sourceRevision: qa.result.summary.sourceRevision, mappingRevision: qa.result.summary.mappingRevision,
    nativeSourceCoverage: qa.result.summary.sourceCoverage } };
}

export function assertCompletePdfBindings(bindings: Array<{ targetId: number; field: string; sourceKey: string | null }>,
  output: EffectiveChinese[]) {
  const expected = output.flatMap(row => (["name", "body"] as const).flatMap(field => {
    const origin = row[field].origin;
    return origin.kind === "native" || origin.kind === "independent"
      ? [`${row.targetId}:${field}:${origin.sourceKey}`] : [];
  })).sort();
  const actual = bindings.map(row => {
    assert(row.field === "name" || row.field === (row.sourceKey === null ? "descriptionText" : "descriptionHtml"),
      "illegal PDF binding field");
    return `${row.targetId}:${row.field === "name" ? "name" : "body"}:${row.sourceKey}`;
  }).sort();
  assert.deepEqual(actual, expected, "PDF bindings must cover exactly every accepted field");
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (name: string): string => {
    const at = argv.indexOf(`--${name}`);
    assert(at >= 0 && argv[at + 1], `missing --${name}`);
    return argv[at + 1]!;
  };
  const root = repoRoot();
  mkdirSync(join(root, "data-tools/out"), { recursive: true });
  const outputRoot = realpathSync(join(root, "data-tools/out"));
  // One fresh destination prevents a failed run leaving previous success files.
  // Fixed worktree-owned parent; user input is a single directory name, not a path.
  const run = arg("run");
  assert(/^[a-z0-9][a-z0-9-]*$/.test(run), "--run must be a new lowercase directory name");
  assert.equal(relative(join(root, "data-tools/out"), outputRoot), "", "output root must not redirect through a filesystem alias");
  const output = join(outputRoot, `dice-effective-${run}`);
  const result = preflightEffectiveSc(localDataDir(root), arg("accepted-baseline"),
    resolve(root, arg("rules-db")), resolve(root, arg("content-db")));
  const evidencePath = resolve(root, arg("pdf-evidence"));
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as {
    bindings: Parameters<typeof assertCompletePdfBindings>[0] };
  assertCompletePdfBindings(evidence.bindings, result.output);
  const sources = argv.flatMap((value, index) => value === "--source" ? [argv[index + 1]!] : []);
  assert(sources.length > 0 && sources.every(Boolean), "missing --source ID=PDF");
  const scratch = mkdtempSync(join(outputRoot, "dice-effective-preflight-"));
  let pdf: unknown;
  try {
    const decisions = join(scratch, "decisions.jsonl");
    writeFileSync(decisions, result.reviews.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
    // Some real PDFs emit MuPDF diagnostics on stdout. Route diagnostics to
    // stderr so the maintained verifier's JSON result remains machine-readable.
    pdf = JSON.parse(execFileSync(resolve(root, arg("pdf-python")), ["-B", "-c",
      "import sys,runpy,pymupdf; pymupdf.set_messages(stream=sys.stderr); runpy.run_module('pdf_extract.verify_evidence',run_name='__main__')",
      "--evidence", evidencePath, "--decisions", decisions, ...sources.flatMap(value => ["--source", value])],
    { cwd: root, encoding: "utf8", env: { ...process.env,
      PYTHONPATH: join(root, "data-tools/pdf-extract/src") } }));
  } finally {
    rmSync(scratch, { recursive: true }); // Exact tool-created disposable directory.
  }
  const summary = { ...result.summary, currentPdfVerification: pdf };
  mkdirSync(output); // No recursive/exist-ok: an old run is never overwritten.
  writeFileSync(join(output, "effective.jsonl"), result.output.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
  writeFileSync(join(output, "coverage.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ output, ...summary }));
}

if (require.main === module) main();
