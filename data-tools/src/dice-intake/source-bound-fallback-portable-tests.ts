import assert from "node:assert/strict";
import { escapedFallbackHtml, validateSourceBoundFallbackReviews, validateAcceptedBodyAmendments,
  withSourceIssueNotes, type AcceptedBodyBaseline, type AcceptedBodyAmendment,
  type ChineseTextBinding, type SourceBoundFallbackReview } from "./source-bound-fallback";
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
const retained = structuredClone(row);
retained.status = "accepted-with-source-issues";
retained.sourcePages[0]!.spanRefs.push([0, 1, 0]);
retained.retainedSourceIssues = { bodyText: after, sourceId: "synthetic", issues: [{ id: "synthetic-conflict",
  status: "source-unresolved", kind: "conflict", note: "原书同页两项陈述保留。", impact: "影响伤害与移动。",
  statements: ["造成2d6寒冷伤害。", "目标以半速移动。"].map((chinese, line) => ({ sourceId: "synthetic", pageIndex: 0,
    printedPage: 1, spanRefs: [[0, line, 0]], sourceQuote: "Synthetic original statement", chinese })) }] };
function refresh(item: SourceBoundFallbackReview): void {
  item.after = withSourceIssueNotes(item.retainedSourceIssues!); item.proposedHtml = escapedFallbackHtml(item.after);
  item.fullBodyAudit!.effectiveText = item.after; item.fullBodyAudit!.effectiveHtml = item.proposedHtml;
}
refresh(retained);
assert.equal(run([retained]).summary.sourceUnresolvedFields, 1, "adjacent distinct original spans remain valid");
assert.equal(run([retained]).summary.retainedSourceIssues, 1);
function retainedFails(change: (item: SourceBoundFallbackReview) => void, pattern: RegExp): void {
  const item = structuredClone(retained); change(item); assert.throws(() => run([item]), pattern); rejected++;
}
retainedFails(r => { delete r.retainedSourceIssues; }, /requires explicit/);
retainedFails(r => { r.status = "accepted"; }, /requires explicit/);
retainedFails(r => { r.after = after; r.proposedHtml = escapedFallbackHtml(after); }, /stale source issue notes/);
retainedFails(r => { r.fullBodyAudit = structuredClone(row.fullBodyAudit!); }, /audited full text/);
retainedFails(r => { r.retainedSourceIssues!.bodyText = "一道苍白光芒出现。造成2d6寒冷伤害。"; refresh(r); }, /missing from complete body/);
retainedFails(r => { r.retainedSourceIssues!.issues[0]!.statements.pop(); refresh(r); }, /opposing source/);
retainedFails(r => { const issue = r.retainedSourceIssues!.issues[0]!; issue.statements[1] = structuredClone(issue.statements[0]!); }, /duplicate opposing/);
retainedFails(r => { r.retainedSourceIssues!.issues[0]!.statements[1]!.spanRefs = [[0, 0, 0], [0, 0, 0]]; }, /duplicate source issue span/);
retainedFails(r => {
  const statements = r.retainedSourceIssues!.issues[0]!.statements;
  statements[0]!.spanRefs = [[0, 0, 0], [0, 1, 0]];
  statements[1]!.spanRefs = [[0, 1, 0], [0, 0, 0]];
}, /duplicate opposing/);
retainedFails(r => { r.retainedSourceIssues!.issues[0]!.statements[0]!.sourceId = "unknown-old-book"; }, /original page/);
retainedFails(r => { r.retainedSourceIssues!.issues[0]!.statements[0]!.spanRefs = [[9, 0, 0]]; }, /original page/);
retainedFails(r => { r.pendingSourceEvidence = ["unavailable external historical rule"]; }, /closed rule evidence/);
retainedFails(r => { delete r.fullBodyAudit; }, /full-body audit/);
// A real ambiguity may have only one statement. It must still close the same
// original-page, complete-body, note, HTML and input evidence gates.
for (const kind of ["missing-explanation", "interpretation"] as const) {
  const item = structuredClone(retained);
  const issue = item.retainedSourceIssues!.issues[0]!;
  issue.kind = kind; issue.statements = [issue.statements[0]!];
  issue.note = kind === "interpretation" ? "解释疑问：原句适用范围有待审核，正文保留原述。"
    : "原句缺少具体说明，正文保留原述。";
  refresh(item);
  assert.equal(run([item]).accepted.length, 1, `${kind} accepts one actual statement`);
  const reject = (change: (r: SourceBoundFallbackReview) => void, pattern: RegExp) => {
    const bad = structuredClone(item); change(bad); assert.throws(() => run([bad]), pattern); rejected++;
  };
  reject(r => { r.retainedSourceIssues!.issues[0]!.statements = []; }, /missing source issue statements/);
  reject(r => { r.retainedSourceIssues!.issues[0]!.note = ""; }, /missing source issue explanation/);
  reject(r => { r.after = after; r.proposedHtml = escapedFallbackHtml(after); }, /stale source issue notes/);
  reject(r => { r.pendingSourceEvidence = ["unavailable external rule"]; }, /closed rule evidence/);
  reject(r => { r.retainedSourceIssues!.issues[0]!.statements[0]!.sourceId = "unknown"; }, /original page/);
  reject(r => { r.input.english.mechanics.duration = "stale"; }, /full English/);
  reject(r => { r.input.chinese.descriptionHtml = "stale"; }, /full Chinese/);
  reject(r => { r.input.englishHtml = "stale"; }, /English HTML/);
  reject(r => { r.proposedHtml = "stale"; }, /projection mismatch/);
  reject(r => { delete r.fullBodyAudit; }, /full-body audit/);
  reject(r => { const statements = r.retainedSourceIssues!.issues[0]!.statements; statements.push(structuredClone(statements[0]!)); }, /duplicate opposing/);
  reject(r => { r.retainedSourceIssues!.issues[0]!.statements[0]!.spanRefs.push([0, 0, 0]); }, /duplicate source issue span/);
  reject(r => {
    const statements = r.retainedSourceIssues!.issues[0]!.statements;
    statements[0]!.spanRefs = [[0, 0, 0], [0, 1, 0]];
    statements.push({ ...structuredClone(statements[0]!), spanRefs: [[0, 1, 0], [0, 0, 0]] });
  }, /duplicate opposing/);
}
retainedFails(r => { (r.retainedSourceIssues!.issues[0] as unknown as { kind: string }).kind = "unverified-external-source"; }, /cannot claim resolution/);
const cross = structuredClone(retained);
cross.sourcePages.push({ sourceId: "comparison", pageIndex: 1, printedPage: 2, spanRefs: [[1, 0, 0], [1, 1, 0]] });
cross.retainedSourceIssues!.comparisonSourceIds = ["comparison"];
const crossIssue = cross.retainedSourceIssues!.issues[0]!;
crossIssue.note = "对照来源通常规定：造成1d6寒冷伤害。主来源原述保留，是否例外未决。";
crossIssue.statements[1] = { sourceId: "comparison", pageIndex: 1, printedPage: 2,
  spanRefs: [[1, 0, 0], [1, 1, 0]], sourceQuote: "Synthetic comparison rule", chinese: "造成1d6寒冷伤害。", contentLocation: "note" };
