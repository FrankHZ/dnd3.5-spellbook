import assert from "node:assert/strict";
import { assertPdfTypographyEmphasis, selectPdfTypography, type PdfTypographyPresentation } from "./pdf-typography";

// Frozen author failure: identical text/guards can conceal a truncated style run.
const label = "Material Component:";
const labelRange = [{ start: 0, end: 19, text: label, style: "em" as const }];
assertPdfTypographyEmphasis(`<p><em>${label}</em> regular</p>`, labelRange);
assert.throws(() => assertPdfTypographyEmphasis(
  '<p><em>Material Com</em>ponent: regular</p>', labelRange), /emitted typography emphasis/);
assert.throws(() => assertPdfTypographyEmphasis(
  `<p><em>${label} regular</em></p>`, labelRange), /emitted typography emphasis/);
assert.throws(() => assertPdfTypographyEmphasis(`<p>${label} regular</p>`, labelRange),
  /emitted typography emphasis/);
const nestedRanges = [
  { start: 1, end: 5, text: "😀&甲\n", style: "em" as const },
  { start: 3, end: 4, text: "甲", style: "strong" as const },
  { start: 5, end: 6, text: "乙", style: "strong" as const },
];
assertPdfTypographyEmphasis('x<em>😀&amp;<a href="#a"><strong>甲</strong></a>\n<br></em>'
  + '<strong>乙</strong><a id="a"></a>', nestedRanges);
assertPdfTypographyEmphasis('<em>A</em><a href="#b"><em>B</em></a><br/><em>C</em>',
  [{ start: 0, end: 3, text: "ABC", style: "em" }]);
assert.throws(() => assertPdfTypographyEmphasis('<em>AB</em>',
  [{ start: 0, end: 2, text: "XY", style: "em" }]), /stale typography emphasis text/);
assert.throws(() => assertPdfTypographyEmphasis('<em>AB</em>',
  [{ start: 0, end: 3, text: "AB", style: "em" }]), /invalid typography emphasis range/);
assert.throws(() => assertPdfTypographyEmphasis('<em>AB</em>',
  [{ start: 0, end: 2, text: "AB", style: "em" },
    { start: 1, end: 2, text: "B", style: "em" }]), /overlapping typography emphasis/);
assert.throws(() => assertPdfTypographyEmphasis('<em><strong>AB</strong></em>',
  [{ start: 0, end: 2, text: "AB", style: "em" }]), /emitted typography emphasis/);

