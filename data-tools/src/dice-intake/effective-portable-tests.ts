import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { escapedFallbackHtml, validateSourceBoundFallbackReviews, withSourceIssueNotes,
  type SourceBoundFallbackReview } from "./source-bound-fallback";
import { validateReviews, validateFullBodyAudits, type EnglishRecord, type Review } from "./qa";
import type { Candidate } from "./reconcile";
import { projectEffectiveChinese, type ProjectionInputs } from "./effective";
import { assertCompletePdfBindings } from "./effective-cli";

const en: EnglishRecord = { name: "Cold Touch", rulebookId: 10, editionId: 5,
  description: "Deals 2d6 cold damage. Round | Damage |",
  mechanics: { school: "Evocation", subschool: null, descriptors: ["Cold"],
    components: { verbal: 1, somatic: 1, material: 0, arcaneFocus: 0, divineFocus: 0,
      xp: 0, metaBreath: 0, trueName: 0, corrupt: 0, extra: null }, castingTime: null,
    range: null, target: null, effect: null, area: null, duration: null, savingThrow: null,
    spellResistance: null, classLevels: [], domainLevels: [] } };
const table = "<p>保留正文</p><table><tr><td>轮</td><td>伤害</td></tr><tr><td>1</td><td>2d6</td></tr></table>";
const input: ProjectionInputs = { rulebookId: 10,
  english: new Map([1, 2, 3, 4, 5].map(id => [id, structuredClone(en)])),
  englishHtml: new Map([1, 2, 3, 4, 5].map(id => [id, "<p>Deals 2d6 cold damage.</p>"])),
  chinese: new Map([[1, { name: "旧名一", descriptionText: "旧正文一", descriptionHtml: "<p>旧正文一</p>" }],
    [2, { name: "旧名二", descriptionText: "旧正文二", descriptionHtml: "<p>旧正文二</p>" }],
    [3, { name: "保留名", descriptionText: "保留正文轮伤害12d6", descriptionHtml: table }],
    [5, { name: "只保留名称", descriptionText: null, descriptionHtml: null }]]),
  chineseSources: new Map([[1, "chm:1"], [2, "chm:2"], [3, "chm:3"], [5, "chm:5"]]) };
const candidates: Candidate[] = [1, 2].map(id => ({
  sourceKey: `synthetic:test.txt:${id}:1`, file: "test.txt", ordinal: id, startLine: id, endLine: id,
  rawHeader: "synthetic", suspectedBoundaryLines: [], targetId: id, rulebookId: 10, editionId: 5,
  publicationRulebookIds: [10], publicationEditionIds: [5], publicationBasis: ["synthetic"],
  sourceBookLabels: ["synthetic"], field: "descriptionHtml", enName: en.name,
  zhName: id === 1 ? "新名一" : "旧名二", rawBody: id === 1 ? "旧正文一" : "新正文二 <&>\n轮|伤害",
  bodyText: id === 1 ? "旧正文一" : "新正文二 <&>\n轮|伤害",
  bodyHtml: escapedFallbackHtml(id === 1 ? "旧正文一" : "新正文二 <&>\n轮|伤害"),
  baselineName: input.chinese.get(id)!.name, baselineBody: input.chinese.get(id)!.descriptionText,
  baselineKind: "I18nSpellText:zh:chm", nameClassification: id === 1 ? "substantive" : "exact",
  bodyClassification: id === 1 ? "exact" : "substantive", classification: "substantive",
  nameHintTargetIds: [], aliasHintTargetIds: [], problems: [], duplicateDecision: "single",
}));
const reviews: Review[] = candidates.map(row => ({ sourceKey: row.sourceKey, targetId: row.targetId,
  rulebookId: 10, mappingRevision: "synthetic-map", input: {
    zhName: row.zhName, bodyText: row.bodyText, bodyHtml: row.bodyHtml,
    baselineName: row.baselineName, baselineBody: row.baselineBody,
    englishName: en.name, englishDescription: en.description, englishMechanics: en.mechanics },
  fields: {
    name: { status: row.targetId === 1 ? "accepted" : "excluded", classification: row.nameClassification!,
      reason: "Synthetic reviewed name", reviewer: "synthetic-reviewer", englishEvidence: [en.name],
      ...(row.targetId === 1 ? { replacementText: row.zhName! } : {}) },
    descriptionHtml: { status: row.targetId === 2 ? "accepted" : "excluded", classification: row.bodyClassification!,
      reason: "Synthetic reviewed complete body", reviewer: "synthetic-reviewer", englishEvidence: [en.description],
      ...(row.targetId === 2 ? { replacementText: row.bodyHtml } : {}) },
  } }));
