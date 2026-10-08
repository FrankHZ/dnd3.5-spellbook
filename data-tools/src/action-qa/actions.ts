import { isMechanismLine } from "../zh-parser/header";

export const kinds = ["standard", "move", "swift", "immediate", "free", "full-round", "no-action"] as const;
export type Kind = typeof kinds[number];
const patterns: Record<Kind, RegExp> = {
  standard: /\bstandard\s+actions?\b/gi,
  move: /\bmove(?:[- ]equivalent)?\s+actions?\b/gi,
  swift: /\bswift\s+actions?\b/gi,
  immediate: /\bimmediate\s+actions?\b/gi,
  free: /\bfree\s+actions?\b/gi,
  "full-round": /\bfull[- ]?round\s+actions?\b/gi,
  "no-action": /\b(?:no\s+action(?:\s+is\s+(?:required|needed))?|(?:does?|requires?)\s+not\s+(?:require|take)\s+an?\s+action|without\s+(?:using|taking)\s+an?\s+action|not\s+an?\s+action)\b/gi,
};
const chinese: Record<Kind, RegExp> = {
  standard: /标准动作/gu, move: /(?:(?:移动|移動)(?:等效)?|等同移动的|类移)动作/gu,
  swift: /(?:迅捷|快捷|快速)动作/gu, immediate: /(?:直觉|直覺|即时|即時|瞬间|瞬間)动作/gu,
  free: /(?:自由|免费)动作/gu, "full-round": /(?:整轮|整輪|全回合|全轮|全輪)动作/gu,
  "no-action": /(?:(?:不需|无需|無需|不需要|不必)(?:要|花费|消耗|执行)?(?:任何|一个|一個)?动作|(?:不能|无法)(?:采取|进行)(?:任何)?(?:动作|行动)|不采取任何行动|不(?:算|属于|屬於)(?:一个|一個)?动作)/gu,
};
export type Occurrence = { kind: Kind; line: number; offset: number; context: string; role: string };
export function englishActions(text: string): Occurrence[] {
  return text.split(/\r?\n/u).flatMap((context, line) => {
    const role = /\b(?:dismiss\w*|end|terminate)\b/i.test(context) ? "end"
      : /\b(?:maintain|sustain|concentrat\w*)\b/i.test(context) ? "sustain"
      : /\b(?:activat\w*|trigger)\b/i.test(context) ? "activation" : "other";
    const found = kinds.flatMap(kind => [...context.matchAll(patterns[kind])]
      .map(match => ({ kind, line, offset: match.index!, context, role })));
    const term = "(?:standard|move|swift|immediate|free|full[- ]?round)";
    const list = new RegExp(`\\b${term}(?:(?:\\s*,\\s*(?:(?:or|and)\\s+)?|\\s+(?:or|and)\\s+)${term})+\\s+actions?\\b`, "gi");
    for (const phrase of context.matchAll(list)) {
      for (const word of phrase[0].matchAll(/standard|move|swift|immediate|free|full[- ]?round/gi)) {
        const kind = word[0].toLowerCase().replace(/^full.*round$/, "full-round") as Kind;
        const offset = phrase.index! + word.index!;
        if (!found.some(row => row.kind === kind && row.offset === offset)) found.push({ kind, line, offset, context, role });
      }
    }
    return found.sort((a,b) => a.offset - b.offset);
  });
}
export function chineseParts(text: string) {
  const lines = text.split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
  return { header: lines.filter(line => /^(?:施法时间|施展时间|施法动作)\s*[：:]/u.test(line)),
    body: lines.filter(line => !isMechanismLine(line)) };
}
function matches(lines: string[], kind: Kind) {
  const direct = lines.flatMap((context, line) => [...context.replace(/動作/gu, "动作").replace(/\s+/gu, "").matchAll(chinese[kind])]
    .map(() => ({ line, context })));
  // Coordinated labels may share their final 动作 (and appear in a different order).
  const term = "(?:标准|移动|迅捷|快捷|快速|直觉|即时|瞬间|自由|整轮|全回合)";
  const list = new RegExp(`${term}(?:[，、,](?:或|和)?${term})+(?:以外的)?动作`, "gu");
  for (const [line, context] of lines.entries()) {
    for (const phrase of context.replace(/\s+/gu, "").matchAll(list)) {
      const words = phrase[0].match(new RegExp(term, "gu")) ?? [];
      if (words.some(word => [...`${word}动作`.matchAll(chinese[kind])].length) && !direct.some(row => row.line === line)) {
        direct.push({ line, context });
      }
    }
  }
  return direct;
}
export function inspectActions(english: string, castingTime: string | null, zh: string | null) {
  const parts = chineseParts(zh ?? "");
  const body = englishActions(english);
  const header = englishActions(castingTime ?? "");
  return [...header.map(occurrence => ({ ...occurrence, field: "casting-time" as const })),
    ...body.map(occurrence => ({ ...occurrence, field: "body" as const }))].map(occurrence => {
    const lines = occurrence.field === "body" ? parts.body : parts.header;
    const support = matches(lines, occurrence.kind);
    const expected = (occurrence.field === "body" ? body : header).filter(row => row.kind === occurrence.kind).length;
    // Presence/counts are retrieval evidence only: translations merge paragraphs and redistribute clauses.
    // Never clear an occurrence merely because the same word appears somewhere else.
    return { ...occurrence, status: !zh?.trim() || zh.trim() === english.trim() || (occurrence.field === "casting-time" && !lines.length) ? "unknown" : support.length < expected ? "candidate" : "unknown",
      reason: !zh?.trim() ? "missing-selected-Chinese" : zh.trim() === english.trim() ? "selected-English-fallback"
        : occurrence.field === "casting-time" && !lines.length ? "Chinese-casting-header-unavailable" : !support.length ? "missing-action-kind-in-scope"
        : support.length < expected ? "action-count-deficit" : "lexical-support-context-unverified",
      expectedOccurrences: expected, chineseOccurrences: support.length, chineseEvidence: support,
      suggestion: "Review the complete aligned meaning, condition, count and action role; no automatic correction." };
  });
}
