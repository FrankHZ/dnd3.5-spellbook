import assert from "node:assert/strict";
import { load } from "cheerio";
import type { EnglishRecord, validateReviews } from "./qa";
import { validateSourceBoundFallbackReviews, type ChineseTextBinding,
  validateAcceptedBodyAmendments, type AcceptedBodyBaseline, type AcceptedBodyAmendment,
  type SourceBoundFallbackReview } from "./source-bound-fallback";

type NativeResult = ReturnType<typeof validateReviews>;
export type ProjectionInputs = {
  rulebookId: number;
  english: Map<number, EnglishRecord>;
  englishHtml: Map<number, string | null>;
  chinese: Map<number, ChineseTextBinding>;
  chineseSources: Map<number, string | null>;
};
type OriginalFieldOrigin =
  | { kind: "native"; sourceKey: string }
  | { kind: "independent"; sourceKey: null; sourceRef: string;
      sourcePages: SourceBoundFallbackReview["sourcePages"]; status: SourceBoundFallbackReview["status"] }
  | { kind: "chm"; sourceKey: string }
  | { kind: "english"; sourceKey: null };
export type FieldOrigin = OriginalFieldOrigin & { activeAmendment?: {
  revision: string; path: string; prior: AcceptedBodyAmendment["prior"];
  sourceRef: string; sourcePages: SourceBoundFallbackReview["sourcePages"];
  status: SourceBoundFallbackReview["status"];
} };
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
  assert(native.summary.scope?.kind !== "slice",
    "effective projection requires whole-book QA, not a slice");
  assert(native.summary.validation !== "incomplete-check", "effective projection requires formal QA");
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

/** Apply separately authenticated envelopes after complete union validation.
 * Keep the original owner/source key and ledger row alongside active authority.
 * In particular, a native amendment is never an independent fallback row.
 */
export function projectAcceptedBodyAmendments(input: ProjectionInputs,
  projected: ReturnType<typeof projectEffectiveChinese>, baseline: AcceptedBodyBaseline,
  amendments: AcceptedBodyAmendment[], authority: { revision: string; path: string }) {
  assert(/^[0-9a-f]{40}$/.test(authority.revision) && authority.path.trim(), "require exact amendment authority");
  const chinese = new Map(projected.output.map(row => [row.targetId, {
    name: row.name.text, descriptionText: row.body.text, descriptionHtml: row.body.html,
  }]));
  validateAcceptedBodyAmendments(amendments, baseline, input.rulebookId,
    input.english, input.englishHtml, chinese);
  const output = structuredClone(projected.output);
  const targets = new Map(output.map(row => [row.targetId, row]));
  for (const amendment of amendments) {
    const row = targets.get(amendment.targetId);
    assert(row && row.body.origin.kind === amendment.prior.owner, "amendment projection owner mismatch");
    assert(!row.body.origin.activeAmendment, "already amended projection");
    row.body = { text: amendment.review.after, html: amendment.review.proposedHtml,
      origin: { ...row.body.origin, activeAmendment: { ...authority, prior: amendment.prior,
        sourceRef: amendment.review.sourceRef, sourcePages: amendment.review.sourcePages,
        status: amendment.review.status } } };
  }
  const changed = output.reduce((count, row) => count + (["name", "body"] as const).filter(field => {
    const value = row[field], before = input.chinese.get(row.targetId);
    return (value.origin.kind === "native" || value.origin.kind === "independent")
      && (value.text !== (field === "name" ? before?.name : before?.descriptionText)
        || (field === "body" && row.body.html !== before?.descriptionHtml));
  }).length, 0);
  return { output, summary: { ...projected.summary, changed, unchanged: projected.summary.fields - changed,
    amendedBodies: amendments.length } };
}

/** Reconcile every field, keeping new coverage distinct from existing-value amendments. */
export function reconcileEffectiveProjection(previous: EffectiveChinese[], current: EffectiveChinese[]) {
  assert.deepEqual(current.map(row => row.targetId), previous.map(row => row.targetId), "projection target universe changed");
  const newlyAcceptedBodies: number[] = [], amendedBodies: number[] = [];
  const fallback: Array<{ targetId: number; field: "name" | "body"; origin: FieldOrigin }> = [];
  const accepted = (origin: FieldOrigin) => origin.kind === "native" || origin.kind === "independent";
  current.forEach((row, index) => {
    const old = previous[index]!;
    assert.deepEqual(row.name, old.name, "accepted names changed");
    for (const field of ["name", "body"] as const) {
      if (!accepted(row[field].origin)) {
        assert.deepEqual(row[field], old[field], "retained fallback changed");
        fallback.push({ targetId: row.targetId, field, origin: row[field].origin });
      } else if (!accepted(old[field].origin)) {
        assert.equal(field, "body", "unexpected new accepted name");
        assert(!row[field].origin.activeAmendment, "amendment adds coverage");
        newlyAcceptedBodies.push(row.targetId);
      } else if (row[field].origin.activeAmendment) {
        assert.equal(field, "body", "unexpected name amendment");
        assert(row.body.text !== old.body.text || row.body.html !== old.body.html, "amendment did not change existing body value");
        const { activeAmendment: _active, ...original } = row[field].origin;
        assert.deepEqual(original, old[field].origin, "original accepted ownership changed");
        amendedBodies.push(row.targetId);
      } else assert.deepEqual(row[field], old[field], "unrelated accepted field changed");
    }
  });
  return { newlyAcceptedBodies, amendedBodies, fallback };
}
