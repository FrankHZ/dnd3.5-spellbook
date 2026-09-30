import assert from "node:assert/strict";
import type { EnglishRecord } from "./qa";

export type FallbackField = "name" | "descriptionText";
export type ChineseTextBinding = {
  name: string | null; descriptionText: string | null; descriptionHtml: string | null;
};
export type SourcePage = {
  sourceId: string; pageIndex: number; printedPage: number | null;
  spanRefs: Array<[number, number, number]>;
  extractPath?: string;
};
export type SourceRulePair = {
  english: string; chinese: string; sourceId: string;
  printedPage: number | null; sourceQuote: string;
};
export type FallbackBodyAudit = {
  effectiveText: string; effectiveHtml: string; beforeHtml: string | null;
  reviewer: string; reason: string; englishEvidence: string[];
  currentHtmlReviewed: boolean; proposedHtmlReviewed: boolean;
};
export type SourceBoundFallbackReview = {
  sourceKey: null; targetId: number; rulebookId: number; field: FallbackField;
  before: string | null; after: string; proposedHtml: string | null;
  input: { chinese: ChineseTextBinding; english: EnglishRecord; englishHtml: string | null };
  sourceRef: string; sourcePages: SourcePage[];
  status: "accepted" | "rejected" | "deferred" | "excluded";
  reviewer: string; reason: string; originalSourceRead: boolean;
  rulePairs: SourceRulePair[];
  fullBodyAudit?: FallbackBodyAudit;
  pendingSourceEvidence?: unknown[];
};
type NativeAccepted = { targetId: number; rulebookId: number; name?: string; descriptionHtml?: string };

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
const text = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
const nullableText = (value: unknown): boolean => value === null || typeof value === "string";
const positive = (value: unknown): boolean => Number.isSafeInteger(value) && Number(value) > 0;
const index = (value: unknown): boolean => Number.isSafeInteger(value) && Number(value) >= 0;
export const escapedFallbackHtml = (value: string): string =>
  `<pre>${value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>`;

