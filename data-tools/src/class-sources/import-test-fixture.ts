/** Synthetic fixed-input transport for importer/HTTP tests; no private corpus. */
import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import Database from "better-sqlite3";
import { previousClassSourceRevision, acceptedClassSourceRevision, classSourceEvidenceRevision,
  classSourceScope, type ClassSourceHandoff } from "./import";
import { loadAcceptedClassSources, importClassSources } from "./import";
import { repoRoot } from "../shared/env";

type FixtureSource = {
  id: number; character_class_id: number; rulebook_id: number; page: number;
  key: string; className: string; edition: string; sourceRevision: string;
  proposal: { relation: string }; authoritativeEvidence: { synthetic: string };
};

export function createClassSourceFixture(root: string) {
  const chm = "7aed6890d88a6472f5fe9a857050a3823bdbf8ca";
  const targets = [
    [98, 37, 26, "Mystic"], [22, 462, 669, "Hathran"],
    [109, 860, 974, "Death Master"], [109, 861, 975, "Jester"],
    [109, 863, 977, "Savant"], [109, 864, 978, "Sha'ir"],
    [109, 865, 979, "Urban Druid"], [75, 18, 76, "Favored Soul"], [75, 16, 79, "Warmage"],
  ] as const;
  const classes = [...targets.map(([, id, , name]) => ({ id, name })),
    ...Array.from({ length: 60 }, (_, i) => ({ id: 1001 + i, name: `Synthetic ${i}` }))]
    .map((c) => ({ ...c, slug: `class-${c.id}`, prestige: c.id === 462 ? 1 : 0,
      listKind: "spells", versionKeys: [] as string[], supportedVersionKeys: [] as string[],
      excludedVersionKeys: [] as string[], uncertainVersionKeys: [] as string[] }));
  const groups = { supported: [] as FixtureSource[], excluded: [] as FixtureSource[], uncertain: [] as FixtureSource[] };
  const add = (book: number, classId: number, id: number, group: keyof typeof groups) => {
    const owner = classes.find((row) => row.id === classId)!;
    const key = `${book}:${classId}:${id}`;
    const row = { id, character_class_id: classId, rulebook_id: book, page: 1,
      key, className: owner.name, edition: "DnD 3.5", sourceRevision: chm,
      proposal: { relation: "class-entry" }, authoritativeEvidence: { synthetic: key } };
    groups[group].push(row);
    owner.versionKeys.push(key);
    owner[group === "uncertain" ? "uncertainVersionKeys" : group === "excluded" ? "excludedVersionKeys" : "supportedVersionKeys"].push(key);
  };
  for (const [book, classId, id] of targets) add(book, classId, id, "uncertain");
  for (let i = 0; i < 60; i++) add(500, 1001 + i, 10001 + i, "supported");
  add(501, 18, 10101, "supported"); add(501, 16, 10102, "supported");
  add(501, 1001, 10103, "supported"); add(502, 1001, 10104, "supported");
  for (let i = 0; i < 11; i++) add(503, 1001 + i, 10201 + i, "excluded");
  const committed = new Map<string, Buffer>();
  const save = (revision: string, file: string, value: unknown) => {
    const text = JSON.stringify(value, null, 2) + "\n";
    committed.set(`${revision}:${file}`, Buffer.from(text));
    const full = path.join(root, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text);
  };
  const baseDir = "class-sources/issue-619/";
  save(previousClassSourceRevision, baseDir + "final-handoff.json", {
    sourceRevision: chm, counts: { classesInvestigated: 69, versionsInvestigated: 84 },
  });
  save(previousClassSourceRevision, baseDir + "final-classes.json", classes);
  save(previousClassSourceRevision, baseDir + "final-supported-relationships.json", groups.supported);
  save(previousClassSourceRevision, baseDir + "final-excluded-relationships.json", groups.excluded);
  save(previousClassSourceRevision, baseDir + "final-source-uncertain.json", groups.uncertain);
  const promotionIds = [974, 977, 979, 76, 79];
  const decisions = groups.uncertain.map((old) => ({
    ...old, proposedStatus: promotionIds.includes(old.id) ? "supported" : "unknown",
    relation: old.rulebook_id === 75 ? "reprint" : "class-entry",
    evidenceLocators: [`entry-${old.id}`], priorAuthoritativeEvidence: old.authoritativeEvidence,
    editionSourceId: "publisher-edition", identityComparison: "Synthetic identity only",
    rationale: "Synthetic accepted evidence; not original book text",
  }));
  const envelope = { baselineCommit: previousClassSourceRevision,
    evidenceCommit: classSourceEvidenceRevision, priorChmRevision: chm, rows: decisions };
  save(acceptedClassSourceRevision, "class-sources/issue-632/proposed-dispositions.json", envelope);
  save(acceptedClassSourceRevision, "class-sources/issue-632/proposed-support-delta.json", {
    ...envelope, rows: decisions.filter((row) => row.proposedStatus === "supported"),
  });
  save(classSourceEvidenceRevision, "class-sources/issue-632/sources.json", [
    { id: "publisher-edition", type: "synthetic-publisher-edition" },
    ...targets.map(([, , id]) => ({ id: `source-${id}`, type: "synthetic-external-publisher",
      locators: [{ id: `entry-${id}` }], limitations: "Synthetic; no private text" })),
  ]);
  const rulesPath = path.join(root, "rules.sqlite");
  const rules = new Database(rulesPath);
  rules.exec(`CREATE TABLE dnd_dndedition(id INTEGER PRIMARY KEY, system TEXT);
    INSERT INTO dnd_dndedition VALUES(1,'DnD 3.5');
    CREATE TABLE dnd_rulebook(id INTEGER PRIMARY KEY, dnd_edition_id INTEGER);
    CREATE TABLE dnd_characterclass(id INTEGER PRIMARY KEY,name TEXT,slug TEXT,prestige INTEGER);
    CREATE TABLE dnd_characterclassvariant(id INTEGER PRIMARY KEY,character_class_id INTEGER,rulebook_id INTEGER,page INTEGER);`);
  for (const c of classes) rules.prepare("INSERT INTO dnd_characterclass VALUES(?,?,?,?)").run(c.id, c.name, c.slug, c.prestige);
  const all = [...groups.supported, ...groups.excluded, ...groups.uncertain];
  for (const id of new Set(all.map((row) => row.rulebook_id))) rules.prepare("INSERT INTO dnd_rulebook VALUES(?,1)").run(id);
  for (const row of all) rules.prepare("INSERT INTO dnd_characterclassvariant VALUES(?,?,?,?)").run(row.id, row.character_class_id, row.rulebook_id, row.page);
  rules.close();
  // Child CLI processes get exactly the same fake Git transport. Production has
  // no configurable revision/reader seam; file equality/identity checks stay real.
  const gitData = path.join(root, "git-fixture.json");
  fs.writeFileSync(gitData, JSON.stringify(Object.fromEntries([...committed].map(([k, v]) => [k, v.toString()]))));
  const hook = path.join(root, "git-fixture.cjs");
  fs.writeFileSync(hook, `const cp=require('node:child_process'); const fs=require('node:fs');
const values=JSON.parse(fs.readFileSync(${JSON.stringify(gitData)},'utf8'));
cp.execFileSync=(cmd,args)=>{if(cmd!=='git'||args[0]!=='-C'||args[1]!==${JSON.stringify(root)}||args[2]!=='show'||!Object.hasOwn(values,args[3]))throw Error('Unexpected fixed Git request');return Buffer.from(values[args[3]]);};`);
  return { rulesPath, hook, committed, classes, groups,
    withGit<T>(run: () => T): T {
      const original = childProcess.execFileSync;
      childProcess.execFileSync = ((cmd: string, args: string[]) => {
        const value = committed.get(args[3]!);
        if (cmd !== "git" || args[0] !== "-C" || args[1] !== root || args[2] !== "show" || !value)
          throw new Error("Unexpected fixed Git request");
        return value;
      }) as typeof childProcess.execFileSync;
      syncBuiltinESMExports();
      try { return run(); } finally { childProcess.execFileSync = original; syncBuiltinESMExports(); }
    },
  };
}

