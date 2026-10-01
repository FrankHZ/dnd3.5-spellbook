import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import "./source-bound-fallback-portable-tests";
import { escapedFallbackHtml, type SourceBoundFallbackReview } from "./source-bound-fallback";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { bindRestoredScQaInputs, candidateRulebook, loadEnglishRecords, selectRulebookScope, validateBoundaries, validateFullBodyAudits, validateReviews, validateSourceCoverage, writeQaOutputs, type Correction, type DuplicateResolution, type EnglishMechanics,
  type Review } from "./qa";
import { parseDiceFile } from "./parse";
import { compareBody, reconcile, type Candidate } from "./reconcile";

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
fixtureDb.exec(`CREATE TABLE dnd_rulebook (id INTEGER, dnd_edition_id INTEGER, name TEXT);
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
  INSERT INTO dnd_rulebook VALUES (10, 5, 'Test');
  INSERT INTO dnd_spellschool VALUES (1, 'Evocation');
  INSERT INTO dnd_spelldescriptor VALUES (1, 'Fire');
  INSERT INTO dnd_spell_descriptors VALUES (1, 1);
  INSERT INTO dnd_spell VALUES (1, 'Fire', 10, 1, NULL, 'Deals 2d6 fire damage. Round | Fire |',
    1, 1, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);`);
const loadedEnglish = loadEnglishRecords(fixtureDb);
const rulesFixtureBytes = fixtureDb.serialize();
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

// Ownership uses the matched target even when publication labels mention another book.
assert.equal(candidateRulebook({ ...candidate, publicationRulebookIds: [20] }), 10);
assert.equal(candidateRulebook({ ...candidate, targetId: null, rulebookId: null }), 10);
assert.equal(candidateRulebook({ ...candidate, targetId: null, publicationRulebookIds: [10, 20] }), null);
assert.equal(candidateRulebook({ ...candidate, targetId: null, publicationRulebookIds: [] }), null);
assert.equal(candidateRulebook({ ...candidate, targetId: null,
  problems: ["unmapped-publication-label"] }), null);
const scoped = selectRulebookScope(10, duplicateCandidates, targets, []);
assert.equal(scoped.candidates.length, 2);
assert.equal(scoped.targets.size, 2); // Includes the target without any candidate.
assert.throws(() => validateReviews(scoped.candidates, [review], "map-revision", english,
  scoped.targets, [], false, [resolution]), /review count/);
assert.throws(() => selectRulebookScope(99, duplicateCandidates, targets, []), /empty or unknown/);
const scopedBoundaryInventory: Parameters<typeof selectRulebookScope>[3] = [{ ...sourceInventory[0]!, unparsedSpans: [
  { startLine: 3, endLine: 3, disposition: "review-required-unparsed-boundary", rawText: "test" },
] }];
const scopedBoundary = selectRulebookScope(10, [candidate], targets, scopedBoundaryInventory);
validateBoundaries(scopedBoundary.candidates, [boundaryReview], scopedBoundary.inventory,
  [boundary], "source-revision", "map-revision");
assert.throws(() => validateBoundaries(scopedBoundary.candidates, [boundaryReview], scopedBoundary.inventory,
  [], "source-revision", "map-revision"), /count mismatch/);

