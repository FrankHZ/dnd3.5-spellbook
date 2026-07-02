import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { exactNameMatchKeys, nameMatchKeys } from "./en-summary-matching";
import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";

type Mode = "candidates" | "apply";

type NormalizedSummaryRow = {
  schemaVersion: 1;
  stableKey: string;
  spellId: number;
  rulebookId: number;
  rulebookAbbr: string;
  lang: "en" | "zh";
  variant: "imarvin" | "chm";
  summaryText: string;
  sourceKey: string;
  sourceName: string;
  sourceKind: string;
  reviewStatus: "accepted";
  provenance: Record<string, unknown>;
};

type SpellRow = {
  id: number;
  name: string;
  description: string | null;
  rulebookId: number;
  rulebookAbbr: string;
  rulebookName: string;
  editionSlug: string;
};

type SourceManifest = {
  sources?: SourceEntry[];
};

type SourceEntry = {
  token?: string;
  name?: string;
  abbr?: string;
  status?: string;
  file?: string;
  category?: string;
  rulebookAbbr?: string;
  rulebookName?: string;
  editionSlug?: string;
};

type SourceBook = {
  rows?: SourceRow[];
};

type SourceRow = {
  id?: number | null;
  name?: string;
  shortDescription?: string;
  sourceToken?: string;
  sourceName?: string;
  sourceAbbr?: string;
  sourceStatus?: string;
};

type SourceGapCandidate = {
  schemaVersion: 1;
  queue: "source-gap-reuse-candidates";
  stableKey: string;
  lang: "en";
  variant: "imarvin";
  matchStatus: "source_gap_exact_name";
  source: {
    sourceToken: string | null;
    sourceName: string;
    sourceRulebookAbbr: string;
    sourceRulebookName: string | null;
    sourceEditionSlug: string | null;
    sourceFile: string;
    imarvinId: number | null;
    spellName: string;
    summaryText: string;
  };
  target: {
    spellId: number;
    spellName: string;
    rulebookId: number;
    rulebookAbbr: string;
    rulebookName: string;
    editionSlug: string;
    missingSummaryKey: string;
  };
  recommendation: string;
};

type SourceGapDecision = {
  schemaVersion?: number;
  queue?: "source-gap-reuse-candidates";
  stableKey?: string;
  decision?: "reuse" | "reject" | "needs_source_check";
  reason?: string;
  confidence?: "high" | "medium" | "low";
};

const DEFAULT_INPUT = path.join(
  localDataDir(),
  "short-desc-normalized",
  "summaries.generated.jsonl",
);
const DEFAULT_SOURCE_INDEX = path.join(
  localDataDir(),
  "imarvin",
  "short-desc",
  "source-index",
);
const DEFAULT_REVIEW_DIR = path.join(
  localDataDir(),
  "short-desc-review",
  "source-gap-reuse",
);
const DEFAULT_OUT_DIR = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "short-desc-qa",
);
const DEFAULT_SCOPE = ["core-35", "supplementals-35"];

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools summaries:source-gap-candidates
  npm run -w data-tools summaries:source-gap-apply
  npm run -w data-tools summaries:source-gap-apply -- --write

Options:
  --input <path>          Normalized summary JSONL.
  --sourceIndexDir <path> IMarvin source-index directory.
  --reviewDir <path>      Directory containing *.decisions.jsonl files.
  --outDir <path>         QA output directory.
  --scope <slugs|all>     Comma-separated edition slugs. Default: core/supplementals.
  --write                 Rewrite the input JSONL with accepted source-gap rows.
