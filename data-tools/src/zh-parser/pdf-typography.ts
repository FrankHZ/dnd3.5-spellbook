import assert from "node:assert/strict";
import { load } from "cheerio";
import type { AnyNode } from "domhandler";

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

/** Reviewed decoded-text intervals, in Unicode code points, not UTF-16 units. */
export interface TypographyEmphasisRange {
  start: number;
  end: number;
  text: string;
  style: "em" | "strong";
}

/**
 * Audit emitted HTML independently of the author against complete reviewed ranges.
 * Call after generation (and again after sanitization); mapping metadata alone
 * cannot prove that the actual tags cover the intended characters. This does
 * not authenticate source mappings or grant presentation selection authority.
 */
export function assertPdfTypographyEmphasis(
  html: string,
  ranges: readonly TypographyEmphasisRange[],
): void {
  const $ = fragment(html);
  const characters: string[] = [];
  const actual: Set<string>[] = [];
  function visit(nodes: AnyNode[], styles: ReadonlySet<string>) {
    for (const node of nodes) {
      if (node.type === "text") {
        for (const character of node.data) {
          characters.push(character);
          actual.push(new Set(styles));
        }
      }
      let nested = styles;
      if (node.type === "tag" && (node.name === "em" || node.name === "strong")) {
        nested = new Set([...styles, node.name]);
      }
      if ("children" in node) visit(node.children, nested);
    }
  }
  const root = $.root().toArray()[0]!;
  visit("children" in root ? root.children : [], new Set());
  const expected = characters.map(() => new Set<string>());
  for (const range of ranges) {
    assert(Number.isSafeInteger(range.start) && Number.isSafeInteger(range.end)
      && range.start >= 0 && range.end > range.start && range.end <= characters.length,
    "invalid typography emphasis range");
    assert(range.style === "em" || range.style === "strong", "invalid typography emphasis style");
    assert.equal(characters.slice(range.start, range.end).join(""), range.text,
      "stale typography emphasis text");
    for (let index = range.start; index < range.end; index++) {
      assert(!expected[index]!.has(range.style), "overlapping typography emphasis ranges");
      expected[index]!.add(range.style);
    }
  }
  assert.deepEqual(actual, expected, "emitted typography emphasis differs from reviewed ranges");
}

const semanticTags = new Set([
  "a", "table", "caption", "colgroup", "col", "thead", "tbody", "tfoot",
  "tr", "th", "td", "ul", "ol", "li", "dl", "dt", "dd",
]);
const semanticAttributes: Record<string, string[]> = {
  a: ["href"], colgroup: ["span"], col: ["span"],
  th: ["rowspan", "colspan", "scope", "headers", "abbr"],
  td: ["rowspan", "colspan", "headers"],
  ul: ["type"], ol: ["type", "start", "reversed"], li: ["value"],
};
interface SemanticNode {
  tag: string;
  attributes: Record<string, string>;
  text: string;
  children: SemanticNode[];
}

function preservedStructures(html: string) {
  const $ = fragment(html);
  function project(nodes: AnyNode[]): SemanticNode[] {
    return nodes.flatMap(node => {
      const children = "children" in node ? project(node.children) : [];
      if (node.type !== "tag" || !semanticTags.has(node.name)) return children;
      return [{
        tag: node.name,
        attributes: Object.fromEntries(["id", ...(semanticAttributes[node.name] ?? [])]
          .filter(name => name in node.attribs).map(name => [name, node.attribs[name]!])),
        text: $(node).text(), children,
      }];
    });
  }
  const anchors: { id: string | null; name: string | null; offset: number; text: string }[] = [];
  let offset = 0;
  function visit(nodes: AnyNode[]) {
    for (const node of nodes) {
      if (node.type === "text") offset += node.data.length;
      if (node.type === "tag") {
        const name = node.name === "a" ? node.attribs.name : undefined;
        if ("id" in node.attribs || name !== undefined) {
          anchors.push({ id: node.attribs.id ?? null, name: name ?? null,
            offset, text: $(node).text() });
        }
      }
      if ("children" in node) visit(node.children);
    }
  }
  const root = $.root().toArray()[0]!;
  const nodes = "children" in root ? root.children : [];
  visit(nodes);
  return {
    // Ignore paragraph/inline presentation wrappers, retain semantic nesting.
    links: $("a").toArray().flatMap(el => project([el])),
    tables: $("table").toArray().flatMap(el => project([el])),
    lists: $("ul,ol,dl").toArray().flatMap(el => project([el])),
    anchors,
  };
}

function validateMarkedLists(html: string) {
  const $ = fragment(html);
  $("[class~='pdf-typography-marked-list']").each((_, element) => {
    assert.equal(element.tagName, "ul", "literal markers require a marked ul");
    assert.equal($(element).attr("class"), "pdf-typography-marked-list",
      "only the exact marked-list class token is supported");
    const items = $(element).children("li");
    assert(items.length > 0, "marked lists require direct items");
    items.each((_, item) => {
      const directContent = $(item).clone();
      directContent.find("ul,ol,dl").remove();
      assert(/^[·•]/u.test(directContent.text().trimStart()),
        "each marked-list direct item must retain its reviewed literal marker");
    });
  });
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
  validateMarkedLists(presentation.output.englishHtml);
  validateMarkedLists(presentation.output.chineseHtml);
  assert.equal(fragment(presentation.output.englishHtml).root().text(),
    fragment(current.englishHtml).root().text(), "typography changes English HTML text");
  assert.equal(fragment(presentation.output.chineseHtml).root().text(),
    current.chineseText, "typography changes Chinese text or reader notes");
  const before = preservedStructures(current.englishHtml);
  assert.deepEqual(preservedStructures(presentation.output.englishHtml), before,
    "typography changes English links/tables/lists/anchors");
  // Chinese accepted HTML can have deliberate whitespace differences from text.
  // Preserve existing structures semantically; do not weaken the complete guard.
  const zhBefore = preservedStructures(current.chineseHtml);
  const zhAfter = preservedStructures(presentation.output.chineseHtml);
  for (const key of ["links", "tables", "lists", "anchors"] as const) {
    if (zhBefore[key].length) {
      assert.deepEqual(zhAfter[key], zhBefore[key], `typography changes Chinese ${key}`);
    }
  }
  return { ...presentation.output };
}
