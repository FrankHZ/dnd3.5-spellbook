import fs from "node:fs";
import path from "node:path";
import { load } from "cheerio";

import { BOOK_LABEL_TO_ABBR } from "../mapping";
import { relFile, scanHtmlFiles } from "../scan";
import { segmentLetterPage } from "../segment";

type Severity = "error" | "warning" | "info";

type QaIssue = {
  severity: Severity;
  code: string;
  file: string;
  detail: string;
  sourceKey?: string;
  headerText?: string;
  zhName?: string;
  enName?: string;
};

type QaSummary = {
  inputDir: string;
  parserOutDir: string;
  filesScanned: number;
  segmentsFound: number;
  issueCount: number;
  bySeverity: Record<Severity, number>;
  byCode: Record<string, number>;
  parserStats?: {
    matched?: number;
    unmatched?: number;
    unknownBookLabel?: number;
    missingRulebookInDb?: number;
    missingSpellInDb?: number;
    lowConfidence?: number;
    errors?: number;
  };
  descriptionLength?: {
    empty: number;
    atMost20: number;
    atMost120: number;
  };
  boldText?: {
    maxAllowedLength: number;
    overLimit: number;
  };
  missingZhByRulebook?: Record<string, number>;
};

const DEFAULT_INPUT = "../data/chm-clean";
const DEFAULT_RAW_INPUT = "../data/chm-raw";
const DEFAULT_OUT = "out/zh-parser/qa";
const DEFAULT_PARSER_OUT = "out/zh-parser";
const DEFAULT_BOOK_ABBR = "PH";
const DEFAULT_MAX_BOLD_TEXT_LENGTH = 24;
const MOJIBAKE_RE = /\uFFFD|锟斤拷/;
const BODY_NOTE_RE = /译注|原文[:：]|备注|注[:：]/;

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      args.set(
        a,
        argv[i + 1] && !argv[i + 1]!.startsWith("--") ? argv[i + 1]! : "true",
      );
    }
  }
  return args;
}

function encodeKeyPart(s: string): string {
  return encodeURIComponent(s.toLowerCase()).replace(/%20/g, "+");
}

function inferBookLabelsFromPath(file: string): string[] {
  const [topLevelDir] = file.split("/");
  if (topLevelDir && BOOK_LABEL_TO_ABBR[topLevelDir]) return [topLevelDir];
  return [];
}

