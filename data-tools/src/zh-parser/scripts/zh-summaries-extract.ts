import fs from "node:fs";
import path from "node:path";
import iconv from "iconv-lite";
import * as cheerio from "cheerio";

import { localDataDir } from "../../shared/env";
import {
  type AliasCategory,
  type AliasStep,
  matchByEnNameAllBooks,
} from "../match";
import { BOOK_LABEL_TO_ABBR, normalizeBookLabel } from "../mapping";

type SourceKind = "class-list" | "domain-list" | "maneuver-list";
type SummaryKind = "spell" | "maneuver";

type SummaryCandidate = {
  sourceKey: string;
  file: string;
  kind: SummaryKind;
  sourceKind: SourceKind;
  listOwner: string;
  spellLevel: number | null;
  schoolGroup: string | null;
  discipline: string | null;
  sourceLabelHints: string[];
  sourceProvenance:
    | "zh-chm-class-list"
    | "zh-chm-domain-list"
    | "zh-chm-maneuver-list";
  zhName: string;
  enName: string;
  rawEnName: string;
  componentMarkers: string[];
  summaryText: string;
  matchMethod: string;
};

type MatchedSummary = SummaryCandidate & {
  spellId: number | null;
  rulebookId: number | null;
  rulebookAbbr: string | null;
  chmRulebookLabels: string[];
  finalMatchMethod: string;
  resolvedEnName: string | null;
  aliasChain: AliasStep[];
  aliasCategories: AliasCategory[];
  aliasReview: "none" | "low" | "required";
};

type DuplicateGroup = {
  targetKey: string;
  spellId: number | null;
  enName: string;
  summaries: Array<{
    summaryText: string;
    records: MatchedSummary[];
  }>;
};

type ConflictGroup = DuplicateGroup & {
  normalizedSummaries: Array<{
    normalizedSummaryText: string;
    summaries: DuplicateGroup["summaries"];
  }>;
};

type AliasAuditEntry = {
  enName: string;
  records: number;
  spellIds: number[];
  rulebookAbbrs: string[];
  aliasReview: "low" | "required";
  aliasCategories: AliasCategory[];
  resolutions: Array<{
    resolvedEnName: string;
    records: number;
    spellIds: number[];
    rulebookAbbrs: string[];
    aliasReview: "low" | "required";
    aliasCategories: AliasCategory[];
    aliasChain: AliasStep[];
    sourceKeys: string[];
  }>;
};

type ExtractReport = {
  generatedAt: string;
  options: {
    classListInput: string;
    domainListInput: string;
    maneuverListInput: string;
    outDir: string;
  };
  stats: {
    filesScanned: number;
    candidates: number;
    matched: number;
    unmatched: number;
    duplicates: number;
    conflictingDuplicates: number;
    normalizedConflictingDuplicates: number;
    aliasAssistedMatches: number;
    aliasReviewRequiredMatches: number;
    aliasAuditEntries: number;
    bySourceKind: Record<string, number>;
    byMatchMethod: Record<string, number>;
  };
};

const DEFAULT_CLASS_INPUT = path.join(
  localDataDir(),
  "chm-raw-full",
  "职业法术列表",
);
const DEFAULT_DOMAIN_INPUT = path.join(
  localDataDir(),
  "chm-raw-full",
  "领域法术",
);
const DEFAULT_MANEUVER_INPUT = path.join(
  localDataDir(),
  "chm-clean",
  "九剑",
  "招数列表.htm",
);
const DEFAULT_OUT_DIR = path.join("out", "zh-parser", "summary");
const MANEUVER_BOOK_LABEL = "九剑";
const SOURCE_PREFIX_TO_BOOK_LABEL: Record<string, string> = {
  BoED: "好人书",
  CA: "完美奥术",
  CD: "完美神力",
  CW: "完美战士",
  Dra: "巨龙之书",
  FC1: "邪魔释典I",
  FC2: "邪魔释典II",
  Frost: "霜燃之书",
  LM: "死者之书",
  LoM: "异怪书",
  PHB2: "玩家手册2",
  RoD: "天命族裔",
  RoW: "荒野族裔",
  Sand: "沙暴之书",
};

