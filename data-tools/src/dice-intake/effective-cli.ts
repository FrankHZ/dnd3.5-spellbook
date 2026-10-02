import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { bindRestoredScQaInputs, validateQaInputs, type EnglishRecord } from "./qa";
import { projectEffectiveChinese, projectAcceptedBodyAmendments, reconcileEffectiveProjection, type EffectiveChinese } from "./effective";
import type { AcceptedBodyAmendment, ChineseTextBinding, SourceBoundFallbackReview } from "./source-bound-fallback";
import { localDataDir, repoRoot } from "../shared/env";
import Database from "better-sqlite3";

const restoredBaseline = "fe089990e2a5eeac69c92e068ca695f10c42ec58";
export const effective879Baseline = "da691dacd3973d38a9d0f66a08d78fdb1eaafd47";
export const currentEffectiveBaseline = "6a73f4d64682325c67e2c40595008344fb5c3be5";
export const acceptedUnionRevision = "296903c61e20ce359812148fc0faa234ca2508e7";
const amendmentPath = "dice-qa/books/86/issue-335/validated-amendments.jsonl";

export function assertEffectiveBaseline(revision: string) {
  assert(revision === effective879Baseline || revision === currentEffectiveBaseline,
    "unsupported exact accepted SC baseline");
}
const jsonRows = <T>(path: string): T[] => readFileSync(path, "utf8").split(/\r?\n/)
  .filter(line => line.trim()).map(line => JSON.parse(line) as T);

/** Explicit fixed #311 or #337 input, never discovery of a floating latest.
 * Outputs are inspection evidence, never an importer/writer input.
 */
export function preflightEffectiveSc(dataRoot: string, acceptedBaseline: string,
  rulesPath: string, contentPath: string) {
  assertEffectiveBaseline(acceptedBaseline);
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
  const bind = (revision: string, files: string[]) => bindRestoredScQaInputs(dataRoot, revision, files,
    qa.result.accepted.map(row => row.sourceKey), qa.reviews.map(row => row.mappingRevision));
  const binding = bind(effective879Baseline, paths);
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
  const input = { ...qa, rulebookId: 86, chineseSources };
  const projected = projectEffectiveChinese(input,
    qa.result, native, independent);
  assert.deepEqual([projected.summary.targets, projected.summary.fields, projected.summary.native,
    projected.summary.independent, projected.summary.acceptedNames, projected.summary.acceptedBodies],
  [1002, 2004, 658, 221, 41, 838], "SC accepted partition changed");
  const common = { rulebookId: 86,
    acceptedInputBinding: binding, restoredInputBinding: qa.result.summary.restoredInputBinding,
    sourceRevision: qa.result.summary.sourceRevision, mappingRevision: qa.result.summary.mappingRevision,
    nativeSourceCoverage: qa.result.summary.sourceCoverage };
  if (acceptedBaseline === effective879Baseline) return { ...projected, reviews: [...qa.reviews, ...independent],
    amendmentReviews: [] as SourceBoundFallbackReview[], reconciliation: undefined,
    summary: { ...projected.summary, ...common } };
  const nativePath = "dice-qa/books/86/issue-329/native-accepted.jsonl";
  const independentPath = "dice-qa/books/86/issue-329/independent-proposed-union.jsonl";
  const snapshotPath = "dice-qa/books/86/issue-329/current-inputs.json";
  const unionBinding = bind(acceptedUnionRevision, [nativePath, independentPath, snapshotPath].map(path => join(dataRoot, path)));
  const amendmentBinding = bind(currentEffectiveBaseline, [join(dataRoot, amendmentPath)]);
  const unionNative = jsonRows<typeof native[number]>(join(dataRoot, nativePath));
  const unionIndependent = jsonRows<SourceBoundFallbackReview>(join(dataRoot, independentPath));
  assert.deepEqual(JSON.parse(readFileSync(join(dataRoot, snapshotPath), "utf8")).inputs, current,
    "complete union current snapshot differs from current inputs");
  const union = projectEffectiveChinese(input, qa.result, unionNative, unionIndependent);
  assert.deepEqual([union.summary.native, union.summary.independent, union.summary.acceptedNames, union.summary.acceptedBodies],
    [658, 368, 41, 985], "SC accepted union partition changed");
  const amendments = jsonRows<AcceptedBodyAmendment>(join(dataRoot, amendmentPath));
  assert.deepEqual(amendments.map(row => row.targetId), [3781, 3942, 3989, 4089, 4306, 4369, 4376, 4600, 4618, 4736],
    "complete accepted amendment set changed");
  const amended = projectAcceptedBodyAmendments(input, union, { revision: acceptedUnionRevision,
    native: { path: nativePath, rows: unionNative }, independent: { path: independentPath, rows: unionIndependent } },
    amendments, { revision: currentEffectiveBaseline, path: amendmentPath });
  const reconciliation = reconcileEffectiveProjection(projected.output, amended.output);
  assert.deepEqual([reconciliation.newlyAcceptedBodies.length, reconciliation.amendedBodies.length,
    reconciliation.fallback.filter(row => row.field === "name").length,
    reconciliation.fallback.filter(row => row.field === "body").length], [147, 10, 961, 17], "SC exact fallback/delta changed");
  return { ...amended, reviews: [...qa.reviews, ...unionIndependent], amendmentReviews: amendments.map(row => row.review),
    reconciliation, summary: { ...amended.summary, ...common, acceptedInputBinding: unionBinding,
      amendmentInputBinding: amendmentBinding, previousAcceptedInputBinding: binding,
      changesFromEffective879: { newlyAcceptedBodies: reconciliation.newlyAcceptedBodies,
        amendedBodies: reconciliation.amendedBodies }, fallbackNames: 961, fallbackBodies: 17 } };
}

