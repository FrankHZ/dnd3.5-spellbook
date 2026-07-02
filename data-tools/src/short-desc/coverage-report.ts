import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { chooseExact } from "./en-summary-matching";
import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";

type Lang = "en" | "zh";

type SummaryRow = {
  spellId?: number;
  rulebookId?: number;
  rulebookAbbr?: string;
  lang?: Lang;
  variant?: string;
  summaryText?: string;
};

type SpellRow = {
  id: number;
  name: string;
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
  file?: string;
  rows?: number;
  category?: string;
  categorySource?: string;
  rulebookAbbr?: string;
  rulebookName?: string;
  editionSlug?: string;
};

type SourceBook = {
  source?: {
    token?: string;
    name?: string;
    abbr?: string;
    status?: string;
  };
  rows?: SourceSpell[];
};

type SourceSpell = {
  id?: number | null;
  name?: string;
  shortDescription?: string;
  sourceToken?: string;
  sourceName?: string;
  sourceAbbr?: string;
  sourceStatus?: string;
};

type BookCoverage = {
  rulebookId: number;
  rulebookAbbr: string;
  rulebookName: string;
  editionSlug: string;
  totalSpells: number;
  zhSummaries: number;
  enSummaries: number;
  missingZh: number;
  missingEn: number;
  missingBoth: number;
  missingZhSpells: Array<{ id: number; name: string }>;
  missingEnSpells: Array<{ id: number; name: string }>;
  missingBothSpells: Array<{ id: number; name: string }>;
  enSourceRows: number;
  enSourceRowsBookMismatch: number;
  enSourceRowsMissingDbSpell: number;
  enSourceBookMismatchSamples: SourceGap[];
  enSourceMissingDbSpellSamples: SourceGap[];
};

type SourceGap = {
  sourceToken: string;
  sourceName: string;
  sourceCategory: string;
  sourceRulebookAbbr: string | null;
  sourceRulebookName: string | null;
  imarvinId: number | null;
  name: string;
  shortDescription: string;
  reason:
    | "source-rulebook-not-mapped"
    | "spell-name-not-in-source-rulebook"
    | "spell-name-not-in-scoped-db";
  matchedOtherBooks: Array<{
    spellId: number;
    rulebookAbbr: string;
    rulebookName: string;
  }>;
};

type ZhSourceGap = {
  sourceKey?: string;
  file?: string;
  sourceKind?: string;
  enName?: string;
  zhName?: string;
  summaryText?: string;
  chmRulebookLabels?: string[];
};

type Options = {
  input: string;
  outDir: string;
  scope: string[] | null;
  sourceIndexDir: string;
  zhUnmatched: string;
  sampleLimit: number;
};

const DEFAULT_INPUT = path.join(
  localDataDir(),
  "short-desc-normalized",
  "summaries.generated.jsonl",
);
const DEFAULT_OUT_DIR = path.join(repoRoot(), "data-tools", "out", "short-desc-qa");
const DEFAULT_SOURCE_INDEX = path.join(
  localDataDir(),
  "imarvin",
  "short-desc",
  "source-index",
);
const DEFAULT_ZH_UNMATCHED = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "zh-parser",
  "summary",
  "unmatched.json",
);
const DEFAULT_SCOPE = [
  "core-35",
  "supplementals-35",
  "eberron-35",
  "forgotten-realms-35",
];

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools summaries:coverage-report [-- --scope core-35,supplementals-35]

Options:
  --input <path>          Normalized summary JSONL.
  --outDir <path>         Report output directory.
  --scope <slugs|all>     Comma-separated rules DB edition slugs. Default: 3.5 official scope.
  --sourceIndexDir <path> IMarvin source-index directory.
  --zhUnmatched <path>    Chinese summary extraction unmatched JSON.
  --sampleLimit <n>       Per-book sample list limit in markdown. Default: 20.
