import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "../env";
import { normalizeName } from "../en-summary-matching";

type Lang = "en" | "zh";
type MatchStatus = "description_exact" | "description_differs";

type SummaryRow = {
  stableKey: string;
  spellId: number;
  rulebookId: number;
  rulebookAbbr: string;
  lang: Lang;
  variant: string;
  summaryText: string;
  sourceKey: string;
  sourceName: string;
  sourceKind: string;
};

type SpellRow = {
  id: number;
  name: string;
  rulebookId: number;
  rulebookAbbr: string;
  editionSlug: string;
  description: string | null;
  descriptionHtml: string | null;
};

type ReuseCandidate = {
  schemaVersion: 1;
  queue: "summary-reuse-candidates";
  stableKey: string;
  lang: Lang;
  variant: "chm" | "imarvin";
  nameKey: string;
  spellName: string;
  matchStatus: MatchStatus;
  target: {
    spellId: number;
    rulebookId: number;
    rulebookAbbr: string;
    editionSlug: string;
    missingSummaryKey: string;
    descriptionText: string;
  };
  source: {
    spellId: number;
    rulebookId: number;
    rulebookAbbr: string;
    editionSlug: string;
    summaryText: string;
    sourceKey: string;
    sourceName: string;
    sourceKind: string;
    descriptionText: string;
  };
  recommendation: string;
};

type AutoDecision = {
  schemaVersion: 1;
  queue: "summary-reuse-candidates";
  stableKey: string;
  decision: "reuse";
  reason: string;
  confidence: "high";
  sourceStableKey: string;
  targetStableKey: string;
};

const DEFAULT_INPUT = path.join(
  localDataDir(),
  "short-desc-normalized",
  "summaries.generated.jsonl",
);
const DEFAULT_OUT_DIR = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "short-desc-qa",
);
const DEFAULT_SCOPE = ["core-35", "supplementals-35"];
const DEFAULT_EXCLUDED_RULEBOOKS = ["ToB"];
const DEFAULT_CHUNK_SIZE = 80;

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools summaries:reuse-candidates

Options:
  --input <path>       Normalized summary JSONL. Default: data/short-desc-normalized/summaries.generated.jsonl
  --outDir <path>      QA output directory. Default: data-tools/out/short-desc-qa
  --scope <slugs>      Comma-separated edition slugs. Default: core-35,supplementals-35
  --excludeRulebooks <abbrs>  Comma-separated rulebook abbreviations. Default: ToB
  --chunkSize <n>      Review chunk size. Default: 80
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") usage();
    if (!arg?.startsWith("--")) continue;
    const next = argv[index + 1];
    args.set(arg, next && !next.startsWith("--") ? next : "true");
    if (next && !next.startsWith("--")) index += 1;
  }

  const inputRaw = args.get("--input") ?? DEFAULT_INPUT;
  const outDirRaw = args.get("--outDir") ?? DEFAULT_OUT_DIR;
  const scope = (args.get("--scope") ?? DEFAULT_SCOPE.join(","))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const excludeRulebooks = (
    args.get("--excludeRulebooks") ?? DEFAULT_EXCLUDED_RULEBOOKS.join(",")
  )
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const chunkSize = Number(args.get("--chunkSize") ?? DEFAULT_CHUNK_SIZE);
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) usage();

  return {
    input: path.isAbsolute(inputRaw)
      ? inputRaw
      : path.resolve(process.cwd(), inputRaw),
    outDir: path.isAbsolute(outDirRaw)
      ? outDirRaw
      : path.resolve(process.cwd(), outDirRaw),
    scope,
    excludeRulebooks,
    chunkSize,
  };
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

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }
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

