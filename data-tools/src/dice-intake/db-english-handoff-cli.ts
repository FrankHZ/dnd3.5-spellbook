import assert from "node:assert/strict";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { dicePaths, isolatedOutputs, noAlias, pathArg, within } from "./paths";
import { validateQaInputs } from "./qa";
import {
  bindCommittedInputs,
  cityscapeAcceptance as a,
  handoffFiles,
  planDbEnglishHandoff,
  requireHandoffDbRoles,
  validateHandoffEvidence,
  type HandoffEvidence,
} from "./db-english-handoff";

export function checkHandoffArguments(argv: string[]) {
  const allowed = [
    "data-root",
    "rules-db",
    "content-db",
    "report-dir",
    "accepted-revision",
  ];
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]!.slice(2);
    assert(
      argv[index] === `--${key}` &&
        allowed.includes(key) &&
        !seen.has(key) &&
        argv[index + 1] &&
        !argv[index + 1]!.startsWith("--"),
      "unknown/repeated/missing handoff option",
    );
    seen.add(key);
  }
  const at = argv.indexOf("--accepted-revision");
  assert(
    at < 0 || argv[at + 1] === a.revision,
    "only the exact main-gate accepted Cityscape revision is supported",
  );
}

export function runDbEnglishHandoff(argv: string[]) {
  const started = performance.now();
  checkHandoffArguments(argv);
  const { dataRoot } = dicePaths(argv);
  const baselineDir = join(dataRoot, "dice-baselines/issue-520");
  const book = join(dataRoot, a.directory);
  const rulesPath = pathArg("rules-db", argv),
    contentPath = pathArg("content-db", argv);
  const reportDir = pathArg("report-dir", argv),
    owned = join(dataRoot, "dice-handoffs/issue-527");
  for (const path of [dataRoot, rulesPath, contentPath, reportDir])
    noAlias(path);
  assert(
    within(owned, reportDir),
    "report directory must belong to private dice-handoffs/issue-527",
  );
  assert(!existsSync(reportDir), "handoff requires a fresh output directory");
  const outputPaths = ["proposal.json", "report.json"].map((file) =>
    join(reportDir, file),
  );
  isolatedOutputs(
    dataRoot,
    owned,
    [reportDir, ...outputPaths],
    [
      baselineDir,
      join(dataRoot, "spells-dice-db-by-mo"),
      join(dataRoot, "dice-intake"),
      join(dataRoot, "dice-qa"),
      join(dataRoot, "chm-mapping"),
      rulesPath,
      contentPath,
    ],
  );
  const sameFile = (left: string, right: string) => {
    const l = statSync(left),
      r = statSync(right);
    return l.dev === r.dev && l.ino === r.ino;
  };
  assert(
    !sameFile(rulesPath, contentPath),
    "rules/content DB paths alias the same file",
  );
  const evidencePaths = handoffFiles.map((file) => join(book, file));
  const acceptedBuffers = bindCommittedInputs(
    dataRoot,
    a.revision,
    evidencePaths,
  );
  bindCommittedInputs(dataRoot, a.preparedRevision, [
    join(book, "target-inputs.jsonl"),
    join(baselineDir, "intake/candidates.jsonl"),
    join(baselineDir, "intake/source-inventory.jsonl"),
  ]);
  const rows = <T>(file: string): T[] =>
    acceptedBuffers
      .get(join(book, file))!
      .toString("utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  const evidence: HandoffEvidence = {
    accepted: rows("out/accepted.jsonl"),
    fallback: rows("out/fallback.jsonl"),
    targetInputs: rows("target-inputs.jsonl"),
    clauses: rows("clause-review.jsonl"),
    unresolved: rows("unresolved.jsonl"),
    semantic: JSON.parse(
      acceptedBuffers.get(join(book, "semantic-review.json"))!.toString("utf8"),
    ),
  };
  const stamp = (path: string) => {
    const s = statSync(path);
    return [s.dev, s.ino, s.size, s.mtimeMs];
  };
  const beforeFiles = [stamp(rulesPath), stamp(contentPath)];
  const rules = new Database(rulesPath, {
    readonly: true,
    fileMustExist: true,
  });
  const content = new Database(contentPath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    rules.pragma("query_only=ON");
    content.pragma("query_only=ON");
    requireHandoffDbRoles(rules, content);
    const qa = validateQaInputs([
      "--data-root",
      dataRoot,
      "--baseline-dir",
      baselineDir,
      "--rules-db",
      rulesPath,
      "--content-db",
      contentPath,
      "--rulebook-id",
      "53",
    ]);
    bindCommittedInputs(
      dataRoot,
      a.revision,
      qa.inputPaths.filter(
        (path) => path !== rulesPath && path !== contentPath,
      ),
    );
    assert.equal(
      qa.result.summary.sourceRevision,
      a.sourceRevision,
      "source revision drift",
    );
    assert.equal(
      qa.result.summary.mappingRevision,
      a.sourceRevision,
      "map revision drift",
    );
    const coverage = validateHandoffEvidence(qa, evidence);
    assert.equal(coverage.segments, 64, "accepted clause count drift");
    assert.equal(
      coverage.physicalLines,
      67,
      "accepted English line count drift",
    );
    const proposal = planDbEnglishHandoff(content, evidence);
    assert.deepEqual(
      [stamp(rulesPath), stamp(contentPath)],
      beforeFiles,
      "DB changed during readonly preflight",
    );
    const report = {
      schema: "dice-db-english-handoff.v1",
      mode: "readonly-check",
      acceptedRevision: a.revision,
      preparedRevision: a.preparedRevision,
      reviewedPublicHead: a.reviewedPublicHead,
      evidenceDirectory: a.directory,
      rulebookId: 53,
      targets: a.targets,
      fields: ["name", "descriptionHtml", "descriptionText"],
      ...coverage,
      names: 8,
      bodies: 8,
      residualOwnerIssue: 160,
      sourceCoverage: qa.result.summary.sourceCoverage,
      actions: {
        insert: proposal.filter((row) => row.action === "insert").length,
        update: proposal.filter((row) => row.action === "update").length,
      },
      protection: {
        readonly: rules.readonly && content.readonly,
        queryOnly: true,
        dbFilesUnchanged: true,
        scRows: (
          content
            .prepare(
              "SELECT count(*) AS n FROM I18nSpellText WHERE rulebookId=86",
            )
            .get() as { n: number }
        ).n,
        nonTargetRows: (
          content
            .prepare(
              "SELECT count(*) AS n FROM I18nSpellText WHERE spellId NOT BETWEEN 355 AND 362",
            )
            .get() as { n: number }
        ).n,
        preserved: [
          "SC fixed acceptance",
          "non-target rows",
          "IDs",
          "English",
          "mechanics",
          "summaries",
          "relationships",
          "CHM fallback",
          "normalized build",
        ],
      },
      activation: false,
      importable: false,
      writerAvailable: false,
      consumer: {
        nativeFieldLocatorsReusable: true,
        dbEnglishReviewAndResidualContract: "missing",
        ftsUpdate: "requires-next-slice",
      },
      resources: {
        elapsedMs: Math.round(performance.now() - started),
        peakRssMiB: process.resourceUsage().maxRSS / 1024,
      },
    };
    const texts = [
      JSON.stringify(
        { schema: report.schema, acceptedRevision: a.revision, proposal },
        null,
        2,
      ) + "\n",
      JSON.stringify(report, null, 2) + "\n",
    ];
    const outputBytes = texts.reduce(
      (n, text) => n + Buffer.byteLength(text),
      0,
    );
    assert(outputBytes < 5 * 1024 * 1024, "unexpected output volume");
    assert(
      report.resources.elapsedMs < 60_000 && report.resources.peakRssMiB < 512,
      "preflight exceeds resource budget",
    );
    mkdirSync(reportDir, { recursive: true });
    texts.forEach((text, index) =>
      writeFileSync(outputPaths[index]!, text, {
        encoding: "utf8",
        flag: "wx",
      }),
    );
    return { ...report, outputBytes };
  } finally {
    rules.close();
    content.close();
  }
}

if (
  process.argv[1]
    ?.replaceAll("\\", "/")
    .endsWith("/dice-intake/db-english-handoff-cli.ts")
) {
  console.log(JSON.stringify(runDbEnglishHandoff(process.argv.slice(2))));
}
