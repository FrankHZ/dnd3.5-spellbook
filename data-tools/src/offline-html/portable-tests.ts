import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { load } from "cheerio";
import { repoRoot } from "../shared/env";
import { exportOfflineHtml, SummarySelectionError, validatePages } from "./export";
import { main } from "./cli";
import type { PdfTypographyPresentation } from "../zh-parser/pdf-typography";
import { processAutomaticMarkers, type NamedEntry, type SpellName } from "../spell-list-markers/automatic";
import type { PdfPage, PdfSpan } from "../spell-list-markers/markers";
import type { DomainPowers } from "./domain-powers";

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
const sourceNote = '原文疑义备注（本项目说明，非官方勘误）';
const html = '<p id="start">Full <em>emphasis</em> &amp; Unicode 雪</p><table><caption>Fixture</caption><tr><th scope="col">Roll</th><th>Result</th></tr><tr><td colspan="2">A &lt; B</td></tr></table><ul><li>Item</li></ul><p><a href="#start">Return</a> <a href="/spells/book--86/beta--2/">Beta</a> <a href="https://example.invalid/private">Outside</a></p><a id="alias-id" name="旧%名">Anchor</a><a href="#%E6%97%A7%25%E5%90%8D">Named return</a>'
  + '<p><a href="spell-5.html#zh">Same letter Chinese</a> <a href="spell-1.html#rules">Current rules</a> <a href="spell-999.html">Out of scope</a></p>'
  + `<h3>${sourceNote}</h3><p>[fixture-question-one] 原文条件甲和条件乙均保留，未作裁定。</p><p>[fixture-question-two] 第二处独立疑问；此备注不会改写原规则。</p>`;