refresh(cross);
assert.equal(run([cross]).summary.sourceUnresolvedFields, 1, "explicit comparison remains in audited notes");
assert(!cross.retainedSourceIssues!.bodyText.includes(crossIssue.statements[1]!.chinese));
function crossFails(change: (item: SourceBoundFallbackReview) => void, pattern: RegExp): void {
  const item = structuredClone(cross); change(item); assert.throws(() => run([item]), pattern); rejected++;
}
crossFails(r => { delete r.retainedSourceIssues!.comparisonSourceIds; }, /explicit comparison note/);
crossFails(r => { r.retainedSourceIssues!.comparisonSourceIds = []; }, /explicit comparison sources/);
crossFails(r => { r.retainedSourceIssues!.comparisonSourceIds = ["unknown"]; }, /comparison source binding/);
crossFails(r => { r.retainedSourceIssues!.comparisonSourceIds = ["synthetic"]; }, /comparison source binding/);
crossFails(r => { r.retainedSourceIssues!.comparisonSourceIds!.push("comparison"); }, /comparison source binding/);
crossFails(r => {
  r.sourcePages.push({ sourceId: "unused", pageIndex: 0, printedPage: 1, spanRefs: [[0, 0, 0]] });
  r.retainedSourceIssues!.comparisonSourceIds!.push("unused");
}, /unused comparison/);
crossFails(r => { delete r.retainedSourceIssues!.issues[0]!.statements[1]!.contentLocation; }, /explicit comparison note/);
crossFails(r => { r.retainedSourceIssues!.issues[0]!.statements[1]!.contentLocation = "body"; }, /explicit comparison note/);
crossFails(r => { r.retainedSourceIssues!.issues[0]!.statements[0]!.contentLocation = "note"; }, /original page/);
crossFails(r => {
  (r.retainedSourceIssues!.issues[0]!.statements[0] as unknown as { contentLocation: null }).contentLocation = null;
}, /original page/);
crossFails(r => { r.retainedSourceIssues!.issues[0]!.statements[1]!.sourceId = "unknown"; }, /original page/);
crossFails(r => { r.retainedSourceIssues!.issues[0]!.statements[1]!.sourceId = "synthetic"; }, /original page/);
crossFails(r => { r.retainedSourceIssues!.issues[0]!.statements[1]!.printedPage = 3; }, /original page/);
crossFails(r => { r.retainedSourceIssues!.issues[0]!.statements[1]!.spanRefs = [[9, 0, 0]]; }, /original page/);
crossFails(r => { r.retainedSourceIssues!.issues[0]!.note = "已删除实际对照规则"; refresh(r); }, /comparison note/);
crossFails(r => { r.retainedSourceIssues!.bodyText += "造成1d6寒冷伤害。"; refresh(r); }, /copied into primary body/);
crossFails(r => { r.retainedSourceIssues!.issues[0]!.statements = [structuredClone(r.retainedSourceIssues!.issues[0]!.statements[1]!)]; }, /opposing source/);
crossFails(r => {
  const issue = r.retainedSourceIssues!.issues[0]!;
  issue.statements[0] = { ...structuredClone(issue.statements[1]!), spanRefs: [[1, 0, 0]] };
}, /lacks original body statement/);
crossFails(r => { r.retainedSourceIssues!.issues[0]!.statements.push(structuredClone(r.retainedSourceIssues!.issues[0]!.statements[1]!)); }, /duplicate opposing/);
crossFails(r => {
  const issue = r.retainedSourceIssues!.issues[0]!;
  issue.statements.push({ ...structuredClone(issue.statements[1]!), spanRefs: [[1, 1, 0], [1, 0, 0]] });
}, /duplicate opposing/);
crossFails(r => { r.retainedSourceIssues!.issues[0]!.statements[1]!.spanRefs.push([1, 0, 0]); }, /duplicate source issue span/);
for (const kind of ["missing-explanation", "interpretation"] as const) {
  crossFails(r => { r.retainedSourceIssues!.issues[0]!.kind = kind; }, /explicit comparison note/);
}
crossFails(r => { r.pendingSourceEvidence = ["unread external comparison"]; }, /closed rule evidence/);
crossFails(r => { r.originalSourceRead = false; }, /not actually reviewed/);
crossFails(r => { delete r.fullBodyAudit; }, /full-body audit/);
crossFails(r => { r.fullBodyAudit!.effectiveText = after; }, /audited full text/);
crossFails(r => { r.after += "stale note"; r.proposedHtml = escapedFallbackHtml(r.after); }, /stale source issue notes/);
crossFails(r => { r.input.english.mechanics.range = "stale"; }, /full English/);
crossFails(r => { r.input.chinese.descriptionHtml = "stale"; }, /full Chinese/);
crossFails(r => { r.input.englishHtml = "stale"; }, /English HTML/);
crossFails(r => { r.proposedHtml = "stale"; }, /projection mismatch/);
assert.throws(() => validateSourceBoundFallbackReviews([row], 99, english, html, chinese, []), /unknown.*scope/);
console.log(`source-bound fallback portable tests passed (${rejected + 6} rejection checks)`);