const native = validateReviews(candidates, reviews, "synthetic-map", input.english,
  new Map([...input.english].map(([id]) => [id, { rulebookId: 10,
    zhName: input.chinese.get(id)?.name ?? null, zhBody: input.chinese.get(id)?.descriptionText ?? null }])));
validateFullBodyAudits(reviews, [{ sourceKey: reviews[1]!.sourceKey, targetId: 2,
  effectiveText: candidates[1]!.bodyHtml, reason: "Synthetic full body", reviewer: "synthetic-reviewer",
  englishEvidence: [en.description] }]);
const body: SourceBoundFallbackReview = { sourceKey: null, targetId: 1, rulebookId: 10,
  field: "descriptionText", before: "旧正文一", after: "完整新正文一\n轮|伤害\n1|2d6",
  proposedHtml: escapedFallbackHtml("完整新正文一\n轮|伤害\n1|2d6"),
  input: { chinese: input.chinese.get(1)!, english: en, englishHtml: input.englishHtml.get(1)! },
  sourceRef: "synthetic-review:1", sourcePages: [{ sourceId: "synthetic", pageIndex: 0, printedPage: 1, spanRefs: [[0, 0, 0]] }],
  status: "accepted", reviewer: "synthetic-reviewer", reason: "Full synthetic field reviewed", originalSourceRead: true,
  rulePairs: [{ english: "Deals 2d6 cold damage.", chinese: "完整新正文一", sourceId: "synthetic", printedPage: 1, sourceQuote: "Synthetic quote" }],
  fullBodyAudit: { effectiveText: "完整新正文一\n轮|伤害\n1|2d6", effectiveHtml: escapedFallbackHtml("完整新正文一\n轮|伤害\n1|2d6"),
    beforeHtml: input.chinese.get(1)!.descriptionHtml, reviewer: "synthetic-reviewer", reason: "Read old and new full HTML",
    englishEvidence: [en.description], currentHtmlReviewed: true, proposedHtmlReviewed: true } };
const name: SourceBoundFallbackReview = { ...body, targetId: 2, field: "name", before: "旧名二", after: "新名二",
  proposedHtml: null, input: { chinese: input.chinese.get(2)!, english: en, englishHtml: input.englishHtml.get(2)! },
  rulePairs: [{ english: en.name, chinese: "新名二", sourceId: "synthetic", printedPage: 1, sourceQuote: "Synthetic name" }] };
delete name.fullBodyAudit;
const run = (independent = [body, name], current = input, exported = native.accepted) =>
  projectEffectiveChinese(current, native, exported, independent);
const result = run();
assert.deepEqual(result.output.map(row => [row.targetId, row.name.origin.kind, row.body.origin.kind]),
  [[1, "native", "independent"], [2, "independent", "native"], [3, "chm", "chm"], [4, "english", "english"], [5, "chm", "english"]]);
assert.equal(result.output[0]!.body.html, body.proposedHtml);
assert.equal(result.output[1]!.body.text, candidates[1]!.bodyText);
assert.equal(result.output[2]!.body.html, table);
assert.equal(result.output[4]!.name.text, "只保留名称");
assert.equal(result.summary.accepted, 4); assert.equal(result.summary.complement, 6);
assert.equal(result.summary.english, 3); assert.equal(result.summary.changed, 4);
// One accepted field never consumes the other field's retained CHM.
assert.equal(run([]).output[0]!.body.text, "旧正文一");
assert.equal(run([]).output[1]!.name.text, "旧名二");
const noted = structuredClone(body);
noted.status = "accepted-with-source-issues";
noted.retainedSourceIssues = { bodyText: noted.after, sourceId: "synthetic", issues: [{ id: "synthetic-question",
  status: "source-unresolved", kind: "interpretation", note: "仍需外部审核", impact: "范围疑义保留",
  statements: [{ ...noted.sourcePages[0]!, sourceQuote: "Synthetic quote", chinese: "完整新正文一" }] }] };
