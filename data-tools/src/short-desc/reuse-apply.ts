import fs from "node:fs";
import path from "node:path";

import { localDataDir, repoRoot } from "../env";

type Lang = "en" | "zh";

type NormalizedSummaryRow = {
  schemaVersion: 1;
  stableKey: string;
  spellId: number;
  rulebookId: number;
  rulebookAbbr: string;
  lang: Lang;
  variant: "chm" | "imarvin";
  summaryText: string;
  sourceKey: string;
  sourceName: string;
  sourceKind: string;
  reviewStatus: "accepted";
  provenance: Record<string, unknown>;
};

type ReuseCandidate = {
  schemaVersion?: number;
  stableKey?: string;
  lang?: Lang;
  variant?: "chm" | "imarvin";
  matchStatus?: string;
  spellName?: string;
  target?: {
    spellId?: number;
    rulebookId?: number;
    rulebookAbbr?: string;
    editionSlug?: string;
    missingSummaryKey?: string;
  };
  source?: {
    spellId?: number;
    rulebookId?: number;
    rulebookAbbr?: string;
    editionSlug?: string;
    summaryText?: string;
    sourceKey?: string;
    sourceName?: string;
    sourceKind?: string;
  };
};

type ReuseDecision = {
  schemaVersion?: number;
  stableKey?: string;
  decision?: "reuse" | "reject" | "needs_source_check";
  summaryText?: string;
  reason?: string;
  confidence?: "high" | "medium" | "low";
  sourceStableKey?: string;
  targetStableKey?: string;
};

const DEFAULT_INPUT = path.join(
  localDataDir(),
  "short-desc-normalized",
  "summaries.generated.jsonl",
);
const DEFAULT_CANDIDATES = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "short-desc-qa",
  "review-queues",
  "summary-reuse-candidates.jsonl",
);
const DEFAULT_AUTO_DECISIONS = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "short-desc-qa",
  "generated",
  "summary-reuse.auto-decisions.jsonl",
);
const DEFAULT_REVIEW_DIR = path.join(
  localDataDir(),
  "short-desc-review",
  "summary-reuse",
);
const DEFAULT_OUT_DIR = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "short-desc-qa",
);

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools summaries:reuse-apply
  npm run -w data-tools summaries:reuse-apply -- --write

Options:
  --input <path>          Normalized summary JSONL.
  --candidates <path>     Reuse candidate JSONL.
  --autoDecisions <path>  Auto reuse decisions JSONL.
  --reviewDir <path>      Directory containing subagent *.decisions.jsonl files.
  --outDir <path>         QA output directory.
  --write                 Rewrite the input JSONL with accepted reuse rows.
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") usage();
    if (!arg?.startsWith("--")) continue;
    if (arg === "--write") {
      args.set(arg, "true");
      continue;
    }
    const next = argv[index + 1];
    args.set(arg, next && !next.startsWith("--") ? next : "true");
    if (next && !next.startsWith("--")) index += 1;
  }

  return {
    input: resolvePath(args.get("--input") ?? DEFAULT_INPUT),
    candidates: resolvePath(args.get("--candidates") ?? DEFAULT_CANDIDATES),
    autoDecisions: resolvePath(
      args.get("--autoDecisions") ?? DEFAULT_AUTO_DECISIONS,
    ),
    reviewDir: resolvePath(args.get("--reviewDir") ?? DEFAULT_REVIEW_DIR),
    outDir: resolvePath(args.get("--outDir") ?? DEFAULT_OUT_DIR),
    write: args.get("--write") === "true",
  };
}

function resolvePath(rawPath: string) {
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

function readJsonl<T>(filePath: string) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath: string, rows: unknown[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    rows.map((row) => JSON.stringify(row)).join("\n") +
      (rows.length > 0 ? "\n" : ""),
    "utf8",
  );
}

function readReviewDecisions(reviewDir: string) {
  if (!fs.existsSync(reviewDir)) return [];
  return fs
    .readdirSync(reviewDir)
    .filter((entry) => /\.decisions\.jsonl$/i.test(entry))
    .flatMap((entry) =>
      readJsonl<ReuseDecision>(path.join(reviewDir, entry)).map((decision) => ({
        ...decision,
        decisionFile: entry,
      })),
    );
}

function targetStableKey(candidate: ReuseCandidate) {
  if (
    typeof candidate.target?.spellId !== "number" ||
    (candidate.lang !== "en" && candidate.lang !== "zh") ||
    (candidate.variant !== "chm" && candidate.variant !== "imarvin")
  ) {
    return null;
  }
  return `${candidate.target.spellId}:${candidate.lang}:${candidate.variant}`;
}