// Re-review binds a real accepted owner; the ordinary fallback path still rejects overlap.
const revision = "a".repeat(40);
const acceptedChinese = { ...old, descriptionHtml: escapedFallbackHtml(old.descriptionText) };
const nativePrior = { targetId: 1, rulebookId: 10, sourceKey: "synthetic-native-source", descriptionHtml: acceptedChinese.descriptionHtml };
const baseline: AcceptedBodyBaseline = { revision, native: { path: "native.jsonl", rows: [nativePrior] },
  independent: { path: "independent.jsonl", rows: [] } };
const amendment: AcceptedBodyAmendment = { targetId: 1, rulebookId: 10, field: "descriptionText",
  prior: { owner: "native", revision, path: "native.jsonl", acceptedRow: nativePrior },
  review: { ...structuredClone(row), input: { ...row.input, chinese: acceptedChinese },
    fullBodyAudit: { ...row.fullBodyAudit!, beforeHtml: acceptedChinese.descriptionHtml } } };
const amend = (rows: AcceptedBodyAmendment[], base = baseline,
  selected: Map<number, ChineseTextBinding> = new Map([[1, acceptedChinese]])) =>
  validateAcceptedBodyAmendments(rows, base, 10, english, html, selected);
assert.equal(amend([amendment]).summary.newAcceptedFields, 0);
assert.equal(amend([amendment]).amendments[0]!.prior.owner, "native");
assert.throws(() => validateSourceBoundFallbackReviews([amendment.review], 10, english, html,
  new Map([[1, acceptedChinese]]), baseline.native.rows), /overlaps/);
