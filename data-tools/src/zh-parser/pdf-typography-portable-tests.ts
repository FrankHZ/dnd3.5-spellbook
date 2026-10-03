import assert from "node:assert/strict";
import { selectPdfTypography, type PdfTypographyPresentation } from "./pdf-typography";

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
      + '<tr><td>1\n</td><td>甲与乙\n</td></tr></table><aside>项目备注：未裁决。</aside>',
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
console.log("PDF typography portable tests passed");
