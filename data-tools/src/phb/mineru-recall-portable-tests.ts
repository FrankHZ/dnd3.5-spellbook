import assert from "node:assert/strict";

import type { PhbPdfSourcePage } from "./pdf-baseline";
import { auditMineruPageRecall } from "./mineru-recall";
import type { StableMineruBlock } from "./pilot-extraction";

const page: PhbPdfSourcePage = {
  zeroBasedPageIndex: 182,
  width: 1000,
  height: 1000,
  textItemCount: 4,
  textCharacterCount: 48,
  textLayerSha256: "a".repeat(64),
  items: [
    pdfItem("CHAPTER 11:", 20, 980),
    pdfItem("Alter Self:", 100, 600),
    pdfItem("Assume form of a similar creature.", 100, 620),
    pdfItem("182", 950, 20),
  ],
};
const missingBlocks = [block("Other spell.", [100, 300, 400, 330])];
const completeBlocks = [
  block("Alter Self: Assume form of a similar creature.", [90, 360, 450, 420]),
];

const missing = auditMineruPageRecall({
  page,
  printedPageNumber: 182,
  rangeKinds: ["class-list"],
  blocks: missingBlocks,
});
assert.equal(missing.counts.pdfContentItems, 2);
assert.equal(missing.counts.strictBboxMissItems, 2);
assert.equal(missing.counts.normalizedTextMissItems, 2);
assert.deepEqual(
  missing.strictBboxMisses.map((row) => row.itemIndex),
  [1, 2],
);

const complete = auditMineruPageRecall({
  page,
  printedPageNumber: 182,
  rangeKinds: ["class-list"],
  blocks: completeBlocks,
});
assert.equal(complete.counts.strictBboxMissItems, 0);
assert.equal(complete.counts.normalizedTextMissItems, 0);
assert.equal(complete.tokenComparison.tokenRecall, 1);

const dehyphenated = auditMineruPageRecall({
  page: {
    ...page,
    textItemCount: 2,
    textCharacterCount: 72,
    items: [
      pdfItem("Frees subjects from enchantments, alter-", 100, 600),
      pdfItem("ations, compulsions, and curses.", 100, 620),
    ],
  },
  printedPageNumber: 182,
  rangeKinds: ["class-list"],
  blocks: [
    block(
      "Frees subjects from enchantments, alterations, compulsions, and curses.",
      [90, 360, 600, 420],
    ),
  ],
});
assert.equal(dehyphenated.counts.normalizedTextMissItems, 0);

console.log("PHB MinerU recall portable tests passed");

function pdfItem(text: string, x: number, y: number) {
  return {
    text,
    x,
    y,
    width: 100,
    height: 10,
    fontName: "fixture",
    hasEol: true,
  };
}

function block(
  text: string,
  bbox: [number, number, number, number],
): StableMineruBlock {
  return {
    type: "text",
    bbox,
    text,
    textLevel: null,
    tableHtml: null,
    listItems: [],
    captions: [],
    footnotes: [],
    assetPath: null,
    textOrigin: "text-layer",
  };
}