const independentPrior = { ...structuredClone(row), after: old.descriptionText, proposedHtml: acceptedChinese.descriptionHtml };
const independentBase: AcceptedBodyBaseline = { revision, native: { path: "native.jsonl", rows: [] },
  independent: { path: "independent.jsonl", rows: [independentPrior] } };
const independentAmendment = { ...amendment, prior: { owner: "independent" as const, revision,
  path: "independent.jsonl", acceptedRow: independentPrior } };
assert.equal(amend([independentAmendment], independentBase).amendments[0]!.prior.owner, "independent");
let amendmentRejected = 0;
function amendmentFails(change: (item: AcceptedBodyAmendment) => void, pattern: RegExp) {
  const item = structuredClone(amendment); change(item); assert.throws(() => amend([item]), pattern); amendmentRejected++;
}
amendmentFails(a => { a.prior.revision = "b".repeat(40); }, /stale prior.*revision/);
amendmentFails(a => { a.prior.path = "other.jsonl"; }, /stale prior.*path/);
amendmentFails(a => { (a.prior.acceptedRow as typeof nativePrior).descriptionHtml += "stale"; }, /stale prior.*row/);
amendmentFails(a => { (a.prior.acceptedRow as typeof nativePrior).sourceKey = "relabeled"; }, /stale prior.*row/);
amendmentFails(a => { a.prior.owner = "independent"; }, /missing.*prior/);
amendmentFails(a => { a.review.targetId = 2; }, /unrelated/);
amendmentFails(a => { a.targetId = 2; a.review.targetId = 2; }, /missing.*prior/);
amendmentFails(a => { (a as unknown as {field:string}).field = "name"; }, /restricted to body/);
amendmentFails(a => { a.review.field = "name"; }, /unrelated/);
amendmentFails(a => { a.review.before = "stale"; }, /current-before/);
amendmentFails(a => { a.review.input.english.mechanics.range = "new mechanics"; }, /full English/);
amendmentFails(a => { delete a.review.fullBodyAudit; }, /full-body audit/);
amendmentFails(a => { a.review.fullBodyAudit!.beforeHtml = null; }, /audited old HTML/);
amendmentFails(a => { a.review.pendingSourceEvidence = ["unread original"]; }, /closed rule evidence/);
amendmentFails(a => { a.review.originalSourceRead = false; }, /not actually reviewed/);
amendmentFails(a => { a.review.sourcePages = []; }, /provenance/);
amendmentFails(a => { a.review.status = "deferred"; }, /complete reviewed replacement/);
assert.throws(() => amend([amendment, amendment]), /duplicate.*amendment/);
assert.throws(() => amend([amendment], { ...baseline, revision: "floating-main" }), /exact.*revision/);
assert.throws(() => amend([amendment], { ...baseline, native: { ...baseline.native, rows: [] } }), /missing.*prior/);
assert.throws(() => amend([amendment], { ...baseline, native: { ...baseline.native, rows: [nativePrior, nativePrior] } }), /duplicate native/);
assert.throws(() => amend([amendment], { ...baseline, independent: independentBase.independent }), /overlapping accepted baseline/);
assert.throws(() => amend([independentAmendment], { ...independentBase,
  independent: { ...independentBase.independent, rows: [independentPrior, independentPrior] } }), /duplicate independent/);
