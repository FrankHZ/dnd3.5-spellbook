import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { parseDiceFile } from "./parse";
import { reconcile } from "./reconcile";
import { projectEffectiveChinese } from "./effective";
import { reconcileQaSlices, selectSliceScope, validateQaInputs, validateSlicePartition, writeQaOutputs,
  type EnglishMechanics, type QaRecords, type Review, type SliceScope } from "./qa";

const root = mkdtempSync(join(tmpdir(), "dice-slices-"));
const baseline = join(root, "baseline");
const book = join(baseline, "qa/books/10");
const git = (...args: string[]) => execFileSync("git", ["-C", root, ...args],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const save = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value) + "\n", "utf8");
const saveRows = (path: string, value: unknown[]) => writeFileSync(path,
  value.map(row => JSON.stringify(row)).join("\n") + "\n", "utf8");
const commit = (path: string) => {
  git("add", "--", path);
  git("-c", "user.name=Portable Test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-m", "fixture");
  return git("rev-parse", "HEAD");
};
const mechanics: EnglishMechanics = { school: "Evocation", subschool: null, descriptors: [],
  components: { verbal: 1, somatic: 1, material: 0, arcaneFocus: 0, divineFocus: 0, xp: 0,
    metaBreath: 0, trueName: 0, corrupt: 0, extra: null }, castingTime: null, range: null,
  target: null, effect: null, area: null, duration: null, savingThrow: null, spellResistance: null,
  classLevels: [], domainLevels: [] };