const input = {
  englishText: '_Opening._\n\n"_base_":spells/example/',
  englishHtml: '<p><em>Opening.</em></p>\n<p><a href="/spells/example/"><em>base</em></a></p>'
    + '<table><tr><th>Roll</th><th>Effect</th></tr><tr><td>1</td><td>A &amp; B</td></tr></table>',
  chineseText: '等级：一\n开场。\n参照基础。\n掷骰\n效果\n1\n甲与乙\n项目备注：未裁决。',
  chineseHtml: '<pre>等级：一\n开场。\n参照基础。\n掷骰\n效果\n1\n甲与乙\n项目备注：未裁决。</pre>',
};
const row: PdfTypographyPresentation = {
  targetId: 90001, rulebookId: 86, input,
  output: {
    englishHtml: input.englishHtml,
    chineseHtml: '<p><strong>等级：</strong>一\n</p><p><em>开场。</em>\n</p>'
      + '<p>参照基础。\n</p><table><tr><th>掷骰\n</th><th>效果\n</th></tr>'
      + '<tr><td>1\n</td><td>甲与乙\n</td></tr></table><div><p>项目备注：未裁决。</p></div>',
  },
};
assert.deepEqual(selectPdfTypography(90001, 86, input, row), row.output);
assert.deepEqual(selectPdfTypography(90001, 86, input), {
  englishHtml: input.englishHtml, chineseHtml: input.chineseHtml,
});
assert.throws(() => selectPdfTypography(90002, 86, input, row), /stale typography target/);
assert.throws(() => selectPdfTypography(90001, 6, input, row), /scoped to SC/);
for (const field of Object.keys(input) as (keyof typeof input)[]) {
  assert.throws(() => selectPdfTypography(90001, 86, { ...input, [field]: input[field] + " " }, row),
    /stale complete typography fields/);
}
for (const [field, pattern] of [["chineseHtml", /Chinese text or reader notes/],
  ["englishHtml", /English HTML text/]] as const) {
  const changed = structuredClone(row);
  changed.output[field] += "changed";
  assert.throws(() => selectPdfTypography(90001, 86, input, changed), pattern);
}
const changedLink = structuredClone(row);
changedLink.output.englishHtml = input.englishHtml.replace('/spells/example/', '/spells/wrong/');
assert.throws(() => selectPdfTypography(90001, 86, input, changedLink), /links\/tables\/lists/);
const removedNote = structuredClone(row);
removedNote.output.chineseHtml = row.output.chineseHtml.replace("项目备注：未裁决。", "");
assert.throws(() => selectPdfTypography(90001, 86, input, removedNote), /Chinese text or reader notes/);
const flattened = structuredClone(row);
flattened.output.englishHtml = input.englishHtml.replace(/<\/?(?:table|tr|th|td)>/g, "");
assert.throws(() => selectPdfTypography(90001, 86, input, flattened), /links\/tables\/lists/);
const withList = { ...input, englishHtml: input.englishHtml + '<ul><li>One</li><li>Two</li></ul>' };
const flatList = { ...row, input: withList, output: { ...row.output,
  englishHtml: withList.englishHtml.replace(/<\/?(?:ul|li)>/g, "") } };
assert.throws(() => selectPdfTypography(90001, 86, withList, flatList), /links\/tables\/lists/);
const listRow = { ...row, input: withList, output: { ...row.output, englishHtml: withList.englishHtml } };
assert.deepEqual(selectPdfTypography(90001, 86, withList, listRow), listRow.output);
const chineseStructures = { ...input, chineseText: "基础甲乙", chineseHtml:
  '<p><a href="/spells/base/">基础</a></p><table><tr><td>甲</td><td>乙</td></tr></table>' };
const zhStructureRow = { ...row, input: chineseStructures, output: { ...row.output,
  chineseHtml: chineseStructures.chineseHtml } };
assert.deepEqual(selectPdfTypography(90001, 86, chineseStructures, zhStructureRow), zhStructureRow.output);
assert.throws(() => selectPdfTypography(90001, 86, chineseStructures, { ...zhStructureRow,
  output: { ...zhStructureRow.output, chineseHtml: "<p>基础甲乙</p>" } }), /Chinese links/);
assert.throws(() => selectPdfTypography(90001, 86, chineseStructures, { ...zhStructureRow,
  output: { ...zhStructureRow.output, chineseHtml:
    '<p><a href="/spells/base/">基础</a>甲乙</p>' } }), /Chinese tables/);
const whitespaceInput = { ...input, chineseText: "甲\n\n乙", chineseHtml: "<p>甲 </p><p>乙</p>" };
assert.deepEqual(selectPdfTypography(90001, 86, whitespaceInput, { ...row, input: whitespaceInput,
  output: { ...row.output, chineseHtml: "<p>甲\n\n</p><p>乙</p>" } }).chineseHtml,
  "<p>甲\n\n</p><p>乙</p>");
assert.equal(input.chineseHtml.startsWith("<pre>"), true, "inputs are never mutated");

