import assert from "node:assert/strict";
import { validateBoundaries, validateReviews, type Correction, type DuplicateResolution, type EnglishMechanics,
  type Review } from "./qa";
import { compareBody, type Candidate } from "./reconcile";

const sourceKey = "source-revision:test.txt:1:1";
const candidate = {
  sourceKey, file: "test.txt", ordinal: 1, startLine: 1, endLine: 5,
  rawHeader: "火术（Fire）（Test）", suspectedBoundaryLines: [],
  targetId: 1, rulebookId: 10, editionId: 5,
  publicationRulebookIds: [10], publicationEditionIds: [5], publicationBasis: ["test"],
  sourceBookLabels: ["Test"], field: "descriptionHtml", zhName: "火术", enName: "Fire",
  rawBody: "伤害：2d6\n|轮|火|", bodyText: "伤害：2d6\n|轮|火|",
  bodyHtml: "<pre>伤害：2d6\n|轮|火|</pre>",
  baselineName: "火焰术", baselineBody: "伤害：1d6\n|轮|水|",
  baselineKind: "I18nSpellText:zh:chm", nameClassification: "substantive",
  bodyClassification: "substantive", classification: "substantive",
  nameHintTargetIds: [], aliasHintTargetIds: [], problems: [], duplicateDecision: "single",
} satisfies Candidate;
const mechanics: EnglishMechanics = { castingTime: null, range: null, target: null,
  effect: null, area: null, duration: null, savingThrow: null, spellResistance: null,
  classLevels: [], domainLevels: [] };
const english = new Map([[1, { name: "Fire", description: "Deals 2d6 fire damage. Round | Fire |",
  rulebookId: 10, editionId: 5, mechanics }], [2, { name: "Uncovered", description: "No Chinese.",
  rulebookId: 10, editionId: 5, mechanics }]]);
const targets = new Map([[1, { rulebookId: 10, zhName: "火焰术", zhBody: "伤害：1d6\n|轮|水|" }],
  [2, { rulebookId: 10, zhName: null, zhBody: null }]]);
const review: Review = {
  sourceKey, targetId: 1, rulebookId: 10, mappingRevision: "map-revision",
  input: { zhName: candidate.zhName, bodyText: candidate.bodyText, bodyHtml: candidate.bodyHtml,
    baselineName: candidate.baselineName, baselineBody: candidate.baselineBody,
    englishName: "Fire", englishDescription: english.get(1)!.description, englishMechanics: mechanics },
  fields: {
    name: { status: "deferred", classification: "substantive", reason: "Name meaning needs review",
      reviewer: "test", englishEvidence: [] },
    descriptionHtml: { status: "accepted", classification: "substantive",
      reason: "The English damage and table entries align with the complete candidate.",
      reviewer: "test", englishEvidence: ["2d6 fire damage", "Round | Fire |"],
      replacementText: candidate.bodyHtml },
  },
};
const boundaryReview: Review = { ...review, fields: { ...review.fields,
  descriptionHtml: { status: "deferred", classification: "substantive", reviewer: "test",
    reason: "Unparsed header in source body", englishEvidence: [] } } };
const boundary = { sourceKey, file: "test.txt", line: 3, targetId: 1,
  sourceRevision: "source-revision", mappingRevision: "map-revision",
  status: "deferred" as const, reason: "Unparsed header inside spell body", reviewer: "test" };
const inventory = [{ file: "test.txt", unparsedSpans: [{ startLine: 3 }] }];
validateBoundaries([candidate], [boundaryReview], inventory, [boundary], "source-revision", "map-revision");
assert.throws(() => validateBoundaries([candidate], [review], inventory, [boundary],
  "source-revision", "map-revision"), /disagrees/);
assert.throws(() => validateBoundaries([candidate], [boundaryReview], inventory, [],
  "source-revision", "map-revision"), /count mismatch/);
const check = (value: Review, rows: Candidate[] = [candidate]) =>
  validateReviews(rows, [value], "map-revision", english, targets);
const result = check(review);
assert.equal(result.accepted.length, 1);
assert.equal(result.accepted[0]!.descriptionHtml, candidate.bodyHtml);
assert.equal(result.fallback.length, 3);
assert.equal((result.summary.sourceByPublication as Record<string, Record<string, number>>)["10"]?.substantive, 1);
assert.equal(result.fallback.find((row) => row.targetId === 1 && row.field === "name")?.status,
  "existing-Chinese");
