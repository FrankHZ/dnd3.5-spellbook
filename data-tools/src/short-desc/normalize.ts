import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { chooseExact, normalizeName } from "../en-summary-matching";
import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "../env";
import { BOOK_LABEL_TO_ABBR, normalizeBookLabel } from "../zh-parser/mapping";

type Lang = "zh" | "en";
type Variant = "chm" | "imarvin";
type ReviewStatus = "accepted";

type NormalizedSummaryRow = {
  schemaVersion: 1;
  stableKey: string;
  spellId: number;
  rulebookId: number;
  rulebookAbbr: string;
  lang: Lang;
  variant: Variant;
  summaryText: string;
  sourceKey: string;
  sourceName: string;
  sourceKind: string;
  reviewStatus: ReviewStatus;
  provenance: Record<string, unknown>;
};

type ZhMatchedRecord = {
  sourceKey?: string;
  file?: string;
  kind?: string;
  sourceKind?: string;
  listOwner?: string;
  spellLevel?: number | null;
  schoolGroup?: string | null;
  discipline?: string | null;
  sourceProvenance?: string;
  zhName?: string;
  enName?: string;
  summaryText?: string;
  spellId?: number | null;
  rulebookId?: number | null;
  rulebookAbbr?: string | null;
  chmRulebookLabels?: string[];
  resolvedEnName?: string | null;
  aliasReview?: string;
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

type ZhConflictReview = {
  reviewId?: string;
  spellId?: number | null;
  enName?: string;
  decision?:
    | "needs_human"
    | "equivalent_choose_shorter"
    | "equivalent_choose_more_precise"
    | "choose_variant"
    | "source_error";
  chosenVariantId?: string | null;
  confidence?: string | number;
  reason?: string;
  notes?: string;
};

type ZhConflictBatch = {
  reviewId?: string;
  spellId?: number | null;
  enName?: string;
  variants?: Array<{
    variantId?: string;
    normalizedSummaryText?: string;
    summaries?: Array<{
      summaryText?: string;
      records?: Array<{
        sourceKey?: string;
        sourceKind?: string;
        file?: string;
        listOwner?: string;
        spellLevel?: number | null;
        rulebookAbbr?: string | null;
        zhName?: string;
        enName?: string;
        summaryText?: string;
      }>;
    }>;
  }>;
};

type EnSourceManifest = {
  sources?: Array<{
    token?: string;
    name?: string;
    abbr?: string;
    status?: string;
    file?: string;
    rows?: number;
    category?: string;
    categorySource?: string;
    rulebookAbbr?: string;
    rulebookName?: string;
    editionSlug?: string;
  }>;
};

type EnSourceBook = {
  source?: {
    token?: string;
    name?: string;
    abbr?: string;
    status?: string;
  };
  rows?: Array<{
    id?: number | null;
    name?: string;
    shortDescription?: string;
    sourceToken?: string;
    sourceName?: string;
    sourceAbbr?: string;
    sourceStatus?: string;
  }>;
};

type SpellLookupRow = {
  id: number;
  name: string;
  rulebookId: number;
  rulebookAbbr: string;
};

type SkipCounts = Record<string, number>;

type Report = {
  generatedAt: string;
  inputs: Record<string, string>;
  output: string;
  rows: number;
  byLang: Record<Lang, number>;
  skipped: {
    zh: SkipCounts;
    en: SkipCounts;
  };
};

const DEFAULT_ZH_MATCHED = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "zh-parser",
  "summary",
  "matched.json",
);
const DEFAULT_ZH_CONFLICTS = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "zh-parser",
  "summary",
  "conflicts.json",
);
const DEFAULT_ZH_CONFLICT_REVIEW_DIR = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "zh-parser",
  "summary",
  "conflict-review",
);
const DEFAULT_EN_SOURCE_INDEX = path.join(
  localDataDir(),
  "imarvin",
  "short-desc",
  "source-index",
);
const DEFAULT_OUT = path.join(
  localDataDir(),
  "short-desc-normalized",
  "summaries.generated.jsonl",
);
const DEFAULT_REPORT = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "short-desc-normalized",
  "summary.json",
);

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools summaries:normalize
  npm run -w data-tools summaries:normalize -- --out short-desc-normalized/summaries.generated.jsonl