assert.throws(() => amend([amendment], baseline, new Map([[1, { ...acceptedChinese, descriptionText: "changed" }]])), /stale selected native text/);
assert.throws(() => amend([amendment], baseline, new Map([[1, { ...acceptedChinese, descriptionHtml: "changed" }]])), /stale selected native HTML/);
assert.throws(() => amend([independentAmendment], independentBase, new Map([[1, { ...acceptedChinese, descriptionText: "changed" }]])), /stale selected independent text/);
const priorIssuesBase: AcceptedBodyBaseline = { ...independentBase,
  independent: { ...independentBase.independent, rows: [retained] } };
const selectedIssues = { ...acceptedChinese, descriptionText: retained.after, descriptionHtml: retained.proposedHtml! };
const issuesAmendment: AcceptedBodyAmendment = { ...independentAmendment,
  prior: { ...independentAmendment.prior, acceptedRow: retained }, review: {
    ...amendment.review, before: retained.after, input: { ...row.input, chinese: selectedIssues },
    fullBodyAudit: { ...row.fullBodyAudit!, beforeHtml: retained.proposedHtml } } };
assert.throws(() => amend([issuesAmendment], priorIssuesBase, new Map([[1, selectedIssues]])), /cannot retire prior source issues/);
const changedPriorIssue = structuredClone(issuesAmendment);
changedPriorIssue.review.retainedSourceIssues = structuredClone(retained.retainedSourceIssues!);
changedPriorIssue.review.retainedSourceIssues.issues[0]!.status = "resolved" as "source-unresolved";
assert.throws(() => amend([changedPriorIssue], priorIssuesBase, new Map([[1, selectedIssues]])), /cannot change prior unresolved/);
const keptIssues = structuredClone(issuesAmendment);
keptIssues.review.retainedSourceIssues = structuredClone(retained.retainedSourceIssues!);
keptIssues.review.sourcePages = structuredClone(retained.sourcePages);
keptIssues.review.retainedSourceIssues.bodyText += " 保留光芒。";
keptIssues.review.status = "accepted-with-source-issues";
refresh(keptIssues.review);
assert.equal(amend([keptIssues], priorIssuesBase, new Map([[1, selectedIssues]])).summary.retainedSourceIssues, 1);
const secondPrior = { ...independentPrior, targetId: 2 };
const mixedBase = { ...baseline, independent: { ...baseline.independent, rows: [secondPrior] } };
const secondAmendment = { ...independentAmendment, targetId: 2,
  prior: { ...independentAmendment.prior, acceptedRow: secondPrior },
  review: { ...independentAmendment.review, targetId: 2 } };
const mixedResult = validateAcceptedBodyAmendments([amendment, secondAmendment], mixedBase, 10,
  new Map([[1, en], [2, en]]), new Map([[1, row.input.englishHtml], [2, row.input.englishHtml]]),
  new Map([[1, acceptedChinese], [2, acceptedChinese]]));
assert.deepEqual(mixedResult.amendments.map(a => a.prior.owner), ["native", "independent"]);
assert.equal(mixedResult.summary.newAcceptedFields, 0);
console.log(`accepted body amendment portable tests passed (${amendmentRejected + 11} rejection checks)`);

// Re-review the selected amendment without relabeling its native origin.
const currentRevision = "c".repeat(40), currentPath = "current-amendments.jsonl";
const currentBase: AcceptedBodyBaseline = { ...baseline,
  currentAmendments: { revision: currentRevision, path: currentPath, rows: [amendment] } };
const currentChinese: ChineseTextBinding = { ...acceptedChinese, descriptionText: amendment.review.after,
  descriptionHtml: amendment.review.proposedHtml };
const nextAmendment = structuredClone(amendment);
nextAmendment.prior.currentAmendment = { revision: currentRevision, path: currentPath, acceptedRow: amendment };
nextAmendment.review.input.chinese = currentChinese;
nextAmendment.review.before = currentChinese.descriptionText;
nextAmendment.review.after += " Further reviewed flavor.";
nextAmendment.review.proposedHtml = escapedFallbackHtml(nextAmendment.review.after);
nextAmendment.review.fullBodyAudit = { ...nextAmendment.review.fullBodyAudit!,
  beforeHtml: currentChinese.descriptionHtml, effectiveText: nextAmendment.review.after,
  effectiveHtml: nextAmendment.review.proposedHtml };