/** Independent correction proposals. Never synthesize dice candidates or write a DB. */
export function validateSourceBoundFallbackReviews(reviews: SourceBoundFallbackReview[],
  rulebookId: number, english: Map<number, EnglishRecord>, englishHtml: Map<number, string | null>,
  chinese: Map<number, ChineseTextBinding>, nativeAccepted: NativeAccepted[], allowPending = false): {
    accepted: SourceBoundFallbackReview[];
    summary: { reviewedFields: number; acceptedFields: number; fullBodyAudits: number;
      pendingFields: number; decisions: Record<string, number> };
  } {
  assert(positive(rulebookId), "source-bound fallback requires a positive rulebook scope");
  assert([...english.values()].some(row => row.rulebookId === rulebookId), "unknown source-bound rulebook scope");
  const seen = new Set<string>();
  const accepted: SourceBoundFallbackReview[] = [];
  const decisions: Record<string, number> = {};
  let fullBodyAudits = 0, pendingFields = 0;
  for (const row of reviews) {
    assert(row && row.sourceKey === null, "source-bound fallback sourceKey must remain null");
    assert(positive(row.targetId) && row.rulebookId === rulebookId, "unsafe or foreign source-bound identity");
    assert(row.field === "name" || row.field === "descriptionText", "invalid source-bound fallback field");
    const key = `${row.targetId}:${row.field}`;
    assert(!seen.has(key), `duplicate source-bound fallback ${key}`); seen.add(key);
    const en = english.get(row.targetId);
    assert(en && en.rulebookId === rulebookId, `missing or foreign source-bound target ${key}`);
    assert(row.input && row.input.chinese, `missing source-bound input ${key}`);
    const current = chinese.get(row.targetId) ?? { name: null, descriptionText: null, descriptionHtml: null };
    assert(Object.values(row.input.chinese).every(nullableText), `invalid Chinese input ${key}`);
    assert.equal(stable(row.input.chinese), stable(current), `stale full Chinese fallback ${key}`);
    assert.equal(stable(row.input.english), stable(en), `stale full English/mechanics ${key}`);
    assert(englishHtml.has(row.targetId) && nullableText(row.input.englishHtml), `missing English HTML ${key}`);
    assert.equal(row.input.englishHtml, englishHtml.get(row.targetId), `stale full English HTML ${key}`);
    assert.equal(row.before, current[row.field], `stale current-before field ${key}`);
    assert(text(row.after) && row.after !== row.before, `empty or unchanged source-bound correction ${key}`);
    assert.equal(row.proposedHtml, row.field === "descriptionText" ? escapedFallbackHtml(row.after) : null,
      `source-bound text/HTML projection mismatch ${key}`);
    assert(!nativeAccepted.some(native => native.targetId === row.targetId
      && (row.field === "name" ? native.name !== undefined : native.descriptionHtml !== undefined)),
    `source-bound correction overlaps native accepted field ${key}`);
    assert(["accepted", "rejected", "deferred", "excluded"].includes(row.status), `invalid source-bound status ${key}`);
    assert(text(row.reason) && text(row.reviewer), `missing source-bound rationale/reviewer ${key}`);
    const pending = row.reviewer.startsWith("queue:");
    assert(allowPending || !pending, `unreviewed source-bound field ${key}`);
    if (pending) pendingFields++;
    assert(text(row.sourceRef) && Array.isArray(row.sourcePages) && row.sourcePages.length > 0,
      `missing source-bound provenance ${key}`);
    const pages = new Set<string>();
    for (const page of row.sourcePages) {
      assert(text(page.sourceId) && index(page.pageIndex) && (page.printedPage === null || positive(page.printedPage)),
        `invalid source-bound page ${key}`);
      const pageKey = `${page.sourceId}:${page.pageIndex}`;
      assert(!pages.has(pageKey), `duplicate source-bound page ${key}`); pages.add(pageKey);
      assert(Array.isArray(page.spanRefs) && page.spanRefs.length > 0, `missing source-bound spans ${key}`);
      const spans = new Set<string>();
      for (const ref of page.spanRefs) {
        assert(Array.isArray(ref) && ref.length === 3 && ref.every(index), `invalid source-bound span ${key}`);
        const spanKey = ref.join(":"); assert(!spans.has(spanKey), `duplicate source-bound span ${key}`); spans.add(spanKey);
      }
    }
    assert(Array.isArray(row.rulePairs), `missing rule-pair list ${key}`);
    for (const pair of row.rulePairs) {
      assert(text(pair.english) && text(pair.chinese) && text(pair.sourceQuote), `incomplete source-bound rule pair ${key}`);
      const aligned: string = row.field === "name" ? `${en.name}\n${en.description}` : en.description;
      assert(aligned.includes(pair.english) && row.after.includes(pair.chinese), `unaligned source-bound rule pair ${key}`);
      assert(row.sourcePages.some(page => page.sourceId === pair.sourceId && page.printedPage === pair.printedPage),
        `rule-pair source page outside binding ${key}`);
    }
    assert(row.pendingSourceEvidence === undefined || Array.isArray(row.pendingSourceEvidence), `invalid pending source evidence ${key}`);
    if (row.status === "accepted") {
      assert(!pending && row.originalSourceRead === true, `accepted source-bound field not actually reviewed ${key}`);
      assert(text(row.before), `accepted correction cannot invent absent Chinese fallback ${key}`);
      assert(row.rulePairs.length > 0 && !row.pendingSourceEvidence?.length, `accepted source-bound field lacks closed rule evidence ${key}`);
      if (row.field === "descriptionText") {
        const audit = row.fullBodyAudit;
        assert(audit && text(audit.reviewer) && !audit.reviewer.startsWith("queue:") && text(audit.reason), `missing source-bound full-body audit ${key}`);
        assert.equal(audit.effectiveText, row.after, `stale source-bound audited full text ${key}`);
        assert.equal(audit.effectiveHtml, row.proposedHtml, `stale source-bound audited new HTML ${key}`);
        assert.equal(audit.beforeHtml, current.descriptionHtml, `stale source-bound audited old HTML ${key}`);
        assert(audit.currentHtmlReviewed === true && audit.proposedHtmlReviewed === true, `unread source-bound old/new HTML ${key}`);
        assert(Array.isArray(audit.englishEvidence) && audit.englishEvidence.length > 0
          && audit.englishEvidence.every(excerpt => text(excerpt) && en.description.includes(excerpt)),
        `unaligned source-bound full-body evidence ${key}`);
        fullBodyAudits++;
      } else assert(row.fullBodyAudit === undefined, `name field cannot claim a body audit ${key}`);
      accepted.push(row);
    }
    const status = `${row.field}:${row.status}`;
    decisions[status] = (decisions[status] ?? 0) + 1;
  }
  return { accepted, summary: { reviewedFields: reviews.length, acceptedFields: accepted.length,
    fullBodyAudits, pendingFields, decisions } };
}