const COMPONENT_MARKERS = new Set(["M", "F", "DF", "MF", "XP", "X"]);
const DISCIPLINES = new Set([
  "漠风",
  "虔心",
  "钢魂",
  "铁心",
  "暮日",
  "影手",
  "石龙",
  "虎爪",
  "白鸦",
]);

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg?.startsWith("--")) continue;
    const next = argv[index + 1];
    args.set(arg, next && !next.startsWith("--") ? next : "true");
  }

  return {
    classListInput: path.resolve(
      args.get("--classListInput") ?? DEFAULT_CLASS_INPUT,
    ),
    domainListInput: path.resolve(
      args.get("--domainListInput") ?? DEFAULT_DOMAIN_INPUT,
    ),
    maneuverListInput: path.resolve(
      args.get("--maneuverListInput") ?? DEFAULT_MANEUVER_INPUT,
    ),
    outDir: path.resolve(args.get("--outDir") ?? DEFAULT_OUT_DIR),
  };
}

function timestampKey() {
  return new Date().toISOString();
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePunctuation(value: string) {
  return normalizeWhitespace(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/：/g, ":")
    .replace(/，/g, ",");
}

function normalizeDigits(value: string) {
  return value
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xff10 + 0x30),
    )
    .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨ]/g, (char) => {
      const map: Record<string, string> = {
        "Ⅰ": "I",
        "Ⅱ": "II",
        "Ⅲ": "III",
        "Ⅳ": "IV",
        "Ⅴ": "V",
        "Ⅵ": "VI",
        "Ⅶ": "VII",
        "Ⅷ": "VIII",
        "Ⅸ": "IX",
      };
      return map[char] ?? char;
    });
}

function relFile(root: string, filePath: string) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function readGb2312(filePath: string) {
  return iconv.decode(fs.readFileSync(filePath), "gb2312");
}

function readUtf8(filePath: string) {
  return fs.readFileSync(filePath, "utf-8");
}

function scanHtmlFiles(inputDir: string) {
  const files: string[] = [];
  if (!fs.existsSync(inputDir)) return files;

  function visit(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.toLowerCase().endsWith(".files")) visit(fullPath);
        continue;
      }
      if (entry.isFile() && /\.html?$/i.test(entry.name)) files.push(fullPath);
    }
  }

  visit(inputDir);
  return files.sort((a, b) => a.localeCompare(b));
}

function textParagraphs(html: string) {
  const $ = cheerio.load(html);
  const paragraphs: string[] = [];
  const breakMarker = "\uE000";

  $("p").each((_, paragraph) => {
    const clone = $(paragraph).clone();
    clone.find("br").replaceWith(breakMarker);
    for (const line of clone
      .text()
      .split(breakMarker)
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean)) {
      paragraphs.push(line);
    }
  });

  return paragraphs;
}

function ownerFromFile(filePath: string) {
  return path.basename(filePath, path.extname(filePath));
}

function parseLevelHeading(text: string) {
  const normalized = normalizeDigits(text);
  const match = normalized.match(/(?:的)?(\d+)级(?:法术|神术)?/);
  return match?.[1] ? Number(match[1]) : null;
}

function parseManeuverLevel(text: string) {
  const normalized = normalizeDigits(text);
  const match = normalized.match(/^(\d+)级$/);
  return match?.[1] ? Number(match[1]) : null;
}

function parseSchoolHeading(text: string) {
  const match = text.match(/^([^（）()]{1,12}系)[（(][A-Za-z]+[）)]$/);
  return match?.[1] ? normalizeWhitespace(match[1]) : null;
}

function extractPrefixLabels(left: string) {
  const labels: string[] = [];
  let rest = left.trim();

  for (;;) {
    const match = rest.match(/^[（(]([^（）()]+)[）)]/);
    if (!match?.[1]) break;
    const label = normalizeBookLabel(match[1]);
    if (/[A-Za-z]/.test(label) && !BOOK_LABEL_TO_ABBR[label]) break;
    labels.push(label);
    rest = rest.slice(match[0].length).trim();
  }

  return { labels, rest };
}

