import assert from "node:assert/strict";
import { load } from "cheerio";
import type { EnglishRecord, validateReviews } from "./qa";
import { validateSourceBoundFallbackReviews, type ChineseTextBinding,
  type SourceBoundFallbackReview } from "./source-bound-fallback";

type NativeResult = ReturnType<typeof validateReviews>;
export type ProjectionInputs = {
  rulebookId: number;
  english: Map<number, EnglishRecord>;
  englishHtml: Map<number, string | null>;
  chinese: Map<number, ChineseTextBinding>;
  chineseSources: Map<number, string | null>;
};
export type FieldOrigin =
  | { kind: "native"; sourceKey: string }
  | { kind: "independent"; sourceKey: null; sourceRef: string;
      sourcePages: SourceBoundFallbackReview["sourcePages"]; status: SourceBoundFallbackReview["status"] }
  | { kind: "chm"; sourceKey: string }
  | { kind: "english"; sourceKey: null };
export type EffectiveChinese = {
  targetId: number; rulebookId: number;
  name: { text: string; origin: FieldOrigin };
  body: { text: string; html: string | null; origin: FieldOrigin };
};

const present = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** Compose only a complete QA result and the exact accepted exports.
 * The caller must authenticate native source coverage and the accepted revision.
 * This function rechecks the independent current-field bindings and overlap.
 * It writes nothing and never reinterprets retained CHM or English content.
 */
export function projectEffectiveChinese(input: ProjectionInputs, native: NativeResult,
  nativeAccepted: NativeResult["accepted"], independent: SourceBoundFallbackReview[]) {
  assert.deepEqual(nativeAccepted, native.accepted, "native export differs from complete formal QA");
  const { accepted } = validateSourceBoundFallbackReviews(independent, input.rulebookId,
    input.english, input.englishHtml, input.chinese, nativeAccepted);
  assert.deepEqual(accepted, independent, "independent export contains unaccepted fields");
  const natives = new Map(nativeAccepted.map(row => [row.targetId, row]));
  const independents = new Map(accepted.map(row => [`${row.targetId}:${row.field}`, row]));
  const output: EffectiveChinese[] = [];
  const counts = { targets: 0, fields: 0, native: 0, independent: 0, chm: 0, english: 0,
    acceptedNames: 0, acceptedBodies: 0, changed: 0, unchanged: 0, absentChinese: 0 };
  for (const [targetId, en] of [...input.english].sort(([a], [b]) => a - b)) {
    if (en.rulebookId !== input.rulebookId) continue;
    assert(input.englishHtml.has(targetId), `missing current English HTML ${targetId}`);
    const zh = input.chinese.get(targetId) ?? { name: null, descriptionText: null, descriptionHtml: null };
    if (present(zh.name) || present(zh.descriptionText) || present(zh.descriptionHtml)) {
      assert(present(input.chineseSources.get(targetId)), `missing current CHM source ${targetId}`);
    }
    if (present(zh.descriptionHtml)) {
      const compact = (value: string | null) => (value ?? "").replace(/\s/g, "");
      assert.equal(compact(load(zh.descriptionHtml)("body").text()), compact(zh.descriptionText),
        `current CHM HTML/text mismatch ${targetId}`);
    }
    const nativeRow = natives.get(targetId);
    const chmOrigin = (): FieldOrigin => {
      const key = input.chineseSources.get(targetId);
      assert(present(key), `missing current CHM source ${targetId}`);
      return { kind: "chm", sourceKey: key };
    };
    const field = (name: "name" | "descriptionText") => {
      const row = independents.get(`${targetId}:${name}`);
      const nativeValue = name === "name" ? nativeRow?.name : nativeRow?.descriptionHtml;
      let text: string, html: string | null = null, origin: FieldOrigin;
      if (row) {
        text = row.after; html = row.proposedHtml;
        origin = { kind: "independent", sourceKey: null, sourceRef: row.sourceRef,
          sourcePages: row.sourcePages, status: row.status };
      } else if (nativeValue !== undefined) {
        assert(present(nativeValue), `empty native field ${targetId}:${name}`);
        text = name === "name" ? nativeValue : load(nativeValue)("pre").text();
        html = name === "name" ? null : nativeValue;
        assert(present(text), `invalid native body HTML ${targetId}`);
        origin = { kind: "native", sourceKey: nativeRow!.sourceKey };
      } else if (present(zh[name])) {
        text = zh[name]; html = name === "name" ? null : zh.descriptionHtml;
        origin = chmOrigin();
      } else {
        text = name === "name" ? en.name : en.description;
        html = name === "name" ? null : input.englishHtml.get(targetId)!;
        origin = { kind: "english", sourceKey: null }; counts.absentChinese++;
      }
      counts[origin.kind]++; counts.fields++;
      const replaced = origin.kind === "native" || origin.kind === "independent";
      if (replaced) counts[name === "name" ? "acceptedNames" : "acceptedBodies"]++;
      if (replaced && (text !== zh[name] || (name === "descriptionText" && html !== zh.descriptionHtml))) counts.changed++;
      else counts.unchanged++;
      return { text, html, origin };
    };
    const name = field("name"), body = field("descriptionText");
    output.push({ targetId, rulebookId: en.rulebookId, name: { text: name.text, origin: name.origin }, body });
  }
  counts.targets = output.length;
  assert(counts.targets > 0, "empty projection scope");
  assert(counts.fields === output.length * 2, "incomplete projection universe");
  return { output, summary: { ...counts, accepted: counts.native + counts.independent,
    complement: counts.chm + counts.english, activation: false, importable: false } };
}
