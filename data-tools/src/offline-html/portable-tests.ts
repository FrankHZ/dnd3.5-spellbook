import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { load } from "cheerio";
import { repoRoot } from "../shared/env";
import { exportOfflineHtml, validatePages } from "./export";
import { main } from "./cli";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "offline-html-test-"));
const outputRoot = path.join(repoRoot(), "data-tools/out");
fs.mkdirSync(outputRoot, { recursive: true });
const output = fs.mkdtempSync(path.join(outputRoot, "offline-html-test-"));
const dbPath = path.join(temp, "fixture.sqlite");
const db = new Database(dbPath);
const privacy = "PRIVATE_EVIDENCE_DO_NOT_EXPORT";
const migrations = path.join(repoRoot(), "server/db/content/migrations");
for (const entry of fs.readdirSync(migrations).sort()) {
  const file = path.join(migrations, entry, "migration.sql");
  if (fs.existsSync(file)) db.exec(fs.readFileSync(file, "utf8"));
}
const provenance = (id: number, field: string, lang = "zh") => JSON.stringify({ schemaVersion: 1,
  targetId: id, field, language: lang, origin: { kind: lang === "en" ? "english" : "independent" },
  input: { path: privacy }, evidence: { sourcePassage: privacy }, originalInput: { path: privacy } });
