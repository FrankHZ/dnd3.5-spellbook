import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { escapedFallbackHtml, validateSourceBoundFallbackReviews, withSourceIssueNotes,
  type AcceptedBodyAmendment, type SourceBoundFallbackReview } from "./source-bound-fallback";
import { bindRestoredScQaInputs, validateReviews, validateFullBodyAudits, type EnglishRecord, type Review } from "./qa";
import type { Candidate } from "./reconcile";
import { projectEffectiveChinese, projectAcceptedBodyAmendments, reconcileEffectiveProjection, type ProjectionInputs } from "./effective";
import { assertCompletePdfBindings, assertEffectiveBaseline, effective879Baseline, currentEffectiveBaseline } from "./effective-cli";

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
assertEffectiveBaseline(effective879Baseline); assertEffectiveBaseline(effective879Baseline, true);
assertEffectiveBaseline(currentEffectiveBaseline);
rejects(() => assertEffectiveBaseline(currentEffectiveBaseline, true), /writer supports only/);
rejects(() => assertEffectiveBaseline("a".repeat(40)), /unsupported/);
rejects(() => assertEffectiveBaseline("latest"), /unsupported/);
const baseline = { revision: "a".repeat(40), native: { path: "synthetic/native.jsonl", rows: native.accepted },
  independent: { path: "synthetic/independent.jsonl", rows: [body, name] } };
const authority = { revision: "b".repeat(40), path: "synthetic/amendments.jsonl" };
const amendments: AcceptedBodyAmendment[] = [1, 2].map(targetId => {
  const selected = result.output.find(row => row.targetId === targetId)!;
  const review = structuredClone(body);
  review.targetId = targetId; review.before = selected.body.text;
  review.after = `完整修订正文${targetId}\n轮|伤害\n1|2d6`; review.proposedHtml = escapedFallbackHtml(review.after);
  review.rulePairs[0]!.chinese = `完整修订正文${targetId}`;
  review.input.chinese = { name: selected.name.text, descriptionText: selected.body.text, descriptionHtml: selected.body.html };
  review.fullBodyAudit = { ...review.fullBodyAudit!, beforeHtml: selected.body.html,
    effectiveText: review.after, effectiveHtml: review.proposedHtml };
  const owner = targetId === 1 ? "independent" : "native";
  return { targetId, rulebookId: 10, field: "descriptionText", prior: { owner, revision: baseline.revision,
    path: baseline[owner].path, acceptedRow: targetId === 1 ? body : native.accepted.find(row => row.targetId === 2)! }, review };
});
const amend = (rows = amendments, projection = result) => projectAcceptedBodyAmendments(input, projection, baseline, rows, authority);
const amended = amend();
assert.equal(amended.summary.accepted, result.summary.accepted);
assert.equal(amended.summary.complement, result.summary.complement);
assert.equal(amended.output[1]!.body.origin.kind, "native");
assert.equal(amended.output[1]!.body.origin.sourceKey, result.output[1]!.body.origin.sourceKey);
assert.deepEqual(amended.output[1]!.body.origin.activeAmendment!.prior.acceptedRow, native.accepted.find(row => row.targetId === 2));
assert.deepEqual(result.output[1]!.body.origin.activeAmendment, undefined); // Pure; frozen union retained.
const diff = reconcileEffectiveProjection(result.output, amended.output);
assert.deepEqual(diff.amendedBodies, [1, 2]); assert.deepEqual(diff.newlyAcceptedBodies, []);
assert.equal(diff.fallback.length, result.summary.complement);
const beforeNewBody = run([name]);
assert.deepEqual(reconcileEffectiveProjection(beforeNewBody.output, result.output).newlyAcceptedBodies, [1]);
const activeBindings = bindings.map(row => row.field === "descriptionHtml" || row.field === "descriptionText"
  ? { ...row, sourceKey: null, field: "descriptionText" } : row);