export function assertCompletePdfBindings(bindings: Array<{ targetId: number; field: string; sourceKey: string | null }>,
  output: EffectiveChinese[]) {
  const expected = output.flatMap(row => (["name", "body"] as const).flatMap(field => {
    const origin = row[field].origin;
    return origin.kind === "native" || origin.kind === "independent"
      ? [`${row.targetId}:${field}:${origin.activeAmendment ? null : origin.sourceKey}`] : [];
  })).sort();
  const actual = bindings.map(row => {
    assert(row.field === "name" || row.field === (row.sourceKey === null ? "descriptionText" : "descriptionHtml"),
      "illegal PDF binding field");
    return `${row.targetId}:${row.field === "name" ? "name" : "body"}:${row.sourceKey}`;
  }).sort();
  assert.deepEqual(actual, expected, "PDF bindings must cover exactly every accepted field");
}

export function effectiveArguments(argv: string[]) {
  const arg = (name: string): string => {
    const at = argv.indexOf(`--${name}`);
    assert(at >= 0 && argv[at + 1], `missing --${name}`);
    return argv[at + 1]!;
  };
  const root = repoRoot();
  const run = arg("run");
  assert(/^[a-z0-9][a-z0-9-]*$/.test(run), "--run must be a new lowercase directory name");
  const sources = argv.flatMap((value, index) => value === "--source" ? [argv[index + 1]!] : []);
  assert(sources.length > 0 && sources.every(Boolean), "missing --source ID=PDF");
  return { root, run, dataRoot: localDataDir(root), acceptedBaseline: arg("accepted-baseline"),
    rulesPath: resolve(root, arg("rules-db")), contentPath: resolve(root, arg("content-db")),
    python: resolve(root, arg("pdf-python")), sources,
    evidencePath: argv.includes("--pdf-evidence") ? resolve(root, arg("pdf-evidence")) : undefined };
}

export function effectiveOutputRoot(root: string) {
  mkdirSync(join(root, "data-tools/out"), { recursive: true });
  const outputRoot = realpathSync(join(root, "data-tools/out"));
  assert.equal(relative(join(root, "data-tools/out"), outputRoot), "", "output root must not redirect through a filesystem alias");
  return outputRoot;
}

/** The same complete QA, original-source binding and fresh PDF verification is
 * mandatory for both inspection and the disposable writer. No JSON projection
 * file can replace this entry. */
export function verifiedEffectiveSc(options: ReturnType<typeof effectiveArguments>) {
  const { root, dataRoot, acceptedBaseline, rulesPath, contentPath, evidencePath, python, sources } = options;
  const outputRoot = effectiveOutputRoot(root);
  const result = preflightEffectiveSc(dataRoot, acceptedBaseline, rulesPath, contentPath);
  // Generated evidence may be compared, but never supplies original authority.
  if (evidencePath) {
    const candidate = JSON.parse(readFileSync(evidencePath, "utf8")) as {
      bindings: Parameters<typeof assertCompletePdfBindings>[0] };
    assertCompletePdfBindings(candidate.bindings, result.output);
  }
  const scratch = mkdtempSync(join(outputRoot, "dice-effective-preflight-"));
  let pdf: unknown;
  try {
    const decisions = join(scratch, "decisions.jsonl");
    writeFileSync(decisions, result.reviews.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
    const amendments = join(scratch, "amendment-decisions.jsonl");
    if (result.amendmentReviews.length) writeFileSync(amendments,
      result.amendmentReviews.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
    pdf = JSON.parse(execFileSync(python, ["-B", "-m", "pdf_extract.verify_effective_sc",
      "--data-root", dataRoot, "--accepted-baseline", acceptedBaseline,
      ...(evidencePath ? ["--evidence", evidencePath] : []),
      "--decisions", decisions, ...(result.amendmentReviews.length ? ["--amendment-decisions", amendments] : []),
      ...sources.flatMap(value => ["--source", value])],
    { cwd: root, encoding: "utf8", env: { ...process.env,
      PYTHONPATH: join(root, "data-tools/pdf-extract/src") } }));
  } finally {
    rmSync(scratch, { recursive: true }); // Exact tool-created disposable directory.
  }
  return { ...result, summary: { ...result.summary, currentPdfVerification: pdf } };
}

function main() {
  const options = effectiveArguments(process.argv.slice(2));
  const output = join(effectiveOutputRoot(options.root), `dice-effective-${options.run}`);
  const { output: rows, summary, reconciliation } = verifiedEffectiveSc(options);
  mkdirSync(output); // No recursive/exist-ok: an old run is never overwritten.
  writeFileSync(join(output, "effective.jsonl"), rows.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
  writeFileSync(join(output, "coverage.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
  if (reconciliation) writeFileSync(join(output, "reconciliation.json"), JSON.stringify(reconciliation, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ output, ...summary }));
}

if (require.main === module) main();
