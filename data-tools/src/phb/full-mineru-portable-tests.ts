import assert from "node:assert/strict";

import {
  buildFullMineruLayoutReviewCandidates,
  fullMineruLayoutDecisionFingerprint,
  mergeFullMineruLayoutReviews,
  reconstructMineruReadingLines,
  validateFullMineruLayoutReviews,
  type FullMineruBlock,
  type FullMineruLayoutReview,
  type FullMineruPageRow,
} from "./full-mineru";
import { compareTokenMultisets } from "./pilot-extraction";

const mineruOrder = page(
  [item("First block", 40, 650), item("Second block", 40, 700)],
  [
    block(0, "text", [50, 160, 300, 210], "First block"),
    block(1, "text", [50, 90, 300, 140], "Second block"),
  ],
);
assert.deepEqual(
  reconstructMineruReadingLines(mineruOrder).lines.map((line) => line.text),
  ["First block", "Second block"],
);

const headerRepair = page(
  [item("Target: One creature", 40, 700), item("Description", 40, 650)],
  [
    block(0, "text", [50, 160, 400, 210], "Description"),
    block(1, "header", [50, 90, 400, 140], "Target: One creature"),
  ],
);
const headerProposed = reconstructMineruReadingLines(headerRepair);
assert.deepEqual(
  headerProposed.lines.map((line) => line.text),
  ["Description", "Target: One creature"],
);
assert.equal(headerProposed.issues.length, 1);
assert.match(headerProposed.issues[0]!.message, /content-order conflict/u);
const acceptedHeaderReviews = acceptCandidates([headerRepair]);
assert.notEqual(
  fullMineruLayoutDecisionFingerprint(acceptedHeaderReviews[0]!),
  acceptedHeaderReviews[0]!.evidenceFingerprintSha256,
);
assert.notEqual(
  fullMineruLayoutDecisionFingerprint(acceptedHeaderReviews[0]!),
  fullMineruLayoutDecisionFingerprint({
    ...acceptedHeaderReviews[0]!,
    decisionNote: "A different review decision note",
  }),
);
assert.deepEqual(
  reconstructMineruReadingLines(headerRepair, acceptedHeaderReviews).lines.map(
    (line) => line.text,
  ),
  ["Target: One creature", "Description"],
);

const boundedRepair = page(
  [item("Near block edge", 153, 700)],
  [block(0, "text", [50, 90, 300, 140], "Near block edge")],
);
const boundedResult = reconstructMineruReadingLines(boundedRepair);
assert.equal(boundedResult.lines.length, 0);
assert.equal(boundedResult.issues.length, 1);
const boundedCandidates = buildFullMineruLayoutReviewCandidates([
  boundedRepair,
]);
assert.equal(boundedCandidates.length, 1);
assert.equal(boundedCandidates[0]!.kind, "outside-bbox-projection");
assert.deepEqual(
  reconstructMineruReadingLines(
    boundedRepair,
    acceptCandidates([boundedRepair]),
  ).lines.map((line) => line.text),
  ["Near block edge"],
);
const invalidTarget = mergeFullMineruLayoutReviews([], boundedCandidates).map(
  (review) =>
    review.kind === "outside-bbox-projection"
      ? { ...review, targetBlockIndex: 999 }
      : review,
);
assert.match(
  validateFullMineruLayoutReviews([boundedRepair], invalidTarget).join("\n"),
  /targetBlockIndex is not an eligible block/u,
);

const excludedImage = page(
  [item("Illustration text", 40, 720)],
  [block(0, "image", [50, 90, 400, 140], null)],
);
const excludedResult = reconstructMineruReadingLines(excludedImage);
assert.equal(excludedResult.lines.length, 0);
assert.equal(excludedResult.issues.length, 1);
const excludedCandidates = buildFullMineruLayoutReviewCandidates([
  excludedImage,
]);
assert.equal(excludedCandidates.length, 1);
assert.equal(excludedCandidates[0]!.kind, "image-adjacent-exclusion");
const acceptedExclusion = acceptCandidates([excludedImage]);
assert.equal(
  reconstructMineruReadingLines(excludedImage, acceptedExclusion).issues.length,
  0,
);

const invalidStatus = acceptedExclusion.map((review) => ({
  ...review,
  status: "accpeted",
})) as unknown as FullMineruLayoutReview[];
assert.match(
  validateFullMineruLayoutReviews([excludedImage], invalidStatus).join("\n"),
  /status is invalid/u,
);

console.log("PHB full MinerU portable tests passed");

function acceptCandidates(pages: FullMineruPageRow[]) {
  return buildFullMineruLayoutReviewCandidates(pages).map((review) => ({
    ...review,
    status: "accepted" as const,
    reviewer: "portable-test",
    decisionNote: "Portable fixture explicitly accepts this layout action.",
  }));
}

function page(
  items: FullMineruPageRow["pdfjs"]["items"],
  blocks: FullMineruBlock[],
): FullMineruPageRow {
  const pdfText = items.map((value) => value.text).join(" ");
  const mineruText = blocks.map((value) => value.text ?? "").join(" ");
  return {
    schemaVersion: 1,
    sourceId: "phb35-core",
    sourceArtifactSha256: "a".repeat(64),
    sourcePageIndex: 200,
    printedPageNumber: 200,
    rangeKinds: ["description"],
    pdfjs: {
      extractor: { name: "pdfjs-dist", version: "fixture" },
      width: 612,
      height: 792,
      textLayerSha256: "b".repeat(64),
      items,
    },
    mineru: {
      engine: "MinerU",
      version: "fixture",
      contentListSha256: "c".repeat(64),
      blocks,
    },
    comparison: compareTokenMultisets(pdfText, mineruText),
  };
}

function item(text: string, x: number, y: number) {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 10,
    fontName: "fixture",
    hasEol: true,
  };
}

function block(
  blockIndex: number,
  type: string,
  bbox: [number, number, number, number],
  text: string | null,
): FullMineruBlock {
  return {
    blockIndex,
    type,
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
