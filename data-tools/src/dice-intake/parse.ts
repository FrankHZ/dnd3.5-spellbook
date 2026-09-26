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
  problems: string[];
};

export type ParsedFile = {
  file: string;
  encoding: "utf-8" | "utf-8-bom";
  lineCount: number;
  preamble: string;
  records: DiceRecord[];
};

const FIELD = /^(?:等级|法术成分|施法时间|距离|范围|目标|效果|区域|影响区域|持续时间|豁免(?:检定)?|法术抗[力性]|材料成分|器材)\s*[:：]/;
const SCHOOL = /^(?:防护|咒法|预言|惑控|塑能|幻术|死灵|变化|通用|聚能|转化).{0,20}(?:系|术)/;
const HEADER_SHAPE = /^.{1,40}[（(][A-Za-z][^()（）\r\n]{1,110}[）)](?:\s*[（(][^()（）\r\n]{1,60}[）)]){1,5}\s*$/;
const SINGLE_HEADER_SHAPE = /^.{1,40}[（(][A-Za-z][^()（）\r\n]{1,110}[）)]\s*$/;
const POSSIBLE_HEADER = /^.{1,40}[（(].{1,110}[）)](?:\s*[（(].{1,60}[）)]){1,5}\s*$/;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function hasStatAfter(lines: string[], index: number): boolean {
  return lines.slice(index + 1, index + 5).some((line) => FIELD.test(line.trim()) || SCHOOL.test(line.trim()));
}

export function parseDiceFile(file: string, bytes: Uint8Array): ParsedFile {
  const hasBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const lines = decoded.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  const starts: Array<{ index: number; parsed: ReturnType<typeof parseSpellHeader>; malformed: boolean }> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!.trim();
    if (!hasStatAfter(lines, i)) continue;
    const startsAfterGap = i > 0 && !lines[i - 1]!.trim();
    const parsed = HEADER_SHAPE.test(line) || (startsAfterGap && SINGLE_HEADER_SHAPE.test(line))
      ? parseSpellHeader(line) : null;
    if (parsed && (parsed.bookLabels.length > 0 || startsAfterGap)) {
      starts.push({ index: i, parsed, malformed: false });
    } else if (POSSIBLE_HEADER.test(line) && /[\u3400-\u9fff]/.test(line) && !FIELD.test(line) && !SCHOOL.test(line)) {
      starts.push({ index: i, parsed: null, malformed: true });
    } else if (startsAfterGap && line.length < 60 && /[\u3400-\u9fff]/.test(line)
      && !FIELD.test(line) && !SCHOOL.test(line) && !/[。！？：:]$/.test(line)
      && SCHOOL.test(lines[i + 1]?.trim() ?? "")) {
      starts.push({ index: i, parsed: null, malformed: true });
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
    const tableLines = bodyLines.filter((line) => line.includes("|") && line.trim().startsWith("|") || /^\S[^\n]*\s\|\s/.test(line));
    if (tableLines.length > 1 && new Set(tableLines.map((line) => line.split("|").length)).size > 1) {
      problems.push("malformed-table");
    }
    return {
      file, ordinal: index + 1, startLine: start.index + 1, endLine: end,
      header: lines[start.index]!, zhName: start.parsed?.zhName ?? null,
      enName: start.parsed?.enName ?? null, bookLabels: start.parsed?.bookLabels ?? [],
      rawBody, bodyText, bodyHtml: `<pre>${escapeHtml(bodyText)}</pre>`, problems,
    };
  });
  return {
    file, encoding: hasBom ? "utf-8-bom" : "utf-8", lineCount: lines.length,
    preamble: lines.slice(0, starts[0]?.index ?? lines.length).join("\n"), records,
  };
}
