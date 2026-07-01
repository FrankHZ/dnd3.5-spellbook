import fs from "node:fs";
import path from "node:path";

import {
  chooseExact,
  exactNameMatchKeys,
  nameMatchKeys,
  normalizeName,
} from "./en-summary-matching";
import { localDataDir } from "./env";

type Severity = "error" | "warning" | "info";

type QaIssue = {
  severity: Severity;
  code: string;
  detail: string;
  file?: string;
  queue?: string;
  count?: number;
  sourceKey?: string;
  spellId?: number | null;
  enName?: string;
  zhName?: string;
};

type QaSummary = {
  generatedAt: string;
  inputs: {
    zhSummaryDir: string;
    enSourceIndex: string;
    enStrictMissing: string;
    enCandidates: string;
    reviewResultsDir: string;
    outDir: string;
  };
  issueCount: number;
  bySeverity: Record<Severity, number>;
  byCode: Record<string, number>;
  zh: {
    matched: number;
    unmatched: number;
    conflicts: number;
    aliasAuditEntries: number;
    aliasReviewRequired: number;
    textIssues: number;
  };
  en: {
    sourceIndexPresent: boolean;
    candidates: number;
    matchedCandidates: number;
    missingCandidates: number;
    ambiguousCandidates: number;
    strict35QaCandidates: number;
  };
  crossCoverage: {
    zhUniqueNames: number;
    enUniqueNames: number;
    zhWithoutEn: number;
    enWithoutZh: number;
  };
  queues: Record<string, number>;
  reviews: {
    zhAliasRequired: ReviewDecisionSummary;
    enStrict35Missing: ReviewDecisionSummary;
  };
  importGate: {
    blockers: number;
    enAddCandidates: number;
    enRulesDbGaps: number;
    enSourceMismatches: number;
    deferredPdf: number;
    enOutOfScope: number;
    enResolvedCandidates: number;
    enResolvedSourceMismatches: number;
  };
};

type ZhMatchedRecord = {
  sourceKey?: string;
  sourceKind?: string;
  listOwner?: string;
  zhName?: string;
  enName?: string;
  resolvedEnName?: string | null;
  summaryText?: string;
  spellId?: number | null;
  rulebookAbbr?: string | null;
  aliasReview?: "none" | "low" | "required";
};

type ZhConflictRecord = {
  targetKey?: string;
  spellId?: number | null;
  enName?: string;
  summaries?: Array<{
    summaryText?: string;
    records?: ZhMatchedRecord[];
  }>;
  normalizedSummaries?: Array<{
    normalizedSummaryText?: string;
    summaries?: Array<{
      summaryText?: string;
      records?: ZhMatchedRecord[];
    }>;
  }>;
};

type ZhAliasAuditEntry = {
  enName?: string;
  records?: number;
  spellIds?: number[];
  rulebookAbbrs?: string[];
  aliasReview?: "low" | "required";
  aliasCategories?: string[];
  resolutions?: unknown[];
};

type EnSourceIndexReport = {
  summary?: {
    candidates?: number;
    matchedCandidates?: number;
    missingCandidates?: number;
    ambiguousCandidates?: number;
  };
  coverage?: {
    matched?: Array<{
      candidate?: { name?: string; exactName?: string };
      matches?: Array<{
        id?: number | null;
        name?: string;
        shortDescription?: string;
        sourceToken?: string;
        sourceName?: string;
        sourceAbbr?: string;
      }>;
      warnings?: string[];
    }>;
    missing?: Array<{ name?: string; exactName?: string }>;
    ambiguous?: unknown[];
  };
  rows?: EnSourceIndexRow[];
};

type EnSourceIndexRow = {
  id?: number | null;
  name: string;
  shortDescription?: string;
  sourceToken?: string;
  sourceName?: string;
  sourceAbbr?: string;
};

type EnSourceIndexManifest = {
  summary?: EnSourceIndexReport["summary"];
  sources?: Array<{
    file?: string;
  }>;
};

type EnSourceBookFile = {
  rows?: EnSourceIndexRow[];
};

type EnStrictMissingReport = {
  summary?: {
    strict35QaCandidates?: number;
    totalImarvinOnly?: number;
    deferred?: number;
  };
  strict35QaCandidates?: Array<Record<string, unknown>>;
};

type ReviewDecisionSummary = {
  present: boolean;
  reviewedRows: number;
  missingRows: number;
  extraRows: number;
  byDecision: Record<string, number>;
};