function cleanEnName(rawEnName: string) {
  const tokens = normalizeDigits(normalizePunctuation(rawEnName))
    .replace(/[*＊]+$/g, "")
    .replace(/[,.，。;；]+$/g, "")
    .replace(/([a-z])([IVX]+)$/g, "$1 $2")
    .replace(/\s*,\s*/g, ", ")
    .split(/\s+/);
  const componentMarkers: string[] = [];

  while (tokens.length > 1) {
    const tail = tokens[tokens.length - 1]?.toUpperCase();
    if (!tail || !COMPONENT_MARKERS.has(tail)) break;
    componentMarkers.unshift(tokens.pop() as string);
  }

  let enName = tokens.join(" ").trim();
  enName = enName.replace(/^列表[:：]\s*/u, "").trim();
  for (;;) {
    const match = enName.match(/^(.+?)(DF|XP|M|F|X)$/);
    if (!match?.[1] || !match[2]) break;
    enName = match[1].trim();
    componentMarkers.unshift(match[2]);
  }

  return {
    enName,
    componentMarkers: componentMarkers.map((marker) =>
      marker === "X" ? "XP" : marker,
    ),
  };
}

function isComponentMarkerText(text: string) {
  return text
    .split(/[\s,，/]+/)
    .filter(Boolean)
    .every((item) => COMPONENT_MARKERS.has(item.toUpperCase()));
}

function cleanZhName(rawZhName: string) {
  return normalizeWhitespace(rawZhName)
    .replace(/^[、,，.．。\s]+/g, "")
    .replace(/[（(](?:M|F|DF|MF|XP|X)[）)]$/i, "")
    .trim();
}

function delimiterColonIndex(value: string) {
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "（" || char === "(") depth += 1;
    if (char === "）" || char === ")") depth = Math.max(0, depth - 1);
    if (char === ":" && depth === 0) return index;
  }
  return -1;
}

function splitSummaryFragments(text: string) {
  const normalized = normalizePunctuation(text);
  const fragments: string[] = [];
  const schoolPrefix = normalized.match(
    /^([^:]+?系[（(][A-Za-z]+[）)])\s+(.+)$/,
  );
  let rest = normalized;
  if (schoolPrefix?.[1] && schoolPrefix[2]) {
    fragments.push(schoolPrefix[1]);
    rest = schoolPrefix[2];
  }

  rest = rest.replace(
    /\s+(?=(?:[（(][^（）()]+[）)])*[^:（）()]{1,40}[（(][A-Za-z][^（）()]{1,80}[）)]\s*:)/g,
    "\n",
  );

  fragments.push(...rest.split("\n"));
  return fragments.map((fragment) => fragment.trim()).filter(Boolean);
}