const plain = load(html, {}, false).root().text();
try {
  db.prepare(`INSERT INTO RulebookContent (id,legacyRulebookId,editionId,name,abbr,slug,rawJson,
    publicationCategory,publicationFamily,publicationSourceKind,publicationDisplayOrder)
    VALUES ('book:86',86,1,'Fixture publication','F','fixture',?,'fixture','fixture','fixture',1)`).run(privacy);
  spell(1, "Alpha & <fixture>", plain, html);
  spell(2, "Beta inherited spell", "As Alpha, except the complete inherited difference.", null);
  spell(3, "Gamma fallback", "English fallback body.", null);
  db.exec("UPDATE SpellContent SET sourcePage=NULL WHERE legacySpellId=3");
  spell(4, "Other book", "DO_NOT_BLEND_NEIGHBOR", null, 87);
  const paragraphs = '<p id="start">First paragraph\nPDF visual fold remains in this paragraph.</p><p>Second <strong>synthetic label</strong> and <em>emphasis</em>.</p>'
    + '<div id="reader-note" class="arbitrary-note" style="display:none" onclick="ignored()"><h3>Synthetic project commentary</h3><p>Separate note paragraph one.</p><p>Separate note paragraph two.</p><a href="#start">Return to rule</a></div>'
    + '<ul id="marked" class="pdf-typography-marked-list arbitrary-list" style="list-style:circle" data-private="forbidden"><li>• Literal marker one<ul id="ordinary-child"><li>Unmarked nested item</li></ul><ol id="ordered-child" start="4"><li>Fourth item</li><li value="8">Eighth item</li></ol></li><li>· Literal marker two<ul id="marked-child" class="pdf-typography-marked-list"><li>• Nested literal marker</li></ul></li></ul>'
    + '<ul id="mixed" class="pdf-typography-marked-list-evil arbitrary-list"><li>• Literal in mixed list</li><li>No literal marker in mixed list</li></ul>'
    + '<ol id="ordinary-ordered" class="pdf-typography-marked-list" start="3"><li value="7">Seventh item</li></ol>'
    + '<div id="wrong-tag" class="pdf-typography-marked-list">Class is valid only on ul.</div>'
    + '<table><tr><th scope="row" rowspan="2">Row header</th><td colspan="2">Spanning cell</td></tr><tr><td>A</td><td>B</td></tr></table>'
    + '<a name="named-target">Named anchor</a><a href="#named-target">Named return</a>';
  const paragraphText = load(paragraphs, {}, false).root().text();
  spell(5, "Alpha & <fixture>", paragraphText, paragraphs);
  zh(5, "合成段落", paragraphText, paragraphs);
  zh(1, "雪 & <名字>", long, null);
  zh(2, "继承法术", plain, html);
  const mechanismLines = ["变化系", "等级：一", "法术成分：V、S", "施法时间：标准动作",
    "作用距离：近距", "效果：保留 2d6", "时效：1轮", "豁免检定：无", "法术抗力：可"];
  const natural = mechanismLines.slice(0, 2).join("\n\n") + "\n\n" + mechanismLines.slice(2).join("\n")
    + "\n一个完整段落。\n第二段含 2d6、条件与引用（PH 10）。\n掷骰\n结果\n1–2\n保留单元格\n材料成分：保留 2 金币的材料。\n经验值：100 XP\n效果：正文后的表格行\n";
  spell(6, "Natural layout", "Physical\nEnglish fold", "<pre>Physical\nEnglish fold</pre>");
  zh(6, "自然段落", natural, `<pre>${natural}</pre>`);
  const compactHtml = '<p>变化系\n</p><p><strong>等级：</strong>一\n</p><p>\n</p>'
    + mechanismLines.slice(2).map(line => `<p>${line}\n</p>`).join('')
    + '<p>普通正文完整保留 2d6 和条件。\n</p><table><tr><td><p>效果：表格内容。</p></td></tr></table>'
    + '<ul><li><p>目标：列表内容。</p></li></ul><p>材料成分：材料不压缩。</p><p>经验值：100 XP。</p>'
    + '<div><h3>原文疑义备注</h3><p>等级：备注内容。</p><p>目标：备注内容。</p></div>';
  const compactText = load(compactHtml, {}, false).root().text();
  spell(7, "Compact mapped", "Internal English QA only.", '<p>Internal English QA only.</p>');
  zh(7, "紧凑映射", compactText, compactHtml);
  zh(3, "中文回退", "中文  回退\t保留。\n\n最后一行。", '<pre>中文  回退\t保留。\n\n最后一行。</pre>');
  zh(1, "DO_NOT_BLEND_VARIANT", "DO_NOT_BLEND_VARIANT", null, "zh", "chm");
  db.prepare(`INSERT INTO SpellListEntry (id,spellId,listType,ownerLegacyId,ownerName,ownerSlug,
    level,sourceTable,note) VALUES ('list:1','spell:1','class',1,'Fixture caster','fixture',3,'fixture','Printed ambiguity note')`).run();
  db.prepare(`INSERT INTO SpellListEntry (id,spellId,listType,ownerLegacyId,ownerName,ownerSlug,
    level,sourceTable,rawExtra,variantLabel) VALUES ('list:2','spell:1','domain',2,'Fixture domain','fixture-domain',4,'fixture','Raw domain qualifier','Printed variant')`).run();
  db.exec(`INSERT INTO SpellListEntry (id,spellId,listType,ownerLegacyId,ownerName,ownerSlug,level,sourceTable,note,reviewStatus) VALUES
    ('zero','spell:1','class',1,'Fixture caster','fixture',0,'fixture','Zero qualifier','accepted'),
    ('zero-again','spell:1','class',1,'Fixture caster','fixture',0,'fixture','Additional qualifier','review'),
    ('nine','spell:5','class',1,'Fixture caster','fixture',9,'fixture',NULL,'accepted'),
    ('second','spell:2','class',2,'Second caster','second',4,'fixture',NULL,'accepted')`);
  db.exec(`INSERT INTO SpellListEntry (id,spellId,listType,ownerLegacyId,ownerName,ownerSlug,level,sourceTable,reviewStatus) VALUES
    ('domain-one','spell:1','domain',1,'First domain','first-domain',1,'fixture','accepted'),
    ('domain-nine','spell:7','domain',1,'First domain','first-domain',9,'fixture','review');
    INSERT INTO I18nDomainText (id,domainId,lang,variant,name,updatedAt) VALUES
    ('domain-name',1,'zh','default','合成领域','fixture'),
    ('wrong-variant-domain-name',2,'zh','other','不可混入的名称','fixture');`);
  db.exec(`INSERT INTO I18nCharacterClassText (id,classId,lang,variant,name,updatedAt) VALUES
    ('class-name',1,'zh','default','合成职业','fixture'),
    ('wrong-variant-class-name',2,'zh','other','不可混入的职业','fixture');`);
  const summary = db.prepare(`INSERT INTO I18nSpellSummaryText
    (id,spellId,rulebookId,lang,variant,summaryText,reviewStatus,sourceKey,sourceKind,updatedAt)
    VALUES (?,?,86,?,?,?,'accepted',?,'fixture',CURRENT_TIMESTAMP)`);
  for (const id of [1, 2, 5, 7]) {
    summary.run(`summary:${id}:zh`, id, "zh", "chm", `已接受短描述 ${id} & <保留>`, privacy);
    summary.run(`summary:${id}:en`, id, "en", "imarvin", `Accepted short description ${id}.`, privacy);
    summary.run(`summary:${id}:effective`, id, "zh", "effective", "DO_NOT_BLEND_EFFECTIVE_SUMMARY", privacy);
    summary.run(`summary:${id}:other`, id, "zh", "other", `Other exact summary ${id}.`, privacy);
  }
  db.exec("DELETE FROM I18nSpellSummaryText WHERE id='summary:7:en'");
  db.prepare(`INSERT INTO SpellTaxonomyFacet (id,spellId,facetType,facetKey,name,rawText,sourceField)
    VALUES ('facet:1','spell:1','descriptor','fixture','Normalized descriptor','Raw descriptor','fixture')`).run();
  db.prepare(`INSERT INTO SpellComponent (id,spellId,componentType,present,sourceField)
    VALUES ('component:1','spell:1','verbal',1,'fixture'),('component:2','spell:1','divine_focus',1,'fixture')`).run();
  db.prepare(`UPDATE SpellContent SET subschoolRaw='Raw subschool',effectRaw='Raw effect',areaRaw='Raw area',
    savingThrowRaw='Raw saving throw',resistanceRaw='Raw resistance',corruptLevel=2 WHERE legacySpellId=1`).run();
  const options = { contentDb: dbPath, book: 86, variant: "effective", outDir: path.join(output, "first") };
  const report = exportOfflineHtml(options);
  assert.equal(report.spells, 6); assert.equal(report.englishBodyFallbacks, 0);
  assert.equal(report.files, 33); assert.equal(report.detachedReferences, 2);
  assert.equal(report.htmlTextDifferences, 0);
  const read = (name: string) => fs.readFileSync(path.join(options.outDir, name), "utf8");
  const first = read("A.html"), $ = load(first);
  assert.equal($("#spell-1 > h2 > .spell-name").text(), "雪 & <名字> / Alpha & <fixture>");
  assert.equal($("#spell-1 > h2 > .spell-metadata").text(), "p. 42 · ID 1↗");
  assert.equal($("#spell-1 > p").length, 0);
  assert.equal($("#spell-1-zh").text(), long);
  assert.equal($("#spell-1-en, #spell-1-rules, .rules, [lang='en']").length, 0);
  assert.equal($(".spell-entry .spell-body").length, 2);
  assert.equal($("#spell-1 a.website-link").attr("href"), "https://www.d20spellcodex.com/spells/1");
  assert.equal($("#spell-1 a.website-link").text(), "↗");
  assert.equal($("#spell-1 a.website-link").attr("title"), "在网站查看");
  assert.equal($("#spell-1 a.website-link").attr("aria-label"), "在网站查看");
  assert($("#spell-1 a.website-link").parent().text().includes("ID 1"));
  assert.equal($("#spell-1 a.website-link").closest('h2').length, 1);
  assert.equal($("#spell-1 > h3, #spell-1 > .navigation").length, 0);
  assert.equal($(".navigation").length, 1);
  assert(read("style.css").includes('.spell-entry > h2 { font-size: 1.17em;'));
  const inherited = load(read("B.html")), body = inherited("#spell-2-zh");
  assert.equal(body.text(), plain);
  assert.equal(body.find("table td").attr("colspan"), "2");
  assert.equal(body.find("em").text(), "emphasis");
  assert.equal(body.find("a").eq(0).attr("href"), "#zh-2-start");
  assert.equal(body.find("a").eq(1).attr("href"), "B.html#spell-2");
  assert.equal(body.find("a").eq(2).attr("href"), undefined);
  assert.equal(body.find("a").eq(4).attr("href"), "#zh-2-%E6%97%A7%25%E5%90%8D");
  assert.equal(body.find("a").eq(5).attr("href"), "A.html#spell-5-zh");
  assert.equal(body.find("a").eq(6).attr("href"), "A.html#spell-1");
  assert.equal(body.find("a").eq(7).attr("href"), undefined);
  assert.equal(body.find("a").eq(3).attr("id"), "zh-2-alias-id");
  assert.equal(body.find("a").eq(3).attr("name"), "zh-2-旧%名");
  assert.equal(body.find("h3").text(), sourceNote);
  assert.ok(body.text().includes('[fixture-question-two] 第二处独立疑问；此备注不会改写原规则。'));
  assert(!read("B.html").includes("complete inherited difference"));
  assert.equal(load(read("G.html"))("#spell-3-zh pre").text(), "中文  回退\t保留。\n\n最后一行。");
  assert.equal(load(read("G.html"))("#spell-3 > h2 > .spell-metadata").text(), "ID 3↗");
  assert.deepEqual($(".spell-entry").toArray().map(el => $(el).attr("id")), ["spell-1", "spell-5"]);
  assert.equal(report.classPages, 2); assert.equal(report.classMemberships, 4); assert.equal(report.classListEntries, 5);
  assert.equal(report.selectedSummaries, 7); assert.deepEqual(report.summaryVariants, { en: "imarvin", zh: "chm" });
  assert.equal(report.selectedChineseSummaries, 4); assert.equal(report.selectedEnglishSummaries, 3);
  assert.equal(report.domainChineseSummaries, 2);
  assert.equal(report.layout, 'classes-domains-then-az');
  assert.equal(report.domainPages, 2); assert.equal(report.domainListEntries, 3);
  assert.equal(report.domainMemberships, 3); assert.equal(report.domainTargets, 2);
  assert.deepEqual(report.domainOnlyTargets, [7]); assert.deepEqual(report.domainNameFallbacks, [2]);
  assert.equal(report.domainEntriesNeedingStructuralReview, 1);
  assert.deepEqual(report.classlessTargets, [3, 6, 7]); assert.equal(report.classEntriesNeedingStructuralReview, 1);
  assert.equal(report.pdfFormatting, "pending-431-source-mapping");
  // Preserve two semantic paragraphs and a visual line fold within the first. No PDF mapping is inferred.
  assert.equal($("#spell-5-zh > p").length, 2);
  assert.equal($("#spell-5-zh > p").first().text(), "First paragraph\nPDF visual fold remains in this paragraph.");
  assert.equal($("#spell-5-zh strong").text(), "synthetic label");
  assert.equal($("#spell-5-zh").text(), paragraphText);
  // The real export/sanitizer chain consumes a synthetic presentation contract, not PDF evidence.
  for (const lang of ["zh"]) {
    const body = $(`#spell-5-${lang}`), prefix = `${lang}-5`;
    assert.equal(body.text(), paragraphText);
    assert.deepEqual(body.children().slice(0, 4).toArray().map(el => el.tagName), ["p", "p", "div", "ul"]);
    const note = body.find(`#${prefix}-reader-note`);
    assert.equal(note.parent().get(0), body.get(0));
    assert.deepEqual(note.children().toArray().map(el => el.tagName), ["h3", "p", "p", "a"]);
    assert.equal(note.find('h3').text(), "Synthetic project commentary");
    assert.deepEqual(note.find('p').toArray().map(el => $(el).text()), ["Separate note paragraph one.", "Separate note paragraph two."]);
    assert.equal(note.find('a').attr("href"), `#${prefix}-start`);
    assert.equal(body.find(`#${prefix}-marked`).attr("class"), "pdf-typography-marked-list");
    assert.equal(body.find(`#${prefix}-marked-child`).attr("class"), "pdf-typography-marked-list");
    for (const id of ["ordinary-child", "ordered-child", "mixed", "ordinary-ordered", "wrong-tag", "reader-note"]) {
      assert.equal(body.find(`#${prefix}-${id}`).attr("class"), undefined);
    }
    assert.equal(body.find(`#${prefix}-marked > li`).eq(0).clone().children().remove().end().text(), "• Literal marker one");
    assert.equal(body.find(`#${prefix}-marked > li`).eq(1).clone().children().remove().end().text(), "· Literal marker two");
    assert.equal(body.find(`#${prefix}-marked-child > li`).text(), "• Nested literal marker");
    assert.equal(body.find(`#${prefix}-mixed > li`).eq(1).text(), "No literal marker in mixed list");
    assert.equal(body.find(`#${prefix}-ordered-child`).attr("start"), "4");
    assert.equal(body.find(`#${prefix}-ordered-child > li`).last().attr("value"), "8");
    assert.equal(body.find(`#${prefix}-ordinary-ordered`).attr("start"), "3");
    assert.equal(body.find(`#${prefix}-ordinary-ordered > li`).attr("value"), "7");
    assert.equal(body.find('table th').attr("scope"), "row");
    assert.equal(body.find('table th').attr("rowspan"), "2");
    assert.equal(body.find('table td').first().attr("colspan"), "2");
    assert.equal(body.find('a[name]').attr("name"), `${prefix}-named-target`);
    assert.equal(body.find('a[href]').last().attr("href"), `#${prefix}-named-target`);
    assert.equal(body.find('[style], [onclick], [data-private]').length, 0);
    assert.deepEqual(body.find('[class]').toArray().map(el => [el.tagName, $(el).attr("class")]), [
      ["ul", "pdf-typography-marked-list"], ["ul", "pdf-typography-marked-list"],
    ]);
  }
  assert(read("style.css").includes("margin-bottom: 1.65em"));
  const naturalBody = load(read("N.html"))("#spell-6-zh");
  assert.equal(naturalBody.text(), natural);
  assert.deepEqual(naturalBody.find(".plain-paragraph").toArray().map(el => load(el.cloneNode(true)).text()),
    ["一个完整段落。", "第二段含 2d6、条件与引用（PH 10）。"]);
  assert.deepEqual(naturalBody.find('.mechanism-field').toArray().map(el => load(el.cloneNode(true)).text()), mechanismLines);
  assert.equal(naturalBody.find('.mechanism-gap').length, 2);
  assert.equal(naturalBody.find('.mechanism-end').text(), "法术抗力：可");
  const mappedBody = load(read('C.html'))('#spell-7-zh');
  assert.equal(mappedBody.text(), compactText);
  assert.deepEqual(mappedBody.find('.mechanism-field').toArray().map(el => load(el.cloneNode(true)).text()),
    mechanismLines.map(line => line + '\n'));
  assert.equal(mappedBody.find('.mechanism-gap').length, 1);
  assert.equal(mappedBody.find('table .mechanism-field, li .mechanism-field').length, 0);
  assert.equal(mappedBody.children('div').find('.mechanism-field').length, 0);
  assert.equal(mappedBody.find('.mechanism-end').text(), "法术抗力：可\n");
  assert(!mappedBody.find('.mechanism-field').text().includes('材料'));
  // Observed batch aliases: validate the emitted leading block, not only label recognition.
  const aliasCases = [
    ["附魔系", "作用距离", "作用对象"],
    ["魅控系", "作用范围", "作用目标"],
    ["共通", "作用范围", "作用对象"],
    ["变形系", "射程", "对象", "施法动作", "持续"],
    ["变化系［邪恶］", "射程", "目标和效果"],
    ["塑能系［光］", "射程", "目标和效果"],
    ["变化系", "效果及区域", "范围或目标", "施法时间", "持续时间", "法术抗力；可"],
    ["变化系", "影响范围", "目标", "施展时间"],
  ];
  for (const [caseIndex, [school, range, target, time = "施法时间", duration = "时效", resistance = "抗力：可"]] of aliasCases.entries()) {
    const expectedFields = [school!, "等级：一", "法术成分：V、S", `${time}：标准动作`,
      `${range}：近距`, `${target}：一个生物`, `${duration}：1轮`, "豁免检定：无", resistance];
    for (const representation of ["plain", "paragraphs"]) {
      const tail = ['［光］出现在完整效果正文中，保留 2d6 与条件。', '变形系的法术在正文中被提及。',
        '材料成分：保留材料。', '经验值：100 XP。', '原文疑义备注',
        '作用目标：备注中的引用。', '抗力：备注中的引用。', '目标和效果：备注中的引用。',
        '变化系［邪恶］', '普通正文中间；分号仍然保留。', '法术抗力；可',
        '影响范围：备注中的引用。', '施展时间：备注中的引用。'];
      if (time === "施展时间") tail.unshift('施展时间受到正文所述条件限制，保留完整叙述。');
      if (resistance === "法术抗力；可") tail.unshift(representation === "plain"
        ? '距离；这是正文中的普通分号叙述。' : '法术抗力；可见正文中的普通叙述。');
      const html = representation === "plain"
        ? `<pre>${[...expectedFields, ...tail].join('\n\n')}</pre>`
        : expectedFields.map(line => `<p>${line}\n\n</p>`).join('')
          + tail.map(line => `<p>${line}\n\n</p>`).join('');
      const originalText = load(html, {}, false).root().text();
      db.prepare("UPDATE I18nSpellText SET descriptionText=?, descriptionHtml=? WHERE spellId=7 AND variant='effective'").run(originalText, html);
      const outDir = path.join(output, `observed-alias-${caseIndex}-${representation}`);
      exportOfflineHtml({ ...options, outDir });
      const aliasPage = load(fs.readFileSync(path.join(outDir, 'C.html'), 'utf8'));
      const body = aliasPage('#spell-7-zh');
      assert.equal(body.text(), originalText);
      assert.deepEqual(body.find('.mechanism-field').toArray().map(el => aliasPage(el).text()),
        expectedFields.map(line => line + (representation === "plain" ? '' : '\n\n')));
      for (const combined of ["目标和效果", "效果及区域", "范围或目标"]) {
        if (range === combined || target === combined) assert.equal(body.find('.mechanism-field').filter((_, el) =>
          aliasPage(el).text().startsWith(`${combined}：`)).length, 1);
      }
      assert.equal(body.find('.mechanism-end').text(), resistance + (representation === "plain" ? '' : '\n\n'));
      if (representation === "plain") assert.equal(body.find('.mechanism-gap').length, 8);
    }
  }
  db.prepare("UPDATE I18nSpellText SET descriptionText=?, descriptionHtml=? WHERE spellId=7 AND variant='effective'").run(compactText, compactHtml);
  assert.equal(naturalBody.find("pre").text(), naturalBody.text());
  assert.equal(load(read("N.html"))("#spell-6-en, [lang='en']").length, 0);
  assert(!read("N.html").includes("Physical"));
  assert(read("style.css").includes("pre.plain-lines > span.plain-paragraph { margin-bottom: .8em; }"));
  const css = read("style.css");
  assert(css.includes('.spell-body ul.pdf-typography-marked-list { list-style: none; }'));
  assert(css.includes('.spell-body ul.pdf-typography-marked-list ul { list-style-type: disc; }'));
  assert(css.includes('.spell-body ul.pdf-typography-marked-list ol { list-style-type: decimal; }'));
  assert(css.includes('.spell-body ul.pdf-typography-marked-list ul.pdf-typography-marked-list { list-style: none; }'));
  const menu = load(read("index.html"));
  assert.deepEqual(menu("h2").toArray().map(el => menu(el).attr("id")), ["classes", "domains", "letters"]);
  assert.equal(menu('a[href="A.html"]').length, 1);
  assert.equal(menu('a[href="domain-1.html"]').text(), '合成领域（First domain）');
  assert.equal(menu('a[href="domain-2.html"]').text(), 'Fixture domain');
  assert.equal(menu('a[href="class-1.html"]').text(), '合成职业（Fixture caster）');
  assert.deepEqual(report.classNameFallbacks, [2]);
  const domain = load(read('domain-1.html'));
  assert.equal(domain('h1').text(), '合成领域（First domain）');
  assert.deepEqual(domain('h2').toArray().map(el => domain(el).attr('id')), Array.from({ length: 9 }, (_, i) => `level-${i + 1}`));
  assert.equal(domain('#level-0').length, 0);
  assert.equal(domain('#level-1 + ul a').attr('href'), 'A.html#spell-1');
  assert.equal(domain('#level-9 + ul a').attr('href'), 'C.html#spell-7');
  assert.equal(domain('#level-9 + ul .summary').text(), '已接受短描述 7 & <保留>');
  assert(domain('#level-2 + .empty').text().includes('本书收录范围内'));
  assert(domain('.notice').text().includes('并非原书完整领域法表'));
  const qualifiedDomain = load(read('domain-2.html'));
  assert(qualifiedDomain('.notice').text().includes('中文名称缺失'));
  assert(!qualifiedDomain.text().includes('不可混入的名称'));
  assert(qualifiedDomain('.membership-note').text().includes('Raw domain qualifier — Printed variant'));
  const caster = load(read("class-1.html"));
  assert.equal(caster('h1').text(), '合成职业（Fixture caster）');
  assert(load(read('class-2.html'))('.notice').text().includes('职业中文名称缺失'));
  assert(!read('class-2.html').includes('不可混入的职业'));
  assert.equal(caster('.school-heading').length, 0);
  assert.deepEqual(caster("h2").toArray().map(el => caster(el).attr("id")), Array.from({ length: 10 }, (_, i) => `level-${i}`));
  assert.equal(caster('#level-0 + ul > li').length, 1);
  assert.equal(caster('#level-0 + ul a').attr("href"), "A.html#spell-1");
  assert.equal(caster('#level-0 + ul [lang="zh"]').text(), "已接受短描述 1 & <保留>");
  const directoryItem = caster('#level-0 + ul > li');
  assert.equal(directoryItem.find('a').text(), "雪 & <名字>（Alpha & <fixture>）");
  assert.equal(directoryItem.find('.component-labels').length, 0);
  assert.equal(directoryItem.find('.summary').get(0)?.tagName, 'span');
  assert.equal(directoryItem.find('div.summary').length, 0);
  assert.ok(directoryItem.text().includes('）：已接受短描述'));
  assert.deepEqual(report.printedMarkers, { rulebookId: 86, acceptedRows: 0, machineRows: 0, unknownRows: 7, markedRows: 0, explicitEmptyRows: 0 });
  assert(read('style.css').includes('.component-labels { font-size: .75em; }'));
  assert.equal(caster('[lang="en"]').length, 0);
  assert(!caster.text().includes("Accepted short description"));
  for (const note of ["Zero qualifier", "Additional qualifier"]) assert(caster('#level-0 + ul').text().includes(note));
  assert.equal(caster('#level-9 + ul a').attr("href"), "A.html#spell-5");
  assert(caster('#level-1 + .empty').length); assert(load(read("Z.html"))(".empty").length);
  assert(!fs.readdirSync(options.outDir).some(name => /^spell-\d+\.html$/.test(name)));
  assert(!fs.existsSync(path.join(options.outDir, "index-en.html")));
  for (const name of fs.readdirSync(options.outDir)) {
    const content = read(name);
    for (const forbidden of [privacy, "DO_NOT_BLEND_VARIANT", "DO_NOT_BLEND_NEIGHBOR", "DO_NOT_BLEND_EFFECTIVE_SUMMARY", dbPath,
      "sourceKey", "ProvenanceJson", "originalInput", "sourcePassage"]) assert.ok(!content.includes(forbidden), name);
    if (name.endsWith(".html")) assert.ok(content.includes("charset=utf-8"));
  }
  // A standalone data fragment preserves complete text and structure, with local
  // navigation only; adding it never changes spell bodies or directory summaries.
  const introduction = '<h2>引言</h2>\n<p>完整  中文\t正文 &amp; 数字 2。<strong>术语</strong>与<i>强调</i>。</p>\n'
    + '<h3>小节</h3>\n<p>第二段不合并。\n原有换行。</p>\n<ul><li>职业建议一。</li><li>职业建议二。</li></ul>\n';
  const introOut = path.join(output, 'introduction');
  const introReport = exportOfflineHtml({ ...options, outDir: introOut }, new Map(), undefined, [], introduction);
  assert.deepEqual(introReport.introduction, { included: true, sections: 2, paragraphs: 2, listItems: 2 });
  assert.deepEqual(report.introduction, { included: false, sections: 0, paragraphs: 0, listItems: 0 });
  assert.equal(introReport.files, report.files + 1);
  const introPage = load(fs.readFileSync(path.join(introOut, 'introduction.html'), 'utf8'));
  const sourceIntro = load(introduction, {}, false);
  assert.equal(introPage('#introduction').text(), sourceIntro.root().text());
  assert.equal(introPage('#introduction').html(), sourceIntro.root().html());
  assert.equal(introPage('#introduction h2').text(), '引言');
  assert.equal(introPage('#introduction p').length, 2);
  assert.equal(introPage('#introduction li').length, 2);
  for (const filename of ['index.html', 'A.html', 'class-1.html', 'domain-1.html']) {
    assert(load(fs.readFileSync(path.join(introOut, filename), 'utf8'))('a[href="introduction.html"]').length > 0);
  }
  assert.equal(introPage('.navigation a[href="index.html#classes"]').length, 2);
  assert.equal(load(fs.readFileSync(path.join(introOut, 'A.html'), 'utf8'))('#spell-1-zh').html(), $('#spell-1-zh').html());
  assert.equal(load(fs.readFileSync(path.join(introOut, 'class-1.html'), 'utf8'))('.summary').text(), caster('.summary').text());
  assert(!fs.existsSync(path.join(options.outDir, 'introduction.html')));
  for (const fragment of ['<h2 onclick="bad()">引言</h2>', '<h2>引言</h2><script>visible</script>', '<p><a href="relative.html">链接</a></p>']) {
    const badOut = path.join(output, 'unsupported-introduction');
    assert.throws(() => exportOfflineHtml({ ...options, outDir: badOut }, new Map(), undefined, [], fragment), /unsupported markup/);
    assert(!fs.existsSync(badOut));
  }
  assert.throws(() => exportOfflineHtml({ ...options, book: 87 }, new Map(), undefined, [], introduction), /accepted SC fragment/);
  assert.throws(() => exportOfflineHtml(options, new Map(), undefined, [], ''), /nonempty/);
  assert.throws(() => main(['--introduction', '--introduction']), /duplicate/);
  assert.throws(() => main(['--content-db', dbPath, '--book', '87', '--variant', 'effective', '--out', introOut, '--introduction']), /only for SC/);
  const powerContent: DomainPowers = { schemaVersion: 1, rulebookId: 86, language: 'zh', sharedRules: {
    planar: ['共同规则一：两个选择 & <保留条件>。', '共同规则二：不得省略阵营限制。'],
  }, domains: [
    { ownerLegacyId: 1, ownerName: 'First domain', entryIds: ['domain-one', 'domain-nine'],
      grantedPowerText: '神授力量：每天一次，保留 <script>文字</script> 与 2d6。', requirementText: null, sharedRulesKey: null, readerNotes: [] },
    { ownerLegacyId: 2, ownerName: 'Fixture domain', entryIds: ['list:2'],
      grantedPowerText: '神授力量：自由动作，持续 5 轮。', requirementText: '前提：指定阵营。', sharedRulesKey: 'planar',
      readerNotes: ['原文的等级类别未指定；<a>仅为文字。</a>'] },
    { ownerLegacyId: 174, ownerName: 'Wrath (SpC)', entryIds: ['unselected-source-row'],
      grantedPowerText: '未选领域能力不可扩张页面范围。', requirementText: null, sharedRulesKey: null, readerNotes: [] },
  ] };
  const powerFixture = new Database(db.serialize());
  powerFixture.exec("UPDATE SpellListEntry SET rulebookId=86 WHERE listType='domain'");
  const powerView = new Database(powerFixture.serialize(), { readonly: true }); powerFixture.close();
  try {
    const before = powerView.serialize(), outDir = path.join(output, 'domain-powers');
    const powerReport = exportOfflineHtml({ ...options, contentDb: ':memory:', outDir }, new Map(), powerView, [], introduction, powerContent);
    assert(powerView.serialize().equals(before));
    assert.equal(powerReport.domainPages, 2); assert(!fs.existsSync(path.join(outDir, 'domain-174.html')));
    assert.deepEqual(powerReport.domainPowers, { included: true, pages: 2, requirementPages: 1, sharedRulePages: 1, readerNotes: 1 });
    const ordinary = load(fs.readFileSync(path.join(outDir, 'domain-1.html'), 'utf8'));
    const planar = load(fs.readFileSync(path.join(outDir, 'domain-2.html'), 'utf8'));
    assert.equal(ordinary('.granted-power').text(), powerContent.domains[0]!.grantedPowerText);
    assert.equal(ordinary('.domain-requirement,.shared-domain-rules,.reader-note').length, 0);
    assert.equal(planar('.granted-power').text(), powerContent.domains[1]!.grantedPowerText);
    assert.equal(planar('.domain-requirement').text(), powerContent.domains[1]!.requirementText);
    assert.deepEqual(planar('.shared-domain-rules p').toArray().map(el => planar(el).text()), powerContent.sharedRules.planar);
    assert.equal(planar('.reader-note p').text(), powerContent.domains[1]!.readerNotes[0]);
    assert(planar('.reader-note h3').text().includes('非官方勘误'));
    assert.equal(ordinary('script,img').length + planar('script,img').length, 0);
    assert.equal(planar('.domain-power a').length, 0);
    assert.equal(planar('.domain-power .spell-list').length, 0);
    assert.equal(planar('.domain-power').next('h2').attr('id'), 'level-1');
    assert.equal(planar('.summary').text(), qualifiedDomain('.summary').text());
    assert.equal(load(fs.readFileSync(path.join(outDir, 'class-1.html'), 'utf8'))('.domain-power').length, 0);
    let badPower = 0;
    const rejectPower = (mutate: (content: DomainPowers) => void, pattern: RegExp) => {
      const content = structuredClone(powerContent); mutate(content);
      const badOut = path.join(output, `bad-power-${badPower++}`);
      assert.throws(() => exportOfflineHtml({ ...options, contentDb: ':memory:', outDir: badOut }, new Map(), powerView, [], undefined, content), pattern);
      assert(!fs.existsSync(badOut));
    };
    rejectPower(content => { content.domains[0]!.ownerName = 'Same ID, different book owner'; }, /stale domain-power binding/);
    rejectPower(content => { content.domains[0]!.entryIds[0] = 'stale-row'; }, /stale domain-power binding/);
    rejectPower(content => { content.domains.shift(); }, /Missing/);
    rejectPower(content => { content.domains.push(content.domains[0]!); }, /duplicate/);
    rejectPower(content => { content.domains[0]!.grantedPowerText = ''; }, /text/);
    rejectPower(content => { content.domains[1]!.sharedRulesKey = 'missing'; }, /shared rules/);
    rejectPower(content => { content.sharedRules.planar = []; }, /Invalid SC/);
    rejectPower(content => { content.domains[2]!.ownerLegacyId = 28; }, /identity/);
    assert.throws(() => exportOfflineHtml({ ...options, contentDb: ':memory:', book: 87, outDir: path.join(output, 'wrong-book-power') }, new Map(), powerView, [], undefined, powerContent), /Invalid SC/);
  } finally { powerView.close(); }
  assert.throws(() => main(['--domain-powers', '--domain-powers']), /duplicate/);
  assert.throws(() => main(['--content-db', dbPath, '--book', '87', '--variant', 'effective', '--out', introOut, '--domain-powers']), /only for SC/);
  // Real consumer path: distinct source appearances, explicit machine/accepted/unknown states.
  const markedFixture = new Database(db.serialize());
  markedFixture.exec("UPDATE SpellListEntry SET rulebookId=86,sourceRowId=12; UPDATE SpellListEntry SET ownerName='Bard',ownerSlug='bard' WHERE listType='class' AND ownerLegacyId=1");
  const markSpan = (text: string, y: number, flags = 20, size = 10): PdfSpan =>
    ({ text, flags, size, font: 'Synthetic', bbox: [60, y, 160, y + 10], origin: [60, y + 9] });
  const markedLine = (name: string, marker: string, y: number) => ({ spans: marker
    ? [markSpan(name, y), markSpan(marker, y, 21, 6), markSpan(':', y), markSpan(' short description', y, 4)]
    : [markSpan(name + ':', y), markSpan(' short description', y, 4)] });
  const printedPages: PdfPage[] = [
    { page_index: 244, source: { private: privacy }, extractor: { kind: 'synthetic' }, blocks: [
      { number: 0, lines: [{ spans: [markSpan('3RD-LEVEL BARD SPELLS', 10, 4, 13)] }, markedLine('Alpha & <fixture>', 'XFM', 25)] },
      { number: 1, lines: [{ spans: [markSpan('9TH-LEVEL BARD SPELLS', 40, 4, 13)] }, markedLine('Alpha & <fixture>', '', 55)] },
    ] },
    { page_index: 270, source: { private: privacy }, extractor: { kind: 'synthetic' }, blocks: [
      { number: 0, lines: [{ spans: [markSpan('First Domain Domain Spells', 10, 4, 13)] }, markedLine('1 Alpha & <fixture>†', 'F', 25)] },
    ] },
  ];
  const namedEntries = markedFixture.prepare('SELECT * FROM SpellListEntry').all() as NamedEntry[];
  const markerSpells = markedFixture.prepare('SELECT id,canonicalName,sourceRulebookId FROM SpellContent').all() as SpellName[];
  const automatic = processAutomaticMarkers(printedPages, 'synthetic/printed-lists.jsonl', markerSpells, namedEntries);
  const acceptedDomain = automatic.machine.find(row => row.record.listEntryId === 'domain-one')!.record;
  const candidateClass = automatic.machine.find(row => row.record.listEntryId === 'list:1')!.record;
  const insertMarker = markedFixture.prepare('INSERT INTO SpellListMarker (id,sourceKey,rulebookId,listEntryId,markers,reviewStatus,sourceJson,bindingJson) VALUES (?,?,?,?,?,?,?,?)');
  for (const record of [{ ...acceptedDomain, reviewStatus: 'accepted' }, candidateClass]) {
    insertMarker.run(record.id, record.sourceKey, record.rulebookId, record.listEntryId, record.markers, record.reviewStatus, record.sourceJson, record.bindingJson);
  }
  const markerSnapshot = markedFixture.serialize(); markedFixture.close();
  const markerView = new Database(markerSnapshot, { readonly: true });
  try {
    const outDir = path.join(output, 'printed-markers');
    const markerReport = exportOfflineHtml({ ...options, contentDb: ':memory:', outDir }, new Map(), markerView, automatic.machine);
    assert(markerView.serialize().equals(markerSnapshot));
    assert.deepEqual(markerReport.printedMarkers, { rulebookId: 86, acceptedRows: 1, machineRows: 2, unknownRows: 4, markedRows: 2, explicitEmptyRows: 1 });
    const markedClass = load(fs.readFileSync(path.join(outDir, 'class-1.html'), 'utf8'));
    assert.equal(markedClass('#level-3 + ul sup.component-labels').text(), 'MFX');
    assert(markedClass('#level-3 + ul sup').attr('title')!.includes('自动匹配'));
    assert.equal(markedClass('#level-9 + ul .component-labels, #level-0 + ul .component-labels').length, 0);
    const markedDomain = load(fs.readFileSync(path.join(outDir, 'domain-1.html'), 'utf8'));
    assert.equal(markedDomain('#level-1 + ul sup.component-labels').text(), 'F');
    assert(!markedDomain('#level-1 + ul sup').attr('title')!.includes('自动匹配'));
    assert(!fs.readFileSync(path.join(outDir, 'report.json'), 'utf8').includes(privacy));
    const withoutMachine = path.join(output, 'candidate-markers-omitted');
    const noMachineReport = exportOfflineHtml({ ...options, contentDb: ':memory:', outDir: withoutMachine }, new Map(), markerView);
    assert.equal(noMachineReport.printedMarkers.machineRows, 0);
    assert.equal(load(fs.readFileSync(path.join(withoutMachine, 'class-1.html'), 'utf8'))('.component-labels').length, 0);
    const forged = structuredClone(automatic.machine); forged[0]!.spell.canonicalName = 'Changed source name';
    assert.throws(() => exportOfflineHtml({ ...options, contentDb: ':memory:', outDir: path.join(output, 'stale-marker-name') }, new Map(), markerView, forged), /Stale machine marker/);
    const stale = structuredClone(automatic.machine);
    const binding = JSON.parse(stale[0]!.record.bindingJson!); binding.entry.sourceRowId++;
    stale[0]!.record.bindingJson = JSON.stringify(binding);
    assert.throws(() => exportOfflineHtml({ ...options, contentDb: ':memory:', outDir: path.join(output, 'stale-marker-binding') }, new Map(), markerView, stale), /Stale marker relationship/);
  } finally { markerView.close(); }
  // Explicit synthetic selection through the actual helper, sanitizer and merged-page exporter.
  const derivative = load(paragraphs, { xml: { xmlMode: false } }, false);
  derivative('[class]').each((_, el) => {
    if (["marked", "marked-child"].includes(derivative(el).attr("id") ?? "")) derivative(el).attr("class", "pdf-typography-marked-list");
    else derivative(el).removeAttr("class");
  });
  const displayHtml = derivative.root().html()!.replace('<strong>synthetic label</strong>', '<b>synthetic label</b>');
  const selected: PdfTypographyPresentation = { targetId: 5, rulebookId: 86,
    input: { englishText: paragraphText, englishHtml: paragraphs, chineseText: paragraphText, chineseHtml: paragraphs },
    output: { englishHtml: displayHtml, chineseHtml: displayHtml } };
  const selectedOut = path.join(output, "selected-typography");
  const memoryView = new Database(db.serialize(), { readonly: true });
  try {
    const partial = memoryView.transaction(() => exportOfflineHtml({ ...options, contentDb: ":memory:", outDir: selectedOut }, new Map([[5, selected]]), memoryView))();
    assert(memoryView.open && memoryView.readonly); assert.equal(memoryView.pragma("query_only", { simple: true }), 1);
    assert.equal(partial.pdfFormatting, "partial-main-gate-selected");
    assert.deepEqual(partial.typography, { reviewedSelectedIds: [5], currentDisplayIds: [1, 2, 3, 6, 7], formattingComplete: false });
    const page = load(fs.readFileSync(path.join(selectedOut, "A.html"), "utf8"));
    for (const lang of ["zh"]) {
      const body = page(`#spell-5-${lang}`);
      assert.equal(body.text(), paragraphText); assert.equal(body.find('b').text(), "synthetic label");
      assert.equal(body.find(`#${lang}-5-reader-note > p`).length, 2);
      assert.equal(body.find('table th').attr("rowspan"), "2");
      assert.equal(body.find('ol').first().attr("start"), "4");
      assert.equal(body.find('ol > li').eq(1).attr("value"), "8");
      assert.equal(body.find('ul.pdf-typography-marked-list').length, 2);
      assert.equal(body.find(`#${lang}-5-reader-note a`).attr("href"), `#${lang}-5-start`);
      assert.equal(body.find('[style], [onclick], [data-private]').length, 0);
    }
    for (const id of [1]) assert.equal(page(`#spell-${id}`).html(), $(`#spell-${id}`).html());
    assert.equal(fs.readFileSync(path.join(selectedOut, "B.html"), "utf8"), read("B.html"));
    assert.equal(fs.readFileSync(path.join(selectedOut, "G.html"), "utf8"), read("G.html"));
  } finally { memoryView.close(); }
  assert.equal((db.prepare('SELECT descriptionHtml FROM SpellContent WHERE legacySpellId=5').get() as { descriptionHtml: string }).descriptionHtml, paragraphs);
  // School groups keep each spell row once, including duplicate relationships,
  // distinct same-name spells, printed markers, Chinese summaries and qualifiers.
  const schoolFixture = new Database(db.serialize());
  schoolFixture.exec(`UPDATE SpellListEntry SET rulebookId=86,sourceRowId=12;
    UPDATE SpellListEntry SET ownerName='Wizard',ownerSlug='wizard' WHERE listType='class' AND ownerLegacyId=1;
    UPDATE SpellListEntry SET level=3 WHERE id='nine';
    UPDATE SpellContent SET schoolRaw='Abjuration' WHERE legacySpellId=1;
    UPDATE SpellContent SET schoolRaw='Conjuration/Evocation' WHERE legacySpellId=5;
    INSERT INTO SpellListEntry (id,spellId,listType,ownerLegacyId,ownerName,ownerSlug,level,sourceTable,reviewStatus,rulebookId,sourceRowId)
    VALUES ('sorcerer','spell:1','class',4,'Sorcerer','sorcerer',3,'fixture','accepted',86,12);
    INSERT INTO I18nCharacterClassText (id,classId,lang,variant,name,updatedAt) VALUES ('sorcerer-name',4,'zh','default','术士','fixture');
    UPDATE I18nCharacterClassText SET name='法师' WHERE id='class-name';
    INSERT INTO SpellTaxonomyFacet (id,spellId,facetType,facetKey,legacyFacetId,name,sourceField) VALUES
    ('school-abj','spell:1','school','abjuration',101,'Abjuration','fixture'),
    ('school-conj','spell:5','school','conjuration',102,'Conjuration','fixture'),
    ('school-evoc','spell:5','school','evocation',103,'Evocation','fixture');
    INSERT INTO I18nSpellSchoolText (id,schoolId,lang,variant,name,updatedAt) VALUES
    ('abj-name',101,'zh','default','防护','fixture'), ('conj-name',102,'zh','default','咒法','fixture'),
    ('evoc-name',103,'zh','default','塑能','fixture'), ('school-wrong-variant',101,'zh','other','不可混入的学派','fixture');`);
  const schoolPages: PdfPage[] = [{ page_index: 260, source: { private: privacy }, extractor: { kind: 'synthetic' }, blocks: [
    { number: 0, lines: [{ spans: [markSpan('3RD-LEVEL SORCERER/WIZARD SPELLS', 10, 4, 13)] }, markedLine('Alpha & <fixture>', 'F', 25)] },
  ] }];
  // The two synthetic same-name spells cannot share a unique machine binding.
  // Restrict this source-label fixture to the spell with the printed occurrence.
  const schoolMachine = processAutomaticMarkers(schoolPages, 'synthetic/school-lists.jsonl',
    (schoolFixture.prepare('SELECT id,canonicalName,sourceRulebookId FROM SpellContent WHERE legacySpellId=1').all() as SpellName[]),
    schoolFixture.prepare("SELECT * FROM SpellListEntry WHERE spellId='spell:1'").all() as NamedEntry[]).machine;
  const schoolView = new Database(schoolFixture.serialize(), { readonly: true }); schoolFixture.close();
  try {
    const outDir = path.join(output, 'school-groups'), before = schoolView.serialize();
    const schoolReport = exportOfflineHtml({ ...options, contentDb: ':memory:', outDir }, new Map(), schoolView, schoolMachine);
    assert(schoolView.serialize().equals(before));
    assert.deepEqual(schoolReport.schoolGroupedClassPages, [4, 1]);
    assert.deepEqual(schoolReport.schoolNameFallbacks, []);
    const wizard = load(fs.readFileSync(path.join(outDir, 'class-1.html'), 'utf8'));
    assert.equal(wizard('h1').text(), '法师（Wizard）');
    const groups = wizard('#level-3').nextUntil('h2');
    assert.deepEqual(groups.filter('.school-heading').toArray().map(el => wizard(el).text()), ['防护', '咒法／塑能']);
    assert.deepEqual(groups.filter('ul').find('li > a').toArray().map(el => wizard(el).attr('href')), ['A.html#spell-1', 'A.html#spell-5']);
    assert.equal(groups.filter('ul').find('.component-labels').text(), 'F');
    assert.equal(groups.filter('ul').find('.summary').length, 2);
    const zero = wizard('#level-0').nextUntil('h2');
    assert.equal(zero.filter('ul').find('li').length, 1);
    for (const qualifier of ['Zero qualifier', 'Additional qualifier']) assert(zero.text().includes(qualifier));
    assert.equal(load(fs.readFileSync(path.join(outDir, 'class-4.html'), 'utf8'))('#level-3 + h3 + ul .component-labels').text(), 'F');
    assert.equal(load(fs.readFileSync(path.join(outDir, 'class-2.html'), 'utf8'))('.school-heading').length, 0);
    assert.equal(load(fs.readFileSync(path.join(outDir, 'domain-1.html'), 'utf8'))('.school-heading').length, 0);
    assert(!wizard.text().includes('不可混入的学派'));
  } finally { schoolView.close(); }
  // Extra feat relationships remain in the input but outside the book directory.
  const specialFixture = new Database(db.serialize());
  specialFixture.exec(`DELETE FROM SpellListEntry WHERE spellId='spell:2';
    UPDATE SpellContent SET id='spell:3921',legacySpellId=3921 WHERE legacySpellId=2;
    UPDATE I18nSpellText SET spellId=3921 WHERE spellId=2;
    UPDATE I18nSpellSummaryText SET spellId=3921 WHERE spellId=2;
    INSERT INTO SpellListEntry (id,spellId,listType,ownerLegacyId,ownerName,ownerSlug,level,sourceTable,reviewStatus)
    VALUES ('feat','spell:3921','domain',28,'Fixture feat grant','fixture-feat',1,'fixture','accepted'),
    ('normal-3921','spell:3921','class',2,'Second caster','second',1,'fixture','accepted');`);
  specialFixture.prepare("UPDATE I18nSpellText SET nameProvenanceJson=?,bodyProvenanceJson=? WHERE spellId=3921")
    .run(provenance(3921, 'name'), provenance(3921, 'body'));
  const specialView = new Database(specialFixture.serialize(), { readonly: true }); specialFixture.close();
  try {
    const outDir = path.join(output, 'special-feat');
    const specialReport = exportOfflineHtml({ ...options, contentDb: ':memory:', outDir }, new Map(), specialView);
    assert.equal(specialReport.domainPages, 2); assert.equal(specialReport.ordinaryDomainPages, 2);
    assert.equal(specialReport.specialMembershipPages, 0);
    assert.equal(specialReport.sourceDomainListEntries, 4); assert.equal(specialReport.domainListEntries, 3);
    const specialMenu = load(fs.readFileSync(path.join(outDir, 'index.html'), 'utf8'));
    assert.equal(specialMenu('#special-memberships, a[href="domain-28.html"]').length, 0);
    assert(!specialMenu.text().includes('专长授予'));
    assert(!fs.existsSync(path.join(outDir, 'domain-28.html')));
    assert.deepEqual(specialReport.pendingMembershipIssues, [{ issue: 354, listType: 'domain', ownerLegacyId: 28, spellId: 3921, level: 1 }]);
    assert.equal(specialReport.excludedMemberships[0]?.listEntryId, 'feat');
    assert.equal(load(fs.readFileSync(path.join(outDir, 'class-2.html'), 'utf8'))('#level-1 + ul a').attr('href'), 'B.html#spell-3921');
    assert.equal(load(fs.readFileSync(path.join(outDir, 'B.html'), 'utf8'))('#spell-3921-zh').text(), plain);
    assert.equal((specialView.prepare("SELECT COUNT(*) AS n FROM SpellListEntry WHERE id='feat'").get() as { n: number }).n, 1);
    const onlyFeat = new Database(specialView.serialize());
    onlyFeat.exec("DELETE FROM SpellListEntry WHERE id='normal-3921'; DELETE FROM I18nSpellSummaryText WHERE spellId=3921");
    const onlyFeatView = new Database(onlyFeat.serialize(), { readonly: true }); onlyFeat.close();
    try {
      const featOnlyOut = path.join(output, 'feat-only-no-summary');
      const featOnlyReport = exportOfflineHtml({ ...options, contentDb: ':memory:', outDir: featOnlyOut }, new Map(), onlyFeatView);
      assert.equal(featOnlyReport.domainTargets, report.domainTargets);
      assert.equal(load(fs.readFileSync(path.join(featOnlyOut, 'B.html'), 'utf8'))('#spell-3921-zh').text(), plain);
    } finally { onlyFeatView.close(); }
  } finally { specialView.close(); }
  let typographyFailure = 0;
  const rejectTypography = (rows: Map<number, PdfTypographyPresentation>, pattern: RegExp) => {
    const outDir = path.join(output, `bad-typography-${typographyFailure++}`);
    assert.throws(() => exportOfflineHtml({ ...options, outDir }, rows), pattern);
    assert(!fs.existsSync(outDir));
  };
  for (const field of Object.keys(selected.input) as (keyof typeof selected.input)[]) {
    const stale = structuredClone(selected); stale.input[field] += " ";
    rejectTypography(new Map([[5, stale]]), /stale complete typography fields/);
  }
  rejectTypography(new Map([[5, { ...selected, targetId: 1 }]]), /stale typography target/);
  rejectTypography(new Map([[999, selected]]), /scoped SC effective/);
  const changedTable = structuredClone(selected); changedTable.output.englishHtml = displayHtml.replace('rowspan="2"', 'rowspan="3"');
  rejectTypography(new Map([[5, changedTable]]), /links\/tables\/lists\/anchors/);
  const missingNote = structuredClone(selected); missingNote.output.chineseHtml = displayHtml.replace('Separate note paragraph two.', '');
  rejectTypography(new Map([[5, missingNote]]), /Chinese text or reader notes/);
  assert.throws(() => main(['--typography-json', 'caller.json']), /unknown/);
  const writableOut = path.join(output, "writable-view-rejected");
  assert.throws(() => exportOfflineHtml({ ...options, outDir: writableOut }, new Map(), db), /same read-only content DB view/);
  assert(db.open); assert(!fs.existsSync(writableOut));
  const wrongView = new Database(dbPath, { readonly: true });
  try {
    const outDir = path.join(output, "wrong-view-rejected");
    assert.throws(() => exportOfflineHtml({ ...options, contentDb: path.join(temp, "different.sqlite"), outDir }, new Map(), wrongView), /same read-only content DB view/);
    assert(wrongView.open); assert(!fs.existsSync(outDir));
  } finally { wrongView.close(); }
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
    ["UPDATE SpellContent SET canonicalName='3rd invalid initial' WHERE legacySpellId=1", /A–Z initial/],
    ["UPDATE SpellListEntry SET level=10 WHERE id='nine'", /class membership/],
    ["UPDATE SpellListEntry SET ownerName='Conflicting owner' WHERE id='nine'", /class owner/],
    ["UPDATE SpellListEntry SET level=0 WHERE id='domain-one'", /domain membership/],
    ["UPDATE SpellListEntry SET level=10 WHERE id='domain-nine'", /domain membership/],
    ["UPDATE SpellListEntry SET ownerName='Conflicting domain' WHERE id='domain-nine'", /domain owner/],
    ["INSERT INTO SpellListEntry (id,spellId,listType,ownerLegacyId,ownerName,ownerSlug,level,sourceTable,reviewStatus) SELECT 'duplicate-domain',spellId,listType,ownerLegacyId,ownerName,ownerSlug,level,sourceTable,reviewStatus FROM SpellListEntry WHERE id='domain-one'", /Duplicate domain membership tuple/],
    ["DELETE FROM I18nSpellSummaryText WHERE id='summary:7:zh'", /Selected summary gaps/],
    ["DELETE FROM I18nSpellSummaryText WHERE id='summary:1:zh'", /Selected summary gaps/],
    ["UPDATE I18nSpellSummaryText SET rulebookId=9 WHERE id='summary:1:en'", /wrong-book/],
    ["UPDATE I18nSpellSummaryText SET reviewStatus='review' WHERE id='summary:2:zh'", /not-accepted/],
    ["UPDATE I18nSpellSummaryText SET summaryText='' WHERE id='summary:5:en'", /empty/],
    ["DROP INDEX I18nSpellSummaryText_spellId_lang_variant_key; INSERT INTO I18nSpellSummaryText SELECT 'duplicate-summary',spellId,rulebookId,lang,variant,summaryText,sourceKey,sourceName,sourceKind,createdAt,updatedAt,reviewStatus FROM I18nSpellSummaryText WHERE id='summary:1:zh'", /multiple/],
    ["DELETE FROM I18nSpellText WHERE spellId=2 AND variant='effective'", /spell 2: missing name\/body/],
    ["UPDATE I18nSpellText SET rulebookId=87 WHERE spellId=2 AND variant='effective'", /Conflicting/],
    ["UPDATE I18nSpellText SET bodyProvenanceJson=NULL WHERE spellId=2 AND variant='effective'", /language metadata/],
    ["UPDATE SpellContent SET descriptionText='' WHERE legacySpellId=2", /missing English/],
    ["UPDATE I18nSpellText SET bodyProvenanceJson='" + provenance(2, "body", "en") + "' WHERE spellId=2 AND variant='effective'", /Chinese body required/],
    ["UPDATE SpellContent SET id='spell:999' WHERE legacySpellId=2", /conflicting normalized ID/],
    ["UPDATE SpellContent SET descriptionHtml='<script>operative content</script>' WHERE legacySpellId=2", /remove visible content/],
    ["UPDATE SpellContent SET descriptionHtml='<p id=\"x\">A</p><p id=\"x\">B</p>' WHERE legacySpellId=2", /duplicate body anchor/],
    ["DROP INDEX SpellContent_legacySpellId_key; UPDATE SpellContent SET legacySpellId=1 WHERE legacySpellId=2", /duplicate target/],
    ["DROP INDEX I18nSpellText_spellId_lang_variant_key; INSERT INTO I18nSpellText SELECT 'duplicate',spellId,rulebookId,lang,variant,name,descriptionHtml,descriptionText,sourceKey,createdAt,updatedAt,nameProvenanceJson,bodyProvenanceJson FROM I18nSpellText WHERE spellId=2 AND variant='effective'", /duplicate localized/],
  ];
  for (const [sql, pattern] of badCases) {
    const badDb = path.join(temp, `bad-${failureIndex}.sqlite`), outDir = path.join(output, `bad-${failureIndex++}`);
    fs.writeFileSync(badDb, snapshot); const connection = new Database(badDb);
    try { connection.exec(sql); } finally { connection.close(); }
    assert.throws(() => exportOfflineHtml({ ...options, contentDb: badDb, outDir }), pattern);
    assert.ok(!fs.existsSync(outDir));
  }
  const gapDb = path.join(temp, "all-gaps.sqlite"), gapOutput = path.join(output, "all-gaps");
  fs.writeFileSync(gapDb, snapshot); const gapConnection = new Database(gapDb);
  gapConnection.exec("DELETE FROM I18nSpellSummaryText WHERE id='summary:1:zh'; UPDATE I18nSpellSummaryText SET rulebookId=9 WHERE id='summary:2:en'");
  gapConnection.close();
  assert.throws(() => exportOfflineHtml({ ...options, contentDb: gapDb, outDir: gapOutput }), (error: unknown) => {
    assert(error instanceof SummarySelectionError);
    assert.deepEqual(error.gaps, [
      { spellId: 1, lang: "zh", variant: "chm", reason: "missing" },
      { spellId: 2, lang: "en", variant: "imarvin", reason: "wrong-book" },
    ]);
    assert(!error.message.includes(privacy)); return true;
  });
  assert(!fs.existsSync(gapOutput));
  // Other variants select only their own accepted Chinese summaries; English stays imarvin.
  for (const id of [1, 2, 3, 5, 6, 7]) zh(id, `Other name ${id}`, `Other body ${id}`, null, "zh", "other");
  const otherOut = path.join(output, "other-variant");
  assert.deepEqual(exportOfflineHtml({ ...options, variant: "other", outDir: otherOut }).summaryVariants, { en: "imarvin", zh: "other" });
  const otherClass = load(fs.readFileSync(path.join(otherOut, "class-1.html"), "utf8"));
  assert.equal(otherClass('#level-0 + ul [lang="zh"]').text(), "Other exact summary 1.");
  assert.equal(otherClass('[lang="en"]').length, 0);
  // The focused preview stage deliberately skips the full-size replay.
  if (!process.argv.includes("--focused")) {
  // Full-size synthetic scope: one Chinese body per target; English inputs stay internal.
  const expected = new Map<number, { en: string; zh: string }>([
    [1, { en: plain, zh: long }], [2, { en: "As Alpha, except the complete inherited difference.", zh: plain }],
    [3, { en: "English fallback body.", zh: "中文  回退\t保留。\n\n最后一行。" }],
    [5, { en: paragraphText, zh: paragraphText }],
    [6, { en: "Physical\nEnglish fold", zh: natural }],
    [7, { en: "Internal English QA only.", zh: compactText }],
  ]);
  db.transaction(() => {
    for (let i = 0; i < 995; i++) {
      const id = 1000 + i, letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(i % 26);
      const en = `Complete synthetic ${id}\n\nInherited exception <kept> ${id}.`, chinese = `完整合成正文 ${id}\n\n独立备注 ${id}。`;
      spell(id, `${letter} synthetic ${String(id).padStart(4, "0")}`, en, null); zh(id, `合成名称 ${id}`, chinese, null);
      expected.set(id, { en, zh: chinese });
    }
    spell(4837, "Excluded neighbor", "Neighbor in book nine", null, 9);
  })();
  const fullOut = path.join(output, "full-scope"), full = exportOfflineHtml({ ...options, outDir: fullOut });
  assert.equal(full.spells, 1001); assert.equal(full.selectedSummaries, 7); assert.equal(full.classTargets, 3);
  const actual = new Map<number, { en: string; zh: string }>();
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const page = load(fs.readFileSync(path.join(fullOut, `${letter}.html`), "utf8"));
    const names: string[] = [];
    page('.spell-entry').each((_, entry) => {
      const id = Number(page(entry).attr("id")!.slice("spell-".length));
      assert(!actual.has(id));
      actual.set(id, { en: db.prepare('SELECT descriptionText FROM SpellContent WHERE legacySpellId=?').pluck().get(id) as string, zh: page(`#spell-${id}-zh`).text() });
      const row = db.prepare('SELECT canonicalName FROM SpellContent WHERE legacySpellId=?').get(id) as { canonicalName: string };
      assert.equal(row.canonicalName.charAt(0).toUpperCase(), letter); names.push(row.canonicalName);
    });
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
  }
  assert.deepEqual(actual, new Map([...expected].sort(([a], [b]) => {
    const name = (id: number) => (db.prepare('SELECT canonicalName FROM SpellContent WHERE legacySpellId=?').get(id) as { canonicalName: string }).canonicalName;
    return name(a).localeCompare(name(b), "en") || a - b;
  })));
  assert(!actual.has(4837)); assert.equal(actual.size, 1001);
  assert.equal(full.displayedBodies, 1001);
  }
  assert.throws(() => validatePages(new Map([["index.html", '<a href="missing.html">Missing</a>']])), /missing/);
  assert.throws(() => validatePages(new Map([["index.html", '<a href="#absent">Missing</a>']])), /missing link anchor/);
  assert.throws(() => validatePages(new Map([["index.html", '<a href="https://example.invalid">Network</a>']])), /non-local/);
  assert.throws(() => validatePages(new Map([["index.html", '<a href="https://www.d20spellcodex.com/spells/1">Source URL</a>']])), /generated website link/);
  for (const href of ['https://www.d20spellcodex.com/spells/2', 'https://www.d20spellcodex.com/spells/1?x=1', 'https://www.d20spellcodex.com/spells/1#zh', 'https://www.d20spellcodex.com/spells/01']) {
    assert.throws(() => validatePages(new Map([["A.html", `<div class="spell-entry" id="spell-1"><a class="website-link" href="${href}" title="在网站查看" aria-label="在网站查看">↗</a></div>`]])), /generated website link/);
  }
  console.log("offline HTML portable tests passed: Chinese directories, Sorcerer/Wizard school groups, extra feat exclusion, introduction text/navigation, bound ordinary/planar abilities and reader notes, domain-only summaries, printed MFX states, Chinese-only bodies, website links, compact mechanism fields, anchors, paragraphs, notes/lists/tables, privacy, repeat/failures");
} finally {
  if (db.open) db.close();
  for (const [root, directory] of [[os.tmpdir(), temp], [outputRoot, output]]) {
    const absolute = path.resolve(directory!), relative = path.relative(path.resolve(root!), absolute);
    assert(relative.startsWith("offline-html-test-") && !relative.includes(path.sep) && !path.isAbsolute(relative));
    fs.rmSync(absolute, { recursive: true, force: true });
  }
}
