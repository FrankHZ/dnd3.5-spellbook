import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {bindCommittedInputs} from "./db-english-handoff";
import {diceCloseoutOverlay} from "./closeout-overlay";
import Database from "better-sqlite3";
import {prepareOverlayFixture} from "./db-english-overlay-test-fixtures";
import {contentSearchStep} from "../db/content-search-step";
import type {CloseoutField, DiceCloseout} from "./closeout-types";

/** Synthetic fixed acceptance, exercised through the same production projector and writer. */
export function prepareCloseoutOverlayFixture(temp: string, contentFile?: string) {
  const f = prepareOverlayFixture(temp, contentFile);
  const db = new Database(f.contentPath);
  try {
    db.prepare(`INSERT INTO I18nSpellText(id,spellId,rulebookId,lang,variant,name,descriptionHtml,descriptionText,sourceKey,updatedAt)
      VALUES('retained-chm',356,53,'zh','chm','旧名称','<p>保留CHM正文 retainedchmtoken</p>','保留CHM正文 retainedchmtoken','chm-fixture','2026-01-02 00:00:00')`).run();
    contentSearchStep(db, "apply");
  } finally {db.close();}
  const targets = [355, 356, 357, 358, 359];
  const field = (id: number, name: CloseoutField["field"], authority: CloseoutField["authority"], after: string): CloseoutField => ({
    targetId: id, rulebookId: 53, field: name, before: id === 356 && name === "name" ? "旧名称" : null,
    after, language: id === 358 ? "mixed" : "zh", authority,
    provenance: {issue: 586, pr: 588, publicHead: "a".repeat(40), revision: "b".repeat(40),
      path: "dice-baselines/synthetic/accepted.jsonl", row: id - 354,
      sourceKey: authority === "independent-db-english" ? null : `synthetic:${id}`,
      historicalRevision: authority === "recovered-db-english" ? "c".repeat(40) : null,
      historicalContinuityAuthenticated: authority !== "recovered-db-english"},
    residuals: id === 358 ? [{ownerIssue: 201, path: "dice-baselines/synthetic/residuals.jsonl", row: 1}] : [],
  });
  const fields = [field(355, "name", "independent-db-english", "验收名字 uniquenametoken"),
    field(355, "descriptionHtml", "independent-db-english", "<p>独立译文 newbodytoken</p><ul><li>第一项</li><li>第二项</li></ul>"),
    field(356, "name", "recovered-db-english", "恢复名字 recoveredtoken"),
    field(357, "name", "native-db-english", "仅名字 nameonlytoken"),
    field(358, "descriptionHtml", "native-db-english", "<p>已译正文 mixedbodytoken</p><p>Unresolved English clause.</p>"),
    field(359, "name", "native-db-english", "原生名字 nativetoken"),
    field(359, "descriptionHtml", "native-db-english", "<pre>完整译文。\n保留换行。</pre>")];
  function snapshot(db: Database.Database): DiceCloseout {
    return {fields: structuredClone(fields), targets: targets.map(targetId => ({targetId,
      english: f.english.get(targetId)!, englishHtml: `<p>${f.english.get(targetId)!.description}</p>`,
      chinese: db.prepare("SELECT * FROM I18nSpellText WHERE spellId=? AND lang='zh' ORDER BY variant").all(targetId) as Record<string, unknown>[] })),
      retained: [], report: {issue: 586, protectedRulebookIds: [6,86,106], sourceFiles: 1, candidateOccurrences: 8,
        existingTargets: 8, referenceSnapshotsChecked: 0, historicalComparisonsBound: 0, fields: fields.length, targets: targets.length, byAuthority: {}, retained: 0,
        elapsedMs: 0, peakRssKiB: 0, operatorWrites: false, historicalContinuityAuthenticated: false}};
  }
  const stored = new Database(f.contentPath, {readonly: true});
  const evidenceFile = path.join(f.root, "synthetic-closeout.json");
  try {fs.writeFileSync(evidenceFile, JSON.stringify(snapshot(stored)));} finally {stored.close();}
  f.git("add", "synthetic-closeout.json");
  f.git("-c", "user.name=Portable", "-c", "user.email=portable@example.invalid", "commit", "-qm", "synthetic closeout acceptance");
  const committed = f.git("rev-parse", "HEAD");
  const authenticate = (_db: Database.Database): DiceCloseout => {
    bindCommittedInputs(f.root, committed, [evidenceFile, f.decisions]);
    return JSON.parse(fs.readFileSync(evidenceFile, "utf8"));
  };
  return {...f, fields, targets, evidenceFile, authenticateCloseout: authenticate};
}

if (require.main === module) {
  const [temp, file, action = "prepare"] = process.argv.slice(2);
  assert(temp && file);
  if (action === "prepare") {
    const f = prepareCloseoutOverlayFixture(temp, file);
    console.log(JSON.stringify({targets: f.targets, fields: f.fields}));
  } else {
    assert(action === "apply" || action === "check");
    const root = path.join(temp, "data"), evidenceFile = path.join(root, "synthetic-closeout.json");
    const revision = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {encoding: "utf8"}).trim();
    const authenticate = () => {
      bindCommittedInputs(root, revision, [evidenceFile]);
      return JSON.parse(fs.readFileSync(evidenceFile, "utf8")) as DiceCloseout;
    };
    const db = new Database(file, {readonly: action === "check", fileMustExist: true});
    try {console.log(JSON.stringify(diceCloseoutOverlay(db, authenticate, action)));}
    finally {db.close();}
  }
}
