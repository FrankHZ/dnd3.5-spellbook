import {
  SPELL_FULL_TEXT_MIN_TOKEN_CODE_POINTS,
  type SpellSearchMode,
} from "@dnd/contracts";

export function hasChineseChar(s: string) {
  // Covers common CJK Unified Ideographs blocks. Good enough for MVP search gating.
  return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(s);
}

export function hasFullTextSearchToken(q: string) {
  return q
    .trim()
    .split(/\s+/u)
    .some(
      (token) =>
        Array.from(token).length >= SPELL_FULL_TEXT_MIN_TOKEN_CODE_POINTS,
    );
}

export function isSearchQueryValid(
  qRaw: string,
  lang: "en" | "zh",
  mode: SpellSearchMode = "name",
) {
  const q = qRaw.trim();
  if (q.length === 0) return { ok: false, q, reason: "empty" as const };

  if (mode === "full") {
    return hasFullTextSearchToken(q)
      ? { ok: true, q }
      : { ok: false, q, reason: "fullTextMin3" as const };
  }

  if (lang === "en") {
    return q.length >= 2
      ? { ok: true, q }
      : { ok: false, q, reason: "min2" as const };
  }

  // zh
  if (q.length >= 2) return { ok: true, q };
  return hasChineseChar(q)
    ? { ok: true, q }
    : { ok: false, q, reason: "min2OrZh" as const };
}
