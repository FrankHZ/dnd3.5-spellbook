import { TextDecoder } from "node:util";
import { parseSpellHeader } from "../zh-parser/header";

export type DiceRecord = {
  file: string;
  ordinal: number;
  startLine: number;
  endLine: number;
  header: string;
  zhName: string | null;
  enName: string | null;
  bookLabels: string[];
  rawBody: string;
  bodyText: string;
  bodyHtml: string;
  suspectedBoundaryLines: number[];
  problems: string[];
};

export type ParsedFile = {
  file: string;
  encoding: "utf-8" | "utf-8-bom";
  lineCount: number;
  preamble: string;
  records: DiceRecord[];
  unparsedSpans: Array<{ startLine: number; endLine: number; rawText: string;
    disposition: "review-required-unparsed-boundary" }>;
};

const FIELD = /^(?:(?:法术)?等级|学派|(?:法术)?成分|施法时间|距离|范围|目标|效果|区域|影响区域|持续时间|豁免(?:检定)?|法术抗[力性]|材料成分|器材)\s*[:：]/;
const SCHOOL = /^(?:防护|咒法|预言|惑控|塑能|幻术|死灵|变化|通用|聚能|转化|附魔).{0,20}(?:系|术)/;
const HEADER_SHAPE = /^.{1,40}[（(][A-Za-z][^()（）\r\n]{1,110}[）)](?:\s*[（(][^()（）\r\n]{1,60}[）)]){1,5}\s*$/;
const SINGLE_HEADER_SHAPE = /^.{1,40}[（(][A-Za-z][^()（）\r\n]{1,110}[）)]\s*$/;
const POSSIBLE_HEADER = /^.{1,40}[（(].{1,110}[）)](?:\s*[（(].{1,60}[）)]){1,5}\s*$/;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function hasSignatureAfter(lines: string[], index: number): boolean {
  const nearby: string[] = [];
  for (const line of lines.slice(index + 1, index + 9)) {
    const text = line.trim();
    if (!SCHOOL.test(text) && !FIELD.test(text)
      && (HEADER_SHAPE.test(text) || SINGLE_HEADER_SHAPE.test(text))) break;
    nearby.push(text);
  }
  if (nearby.slice(0, 4).some((line) => /(?:法术)?等级\s*[:：]/.test(line) || SCHOOL.test(line))) return true;
  return nearby.filter((line) => FIELD.test(line)).length >= 3;
}

export function parseDiceFile(file: string, bytes: Uint8Array): ParsedFile {
  const hasBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const lines = decoded.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  const starts: Array<{ index: number; parsed: ReturnType<typeof parseSpellHeader>; malformed: boolean }> = [];
  const suspected: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!.trim();
    if (FIELD.test(line) || /^灵气\s*[:：]/.test(line)) continue;
    const startsAfterGap = i > 0 && !lines[i - 1]!.trim();
    const singleContext = startsAfterGap || (starts.length === 0 && i <= 2);
    const parsed = HEADER_SHAPE.test(line) || (singleContext && SINGLE_HEADER_SHAPE.test(line))
      ? parseSpellHeader(line) : null;
    const signature = hasSignatureAfter(lines, i);
    if (parsed && (parsed.bookLabels.length > 0 || singleContext) && signature) {
      starts.push({ index: i, parsed, malformed: false });
    } else if (POSSIBLE_HEADER.test(line) && /[\u3400-\u9fff]/.test(line) && !FIELD.test(line) && !SCHOOL.test(line) && signature) {
      starts.push({ index: i, parsed: null, malformed: true });
    } else if (startsAfterGap && line.length < 60 && /[\u3400-\u9fff]/.test(line)
      && !FIELD.test(line) && !SCHOOL.test(line) && !/[。！？：:]$/.test(line)
      && SCHOOL.test(lines[i + 1]?.trim() ?? "")) {
      starts.push({ index: i, parsed: null, malformed: true });
    } else if ((HEADER_SHAPE.test(line) || (singleContext && SINGLE_HEADER_SHAPE.test(line)))
      && !FIELD.test(line) && !SCHOOL.test(line)) {
      suspected.push(i);
    }
  }
  const records: DiceRecord[] = starts.map((start, index) => {
    const end = starts[index + 1]?.index ?? lines.length;
    const bodyLines = lines.slice(start.index + 1, end);
    const rawBody = bodyLines.join("\n");
    const bodyText = rawBody.trimEnd();
    const problems: string[] = [];
    if (start.malformed) problems.push("malformed-header");
    if (!bodyText) problems.push("empty-body");
    if (!bodyLines.some((line) => FIELD.test(line.trim()))) problems.push("missing-fields");
    if (/\uFFFD/.test(rawBody)) problems.push("replacement-character");
    const suspectedBoundaryLines = suspected.filter((line) => line > start.index && line < end).map((line) => line + 1);
    if (suspectedBoundaryLines.length > 0) problems.push("suspected-unparsed-boundary");
    const tableLines = bodyLines.filter((line) => line.includes("|") && line.trim().startsWith("|") || /^\S[^\n]*\s\|\s/.test(line));
    if (tableLines.length > 1 && new Set(tableLines.map((line) => line.split("|").length)).size > 1) {
      problems.push("malformed-table");
    }
    return {
      file, ordinal: index + 1, startLine: start.index + 1, endLine: end,
      header: lines[start.index]!, zhName: start.parsed?.zhName ?? null,
      enName: start.parsed?.enName ?? null, bookLabels: start.parsed?.bookLabels ?? [],
      rawBody, bodyText, bodyHtml: `<pre>${escapeHtml(bodyText)}</pre>`, suspectedBoundaryLines, problems,
    };
  });
  return {
    file, encoding: hasBom ? "utf-8-bom" : "utf-8", lineCount: lines.length,
    preamble: lines.slice(0, starts[0]?.index ?? lines.length).join("\n"), records,
    unparsedSpans: suspected.map((line) => ({ startLine: line + 1, endLine: line + 1,
      rawText: lines[line]!, disposition: "review-required-unparsed-boundary" })),
  };
}