`);
  process.exit(1);
}

function parseArgs(mode: Mode, argv: string[]) {
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

  const scopeRaw = args.get("--scope") ?? DEFAULT_SCOPE.join(",");
  return {
    mode,
    input: resolvePath(args.get("--input") ?? DEFAULT_INPUT),
    sourceIndexDir: resolvePath(args.get("--sourceIndexDir") ?? DEFAULT_SOURCE_INDEX),
    reviewDir: resolvePath(args.get("--reviewDir") ?? DEFAULT_REVIEW_DIR),
    outDir: resolvePath(args.get("--outDir") ?? DEFAULT_OUT_DIR),
    scope:
      scopeRaw === "all"
        ? null
        : scopeRaw
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
    write: args.get("--write") === "true",
  };
}

function resolvePath(rawPath: string) {
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

function rulesDbPath() {
  loadServerEnv();
  const raw = process.env.RULES_DATABASE_URL;
  if (!raw) throw new Error("RULES_DATABASE_URL is not set");
  if (!raw.startsWith("file:")) {
    throw new Error(`Only file: SQLite URLs are supported, got ${raw}`);
  }
  return resolveServerRelativePath(raw.slice("file:".length));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readJsonIfExists<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  return readJson<T>(filePath);
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

function sourceLabel(source: SourceEntry) {
  return source.name ?? source.abbr ?? source.token ?? "(unknown source)";
}

function sourceToken(source: SourceEntry) {
  return source.token ?? source.abbr ?? source.name ?? null;
}

function stablePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function loadSpells(scope: string[] | null) {
  const db = new Database(rulesDbPath(), { readonly: true, fileMustExist: true });
  try {
    const where = scope ? `WHERE ed.slug IN (${scope.map(() => "?").join(", ")})` : "";
    return db
      .prepare(
        `
          SELECT
            s.id AS id,
            s.name AS name,
            s.description AS description,
            rb.id AS rulebookId,
            rb.abbr AS rulebookAbbr,
            rb.name AS rulebookName,
            ed.slug AS editionSlug
          FROM dnd_spell s
          JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
          JOIN dnd_dndedition ed ON ed.id = rb.dnd_edition_id
          ${where}
          ORDER BY ed.slug, rb.abbr, s.name
        `,
      )
      .all(...(scope ?? [])) as SpellRow[];
  } finally {
    db.close();
  }
}

function summaryLangSets(rows: NormalizedSummaryRow[]) {
  return {
    en: new Set(
      rows
        .filter((row) => row.lang === "en" && row.summaryText.trim())
        .map((row) => row.spellId),
    ),
  };
}

function keyMap(spells: SpellRow[]) {
  const byKey = new Map<string, SpellRow[]>();
  for (const spell of spells) {
    for (const key of exactNameMatchKeys(spell.name)) {
      byKey.set(key, [...(byKey.get(key) ?? []), spell]);
    }
  }
  return byKey;
}

function matchingSpells(byKey: Map<string, SpellRow[]>, name: string) {
  const matches = exactNameMatchKeys(name).flatMap((key) => byKey.get(key) ?? []);
  return [...new Map(matches.map((spell) => [spell.id, spell])).values()];
}

function buildCandidates(options: ReturnType<typeof parseArgs>) {
  const existingRows = readJsonl<NormalizedSummaryRow>(options.input);
  const langSets = summaryLangSets(existingRows);
  const spells = loadSpells(options.scope);
  const scopedBookAbbrs = new Set(spells.map((spell) => spell.rulebookAbbr));
  const spellsByKey = keyMap(spells);
  const missingEnSpells = spells.filter((spell) => !langSets.en.has(spell.id));
  const missingEnByKey = keyMap(missingEnSpells);
  const manifest = readJsonIfExists<SourceManifest>(
    path.join(options.sourceIndexDir, "manifest.json"),
    {},
  );
  const candidates: SourceGapCandidate[] = [];

  for (const source of manifest.sources ?? []) {
    if (!source.file || !source.rulebookAbbr) continue;
    if (!scopedBookAbbrs.has(source.rulebookAbbr)) continue;
    const filePath = path.join(options.sourceIndexDir, source.file);
    if (!fs.existsSync(filePath)) continue;

    const book = readJson<SourceBook>(filePath);
    for (const row of book.rows ?? []) {
      if (!row.name?.trim() || !row.shortDescription?.trim()) continue;
      const scopedMatches = matchingSpells(spellsByKey, row.name).filter(
        (spell) => spell.rulebookAbbr === source.rulebookAbbr,
      );
      if (scopedMatches.length > 0) continue;

      for (const target of matchingSpells(missingEnByKey, row.name)) {
        const stableKey = [
          "en-source-gap",
          target.id,
          stablePart(source.rulebookAbbr),
          stablePart(row.name),
        ].join(":");
        candidates.push({
          schemaVersion: 1,
          queue: "source-gap-reuse-candidates",
          stableKey,
          lang: "en",
          variant: "imarvin",
          matchStatus: "source_gap_exact_name",
          source: {
            sourceToken: sourceToken(source),
            sourceName: sourceLabel(source),
            sourceRulebookAbbr: source.rulebookAbbr,
            sourceRulebookName: source.rulebookName ?? null,
            sourceEditionSlug: source.editionSlug ?? null,
            sourceFile: source.file,
            imarvinId: row.id ?? null,
            spellName: row.name,
            summaryText: row.shortDescription,
          },
          target: {
            spellId: target.id,
            spellName: target.name,
            rulebookId: target.rulebookId,
            rulebookAbbr: target.rulebookAbbr,
            rulebookName: target.rulebookName,
            editionSlug: target.editionSlug,
            missingSummaryKey: `${target.id}:en:imarvin`,
          },
          recommendation:
            "Review before reuse: IMarvin has an exact-name source row, but no local spell row for that source book.",
        });
      }
    }
  }

  return [
    ...new Map(candidates.map((candidate) => [candidate.stableKey, candidate])).values(),
  ].sort((a, b) => a.stableKey.localeCompare(b.stableKey));
}

function readReviewDecisions(reviewDir: string) {
  if (!fs.existsSync(reviewDir)) return [];
  return fs
    .readdirSync(reviewDir)
    .filter((entry) => /\.decisions\.jsonl$/i.test(entry))
    .flatMap((entry) =>
      readJsonl<SourceGapDecision>(path.join(reviewDir, entry)).map((decision) => ({
        ...decision,
        decisionFile: entry,
      })),
    );
}

function rowFromCandidate(
  candidate: SourceGapCandidate,
  decision: SourceGapDecision,
): NormalizedSummaryRow {
  return {
    schemaVersion: 1,
    stableKey: candidate.target.missingSummaryKey,
    spellId: candidate.target.spellId,
    rulebookId: candidate.target.rulebookId,
    rulebookAbbr: candidate.target.rulebookAbbr,
    lang: "en",
    variant: "imarvin",
    summaryText: candidate.source.summaryText,
    sourceKey: `source-gap-reuse:${candidate.target.spellId}:${candidate.source.sourceToken ?? stablePart(candidate.source.sourceName)}:${stablePart(candidate.source.spellName)}`,
    sourceName: `${candidate.source.sourceName} source-index reused for ${candidate.target.rulebookAbbr}`,
    sourceKind: "source-gap-reuse",
    reviewStatus: "accepted",
    provenance: {
      sourceGapCandidateKey: candidate.stableKey,
      decision: decision.decision,
      reason: decision.reason,
      confidence: decision.confidence,
      matchStatus: candidate.matchStatus,
      source: candidate.source,
      target: candidate.target,
    },
  };
}

function candidateOutputPath(outDir: string) {
  return path.join(outDir, "review-queues", "source-gap-reuse-candidates.jsonl");
}

function runCandidates(options: ReturnType<typeof parseArgs>) {
  const candidates = buildCandidates(options);
  const outPath = candidateOutputPath(options.outDir);
  writeJsonl(outPath, candidates);
  const summary = {
    generatedAt: new Date().toISOString(),
    scope: options.scope ?? "all",
    candidates: candidates.length,
    bySourceBook: countBy(candidates, (candidate) => candidate.source.sourceRulebookAbbr),
    byTargetBook: countBy(candidates, (candidate) => candidate.target.rulebookAbbr),
    output: outPath,
  };
  writeJson(path.join(options.outDir, "source-gap-reuse-candidates.summary.json"), summary);
  console.log("short-desc source-gap reuse candidates done");
  console.log(summary);
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort((left, right) => right[1] - left[1]),
  );
}

function runApply(options: ReturnType<typeof parseArgs>) {
  const existingRows = readJsonl<NormalizedSummaryRow>(options.input);
  const candidates = buildCandidates(options);
  const decisions = readReviewDecisions(options.reviewDir);
  const byDecisionKey = new Map(decisions.map((decision) => [decision.stableKey, decision]));
  const existingKeys = new Set(existingRows.map((row) => row.stableKey));
  const acceptedRows: NormalizedSummaryRow[] = [];
  const skipped = {
    noDecision: 0,
    decisionReject: 0,
    decisionNeedsSourceCheck: 0,
    targetAlreadyHasSummary: 0,
  };

  for (const candidate of candidates) {
    const decision = byDecisionKey.get(candidate.stableKey);
    if (!decision?.decision) {
      skipped.noDecision += 1;
      continue;
    }
    if (decision.decision === "reject") {
      skipped.decisionReject += 1;
      continue;
    }
    if (decision.decision === "needs_source_check") {
      skipped.decisionNeedsSourceCheck += 1;
      continue;
    }
    const row = rowFromCandidate(candidate, decision);
    if (existingKeys.has(row.stableKey)) {
      skipped.targetAlreadyHasSummary += 1;
      continue;
    }
    existingKeys.add(row.stableKey);
    acceptedRows.push(row);
  }

  const acceptedPath = path.join(
    options.outDir,
    "generated",
    "source-gap-reuse.accepted.generated.jsonl",
  );
  writeJsonl(acceptedPath, acceptedRows);

  if (options.write && acceptedRows.length > 0) {
    writeJsonl(options.input, [...existingRows, ...acceptedRows]);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: options.write ? "write" : "dry-run",
    input: options.input,
    candidates: candidates.length,
    decisions: decisions.length,
    acceptedRows: acceptedRows.length,
    existingRows: existingRows.length,
    outputRows: existingRows.length + (options.write ? acceptedRows.length : 0),
    skipped,
    acceptedPath,
  };
  writeJson(path.join(options.outDir, "source-gap-reuse-apply.summary.json"), summary);
  console.log("short-desc source-gap reuse apply done");
  console.log(summary);
}

function main() {
  const [mode, ...argv] = process.argv.slice(2);
  if (mode !== "candidates" && mode !== "apply") usage();
  const options = parseArgs(mode, argv);
  if (mode === "candidates") runCandidates(options);
  if (mode === "apply") runApply(options);
}

main();