Options:
  --zhMatched <path>            Chinese matched summaries JSON.
  --zhConflicts <path>          Chinese conflict groups JSON.
  --zhConflictReviewDir <path>  Chinese conflict review directory.
  --enSourceIndex <path>        IMarvinTPA source-index directory.
  --out <path>                  JSONL output path. Relative paths resolve under data/.
  --report <path>               JSON report path.
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

  return {
    zhMatched: path.resolve(args.get("--zhMatched") ?? DEFAULT_ZH_MATCHED),
    zhConflicts: path.resolve(args.get("--zhConflicts") ?? DEFAULT_ZH_CONFLICTS),
    zhConflictReviewDir: path.resolve(
      args.get("--zhConflictReviewDir") ?? DEFAULT_ZH_CONFLICT_REVIEW_DIR,
    ),
    enSourceIndex: path.resolve(
      args.get("--enSourceIndex") ?? DEFAULT_EN_SOURCE_INDEX,
    ),
    out: resolveDataPath(args.get("--out") ?? DEFAULT_OUT),
    report: path.resolve(args.get("--report") ?? DEFAULT_REPORT),
  };
}

function resolveDataPath(rawPath: string) {
  if (path.isAbsolute(rawPath)) return rawPath;
  return path.resolve(localDataDir(), rawPath);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readJsonl<T>(filePath: string): T[] {
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

function writeJsonl(filePath: string, rows: NormalizedSummaryRow[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
    "utf8",
  );
}

function bump(counts: SkipCounts, key: string, amount = 1) {
  counts[key] = (counts[key] ?? 0) + amount;
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

function loadSpellLookup() {
  const db = new Database(rulesDbPath(), { readonly: true, fileMustExist: true });
  try {
    const rows = db
      .prepare(
        `
          SELECT
            s.id AS id,
            s.name AS name,
            rb.id AS rulebookId,
            rb.abbr AS rulebookAbbr
          FROM dnd_spell s
          JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
        `,
      )
      .all() as SpellLookupRow[];

    const byRulebook = new Map<string, SpellLookupRow[]>();
    for (const row of rows) {
      byRulebook.set(row.rulebookAbbr, [
        ...(byRulebook.get(row.rulebookAbbr) ?? []),
        row,
      ]);
    }
    return byRulebook;
  } finally {
    db.close();
  }
}

function normalizeZhSummary(text: string) {
  return text
    .replace(/[０-９]/g, (ch) => String(ch.charCodeAt(0) - 0xff10))
    .replace(/\s+/g, "")
    .replace(/[。．.]+$/g, "")
    .replace(/[，,]/g, ",")
    .replace(/[；;]/g, ";")
    .replace(/[：:]/g, ":")
    .replace(/[（）]/g, (value) => (value === "（" ? "(" : ")"))
    .toLowerCase();
}

function groupBySpell(records: ZhMatchedRecord[]) {
  const groups = new Map<number, ZhMatchedRecord[]>();
  for (const record of records) {
    if (typeof record.spellId !== "number") continue;
    groups.set(record.spellId, [...(groups.get(record.spellId) ?? []), record]);
  }
  for (const [spellId, group] of groups) {
    const direct = group.filter(recordHasDirectRulebookLabel);
    if (direct.length > 0) groups.set(spellId, direct);
  }
  return groups;
}

function recordHasDirectRulebookLabel(record: ZhMatchedRecord) {
  if (!record.rulebookAbbr) return false;
  return (record.chmRulebookLabels ?? []).some(
    (label) => BOOK_LABEL_TO_ABBR[normalizeBookLabel(label)] === record.rulebookAbbr,
  );
}

function conflictKey(spellId: number | null | undefined, enName: string | undefined) {
  return `${spellId ?? ""}|${normalizeName(enName ?? "")}`;
}

function loadZhConflictReviews(reviewDir: string) {
  const decisions = new Map<string, ZhConflictReview>();
  for (const row of readJsonl<ZhConflictReview>(
    path.join(reviewDir, "review-merged.jsonl"),
  )) {
    if (row.reviewId) decisions.set(row.reviewId, row);
  }

  const batches = new Map<string, ZhConflictBatch>();
  if (fs.existsSync(reviewDir)) {
    for (const entry of fs.readdirSync(reviewDir)) {
      if (!/^batch-\d+\.json$/i.test(entry)) continue;
      for (const item of readJson<ZhConflictBatch[]>(path.join(reviewDir, entry))) {
        if (item.reviewId) batches.set(item.reviewId, item);
      }
    }
  }

  const byConflict = new Map<
    string,
    { decision: ZhConflictReview; batch: ZhConflictBatch | undefined }
  >();
  for (const [reviewId, decision] of decisions) {
    const batch = batches.get(reviewId);
    byConflict.set(conflictKey(decision.spellId, decision.enName), {
      decision,
      batch,
    });
  }
  return byConflict;
}

function sourceKeyOrdinal(sourceKey: string | undefined) {
  const match = sourceKey?.match(/#(\d+)-/);
  return match?.[1] ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function sourceKindRank(sourceKind: string | undefined) {
  if (sourceKind === "class-list") return 0;
  if (sourceKind === "maneuver-list") return 1;
  if (sourceKind === "domain-list") return 2;
  return 3;
}

function bestRecord(
  records: ZhMatchedRecord[],
  opts: { preferSourceOrder?: boolean } = {},
) {
  return [...records].sort((a, b) => {
    const aLen = a.summaryText?.length ?? 0;
    const bLen = b.summaryText?.length ?? 0;
    return (
      aLen - bLen ||
      (opts.preferSourceOrder
        ? sourceKindRank(a.sourceKind) - sourceKindRank(b.sourceKind) ||
          sourceKeyOrdinal(a.sourceKey) - sourceKeyOrdinal(b.sourceKey)
        : 0) ||
      (a.sourceKey ?? "").localeCompare(b.sourceKey ?? "") ||
      (a.listOwner ?? "").localeCompare(b.listOwner ?? "")
    );
  })[0];
}

function rowFromZh(record: ZhMatchedRecord, reviewStatus: ReviewStatus) {
  if (
    typeof record.spellId !== "number" ||
    typeof record.rulebookId !== "number" ||
    !record.rulebookAbbr ||
    !record.summaryText?.trim() ||
    !record.sourceKey
  ) {
    return null;
  }

  const sourceName = record.listOwner || record.file || "CHM";
  return {
    schemaVersion: 1,
    stableKey: `${record.spellId}:zh:chm`,
    spellId: record.spellId,
    rulebookId: record.rulebookId,
    rulebookAbbr: record.rulebookAbbr,
    lang: "zh",
    variant: "chm",
    summaryText: record.summaryText.trim(),
    sourceKey: `zh-chm:${record.sourceKey}`,
    sourceName,
    sourceKind: record.sourceKind ?? "zh-chm",
    reviewStatus,
    provenance: {
      file: record.file,
      listOwner: record.listOwner,
      sourceProvenance: record.sourceProvenance,
      zhName: record.zhName,
      enName: record.resolvedEnName ?? record.enName,
      aliasReview: record.aliasReview,
    },
  } satisfies NormalizedSummaryRow;
}

function selectedRecordFromConflict(
  group: ZhMatchedRecord[],
  conflict: ZhConflictRecord,
  review: { decision: ZhConflictReview; batch: ZhConflictBatch | undefined },
) {
  const decision = review.decision;
  if (decision.decision === "needs_human") {
    return null;
  }
  if (!decision.chosenVariantId || !review.batch?.variants) return null;

  const selected = review.batch.variants.find(
    (variant) => variant.variantId === decision.chosenVariantId,
  );
  const selectedSourceKeys = new Set(
    selected?.summaries
      ?.flatMap((summary) => summary.records ?? [])
      .map((record) => record.sourceKey)
      .filter((key): key is string => Boolean(key)) ?? [],
  );
  const candidates = group.filter(
    (record) => record.sourceKey && selectedSourceKeys.has(record.sourceKey),
  );
  if (candidates.length > 0) return bestRecord(candidates, { preferSourceOrder: true });

  const selectedTexts = new Set(
    selected?.summaries
      ?.map((summary) => summary.summaryText)
      .filter((text): text is string => Boolean(text)) ?? [],
  );
  const byText = group.filter(
    (record) => record.summaryText && selectedTexts.has(record.summaryText),
  );
  if (byText.length > 0) return bestRecord(byText, { preferSourceOrder: true });

  const normalizedTexts = new Set(
    selected?.summaries
      ?.map((summary) => summary.summaryText)
      .filter((text): text is string => Boolean(text))
      .map(normalizeZhSummary) ?? [],
  );
  const byNormalizedText = group.filter(
    (record) =>
      record.summaryText && normalizedTexts.has(normalizeZhSummary(record.summaryText)),
  );
  if (byNormalizedText.length > 0) {
    return bestRecord(byNormalizedText, { preferSourceOrder: true });
  }

  const conflictTexts = new Set(
    conflict.summaries
      ?.map((summary) => summary.summaryText)
      .filter((text): text is string => Boolean(text)) ?? [],
  );
  return bestRecord(
    group.filter((record) => record.summaryText && conflictTexts.has(record.summaryText)),
    { preferSourceOrder: true },
  );
}

function normalizeZh(
  matched: ZhMatchedRecord[],
  conflicts: ZhConflictRecord[],
  reviewDir: string,
  skipped: SkipCounts,
) {
  const rows: NormalizedSummaryRow[] = [];
  const groups = groupBySpell(matched);
  const conflictBySpell = new Map<number, ZhConflictRecord>();
  for (const conflict of conflicts) {
    if (typeof conflict.spellId === "number") {
      conflictBySpell.set(conflict.spellId, conflict);
    }
  }
  const reviews = loadZhConflictReviews(reviewDir);

  for (const [spellId, group] of groups) {
    const conflict = conflictBySpell.get(spellId);
    let selected: ZhMatchedRecord | undefined | null;

    if (conflict) {
      const review = reviews.get(conflictKey(conflict.spellId, conflict.enName));
      if (!review) {
        bump(skipped, "zh_conflict_unreviewed");
        continue;
      }
      selected = selectedRecordFromConflict(group, conflict, review);
      if (!selected) {
        bump(skipped, `zh_conflict_${review.decision.decision ?? "skipped"}`);
        continue;
      }
    } else {
      const normalizedVariants = new Map<string, ZhMatchedRecord[]>();
      for (const record of group) {
        if (!record.summaryText?.trim()) continue;
        const key = normalizeZhSummary(record.summaryText);
        normalizedVariants.set(key, [...(normalizedVariants.get(key) ?? []), record]);
      }
      if (normalizedVariants.size > 1) {
        bump(skipped, "zh_unreviewed_variant_conflict");
        continue;
      }
      selected = bestRecord(group);
    }

    if (!selected) {
      bump(skipped, "zh_no_selected_record");
      continue;
    }
    const row = rowFromZh(selected, "accepted");
    if (!row) {
      bump(skipped, "zh_invalid_selected_record");
      continue;
    }
    rows.push(row);
  }

  return rows;
}

function loadEnSources(indexDir: string) {
  const manifestPath = path.join(indexDir, "manifest.json");
  const manifest = readJson<EnSourceManifest>(manifestPath);
  const books: Array<{
    source: NonNullable<EnSourceManifest["sources"]>[number];
    book: EnSourceBook;
  }> = [];
  for (const source of manifest.sources ?? []) {
    if (!source.file) continue;
    const filePath = path.join(indexDir, source.file);
    if (!fs.existsSync(filePath)) continue;
    books.push({ source, book: readJson<EnSourceBook>(filePath) });
  }
  return books;
}

function rowFromEn(
  spell: SpellLookupRow,
  source: NonNullable<EnSourceManifest["sources"]>[number],
  item: NonNullable<EnSourceBook["rows"]>[number],
) {
  const sourceToken = source.token ?? item.sourceToken ?? "unknown";
  const sourceName = source.name ?? item.sourceName ?? sourceToken;
  const itemKey = item.id ?? normalizeName(item.name ?? "");
  return {
    schemaVersion: 1,
    stableKey: `${spell.id}:en:imarvin`,
    spellId: spell.id,
    rulebookId: spell.rulebookId,
    rulebookAbbr: spell.rulebookAbbr,
    lang: "en",
    variant: "imarvin",
    summaryText: item.shortDescription!.trim(),
    sourceKey: `imarvin:${sourceToken}:${itemKey}`,
    sourceName,
    sourceKind: "imarvin-source-index",
    reviewStatus: "accepted",
    provenance: {
      imarvinId: item.id ?? null,
      imarvinName: item.name,
      sourceToken,
      sourceAbbr: source.abbr ?? item.sourceAbbr,
      sourceStatus: source.status ?? item.sourceStatus,
      category: source.category,
      categorySource: source.categorySource,
    },
  } satisfies NormalizedSummaryRow;
}

function normalizeEn(
  sourceIndexDir: string,
  byRulebook: Map<string, SpellLookupRow[]>,
  skipped: SkipCounts,
) {
  const rows = new Map<string, NormalizedSummaryRow>();

  for (const { source, book } of loadEnSources(sourceIndexDir)) {
    if (!source.rulebookAbbr) {
      bump(skipped, "en_source_without_db_rulebook", book.rows?.length ?? 0);
      continue;
    }

    const spells = byRulebook.get(source.rulebookAbbr);
    if (!spells) {
      bump(skipped, "en_rulebook_not_in_db", book.rows?.length ?? 0);
      continue;
    }

    for (const item of book.rows ?? []) {
      if (!item.name?.trim()) {
        bump(skipped, "en_missing_name");
        continue;
      }
      if (!item.shortDescription?.trim()) {
        bump(skipped, "en_missing_summary");
        continue;
      }

      const matches = chooseExact(spells, item.name);
      if (matches.length === 0) {
        bump(skipped, "en_no_local_spell_match");
        continue;
      }
      if (matches.length > 1) {
        bump(skipped, "en_ambiguous_local_spell_match");
        continue;
      }

      const row = rowFromEn(matches[0]!, source, item);
      if (!rows.has(row.stableKey)) {
        rows.set(row.stableKey, row);
      } else {
        bump(skipped, "en_duplicate_stable_key");
      }
    }
  }

  return [...rows.values()];
}

function sortRows(rows: NormalizedSummaryRow[]) {
  return [...rows].sort(
    (a, b) =>
      a.lang.localeCompare(b.lang) ||
      a.variant.localeCompare(b.variant) ||
      a.rulebookAbbr.localeCompare(b.rulebookAbbr) ||
      a.spellId - b.spellId ||
      a.sourceKey.localeCompare(b.sourceKey),
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const byRulebook = loadSpellLookup();
  const zhMatched = readJson<ZhMatchedRecord[]>(options.zhMatched);
  const zhConflicts = readJson<ZhConflictRecord[]>(options.zhConflicts);
  const skipped = {
    zh: {} as SkipCounts,
    en: {} as SkipCounts,
  };

  const zhRows = normalizeZh(
    zhMatched,
    zhConflicts,
    options.zhConflictReviewDir,
    skipped.zh,
  );
  const enRows = normalizeEn(options.enSourceIndex, byRulebook, skipped.en);
  const rows = sortRows([...zhRows, ...enRows]);
  writeJsonl(options.out, rows);

  const report: Report = {
    generatedAt: new Date().toISOString(),
    inputs: {
      zhMatched: options.zhMatched,
      zhConflicts: options.zhConflicts,
      zhConflictReviewDir: options.zhConflictReviewDir,
      enSourceIndex: options.enSourceIndex,
    },
    output: options.out,
    rows: rows.length,
    byLang: {
      en: enRows.length,
      zh: zhRows.length,
    },
    skipped,
  };
  writeJson(options.report, report);

  console.log("short-desc normalize done");
  console.log(report);
}

main();
