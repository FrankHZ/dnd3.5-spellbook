import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { parseDiceFile } from "./parse";
import { reconcile } from "./reconcile";
import { loadEnglishRecords, validateQaInputs, type Review } from "./qa";
import {
  cityscapeAcceptance as a,
  type HandoffEvidence,
} from "./db-english-handoff";
export function prepareHandoffFixture(temp: string, contentFile?: string) {
  const root = join(temp, "data"),
    baseline = join(root, "dice-baselines/issue-520");
  const source = join(root, "spells-dice-db-by-mo"),
    intake = join(baseline, "intake");
  const book = join(root, a.directory),
    rulesPath = join(temp, "rules.sqlite"),
    contentPath = contentFile ?? join(temp, "content.sqlite");
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
    rules.prepare("INSERT INTO dnd_spellclasslevel VALUES(?,?,1,3,'')").run(id, id);
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
  return {root, baseline, source, intake, book, rulesPath, contentPath, save, git, bytes, revision, english, e, reviews, decisions, args, qa};
}