`);
  process.exit(1);
}

function parseArgs(argv: string[]): Options {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg?.startsWith("--")) usage();
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args.set(arg, next);
      index += 1;
    } else {
      args.set(arg, "true");
    }
  }

  const scopeRaw = args.get("--scope") ?? DEFAULT_SCOPE.join(",");
  const sampleLimit = Number(args.get("--sampleLimit") ?? "20");
  if (!Number.isInteger(sampleLimit) || sampleLimit < 0) usage();

  return {
    input: resolvePath(args.get("--input") ?? DEFAULT_INPUT),
    outDir: resolvePath(args.get("--outDir") ?? DEFAULT_OUT_DIR),
    scope:
      scopeRaw === "all"
        ? null
        : scopeRaw
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
    sourceIndexDir: resolvePath(args.get("--sourceIndexDir") ?? DEFAULT_SOURCE_INDEX),
    zhUnmatched: resolvePath(args.get("--zhUnmatched") ?? DEFAULT_ZH_UNMATCHED),
    sampleLimit,
  };
}

function resolvePath(value: string) {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
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

function readJsonl<T>(filePath: string): T[] {
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

function writeText(filePath: string, value: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function loadSpells(scope: string[] | null) {
  const db = new Database(rulesDbPath(), {
    readonly: true,
    fileMustExist: true,
  });
  try {
    const where = scope ? `WHERE ed.slug IN (${scope.map(() => "?").join(", ")})` : "";
    return db
      .prepare(
        `
          SELECT
            s.id AS id,
            s.name AS name,
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

function groupByBook(spells: SpellRow[]) {
  const byBook = new Map<string, SpellRow[]>();
  for (const spell of spells) {
    byBook.set(spell.rulebookAbbr, [...(byBook.get(spell.rulebookAbbr) ?? []), spell]);
  }
  return byBook;
}

function summaryLangSets(rows: SummaryRow[]) {
  const sets = {
    en: new Set<number>(),
    zh: new Set<number>(),
  };
  for (const row of rows) {
    if (typeof row.spellId !== "number" || !row.summaryText?.trim()) continue;
    if (row.lang === "en") sets.en.add(row.spellId);
    if (row.lang === "zh") sets.zh.add(row.spellId);
  }
  return sets;
}

function sourceLabel(source: SourceEntry) {
  return source.token ?? source.abbr ?? source.name ?? "(unknown)";
}

function sourceName(source: SourceEntry) {
  return source.name ?? source.abbr ?? source.token ?? "(unknown)";
}

function loadEnglishSourceGaps(
  options: Options,
  byBook: Map<string, SpellRow[]>,
  allSpells: SpellRow[],
  scopedBookAbbrs: Set<string>,
) {
  const manifestPath = path.join(options.sourceIndexDir, "manifest.json");
  const manifest = readJsonIfExists<SourceManifest>(manifestPath, {});
  const byRulebook = new Map<string, SourceGap[]>();
  const bookMismatchByRulebook = new Map<string, SourceGap[]>();
  const all: SourceGap[] = [];
  const bookMismatches: SourceGap[] = [];
  const sourceRowsByRulebook = new Map<string, number>();

  for (const source of manifest.sources ?? []) {
    if (!source.file) continue;
    if (source.rulebookAbbr && !scopedBookAbbrs.has(source.rulebookAbbr)) continue;

    const filePath = path.join(options.sourceIndexDir, source.file);
    if (!fs.existsSync(filePath)) continue;

    const book = readJson<SourceBook>(filePath);
    const rows = (book.rows ?? []).filter((row) => row.shortDescription?.trim());
    if (source.rulebookAbbr) {
      sourceRowsByRulebook.set(
        source.rulebookAbbr,
        (sourceRowsByRulebook.get(source.rulebookAbbr) ?? 0) + rows.length,
      );
    }

    const dbSpells = source.rulebookAbbr ? byBook.get(source.rulebookAbbr) ?? [] : [];
    for (const row of rows) {
      const shortDescription = row.shortDescription?.trim();
      if (!row.name?.trim() || !shortDescription) continue;
      const sourceBookMatches = source.rulebookAbbr ? chooseExact(dbSpells, row.name) : [];
      if (sourceBookMatches.length > 0) continue;

      const scopedMatches = chooseExact(allSpells, row.name);
      const matchedOtherBooks = scopedMatches
        .filter((spell) => spell.rulebookAbbr !== source.rulebookAbbr)
        .map((spell) => ({
          spellId: spell.id,
          rulebookAbbr: spell.rulebookAbbr,
          rulebookName: spell.rulebookName,
        }));

      const gap: SourceGap = {
        sourceToken: sourceLabel(source),
        sourceName: sourceName(source),
        sourceCategory: source.category ?? "(unknown)",
        sourceRulebookAbbr: source.rulebookAbbr ?? null,
        sourceRulebookName: source.rulebookName ?? null,
        imarvinId: typeof row.id === "number" ? row.id : null,
        name: row.name,
        shortDescription,
        reason:
          scopedMatches.length === 0
            ? "spell-name-not-in-scoped-db"
            : source.rulebookAbbr
              ? "spell-name-not-in-source-rulebook"
              : "source-rulebook-not-mapped",
        matchedOtherBooks,
      };
      if (scopedMatches.length === 0) all.push(gap);
      else bookMismatches.push(gap);
      if (source.rulebookAbbr && scopedMatches.length === 0) {
        byRulebook.set(source.rulebookAbbr, [
          ...(byRulebook.get(source.rulebookAbbr) ?? []),
          gap,
        ]);
      }
      if (source.rulebookAbbr && scopedMatches.length > 0) {
        bookMismatchByRulebook.set(source.rulebookAbbr, [
          ...(bookMismatchByRulebook.get(source.rulebookAbbr) ?? []),
          gap,
        ]);
      }
    }
  }

  return { all, byRulebook, bookMismatches, bookMismatchByRulebook, sourceRowsByRulebook };
}