function loadScopedSpells(scope: string[]) {
  const db = new Database(rulesDbPath(), {
    readonly: true,
    fileMustExist: true,
  });
  try {
    return db
      .prepare(
        `
          SELECT
            s.id AS id,
            s.name AS name,
            s.description AS description,
            s.description_html AS descriptionHtml,
            rb.id AS rulebookId,
            rb.abbr AS rulebookAbbr,
            ed.slug AS editionSlug
          FROM dnd_spell s
          JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
          JOIN dnd_dndedition ed ON ed.id = rb.dnd_edition_id
          WHERE ed.slug IN (${scope.map(() => "?").join(", ")})
        `,
      )
      .all(...scope) as SpellRow[];
  } finally {
    db.close();
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function normalizeDescription(value: string | null | undefined) {
  return stripHtml(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function displayDescription(spell: SpellRow) {
  return stripHtml(spell.descriptionHtml ?? spell.description ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function byName(spells: SpellRow[]) {
  const grouped = new Map<string, SpellRow[]>();
  for (const spell of spells) {
    const key = normalizeName(spell.name);
    grouped.set(key, [...(grouped.get(key) ?? []), spell]);
  }
  return grouped;
}

function candidateKey(target: SpellRow, source: SummaryRow) {
  return `${source.lang}:${target.id}:${source.spellId}`;
}

function buildCandidates(
  input: string,
  scope: string[],
  excludeRulebooks: string[],
) {
  const summaries = readJsonl<SummaryRow>(input);
  const excludedRulebooks = new Set(excludeRulebooks);
  const scopedSpells = loadScopedSpells(scope).filter(
    (spell) => !excludedRulebooks.has(spell.rulebookAbbr),
  );
  const spellById = new Map(scopedSpells.map((spell) => [spell.id, spell]));
  const spellsByName = byName(scopedSpells);
  const summaryBySpellLang = new Map<string, SummaryRow>();
  const summariesByNameLang = new Map<string, SummaryRow[]>();

  for (const summary of summaries) {
    summaryBySpellLang.set(`${summary.spellId}:${summary.lang}`, summary);
    const spell = spellById.get(summary.spellId);
    if (!spell) continue;
    const key = `${normalizeName(spell.name)}:${summary.lang}`;
    summariesByNameLang.set(key, [
      ...(summariesByNameLang.get(key) ?? []),
      summary,
    ]);
  }

  const candidates: ReuseCandidate[] = [];
  for (const target of scopedSpells) {
    const nameKey = normalizeName(target.name);
    const sameNameSpells = spellsByName.get(nameKey) ?? [];
    if (sameNameSpells.length <= 1) continue;

    for (const lang of ["en", "zh"] as const) {
      if (summaryBySpellLang.has(`${target.id}:${lang}`)) continue;

      const sourceSummaries = (summariesByNameLang.get(`${nameKey}:${lang}`) ?? [])
        .filter((summary) => summary.spellId !== target.id)
        .filter((summary) => spellById.has(summary.spellId));

      for (const sourceSummary of sourceSummaries) {
        const sourceSpell = spellById.get(sourceSummary.spellId)!;
        const variant = lang === "zh" ? "chm" : "imarvin";
        const targetDescription = normalizeDescription(
          target.descriptionHtml ?? target.description,
        );
        const sourceDescription = normalizeDescription(
          sourceSpell.descriptionHtml ?? sourceSpell.description,
        );
        const matchStatus: MatchStatus =
          targetDescription === sourceDescription
            ? "description_exact"
            : "description_differs";

        candidates.push({
          schemaVersion: 1,
          queue: "summary-reuse-candidates",
          stableKey: candidateKey(target, sourceSummary),
          lang,
          variant,
          nameKey,
          spellName: target.name,
          matchStatus,
          target: {
            spellId: target.id,
            rulebookId: target.rulebookId,
            rulebookAbbr: target.rulebookAbbr,
            editionSlug: target.editionSlug,
            missingSummaryKey: `${target.id}:${lang}:${variant}`,
            descriptionText: displayDescription(target),
          },
          source: {
            spellId: sourceSpell.id,
            rulebookId: sourceSpell.rulebookId,
            rulebookAbbr: sourceSpell.rulebookAbbr,
            editionSlug: sourceSpell.editionSlug,
            summaryText: sourceSummary.summaryText,
            sourceKey: sourceSummary.sourceKey,
            sourceName: sourceSummary.sourceName,
            sourceKind: sourceSummary.sourceKind,
            descriptionText: displayDescription(sourceSpell),
          },
          recommendation:
            matchStatus === "description_exact"
              ? "auto-reuse candidate: rules DB descriptions match exactly after normalization"
              : "review source and target rules DB descriptions before reusing this summary",
        });
      }
    }
  }

  return candidates.sort(
    (a, b) =>
      a.lang.localeCompare(b.lang) ||
      a.target.rulebookAbbr.localeCompare(b.target.rulebookAbbr) ||
      a.spellName.localeCompare(b.spellName) ||
      a.source.rulebookAbbr.localeCompare(b.source.rulebookAbbr) ||
      a.stableKey.localeCompare(b.stableKey),
  );
}

function autoDecisions(candidates: ReuseCandidate[]) {
  const bestByTargetLang = new Map<string, ReuseCandidate>();
  for (const candidate of candidates) {
    if (candidate.matchStatus !== "description_exact") continue;
    const key = `${candidate.target.spellId}:${candidate.lang}`;
    const existing = bestByTargetLang.get(key);
    if (
      !existing ||
      candidate.source.rulebookAbbr.localeCompare(existing.source.rulebookAbbr) < 0
    ) {
      bestByTargetLang.set(key, candidate);
    }
  }

  return [...bestByTargetLang.values()].map(
    (candidate): AutoDecision => ({
      schemaVersion: 1,
      queue: "summary-reuse-candidates",
      stableKey: candidate.stableKey,
      decision: "reuse",
      reason: "source and target rules DB descriptions match exactly after normalization",
      confidence: "high",
      sourceStableKey: `${candidate.source.spellId}:${candidate.lang}:${
        candidate.lang === "zh" ? "chm" : "imarvin"
      }`,
      targetStableKey: `${candidate.target.spellId}:${candidate.lang}:${
        candidate.lang === "zh" ? "chm" : "imarvin"
      }`,
    }),
  );
}

function writeChunks(outDir: string, rows: ReuseCandidate[], chunkSize: number) {
  const chunkDir = path.join(outDir, "review-queues", "summary-reuse-candidates");
  fs.mkdirSync(chunkDir, { recursive: true });
  for (const entry of fs.readdirSync(chunkDir)) {
    if (/^batch-\d+\.jsonl$/i.test(entry)) {
      fs.rmSync(path.join(chunkDir, entry));
    }
  }

  for (let index = 0; index < rows.length; index += chunkSize) {
    const batch = rows.slice(index, index + chunkSize);
    const batchNo = String(Math.floor(index / chunkSize) + 1).padStart(3, "0");
    writeJsonl(path.join(chunkDir, `batch-${batchNo}.jsonl`), batch);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const candidates = buildCandidates(
    options.input,
    options.scope,
    options.excludeRulebooks,
  );
  const autos = autoDecisions(candidates);
  const reviewCandidates = candidates.filter(
    (candidate) => candidate.matchStatus !== "description_exact",
  );

  const queueRoot = path.join(options.outDir, "review-queues");
  const resultRoot = path.join(options.outDir, "review-results");
  writeJsonl(
    path.join(queueRoot, "summary-reuse-candidates.jsonl"),
    candidates,
  );
  writeJsonl(
    path.join(queueRoot, "summary-reuse-review-candidates.jsonl"),
    reviewCandidates,
  );
  writeJsonl(
    path.join(resultRoot, "summary-reuse.auto-decisions.jsonl"),
    autos,
  );
  writeChunks(options.outDir, reviewCandidates, options.chunkSize);

  const byLang = { en: 0, zh: 0 };
  const byStatus: Record<MatchStatus, number> = {
    description_exact: 0,
    description_differs: 0,
  };
  const byTargetBook: Record<string, number> = {};
  for (const candidate of candidates) {
    byLang[candidate.lang] += 1;
    byStatus[candidate.matchStatus] += 1;
    byTargetBook[candidate.target.rulebookAbbr] =
      (byTargetBook[candidate.target.rulebookAbbr] ?? 0) + 1;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    input: options.input,
    scope: options.scope,
    excludeRulebooks: options.excludeRulebooks,
    candidates: candidates.length,
    reviewCandidates: reviewCandidates.length,
    autoDecisions: autos.length,
    byLang,
    byStatus,
    byTargetBook: Object.fromEntries(
      Object.entries(byTargetBook).sort((a, b) => b[1] - a[1]),
    ),
    outputs: {
      all: path.join(queueRoot, "summary-reuse-candidates.jsonl"),
      review: path.join(queueRoot, "summary-reuse-review-candidates.jsonl"),
      chunks: path.join(queueRoot, "summary-reuse-candidates"),
      autoDecisions: path.join(resultRoot, "summary-reuse.auto-decisions.jsonl"),
    },
  };
  writeJson(path.join(options.outDir, "summary-reuse-candidates.summary.json"), summary);

  console.log("short-desc reuse candidates done");
  console.log(summary);
}

main();
