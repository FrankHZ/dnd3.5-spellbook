import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { repoRoot } from "../shared/env";

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "spellbook-summary-normalize-"));
const data = path.join(fixture, "private data");
const source = path.join(fixture, "source index");
const rules = path.join(fixture, "rules.sqlite");
const cli = path.join(repoRoot(), "data-tools/src/short-desc/normalize.ts");
const canonical = path.join(data, "short-desc-normalized/summaries.generated.jsonl");
const matched = path.join(fixture, "matched.json");
const conflicts = path.join(fixture, "conflicts.json");
const reviews = path.join(fixture, "reviews");

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value), "utf8");
}

function run(cwd: string, report: string, extra: string[] = []) {
  return spawnSync(process.execPath, ["--import", "tsx", cli,
    "--zhMatched", matched, "--zhConflicts", conflicts,
    "--zhConflictReviewDir", reviews, "--enSourceIndex", source,
    "--report", report, ...extra], {
    cwd,
    env: { ...process.env, DATA_REPO_PATH: data, RULES_DATABASE_URL: `file:${rules.replaceAll("\\", "/")}` },
    encoding: "utf8",
  });
}

try {
  fs.mkdirSync(data);
  fs.mkdirSync(reviews);
  const db = new Database(rules);
  try {
    db.exec("CREATE TABLE dnd_rulebook (id INTEGER, abbr TEXT); " +
      "CREATE TABLE dnd_spell (id INTEGER, name TEXT, rulebook_id INTEGER); " +
      "INSERT INTO dnd_rulebook VALUES (86, 'Sc_'); " +
      "INSERT INTO dnd_spell VALUES (1, 'Synthetic Spell', 86);");
  } finally { db.close(); }
  writeJson(path.join(source, "manifest.json"), {
    sources: [{ token: "synthetic", name: "Synthetic", rulebookAbbr: "Sc_", file: "book.json" }],
  });
  writeJson(path.join(source, "book.json"), {
    rows: [{ id: 10, name: "Synthetic Spell", shortDescription: "Original candidate." }],
  });
  writeJson(matched, [{ spellId: 2, rulebookId: 86, rulebookAbbr: "Sc_",
    sourceKey: "synthetic#1", sourceKind: "class-list", summaryText: "合成候选摘要。" }]);
  writeJson(conflicts, []);
  const protectedBytes = Buffer.from([
    { stableKey: "4:en:imarvin", sourceKind: "imarvin-source-index", summaryText: "Donor." },
    { stableKey: "1:en:imarvin", sourceKind: "reviewed-summary-correction", sourceKey: "review:en", summaryText: "Reviewed English.", provenance: { derivedFrom: { sourceKey: "original:10" } } },
    { stableKey: "2:zh:chm", sourceKind: "reviewed-summary-correction", sourceKey: "review:zh", summaryText: "已审核摘要。" },
    // A reviewed reuse row is absent from both raw inputs but must still block overwriting.
    { stableKey: "3:en:imarvin", sourceKind: "reviewed-summary-correction", sourceKey: "review:reuse", summaryText: "Reviewed reuse." },
  ].map(row => JSON.stringify(row)).join("\r\n") + "\r\n", "utf8");
  fs.mkdirSync(path.dirname(canonical));
  fs.writeFileSync(canonical, protectedBytes);

  for (const [index, cwd] of [repoRoot(), path.join(repoRoot(), "data-tools")].entries()) {
    const report = path.join(fixture, `protected-report-${index}.json`);
    const oldReport = Buffer.from('{"previousReport":true}\r\n');
    fs.writeFileSync(report, oldReport);
    const blocked = run(cwd, report);
    assert.notEqual(blocked.status, 0, blocked.stdout);
    assert.match(blocked.stderr, /Refusing to overwrite.*reviewed-summary-correction/s);
    assert.match(blocked.stderr, /--out <new-file>.*explicitly review and merge/s);
    assert.deepEqual(fs.readFileSync(canonical), protectedBytes);
    assert.deepEqual(fs.readFileSync(report), oldReport);

    const explicit = path.join(data, `protected-${index}.jsonl`);
    fs.writeFileSync(explicit, protectedBytes);
    const absentReport = path.join(fixture, `absent-report-${index}.json`);
    const explicitBlocked = run(cwd, absentReport, ["--out", explicit, "--zhMatched", path.join(fixture, "missing.json")]);
    assert.notEqual(explicitBlocked.status, 0);
    assert.match(explicitBlocked.stderr, /Refusing to overwrite/);
    assert.deepEqual(fs.readFileSync(explicit), protectedBytes);
    assert.equal(fs.existsSync(absentReport), false);

    const candidateRelative = `candidates/fresh-${index}.jsonl`;
    const candidate = path.join(data, candidateRelative);
    const candidateReport = path.join(fixture, `candidate-report-${index}.json`);
    const generated = run(cwd, candidateReport, ["--out", candidateRelative]);
    assert.equal(generated.status, 0, generated.stderr);
    const bytes = fs.readFileSync(candidate);
    const rows = bytes.toString("utf8").trim().split("\n").map(line => JSON.parse(line));
    assert.deepEqual(rows.map(row => [row.stableKey, row.sourceKind, row.summaryText]), [
      ["1:en:imarvin", "imarvin-source-index", "Original candidate."],
      ["2:zh:chm", "class-list", "合成候选摘要。"],
    ]);
    assert.equal(JSON.parse(fs.readFileSync(candidateReport, "utf8")).rows, 2);
    assert.deepEqual(fs.readFileSync(canonical), protectedBytes);
    const repeated = run(cwd, candidateReport, ["--out", candidateRelative]);
    assert.equal(repeated.status, 0, repeated.stderr);
    assert.deepEqual(fs.readFileSync(candidate), bytes);
    console.log(`ok - ${index === 0 ? "root" : "package"}: protected outputs/report unchanged, no partial report, fresh and repeat candidates succeed`);
  }
} finally {
  assert.equal(path.dirname(fixture), path.resolve(os.tmpdir()));
  fs.rmSync(fixture, { recursive: true, force: true });
}
console.log("Summary normalization portable safety tests passed");