function spell(id: number, name: string, plain: string, html: string | null, book = 86) {
  db.prepare(`INSERT INTO SpellContent (id,legacySpellId,canonicalName,slug,sourceRulebookId,
    sourcePage,schoolRaw,castingTimeRaw,rangeRaw,targetRaw,durationRaw,componentsRaw,
    descriptionText,descriptionHtml,descriptionHash,addedAt,rawJson)
    VALUES (?,?,?,?,?,42,'Fixture school','1 action','Touch','One creature','1 round','V, S',?,?,?,CURRENT_TIMESTAMP,?)`)
    .run(`spell:${id}`, id, name, `fixture-${id}`, book, plain, html, "fixture", privacy);
}
function zh(id: number, name: string, plain: string, html: string | null, lang = "zh", variant = "effective") {
  db.prepare(`INSERT INTO I18nSpellText (id,spellId,rulebookId,lang,variant,name,descriptionText,
    descriptionHtml,sourceKey,nameProvenanceJson,bodyProvenanceJson,updatedAt)
    VALUES (?,?,86,'zh',?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).run(`${variant}:${id}`, id, variant, name,
      plain, html, privacy, provenance(id, "name", lang), provenance(id, "body", lang));
}
const long = "完整段落 α & <目标>\n\n".repeat(600) + "[原文疑义] 保留说明。";
const html = '<p id="start">Full <em>emphasis</em> &amp; Unicode 雪</p><table><caption>Fixture</caption><tr><th scope="col">Roll</th><th>Result</th></tr><tr><td colspan="2">A &lt; B</td></tr></table><ul><li>Item</li></ul><p><a href="#start">Return</a> <a href="/spells/book--86/beta--2/">Beta</a> <a href="https://example.invalid/private">Outside</a></p>';
const plain = load(html, {}, false).root().text();
try {
  db.prepare(`INSERT INTO RulebookContent (id,legacyRulebookId,editionId,name,abbr,slug,rawJson,
    publicationCategory,publicationFamily,publicationSourceKind,publicationDisplayOrder)
    VALUES ('book:86',86,1,'Fixture publication','F','fixture',?,'fixture','fixture','fixture',1)`).run(privacy);
  spell(1, "Alpha & <fixture>", plain, html);
  spell(2, "Beta inherited spell", "As Alpha, except the complete inherited difference.", null);
  spell(3, "Gamma fallback", "English fallback body.", null);
  spell(4, "Other book", "DO_NOT_BLEND_NEIGHBOR", null, 87);
  zh(1, "雪 & <名字>", long, null);
  zh(2, "继承法术", plain, html);
  zh(3, "Gamma fallback", "English  fallback\tbody.\n\nPreserved final line.", '<pre>English  fallback\tbody.\n\nPreserved final line.</pre>', "en");
  zh(1, "DO_NOT_BLEND_VARIANT", "DO_NOT_BLEND_VARIANT", null, "zh", "chm");
  db.prepare(`INSERT INTO SpellListEntry (id,spellId,listType,ownerLegacyId,ownerName,ownerSlug,
    level,sourceTable,note) VALUES ('list:1','spell:1','class',1,'Fixture caster','fixture',3,'fixture','Printed ambiguity note')`).run();
  db.prepare(`INSERT INTO SpellListEntry (id,spellId,listType,ownerLegacyId,ownerName,ownerSlug,
    level,sourceTable,rawExtra,variantLabel) VALUES ('list:2','spell:1','domain',2,'Fixture domain','fixture-domain',4,'fixture','Raw domain qualifier','Printed variant')`).run();
  db.prepare(`INSERT INTO SpellTaxonomyFacet (id,spellId,facetType,facetKey,name,rawText,sourceField)
    VALUES ('facet:1','spell:1','descriptor','fixture','Normalized descriptor','Raw descriptor','fixture')`).run();
  db.prepare(`INSERT INTO SpellComponent (id,spellId,componentType,present,sourceField)
    VALUES ('component:1','spell:1','verbal',1,'fixture'),('component:2','spell:1','divine_focus',1,'fixture')`).run();
  db.prepare(`UPDATE SpellContent SET subschoolRaw='Raw subschool',effectRaw='Raw effect',areaRaw='Raw area',
    savingThrowRaw='Raw saving throw',resistanceRaw='Raw resistance',corruptLevel=2 WHERE legacySpellId=1`).run();
  const options = { contentDb: dbPath, book: 86, variant: "effective", outDir: path.join(output, "first") };
  const report = exportOfflineHtml(options);
  assert.equal(report.spells, 3); assert.equal(report.englishBodyFallbacks, 1);
  assert.equal(report.files, 7); assert.equal(report.detachedReferences, 2);
  assert.equal(report.htmlTextDifferences, 0);
  const read = (name: string) => fs.readFileSync(path.join(options.outDir, name), "utf8");
  const first = read("spell-1.html"), $ = load(first);
  assert.equal($("h1").text(), "雪 & <名字> / Alpha & <fixture>");
  assert.equal($("#zh + div").text(), long);
  assert.equal($("#en + div").text(), plain);
  assert.equal($("#en + div table td").attr("colspan"), "2");
  assert.equal($("#en + div em").text(), "emphasis");
  assert.equal($("#en + div a").eq(0).attr("href"), "#en-1-start");
  assert.equal($("#en + div a").eq(1).attr("href"), "spell-2.html");
  assert.equal($("#en + div a").eq(2).attr("href"), undefined);
  assert.ok($("#rules + table").text().includes("Printed ambiguity note"));
  const ruleText = $("#rules + table").text();
  for (const raw of ["Fixture school", "Raw subschool", "Raw descriptor", "Fixture caster 3", "Fixture domain 4",
    "Raw domain qualifier", "Printed variant", "DF, V", "V, S", "1 action", "Touch", "One creature",
    "Raw effect", "Raw area", "1 round", "Raw saving throw", "Raw resistance"]) assert.ok(ruleText.includes(raw), raw);
  assert.ok(read("spell-2.html").includes("complete inherited difference"));
  assert.ok(read("spell-3.html").includes("English body fallback"));
  assert.equal(load(read("spell-3.html"))("#zh + div pre").text(), "English  fallback\tbody.\n\nPreserved final line.");
  for (const name of fs.readdirSync(options.outDir)) {
    const content = read(name);
    for (const forbidden of [privacy, "DO_NOT_BLEND_VARIANT", "DO_NOT_BLEND_NEIGHBOR", dbPath,
      "sourceKey", "ProvenanceJson", "originalInput", "sourcePassage"]) assert.ok(!content.includes(forbidden), name);
    if (name.endsWith(".html")) assert.ok(content.includes("charset=utf-8"));
  }
  // Repeating into a new directory is byte stable; an existing directory, even empty, is never reused.
  const second = path.join(output, "second");
  assert.deepEqual(exportOfflineHtml({ ...options, outDir: second }), report);
  for (const name of fs.readdirSync(second)) assert.equal(fs.readFileSync(path.join(second, name), "utf8"), read(name));
  fs.writeFileSync(path.join(options.outDir, "stale.html"), "operator-owned");
  assert.throws(() => exportOfflineHtml(options), /already exists/);
  assert.equal(read("stale.html"), "operator-owned");
  assert.ok(!fs.existsSync(path.join(second, "stale.html")));
  assert.throws(() => exportOfflineHtml({ ...options, outDir: repoRoot() }), /new child/);
  assert.throws(() => exportOfflineHtml({ ...options, outDir: outputRoot }), /new child/);
  assert.throws(() => exportOfflineHtml({ ...options, outDir: temp }), /new child/);
  assert.throws(() => main(["--book", "86"]), /Required/);
  assert.throws(() => main(["--book", "86", "--book", "87"]), /duplicate/);
  let failureIndex = 0;
  // Bad inputs use independent copies, observed through the actual read-only entry.
  const snapshot = db.serialize();
  const badCases: [string, RegExp][] = [
    ["DELETE FROM I18nSpellText WHERE spellId=2 AND variant='effective'", /spell 2: missing name\/body/],
    ["UPDATE I18nSpellText SET rulebookId=87 WHERE spellId=2 AND variant='effective'", /Conflicting/],
    ["UPDATE I18nSpellText SET bodyProvenanceJson=NULL WHERE spellId=2 AND variant='effective'", /language metadata/],
    ["UPDATE SpellContent SET descriptionText='' WHERE legacySpellId=2", /missing English/],
    ["UPDATE SpellContent SET id='spell:999' WHERE legacySpellId=2", /conflicting normalized ID/],
    ["UPDATE SpellContent SET descriptionHtml='<script>operative content</script>' WHERE legacySpellId=2", /remove visible content/],
    ["UPDATE SpellContent SET descriptionHtml='<p id=\"x\">A</p><p id=\"x\">B</p>' WHERE legacySpellId=2", /duplicate body anchor/],
    ["DROP INDEX SpellContent_legacySpellId_key; UPDATE SpellContent SET legacySpellId=1 WHERE legacySpellId=2", /duplicate target/],
    ["DROP INDEX I18nSpellText_spellId_lang_variant_key; INSERT INTO I18nSpellText SELECT 'duplicate',spellId,rulebookId,lang,variant,name,descriptionHtml,descriptionText,sourceKey,createdAt,updatedAt,nameProvenanceJson,bodyProvenanceJson FROM I18nSpellText WHERE spellId=2 AND variant='effective'", /duplicate localized/],
  ];
  for (const [sql, pattern] of badCases) {
    const badDb = path.join(temp, `bad-${failureIndex}.sqlite`), outDir = path.join(output, `bad-${failureIndex++}`);
    fs.writeFileSync(badDb, snapshot); const connection = new Database(badDb);
    connection.exec(sql); connection.close();
    assert.throws(() => exportOfflineHtml({ ...options, contentDb: badDb, outDir }), pattern);
    assert.ok(!fs.existsSync(outDir));
  }
  assert.throws(() => validatePages(new Map([["index.html", '<a href="missing.html">Missing</a>']])), /missing/);
  assert.throws(() => validatePages(new Map([["index.html", '<a href="#absent">Missing</a>']])), /missing link anchor/);
  assert.throws(() => validatePages(new Map([["index.html", '<a href="https://example.invalid">Network</a>']])), /non-local/);
  console.log("offline HTML portable tests passed: full bodies, Unicode, rules, tables, anchors, privacy, repeat isolation, failures");
} finally {
  if (db.open) db.close();
  fs.rmSync(temp, { recursive: true, force: true });
  fs.rmSync(output, { recursive: true, force: true });
}
