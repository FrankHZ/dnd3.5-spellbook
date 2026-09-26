import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { loadEnglishRecords, validateBoundaries, validateFullBodyAudits, validateReviews, validateSourceCoverage, type Correction, type DuplicateResolution, type EnglishMechanics,
  type Review } from "./qa";
import { parseDiceFile } from "./parse";
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
const sourceBytes = Buffer.from("火术（Fire）（Test）\n变化系\n等级：法师1\n正文。", "utf8");
const sourceFiles = ["test.txt", "other.txt"].map((file) => ({ bytes: sourceBytes.length,
  parsed: parseDiceFile(file, sourceBytes) }));
const sourceInventory = sourceFiles.map(({ bytes, parsed }) => ({ file: parsed.file, bytes,
  encoding: parsed.encoding, lineCount: parsed.lineCount, preamble: parsed.preamble,
  recordCount: parsed.records.length, unparsedSpans: parsed.unparsedSpans }));
assert.equal(sourceFiles[0]!.parsed.records.length, 1);
validateSourceCoverage(sourceFiles, sourceInventory, [candidate,
  { ...candidate, file: "other.txt", sourceKey: "source-revision:other.txt:1:1" }]);
assert.throws(() => validateSourceCoverage(sourceFiles, sourceInventory.slice(0, 1), [candidate]),
  /source inventory file coverage mismatch/);
const mechanics: EnglishMechanics = { school: "Evocation", subschool: null,
  descriptors: ["Fire"], components: { verbal: 1, somatic: 1, material: 0,
    arcaneFocus: 0, divineFocus: 0, xp: 0, metaBreath: 0, trueName: 0,
    corrupt: 0, extra: null }, castingTime: null, range: null, target: null,
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
const fixtureDb = new Database(":memory:");
fixtureDb.exec(`CREATE TABLE dnd_rulebook (id INTEGER, dnd_edition_id INTEGER);
  CREATE TABLE dnd_spellschool (id INTEGER, name TEXT);
  CREATE TABLE dnd_spellsubschool (id INTEGER, name TEXT);
  CREATE TABLE dnd_spelldescriptor (id INTEGER, name TEXT);
  CREATE TABLE dnd_spell_descriptors (spell_id INTEGER, spelldescriptor_id INTEGER);
  CREATE TABLE dnd_spellclasslevel (id INTEGER, spell_id INTEGER, character_class_id INTEGER, level INTEGER, extra TEXT);
  CREATE TABLE dnd_spelldomainlevel (id INTEGER, spell_id INTEGER, domain_id INTEGER, level INTEGER, extra TEXT);
  CREATE TABLE dnd_spell (id INTEGER, name TEXT, rulebook_id INTEGER, school_id INTEGER,
    sub_school_id INTEGER, description TEXT, verbal_component INTEGER, somatic_component INTEGER,
    material_component INTEGER, arcane_focus_component INTEGER, divine_focus_component INTEGER,
    xp_component INTEGER, meta_breath_component INTEGER, true_name_component INTEGER,
    corrupt_component INTEGER, extra_components TEXT, casting_time TEXT, range TEXT, target TEXT,
    effect TEXT, area TEXT, duration TEXT, saving_throw TEXT, spell_resistance TEXT);
  INSERT INTO dnd_rulebook VALUES (10, 5);
  INSERT INTO dnd_spellschool VALUES (1, 'Evocation');
  INSERT INTO dnd_spelldescriptor VALUES (1, 'Fire');
  INSERT INTO dnd_spell_descriptors VALUES (1, 1);
  INSERT INTO dnd_spell VALUES (1, 'Fire', 10, 1, NULL, 'Deals 2d6 fire damage. Round | Fire |',
    1, 1, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);`);
const loadedEnglish = loadEnglishRecords(fixtureDb);
const dbBoundReview: Review = { ...review, input: { ...review.input,
  englishMechanics: loadedEnglish.get(1)!.mechanics } };
validateReviews([candidate], [dbBoundReview], "map-revision", loadedEnglish, targets);
fixtureDb.prepare("UPDATE dnd_spell SET verbal_component = 0 WHERE id = 1").run();
assert.throws(() => validateReviews([candidate], [dbBoundReview], "map-revision",
  loadEnglishRecords(fixtureDb), targets), /stale englishMechanics/);
fixtureDb.close();
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
const audit = { sourceKey, targetId: 1, effectiveText: candidate.bodyHtml,
  reviewer: "test-full-body", reason: "Checked damage, table, and complete effect against English",
  englishEvidence: ["Deals 2d6 fire damage"] };
assert.equal(validateFullBodyAudits([review], [audit]), 0);
assert.equal(validateFullBodyAudits([review], [], true), 1);
assert.throws(() => validateFullBodyAudits([review], []), /lack full-body audit/);
assert.throws(() => validateFullBodyAudits([review], [{ ...audit, effectiveText: "stale" }]),
  /stale full-body audited text/);
assert.throws(() => validateFullBodyAudits([review], [{ ...audit, englishEvidence: ["unrelated"] }]),
  /unaligned full-body English evidence/);
// A missing entire file's candidate/review pair passes review cardinality alone.
assert.equal(result.summary.reviewedOccurrences, 1);
assert.throws(() => validateSourceCoverage(sourceFiles, sourceInventory, [candidate]),
  /missing entire candidate file or occurrence other.txt/);
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
assert.throws(() => check({ ...review, input: { ...review.input, englishMechanics: {
  ...mechanics, components: { ...mechanics.components, verbal: 0 } } } }), /stale englishMechanics/);
assert.throws(() => check({ ...review, input: { ...review.input, englishMechanics: {
  ...mechanics, descriptors: [] } } }), /stale englishMechanics/);
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