try {
  for (const path of ["spells-dice-db-by-mo", "dice-intake", "chm-mapping", "baseline/intake", "baseline/qa/books/10"]) {
    mkdirSync(join(root, path), { recursive: true });
  }
  const bytes = Buffer.from("火术（Fire）（Test）\n塑能系\n等级：法师1\n正文甲。\n\n"
    + "火术（Fire）（Test）\n塑能系\n等级：法师1\n正文乙。\n\n"
    + "冰术（Ice）（Test）\n塑能系\n等级：法师1\n正文丙。", "utf8");
  writeFileSync(join(root, "spells-dice-db-by-mo/Test.txt"), bytes);
  const mappings = [{ file: "Test.txt", rulebookIds: [10], editionIds: [5], basis: "synthetic", status: "resolved" as const }];
  save(join(root, "dice-intake/publication-map.json"), mappings);
  save(join(root, "chm-mapping/enName-aliases-global.json"), {});
  git("init");
  const sourceRevision = commit(".");
  const records: QaRecords = { books: [{ id: 10, editionId: 5, name: "Test" }],
    english: new Map([1, 2].map(id => [id, { name: id === 1 ? "Fire" : "Ice",
      description: "Deals damage. Complete synthetic English.", rulebookId: 10, editionId: 5, mechanics: structuredClone(mechanics) }])),
    englishHtml: new Map([1, 2].map(id => [id, "<p>English HTML</p>"])), chinese: new Map() };
  const parsed = parseDiceFile("Test.txt", bytes);
  const candidates = reconcile(parsed.records, mappings, records.books,
    [...records.english].map(([id, en]) => ({ id, enName: en.name, rulebookId: 10, zhName: null, zhBody: null })), sourceRevision).candidates;
  assert.equal(candidates.length, 3);
  const inventory = [{ file: parsed.file, bytes: bytes.length, encoding: parsed.encoding,
    lineCount: parsed.lineCount, preamble: parsed.preamble, recordCount: parsed.records.length, unparsedSpans: parsed.unparsedSpans }];
  saveRows(join(baseline, "intake/candidates.jsonl"), candidates);
  saveRows(join(baseline, "intake/source-inventory.jsonl"), inventory);
  const prepared = commit("baseline/intake");
  const scope = (ids: number[]): SliceScope => ({ kind: "slice", rulebookId: 10, targetIds: ids,
    baselineRevision: prepared, sourceRevision, mappingRevision: sourceRevision });
  const targets = new Map([...records.english].map(([id]) => [id, { rulebookId: 10, zhName: null, zhBody: null }]));
  const one = selectSliceScope(scope([1]), candidates, targets, inventory);
  assert.equal(one.candidates.length, 2, "all duplicate candidates stay in slice");
  assert.deepEqual([...one.targets.keys()], [1]);
  assert.throws(() => selectSliceScope(scope([]), candidates, targets, inventory), /nonempty/);
  assert.throws(() => selectSliceScope(scope([1, 1]), candidates, targets, inventory), /duplicate/);
  assert.throws(() => selectSliceScope(scope([99]), candidates, targets, inventory), /missing or wrong-book/);
  assert.throws(() => selectSliceScope({ ...scope([1]), rulebookId: 20 }, candidates, targets, inventory), /wrong-book/);
  assert.throws(() => selectSliceScope(scope([1]), [...candidates, { ...candidates[0]!, targetId: null }], targets, inventory), /unmatched/);
  assert.throws(() => selectSliceScope(scope([1]), [...candidates, { ...candidates[0]!, targetId: null,
    rulebookId: null, publicationRulebookIds: [10, 20] }], targets, inventory), /ambiguous publication/);
  assert.throws(() => selectSliceScope(scope([3]), candidates, new Map([...targets,
    [3, { rulebookId: 10, zhName: null, zhBody: null }]]), inventory), /without candidates/);
  const createSlice = (name: string, ids: number[]) => {
    const dir = join(book, "slices", name); mkdirSync(dir, { recursive: true });
    const selected = candidates.filter(row => ids.includes(row.targetId!));
    const reviews: Review[] = selected.map((c, index) => {
      const en = records.english.get(c.targetId!)!;
      const accepted = c.targetId === 2 || index === 0;
      const decision = (field: "name" | "descriptionHtml") => ({
        status: accepted ? "accepted" as const : "excluded" as const,
        classification: (field === "name" ? c.nameClassification : c.bodyClassification)!,
        reason: "Synthetic full field review", reviewer: "synthetic", englishEvidence: [field === "name" ? en.name : en.description],
        ...(accepted ? { replacementText: field === "name" ? c.zhName! : "<p>合成完整正文</p>" } : {}),
      });
      return { sourceKey: c.sourceKey, targetId: c.targetId, rulebookId: c.rulebookId, mappingRevision: sourceRevision,
        input: { zhName: c.zhName, bodyText: c.bodyText, bodyHtml: c.bodyHtml, baselineName: null,
          baselineBody: null, englishName: en.name, englishDescription: en.description, englishMechanics: en.mechanics },
        fields: { name: decision("name"), descriptionHtml: decision("descriptionHtml") } };
    });
    const accepted = reviews.filter(row => row.fields.descriptionHtml.status === "accepted");
    const files: Record<string, unknown> = {
      "scope.json": scope(ids),
      "decisions.jsonl": reviews,
      "target-inputs.jsonl": ids.map(targetId => ({ targetId, english: records.english.get(targetId),
        englishHtml: records.englishHtml.get(targetId), chinese: { name: null, descriptionText: null, descriptionHtml: null } })),
      "corrections.jsonl": accepted.map(r => ({ sourceKey: r.sourceKey, field: "descriptionHtml",
        sourceText: r.input.bodyHtml, baselineText: null, replacementText: r.fields.descriptionHtml.replacementText,
        reason: "Synthetic correction", reviewer: "synthetic", englishEvidence: [r.input.englishDescription] })),
      "full-body-audit.jsonl": accepted.map(r => ({ sourceKey: r.sourceKey, targetId: r.targetId,
        effectiveText: r.fields.descriptionHtml.replacementText, reason: "Complete synthetic audit", reviewer: "synthetic",
        englishEvidence: [r.input.englishDescription] })),
      "boundary-decisions.jsonl": [],
      "duplicate-resolutions.jsonl": ids.includes(1) ? [{ targetId: 1, sourceKeys: selected.filter(c => c.targetId === 1).map(c => c.sourceKey),
        selectedSourceKey: selected[0]!.sourceKey, mappingRevision: sourceRevision, reason: "Synthetic selection", reviewer: "synthetic" }] : [],
    };
    const write = () => { for (const [file, value] of Object.entries(files)) {
      if (file.endsWith(".jsonl")) saveRows(join(dir, file), value as unknown[]); else save(join(dir, file), value);
    } };
    write();
    return { dir, files, write, revision: commit(dir) };
  };
  const a = createSlice("first", [1]); const b = createSlice("second", [2]);
  const rulesDb = new Database(join(root, "rules.sqlite"));
  rulesDb.exec(`CREATE TABLE dnd_rulebook (id, dnd_edition_id, name);
    CREATE TABLE dnd_spellschool (id, name); CREATE TABLE dnd_spellsubschool (id, name);
    CREATE TABLE dnd_spelldescriptor (id, name); CREATE TABLE dnd_spell_descriptors (spell_id, spelldescriptor_id);
    CREATE TABLE dnd_spellclasslevel (id, spell_id, character_class_id, level, extra);
    CREATE TABLE dnd_spelldomainlevel (id, spell_id, domain_id, level, extra);
    CREATE TABLE dnd_spell (id, name, rulebook_id, school_id, sub_school_id, description, description_html,
      verbal_component, somatic_component, material_component, arcane_focus_component, divine_focus_component,
      xp_component, meta_breath_component, true_name_component, corrupt_component, extra_components,
      casting_time, range, target, effect, area, duration, saving_throw, spell_resistance);
    INSERT INTO dnd_rulebook VALUES (10, 5, 'Test'); INSERT INTO dnd_spellschool VALUES (1, 'Evocation');`);
  for (const [id, en] of records.english) rulesDb.prepare(`INSERT INTO dnd_spell VALUES
    (?, ?, 10, 1, NULL, ?, ?, 1, 1, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`)
    .run(id, en.name, en.description, records.englishHtml.get(id));
  rulesDb.close();
  const contentDb = new Database(join(root, "content.sqlite"));
  contentDb.exec("CREATE TABLE I18nSpellText (spellId, name, descriptionText, descriptionHtml, lang, variant)"); contentDb.close();
  const dbBytes = ["rules.sqlite", "content.sqlite"].map(file => readFileSync(join(root, file)));
  const common = ["--data-root", root, "--baseline-dir", baseline, "--rules-db", join(root, "rules.sqlite"),
    "--content-db", join(root, "content.sqlite"), "--rulebook-id", "10"];
  const args = (slice = a) => [...common, "--slice-scope", join(slice.dir, "scope.json"), "--slice-revision", slice.revision];
  const qa = validateQaInputs(args(), records);
  assert.deepEqual(validateQaInputs(args()).result, qa.result, "real SQLite slice validation agrees with supplied records");
  const runCli = (cliArgs: string[]) => execFileSync(process.execPath,
    ["--import", "tsx", join(__dirname, "qa.ts"), ...cliArgs], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  runCli(args().concat("--report-dir", join(a.dir, "cli-out")));
  assert.equal(JSON.parse(readFileSync(join(a.dir, "cli-out/coverage.json"), "utf8")).scope.kind, "slice");
  assert.equal(qa.scope.kind, "slice");
  assert.equal(qa.result.summary.existingTargets, 1);
  assert.equal(qa.result.summary.candidateOccurrences, 2);
  assert.deepEqual(qa.result.accepted.map(row => row.targetId), [1]);
  assert.equal(qa.result.fallback.length, 0, "unselected targets get no fallback placeholders");
  assert.throws(() => projectEffectiveChinese({ ...records, rulebookId: 10, chineseSources: new Map() },
    qa.result, qa.result.accepted, []), /whole-book QA/);
  const out = join(a.dir, "out");
  writeQaOutputs(root, out, qa.result, false, 10, undefined, baseline, qa.inputPaths);
  assert(existsSync(join(out, "slice-accepted.jsonl")));
  assert(!existsSync(join(out, "accepted.jsonl")));
  assert.throws(() => writeQaOutputs(root, out, qa.result, false, 10, undefined, baseline, qa.inputPaths), /fresh/);
  assert.throws(() => writeQaOutputs(root, join(b.dir, "out"), qa.result, false, 10, undefined, baseline, qa.inputPaths), /owned directory/);
  assert.throws(() => writeQaOutputs(root, join(a.dir, "decisions.jsonl", "out"), qa.result, false, 10, undefined, baseline, qa.inputPaths));
  assert.throws(() => validateQaInputs(args().concat("--reviews", join(b.dir, "decisions.jsonl")), records), /owned directory/);
  const mutate = (file: string, edit: (value: any) => void, pattern: RegExp, progress = false) => {
    const original = structuredClone(a.files[file]); const changed = structuredClone(original); edit(changed);
    if (file.endsWith(".jsonl")) saveRows(join(a.dir, file), changed as unknown[]); else save(join(a.dir, file), changed);
    const revision = commit(join(a.dir, file));
    const altered = [...common, "--slice-scope", join(a.dir, "scope.json"), "--slice-revision", revision];
    assert.throws(() => validateQaInputs(altered, records), pattern);
    if (progress) {
      const pending = validateQaInputs(altered.concat("--check-incomplete"), records);
      const pendingOut = join(a.dir, "pending");
      writeQaOutputs(root, pendingOut, pending.result, true, 10, undefined, baseline, pending.inputPaths);
      assert(!existsSync(join(pendingOut, "slice-accepted.jsonl")));
      assert.equal(JSON.parse(readFileSync(join(pendingOut, "coverage.json"), "utf8")).validation, "incomplete-check");
    }
    a.write(); a.revision = commit(a.dir);
  };
  saveRows(join(a.dir, "decisions.jsonl"), []);
  assert.throws(() => validateQaInputs(args(), records), /stale slice evidence/);
  a.write();
  rmSync(join(a.dir, "corrections.jsonl"));
  assert.throws(() => validateQaInputs(args(), records), /slice requires explicit corrections/);
  a.write();
  save(join(a.dir, "scope.json"), { ...scope([1]), targetIds: [2] });
  assert.throws(() => validateQaInputs(args(), records), /foreign or missing slice target input/);
  a.write();
  mutate("decisions.jsonl", v => v.pop(), /review count/);
  mutate("decisions.jsonl", v => v[0] = (b.files["decisions.jsonl"] as Review[])[0], /unknown review/);
  mutate("decisions.jsonl", v => v[0].input.englishDescription = "old English", /stale englishDescription/);
  mutate("decisions.jsonl", v => v[0].input.englishMechanics.components.verbal = 0, /stale englishMechanics/);
  mutate("decisions.jsonl", v => v[0].fields.name.reviewer = "queue:unreviewed", /unreviewed/, true);
  mutate("full-body-audit.jsonl", v => v.pop(), /lack full-body audit/);
  mutate("full-body-audit.jsonl", v => v[0].targetId = 2, /unknown or repeated full-body audit/);
  mutate("corrections.jsonl", v => v[0].sourceKey = "foreign", /separately reviewed correction/);
  mutate("duplicate-resolutions.jsonl", v => v[0].sourceKeys.pop(), /duplicate source coverage/);
  mutate("boundary-decisions.jsonl", v => v.push({ sourceKey: "foreign" }), /boundary decision count/);
  mutate("target-inputs.jsonl", v => v[0].englishHtml = "old HTML", /stale slice target input/);
  mutate("target-inputs.jsonl", v => v[0].chinese.descriptionHtml = "old CHM HTML", /stale slice target input/);
  mutate("target-inputs.jsonl", v => v.pop(), /coverage mismatch/);
  mutate("target-inputs.jsonl", v => v[0].targetId = 2, /foreign or missing/);
  mutate("scope.json", v => v.sourceRevision = "0".repeat(40), /stale slice source/);
  mutate("scope.json", v => v.baselineRevision = sourceRevision, /Command failed/);
  mutate("scope.json", v => v.rulebookId = 20, /wrong slice parent/);
  mutate("scope.json", v => v.targetIds = [1, 1], /duplicate slice target/);
  const partitionPath = join(book, "partition.json");
  const refs = () => [a, b].map(s => ({ scope: join(s.dir, "scope.json"), revision: s.revision }));
  save(partitionPath, refs());
  const parent = reconcileQaSlices(common.concat("--reconcile-slices", partitionPath), records);
  runCli(common.concat("--reconcile-slices", partitionPath, "--report-dir", join(book, "reconciled-out")));
  assert(existsSync(join(book, "reconciled-out/accepted.jsonl")));
  assert.equal(JSON.parse(readFileSync(join(book, "reconciled-out/coverage.json"), "utf8")).scope.kind, "rulebook");
  ["rules.sqlite", "content.sqlite"].forEach((file, index) => assert.deepEqual(readFileSync(join(root, file)), dbBytes[index],
    "real slice and parent CLI preserve complete DB bytes"));
  assert.equal(parent.scope.kind, "rulebook");
  assert.equal(parent.result.summary.existingTargets, 2);
  assert.equal(parent.result.summary.candidateOccurrences, 3);
  assert.deepEqual(parent.result.accepted.map(row => row.targetId), [1, 2]);
  assert.equal((parent.result.summary.reconciledSlices as unknown[]).length, 2);
  assert.throws(() => reconcileQaSlices(common.concat("--reconcile-slices", partitionPath, "--check-incomplete"), records), /cannot use/);
  save(partitionPath, [refs()[0], refs()[0]]);
  assert.throws(() => reconcileQaSlices(common.concat("--reconcile-slices", partitionPath), records), /overlapping/);
  save(partitionPath, [refs()[0]]);
  assert.throws(() => reconcileQaSlices(common.concat("--reconcile-slices", partitionPath), records), /missing parent/);
  validateSlicePartition([1, 2], [scope([1]), scope([2])]);
  assert.throws(() => validateSlicePartition([1, 2], [scope([1]), { ...scope([2]), baselineRevision: sourceRevision }]), /baseline/);
  assert.throws(() => validateSlicePartition([1, 2], [scope([1]), scope([3])]), /foreign/);
  const drift = structuredClone(records); drift.englishHtml.set(1, "changed current DB HTML");
  assert.throws(() => validateQaInputs(args(), drift), /stale slice target input/);
  drift.englishHtml = records.englishHtml;
  drift.chinese.set(1, { name: null, descriptionText: null, descriptionHtml: "changed current CHM HTML" });
  assert.throws(() => validateQaInputs(args(), drift), /stale slice target input/);
  writeFileSync(join(root, "chm-mapping/enName-aliases-global.json"), "{\"changed\":\"alias\"}");
  assert.throws(() => validateQaInputs(args(), records), /stale slice evidence/);
  console.log("dice slice portable tests passed (partition, evidence, duplicate and consumer guards)");
} finally { rmSync(root, { recursive: true, force: true }); }