// Same decoded text can still lose rules-relevant table/list/link semantics.
const structuralRegressions = [
  ["ABC", '<table><tr><th colspan="2" scope="col">A</th></tr><tr><td>B</td><td>C</td></tr></table>',
    '<table><tr><td>A</td></tr><tr><td>B</td><td>C</td></tr></table>'],
  ["A", '<table><tr><th colspan="2">A</th></tr></table>', '<table><tr><th>A</th></tr></table>'],
  ["A", '<table><tr><td rowspan="2">A</td></tr></table>', '<table><tr><td>A</td></tr></table>'],
  ["A", '<table><tr><th scope="row">A</th></tr></table>', '<table><tr><th>A</th></tr></table>'],
  ["A", '<table><tr><td headers="header-a">A</td></tr></table>', '<table><tr><td>A</td></tr></table>'],
  ["AB", '<table><tr><th id="header-a">A</th><td headers="header-a">B</td></tr></table>',
    '<table><tr><th><span id="header-a">A</span></th><td headers="header-a">B</td></tr></table>'],
  ["AB", '<table><caption>A</caption><tbody><tr><td>B</td></tr></tbody></table>',
    '<table>A<tbody><tr><td>B</td></tr></tbody></table>'],
  ["A", '<table><colgroup span="2"><col span="2"></colgroup><thead><tr><th>A</th></tr></thead></table>',
    '<table><colgroup><col></colgroup><thead><tr><th>A</th></tr></thead></table>'],
  ["A", '<table><thead><tr><th>A</th></tr></thead></table>', '<table><tbody><tr><th>A</th></tr></tbody></table>'],
  ["AB", '<ol start="3"><li value="5">A</li><li>B</li></ol>', '<ul><li>A</li><li>B</li></ul>'],
  ["AB", '<ol start="3"><li>A</li><li>B</li></ol>', '<ol><li>A</li><li>B</li></ol>'],
  ["AB", '<ol><li value="5">A</li><li>B</li></ol>', '<ol><li>A</li><li>B</li></ol>'],
  ["AB", '<ol type="A" reversed><li>A</li><li>B</li></ol>', '<ol><li>A</li><li>B</li></ol>'],
  ["ABC", '<ul><li>A<ul><li>B</li></ul></li><li>C</li></ul>', '<ul><li>A</li><li>B</li><li>C</li></ul>'],
  ["AB", '<dl><dt>A</dt><dd>B</dd></dl>', '<dl><dd>A</dd><dt>B</dt></dl>'],
  ["ABC", '<table><tr><td>A<table><tr><td>B</td></tr></table>C</td></tr></table>',
    '<table><tr><td>A</td></tr></table><table><tr><td>B</td></tr></table>C'],
  ["AB", '<p id="target">A</p><a href="#target">B</a>', '<p>A</p><a href="#target">B</a>'],
  ["AB", '<a name="target"></a><p>A</p><a href="#target">B</a>', '<a></a><p>A</p><a href="#target">B</a>'],
  ["AAB", '<p id="target">A</p><p>A</p><a href="#target">B</a>',
    '<p>A</p><p id="target">A</p><a href="#target">B</a>'],
] as const;
for (const [text, before, after] of structuralRegressions) {
  for (const language of ["english", "chinese"] as const) {
    const current = language === "english" ? { ...input, englishHtml: before }
      : { ...input, chineseText: text, chineseHtml: before };
    const changed = { ...row, input: current, output: { ...row.output,
      [language === "english" ? "englishHtml" : "chineseHtml"]: after } };
    assert.throws(() => selectPdfTypography(90001, 86, current, changed),
      /typography changes (English links\/tables\/lists|Chinese (tables|lists|anchors))/,
      `reject ${language} semantic loss: ${before}`);
  }
}
const semanticHtml = '<p id="target">A</p><a href="#target">B</a>'
  + '<ol start="3" type="A"><li value="5">C<ul><li>D</li></ul></li></ol>'
  + '<table><caption>E</caption><colgroup><col span="2"></colgroup><thead><tr>'
  + '<th colspan="2" scope="col">F</th></tr></thead><tbody><tr><td rowspan="2">G</td></tr></tbody></table>';
const semanticInput = { ...input, englishHtml: semanticHtml, chineseText: "ABCDEFG", chineseHtml: semanticHtml };
const restyled = semanticHtml.replace('<p id="target">A</p>', '<div id="target"><em>A</em></div>')
  .replace('>F</th>', '><strong>F</strong></th>');
