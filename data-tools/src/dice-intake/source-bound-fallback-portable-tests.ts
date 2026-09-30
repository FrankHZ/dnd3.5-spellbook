import assert from "node:assert/strict";
import { escapedFallbackHtml, validateSourceBoundFallbackReviews, type SourceBoundFallbackReview } from "./source-bound-fallback";
import type { EnglishRecord } from "./qa";

const en: EnglishRecord = { name: "Cold Touch", rulebookId: 10, editionId: 5,
  description: "A pale light appears. Deals 2d6 cold damage. The subject moves at half speed.",
  mechanics: { school: "Evocation", subschool: null, descriptors: ["Cold"],
    components: { verbal: 1, somatic: 1, material: 0, arcaneFocus: 0, divineFocus: 0,
      xp: 0, metaBreath: 0, trueName: 0, corrupt: 0, extra: "" }, castingTime: "1 action",
    range: "Touch", target: "One creature", effect: null, area: null, duration: "1 round",
    savingThrow: "None", spellResistance: "Yes", classLevels: [[1, 1, ""]], domainLevels: [] } };
const old = { name: "冷触", descriptionText: "造成1d6寒冷伤害。", descriptionHtml: "<p>造成1d6寒冷伤害。</p>" };
const after = "一道苍白光芒出现。造成2d6寒冷伤害。目标以半速移动。";
const row: SourceBoundFallbackReview = { sourceKey: null, targetId: 1, rulebookId: 10,
  field: "descriptionText", before: old.descriptionText, after, proposedHtml: escapedFallbackHtml(after),
  input: { chinese: old, english: en, englishHtml: "<p>Deals 2d6 cold damage.</p>" },
  sourceRef: "private/review.jsonl:1", sourcePages: [{ sourceId: "synthetic", pageIndex: 0,
    printedPage: 1, spanRefs: [[0, 0, 0]] }], status: "accepted", reviewer: "synthetic-reviewer",
  reason: "Full original entry and old/new consumers read; correct cold dice and retain slow movement.", originalSourceRead: true,
  rulePairs: [{ english: "Deals 2d6 cold damage.", chinese: "造成2d6寒冷伤害。", sourceId: "synthetic",
    printedPage: 1, sourceQuote: "Deals 2d6 cold damage." }],
  fullBodyAudit: { effectiveText: after, effectiveHtml: escapedFallbackHtml(after), beforeHtml: old.descriptionHtml,
    reviewer: "synthetic-fullbody", reason: "Read the complete body, original HTML and proposed rendering.",
    englishEvidence: ["Deals 2d6 cold damage.", "The subject moves at half speed."],
    currentHtmlReviewed: true, proposedHtmlReviewed: true } };
const english = new Map([[1, en], [2, { ...en, rulebookId: 20 }]]), chinese = new Map([[1, old]]), html = new Map([[1, row.input.englishHtml], [2, null]]);
const run = (rows: SourceBoundFallbackReview[], native: Array<{ targetId: number; rulebookId: number; name?: string; descriptionHtml?: string }> = []) =>
  validateSourceBoundFallbackReviews(rows, 10, english, html, chinese, native);
assert.equal(run([row]).accepted[0]!.sourceKey, null);assert.equal(run([row]).summary.fullBodyAudits, 1);
const title: SourceBoundFallbackReview = { ...row, field: "name", before: old.name, after: "寒冷之触", proposedHtml: null,
  rulePairs: [{ english: "Cold Touch", chinese: "寒冷之触", sourceId: "synthetic", printedPage: 1, sourceQuote: "COLD TOUCH" }] };
delete title.fullBodyAudit;
assert.equal(run([title], [{ targetId: 1, rulebookId: 10, descriptionHtml: "native body" }]).accepted.length, 1);
assert.equal(run([row, title]).accepted.length, 2, "two null keys remain distinct by target and field");
assert.equal(escapedFallbackHtml("<&>\n"), "<pre>&lt;&amp;&gt;\n</pre>");
let rejected = 0;
function fails(change: (item: SourceBoundFallbackReview) => void, pattern: RegExp): void {
  const item = structuredClone(row);change(item);assert.throws(() => run([item]), pattern);rejected++;
}
fails(r => { (r as unknown as { sourceKey: string }).sourceKey = "fake-candidate"; }, /remain null/);
fails(r => { (r as unknown as { targetId: null }).targetId = null; }, /identity/);
fails(r => { r.targetId = 99; }, /target/);
fails(r => { r.rulebookId = 20; }, /identity/);
fails(r => { r.targetId = 2; }, /foreign/);
fails(r => { (r as unknown as { field: string }).field = "descriptionHtml"; }, /field/);
fails(r => { r.before = "stale"; }, /current-before/);
fails(r => { r.input.chinese.descriptionHtml = null; }, /full Chinese/);
fails(r => { r.input.english.mechanics.classLevels[0]![1] = 9; }, /English\/mechanics/);
fails(r => { r.input.englishHtml = "stale"; }, /English HTML/);
fails(r => { r.after = r.before!; r.proposedHtml = escapedFallbackHtml(r.after); }, /unchanged/);
fails(r => { r.proposedHtml = "<p>changed unreviewed markup</p>"; }, /projection mismatch/);
fails(r => { r.reviewer = "queue:unread"; }, /unreviewed/);
fails(r => { r.originalSourceRead = false; }, /not actually reviewed/);
fails(r => { r.rulePairs = []; }, /closed rule evidence/);
fails(r => { r.rulePairs[0]!.english = "different spell"; }, /unaligned/);
fails(r => { r.rulePairs[0]!.chinese = "different translation"; }, /unaligned/);
fails(r => { r.rulePairs[0]!.printedPage = 2; }, /outside binding/);
fails(r => { r.sourcePages[0]!.spanRefs.push([0, 0, 0]); }, /duplicate.*span/);
fails(r => { r.sourcePages[0]!.spanRefs[0]![0] = -1; }, /invalid.*span/);
fails(r => { r.pendingSourceEvidence = ["missing original inherited rule"]; }, /closed rule evidence/);
fails(r => { delete r.fullBodyAudit; }, /full-body audit/);
fails(r => { r.fullBodyAudit!.effectiveText += "extra"; }, /audited full text/);
fails(r => { r.fullBodyAudit!.beforeHtml = null; }, /audited old HTML/);
fails(r => { r.fullBodyAudit!.proposedHtmlReviewed = false; }, /unread.*HTML/);
fails(r => { r.fullBodyAudit!.englishEvidence = ["unrelated"]; }, /full-body evidence/);
assert.throws(() => run([row, row]), /duplicate/);
assert.throws(() => run([row], [{ targetId: 1, rulebookId: 10, descriptionHtml: "native" }]), /overlaps/);
assert.throws(() => run([title], [{ targetId: 1, rulebookId: 10, name: "native" }]), /overlaps/);
const absent = structuredClone(row);absent.before = null;absent.input.chinese = { name: null, descriptionText: null, descriptionHtml: null };
assert.throws(() => validateSourceBoundFallbackReviews([absent], 10, english, html, new Map(), []), /absent Chinese/);
const deferred = { ...row, status: "deferred" as const, pendingSourceEvidence: ["unread original dependency"], originalSourceRead: false };
assert.equal(run([deferred]).accepted.length, 0);
assert.throws(() => validateSourceBoundFallbackReviews([row], 99, english, html, chinese, []), /unknown.*scope/);
console.log(`source-bound fallback portable tests passed (${rejected + 6} rejection checks)`);
