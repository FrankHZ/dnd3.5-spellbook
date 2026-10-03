import assert from "node:assert/strict";
import { load } from "cheerio";

/** Complete accepted fields, including their distinct text/HTML representations. */
export interface TypographyInput {
  englishText: string;
  englishHtml: string;
  chineseText: string;
  chineseHtml: string;
}

/** A private, reviewed display derivative; never an accepted-content input. */
export interface PdfTypographyPresentation {
  targetId: number;
  rulebookId: 86;
  input: TypographyInput;
  output: { englishHtml: string; chineseHtml: string };
}

// Use the existing HTML parser, without browser rendering or whitespace cleanup.
// HTML text is not interchangeable with legacy English Textile descriptionText.
function fragment(html: string) {
  return load(html, { xml: { xmlMode: false } }, false);
}

function preservedStructures(html: string) {
  const $ = fragment(html);
  return {
    links: $("a").toArray().map(el => [$(el).attr("href"), $(el).text()]),
    tables: $("table").toArray().map(table => $(table).find("tr").toArray()
      .map(row => $(row).children("th,td").toArray().map(cell => $(cell).text()))),
    lists: $("ul,ol,dl").toArray().map(list => $(list).children().toArray()
      .map(item => $(item).text())),
  };
}

/**
 * Consume only a caller-authenticated, main-gate-selected private presentation.
 * This checks identity/representation integrity, not PDF semantics or approval.
 * Missing rows retain existing HTML. Stale/changed rows reject the export.
 */
export function selectPdfTypography(
  targetId: number,
  rulebookId: number,
  current: TypographyInput,
  presentation?: PdfTypographyPresentation,
): { englishHtml: string; chineseHtml: string } {
  if (!presentation) {
    return { englishHtml: current.englishHtml, chineseHtml: current.chineseHtml };
  }
  assert.equal(rulebookId, 86, "PDF typography is scoped to SC");
  assert.equal(presentation.rulebookId, rulebookId, "stale typography rulebook");
  assert.equal(presentation.targetId, targetId, "stale typography target");
  assert.deepEqual(presentation.input, current, "stale complete typography fields");
  assert.equal(fragment(presentation.output.englishHtml).root().text(),
    fragment(current.englishHtml).root().text(), "typography changes English HTML text");
  assert.equal(fragment(presentation.output.chineseHtml).root().text(),
    current.chineseText, "typography changes Chinese text or reader notes");
  const before = preservedStructures(current.englishHtml);
  assert.deepEqual(preservedStructures(presentation.output.englishHtml), before,
    "typography changes English links/tables/lists");
  // Chinese accepted HTML can have deliberate whitespace differences from text.
  // Preserve existing structures semantically; do not weaken the complete guard.
  const zhBefore = preservedStructures(current.chineseHtml);
  const zhAfter = preservedStructures(presentation.output.chineseHtml);
  for (const key of ["links", "tables", "lists"] as const) {
    if (zhBefore[key].length) {
      assert.deepEqual(zhAfter[key], zhBefore[key], `typography changes Chinese ${key}`);
    }
  }
  return { ...presentation.output };
}