assert.deepEqual(selectPdfTypography(90001, 86, semanticInput, { ...row, input: semanticInput,
  output: { englishHtml: restyled, chineseHtml: restyled } }),
  { englishHtml: restyled, chineseHtml: restyled }, "reviewed paragraphs/inline styles may change");
const markedHtml = '<ul class="pdf-typography-marked-list"><li>·A<ul><li>B</li></ul></li><li>·C</li></ul>';
const markedInput = { ...input, chineseText: "·AB·C", chineseHtml: "<pre>·AB·C</pre>" };
assert.equal(selectPdfTypography(90001, 86, markedInput, { ...row, input: markedInput,
  output: { ...row.output, chineseHtml: markedHtml } }).chineseHtml, markedHtml);
// Observed Chinese literal markers. They are accepted only within an explicit
// reviewed marked list; a punctuation character never classifies ordinary prose.
for (const marker of ["‧", "◆", "．"]) {
  const text = `${marker}甲\n${marker}乙`;
  const current = { ...input, chineseText: text, chineseHtml: `<pre>${text}</pre>` };
  const html = `<ul class="pdf-typography-marked-list"><li>${marker}甲\n</li><li>${marker}乙</li></ul>`;
  const presentation = { ...row, input: current, output: { ...row.output, chineseHtml: html } };
  assert.equal(selectPdfTypography(90001, 86, current, presentation).chineseHtml, html);
  const ordinary = `<p>${text}</p>`;
  assert.equal(selectPdfTypography(90001, 86, current, { ...presentation,
    output: { ...presentation.output, chineseHtml: ordinary } }).chineseHtml, ordinary);
  for (const bad of [
    `<ul class="pdf-typography-marked-list"><li>${marker}甲\n</li><li>乙</li></ul>`,
    `<ul class="pdf-typography-marked-list"><li><ul><li>${marker}甲\n${marker}乙</li></ul></li></ul>`,
    html.replace('class="pdf-typography-marked-list"', 'class="pdf-typography-marked-list other"'),
    html.replaceAll("<ul", "<ol").replaceAll("</ul>", "</ol>"),
  ]) {
    assert.throws(() => selectPdfTypography(90001, 86, current, { ...presentation,
      output: { ...presentation.output, chineseHtml: bad } }),
    /literal marker|marked-list class|marked ul/);
  }
  for (const changed of [html.replace("甲", "丙"), html.replace("\n", ""),
    `<ul class="pdf-typography-marked-list"><li>${marker}乙</li><li>${marker}甲\n</li></ul>`]) {
    assert.throws(() => selectPdfTypography(90001, 86, current, { ...presentation,
      output: { ...presentation.output, chineseHtml: changed } }), /Chinese text or reader notes/);
  }
}
assert.throws(() => selectPdfTypography(90001, 86, { ...input,
  chineseText: "※甲", chineseHtml: "<pre>※甲</pre>" }, { ...row,
  input: { ...input, chineseText: "※甲", chineseHtml: "<pre>※甲</pre>" },
  output: { ...row.output, chineseHtml: '<ul class="pdf-typography-marked-list"><li>※甲</li></ul>' } }),
/literal marker/, "unobserved markers remain unsupported");
for (const [text, html] of [["·AB", '<ul class="pdf-typography-marked-list"><li>·A</li><li>B</li></ul>'],
  ["·A", '<ul class="pdf-typography-marked-list"><li><ul><li>·A</li></ul></li></ul>'],
  ["·A", '<ul class="pdf-typography-marked-list other"><li>·A</li></ul>'],
  ["·A", '<ol class="pdf-typography-marked-list"><li>·A</li></ol>']] as const) {
  const current = { ...input, chineseText: text, chineseHtml: `<pre>${text}</pre>` };
  assert.throws(() => selectPdfTypography(90001, 86, current, { ...row, input: current,
    output: { ...row.output, chineseHtml: html } }), /literal marker|marked-list class|marked ul/);
}
console.log("PDF typography portable tests passed");