function spellStub(spell: SpellRow) {
  return { id: spell.id, name: spell.name };
}

function buildCoverage(options: Options) {
  const spells = loadSpells(options.scope);
  const byBook = groupByBook(spells);
  const scopedBookAbbrs = new Set(byBook.keys());
  const normalizedRows = readJsonl<SummaryRow>(options.input);
  const langSets = summaryLangSets(normalizedRows);
  const enGaps = loadEnglishSourceGaps(options, byBook, spells, scopedBookAbbrs);
  const zhSourceGaps = readJsonIfExists<ZhSourceGap[]>(options.zhUnmatched, []);

  const books: BookCoverage[] = [];
  for (const [rulebookAbbr, bookSpells] of byBook) {
    const first = bookSpells[0];
    if (!first) continue;
    const missingZhSpells = bookSpells.filter((spell) => !langSets.zh.has(spell.id));
    const missingEnSpells = bookSpells.filter((spell) => !langSets.en.has(spell.id));
    const missingBothSpells = bookSpells.filter(
      (spell) => !langSets.zh.has(spell.id) && !langSets.en.has(spell.id),
    );
    books.push({
      rulebookId: first.rulebookId,
      rulebookAbbr,
      rulebookName: first.rulebookName,
      editionSlug: first.editionSlug,
      totalSpells: bookSpells.length,
      zhSummaries: bookSpells.length - missingZhSpells.length,
      enSummaries: bookSpells.length - missingEnSpells.length,
      missingZh: missingZhSpells.length,
      missingEn: missingEnSpells.length,
      missingBoth: missingBothSpells.length,
      missingZhSpells: missingZhSpells.map(spellStub),
      missingEnSpells: missingEnSpells.map(spellStub),
      missingBothSpells: missingBothSpells.map(spellStub),
      enSourceRows: enGaps.sourceRowsByRulebook.get(rulebookAbbr) ?? 0,
      enSourceRowsBookMismatch:
        enGaps.bookMismatchByRulebook.get(rulebookAbbr)?.length ?? 0,
      enSourceRowsMissingDbSpell: enGaps.byRulebook.get(rulebookAbbr)?.length ?? 0,
      enSourceBookMismatchSamples: (
        enGaps.bookMismatchByRulebook.get(rulebookAbbr) ?? []
      ).slice(0, options.sampleLimit),
      enSourceMissingDbSpellSamples: (
        enGaps.byRulebook.get(rulebookAbbr) ?? []
      ).slice(0, options.sampleLimit),
    });
  }

  books.sort(
    (a, b) =>
      a.editionSlug.localeCompare(b.editionSlug) ||
      a.rulebookAbbr.localeCompare(b.rulebookAbbr),
  );

  const byEdition: Record<
    string,
    {
      books: number;
      totalSpells: number;
      missingZh: number;
      missingEn: number;
      missingBoth: number;
      enSourceRowsMissingDbSpell: number;
      enSourceRowsBookMismatch: number;
    }
  > = {};
  for (const book of books) {
    const current =
      byEdition[book.editionSlug] ??
      (byEdition[book.editionSlug] = {
        books: 0,
        totalSpells: 0,
        missingZh: 0,
        missingEn: 0,
        missingBoth: 0,
        enSourceRowsMissingDbSpell: 0,
        enSourceRowsBookMismatch: 0,
      });
    current.books += 1;
    current.totalSpells += book.totalSpells;
    current.missingZh += book.missingZh;
    current.missingEn += book.missingEn;
    current.missingBoth += book.missingBoth;
    current.enSourceRowsMissingDbSpell += book.enSourceRowsMissingDbSpell;
    current.enSourceRowsBookMismatch += book.enSourceRowsBookMismatch;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    scope: options.scope ?? "all",
    books: books.length,
    totalSpells: spells.length,
    normalizedRows: normalizedRows.length,
    zhSummaries: langSets.zh.size,
    enSummaries: langSets.en.size,
    missingZh: books.reduce((total, book) => total + book.missingZh, 0),
    missingEn: books.reduce((total, book) => total + book.missingEn, 0),
    missingBoth: books.reduce((total, book) => total + book.missingBoth, 0),
    enSourceRowsMissingDbSpell: enGaps.all.length,
    enSourceRowsBookMismatch: enGaps.bookMismatches.length,
    zhSourceRowsMissingDbSpell: zhSourceGaps.length,
  };

  return {
    summary,
    byEdition,
    books,
    sourceGaps: {
      en: enGaps.all,
      enBookMismatches: enGaps.bookMismatches,
      zh: zhSourceGaps,
    },
  };
}

