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

const imageOverlapBody = page(
  [item("Body text crossing an illustration", 40, 660)],
  [
    block(
      0,
      "text",
      [50, 90, 300, 140],
      "Previous body text Body text crossing an illustration",
    ),
    block(1, "image", [50, 140, 400, 300], null),
  ],
);
const imageOverlapProjection = buildFullMineruLayoutReviewCandidates([
  imageOverlapBody,
]);
assert.equal(imageOverlapProjection.length, 1);
assert.equal(
  imageOverlapProjection[0]?.candidateAlgorithmVersion,
  "mineru-image-overlap-projection-v2",
);
assert.equal(imageOverlapProjection[0]?.kind, "outside-bbox-projection");
assert.deepEqual(
  reconstructMineruReadingLines(
    imageOverlapBody,
    acceptCandidates([imageOverlapBody]),
  ).lines.map((line) => line.text),
  ["Body text crossing an illustration"],
);

const imageOverlapInsideContent = page(
  [item("Content and image overlap", 40, 660)],
  [
    block(0, "text", [50, 130, 400, 210], "Content and image overlap"),
    block(1, "image", [50, 140, 400, 300], null),
  ],
);
const insideContentCandidates = buildFullMineruLayoutReviewCandidates([
  imageOverlapInsideContent,
]);
assert.equal(insideContentCandidates.length, 1);
assert.equal(insideContentCandidates[0]?.kind, "outside-bbox-projection");
assert.equal(
  insideContentCandidates[0]?.candidateAlgorithmVersion,
  "mineru-image-overlap-projection-v2",
);
const insideContentProposed = reconstructMineruReadingLines(
  imageOverlapInsideContent,
);
assert.equal(insideContentProposed.lines.length, 0);
assert.equal(insideContentProposed.issues.length, 1);
assert.deepEqual(
  reconstructMineruReadingLines(
    imageOverlapInsideContent,
    acceptCandidates([imageOverlapInsideContent]),
  ).lines.map((line) => line.text),
  ["Content and image overlap"],
);

const imageEdgeOverlapInsideContent = page(
  [{ ...item("Wide content edge overlap", 40, 660), width: 200 }],
  [
    block(0, "text", [150, 130, 450, 210], "Wide content edge overlap"),
    block(1, "image", [50, 140, 100, 300], null),
  ],
);
const edgeOverlapCandidates = buildFullMineruLayoutReviewCandidates([
  imageEdgeOverlapInsideContent,
]);
assert.equal(edgeOverlapCandidates.length, 1);
assert.equal(edgeOverlapCandidates[0]?.kind, "outside-bbox-projection");
assert.equal(
  reconstructMineruReadingLines(imageEdgeOverlapInsideContent).lines.length,
  0,
);
assert.deepEqual(
  reconstructMineruReadingLines(
    imageEdgeOverlapInsideContent,
    acceptCandidates([imageEdgeOverlapInsideContent]),
  ).lines.map((line) => line.text),
  ["Wide content edge overlap"],
);

const imageCaptionEdgeOverlap = page(
  [{ ...item("Illustration caption near body", 40, 660), width: 200 }],
  [
    block(0, "text", [150, 130, 450, 210], "Different nearby body text"),
    block(1, "image", [50, 140, 100, 300], null),
    block(2, "footer", [60, 190, 360, 230], "Illustration caption near body"),
  ],
);
const captionEdgeCandidates = buildFullMineruLayoutReviewCandidates([
  imageCaptionEdgeOverlap,
]);
assert.equal(captionEdgeCandidates.length, 1);
assert.equal(captionEdgeCandidates[0]?.kind, "image-adjacent-exclusion");

const blankColumnContinuation = page(
  [item("continued prose", 400, 730)],
  [
    block(0, "text", [50, 700, 300, 900], "Previous column prose"),
    block(1, "text", [650, 60, 800, 100], ""),
    block(2, "image", [600, 0, 900, 200], null),
  ],
);
const blankColumnCandidates = buildFullMineruLayoutReviewCandidates([
  blankColumnContinuation,
]);
assert.equal(blankColumnCandidates.length, 1);
assert.equal(blankColumnCandidates[0]?.kind, "outside-bbox-projection");
assert.equal(
  blankColumnCandidates[0]?.kind === "outside-bbox-projection"
    ? blankColumnCandidates[0].targetBlockIndex
    : null,
  0,
);

const imageOverlapInsideStructural = page(
  [item("Illustration callout", 40, 660)],
  [
    block(0, "discarded", [50, 130, 400, 210], "Illustration callout"),
    block(1, "image", [50, 140, 400, 300], null),
  ],
);
const insideStructuralCandidates = buildFullMineruLayoutReviewCandidates([
  imageOverlapInsideStructural,
]);
assert.equal(insideStructuralCandidates.length, 1);
assert.equal(insideStructuralCandidates[0]?.kind, "image-adjacent-exclusion");
assert.equal(
  insideStructuralCandidates[0]?.candidateAlgorithmVersion,
  "mineru-image-overlap-exclusion-v2",
);
assert.equal(
  reconstructMineruReadingLines(imageOverlapInsideStructural).issues.length,
  1,
);
assert.equal(
  reconstructMineruReadingLines(
    imageOverlapInsideStructural,
    acceptCandidates([imageOverlapInsideStructural]),
  ).issues.length,
  0,
);
const rejectedStructuralImage = acceptCandidates([
  imageOverlapInsideStructural,
]).map((review) => ({
  ...review,
  status: "rejected" as const,
}));
assert.equal(
  reconstructMineruReadingLines(
    imageOverlapInsideStructural,
    rejectedStructuralImage,
  ).issues.length,
  1,
);
assert.match(
  validateFullMineruLayoutReviews(
    [imageOverlapInsideStructural],
    rejectedStructuralImage,
    { requireTerminal: true },
  ).join("\n"),
  /has no accepted item layout action/u,
);

const imageOverlapCaption = page(
  [item("Illustration caption", 40, 500)],
  [
    block(0, "text", [50, 90, 300, 140], "Distant body text"),
    block(1, "image", [50, 140, 400, 400], null),
  ],
);
const imageOverlapExclusion = buildFullMineruLayoutReviewCandidates([
  imageOverlapCaption,
]);
assert.equal(imageOverlapExclusion.length, 1);
assert.equal(
  imageOverlapExclusion[0]?.candidateAlgorithmVersion,
  "mineru-image-overlap-exclusion-v2",
);
assert.equal(imageOverlapExclusion[0]?.kind, "image-adjacent-exclusion");

const invalidStatus = acceptedExclusion.map((review) => ({
  ...review,
  status: "accpeted",
})) as unknown as FullMineruLayoutReview[];
assert.match(
  validateFullMineruLayoutReviews([excludedImage], invalidStatus).join("\n"),
  /status is invalid/u,
);
const invalidReviewer = structuredClone(acceptedExclusion) as unknown as Array<
  Record<string, unknown>
>;
invalidReviewer[0]!.reviewer = 1;
assert.match(
  validateFullMineruLayoutReviews(
    [excludedImage],
    invalidReviewer as unknown as FullMineruLayoutReview[],
  ).join("\n"),
  /terminal decision requires reviewer and note/u,
);
const alteredPayload = structuredClone(acceptedExclusion);
if (alteredPayload[0]?.kind === "image-adjacent-exclusion") {
  alteredPayload[0].pdfItem.text = "Changed caption";
}
assert.match(
  validateFullMineruLayoutReviews([excludedImage], alteredPayload).join("\n"),
  /payload does not match its evidence fingerprint/u,
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
