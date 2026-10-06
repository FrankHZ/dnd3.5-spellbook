import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  linkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { parseDiceFile } from "./parse";
import { reconcile } from "./reconcile";
import { loadEnglishRecords, validateQaInputs, type Review } from "./qa";
import {
  bindCommittedInputs,
  cityscapeAcceptance as a,
  planDbEnglishHandoff,
  requireHandoffDbRoles,
  validateHandoffEvidence,
  type HandoffEvidence,
} from "./db-english-handoff";
import {
  checkHandoffArguments,
  runDbEnglishHandoff,
} from "./db-english-handoff-cli";

const temp = mkdtempSync(join(tmpdir(), "dice-handoff-"));
try {
  const root = join(temp, "data"),
    baseline = join(root, "dice-baselines/issue-520");
  const source = join(root, "spells-dice-db-by-mo"),
    intake = join(baseline, "intake");
  const book = join(root, a.directory),
    rulesPath = join(temp, "rules.sqlite"),
    contentPath = join(temp, "content.sqlite");
  for (const dir of [
    source,
    intake,
    book,
    join(root, "dice-intake"),
    join(root, "chm-mapping"),
  ])
    mkdirSync(dir, { recursive: true });
  const save = (file: string, rows: unknown[]) =>
    writeFileSync(
      file,
      rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
    );
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const bytes = Buffer.from(
    a.targets
      .map(
        (id) =>
          `合成术${id}（Spell ${id}）（synthetic）\n变化系\n等级：法师1\n合成正文${id}。`,
      )
      .join("\n\n"),
  );
  writeFileSync(join(source, "synthetic.txt"), bytes);
  const map = [
    {
      file: "synthetic.txt",
      rulebookIds: [53],
      editionIds: [5],
      status: "resolved",
      basis: "synthetic",
    },
  ];
  writeFileSync(
    join(root, "dice-intake/publication-map.json"),
    JSON.stringify(map),
  );
  writeFileSync(join(root, "chm-mapping/enName-aliases-global.json"), "{}");
  git("init");
  git("add", ".");
  git(
    "-c",
    "user.name=Portable Test",
    "-c",
    "user.email=test@example.invalid",
    "commit",
    "-m",
    "synthetic sources",
  );
  const revision = git("rev-parse", "HEAD");
  const rules = new Database(rulesPath);
  rules.exec(`CREATE TABLE dnd_rulebook(id INTEGER,dnd_edition_id INTEGER,name TEXT);
    CREATE TABLE dnd_spellschool(id INTEGER,name TEXT); CREATE TABLE dnd_spellsubschool(id INTEGER,name TEXT);
    CREATE TABLE dnd_spelldescriptor(id INTEGER,name TEXT); CREATE TABLE dnd_spell_descriptors(spell_id INTEGER,spelldescriptor_id INTEGER);
    CREATE TABLE dnd_spellclasslevel(id INTEGER,spell_id INTEGER,character_class_id INTEGER,level INTEGER,extra TEXT);
    CREATE TABLE dnd_spelldomainlevel(id INTEGER,spell_id INTEGER,domain_id INTEGER,level INTEGER,extra TEXT);
    CREATE TABLE dnd_spell(id INTEGER,name TEXT,rulebook_id INTEGER,school_id INTEGER,sub_school_id INTEGER,description TEXT,
      verbal_component INTEGER,somatic_component INTEGER,material_component INTEGER,arcane_focus_component INTEGER,
      divine_focus_component INTEGER,xp_component INTEGER,meta_breath_component INTEGER,true_name_component INTEGER,
      corrupt_component INTEGER,extra_components TEXT,casting_time TEXT,range TEXT,target TEXT,effect TEXT,area TEXT,
      duration TEXT,saving_throw TEXT,spell_resistance TEXT);
    INSERT INTO dnd_rulebook VALUES(53,5,'Synthetic'),(86,5,'SC fixture');
    INSERT INTO dnd_spellschool VALUES(1,'Transmutation');`);
  for (const id of a.targets) {
    const english =
      id === 361
        ? Array.from(
            { length: 10 },
            (_, n) => `Synthetic English clause ${n + 1}.`,
          ).join("\n")
        : `Synthetic English ${id}.`;
    rules
      .prepare(
        `INSERT INTO dnd_spell VALUES(?,?,53,1,NULL,?,1,1,0,1,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL)`,
      )
      .run(id, `Spell ${id}`, english);
  }
  const english = loadEnglishRecords(rules);
  rules.close();
  const content = new Database(contentPath);
  content.exec(`CREATE TABLE I18nSpellText(id TEXT PRIMARY KEY,spellId INTEGER,rulebookId INTEGER,lang TEXT,variant TEXT,
    name TEXT,descriptionHtml TEXT,descriptionText TEXT,sourceKey TEXT,createdAt TEXT,updatedAt TEXT,nameProvenanceJson TEXT,bodyProvenanceJson TEXT);
    CREATE TABLE I18nSpellSummaryText(id TEXT,summaryText TEXT); CREATE TABLE SpellListEntry(id INTEGER,spellId INTEGER);
    CREATE TABLE RulesContentBuild(id TEXT,buildMetaJson TEXT);
    INSERT INTO I18nSpellText VALUES('sc',4001,86,'zh','effective','SC synthetic','<p>SC synthetic</p>','SC synthetic','sc-source',
      'created','updated','{"acceptedRevision":"SC-name-fixture"}','{"review":{"disposition":"accepted","sourceQuestionIds":[]}}');
    INSERT INTO I18nSpellText VALUES('other',99,20,'zh','chm','Other','<p>Other</p>','Other','other-source','created','updated',NULL,NULL);
    INSERT INTO I18nSpellSummaryText VALUES('summary','Unchanged summary');
    INSERT INTO SpellListEntry VALUES(1,4001); INSERT INTO RulesContentBuild VALUES('normalized','SC protected build');`);
  content.close();
  const parsed = parseDiceFile("synthetic.txt", bytes);
  assert.equal(parsed.records.length, 8);
  const candidates = reconcile(
    parsed.records,
    map,
    [{ id: 53, editionId: 5, name: "Synthetic" }],
    [...english].map(([id, en]) => ({
      id,
      rulebookId: 53,
      enName: en.name,
      zhName: null,
      zhBody: null,
    })),
    revision,
  ).candidates;
  save(join(intake, "candidates.jsonl"), candidates);
  save(join(intake, "source-inventory.jsonl"), [
    {
      file: parsed.file,
      bytes: bytes.length,
      encoding: parsed.encoding,
      lineCount: parsed.lineCount,
      preamble: parsed.preamble,
      recordCount: 8,
      unparsedSpans: parsed.unparsedSpans,
    },
  ]);
  const e: HandoffEvidence = {
    accepted: [],
    fallback: [],
    targetInputs: [],
    semantic: {
      issue: 160,
      authority: "DB-English QA; no original-book verification",
      entries: [],
    },
    clauses: [],
    unresolved: [],
  };
  const reviews: Review[] = candidates.map((c) => {
    const en = english.get(c.targetId!)!;
    const segments = en.description
      .split("\n")
      .map((text, n) =>
        c.targetId === 361 && n === 9
          ? { lines: [n + 1], kind: "english-fallback", text }
          : { lines: [n + 1], zh: `合成审阅${c.targetId}第${n + 1}句。` },
      );
    const texts = segments.map((s) => s.zh ?? s.text!);
    const html = texts.map((text) => `<p>${text}</p>`).join("\n");
    e.targetInputs.push({
      targetId: c.targetId!,
      english: en,
      sourceKeys: [c.sourceKey],
    });
    e.semantic.entries.push({
      targetId: c.targetId!,
      name: c.zhName!,
      segments,
    });
    segments.forEach((s, n) =>
      e.clauses.push({
        targetId: c.targetId!,
        sourceKey: c.sourceKey,
        englishLines: s.lines,
        english: en.description.split("\n")[n]!,
        effectiveText: texts[n]!,
        status: s.kind
          ? "retained-DB-English-fallback"
          : "DB-English-reviewed-Chinese",
        reviewer: "synthetic",
      }),
    );
    return {
      sourceKey: c.sourceKey,
      targetId: c.targetId,
      rulebookId: 53,
      mappingRevision: revision,
      input: {
        zhName: c.zhName,
        bodyText: c.bodyText,
        bodyHtml: c.bodyHtml,
        baselineName: null,
        baselineBody: null,
        englishName: en.name,
        englishDescription: en.description,
        englishMechanics: en.mechanics,
      },
      fields: {
        name: {
          status: "accepted",
          classification: c.nameClassification!,
          reason: "synthetic",
          reviewer: "test",
          englishEvidence: [en.name],
          replacementText: c.zhName!,
        },
        descriptionHtml: {
          status: "accepted",
          classification: c.bodyClassification!,
          reason: "synthetic",
          reviewer: "test",
          englishEvidence: [en.description],
          replacementText: html,
        },
      },
    };
  });
  const r361 = reviews.find((r) => r.targetId === 361)!;
  e.unresolved.push({
    targetId: 361,
    field: "descriptionHtml",
    sourceKey: r361.sourceKey,
    englishLines: [10],
    english: english.get(361)!.description.split("\n")[9]!,
    gap: "Synthetic component conflict",
    disposition: "Retain literal English",
    canonicalEnglishChanged: false,
    normalizedMechanicsChanged: false,
    operatorWrites: false,
    reviewer: "synthetic",
  });
  const decisions = join(book, "decisions.jsonl");
  save(decisions, reviews);
  save(
    join(book, "corrections.jsonl"),
    reviews.map((r) => ({
      sourceKey: r.sourceKey,
      field: "descriptionHtml",
      sourceText: r.input.bodyHtml,
      baselineText: null,
      replacementText: r.fields.descriptionHtml.replacementText,
      reason: "synthetic",
      reviewer: "test",
      englishEvidence: [r.input.englishDescription],
    })),
  );
  save(
    join(book, "full-body-audit.jsonl"),
    reviews.map((r) => ({
      sourceKey: r.sourceKey,
      targetId: r.targetId,
      effectiveText: r.fields.descriptionHtml.replacementText,
      reason: "synthetic",
      reviewer: "test",
      englishEvidence: [r.input.englishDescription],
    })),
  );
  save(join(book, "boundary-decisions.jsonl"), []);
  save(join(book, "duplicate-resolutions.jsonl"), []);
  const args = [
    "--data-root",
    root,
    "--baseline-dir",
    baseline,
    "--rules-db",
    rulesPath,
    "--content-db",
    contentPath,
    "--rulebook-id",
    "53",
  ];
  const qa = validateQaInputs(args);
  e.accepted = qa.result.accepted;
  assert.throws(() => validateHandoffEvidence({ ...qa, scope: { kind: "slice", rulebookId: 53,
    targetIds: [355], baselineRevision: revision, sourceRevision: revision, mappingRevision: revision } }, e),
  /whole-book QA/);
  assert.deepEqual(validateHandoffEvidence(qa, e), {
    segments: 17,
    physicalLines: 17,
    fullyChineseBodies: 7,
    mixedBodies: 1,
    unresolvedClauses: 1,
  });
  const reject = (edit: (value: HandoffEvidence) => void, pattern: RegExp) => {
    const changed = structuredClone(e);
    edit(changed);
    assert.throws(() => validateHandoffEvidence(qa, changed), pattern);
  };
  reject((v) => v.accepted.pop(), /universe/);
  reject((v) => v.accepted.push(v.accepted[0]!), /universe/);
  reject((v) => (v.accepted[0]!.rulebookId = 86), /formal QA/);
  reject((v) => (v.accepted[0]!.descriptionHtml += "changed"), /formal QA/);
  reject(
    (v) =>
      v.fallback.push({
        targetId: 355,
        rulebookId: 53,
        field: "name",
        sourceKey: null,
        status: "English",
      }),
    /fallback export/,
  );
  reject((v) => (v.unresolved = []), /unresolved/);
  reject(
    (v) => v.semantic.entries.find((r) => r.targetId === 361)!.segments.pop(),
    /coverage/,
  );
  reject((v) => v.clauses.pop(), /clause evidence/);
  reject((v) => v.clauses.push(v.clauses[0]!), /duplicate clause/);
  reject((v) => (v.clauses[0]!.sourceKey = "wrong"), /source mismatch/);
  reject((v) => (v.clauses[0]!.effectiveText = "变文"), /text mismatch/);
  reject(
    (v) => (v.targetInputs[0]!.english.mechanics.components.verbal = 0),
    /mechanics drift/,
  );
  reject(
    (v) => (v.targetInputs[0]!.english.description = "drift"),
    /mechanics drift/,
  );
  reject((v) => (v.unresolved[0]!.normalizedMechanicsChanged = true), /false/);
  const failCurrent = (sql: string, pattern: RegExp) => {
    const db = new Database(rulesPath);
    db.exec("BEGIN");
    db.exec(sql);
    // Separate readonly connection observes committed fixture edits, restored below.
    db.exec("COMMIT");
    db.close();
    assert.throws(() => validateQaInputs(args), pattern);
  };
  failCurrent(
    "UPDATE dnd_spell SET description='drift' WHERE id=355",
    /englishDescription/,
  );
  let db = new Database(rulesPath);
  db.prepare("UPDATE dnd_spell SET description=? WHERE id=355").run(
    english.get(355)!.description,
  );
  db.close();
  failCurrent(
    "UPDATE dnd_spell SET verbal_component=0 WHERE id=355",
    /englishMechanics/,
  );
  db = new Database(rulesPath);
  db.exec("UPDATE dnd_spell SET verbal_component=1 WHERE id=355");
  db.close();
  db = new Database(contentPath);
  db.exec(
    "INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name) VALUES('drift',355,53,'zh','chm','drift')",
  );
  db.close();
  assert.throws(() => validateQaInputs(args), /stale intake candidate/);
  db = new Database(contentPath);
  db.exec("DELETE FROM I18nSpellText WHERE id='drift'");
  db.close();
  const before = [readFileSync(rulesPath), readFileSync(contentPath)];
  const roRules = new Database(rulesPath, {
      readonly: true,
      fileMustExist: true,
    }),
    roContent = new Database(contentPath, {
      readonly: true,
      fileMustExist: true,
    });
  roRules.pragma("query_only=ON");
  roContent.pragma("query_only=ON");
  requireHandoffDbRoles(roRules, roContent);
  const proposal = planDbEnglishHandoff(roContent, e);
  assert.equal(proposal.length, 8);
  assert(proposal.every((r) => r.action === "insert" && r.before === null));
  assert.equal(proposal[6]!.review.unresolved.length, 1);
  assert.equal(proposal[6]!.review.fullyChinese, false);
  assert(
    proposal[6]!.fields.descriptionText.after.includes(
      e.unresolved[0]!.english,
    ),
  );
  assert.throws(() => roContent.exec("DELETE FROM I18nSpellText"), /readonly/);
  assert.throws(
    () => requireHandoffDbRoles(roContent, roRules),
    /wrong rules DB role/,
  );
  const writable = new Database(contentPath);
  assert.throws(() => requireHandoffDbRoles(roRules, writable), /readonly/);
  writable.close();
  roContent.pragma("query_only=OFF");
  assert.throws(() => planDbEnglishHandoff(roContent, e), /query_only/);
  roRules.close();
  roContent.close();
  assert.deepEqual(
    [readFileSync(rulesPath), readFileSync(contentPath)],
    before,
    "complete SC/provenance, non-target, summaries, build and relationships unchanged",
  );
  // Genuine formal success and Git identity never grant synthetic data acceptance.
  checkHandoffArguments([]);
  checkHandoffArguments(["--accepted-revision", a.revision]);
  for (const value of [revision, "accepted", "HEAD"])
    assert.throws(
      () => checkHandoffArguments(["--accepted-revision", value]),
      /exact main-gate/,
    );
  for (const key of [
    "apply",
    "reviews",
    "check-incomplete",
    "restored-sc-baseline",
  ])
    assert.throws(
      () => checkHandoffArguments([`--${key}`, "yes"]),
      /handoff option/,
    );
  git("add", ".");
  git(
    "-c",
    "user.name=Portable Test",
    "-c",
    "user.email=test@example.invalid",
    "commit",
    "-m",
    "synthetic evidence",
  );
  const evidenceRevision = git("rev-parse", "HEAD");
  bindCommittedInputs(root, evidenceRevision, [decisions]);
  writeFileSync(
    decisions,
    readFileSync(decisions, "utf8").replace("合成审阅", "变文审阅"),
  );
  assert.throws(
    () => bindCommittedInputs(root, evidenceRevision, [decisions]),
    /changed committed/,
  );
  save(decisions, reviews);
  assert.throws(() => bindCommittedInputs(root, revision, [decisions]));
  const sourceFile = join(source, "synthetic.txt");
  writeFileSync(
    sourceFile,
    bytes.toString("utf8").replace("合成正文", "变文正文"),
  );
  assert.throws(
    () => bindCommittedInputs(root, evidenceRevision, [sourceFile]),
    /changed committed/,
  );
  assert.throws(
    () => validateQaInputs(args),
    /source or publication map is dirty/,
  );
  writeFileSync(sourceFile, bytes);
  const common = [
    "--data-root",
    root,
    "--rules-db",
    rulesPath,
    "--content-db",
    contentPath,
  ];
  // The fixed acceptance establishes absence only. CHM/English QA still passes
  // after an independent effective overlay appears, but the real entry must reject.
  const ownedOutput = join(
    root,
    "dice-handoffs/issue-527/unaccepted-predecessor",
  );
  db = new Database(contentPath);
  db.exec(`INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionText,nameProvenanceJson,bodyProvenanceJson)
    VALUES('other-owner-target',355,53,'zh','effective','unreviewed-newer-text','other body',
      '{"acceptedRevision":"other-owner"}','{"acceptedRevision":"other-owner"}')`);
  db.close();
  for (const state of ["inserted", "changed"]) {
    if (state === "changed") {
      db = new Database(contentPath);
      db.exec(
        "UPDATE I18nSpellText SET name='changed-effective-only',bodyProvenanceJson='different-owner' WHERE id='other-owner-target'",
      );
      db.close();
    }
    const protectedBytes = [readFileSync(rulesPath), readFileSync(contentPath)];
    assert.deepEqual(
      validateQaInputs(args).result.accepted,
      e.accepted,
      "effective-only change leaves CHM/English formal QA unchanged",
    );
    const reader = new Database(contentPath, {
      readonly: true,
      fileMustExist: true,
    });
    reader.pragma("query_only=ON");
    try {
      assert.throws(
        () => planDbEnglishHandoff(reader, e),
        /unexpected existing effective target predecessor/,
      );
    } finally {
      reader.close();
    }
    assert.throws(
      () => runDbEnglishHandoff([...common, "--report-dir", ownedOutput]),
      /unexpected existing effective target predecessor/,
    );
    assert(
      !existsSync(ownedOutput),
      "rejected effective predecessor creates no output",
    );
    assert.deepEqual(
      [readFileSync(rulesPath), readFileSync(contentPath)],
      protectedBytes,
      "rejected predecessor preserves complete DB bytes",
    );
  }
  db = new Database(contentPath);
  db.exec("DELETE FROM I18nSpellText WHERE id='other-owner-target'");
  db.close();
  assert.throws(
    () => runDbEnglishHandoff([...common, "--report-dir", book]),
    /owned|belong/,
  );
  assert.throws(
    () => runDbEnglishHandoff([...common, "--report-dir", source]),
    /owned|belong/,
  );
  const existingOutput = join(root, "dice-handoffs/issue-527/existing");
  mkdirSync(existingOutput, { recursive: true });
  assert.throws(
    () => runDbEnglishHandoff([...common, "--report-dir", existingOutput]),
    /fresh output/,
  );
  const contentLink = join(temp, "content-link.sqlite");
  linkSync(rulesPath, contentLink);
  assert.throws(
    () =>
      runDbEnglishHandoff([
        "--data-root",
        root,
        "--rules-db",
        rulesPath,
        "--content-db",
        contentLink,
        "--report-dir",
        join(root, "dice-handoffs/issue-527/same-file"),
      ]),
    /alias the same/,
  );
  const alias = join(temp, "alias");
  symlinkSync(root, alias, process.platform === "win32" ? "junction" : "dir");
  assert.throws(
    () =>
      runDbEnglishHandoff([
        "--data-root",
        alias,
        "--rules-db",
        rulesPath,
        "--content-db",
        contentPath,
        "--report-dir",
        join(alias, "dice-handoffs/issue-527/check"),
      ]),
    /alias/,
  );
  assert.throws(
    () =>
      runDbEnglishHandoff([
        ...common,
        "--report-dir",
        join(root, "dice-handoffs/issue-527/check"),
      ]),
    /Command failed/,
  );
  console.log(
    "DB-English handoff portable checks passed; complete synthetic DB bytes preserved",
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