type ZhAliasDecision = {
  queue: "zh-alias-required";
  enName: string;
  decision: "confirmed" | "source_error" | "wrong_alias" | "defer_pdf";
  chosenResolvedEnName: string | null;
  recommendedAction: string;
  evidence: string[];
  notes: string;
  confidence: "high" | "medium" | "low";
};

type EnStrictDecision = {
  queue: "en-strict35-missing";
  key: string;
  name: string;
  decision:
    | "add_candidate"
    | "rules_db_gap"
    | "source_mismatch"
    | "defer_pdf"
    | "out_of_scope";
  recommendedAction: string;
  sources: string[];
  resolvedName?: string;
  descriptionSamples: string[];
  evidence: string[];
  notes: string;
  confidence: "high" | "medium" | "low";
};

type EnCandidate = {
  name: string;
  exactName?: string;
};

const DEFAULT_ZH_SUMMARY_DIR = "out/zh-parser/summary";
const DEFAULT_EN_SOURCE_INDEX = path.join(
  localDataDir(),
  "imarvin",
  "short-desc",
  "source-index",
);
const DEFAULT_EN_STRICT_MISSING =
  "out/en-summaries/imarvin-source-index-db-missing-strict35.json";
const DEFAULT_OUT_DIR = "out/short-desc-qa";
const DEFAULT_REVIEW_RESULTS_DIR = path.join(
  localDataDir(),
  "short-desc-review",
  "qa",
);
const DEFAULT_EN_CANDIDATES = path.join(
  localDataDir(),
  "imarvin",
  "short-desc",
  "candidates.json",
);
const MOJIBAKE_RE = /\uFFFD|锟斤拷/;
const HTML_RE = /<\/?[a-z][^>]*>/i;
const VERY_SHORT_TEXT_LENGTH = 2;
const LONG_TEXT_LENGTH = 180;
const SPOT_CHECK_LIMIT = 40;
const ZH_ALIAS_DECISIONS = new Set([
  "confirmed",
  "source_error",
  "wrong_alias",
  "defer_pdf",
]);
const EN_STRICT_DECISIONS = new Set([
  "add_candidate",
  "rules_db_gap",
  "source_mismatch",
  "defer_pdf",
  "out_of_scope",
]);

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg?.startsWith("--")) continue;
    const next = argv[index + 1];
    args.set(arg, next && !next.startsWith("--") ? next : "true");
    if (next && !next.startsWith("--")) index += 1;
  }
  return {
    zhSummaryDir: path.resolve(
      args.get("--zhSummaryDir") ?? DEFAULT_ZH_SUMMARY_DIR,
    ),
    enSourceIndex: path.resolve(
      args.get("--enSourceIndex") ?? DEFAULT_EN_SOURCE_INDEX,
    ),
    enStrictMissing: path.resolve(
      args.get("--enStrictMissing") ?? DEFAULT_EN_STRICT_MISSING,
    ),
    enCandidates: path.resolve(args.get("--enCandidates") ?? DEFAULT_EN_CANDIDATES),
    reviewResultsDir: path.resolve(
      args.get("--reviewResultsDir") ?? DEFAULT_REVIEW_RESULTS_DIR,
    ),
    outDir: path.resolve(args.get("--outDir") ?? DEFAULT_OUT_DIR),
  };
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

function readJsonIfExists<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  return readJson<T>(file);
}