export function seedPreviousClassSources(db: Database.Database, handoff: ClassSourceHandoff) {
  const insert = db.prepare("INSERT INTO ClassSourceMapping VALUES (?,?,?,?,?,?,?,?,?,?)");
  for (const row of handoff.previous.rows) insert.run(row.variantId, row.classId, row.rulebookId,
    row.name, row.slug, row.prestige, row.listKind, row.disposition, row.relation, row.evidenceJson);
  db.prepare("INSERT INTO ClassSourceImport VALUES(1,?,?,?)").run(
    handoff.previous.revision, handoff.previous.sourceRevision, classSourceScope,
  );
}

// Existing HTTP test convention: execute data tooling in a subprocess, keeping
// it outside the API runtime/package boundary and its generated output.
if (require.main === module) {
  const [root, contentFile, action] = process.argv.slice(2);
  assert(root && contentFile && ["prepare", "upgrade"].includes(action!));
  assert(path.basename(path.dirname(contentFile)).startsWith("spellbook-api-test-"));
  assert(path.resolve(path.dirname(root)) === path.resolve(path.dirname(contentFile)));
  const fixture = action === "prepare" ? createClassSourceFixture(root) : undefined;
  if (!fixture) require(path.join(root, "git-fixture.cjs"));
  const rules = new Database(path.join(root, "rules.sqlite"), { readonly: true });
  const content = new Database(contentFile, { fileMustExist: true });
  try {
    const handoff = fixture
      ? fixture.withGit(() => loadAcceptedClassSources(root, rules))
      : loadAcceptedClassSources(root, rules);
    if (action === "prepare") {
      content.exec(fs.readFileSync(path.join(repoRoot(),
        "server/db/content/migrations/20261008200000_add_class_source_mapping/migration.sql"), "utf8"));
      seedPreviousClassSources(content, handoff);
      console.log(JSON.stringify({ revision: handoff.previous.revision }));
    } else console.log(JSON.stringify({ revision: handoff.revision, ...importClassSources(content, handoff, true) }));
  } finally { rules.close(); content.close(); }
}
