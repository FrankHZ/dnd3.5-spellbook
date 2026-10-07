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
import {validateQaInputs} from "./qa";
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

import {prepareHandoffFixture} from "./db-english-test-fixtures";

const temp = mkdtempSync(join(tmpdir(), "dice-handoff-"));
try {
  const {root, source, book, rulesPath, contentPath, save, git, bytes, revision, english, e, reviews, decisions, args, qa} = prepareHandoffFixture(temp);
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