function sourceKeyFor(file: string, enName: string, bookLabels: string[]) {
  const abbrs = bookLabels
    .map((label) => BOOK_LABEL_TO_ABBR[label])
    .filter((abbr): abbr is string => Boolean(abbr));
  const suffix = abbrs.length > 0 ? abbrs.join(",") : DEFAULT_BOOK_ABBR;
  return `${file}#${encodeKeyPart(enName)}@${suffix}`;
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

function recordFields(record: {
  sourceKey?: unknown;
  zhName?: unknown;
  enName?: unknown;
}) {
  return {
    ...(typeof record.sourceKey === "string"
      ? { sourceKey: record.sourceKey }
      : {}),
    ...(typeof record.zhName === "string" ? { zhName: record.zhName } : {}),
    ...(typeof record.enName === "string" ? { enName: record.enName } : {}),
  };
}

function htmlText(html: string) {
  return load(html).text().replace(/\s+/g, " ").trim();
}

function normalizedInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function excerpt(value: string, maxLength = 80) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function sortedRelativeHtmlFiles(rootDir: string) {
  if (!fs.existsSync(rootDir)) return [];
  return scanHtmlFiles(rootDir).map((abs) => relFile(rootDir, abs)).sort();
}

function readJsonIfExists(file: string): unknown | null {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as unknown;
}

function qaFileSet(inputDir: string, rawInputDir: string, issues: QaIssue[]) {
  const cleanFiles = sortedRelativeHtmlFiles(inputDir);
  const rawFiles = sortedRelativeHtmlFiles(rawInputDir);
  if (rawFiles.length === 0) return;

  const clean = new Set(cleanFiles);
  const raw = new Set(rawFiles);
  const missingClean = rawFiles.filter((file) => !clean.has(file));
  const missingRaw = cleanFiles.filter((file) => !raw.has(file));

  if (missingClean.length > 0) {
    issue(issues, "warning", "raw-clean-file-missing-clean", {
      file: rawInputDir,
      detail: `raw HTML files missing from clean input: ${missingClean.join(", ")}`,
    });
  }
  if (missingRaw.length > 0) {
    issue(issues, "warning", "raw-clean-file-missing-raw", {
      file: inputDir,
      detail: `clean HTML files missing from raw input: ${missingRaw.join(", ")}`,
    });
  }
}

function qaParserOutput(parserOutDir: string, issues: QaIssue[]) {
  const stats = readJsonIfExists(path.join(parserOutDir, "stats.json")) as
    | QaSummary["parserStats"]
    | null;
  if (stats) {
    const hardMissFields = [
      "unmatched",
      "unknownBookLabel",
      "missingRulebookInDb",
      "missingSpellInDb",
      "lowConfidence",
      "errors",
    ] as const;
    for (const field of hardMissFields) {
      const value = stats[field] ?? 0;
      if (value > 0) {
        issue(issues, "error", `parser-${field}`, {
          file: "data-tools/out/zh-parser/stats.json",
          detail: `parser stats ${field} is ${value}`,
        });
      }
    }
  }

  const unmatched = readJsonIfExists(path.join(parserOutDir, "unmatched.json"));
  if (Array.isArray(unmatched) && unmatched.length > 0) {
    issue(issues, "error", "parser-unmatched-records", {
      file: "data-tools/out/zh-parser/unmatched.json",
      detail: `unmatched parser output contains ${unmatched.length} records`,
    });
  }

  const candidates = readJsonIfExists(path.join(parserOutDir, "candidates.json"));
  if (
    candidates &&
    typeof candidates === "object" &&
    !Array.isArray(candidates) &&
    Object.keys(candidates).length > 0
  ) {
    issue(issues, "warning", "parser-candidates-present", {
      file: "data-tools/out/zh-parser/candidates.json",
      detail: `candidate alias/mapping output has ${Object.keys(candidates).length} entries`,
    });
  }

  const missingZh = readJsonIfExists(path.join(parserOutDir, "missing-zh.json"));
  const missingZhByRulebook: Record<string, number> = {};
  if (Array.isArray(missingZh)) {
    for (const item of missingZh) {
      if (!item || typeof item !== "object") continue;
      const rulebookAbbr = (item as { rulebookAbbr?: unknown }).rulebookAbbr;
      const key = typeof rulebookAbbr === "string" ? rulebookAbbr : "(unknown)";
      bump(missingZhByRulebook, key);
    }
  } else if (
    missingZh &&
    typeof missingZh === "object" &&
    !Array.isArray(missingZh)
  ) {
    const grouped = (missingZh as { grouped?: unknown }).grouped;
    if (grouped && typeof grouped === "object" && !Array.isArray(grouped)) {
      for (const group of Object.values(grouped)) {
        if (!group || typeof group !== "object") continue;
        const typed = group as {
          rulebookAbbr?: unknown;
          missingSpells?: unknown;
        };
        const key =
          typeof typed.rulebookAbbr === "string"
            ? typed.rulebookAbbr
            : "(unknown)";
        const count = Array.isArray(typed.missingSpells)
          ? typed.missingSpells.length
          : 0;
        if (count > 0) missingZhByRulebook[key] = count;
      }
    }
  }

  const matched = readJsonIfExists(path.join(parserOutDir, "matched.json"));
  if (Array.isArray(matched)) {
    for (const item of matched) {
      if (!item || typeof item !== "object") continue;
      const record = item as {
        file?: unknown;
        sourceKey?: unknown;
        zhName?: unknown;
        enName?: unknown;
        zhDescriptionHtml?: unknown;
      };
      const description =
        typeof record.zhDescriptionHtml === "string"
          ? record.zhDescriptionHtml
          : "";
      if (MOJIBAKE_RE.test(description)) {
        issue(issues, "error", "mojibake-in-matched-output", {
          file: typeof record.file === "string" ? record.file : "matched.json",
          ...recordFields(record),
          detail: "matched output contains replacement/mojibake marker",
        });
      }
    }
  }

  return { parserStats: stats ?? undefined, missingZhByRulebook };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = path.resolve(args.get("--input") ?? DEFAULT_INPUT);
  const rawInputDir = path.resolve(args.get("--rawInput") ?? DEFAULT_RAW_INPUT);
  const outDir = path.resolve(args.get("--outDir") ?? DEFAULT_OUT);
  const parserOutDir = path.resolve(
    args.get("--parserOutDir") ?? DEFAULT_PARSER_OUT,
  );
  const maxBoldTextLength = Math.max(
    1,
    Number(args.get("--maxBoldTextLength") ?? DEFAULT_MAX_BOLD_TEXT_LENGTH) ||
      DEFAULT_MAX_BOLD_TEXT_LENGTH,
  );

  const files = scanHtmlFiles(inputDir);
  const issues: QaIssue[] = [];
  const sourceKeys = new Map<string, Array<{ file: string; headerText: string }>>();
  let segmentsFound = 0;
  const descriptionLength = { empty: 0, atMost20: 0, atMost120: 0 };
  const boldText = { maxAllowedLength: maxBoldTextLength, overLimit: 0 };

  qaFileSet(inputDir, rawInputDir, issues);
  for (const abs of files) {
    const file = relFile(inputDir, abs);
    const html = fs.readFileSync(abs, "utf-8");
    const segments = segmentLetterPage(html);
    segmentsFound += segments.length;

    if (MOJIBAKE_RE.test(html)) {
      issue(issues, "error", "replacement-character", {
        file,
        detail: "file contains replacement/mojibake marker",
      });
    }

    for (const seg of segments) {
      const bookLabels =
        seg.bookLabels.length > 0 ? seg.bookLabels : inferBookLabelsFromPath(file);
      const sourceKey = sourceKeyFor(file, seg.enName, bookLabels);
      const existing = sourceKeys.get(sourceKey) ?? [];
      existing.push({ file, headerText: seg.headerText });
      sourceKeys.set(sourceKey, existing);

      const segmentText = htmlText(seg.segmentHtml);
      if (!segmentText) {
        descriptionLength.empty++;
        issue(issues, "error", "empty-description", {
          file,
          sourceKey,
          headerText: seg.headerText,
          zhName: seg.zhName,
          enName: seg.enName,
          detail: "spell segment has no description text",
        });
      }
      if (segmentText.length > 0 && segmentText.length <= 20) {
        descriptionLength.atMost20++;
        issue(issues, "info", "very-short-description", {
          file,
          sourceKey,
          headerText: seg.headerText,
          zhName: seg.zhName,
          enName: seg.enName,
          detail: `description text length is ${segmentText.length}`,
        });
      }
      if (segmentText.length > 0 && segmentText.length <= 120) {
        descriptionLength.atMost120++;
      }

      if (BODY_NOTE_RE.test(segmentText)) {
        issue(issues, "info", "body-note-marker", {
          file,
          sourceKey,
          headerText: seg.headerText,
          zhName: seg.zhName,
          enName: seg.enName,
          detail: "description body contains note/source marker text",
        });
      }

      const $segment = load(seg.segmentHtml);
      $segment("b,strong").each((_, el) => {
        const text = normalizedInlineText($segment(el).text());
        if (text.length <= maxBoldTextLength) return;
        boldText.overLimit++;
        issue(issues, "info", "long-bold-text", {
          file,
          sourceKey,
          headerText: seg.headerText,
          zhName: seg.zhName,
          enName: seg.enName,
          detail: `bold text length ${text.length} exceeds ${maxBoldTextLength}: ${excerpt(text)}`,
        });
      });

      if (/原文[:：]|列表[:：]|两者|二者|区别|不同/.test(seg.headerText)) {
        issue(issues, "warning", "source-note-in-header", {
          file,
          sourceKey,
          headerText: seg.headerText,
          zhName: seg.zhName,
          enName: seg.enName,
          detail: "header still contains source-note wording",
        });
      }

      if (/^原文[:：]/.test(seg.enName)) {
        issue(issues, "warning", "source-note-in-english-name", {
          file,
          sourceKey,
          headerText: seg.headerText,
          zhName: seg.zhName,
          enName: seg.enName,
          detail: "English name starts with source-note prefix",
        });
      }

      for (const label of seg.bookLabels) {
        if (!BOOK_LABEL_TO_ABBR[label]) {
          issue(issues, "warning", "unknown-book-label", {
            file,
            sourceKey,
            headerText: seg.headerText,
            zhName: seg.zhName,
            enName: seg.enName,
            detail: `book label is not mapped: ${label}`,
          });
        }
        if (/[,，、]/.test(label)) {
          issue(issues, "warning", "combined-book-label", {
            file,
            sourceKey,
            headerText: seg.headerText,
            zhName: seg.zhName,
            enName: seg.enName,
            detail: `book label appears to contain multiple labels: ${label}`,
          });
        }
        if (/两者|二者|区别|不同|列表[:：]|原文[:：]/.test(label)) {
          issue(issues, "warning", "note-like-book-label", {
            file,
            sourceKey,
            headerText: seg.headerText,
            zhName: seg.zhName,
            enName: seg.enName,
            detail: `book label appears to be note text: ${label}`,
          });
        }
      }
    }
  }

  for (const [sourceKey, seen] of sourceKeys) {
    if (seen.length <= 1) continue;
    issue(issues, "warning", "duplicate-source-key", {
      file: seen.map((item) => item.file).join(", "),
      sourceKey,
      headerText: seen.map((item) => item.headerText).join(" | "),
      detail: `source key is produced ${seen.length} times`,
    });
  }

  const { parserStats, missingZhByRulebook } = qaParserOutput(
    parserOutDir,
    issues,
  );
  const bySeverity: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  const byCode: Record<string, number> = {};
  for (const item of issues) {
    bySeverity[item.severity]++;
    bump(byCode, item.code);
  }

  const summary: QaSummary = {
    inputDir,
    parserOutDir,
    filesScanned: files.length,
    segmentsFound,
    issueCount: issues.length,
    bySeverity,
    byCode,
    descriptionLength,
    boldText,
    missingZhByRulebook,
    ...(parserStats ? { parserStats } : {}),
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(outDir, "issues.json"),
    `${JSON.stringify(issues, null, 2)}\n`,
  );

  console.log("zh-qa done");
  console.log(summary);

  if (bySeverity.error > 0) {
    process.exitCode = 1;
  }
}

main();
