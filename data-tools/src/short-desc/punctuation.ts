import fs from "node:fs";
import path from "node:path";

import { localDataDir, repoRoot } from "../shared/env";

type Lang = "en" | "zh";

type SummaryRow = {
  stableKey?: string;
  spellId?: number;
  rulebookAbbr?: string;
  lang?: Lang;
  summaryText?: string;
};

type PunctuationFix = {
  queue: "summary-punctuation";
  stableKey: string;
  spellId: number | null;
  rulebookAbbr: string | null;
  lang: Lang;
  before: string;
  after: string;
  action: "append-period" | "append-full-stop";
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

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools summaries:punctuation
  npm run -w data-tools summaries:punctuation -- --write

Options:
  --input <path>   Normalized summary JSONL. Default: data/short-desc-normalized/summaries.generated.jsonl
  --outDir <path>  QA output directory. Default: data-tools/out/short-desc-qa
  --write          Rewrite the input JSONL with deterministic punctuation fixes.
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

  const inputRaw = args.get("--input") ?? DEFAULT_INPUT;
  const outDirRaw = args.get("--outDir") ?? DEFAULT_OUT_DIR;
  return {
    input: path.isAbsolute(inputRaw)
      ? inputRaw
      : path.resolve(process.cwd(), inputRaw),
    outDir: path.isAbsolute(outDirRaw)
      ? outDirRaw
      : path.resolve(process.cwd(), outDirRaw),
    write: args.get("--write") === "true",
  };
}

function readJsonl<T>(filePath: string) {
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

function hasTerminalPunctuation(text: string) {
  return /[.!?。！？][）)\]】」』”’"']*$/.test(text.trim());
}

function fixSummaryText(text: string, lang: Lang) {
  const trimmed = text.trim();
  if (!trimmed || hasTerminalPunctuation(trimmed)) return trimmed;

  if (lang === "zh") {
    return trimmed.replace(/[，,；;、]+$/u, "") + "。";
  }
  return trimmed.replace(/[,;:]+$/u, "") + ".";
}

function makeFix(row: SummaryRow, after: string): PunctuationFix {
  const lang = row.lang === "zh" ? "zh" : "en";
  return {
    queue: "summary-punctuation",
    stableKey: row.stableKey ?? `${row.spellId ?? "unknown"}:${lang}`,
    spellId: typeof row.spellId === "number" ? row.spellId : null,
    rulebookAbbr: row.rulebookAbbr ?? null,
    lang,
    before: row.summaryText ?? "",
    after,
    action: lang === "zh" ? "append-full-stop" : "append-period",
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rows = readJsonl<SummaryRow>(options.input);
  const fixes: PunctuationFix[] = [];
  const fixedRows = rows.map((row) => {
    if ((row.lang !== "en" && row.lang !== "zh") || !row.summaryText) {
      return row;
    }

    const fixed = fixSummaryText(row.summaryText, row.lang);
    if (fixed === row.summaryText.trim()) return row;

    fixes.push(makeFix(row, fixed));
    return { ...row, summaryText: fixed };
  });

  if (options.write && fixes.length > 0) {
    writeJsonl(options.input, fixedRows);
  }

  const byLang = fixes.reduce(
    (counts, fix) => {
      counts[fix.lang] += 1;
      return counts;
    },
    { en: 0, zh: 0 },
  );

  const queuePath = path.join(
    options.outDir,
    "review-queues",
    "summary-punctuation.jsonl",
  );
  writeJsonl(queuePath, fixes);
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: options.write ? "write" : "dry-run",
    input: options.input,
    totalRows: rows.length,
    fixes: fixes.length,
    byLang,
    queue: queuePath,
  };
  writeJson(path.join(options.outDir, "punctuation-summary.json"), summary);

  console.log("short-desc punctuation QA done");
  console.log(summary);
}

main();
