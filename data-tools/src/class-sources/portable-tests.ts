import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import iconv from "iconv-lite";
import { decodeHtml, parseDirectory, parseScope, matchEvidence, nameKeys, validateProposals, verifyContentsBinding, type Candidate, type Evidence } from "./scanner";
import { repoRoot } from "../shared/env";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "class-source-test-"));
try {
  const chm = path.join(root, "chm"), data = path.join(root, "data"), output = path.join(data, "pilot");
  fs.mkdirSync(path.join(chm, "甲"), { recursive: true }); fs.mkdirSync(path.join(chm, "乙"));
  fs.mkdirSync(output, { recursive: true }); fs.mkdirSync(path.join(data, "rulebook-publications"));
  const object = (label: string, local = "") => `<LI><OBJECT type="text/sitemap"><param name="Name" value="${label}">${local ? `<param name="Local" value="${local}">` : ""}</OBJECT>`;
  const text = `<UL>${object("[A] 甲", "甲/cover.htm")}<UL>${object("基础职业")}<UL>${object("先知 (Seer)", "甲/class.htm")}</UL>${object("法术列表")}<UL>${object("先知 (Seer)", "甲/spells.htm")}</UL></UL>${object("[B] 乙", "乙/cover.htm")}<UL>${object("基础职业")}<UL>${object("先知 (Seer)", "乙/class.htm")}${object("跨书参照", "甲/class.htm")}</UL>${object("变体")}<UL>${object("先知 (Seer)", "乙/variant.htm")}</UL></UL></UL>`;
  const decoded = decodeHtml(iconv.encode(text.replace("先知 (Seer)", "先知 (Se&#101;r) &amp;"), "gbk"));
  assert.ok(decoded.includes("先知"));
  assert.ok(parseDirectory(decoded, "Contents.hhc").some(e => e.label === "先知 (Seer) &"));
  assert.equal(decodeHtml(Buffer.from('\ufeff<meta charset="utf-8">职业')), '<meta charset="utf-8">职业');
  assert.throws(() => decodeHtml(Buffer.from('<meta charset="utf-8">\xff', "latin1")), /replacement/);
  assert.throws(() => decodeHtml(Buffer.from('<meta charset="unknown">')), /Unsupported/);
  const entries = parseDirectory(text, "Contents.hhc");
  assert.deepEqual(entries.find(e => e.label === "跨书参照")!.ancestors, ["[B] 乙", "基础职业"]);
  assert.equal(entries.find(e => e.local === "甲/spells.htm")!.role, "spell-list-reference");
  assert.ok(nameKeys("先知Seer").includes("seer"));
  assert.ok(!nameKeys("Seer Variant").includes("seer"));
  assert.ok(!nameKeys("Order Keeper (Seer)").includes("seer"));
  const identities = [1, 2].map(id => ({ id, name: "Seer", slug: `seer-${id}`, prestige: 0, aliases: ["先知"] }));
  assert.deepEqual(matchEvidence(identities, entries).find(m => m.classIds.length)!.classIds, [1, 2]);
  const scope = { schemaVersion: 1, books: [{ publicationId: 1, prefix: "甲", contentsLabel: "[A] 甲" }, { publicationId: 2, prefix: "乙", contentsLabel: "[B] 乙" }], pages: ["甲/class.htm"], probes: [{ classId: 3, publicationId: 2 }] };
  parseScope(scope);
  for (const prefix of ["../escape", "/absolute", "C:/absolute", "a/../../escape"]) assert.throws(() => parseScope({ ...scope, books: [{ ...scope.books[0], prefix }] }), /Unsafe/);
  assert.throws(() => parseScope({ ...scope, books: [scope.books[0], scope.books[0]] }), /Duplicate/);
  assert.throws(() => parseScope({ ...scope, pages: ["outside/page.htm"] }), /outside/);
  for (const variantIds of [[], [0], ["10"], [10, 10]]) assert.throws(() => parseScope({ ...scope, variantIds }), /variant selection/);
  fs.writeFileSync(path.join(chm, "Contents.hhc"), iconv.encode(text, "gbk"));
  fs.writeFileSync(path.join(chm, "Index.hhk"), iconv.encode(`<UL>${object("先知 (Seer)", "甲/class.htm")}</UL>`, "gbk"));
  for (const file of ["甲/cover.htm", "甲/class.htm", "甲/spells.htm", "乙/cover.htm", "乙/class.htm", "乙/variant.htm"]) {
    fs.writeFileSync(path.join(chm, file), iconv.encode("<html><head><title>先知 (Seer)</title></head><body><h1>先知 Seer</h1><p>一个合成示例。</p></body></html>", "gbk"));
  }
  const git = (...args: string[]) => execFileSync("git", ["-C", chm, ...args], { stdio: "pipe" });
  git("init"); git("add", "."); git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "-m", "synthetic");
  const rulesPath = path.join(root, "rules.sqlite"), contentPath = path.join(root, "content.sqlite");
  const rules = new Database(rulesPath);
  rules.exec("CREATE TABLE dnd_characterclass(id INTEGER, name TEXT, slug TEXT, prestige INTEGER); CREATE TABLE dnd_characterclassvariant(id INTEGER, character_class_id INTEGER, rulebook_id INTEGER, page INTEGER); CREATE TABLE dnd_rulebook(id INTEGER,name TEXT,abbr TEXT,slug TEXT);");
  rules.exec("INSERT INTO dnd_characterclass VALUES(1,'Seer','seer',0),(2,'Seer','seer-2',1),(3,'Missing','missing',0); INSERT INTO dnd_characterclassvariant VALUES(10,1,1,5),(11,1,2,7),(12,2,2,9); INSERT INTO dnd_rulebook VALUES(1,'Alpha','A','alpha'),(2,'Beta','B','beta');"); rules.close();
  const content = new Database(contentPath); content.exec("CREATE TABLE I18nCharacterClassText(classId INTEGER,name TEXT,lang TEXT,variant TEXT); INSERT INTO I18nCharacterClassText VALUES(1,'先知','zh','default'),(2,'先知','zh','default');"); content.close();
  const publications = [1, 2].map(id => ({ schemaVersion: 1, legacyRulebookId: id, source: "synthetic", name: id === 1 ? "Alpha" : "Beta", abbr: id === 1 ? "A" : "B", category: "supplement", family: "core", sourceKind: "rulebook", displayOrder: id, reviewStatus: "accepted" }));
  fs.writeFileSync(path.join(data, "rulebook-publications/publications.jsonl"), publications.map(x => JSON.stringify(x)).join("\n"));
  const scopePath = path.join(root, "scope.json"); fs.writeFileSync(scopePath, JSON.stringify(scope));
  const before = [rulesPath, contentPath].map(p => fs.readFileSync(p));
  const cli = path.join(repoRoot(), "data-tools/src/class-sources/cli.ts");
  const tsx = path.join(repoRoot(), "node_modules/tsx/dist/cli.mjs");
  const run = (cwd: string, out: string, extra: string[] = []) => spawnSync(process.execPath, [tsx, cli, "--chm-root", chm, "--rules-db", rulesPath, "--content-db", contentPath, "--scope", path.relative(repoRoot(), scopePath), "--out", out, ...extra], { cwd, encoding: "utf8", env: { ...process.env, DATA_REPO_PATH: data } });
  for (const [index, cwd] of [repoRoot(), path.join(repoRoot(), "data-tools")].entries()) {
    const result = run(cwd, path.join(output, `run-${index}`));
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.inventory.dbClasses, 3); assert.equal(report.inventory.htmlFiles, 6);
    assert.equal(report.scope.variantTargets, 3); assert.equal(report.results.noExactNameHit, 1);
  }
  const jsonl = <T>(name: string) => fs.readFileSync(path.join(output, "run-0", name), "utf8").trim().split("\n").map(x => JSON.parse(x) as T);
  for (const name of ["scope.json", "identities.json", "evidence.jsonl", "matches.jsonl", "candidates.jsonl"]) assert.equal(fs.readFileSync(path.join(output, "run-0", name), "utf8"), fs.readFileSync(path.join(output, "run-1", name), "utf8"));
  const evidence = jsonl<Evidence>("evidence.jsonl"), candidates = jsonl<Candidate>("candidates.jsonl");
  assert.equal(candidates.length, 4); assert.ok(candidates.some(c => c.variantId === 10)); assert.ok(candidates.some(c => c.variantId === 11));
  const cross = evidence.find(e => e.label === "跨书参照")!;
  assert.equal(cross.contextPublicationId, 2); assert.equal(cross.targetPublicationId, 1);
  const book = scope.books[0]!;
  const parent = evidence.find(e => e.source === "Contents.hhc" && e.label === book.contentsLabel)!;
  const child = evidence.find(e => e.source === "Contents.hhc" && e.local === "甲/class.htm")!;
  const noLocal = { ...parent, local: null, targetExists: false, targetPublicationId: null };
  const filler = { ...parent, local: "填充页面.htm", targetExists: true, targetPublicationId: null };
  assert.ok(verifyContentsBinding(book, [parent]));
  for (const node of [noLocal, filler]) {
    assert.ok(verifyContentsBinding(book, [node, child]));
    assert.ok(!verifyContentsBinding(book, [node]));
    assert.ok(!verifyContentsBinding(book, [node, { ...child, source: "Index.hhk" }]));
    assert.ok(!verifyContentsBinding(book, [{ ...node, source: "Index.hhk" }, child]));
    assert.ok(!verifyContentsBinding(book, [node, { ...child, ancestors: ["[B] 乙"] }]));
    assert.ok(!verifyContentsBinding(book, [node, { ...child, ancestors: [] }]));
    assert.ok(!verifyContentsBinding(book, [node, { ...child, targetExists: false }]));
    assert.ok(!verifyContentsBinding(book, [node, { ...child, local: "乙/class.htm", targetPublicationId: 2 }]));
    assert.ok(!verifyContentsBinding(book, [node, { ...child, contextPublicationId: 2 }]));
  }
  assert.ok(!verifyContentsBinding(book, [{ ...parent, source: "Index.hhk" }]));
  assert.ok(!verifyContentsBinding(book, [{ ...parent, targetExists: false }]));
  assert.ok(!verifyContentsBinding({ ...book, contentsLabel: "龙杂志" }, [
    { ...noLocal, label: "龙杂志" }, { ...child, ancestors: ["龙杂志"] },
  ]));
  // Exercise parsing, filesystem existence and context assignment together.
  for (const [name, parentLocal] of [["no-local", ""], ["filler", "乙/cover.htm"]] as const) {
    fs.writeFileSync(path.join(chm, "Contents.hhc"), iconv.encode(text.replace(object("[A] 甲", "甲/cover.htm"), object("[A] 甲", parentLocal)), "gbk"));
    git("add", "Contents.hhc"); git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "-m", name);
    assert.equal(run(repoRoot(), path.join(output, `binding-${name}`)).status, 0);
  }
  fs.writeFileSync(path.join(chm, "Contents.hhc"), iconv.encode(text, "gbk"));
  git("add", "Contents.hhc"); git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "-m", "restore direct binding");
  const proposals = candidates.map(c => ({ key: c.key, disposition: "ambiguous", relation: "unknown", evidenceIds: [evidence.find(e => e.targetPublicationId === c.publicationId)!.id], rationale: "Synthetic identity requires review." }));
  const revision = git("rev-parse", "HEAD").toString().trim();
  const envelope = (rows: unknown) => ({ schemaVersion: 1, sourceRevision: revision, rows });
  const validate = (rows: unknown) => validateProposals(envelope(rows), candidates, evidence, revision);
  validate(proposals);
  assert.throws(() => validateProposals({ ...envelope(proposals), sourceRevision: "stale" }, candidates, evidence, revision), /revision/);
  assert.throws(() => validate(proposals.slice(1)), /entire/);
  assert.throws(() => validate([...proposals, proposals[0]]), /duplicate/);
  const replace = (replacement: Record<string, unknown>) => proposals.map((p, i) => i ? p : { ...p, ...replacement });
  assert.throws(() => validate(replace({ classId: 999 })), /Unknown proposal field/);
  assert.throws(() => validate(replace({ evidenceIds: ["missing"] })), /Unknown evidence/);
  assert.throws(() => validate(replace({ evidenceIds: [evidence.find(e => e.targetPublicationId === 2 && e.contextPublicationId !== 1)!.id] })), /unrelated/);
  assert.throws(() => validate(replace({ disposition: "accepted", relation: "spell-list-reference" })), /References/);
  assert.throws(() => validate(replace({ disposition: "accepted", relation: "class-entry", evidenceIds: [evidence.find(e => e.local === "甲/spells.htm")!.id] })), /local class/);
  const valid = replace({ disposition: "accepted", relation: "class-entry", evidenceIds: [evidence.find(e => e.local === "甲/class.htm" && e.role === "class-entry")!.id] });
  const proposalsPath = path.join(root, "proposals.json"); fs.writeFileSync(proposalsPath, JSON.stringify(envelope(valid)));
  assert.equal(run(repoRoot(), path.join(output, "review"), ["--proposals", proposalsPath]).status, 0);
  const selectedScope = { ...scope, probes: [], variantIds: [11] };
  fs.writeFileSync(scopePath, JSON.stringify(selectedScope));
  for (const [index, cwd] of [repoRoot(), path.join(repoRoot(), "data-tools")].entries()) {
    const result = run(cwd, path.join(output, `selected-${index}`));
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).scope.variantTargets, 1);
  }
  const selectedCandidates = fs.readFileSync(path.join(output, "selected-0/candidates.jsonl"), "utf8").trim().split("\n").map(x => JSON.parse(x) as Candidate);
  assert.deepEqual(selectedCandidates.map(c => c.key), ["2:1:11"]);
  for (const name of ["scope.json", "identities.json", "evidence.jsonl", "matches.jsonl", "candidates.jsonl"]) assert.equal(fs.readFileSync(path.join(output, "selected-0", name), "utf8"), fs.readFileSync(path.join(output, "selected-1", name), "utf8"));
  const selectedProposals = proposals.filter(p => p.key === "2:1:11");
  validateProposals(envelope(selectedProposals), selectedCandidates, evidence, revision);
  assert.throws(() => validateProposals(envelope([]), selectedCandidates, evidence, revision), /entire/);
  assert.throws(() => validateProposals(envelope(proposals), selectedCandidates, evidence, revision), /Unknown/);
  fs.writeFileSync(proposalsPath, JSON.stringify(envelope(selectedProposals)));
  assert.equal(run(repoRoot(), path.join(output, "selected-review"), ["--proposals", proposalsPath]).status, 0);
  for (const [name, badScope, message] of [
    ["unknown", { ...selectedScope, variantIds: [999] }, /Unknown selected variant/],
    ["wrong-book", { ...selectedScope, books: [scope.books[0]], variantIds: [11] }, /outside scoped books/],
    ["probe-variant", { ...selectedScope, probes: [{ classId: 1, publicationId: 1 }] }, /Probe duplicates/],
  ] as const) {
    fs.writeFileSync(scopePath, JSON.stringify(badScope));
    const rejected = run(repoRoot(), path.join(output, name));
    assert.equal(rejected.status, 1); assert.match(rejected.stderr, message);
    assert.ok(!fs.existsSync(path.join(output, name)));
  }
  fs.writeFileSync(scopePath, JSON.stringify(scope));
  assert.equal(run(repoRoot(), path.join(output, "run-0")).status, 1);
  assert.equal(run(repoRoot(), path.join(root, "outside")).status, 1);
  for (const [i, p] of [rulesPath, contentPath].entries()) assert.deepEqual(fs.readFileSync(p), before[i]);
  assert.equal(git("status", "--porcelain").toString().trim(), "");
  fs.writeFileSync(path.join(chm, "dirty.htm"), "dirty");
  const dirty = run(repoRoot(), path.join(output, "dirty")); assert.equal(dirty.status, 1); assert.match(dirty.stderr, /must be clean/);
  assert.ok(!fs.existsSync(path.join(output, "dirty")));
  console.log("class-sources portable checks passed (decoding, hierarchy, identity, review, read-only and both cwd boundaries)");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