function parseSummaryLine(
  text: string,
): null | {
  zhName: string;
  rawEnName: string;
  enName: string;
  componentMarkers: string[];
  sourceLabelHints: string[];
  summaryText: string;
  method: string;
} {
  const normalized = normalizePunctuation(text);
  const colonIndex = delimiterColonIndex(normalized);
  if (colonIndex < 0) return null;

  const left = normalized.slice(0, colonIndex).trim();
  const summaryText = normalized.slice(colonIndex + 1).trim();
  if (!left || !summaryText) return null;

  const parenMatches = [...left.matchAll(/[（(]([^（）()]+)[）)]/g)];
  const englishParen = [...parenMatches]
    .reverse()
    .find(
      (match) =>
        /[A-Za-z]/.test(match[1] ?? "") &&
        !isComponentMarkerText(match[1] ?? ""),
    );

  if (englishParen?.index !== undefined && englishParen[1]) {
    const rawZhPart = left.slice(0, englishParen.index).trim();
    const { labels, rest } = extractPrefixLabels(rawZhPart);
    const cleaned = cleanEnName(englishParen[1]);
    if (!rest || !cleaned.enName) return null;
    return {
      zhName: cleanZhName(rest),
      rawEnName: englishParen[1],
      enName: cleaned.enName,
      componentMarkers: cleaned.componentMarkers,
      sourceLabelHints: labels,
      summaryText,
      method: "summary:paren-en",
    };
  }

  const { labels, rest } = extractPrefixLabels(left);
  const bareMatch = rest.match(/^(.+?)[\s　]+([A-Za-z][A-Za-z0-9'’,./ -]+)$/);
  if (!bareMatch?.[1] || !bareMatch[2]) return null;

  const cleaned = cleanEnName(bareMatch[2]);
  return {
    zhName: cleanZhName(bareMatch[1]),
    rawEnName: bareMatch[2],
    enName: cleaned.enName,
    componentMarkers: cleaned.componentMarkers,
    sourceLabelHints: labels,
    summaryText,
    method: "summary:bare-en",
  };
}

function sourceKey(file: string, enName: string, index: number) {
  const encoded = encodeURIComponent(enName.toLowerCase()).replace(/%20/g, "+");
  return `${file}#${index}-${encoded}`;
}

function inferredBookLabelsFromFile(file: string) {
  const baseName = path.basename(file);
  const match = baseName.match(/^([A-Za-z0-9]+)(?:扩展|--)/);
  const label = match?.[1] ? SOURCE_PREFIX_TO_BOOK_LABEL[match[1]] : undefined;
  return label ? [label] : [];
}

function sourceLabelsForRecord(file: string, parsedLabels: string[]) {
  return uniqueStrings([...parsedLabels, ...inferredBookLabelsFromFile(file)]);
}

function extractClassListCandidates(inputDir: string) {
  const candidates: SummaryCandidate[] = [];
  const files = scanHtmlFiles(inputDir);

  for (const filePath of files) {
    const file = relFile(inputDir, filePath);
    const listOwner = ownerFromFile(filePath);
    let spellLevel: number | null = null;
    let schoolGroup: string | null = null;
    let paragraphIndex = 0;

    for (const text of textParagraphs(readGb2312(filePath))) {
      paragraphIndex += 1;
      const level = parseLevelHeading(text);
      if (level !== null) {
        spellLevel = level;
        schoolGroup = null;
        continue;
      }

    const school = parseSchoolHeading(text);
    if (school) {
      schoolGroup = school;
      continue;
    }

      for (const fragment of splitSummaryFragments(text)) {
        const fragmentSchool = parseSchoolHeading(fragment);
        if (fragmentSchool) {
          schoolGroup = fragmentSchool;
          continue;
        }

        const parsed = parseSummaryLine(fragment);
      if (!parsed) continue;

      candidates.push({
        sourceKey: sourceKey(file, parsed.enName, paragraphIndex),
        file,
        kind: "spell",
        sourceKind: "class-list",
        listOwner,
        spellLevel,
        schoolGroup,
        discipline: null,
        sourceLabelHints: sourceLabelsForRecord(file, parsed.sourceLabelHints),
        sourceProvenance: "zh-chm-class-list",
        zhName: parsed.zhName,
        enName: parsed.enName,
        rawEnName: parsed.rawEnName,
        componentMarkers: parsed.componentMarkers,
        summaryText: parsed.summaryText,
        matchMethod: parsed.method,
      });
      }
    }
  }

  return { filesScanned: files.length, candidates };
}

function parseDomainSpellLine(text: string) {
  const normalized = normalizeDigits(text);
  const match = normalized.match(/^(\d+)[、.．]?\s*(.+)$/);
  if (!match?.[1] || !match[2]) return null;

  const parsed = parseSummaryLine(match[2]);
  if (!parsed) return null;
  if (/^同\s*phb$/i.test(parsed.enName)) return null;

  return {
    spellLevel: Number(match[1]),
    parsed,
  };
}

function extractDomainListCandidates(inputDir: string) {
  const candidates: SummaryCandidate[] = [];
  const files = scanHtmlFiles(inputDir);

  for (const filePath of files) {
    const file = relFile(inputDir, filePath);
    const listOwner = ownerFromFile(filePath);
    let inSpellList = false;
    let paragraphIndex = 0;

    for (const text of textParagraphs(readGb2312(filePath))) {
      paragraphIndex += 1;
      if (/领域法术[（(][^（）()]*Domain Spells[^（）()]*[）)]/i.test(text)) {
        inSpellList = true;
        continue;
      }
      if (!inSpellList) continue;

      const parsedLine = parseDomainSpellLine(text);
      if (!parsedLine) continue;

      candidates.push({
        sourceKey: sourceKey(file, parsedLine.parsed.enName, paragraphIndex),
        file,
        kind: "spell",
        sourceKind: "domain-list",
        listOwner,
        spellLevel: parsedLine.spellLevel,
        schoolGroup: null,
        discipline: null,
        sourceLabelHints: sourceLabelsForRecord(
          file,
          parsedLine.parsed.sourceLabelHints,
        ),
        sourceProvenance: "zh-chm-domain-list",
        zhName: parsedLine.parsed.zhName,
        enName: parsedLine.parsed.enName,
        rawEnName: parsedLine.parsed.rawEnName,
        componentMarkers: parsedLine.parsed.componentMarkers,
        summaryText: parsedLine.parsed.summaryText,
        matchMethod: parsedLine.parsed.method,
      });
    }
  }

  return { filesScanned: files.length, candidates };
}

function extractManeuverListCandidates(filePath: string) {
  const candidates: SummaryCandidate[] = [];
  if (!fs.existsSync(filePath)) return { filesScanned: 0, candidates };

  const file = path.basename(filePath);
  let spellLevel: number | null = null;
  let discipline: string | null = null;
  let paragraphIndex = 0;

  for (const text of textParagraphs(readUtf8(filePath))) {
    paragraphIndex += 1;
    const level = parseManeuverLevel(text);
    if (level !== null) {
      spellLevel = level;
      discipline = null;
      continue;
    }

    if (DISCIPLINES.has(text)) {
      discipline = text;
      continue;
    }

    for (const fragment of splitSummaryFragments(text)) {
      const parsed = parseSummaryLine(fragment);
    if (!parsed) continue;

    candidates.push({
      sourceKey: sourceKey(file, parsed.enName, paragraphIndex),
      file,
      kind: "maneuver",
      sourceKind: "maneuver-list",
      listOwner: "九剑",
      spellLevel,
      schoolGroup: null,
      discipline,
      sourceLabelHints: [MANEUVER_BOOK_LABEL],
      sourceProvenance: "zh-chm-maneuver-list",
      zhName: parsed.zhName,
      enName: parsed.enName,
      rawEnName: parsed.rawEnName,
      componentMarkers: parsed.componentMarkers,
      summaryText: parsed.summaryText,
      matchMethod: parsed.method,
    });
    }
  }

  return { filesScanned: 1, candidates };
}

function bookLabelsForCandidate(candidate: SummaryCandidate) {
  if (candidate.sourceKind === "maneuver-list") return [MANEUVER_BOOK_LABEL];
  return candidate.sourceLabelHints.length > 0
    ? candidate.sourceLabelHints
    : [];
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

async function matchCandidates(candidates: SummaryCandidate[]) {
  const matched: MatchedSummary[] = [];
  const unmatched: MatchedSummary[] = [];
  const byMatchMethod: Record<string, number> = {};

  for (const candidate of candidates) {
    const matches = await matchByEnNameAllBooks({
      enName: candidate.enName,
      bookLabels: bookLabelsForCandidate(candidate),
    });

    for (const match of matches) {
      const finalMatchMethod = `${candidate.matchMethod}; ${match.matchMethod}`;
      bump(byMatchMethod, finalMatchMethod);

      const record: MatchedSummary = {
        ...candidate,
        spellId: match.spellId,
        rulebookId: match.rulebookId,
        rulebookAbbr: match.rulebookAbbr,
        chmRulebookLabels: match.chmRulebookLabels,
        finalMatchMethod,
        resolvedEnName: match.resolvedEnName ?? null,
        aliasChain: match.aliasChain ?? [],
        aliasCategories: match.aliasCategories ?? [],
        aliasReview: match.aliasReview ?? "none",
      };

      if (match.spellId) matched.push(record);
      else unmatched.push(record);
    }
  }

  return { matched, unmatched, byMatchMethod };
}

function uniqueNumbers(values: Array<number | null>) {
  return [...new Set(values.filter((value): value is number => value !== null))];
}

function uniqueStrings(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => value !== null))];
}

function strongestAliasReview(
  values: Array<MatchedSummary["aliasReview"]>,
): "low" | "required" {
  return values.includes("required") ? "required" : "low";
}

function uniqueAliasCategories(records: MatchedSummary[]) {
  return [
    ...new Set(records.flatMap((record) => record.aliasCategories)),
  ].sort();
}

function recordHasDirectRulebookLabel(record: MatchedSummary) {
  if (!record.rulebookAbbr) return false;
  return record.chmRulebookLabels.some(
    (label) => BOOK_LABEL_TO_ABBR[normalizeBookLabel(label)] === record.rulebookAbbr,
  );
}

function preferredRecordsForTarget(records: MatchedSummary[]) {
  const direct = records.filter(recordHasDirectRulebookLabel);
  return direct.length > 0 ? direct : records;
}

function findAliasAudit(records: MatchedSummary[]): AliasAuditEntry[] {
  const grouped = new Map<string, MatchedSummary[]>();
  for (const record of records) {
    if (record.aliasChain.length === 0) continue;
    grouped.set(record.enName, [...(grouped.get(record.enName) ?? []), record]);
  }

  const entries: AliasAuditEntry[] = [];
  for (const [enName, group] of grouped) {
    const byResolution = new Map<string, MatchedSummary[]>();
    for (const record of group) {
      const key = `${record.resolvedEnName ?? ""}|${JSON.stringify(
        record.aliasChain,
      )}`;
      byResolution.set(key, [...(byResolution.get(key) ?? []), record]);
    }

    const resolutions = [...byResolution.values()]
      .map((resolutionGroup) => ({
        resolvedEnName: resolutionGroup[0]?.resolvedEnName ?? "",
        records: resolutionGroup.length,
        spellIds: uniqueNumbers(resolutionGroup.map((record) => record.spellId)),
        rulebookAbbrs: uniqueStrings(
          resolutionGroup.map((record) => record.rulebookAbbr),
        ),
        aliasReview: strongestAliasReview(
          resolutionGroup.map((record) => record.aliasReview),
        ),
        aliasCategories: uniqueAliasCategories(resolutionGroup),
        aliasChain: resolutionGroup[0]?.aliasChain ?? [],
        sourceKeys: resolutionGroup.map((record) => record.sourceKey),
      }))
      .sort((a, b) => a.resolvedEnName.localeCompare(b.resolvedEnName));

    entries.push({
      enName,
      records: group.length,
      spellIds: uniqueNumbers(group.map((record) => record.spellId)),
      rulebookAbbrs: uniqueStrings(group.map((record) => record.rulebookAbbr)),
      aliasReview: strongestAliasReview(group.map((record) => record.aliasReview)),
      aliasCategories: uniqueAliasCategories(group),
      resolutions,
    });
  }

  return entries.sort((a, b) => {
    if (a.aliasReview !== b.aliasReview) {
      return a.aliasReview === "required" ? -1 : 1;
    }
    return b.records - a.records || a.enName.localeCompare(b.enName);
  });
}

function findDuplicates(records: MatchedSummary[]): DuplicateGroup[] {
  const grouped = new Map<string, MatchedSummary[]>();
  for (const record of records) {
    const targetKey = record.spellId
      ? `spell:${record.spellId}`
      : `missing:${record.enName.toLowerCase()}`;
    grouped.set(targetKey, [...(grouped.get(targetKey) ?? []), record]);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [targetKey, group] of grouped) {
    const preferredGroup = preferredRecordsForTarget(group);
    if (preferredGroup.length < 2) continue;
    const bySummary = new Map<string, MatchedSummary[]>();
    for (const record of preferredGroup) {
      bySummary.set(record.summaryText, [
        ...(bySummary.get(record.summaryText) ?? []),
        record,
      ]);
    }
    duplicates.push({
      targetKey,
      spellId: preferredGroup[0]?.spellId ?? null,
      enName: preferredGroup[0]?.enName ?? "",
      summaries: [...bySummary.entries()].map(([summaryText, records]) => ({
        summaryText,
        records,
      })),
    });
  }

  return duplicates.sort((a, b) => a.targetKey.localeCompare(b.targetKey));
}

function normalizeSummaryForConflict(text: string) {
  return normalizeDigits(normalizePunctuation(text))
    .replace(/\s+/g, "")
    .replace(/[。．.]+$/g, "")
    .replace(/[，,]/g, ",")
    .replace(/[；;]/g, ";")
    .replace(/[：:]/g, ":")
    .replace(/[（）]/g, (value) => (value === "（" ? "(" : ")"))
    .toLowerCase();
}

function findConflicts(duplicates: DuplicateGroup[]): ConflictGroup[] {
  const conflicts: ConflictGroup[] = [];
  for (const duplicate of duplicates) {
    const normalized = new Map<string, DuplicateGroup["summaries"]>();
    for (const summary of duplicate.summaries) {
      const key = normalizeSummaryForConflict(summary.summaryText);
      normalized.set(key, [...(normalized.get(key) ?? []), summary]);
    }
    if (normalized.size < 2) continue;
    conflicts.push({
      ...duplicate,
      normalizedSummaries: [...normalized.entries()].map(
        ([normalizedSummaryText, summaries]) => ({
          normalizedSummaryText,
          summaries,
        }),
      ),
    });
  }
  return conflicts;
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const classResult = extractClassListCandidates(options.classListInput);
  const domainResult = extractDomainListCandidates(options.domainListInput);
  const maneuverResult = extractManeuverListCandidates(options.maneuverListInput);
  const candidates = [
    ...classResult.candidates,
    ...domainResult.candidates,
    ...maneuverResult.candidates,
  ];
  const { matched, unmatched, byMatchMethod } = await matchCandidates(candidates);
  const aliasAudit = findAliasAudit(matched);
  const duplicates = findDuplicates(matched);
  const conflicts = findConflicts(duplicates);

  const bySourceKind: Record<string, number> = {};
  for (const candidate of candidates) bump(bySourceKind, candidate.sourceKind);

  const report: ExtractReport = {
    generatedAt: timestampKey(),
    options,
    stats: {
      filesScanned:
        classResult.filesScanned +
        domainResult.filesScanned +
        maneuverResult.filesScanned,
      candidates: candidates.length,
      matched: matched.length,
      unmatched: unmatched.length,
      duplicates: duplicates.length,
      conflictingDuplicates: duplicates.filter(
        (group) => group.summaries.length > 1,
      ).length,
      normalizedConflictingDuplicates: conflicts.length,
      aliasAssistedMatches: matched.filter(
        (record) => record.aliasChain.length > 0,
      ).length,
      aliasReviewRequiredMatches: matched.filter(
        (record) => record.aliasReview === "required",
      ).length,
      aliasAuditEntries: aliasAudit.length,
      bySourceKind,
      byMatchMethod,
    },
  };

  writeJson(path.join(options.outDir, "summary.json"), report);
  writeJson(path.join(options.outDir, "candidates.json"), candidates);
  writeJson(path.join(options.outDir, "matched.json"), matched);
  writeJson(path.join(options.outDir, "unmatched.json"), unmatched);
  writeJson(path.join(options.outDir, "duplicates.json"), duplicates);
  writeJson(path.join(options.outDir, "conflicts.json"), conflicts);
  writeJson(path.join(options.outDir, "alias-audit.json"), aliasAudit);

  console.log("zh summary extraction done");
  console.log(report.stats);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