assertCompletePdfBindings(activeBindings, amended.output);
rejects(() => assertCompletePdfBindings(bindings, amended.output), /every accepted/);
rejects(() => amend([...amendments, amendments[0]!]), /duplicate/);
for (const mutate of [
  (row: AcceptedBodyAmendment) => { row.prior.owner = "native"; },
  (row: AcceptedBodyAmendment) => { row.prior.revision = "c".repeat(40); },
  (row: AcceptedBodyAmendment) => { row.prior.path = "wrong.jsonl"; },
  (row: AcceptedBodyAmendment) => { row.prior.acceptedRow.targetId = 99; },
  (row: AcceptedBodyAmendment) => { row.review.input.chinese.descriptionText = "stale"; },
  (row: AcceptedBodyAmendment) => { row.review.input.english.description = "stale"; },
  (row: AcceptedBodyAmendment) => { row.review.sourcePages = []; },
  (row: AcceptedBodyAmendment) => { row.review.fullBodyAudit!.currentHtmlReviewed = false; },
  (row: AcceptedBodyAmendment) => { row.review.status = "deferred"; },
  (row: AcceptedBodyAmendment) => { row.targetId = 99; },
]) {
  const broken = structuredClone(amendments); mutate(broken[0]!);
  rejects(() => amend(broken), /prior|stale|Chinese|English|provenance|audit|review|body|HTML/);
}
const forgedOwnership = structuredClone(result);
forgedOwnership.output[1]!.body.origin = { kind: "independent", sourceKey: null,
  sourceRef: "forged", sourcePages: body.sourcePages, status: "accepted" };
rejects(() => amend(amendments, forgedOwnership), /owner mismatch/);
const wrongName = structuredClone(amended.output); wrongName[0]!.name.text = "forged";
rejects(() => reconcileEffectiveProjection(result.output, wrongName), /names changed/);
const lostAmendment = structuredClone(amended.output); delete lostAmendment[0]!.body.origin.activeAmendment;
rejects(() => reconcileEffectiveProjection(result.output, lostAmendment), /unrelated accepted/);
const staleFallback = structuredClone(amended.output); staleFallback[2]!.body.html = "stale";
rejects(() => reconcileEffectiveProjection(result.output, staleFallback), /fallback changed/);
// Exercise the same exact-Git/direct-comparison boundary as the real union and
// amendment entry. A plausible accepted object or matching count is insufficient.
const authScratch = mkdtempSync(join(tmpdir(), "effective-input-binding-"));
try {
  const git = (...args: string[]) => execFileSync("git", ["-C", authScratch, ...args], { encoding: "utf8", stdio: "pipe" }).trim();
  git("init", "-q"); git("config", "user.email", "synthetic@example.invalid"); git("config", "user.name", "Synthetic fixture");
  git("config", "core.autocrlf", "false");
  const path = join(authScratch, "union.jsonl"), text = JSON.stringify(body) + "\n";
  writeFileSync(path, text, "utf8"); git("add", "union.jsonl"); git("commit", "-qm", "Synthetic accepted binding");
  const revision = git("rev-parse", "HEAD");
  const bind = (selected = revision) => bindRestoredScQaInputs(authScratch, selected, [path],
    ["9847e70236cd4bcd841347ed1b42b2f478826268:synthetic:1"], ["4cd593b44e73f591d46e2f35a90d882befc19702"]);
  assert.equal(bind().files, 1);
  writeFileSync(path, text.replace(/\n/g, "\r\n"), "utf8"); assert.equal(bind().files, 1);
  writeFileSync(path, JSON.stringify({ ...body, after: "same-count forged accepted body", accepted: true }) + "\n", "utf8");
  rejects(() => bind(), /changed restored input/);
  git("add", "union.jsonl"); git("commit", "-qm", "Synthetic unaccepted change");
  rejects(() => bind(revision), /changed restored input/);
  // Newly committed proposal bytes do not make a supported baseline.
  rejects(() => assertEffectiveBaseline(git("rev-parse", "HEAD")), /unsupported/);
  rmSync(path);
  rejects(() => bind(), /ENOENT/);
} finally { rmSync(authScratch, { recursive: true }); }
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