noted.after = withSourceIssueNotes(noted.retainedSourceIssues);
noted.proposedHtml = escapedFallbackHtml(noted.after);
noted.fullBodyAudit!.effectiveText = noted.after; noted.fullBodyAudit!.effectiveHtml = noted.proposedHtml;
assert.equal(run([noted]).output[0]!.body.text, noted.after);
let rejections = 0;
function rejects(fn: () => unknown, pattern: RegExp) { assert.throws(fn, pattern); rejections++; }
for (const status of ["deferred", "rejected", "excluded"] as const) {
  rejects(() => run([{ ...body, status }]), /unaccepted/);
}
rejects(() => run([body, body]), /duplicate/);
rejects(() => run([{ ...name, targetId: 1 }]), /stale|overlaps/);
rejects(() => run([{ ...body, targetId: 99 }]), /target/);
rejects(() => run([{ ...body, rulebookId: 20 }]), /identity/);
rejects(() => run([{ ...body, field: "unknown" as "name" }]), /field/);
rejects(() => run([{ ...body, after: "" }]), /empty/);
rejects(() => run([{ ...body, reviewer: "queue:pending" }]), /unreviewed/);
rejects(() => run([{ ...body, sourcePages: [] }]), /provenance/);
rejects(() => run([{ ...body, proposedHtml: "<pre>stale</pre>" }]), /projection/);
rejects(() => run([{ ...body, input: { ...body.input, english: { ...en, description: "stale" } } }]), /English/);
rejects(() => run([{ ...body, input: { ...body.input, chinese: { ...body.input.chinese, name: "stale" } } }]), /Chinese/);
rejects(() => run([body], { ...input, englishHtml: new Map() }), /HTML/);
rejects(() => run([], { ...input, chineseSources: new Map() }), /CHM source/);
rejects(() => run([], { ...input, chinese: new Map([...input.chinese].map(([id, row]) =>
  [id, id === 3 ? { ...row, descriptionHtml: "<p>保留正文</p>" } : row])) }), /HTML\/text mismatch/);
const overlap = structuredClone(body);
overlap.targetId = 2; overlap.before = "旧正文二"; overlap.input.chinese = input.chinese.get(2)!;
overlap.fullBodyAudit!.beforeHtml = input.chinese.get(2)!.descriptionHtml;
rejects(() => run([overlap]), /overlaps native/);
rejects(() => run([], input, [{ ...native.accepted[0]!, name: "forged" }]), /formal QA/);
rejects(() => run([], input, [...native.accepted, native.accepted[0]!]), /formal QA/);
// Structural acceptance alone cannot replace caller-authenticated exports.
assert.equal(validateSourceBoundFallbackReviews([body], 10, input.english, input.englishHtml, input.chinese, native.accepted).accepted.length, 1);
const bindings = result.output.flatMap(row => (["name", "body"] as const).flatMap(field => {
  const origin = row[field].origin;
  return origin.kind === "native" || origin.kind === "independent" ? [{ targetId: row.targetId,
    field: field === "name" ? "name" : origin.kind === "native" ? "descriptionHtml" : "descriptionText", sourceKey: origin.sourceKey }] : [];
}));
assertCompletePdfBindings(bindings, result.output);
rejects(() => assertCompletePdfBindings(bindings.slice(1), result.output), /every accepted/);
rejects(() => assertCompletePdfBindings([...bindings, bindings[0]!], result.output), /every accepted/);
rejects(() => assertCompletePdfBindings([{ ...bindings[0]!, field: "unknown" }, ...bindings.slice(1)], result.output), /illegal/);
// Model the actual CHM importer's delete-all-Chinese behavior in disposable SQL.
// A separate variant alone cannot protect overlay from a later complete rebuild.
const db = new Database(":memory:");
try {
  db.exec("CREATE TABLE texts(id INTEGER, lang TEXT, variant TEXT, body TEXT); CREATE TABLE search(body TEXT)");
  const insert = db.prepare("INSERT INTO texts VALUES (?, 'zh', ?, ?)");
  const chm = () => { db.exec("DELETE FROM texts WHERE lang='zh'"); insert.run(1, "chm", "旧正文一"); };
  const overlay = () => insert.run(1, "effective", result.output[0]!.body.text);
  const search = () => { db.exec("DELETE FROM search; INSERT INTO search SELECT body FROM texts WHERE variant='effective'"); };
  chm(); overlay(); search();
  assert.equal((db.prepare("SELECT body FROM search").get() as { body: string }).body, body.after);
  chm(); search(); assert.equal((db.prepare("SELECT count(*) AS n FROM search").get() as { n: number }).n, 0);
  overlay(); search(); chm(); // search built too early now points at vanished overlay.
  assert.equal((db.prepare("SELECT count(*) AS n FROM texts WHERE variant='effective'").get() as { n: number }).n, 0);
  assert.equal((db.prepare("SELECT body FROM search").get() as { body: string }).body, body.after);
} finally { db.close(); }
console.log(`effective Chinese portable tests passed (${rejections} rejection checks; import order counterexamples)`);

// Reuse this formally validated synthetic projection in the actual writer suite.
export { result as syntheticProjection, run as projectSynthetic, body as syntheticIndependent };