function rowFromCandidate(
  candidate: ReuseCandidate,
  decision: ReuseDecision,
): NormalizedSummaryRow | null {
  if (
    !candidate.stableKey ||
    (candidate.lang !== "en" && candidate.lang !== "zh") ||
    (candidate.variant !== "chm" && candidate.variant !== "imarvin") ||
    typeof candidate.target?.spellId !== "number" ||
    typeof candidate.target.rulebookId !== "number" ||
    !candidate.target.rulebookAbbr ||
    typeof candidate.source?.spellId !== "number" ||
    typeof candidate.source.rulebookId !== "number" ||
    !candidate.source.rulebookAbbr ||
    !candidate.source.summaryText ||
    !candidate.source.sourceKey
  ) {
    return null;
  }

  const summaryText = decision.summaryText?.trim() || candidate.source.summaryText;
  const hasSummaryOverride = summaryText !== candidate.source.summaryText;

  return {
    schemaVersion: 1,
    stableKey: `${candidate.target.spellId}:${candidate.lang}:${candidate.variant}`,
    spellId: candidate.target.spellId,
    rulebookId: candidate.target.rulebookId,
    rulebookAbbr: candidate.target.rulebookAbbr,
    lang: candidate.lang,
    variant: candidate.variant,
    summaryText,
    sourceKey: `reuse:${candidate.target.spellId}:${candidate.source.sourceKey}`,
    sourceName: `${candidate.source.rulebookAbbr} summary reused for ${candidate.target.rulebookAbbr}`,
    sourceKind: "summary-reuse",
    reviewStatus: "accepted",
    provenance: {
      spellName: candidate.spellName,
      reuseCandidateKey: candidate.stableKey,
      decision: decision.decision,
      reason: decision.reason,
      confidence: decision.confidence,
      ...(hasSummaryOverride
        ? {
            summaryOverride: true,
            sourceSummaryText: candidate.source.summaryText,
          }
        : {}),
      matchStatus: candidate.matchStatus,
      source: {
        spellId: candidate.source.spellId,
        rulebookId: candidate.source.rulebookId,
        rulebookAbbr: candidate.source.rulebookAbbr,
        editionSlug: candidate.source.editionSlug,
        sourceKey: candidate.source.sourceKey,
        sourceName: candidate.source.sourceName,
        sourceKind: candidate.source.sourceKind,
      },
      target: {
        spellId: candidate.target.spellId,
        rulebookId: candidate.target.rulebookId,
        rulebookAbbr: candidate.target.rulebookAbbr,
        editionSlug: candidate.target.editionSlug,
      },
    },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const existingRows = readJsonl<NormalizedSummaryRow>(options.input);
  const candidates = readJsonl<ReuseCandidate>(options.candidates);
  const autoDecisions = readJsonl<ReuseDecision>(options.autoDecisions);
  const reviewDecisions = readReviewDecisions(options.reviewDir);
  const decisions = [...autoDecisions, ...reviewDecisions];
  const candidateByKey = new Map(
    candidates
      .filter((candidate) => candidate.stableKey)
      .map((candidate) => [candidate.stableKey!, candidate]),
  );
  const existingByStableKey = new Map(
    existingRows.map((row) => [row.stableKey, row]),
  );

  const acceptedRows: NormalizedSummaryRow[] = [];
  const skipped: Record<string, number> = {};
  const seenTargets = new Set<string>();

  const bump = (key: string) => {
    skipped[key] = (skipped[key] ?? 0) + 1;
  };

  for (const decision of decisions) {
    if (!decision.stableKey) {
      bump("decision_missing_stable_key");
      continue;
    }
    if (decision.decision !== "reuse") {
      bump(`decision_${decision.decision ?? "missing"}`);
      continue;
    }

    const candidate = candidateByKey.get(decision.stableKey);
    if (!candidate) {
      bump("candidate_not_found");
      continue;
    }
    const targetKey = targetStableKey(candidate);
    if (!targetKey) {
      bump("candidate_invalid_target");
      continue;
    }
    if (existingByStableKey.has(targetKey)) {
      bump("target_already_has_summary");
      continue;
    }
    if (seenTargets.has(targetKey)) {
      bump("target_duplicate_reuse_decision");
      continue;
    }

    const row = rowFromCandidate(candidate, decision);
    if (!row) {
      bump("candidate_invalid_row");
      continue;
    }
    seenTargets.add(targetKey);
    acceptedRows.push(row);
  }

  const mergedRows = [...existingRows, ...acceptedRows].sort(
    (a, b) =>
      a.lang.localeCompare(b.lang) ||
      a.variant.localeCompare(b.variant) ||
      a.rulebookAbbr.localeCompare(b.rulebookAbbr) ||
      a.spellId - b.spellId ||
      a.sourceKey.localeCompare(b.sourceKey),
  );

  if (options.write && acceptedRows.length > 0) {
    writeJsonl(options.input, mergedRows);
  }

  const acceptedPath = path.join(
    options.outDir,
    "generated",
    "summary-reuse.accepted.generated.jsonl",
  );
  writeJsonl(acceptedPath, acceptedRows);

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: options.write ? "write" : "dry-run",
    input: options.input,
    candidates: candidates.length,
    decisions: decisions.length,
    acceptedRows: acceptedRows.length,
    existingRows: existingRows.length,
    outputRows: mergedRows.length,
    skipped,
    acceptedPath,
  };
  writeJson(path.join(options.outDir, "summary-reuse-apply.summary.json"), summary);

  console.log("short-desc reuse apply done");
  console.log(summary);
}

main();