function pct(part: number, total: number) {
  if (total === 0) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function tableRow(values: Array<string | number>) {
  return `| ${values.map((value) => String(value)).join(" | ")} |`;
}

function renderList(items: Array<{ id: number; name: string }>, limit: number) {
  if (items.length === 0) return "_none_";
  const shown = items.slice(0, limit).map((item) => `${item.name} (#${item.id})`);
  const suffix = items.length > limit ? `, ... +${items.length - limit}` : "";
  return `${shown.join(", ")}${suffix}`;
}

function renderMarkdown(report: ReturnType<typeof buildCoverage>, sampleLimit: number) {
  const lines: string[] = [];
  lines.push("# Short Description Book Coverage Report");
  lines.push("");
  lines.push(`Generated: ${report.summary.generatedAt}`);
  lines.push(`Scope: ${Array.isArray(report.summary.scope) ? report.summary.scope.join(", ") : "all"}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(
    tableRow([
      "books",
      "spells",
      "zh missing",
      "en missing",
      "both missing",
      "en source no DB",
      "en source book mismatch",
      "zh source no DB",
    ]),
  );
  lines.push(tableRow(["---:", "---:", "---:", "---:", "---:", "---:", "---:", "---:"]));
  lines.push(
    tableRow([
      report.summary.books,
      report.summary.totalSpells,
      report.summary.missingZh,
      report.summary.missingEn,
      report.summary.missingBoth,
      report.summary.enSourceRowsMissingDbSpell,
      report.summary.enSourceRowsBookMismatch,
      report.summary.zhSourceRowsMissingDbSpell,
    ]),
  );
  lines.push("");
  lines.push("## By Edition");
  lines.push("");
  lines.push(
    tableRow([
      "edition",
      "books",
      "spells",
      "zh missing",
      "en missing",
      "both missing",
      "en source no DB",
      "en source book mismatch",
    ]),
  );
  lines.push(tableRow(["---", "---:", "---:", "---:", "---:", "---:", "---:", "---:"]));
  for (const [edition, row] of Object.entries(report.byEdition).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    lines.push(
      tableRow([
        edition,
        row.books,
        row.totalSpells,
        row.missingZh,
        row.missingEn,
        row.missingBoth,
        row.enSourceRowsMissingDbSpell,
        row.enSourceRowsBookMismatch,
      ]),
    );
  }
  lines.push("");
  lines.push("## By Book");
  lines.push("");
  lines.push(
    tableRow([
      "edition",
      "book",
      "spells",
      "zh",
      "en",
      "missing zh",
      "missing en",
      "missing both",
      "en source no DB",
      "en source book mismatch",
    ]),
  );
  lines.push(tableRow(["---", "---", "---:", "---:", "---:", "---:", "---:", "---:", "---:", "---:"]));
  for (const book of report.books) {
    lines.push(
      tableRow([
        book.editionSlug,
        `${book.rulebookAbbr} - ${book.rulebookName}`,
        book.totalSpells,
        `${book.zhSummaries} (${pct(book.zhSummaries, book.totalSpells)})`,
        `${book.enSummaries} (${pct(book.enSummaries, book.totalSpells)})`,
        book.missingZh,
        book.missingEn,
        book.missingBoth,
        book.enSourceRowsMissingDbSpell,
        book.enSourceRowsBookMismatch,
      ]),
    );
  }
  lines.push("");
  lines.push("## Missing Details");
  for (const book of report.books.filter(
    (item) =>
      item.missingZh > 0 ||
      item.missingEn > 0 ||
      item.missingBoth > 0 ||
      item.enSourceRowsMissingDbSpell > 0 ||
      item.enSourceRowsBookMismatch > 0,
  )) {
    lines.push("");
    lines.push(`### ${book.rulebookAbbr} - ${book.rulebookName}`);
    lines.push("");
    lines.push(`Edition: ${book.editionSlug}`);
    lines.push("");
    lines.push(`Missing zh: ${renderList(book.missingZhSpells, sampleLimit)}`);
    lines.push("");
    lines.push(`Missing en: ${renderList(book.missingEnSpells, sampleLimit)}`);
    lines.push("");
    lines.push(`Missing both: ${renderList(book.missingBothSpells, sampleLimit)}`);
    if (book.enSourceRowsMissingDbSpell > 0) {
      lines.push("");
      lines.push("English source rows with desc but no spell in scoped DB:");
      for (const gap of book.enSourceMissingDbSpellSamples) {
        lines.push(
          `- ${gap.name}${gap.imarvinId ? ` (#${gap.imarvinId})` : ""}: ${gap.shortDescription}`,
        );
      }
      const remaining = book.enSourceRowsMissingDbSpell - book.enSourceMissingDbSpellSamples.length;
      if (remaining > 0) lines.push(`- ... +${remaining}`);
    }
    if (book.enSourceRowsBookMismatch > 0) {
      lines.push("");
      lines.push("English source rows matched only in another scoped DB book:");
      for (const gap of book.enSourceBookMismatchSamples) {
        const matches = gap.matchedOtherBooks
          .map((match) => `${match.rulebookAbbr} #${match.spellId}`)
          .join(", ");
        lines.push(
          `- ${gap.name}${gap.imarvinId ? ` (#${gap.imarvinId})` : ""}: ${matches}`,
        );
      }
      const remaining = book.enSourceRowsBookMismatch - book.enSourceBookMismatchSamples.length;
      if (remaining > 0) lines.push(`- ... +${remaining}`);
    }
  }
  if (report.sourceGaps.zh.length > 0) {
    lines.push("");
    lines.push("## Chinese Source Rows With Desc But No DB Spell");
    for (const gap of report.sourceGaps.zh.slice(0, sampleLimit)) {
      lines.push(
        `- ${gap.enName ?? "(unknown)"} / ${gap.zhName ?? "(unknown)"}: ${gap.summaryText ?? ""}`,
      );
    }
    const remaining = report.sourceGaps.zh.length - sampleLimit;
    if (remaining > 0) lines.push(`- ... +${remaining}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildCoverage(options);
  const jsonPath = path.join(options.outDir, "book-coverage-report.json");
  const mdPath = path.join(options.outDir, "book-coverage-report.md");
  writeJson(jsonPath, report);
  writeText(mdPath, renderMarkdown(report, options.sampleLimit));
  console.log("short-desc book coverage report done");
  console.log({
    summary: report.summary,
    jsonPath,
    mdPath,
  });
}

main();
