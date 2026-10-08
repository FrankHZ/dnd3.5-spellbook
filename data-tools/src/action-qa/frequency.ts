import { chineseParts, englishActions } from "./actions";

export type FrequencyRow = { spellId: number; english: string; castingTime: string | null; chinese: string | null };
type Count = { phrase: string; occurrences: number; documentFrequency: number;
  concordance: { spellId: number; scope: string; context: string }[] };
const labelPattern = /(?:标准|標準|移动等效|移動等效|移动|移動|类移|類移|等同移动的|迅捷|快捷|快速|迅速|直觉|直覺|即时|即時|瞬间|瞬間|自由|实时|實時|免费|免費|整轮|整輪|全回合|全轮|全輪)(?:动作|動作)/gu;
/** Bounded retrieval evidence: DF counts a spell once per phrase/scope, not as many times as it repeats. */
export function actionFrequency(rows: Iterable<FrequencyRow>) {
  const labels = new Map<string, Count>(); const suffixes = new Map<string, Count>();
  const english = new Map<string, Count>(); let entries = 0; let textBytes = 0;
  const add = (map: Map<string, Count>, key: string, row: FrequencyRow, scope: string, context: string, seen: Set<string>) => {
    const count = map.get(key) ?? { phrase: key, occurrences: 0, documentFrequency: 0, concordance: [] };
    count.occurrences++;
    if (!seen.has(key)) {
      count.documentFrequency++; seen.add(key);
      if (count.concordance.length < 2) count.concordance.push({ spellId: row.spellId, scope, context: context.slice(0, 600) });
    }
    map.set(key, count);
  };
  for (const row of rows) {
    entries++; textBytes += Buffer.byteLength(row.english) + Buffer.byteLength(row.chinese ?? "") + Buffer.byteLength(row.castingTime ?? "");
    const enSeen = new Set<string>(); const zhSeen = new Set<string>(); const suffixSeen = new Set<string>();
    for (const [scope, text] of [["body",row.english],["casting-time",row.castingTime ?? ""]]) {
      for (const action of englishActions(text!)) add(english, `${scope}:${action.kind}`, row, scope!, action.context, enSeen);
    }
    const parts = chineseParts(row.chinese ?? "");
    for (const [scope, lines] of [["body",parts.body],["casting-time",parts.header]] as const) {
      for (const context of lines) {
        const text = context.replace(/\s+/gu, "");
        for (const match of text.matchAll(labelPattern)) add(labels, `${scope}:${match[0]}`, row, scope, context, zhSeen);
        // Only 2..4 characters immediately before 动作, never a full-text cross-sentence matrix.
        for (const match of text.matchAll(/([\u4e00-\u9fff]{2,12})(?:动作|動作)/gu)) {
          for (const n of [2,3,4]) {
            if (match[1]!.length < n) continue;
            const suffix = match[1]!.slice(-n);
            if (/(?:一个|一個|任何|进行|進行|采取|採取|需要|执行|執行|使用|花费|花費|可以|作为|作為)/u.test(suffix)) continue;
            if ([...`${suffix}动作`.matchAll(labelPattern)].length) continue;
            add(suffixes, `${scope}:${suffix}动作`, row, scope, context, suffixSeen);
          }
        }
      }
    }
  }
  const sorted = (map: Map<string,Count>) => [...map.values()].sort((a,b)=>b.documentFrequency-a.documentFrequency || a.phrase.localeCompare(b.phrase));
  return { entries, textBytes, selectedVariant: "effective row if present, otherwise CHM", english: sorted(english), chineseLabels: sorted(labels).slice(0,40),
    chineseSuffixCandidates: sorted(suffixes).filter(row=>row.documentFrequency >= 2).slice(0,20),
    limits: { labelTopK: 40, suffixTopK: 20, suffixLengths: [2,3,4], examplesPerPhrase: 2, contextCharacters: 600 },
    interpretation: "Seed/suffix retrieval and document frequencies, not semantic acceptance. Concordance favors earliest IDs. Coordinated labels may share their final action noun; Chinese label counts are literal phrases." };
}