// Exercise the real CLI: global source validation precedes book-only semantic validation.
const fixtureRoot = mkdtempSync(join(tmpdir(), "dice-book-qa-"));
try {
  const dataRoot = join(fixtureRoot, "data");
  const intakeDir = join(dataRoot, "dice-intake");
  const sourceDir = join(dataRoot, "spells-dice-db-by-mo");
  const bookDir = join(dataRoot, "dice-qa", "books", "10");
  const reportDir = join(bookDir, "out");
  for (const dir of [intakeDir, sourceDir, bookDir, join(dataRoot, "chm-mapping")]) mkdirSync(dir, { recursive: true });
  const saveRows = (path: string, values: unknown[]) =>
    writeFileSync(path, values.map((value) => JSON.stringify(value)).join("\n") + "\n");
  const otherBytes = Buffer.from(sourceBytes.toString("utf8").replace("（Test）", "（Other）"));
  writeFileSync(join(sourceDir, "test.txt"), sourceBytes);
  writeFileSync(join(sourceDir, "other.txt"), otherBytes);
  const mappings = [
    { file: "Test.txt", rulebookIds: [10], editionIds: [5], status: "resolved", basis: "synthetic" },
    { file: "Other.txt", rulebookIds: [20], editionIds: [5], status: "resolved", basis: "synthetic" },
  ];
  writeFileSync(join(intakeDir, "publication-map.json"), JSON.stringify(mappings));
  writeFileSync(join(dataRoot, "chm-mapping", "enName-aliases-global.json"), "{}");
  writeFileSync(join(intakeDir, "surviving.jsonl"), '{"value":1}\n');
  const git = (...args: string[]) => execFileSync("git", ["-C", dataRoot, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init"); git("add", ".");
  git("-c", "user.name=Portable Test", "-c", "user.email=test@example.invalid", "commit", "-m", "fixture");
  const revision = git("rev-parse", "HEAD");
  const restoredSourceKeys = ["9847e70236cd4bcd841347ed1b42b2f478826268:test.txt:1:1"];
  const restoredMappings = ["4cd593b44e73f591d46e2f35a90d882befc19702"];
  const boundFiles = [join(sourceDir, "test.txt"), join(intakeDir, "publication-map.json"),
    join(dataRoot, "chm-mapping", "enName-aliases-global.json"), join(intakeDir, "surviving.jsonl")];
  const bind = () => bindRestoredScQaInputs(dataRoot, revision, boundFiles, restoredSourceKeys, restoredMappings);
  assert.deepEqual(bind(), { currentBaseline: revision, historicalSourceRevision: restoredSourceKeys[0]!.split(":")[0],
    historicalMappingRevision: restoredMappings[0], files: 4, historicalContinuityAuthenticated: false });
  writeFileSync(boundFiles[3]!, '{"value":1}\r\n');
  assert.equal(bind().files, 4, "Git text checkout line endings preserve the JSON input");
  writeFileSync(boundFiles[3]!, '{"value":1}\n');
  // Same location and byte length cannot hide changed source text.
  writeFileSync(boundFiles[0]!, sourceBytes.toString("utf8").replace("正文", "变文"));
  assert.throws(bind, /changed restored input/); writeFileSync(boundFiles[0]!, sourceBytes);
  writeFileSync(boundFiles[1]!, JSON.stringify([{ ...mappings[0], rulebookIds: [20] }, mappings[1]]));
  assert.throws(bind, /changed restored input/); writeFileSync(boundFiles[1]!, JSON.stringify(mappings));
  writeFileSync(boundFiles[2]!, '{"Fire":"Uncovered"}');
  assert.throws(bind, /changed restored input/); writeFileSync(boundFiles[2]!, "{}");
  assert.throws(() => bindRestoredScQaInputs(dataRoot, revision, [...boundFiles, join(dataRoot, "missing.json")],
    restoredSourceKeys, restoredMappings), /ENOENT/);
  const outside = join(fixtureRoot, "outside.json"); writeFileSync(outside, "{}");
  assert.throws(() => bindRestoredScQaInputs(dataRoot, revision, [...boundFiles, outside],
    restoredSourceKeys, restoredMappings), /private data root/);
  assert.throws(() => bindRestoredScQaInputs(dataRoot, "unknown-baseline", boundFiles,
    restoredSourceKeys, restoredMappings));
  assert.throws(() => bindRestoredScQaInputs(dataRoot, revision, boundFiles,
    [`${revision}:test.txt:1:1`], restoredMappings), /preserved source namespace/);
  assert.throws(() => bindRestoredScQaInputs(dataRoot, revision, boundFiles,
    restoredSourceKeys, [revision]), /preserved mapping namespace/);
  const rulesPath = join(fixtureRoot, "rules.sqlite");
  const contentPath = join(fixtureRoot, "content.sqlite");
  writeFileSync(rulesPath, rulesFixtureBytes);
  const rulesDb = new Database(rulesPath);
  rulesDb.exec(`INSERT INTO dnd_rulebook VALUES (20, 5, 'Other');
    INSERT INTO dnd_spell SELECT 2, 'Uncovered', 10, school_id, sub_school_id, description,
    verbal_component, somatic_component, material_component, arcane_focus_component, divine_focus_component,
    xp_component, meta_breath_component, true_name_component, corrupt_component, extra_components,
    casting_time, range, target, effect, area, duration, saving_throw, spell_resistance FROM dnd_spell WHERE id = 1;
    INSERT INTO dnd_spell SELECT 3, 'Fire', 20, school_id, sub_school_id, description,
    verbal_component, somatic_component, material_component, arcane_focus_component, divine_focus_component,
    xp_component, meta_breath_component, true_name_component, corrupt_component, extra_components,
    casting_time, range, target, effect, area, duration, saving_throw, spell_resistance FROM dnd_spell WHERE id = 1;`);
  const fixtureEnglish = loadEnglishRecords(rulesDb);
  rulesDb.close();
  const contentDb = new Database(contentPath);
  contentDb.exec("CREATE TABLE I18nSpellText (spellId INTEGER, name TEXT, descriptionText TEXT, lang TEXT, variant TEXT)");
  contentDb.close();
  const parsedFiles = [parseDiceFile("other.txt", otherBytes), parseDiceFile("test.txt", sourceBytes)];
  const allCandidates = reconcile(parsedFiles.flatMap((file) => file.records), mappings,
    [{ id: 10, editionId: 5, name: "Test" }, { id: 20, editionId: 5, name: "Other" }],
    [...fixtureEnglish].map(([id, en]) => ({ id, rulebookId: en.rulebookId, enName: en.name, zhName: null, zhBody: null })), revision).candidates;
  const allInventory = parsedFiles.map((file) => ({ file: file.file,
    bytes: file.file === "test.txt" ? sourceBytes.length : otherBytes.length,
    encoding: file.encoding, lineCount: file.lineCount, preamble: file.preamble,
    recordCount: file.records.length, unparsedSpans: file.unparsedSpans }));
  saveRows(join(intakeDir, "candidates.jsonl"), allCandidates);
  saveRows(join(intakeDir, "source-inventory.jsonl"), allInventory);
  const allReviews: Review[] = allCandidates.map((row) => {
    const en = fixtureEnglish.get(row.targetId!)!;
    const decision = (field: "name" | "descriptionHtml") => ({ status: "deferred" as const,
      classification: (field === "name" ? row.nameClassification : row.bodyClassification)!,
      reason: "Needs publication evidence", reviewer: row.rulebookId === 10 ? "test" : "queue:unreviewed", englishEvidence: [] });
    return { sourceKey: row.sourceKey, targetId: row.targetId, rulebookId: row.rulebookId, mappingRevision: revision,
      input: { zhName: row.zhName, bodyText: row.bodyText, bodyHtml: row.bodyHtml,
        baselineName: null, baselineBody: null, englishName: en.name,
        englishDescription: en.description, englishMechanics: en.mechanics },
      fields: { name: decision("name"), descriptionHtml: decision("descriptionHtml") } };
  });
  const bookReviews = allReviews.filter((row) => row.rulebookId === 10);
  const proposed = bookReviews[0]!;
  proposed.fields.descriptionHtml = { ...proposed.fields.descriptionHtml, status: "accepted",
    replacementText: proposed.input.bodyHtml, englishEvidence: [proposed.input.englishDescription!] };
  const bookAudits = [{ sourceKey: proposed.sourceKey, targetId: proposed.targetId!,
    effectiveText: proposed.input.bodyHtml, reviewer: "test", reason: "Synthetic full-body review",
    englishEvidence: [proposed.input.englishDescription!] }];
  const reviewsPath = join(bookDir, "decisions.jsonl");
  saveRows(reviewsPath, bookReviews);
  const auditsPath = join(bookDir, "full-body-audit.jsonl");
  saveRows(auditsPath, bookAudits);
  saveRows(join(dataRoot, "dice-qa", "decisions.jsonl"), allReviews);
  const globalAccepted = join(dataRoot, "dice-qa", "accepted.jsonl");
  const globalFallback = join(dataRoot, "dice-qa", "fallback.jsonl");
  writeFileSync(globalAccepted, "global accepted sentinel");
  writeFileSync(globalFallback, "global fallback sentinel");
  const args = ["--import", "tsx", join(__dirname, "qa.ts"),
    "--data-root", dataRoot, "--rules-db", rulesPath, "--content-db", contentPath,
    "--rulebook-id", "10", "--report-dir", reportDir];
  const run = (...extra: string[]) => execFileSync(process.execPath, [...args, ...extra], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  run();
  assert.throws(() => run("--restored-sc-baseline", "fe089990e2a5eeac69c92e068ca695f10c42ec58"),
    /fixed baseline and complete SC QA/);
  assert.throws(() => run("--restored-sc-baseline", revision), /fixed baseline and complete SC QA/);
  const coveragePath = join(reportDir, "coverage.json");
  const coverageBytes = readFileSync(coveragePath, "utf8");
  const coverage = JSON.parse(coverageBytes);
  assert.equal(coverage.candidateOccurrences, 1);
  assert.equal(coverage.existingTargets, 2);
  assert.equal(coverage.pendingFields, 0);
  assert.equal(coverage.validation, "validated-proposal");
  assert.deepEqual(coverage.scope, { kind: "rulebook", rulebookId: 10 });
  assert.deepEqual(coverage.sourceCoverage, { files: 2, candidateOccurrences: 2 });
  assert.equal(readFileSync(join(reportDir, "fallback.jsonl"), "utf8").trim().split("\n").length, 3);
  assert.equal(JSON.parse(readFileSync(join(reportDir, "accepted.jsonl"), "utf8")).descriptionHtml,
    proposed.input.bodyHtml);
  run(); assert.equal(readFileSync(coveragePath, "utf8"), coverageBytes);
  assert(!coverageBytes.includes("火术") && !coverageBytes.includes("Deals 2d6"));
  saveRows(reviewsPath, []);
  assert.throws(run, /review count/);
  saveRows(reviewsPath, [allReviews.find((row) => row.rulebookId === 20)!]);
  assert.throws(run, /unknown review source key/);
  saveRows(reviewsPath, [{ ...bookReviews[0]!, input: { ...bookReviews[0]!.input, englishDescription: "stale" } }]);
  assert.throws(run, /stale englishDescription/);
  saveRows(reviewsPath, [{ ...bookReviews[0]!, fields: { ...bookReviews[0]!.fields,
    name: { ...bookReviews[0]!.fields.name, reviewer: "queue:unreviewed" } } }]);
  assert.throws(run, /unreviewed/);
  run("--check-incomplete");
  assert.equal(JSON.parse(readFileSync(coveragePath, "utf8")).pendingFields, 1);
  saveRows(reviewsPath, bookReviews);
  saveRows(auditsPath, []);
  assert.throws(run, /lack full-body audit/);
  run("--check-incomplete");
  assert.equal(JSON.parse(readFileSync(coveragePath, "utf8")).pendingFullBodyAudits, 1);
  const foreignKey = allReviews.find((row) => row.rulebookId === 20)!.sourceKey;
  saveRows(auditsPath, [...bookAudits, { ...bookAudits[0], sourceKey: foreignKey }]);
  assert.throws(run, /unknown or repeated full-body audit/);
  saveRows(auditsPath, bookAudits);
  saveRows(join(bookDir, "corrections.jsonl"), [{ ...correction, sourceKey: foreignKey }]);
  assert.throws(run, /unused correction record/);
  saveRows(join(bookDir, "corrections.jsonl"), []);
  saveRows(join(bookDir, "duplicate-resolutions.jsonl"), [{ ...resolution, targetId: 3 }]);
  assert.throws(run, /invalid duplicate resolution/);
  saveRows(join(bookDir, "duplicate-resolutions.jsonl"), []);
  saveRows(join(bookDir, "boundary-decisions.jsonl"), [{ ...boundary, sourceKey: foreignKey }]);
  assert.throws(run, /boundary decision count mismatch/);
  saveRows(join(bookDir, "boundary-decisions.jsonl"), []);
  saveRows(join(intakeDir, "candidates.jsonl"), allCandidates.map((row, index) => index === 0
    ? { ...row, sourceKey: row.sourceKey.replace(/:1$/, ":999") } : row));
  assert.throws(run, /stale source candidate/);
  saveRows(join(intakeDir, "candidates.jsonl"), allCandidates);
  saveRows(join(intakeDir, "candidates.jsonl"), allCandidates.filter((row) => row.rulebookId === 10));
  assert.throws(run, /missing entire candidate file or occurrence other.txt/);
  saveRows(join(intakeDir, "source-inventory.jsonl"), allInventory.filter((row) => row.file === "test.txt"));
  assert.throws(run, /source inventory file coverage mismatch/);
  assert.throws(() => writeQaOutputs(dataRoot, join(dataRoot, "dice-qa"), result, false, 10), /this rulebook directory/);
  assert.throws(() => writeQaOutputs(dataRoot, join(dataRoot, "dice-qa", "books", "20"), result, false, 10), /this rulebook directory/);
  assert.equal(readFileSync(globalAccepted, "utf8"), "global accepted sentinel");
  assert.equal(readFileSync(globalFallback, "utf8"), "global fallback sentinel");
  const globalDir = join(dataRoot, "dice-qa");
  const otherBookDir = join(globalDir, "books", "20");
  mkdirSync(otherBookDir);
  for (const [target, aliasName] of [[globalDir, "global-alias"], [otherBookDir, "other-book-alias"]] as const) {
    const alias = join(fixtureRoot, aliasName);
    symlinkSync(target, alias, process.platform === "win32" ? "junction" : "dir");
    for (const file of ["coverage.json", "accepted.jsonl", "fallback.jsonl"]) {
      writeFileSync(join(target, file), `${aliasName}:${file}:sentinel`);
    }
    for (const incomplete of [false, true]) {
      assert.throws(() => writeQaOutputs(dataRoot, alias, result, incomplete, 10), /filesystem destination/);
      assert.throws(() => writeQaOutputs(dataRoot, join(alias, "not-created", "out"), result, incomplete, 10), /filesystem destination/);
    }
    assert(!existsSync(join(target, "not-created")));
    for (const file of ["coverage.json", "accepted.jsonl", "fallback.jsonl"]) {
      assert.equal(readFileSync(join(target, file), "utf8"), `${aliasName}:${file}:sentinel`);
    }
  }
  // The own-book directory itself cannot be redirected to the global directory.
  symlinkSync(globalDir, join(globalDir, "books", "11"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => writeQaOutputs(dataRoot, join(globalDir, "books", "11"), result, false, 11), /must not redirect/);
  const externalOutput = join(fixtureRoot, "ignored-out", "not-created", "book10");
  writeQaOutputs(dataRoot, externalOutput, result, false, 10);
  assert(existsSync(join(externalOutput, "coverage.json")));
  const ownOutput = join(bookDir, "not-created", "out");
  writeQaOutputs(dataRoot, ownOutput, result, false, 10);
  assert(existsSync(join(ownOutput, "coverage.json")));
  assert.equal(readFileSync(globalAccepted, "utf8"), "global-alias:accepted.jsonl:sentinel");
  assert.equal(readFileSync(globalFallback, "utf8"), "global-alias:fallback.jsonl:sentinel");
  // The optional independent channel uses real old HTML and never creates a candidate.
  saveRows(join(intakeDir, "candidates.jsonl"), allCandidates);
  saveRows(join(intakeDir, "source-inventory.jsonl"), allInventory);
  const independentRules = new Database(rulesPath);
  independentRules.exec("ALTER TABLE dnd_spell ADD COLUMN description_html TEXT"); independentRules.close();
  const independentContent = new Database(contentPath);
  independentContent.exec("ALTER TABLE I18nSpellText ADD COLUMN descriptionHtml TEXT");
  independentContent.prepare("INSERT INTO I18nSpellText VALUES (?, ?, ?, ?, ?, ?)")
    .run(2, "旧名", "旧正文", "zh", "chm", "<p>旧正文</p>"); independentContent.close();
  const after = "完整新正文";
  const sourceBound: SourceBoundFallbackReview = { sourceKey: null, targetId: 2, rulebookId: 10,
    field: "descriptionText", before: "旧正文", after, proposedHtml: escapedFallbackHtml(after),
    input: { chinese: { name: "旧名", descriptionText: "旧正文", descriptionHtml: "<p>旧正文</p>" },
      english: fixtureEnglish.get(2)!, englishHtml: null }, sourceRef: "synthetic.jsonl:1",
    sourcePages: [{ sourceId: "synthetic", pageIndex: 0, printedPage: 1, spanRefs: [[0, 0, 0]] }],
    status: "accepted", reviewer: "portable-independent", reason: "Read synthetic full source and before/after consumers.", originalSourceRead: true,
    rulePairs: [{ english: fixtureEnglish.get(2)!.description, chinese: after, sourceId: "synthetic", printedPage: 1,
      sourceQuote: "Synthetic full spell body." }], fullBodyAudit: { effectiveText: after, effectiveHtml: escapedFallbackHtml(after),
      beforeHtml: "<p>旧正文</p>", reviewer: "portable-independent", reason: "Full text and old/new HTML reviewed.",
      englishEvidence: [fixtureEnglish.get(2)!.description], currentHtmlReviewed: true, proposedHtmlReviewed: true } };
  const sourceBoundPath = join(bookDir, "source-bound-reviews.jsonl"); saveRows(sourceBoundPath, [sourceBound]);
  const rulesBefore = readFileSync(rulesPath), contentBefore = readFileSync(contentPath);
  run("--source-bound-fallback-reviews", sourceBoundPath);
  const independentAccepted = join(reportDir, "source-bound-fallback-accepted.jsonl");
  assert.deepEqual(JSON.parse(readFileSync(independentAccepted, "utf8")), sourceBound);
  assert.equal(JSON.parse(readFileSync(join(reportDir, "source-bound-fallback-coverage.json"), "utf8")).validation, "validated-proposal");
  assert.deepEqual(readFileSync(rulesPath), rulesBefore); assert.deepEqual(readFileSync(contentPath), contentBefore);
  assert.equal(JSON.parse(readFileSync(join(reportDir, "accepted.jsonl"), "utf8")).targetId, 1);
  const independentBytes = readFileSync(independentAccepted, "utf8");
  run("--source-bound-fallback-reviews", sourceBoundPath); assert.equal(readFileSync(independentAccepted, "utf8"), independentBytes);
  saveRows(sourceBoundPath, [{ ...sourceBound, before: "wrong old value" }]);
  assert.throws(() => run("--source-bound-fallback-reviews", sourceBoundPath), /current-before/);
  assert.equal(readFileSync(independentAccepted, "utf8"), independentBytes, "failed validation cannot overwrite previous proposal");
  const foreignFile = join(otherBookDir, "independent-sentinel.jsonl");writeFileSync(foreignFile, "foreign independent sentinel");
  // Protect the optional filename itself against aliases, just like native outputs.
  const independentAlias = join(ownOutput, "source-bound-fallback-accepted.jsonl");
  symlinkSync(otherBookDir, independentAlias, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => writeQaOutputs(dataRoot, ownOutput, result, false, 10,
    { accepted: [sourceBound], summary: { reviewedFields: 1, acceptedFields: 1, fullBodyAudits: 1, pendingFields: 0, decisions: {} } }), /filesystem destination/);
  assert.equal(readFileSync(foreignFile, "utf8"), "foreign independent sentinel");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
console.log("dice QA portable tests passed");