function readEnSourceIndexIfExists(indexPath: string): EnSourceIndexReport | null {
  if (!fs.existsSync(indexPath)) return null;
  if (!fs.statSync(indexPath).isDirectory()) {
    return readJson<EnSourceIndexReport>(indexPath);
  }

  const manifestPath = path.join(indexPath, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const manifest = readJson<EnSourceIndexManifest>(manifestPath);
  const rows = (manifest.sources ?? []).flatMap((source) => {
    if (!source.file) return [];
    const bookPath = path.join(indexPath, source.file);
    if (!fs.existsSync(bookPath)) return [];
    return readJson<EnSourceBookFile>(bookPath).rows ?? [];
  });

  const report: EnSourceIndexReport = {
    rows,
  };
  if (manifest.summary) report.summary = manifest.summary;
  return report;
}

function readJsonlIfExists<T>(file: string): T[] | null {
  if (!fs.existsSync(file)) return null;
  return fs
    .readFileSync(file, "utf-8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function issue(
  issues: QaIssue[],
  severity: Severity,
  code: string,
  fields: Omit<QaIssue, "severity" | "code">,
) {
  issues.push({ severity, code, ...fields });
}

function normalizedRecordName(record: ZhMatchedRecord) {
  return normalizeName(record.resolvedEnName || record.enName || "");
}

function issueRecordFields(record: ZhMatchedRecord) {
  return {
    ...(record.sourceKey ? { sourceKey: record.sourceKey } : {}),
    ...(typeof record.spellId === "number" || record.spellId === null
      ? { spellId: record.spellId }
      : {}),
    ...(record.enName ? { enName: record.enName } : {}),
    ...(record.zhName ? { zhName: record.zhName } : {}),
  };
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function queuePath(outDir: string, name: string) {
  return path.join(outDir, "review-queues", `${name}.jsonl`);
}

function decisionSummary<T>(
  decisions: T[] | null,
  expectedKeys: string[],
  actualKey: (decision: T) => string | undefined,
  decisionValue: (decision: T) => string | undefined,
  issues: QaIssue[],
  opts: {
    queue: string;
    file: string;
    allowedDecisions: Set<string>;
  },
): ReviewDecisionSummary {
  const byDecision: Record<string, number> = {};
  if (!decisions) {
    return {
      present: false,
      reviewedRows: 0,
      missingRows: expectedKeys.length,
      extraRows: 0,
      byDecision,
    };
  }

  const expected = new Set(expectedKeys);
  const actual = new Set<string>();
  for (const decision of decisions) {
    const key = actualKey(decision);
    const value = decisionValue(decision);
    if (!key) {
      issue(issues, "error", "review-decision-missing-key", {
        file: opts.file,
        queue: opts.queue,
        detail: "review decision row is missing its stable key",
      });
      continue;
    }
    actual.add(key);
    if (!value || !opts.allowedDecisions.has(value)) {
      issue(issues, "error", "review-decision-invalid-value", {
        file: opts.file,
        queue: opts.queue,
        detail: `review decision for ${key} has invalid value ${value ?? "(missing)"}`,
      });
      continue;
    }
    bump(byDecision, value);
  }

  const missingRows = [...expected].filter((key) => !actual.has(key)).length;
  const extraRows = [...actual].filter((key) => !expected.has(key)).length;
  if (missingRows > 0) {
    issue(issues, "error", "review-decision-key-mismatch", {
      file: opts.file,
      queue: opts.queue,
      count: missingRows,
      detail: `review decision keys do not match queue keys: ${missingRows} missing, ${extraRows} extra`,
    });
  } else if (extraRows > 0) {
    issue(issues, "info", "review-decision-extra-keys", {
      file: opts.file,
      queue: opts.queue,
      count: extraRows,
      detail: `review decision file has ${extraRows} stale row(s) no longer present in the current queue`,
    });
  }

  return {
    present: true,
    reviewedRows: decisions.length,
    missingRows,
    extraRows,
    byDecision,
  };
}

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function writeJsonl(file: string, rows: unknown[]) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    rows.map((row) => JSON.stringify(row)).join("\n") +
      (rows.length > 0 ? "\n" : ""),
    "utf-8",
  );
}

function recordTextIssue(record: ZhMatchedRecord, issues: QaIssue[]) {
  const text = record.summaryText ?? "";
  if (!text.trim()) {
    issue(issues, "error", "zh-empty-summary", {
      file: "matched.json",
      detail: "Chinese matched summary has empty summaryText",
      ...issueRecordFields(record),
    });
    return 1;
  }
  let count = 0;
  if (MOJIBAKE_RE.test(text)) {
    count += 1;
    issue(issues, "error", "zh-summary-mojibake", {
      file: "matched.json",
      detail: "Chinese summary contains replacement/mojibake marker",
      ...issueRecordFields(record),
    });
  }
  if (HTML_RE.test(text)) {
    count += 1;
    issue(issues, "error", "zh-summary-raw-html", {
      file: "matched.json",
      detail: "Chinese summaryText appears to contain raw HTML",
      ...issueRecordFields(record),
    });
  }
  if (text.trim().length <= VERY_SHORT_TEXT_LENGTH) {
    count += 1;
    issue(issues, "warning", "zh-summary-very-short", {
      file: "matched.json",
      detail: `Chinese summaryText length is ${text.trim().length}`,
      ...issueRecordFields(record),
    });
  }
  if (text.length > LONG_TEXT_LENGTH) {
    count += 1;
    issue(issues, "info", "zh-summary-long", {
      file: "matched.json",
      detail: `Chinese summaryText length is ${text.length}`,
      ...issueRecordFields(record),
    });
  }
  return count;
}

function conflictQueueRows(conflicts: ZhConflictRecord[]) {
  return conflicts.map((conflict) => {
    const variants = conflict.summaries ?? [];
    const records = variants.flatMap((variant) => variant.records ?? []);
    return {
      queue: "zh-conflicts",
      targetKey: conflict.targetKey,
      spellId: conflict.spellId ?? null,
      enName: conflict.enName,
      variantCount: variants.length,
      normalizedVariantCount: conflict.normalizedSummaries?.length ?? null,
      summarySamples: variants.slice(0, 6).map((variant) => ({
        summaryText: variant.summaryText,
        records: variant.records?.length ?? 0,
        sourceKeys: uniqueStrings(
          variant.records?.map((record) => record.sourceKey) ?? [],
        ).slice(0, 12),
      })),
      sourceKinds: uniqueStrings(records.map((record) => record.sourceKind)),
      rulebookAbbrs: uniqueStrings(records.map((record) => record.rulebookAbbr)),
      recommendation: "review duplicate summary variants before import",
    };
  });
}

function aliasQueueRows(aliasAudit: ZhAliasAuditEntry[]) {
  return aliasAudit
    .filter((entry) => entry.aliasReview === "required")
    .map((entry) => ({
      queue: "zh-alias-required",
      enName: entry.enName,
      records: entry.records ?? 0,
      spellIds: entry.spellIds ?? [],
      rulebookAbbrs: entry.rulebookAbbrs ?? [],
      aliasCategories: entry.aliasCategories ?? [],
      resolutions: entry.resolutions ?? [],
      recommendation: "confirm alias target or mark source/alias as deferred",
    }));
}

function enStrictRows(strictReport: EnStrictMissingReport | null) {
  return (strictReport?.strict35QaCandidates ?? []).map((entry) => ({
    queue: "en-strict35-missing",
    ...entry,
    recommendation:
      "confirm whether this IMarvinTPA strict-3.5 row should become a local candidate, rules DB patch, or deferred source mismatch",
  }));
}

function strictRowKey(row: unknown) {
  const key = (row as { key?: unknown }).key;
  return typeof key === "string" ? key : undefined;
}

function enCandidateName(candidate: EnCandidate) {
  return candidate.exactName ?? candidate.name;
}

function isReviewedEnglishDecisionResolved(
  decision: EnStrictDecision,
  candidateKeys: Set<string> | null,
  sourceKeys: Set<string> | null,
) {
  if (!sourceKeys) return false;
  const reviewedNames = [decision.name, decision.resolvedName].filter(
    (name): name is string => Boolean(name),
  );
  return reviewedNames
    .flatMap((name) => nameMatchKeys(name))
    .some((key) => sourceKeys.has(key) && (!candidateKeys || candidateKeys.has(key)));
}

function enCandidateKeySet(candidates: EnCandidate[] | null) {
  if (!candidates) return null;
  return new Set(
    candidates.flatMap((candidate) => exactNameMatchKeys(enCandidateName(candidate))),
  );
}

function sourceIndexCoverageForCandidates(
  candidates: EnCandidate[],
  rows: EnSourceIndexRow[],
): NonNullable<EnSourceIndexReport["coverage"]> {
  const matched: NonNullable<EnSourceIndexReport["coverage"]>["matched"] = [];
  const missing: NonNullable<EnSourceIndexReport["coverage"]>["missing"] = [];
  const ambiguous: NonNullable<EnSourceIndexReport["coverage"]>["ambiguous"] = [];

  for (const candidate of candidates) {
    const exactName = enCandidateName(candidate);
    const matches = chooseExact(rows, exactName);
    if (matches.length === 0) {
      missing.push(candidate);
      continue;
    }

    const uniqueIds = new Set(
      matches.map((match) => match.id).filter((id): id is number => id !== null),
    );
    if (uniqueIds.size > 1) {
      ambiguous.push({ candidate, matches, warnings: [] });
    } else {
      matched.push({ candidate, matches, warnings: [] });
    }
  }

  return { matched, missing, ambiguous };
}

function withComputedCoverage(
  report: EnSourceIndexReport | null,
  candidates: EnCandidate[] | null,
) {
  if (!report || report.coverage || !candidates) return report;
  const coverage = sourceIndexCoverageForCandidates(candidates, report.rows ?? []);
  return {
    ...report,
    coverage,
    summary: {
      ...report.summary,
      candidates: candidates.length,
      matchedCandidates: coverage.matched?.length ?? 0,
      missingCandidates: coverage.missing?.length ?? 0,
      ambiguousCandidates: coverage.ambiguous?.length ?? 0,
    },
  };
}

function enSourceKeySet(report: EnSourceIndexReport | null) {
  if (!report?.rows) return null;
  return new Set(report.rows.flatMap((row) => nameMatchKeys(row.name)));
}

function englishMatchedNames(report: EnSourceIndexReport | null) {
  const names = new Map<string, { name: string; sources: string[] }>();
  for (const item of report?.coverage?.matched ?? []) {
    const candidateName = item.candidate?.exactName ?? item.candidate?.name;
    if (candidateName) {
      names.set(normalizeName(candidateName), {
        name: candidateName,
        sources: [],
      });
    }
    for (const match of item.matches ?? []) {
      if (!match.name) continue;
      const key = normalizeName(match.name);
      const existing = names.get(key);
      names.set(key, {
        name: match.name,
        sources: uniqueStrings([
          ...(existing?.sources ?? []),
          match.sourceAbbr,
          match.sourceToken,
        ]),
      });
    }
  }
  if (names.size === 0) {
    for (const row of report?.rows ?? []) {
      const key = normalizeName(row.name);
      if (!key) continue;
      const existing = names.get(key);
      names.set(key, {
        name: row.name,
        sources: uniqueStrings([
          ...(existing?.sources ?? []),
          row.sourceAbbr,
          row.sourceToken,
        ]),
      });
    }
  }
  return names;
}

function chineseMatchedNames(records: ZhMatchedRecord[]) {
  const names = new Map<string, { name: string; records: number; spellIds: number[] }>();
  for (const record of records) {
    const normalized = normalizedRecordName(record);
    if (!normalized) continue;
    const existing = names.get(normalized);
    names.set(normalized, {
      name: record.resolvedEnName || record.enName || normalized,
      records: (existing?.records ?? 0) + 1,
      spellIds: [
        ...(existing?.spellIds ?? []),
        ...(typeof record.spellId === "number" ? [record.spellId] : []),
      ],
    });
  }
  return names;
}

function crossCoverageRows(
  zhNames: Map<string, { name: string; records: number; spellIds: number[] }>,
  enNames: Map<string, { name: string; sources: string[] }>,
) {
  const rows: unknown[] = [];
  for (const [key, zh] of zhNames) {
    if (enNames.has(key)) continue;
    rows.push({
      queue: "cross-coverage",
      direction: "zh-without-en",
      key,
      name: zh.name,
      records: zh.records,
      spellIds: [...new Set(zh.spellIds)].sort((a, b) => a - b),
      recommendation:
        "review whether English source coverage is intentionally missing, source-named differently, or out of scope",
    });
  }
  for (const [key, en] of enNames) {
    if (zhNames.has(key)) continue;
    rows.push({
      queue: "cross-coverage",
      direction: "en-without-zh",
      key,
      name: en.name,
      sources: en.sources,
      recommendation:
        "review whether Chinese CHM overview coverage is intentionally missing, named differently, or out of scope",
    });
  }
  return rows.sort((a, b) => {
    const left = a as { direction?: string; key?: string };
    const right = b as { direction?: string; key?: string };
    return `${left.direction}:${left.key}`.localeCompare(
      `${right.direction}:${right.key}`,
    );
  });
}

function spotCheckRows(
  aliasRows: unknown[],
  conflictRows: unknown[],
  strictRows: unknown[],
  crossRows: unknown[],
) {
  return [
    ...aliasRows.slice(0, 10),
    ...conflictRows.slice(0, 10),
    ...strictRows.slice(0, 10),
    ...crossRows.slice(0, 10),
  ]
    .slice(0, SPOT_CHECK_LIMIT)
    .map((row, index) => ({
      queue: "spot-check",
      priority: index + 1,
      sample: row,
      recommendation: "manual spot-check for v3.4 workflow acceptance",
    }));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const issues: QaIssue[] = [];

  const zhMatchedPath = path.join(options.zhSummaryDir, "matched.json");
  const zhUnmatchedPath = path.join(options.zhSummaryDir, "unmatched.json");
  const zhConflictsPath = path.join(options.zhSummaryDir, "conflicts.json");
  const zhAliasPath = path.join(options.zhSummaryDir, "alias-audit.json");
  const zhAliasDecisionsPath = path.join(
    options.reviewResultsDir,
    "zh-alias-required.decisions.jsonl",
  );
  const enStrictDecisionsPath = path.join(
    options.reviewResultsDir,
    "en-strict35-missing.decisions.jsonl",
  );

  const zhMatched = readJson<ZhMatchedRecord[]>(zhMatchedPath);
  const zhUnmatched = readJson<ZhMatchedRecord[]>(zhUnmatchedPath);
  const zhConflicts = readJson<ZhConflictRecord[]>(zhConflictsPath);
  const zhAliasAudit = readJson<ZhAliasAuditEntry[]>(zhAliasPath);
  const enSourceIndexRaw = readEnSourceIndexIfExists(options.enSourceIndex);
  const enStrictMissing = readJsonIfExists<EnStrictMissingReport>(
    options.enStrictMissing,
  );
  const enCandidates = readJsonIfExists<EnCandidate[]>(options.enCandidates);
  const enSourceIndex = withComputedCoverage(enSourceIndexRaw, enCandidates);
  const enCandidateKeys = enCandidateKeySet(enCandidates);
  const enSourceKeys = enSourceKeySet(enSourceIndex);
  const zhAliasDecisions =
    readJsonlIfExists<ZhAliasDecision>(zhAliasDecisionsPath);
  const enStrictDecisions =
    readJsonlIfExists<EnStrictDecision>(enStrictDecisionsPath);

  if (zhUnmatched.length > 0) {
    issue(issues, "error", "zh-unmatched-records", {
      file: zhUnmatchedPath,
      count: zhUnmatched.length,
      detail: `Chinese summary extraction has ${zhUnmatched.length} unmatched records`,
    });
  }

  let zhTextIssues = 0;
  for (const record of zhMatched) {
    zhTextIssues += recordTextIssue(record, issues);
  }

  const aliasRows = aliasQueueRows(zhAliasAudit);
  const zhAliasDecisionSummary = decisionSummary(
    zhAliasDecisions,
    aliasRows.map((row) => row.enName).filter((name): name is string => Boolean(name)),
    (decision) => decision.enName,
    (decision) => decision.decision,
    issues,
    {
      queue: "zh-alias-required",
      file: zhAliasDecisionsPath,
      allowedDecisions: ZH_ALIAS_DECISIONS,
    },
  );
  const currentZhAliasKeys = new Set(
    aliasRows.map((row) => row.enName).filter((name): name is string => Boolean(name)),
  );
  const zhAliasImportBlockers = (zhAliasDecisions ?? []).filter(
    (decision) =>
      decision.decision !== "confirmed" &&
      currentZhAliasKeys.has(decision.enName),
  );
  if (aliasRows.length > 0 && !zhAliasDecisionSummary.present) {
    issue(issues, "warning", "zh-alias-review-required", {
      queue: "zh-alias-required",
      count: aliasRows.length,
      detail: `${aliasRows.length} Chinese alias audit entries require review`,
    });
  }
  if (zhAliasImportBlockers.length > 0) {
    issue(issues, "warning", "zh-alias-import-blockers", {
      queue: "import-blockers",
      count: zhAliasImportBlockers.length,
      detail: `${zhAliasImportBlockers.length} reviewed Chinese alias entries are blocked from import`,
    });
  }

  const conflictRows = conflictQueueRows(zhConflicts);
  if (conflictRows.length > 0) {
    issue(issues, "warning", "zh-summary-conflicts", {
      queue: "zh-conflicts",
      count: conflictRows.length,
      detail: `${conflictRows.length} Chinese duplicate targets have conflicting summaries`,
    });
  }

  if (!enSourceIndex) {
    issue(issues, "warning", "en-source-index-missing", {
      file: options.enSourceIndex,
      detail:
        "English IMarvinTPA source-index data is missing; run en:summaries:sources before cross-language QA",
    });
  } else {
    const ambiguous = enSourceIndex.summary?.ambiguousCandidates ?? 0;
    if (ambiguous > 0) {
      issue(issues, "warning", "en-ambiguous-candidates", {
        file: options.enSourceIndex,
        count: ambiguous,
        detail: `${ambiguous} English candidates have ambiguous IMarvinTPA source-index matches`,
      });
    }
    const missing = enSourceIndex.summary?.missingCandidates ?? 0;
    if (missing > 0) {
      issue(issues, "info", "en-missing-candidates", {
        file: options.enSourceIndex,
        count: missing,
        detail: `${missing} local English candidates are missing from the IMarvinTPA source-index report`,
      });
    }
  }

  if (!enStrictMissing) {
    issue(issues, "warning", "en-strict35-report-missing", {
      file: options.enStrictMissing,
      detail:
        "English strict-3.5 missing report is missing; strict source review queue will be empty",
    });
  }

  const strictRows = enStrictRows(enStrictMissing);
  const enStrictDecisionSummary = decisionSummary(
    enStrictDecisions,
    strictRows
      .map(strictRowKey)
      .filter((key): key is string => Boolean(key)),
    (decision) => decision.key,
    (decision) => decision.decision,
    issues,
    {
      queue: "en-strict35-missing",
      file: enStrictDecisionsPath,
      allowedDecisions: EN_STRICT_DECISIONS,
    },
  );
  const enAddCandidateRows = (enStrictDecisions ?? []).filter(
    (decision) => decision.decision === "add_candidate",
  );
  const enResolvedCandidateRows = enAddCandidateRows.filter((decision) =>
    isReviewedEnglishDecisionResolved(decision, enCandidateKeys, enSourceKeys),
  );
  const enUnresolvedAddCandidateRows = enAddCandidateRows.filter(
    (decision) => !enResolvedCandidateRows.includes(decision),
  );
  const enRulesDbGapRows = (enStrictDecisions ?? []).filter(
    (decision) => decision.decision === "rules_db_gap",
  );
  const enSourceMismatchRows = (enStrictDecisions ?? []).filter(
    (decision) => decision.decision === "source_mismatch",
  );
  const enResolvedSourceMismatchRows = enSourceMismatchRows.filter((decision) =>
    isReviewedEnglishDecisionResolved(decision, enCandidateKeys, enSourceKeys),
  );
  const enUnresolvedSourceMismatchRows = enSourceMismatchRows.filter(
    (decision) => !enResolvedSourceMismatchRows.includes(decision),
  );
  const enDeferredPdfRows = (enStrictDecisions ?? []).filter(
    (decision) => decision.decision === "defer_pdf",
  );
  const enOutOfScopeRows = (enStrictDecisions ?? []).filter(
    (decision) => decision.decision === "out_of_scope",
  );
  if (strictRows.length > 0 && !enStrictDecisionSummary.present) {
    issue(issues, "warning", "en-strict35-review-candidates", {
      queue: "en-strict35-missing",
      count: strictRows.length,
      detail: `${strictRows.length} IMarvinTPA strict-3.5 rows need source/DB review`,
    });
  }
  if (!enCandidates) {
    issue(issues, "warning", "en-candidates-missing", {
      file: options.enCandidates,
      detail:
        "English local candidate file is missing; reviewed add-candidate rows cannot be checked against current matching rules",
    });
  }
  if (enResolvedCandidateRows.length > 0) {
    issue(issues, "info", "en-strict35-resolved-candidates", {
      queue: "en-resolved-candidates",
      count: enResolvedCandidateRows.length,
      detail: `${enResolvedCandidateRows.length} reviewed English add-candidate rows are covered by current matching rules`,
    });
  }
  if (enUnresolvedAddCandidateRows.length > 0) {
    issue(issues, "info", "en-strict35-add-candidates", {
      queue: "en-add-candidates",
      count: enUnresolvedAddCandidateRows.length,
      detail: `${enUnresolvedAddCandidateRows.length} reviewed English rows still need candidate or alias normalization`,
    });
  }
  if (enRulesDbGapRows.length > 0) {
    issue(issues, "warning", "en-strict35-rules-db-gaps", {
      queue: "en-rules-db-gaps",
      count: enRulesDbGapRows.length,
      detail: `${enRulesDbGapRows.length} reviewed English rows appear to be rules DB gaps before short-description import`,
    });
  }
  if (enResolvedSourceMismatchRows.length > 0) {
    issue(issues, "info", "en-strict35-resolved-source-mismatches", {
      queue: "en-resolved-source-mismatches",
      count: enResolvedSourceMismatchRows.length,
      detail: `${enResolvedSourceMismatchRows.length} reviewed English source-mismatch rows are covered by current matching rules`,
    });
  }

  const zhNames = chineseMatchedNames(zhMatched);
  const enNames = englishMatchedNames(enSourceIndex);
  const crossRows = crossCoverageRows(zhNames, enNames);
  if (crossRows.length > 0) {
    issue(issues, "info", "cross-coverage-differences", {
      queue: "cross-coverage",
      count: crossRows.length,
      detail: `${crossRows.length} normalized names differ between Chinese and English summary coverage`,
    });
  }

  const spotRows = spotCheckRows(aliasRows, conflictRows, strictRows, crossRows);
  const importBlockerRows = [
    ...zhAliasImportBlockers.map((decision) => ({
      queue: "import-blockers",
      sourceQueue: "zh-alias-required",
      key: decision.enName,
      decision: decision.decision,
      recommendedAction: decision.recommendedAction,
      notes: decision.notes,
      confidence: decision.confidence,
    })),
    ...enUnresolvedSourceMismatchRows.map((decision) => ({
      queue: "import-blockers",
      sourceQueue: "en-strict35-missing",
      key: decision.key,
      name: decision.name,
      decision: decision.decision,
      recommendedAction: decision.recommendedAction,
      notes: decision.notes,
      confidence: decision.confidence,
    })),
    ...enDeferredPdfRows.map((decision) => ({
      queue: "import-blockers",
      sourceQueue: "en-strict35-missing",
      key: decision.key,
      name: decision.name,
      decision: decision.decision,
      recommendedAction: decision.recommendedAction,
      notes: decision.notes,
      confidence: decision.confidence,
    })),
  ];

  const queues: Record<string, unknown[]> = {
    "zh-alias-required": aliasRows,
    "zh-conflicts": conflictRows,
    "en-strict35-missing": strictRows,
    "cross-coverage": crossRows,
    "spot-check": spotRows,
    "import-blockers": importBlockerRows,
    "en-add-candidates": enUnresolvedAddCandidateRows,
    "en-resolved-candidates": enResolvedCandidateRows,
    "en-resolved-source-mismatches": enResolvedSourceMismatchRows,
    "en-rules-db-gaps": enRulesDbGapRows,
    "en-source-mismatches": enUnresolvedSourceMismatchRows,
    "en-deferred-pdf": enDeferredPdfRows,
    "en-out-of-scope": enOutOfScopeRows,
  };
  for (const [name, rows] of Object.entries(queues)) {
    writeJsonl(queuePath(options.outDir, name), rows);
  }

  const bySeverity: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  const byCode: Record<string, number> = {};
  for (const item of issues) {
    bySeverity[item.severity]++;
    bump(byCode, item.code);
  }

  const zhWithoutEn = crossRows.filter(
    (row) => (row as { direction?: string }).direction === "zh-without-en",
  ).length;
  const enWithoutZh = crossRows.filter(
    (row) => (row as { direction?: string }).direction === "en-without-zh",
  ).length;

  const summary: QaSummary = {
    generatedAt: new Date().toISOString(),
    inputs: {
      zhSummaryDir: options.zhSummaryDir,
      enSourceIndex: options.enSourceIndex,
      enStrictMissing: options.enStrictMissing,
      enCandidates: options.enCandidates,
      reviewResultsDir: options.reviewResultsDir,
      outDir: options.outDir,
    },
    issueCount: issues.length,
    bySeverity,
    byCode,
    zh: {
      matched: zhMatched.length,
      unmatched: zhUnmatched.length,
      conflicts: zhConflicts.length,
      aliasAuditEntries: zhAliasAudit.length,
      aliasReviewRequired: aliasRows.length,
      textIssues: zhTextIssues,
    },
    en: {
      sourceIndexPresent: Boolean(enSourceIndex),
      candidates: enSourceIndex?.summary?.candidates ?? 0,
      matchedCandidates: enSourceIndex?.summary?.matchedCandidates ?? 0,
      missingCandidates: enSourceIndex?.summary?.missingCandidates ?? 0,
      ambiguousCandidates: enSourceIndex?.summary?.ambiguousCandidates ?? 0,
      strict35QaCandidates: strictRows.length,
    },
    crossCoverage: {
      zhUniqueNames: zhNames.size,
      enUniqueNames: enNames.size,
      zhWithoutEn,
      enWithoutZh,
    },
    queues: Object.fromEntries(
      Object.entries(queues).map(([name, rows]) => [name, rows.length]),
    ),
    reviews: {
      zhAliasRequired: zhAliasDecisionSummary,
      enStrict35Missing: enStrictDecisionSummary,
    },
    importGate: {
      blockers: importBlockerRows.length,
      enAddCandidates: enUnresolvedAddCandidateRows.length,
      enRulesDbGaps: enRulesDbGapRows.length,
      enSourceMismatches: enUnresolvedSourceMismatchRows.length,
      deferredPdf: enDeferredPdfRows.length,
      enOutOfScope: enOutOfScopeRows.length,
      enResolvedCandidates: enResolvedCandidateRows.length,
      enResolvedSourceMismatches: enResolvedSourceMismatchRows.length,
    },
  };

  writeJson(path.join(options.outDir, "summary.json"), summary);
  writeJson(path.join(options.outDir, "issues.json"), issues);

  console.log("short-desc QA done");
  console.log(summary);

  if (bySeverity.error > 0) {
    process.exitCode = 1;
  }
}

main();