const next = (item = nextAmendment, base = currentBase, selected = currentChinese) =>
  amend([item], base, new Map([[1, selected]]));
assert.equal(next().summary.newAcceptedFields, 0);
assert.equal(next().amendments[0]!.prior.owner, "native");
assert.throws(() => validateSourceBoundFallbackReviews([nextAmendment.review], 10, english,
  html, new Map([[1, currentChinese]]), baseline.native.rows), /overlaps/);
let currentRejected = 0;
function currentFails(change: (item: AcceptedBodyAmendment) => void, pattern: RegExp) {
  const item = structuredClone(nextAmendment); change(item);
  assert.throws(() => next(item), pattern); currentRejected++;
}
currentFails(a => { delete a.prior.currentAmendment; }, /missing current amendment/);
currentFails(a => { a.prior.currentAmendment!.revision = revision; }, /stale current amendment revision/);
currentFails(a => { a.prior.currentAmendment!.path = "wrong.jsonl"; }, /stale current amendment path/);
currentFails(a => { a.prior.currentAmendment!.acceptedRow.review.after += "forged"; }, /stale current amendment row/);
currentFails(a => { a.prior.owner = "independent"; }, /missing.*prior/);
assert.throws(() => next(nextAmendment, baseline), /unrelated current amendment/);
assert.throws(() => next(nextAmendment, currentBase, acceptedChinese), /stale selected current amendment text/);
assert.throws(() => next(nextAmendment, currentBase, { ...currentChinese, descriptionHtml: "stale" }), /stale selected current amendment HTML/);
assert.throws(() => next(nextAmendment, { ...currentBase, currentAmendments: {
  ...currentBase.currentAmendments!, rows: [amendment, amendment] } }), /duplicate current amendment/);
assert.throws(() => next(nextAmendment, { ...currentBase, currentAmendments: {
  ...currentBase.currentAmendments!, revision: "floating-main" } }), /exact distinct current/);
const forgedLayer = structuredClone(currentBase);
forgedLayer.currentAmendments!.rows[0]!.prior.acceptedRow = { ...nativePrior, sourceKey: "forged" };
assert.throws(() => next(nextAmendment, forgedLayer), /stale prior accepted row/);
const nestedLayer = structuredClone(currentBase);
nestedLayer.currentAmendments!.rows[0]!.prior.currentAmendment = nextAmendment.prior.currentAmendment!;
assert.throws(() => next(nextAmendment, nestedLayer), /nested current/);
// This issue was introduced by the current amendment, not the original native row.
const currentIssueAmendment = structuredClone(amendment);
currentIssueAmendment.review = { ...structuredClone(keptIssues.review),
  before: acceptedChinese.descriptionText, input: { ...keptIssues.review.input, chinese: acceptedChinese },
  fullBodyAudit: { ...keptIssues.review.fullBodyAudit!, beforeHtml: acceptedChinese.descriptionHtml } };
const currentIssuesBase: AcceptedBodyBaseline = { ...baseline,
  currentAmendments: { revision: currentRevision, path: currentPath, rows: [currentIssueAmendment] } };
const currentIssuesChinese = { ...acceptedChinese, descriptionText: currentIssueAmendment.review.after,
  descriptionHtml: currentIssueAmendment.review.proposedHtml };
const nextIssues = structuredClone(nextAmendment);
nextIssues.prior.currentAmendment = { revision: currentRevision, path: currentPath, acceptedRow: currentIssueAmendment };
assert.throws(() => next(nextIssues, currentIssuesBase, currentIssuesChinese), /cannot retire prior source issues/);
const changedCurrentIssue = structuredClone(nextIssues);
changedCurrentIssue.review.retainedSourceIssues = structuredClone(currentIssueAmendment.review.retainedSourceIssues!);
changedCurrentIssue.review.retainedSourceIssues.issues[0]!.note += "forged";
assert.throws(() => next(changedCurrentIssue, currentIssuesBase, currentIssuesChinese), /cannot change prior unresolved/);
console.log(`current body amendment portable tests passed (${currentRejected + 10} rejection checks)`);
