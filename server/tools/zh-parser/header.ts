import { isEnglishish, normText } from "./utils";
import { Element } from "domhandler";
import * as cheerio from "cheerio";

const CJK_RE = /[\u4e00-\u9fff]/;
const LETTER_HEADING_RE = /^[A-Z](?::)?$/;
const FIELD_LABELS = [
  "等级",
  "法术成分",
  "施法时间",
  "距离",
  "目标",
  "区域",
  "效果",
  "持续时间",
  "豁免检定",
  "法术抗力",
  "施法材料",
  "材料",
  "奥术器材",
  "器材",
  "专注要素",
  "禁制要素",
  "经验值",
  "说明",
  "注",
  "特殊",
];

function startsWithFieldLabel(zh: string): boolean {
  // match: "距离：" or "距离：" with full-width colon
  return FIELD_LABELS.some(
    (lab) => zh.startsWith(lab + "：") || zh.startsWith(lab + ":"),
  );
}

function looksLikeStatNotation(en: string): boolean {
  // e.g. "25+5ft/2cl", "1d6", "+2", "DC15"
  return /\d/.test(en) && !/\s/.test(en) && en.length <= 12;
}

function onlyWhitespaceAfterLastParen(text: string): boolean {
  const lastFull = text.lastIndexOf("）");
  const lastHalf = text.lastIndexOf(")");
  const last = Math.max(lastFull, lastHalf);
  if (last < 0) return false;

  const tail = text.slice(last + 1);
  return tail.trim().length === 0;
}

export function extractParenGroups(text: string): string[] {
  // support full-width （ ） and half-width ( )
  const groups: string[] = [];
  const chars = [...text];
  const opens = new Set(["（", "("]);
  const closes = new Set(["）", ")"]);

  let buf: string[] = [];
  let depth = 0;

  for (const ch of chars) {
    if (opens.has(ch)) {
      if (depth === 0) buf = [];
      depth++;
      continue;
    }
    if (closes.has(ch)) {
      if (depth > 0) depth--;
      if (depth === 0) {
        const g = buf.join("").trim();
        if (g) groups.push(g);
      }
      continue;
    }
    if (depth > 0) buf.push(ch);
  }
  return groups;
}

export function normalizeEnName(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/，/g, ",") // Chinese comma -> ASCII comma
    .replace(/。/g, ".") // (optional) Chinese period -> ASCII
    .replace(/：/g, ":") // (optional)
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/,\s*/g, ", ") // force single space after comma
    .replace(/\s+,/g, ",") // cleanup weird spaces before comma
    .trim();
}

export function isSpellHeaderP($: cheerio.CheerioAPI, p: Element): boolean {
  const text = normText($(p).text());
  if (!text) return false;
  if (LETTER_HEADING_RE.test(text)) return false;
  if (!CJK_RE.test(text)) return false;

  // Must have bold
  const hasBold = $(p).find("b,strong").length > 0;
  if (!hasBold) return false;

  const groups = extractParenGroups(text);
  if (groups.length < 1) return false;

  if (!onlyWhitespaceAfterLastParen(text)) return false;

  const first = groups[0] ?? "";
  const firstLooksEnglish = isEnglishish(first);
  if (looksLikeStatNotation(first)) return false;

  const firstParenIdx =
    text.indexOf("（") >= 0 ? text.indexOf("（") : text.indexOf("(");

  if (firstParenIdx < 1) return false;
  const zhCandidate = text.slice(0, firstParenIdx).trim();
  if (zhCandidate.length > 15) return false;
  if (!CJK_RE.test(zhCandidate)) return false;
  if (startsWithFieldLabel(zhCandidate)) return false;

  return firstLooksEnglish;
}

export function parseSpellHeader(headerText: string): {
  zhName: string;
  enName: string;
  bookLabels: string[];
} | null {
  const t = headerText.replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (!/[\u4e00-\u9fff]/.test(t)) return null;

  const groups = extractParenGroups(t);
  if (groups.length < 1) return null;

  const firstParenIdx = t.indexOf("（") >= 0 ? t.indexOf("（") : t.indexOf("(");
  if (firstParenIdx < 1) return null;

  const zhName = t.slice(0, firstParenIdx).trim();
  if (!/[\u4e00-\u9fff]/.test(zhName)) return null;

  // NEW: prevent long sentence paragraphs from becoming headers
  if (zhName.length > 30) return null;
  if (/[。！？]/.test(zhName)) return null;

  const enName = normalizeEnName(groups[0]!.trim());
  if (!isEnglishish(enName)) return null;

  const bookLabels = groups
    .slice(1)
    .map((s) => s.trim())
    .filter(Boolean);
  return { zhName, enName, bookLabels };
}