assert.equal(result.fallback.filter((row) => row.targetId === 2 && row.status === "English").length, 2);
assert.throws(() => check({ ...review, mappingRevision: "stale" }), /stale publication map/);
assert.throws(() => check({ ...review, fields: { ...review.fields, name: {
  ...review.fields.name, reviewer: "queue:unreviewed" } } }), /unreviewed/);
assert.equal(validateReviews([candidate], [{ ...review, fields: { ...review.fields, name: {
  ...review.fields.name, reviewer: "queue:unreviewed" } } }], "map-revision", english, targets,
[], true).summary.pendingFields, 1);
assert.throws(() => check({ ...review, fields: { ...review.fields, name: {
  ...review.fields.name, status: "excluded" } } }), /changed name requires reject or defer/);
assert.throws(() => check({ ...review, input: { ...review.input, bodyText: "omitted table" } }), /stale bodyText/);
assert.throws(() => check({ ...review, input: { ...review.input, englishDescription: "old English" } }),
  /stale englishDescription/);
assert.throws(() => check({ ...review, input: { ...review.input, englishMechanics: {
  ...mechanics, duration: "old duration" } } }), /stale englishMechanics/);
assert.throws(() => check({ ...review, fields: { ...review.fields, descriptionHtml: {
  ...review.fields.descriptionHtml, englishEvidence: ["unrelated source"] } } }), /unaligned/);
assert.throws(() => check({ ...review, fields: { ...review.fields, descriptionHtml: {
  ...review.fields.descriptionHtml, englishEvidence: [] } } }), /without English evidence/);
assert.throws(() => check({ ...review, fields: { ...review.fields, descriptionHtml: {
  ...review.fields.descriptionHtml, replacementText: "<pre>corrected without record</pre>" } } }),
  /separately reviewed correction/);
const corrected: Review = { ...review, fields: { ...review.fields, descriptionHtml: {
  ...review.fields.descriptionHtml, replacementText: "<pre>伤害：2d6\n|轮|火焰|</pre>" } } };
const correction: Correction = { sourceKey, field: "descriptionHtml", sourceText: candidate.bodyHtml,
  baselineText: candidate.baselineBody, replacementText: corrected.fields.descriptionHtml.replacementText!,
  reason: "English explicitly identifies fire in the table", reviewer: "test",
  englishEvidence: ["Round | Fire |"] };
assert.equal(validateReviews([candidate], [corrected], "map-revision", english, targets,
  [correction]).accepted[0]!.descriptionHtml, correction.replacementText);
assert.throws(() => validateReviews([candidate], [corrected], "map-revision", english, targets,
  [{ ...correction, englishEvidence: ["unrelated"] }]), /unaligned correction/);
assert.throws(() => validateReviews([candidate], [review], "map-revision", english, targets,
  [correction]), /unused correction/);
assert.throws(() => check(review, [{ ...candidate, duplicateDecision: "review-required" }]), /unsafe accepted identity/);
const secondKey = "source-revision:other.txt:1:1";
const duplicateCandidates = [{ ...candidate, duplicateDecision: "review-required" as const },
  { ...candidate, sourceKey: secondKey, file: "other.txt", duplicateDecision: "review-required" as const }];
const duplicateReviews: Review[] = [review, { ...review, sourceKey: secondKey, fields: {
  name: { ...review.fields.name, status: "excluded" as const },
  descriptionHtml: { status: "excluded", classification: "substantive", reason: "Other source",
    reviewer: "test", englishEvidence: [] },
} }];
const resolution: DuplicateResolution = { targetId: 1, sourceKeys: [sourceKey, secondKey],
  selectedSourceKey: sourceKey, mappingRevision: "map-revision", reason: "Direct publication source",
  reviewer: "test" };
assert.throws(() => validateReviews(duplicateCandidates, duplicateReviews, "map-revision",
  english, targets), /unresolved duplicate target/);
assert.equal(validateReviews(duplicateCandidates, duplicateReviews, "map-revision", english,
  targets, [], false, [resolution]).accepted[0]!.descriptionHtml, candidate.bodyHtml);
assert.throws(() => validateReviews(duplicateCandidates, duplicateReviews, "map-revision",
  english, targets, [], false, [{ ...resolution, selectedSourceKey: secondKey }]), /unsafe accepted identity/);
assert.throws(() => validateReviews([candidate], [], "map-revision", english, targets), /review count/);
assert.equal(compareBody("甲\n|轮|火|", "甲\n|轮|"), "substantive");
assert.equal(compareBody("应受到2d6点伤害", "应受到1d6点伤害"), "substantive");
assert.equal(compareBody("可以攻击", "不可以攻击"), "substantive");
console.log("dice QA portable tests passed");
