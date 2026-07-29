import assert from "node:assert/strict";

import type { FullMineruLayoutReview, FullMineruPageRow } from "./full-mineru";
import {
  MINERU_DUAL_REVIEWER,
  buildMineruDualReviewRows,
  mergeMineruDualReviews,
  validateMineruDualReviews,
  type MineruDualReview,
} from "./mineru-dual-review";
import type { MineruRecallAudit } from "./mineru-recall";

const page: FullMineruPageRow = {
  schemaVersion: 1,
  sourceId: "phb35-core",
  sourceArtifactSha256: "a".repeat(64),
  sourcePageIndex: 10,
  printedPageNumber: 10,
  rangeKinds: ["description"],
  pdfjs: {
    extractor: { name: "pdfjs-dist", version: "test" },
    width: 100,
    height: 100,
    textLayerSha256: "d".repeat(64),
    items: [pdfItem("First", 10), pdfItem("Missing", 20), pdfItem("10", 90)],
  },
  mineru: {
    engine: "MinerU",
    version: "test",
    contentListSha256: "b".repeat(64),
    blocks: [],
  },
  comparison: {
    pdfTokenCount: 2,
    mineruTokenCount: 2,
    sharedTokenCount: 2,
    tokenRecall: 1,
    tokenPrecision: 1,
  },
};

const acceptedLayout = layoutReview(1, "accepted");
const automatic = build({
  pipeline: audit({ bboxMisses: [1], textMisses: [1] }),
  vlm: audit({}),
  layoutReviews: [acceptedLayout],
});
assert.equal(automatic.length, 1);
assert.equal(automatic[0]?.kind, "item-recall-disagreement");
assert.equal(automatic[0]?.status, "accepted");
assert.equal(automatic[0]?.reviewer, MINERU_DUAL_REVIEWER);
assert.deepEqual(validateMineruDualReviews(automatic, automatic), []);

const blocked = build({
  pipeline: audit({ bboxMisses: [1], textMisses: [1] }),
  vlm: audit({}),
});
assert.equal(blocked[0]?.status, "proposed");
assert.match(
  validateMineruDualReviews(blocked, blocked, { requireTerminal: true }).join(
    "\n",
  ),
  /still proposed/u,
);

const sharedMiss = build({
  pipeline: audit({ bboxMisses: [1], textMisses: [1] }),
  vlm: audit({ bboxMisses: [1], textMisses: [1] }),
});
assert.equal(sharedMiss[0]?.kind, "item-recall-disagreement");
assert.equal(sharedMiss[0]?.status, "proposed");

const strictBboxProjection = build({
  pipeline: audit({ textMisses: [1] }),
  vlm: audit({}),
});
assert.equal(strictBboxProjection[0]?.status, "accepted");

const vlmGeometryRegression = build({
  pipeline: audit({}),
  vlm: audit({ bboxMisses: [1] }),
});
assert.equal(vlmGeometryRegression[0]?.status, "accepted");

const structuralHeaderPage: FullMineruPageRow = {
  ...page,
  mineru: {
    ...page.mineru,
    blocks: [
      {
        blockIndex: 0,
        type: "header",
        bbox: [0, 0, 1000, 1000],
        text: "Missing",
        textLevel: null,
        tableHtml: null,
        listItems: [],
        captions: [],
        footnotes: [],
        assetPath: null,
        textOrigin: "text-layer",
      },
    ],
  },
};
const structuralHeader = build({
  page: structuralHeaderPage,
  pipeline: audit({ bboxMisses: [1] }),
  vlm: audit({}),
});
assert.equal(structuralHeader[0]?.status, "accepted");
assert.equal(
  structuralHeader[0]?.kind === "item-recall-disagreement"
    ? structuralHeader[0].items[0]?.pipeline.structuralBboxCovered
    : null,
  true,
);
assert.equal(
  structuralHeader[0]?.kind === "item-recall-disagreement"
    ? structuralHeader[0].items[0]?.pipeline.structuralTextMatched
    : null,
  true,
);
const mismatchedStructuralHeader = build({
  page: {
    ...structuralHeaderPage,
    mineru: {
      ...structuralHeaderPage.mineru,
      blocks: structuralHeaderPage.mineru.blocks.map((value) => ({
        ...value,
        text: "Different header",
      })),
    },
  },
  pipeline: audit({ bboxMisses: [1], textMisses: [1] }),
  vlm: audit({}),
});
assert.equal(mismatchedStructuralHeader[0]?.status, "proposed");

const tableDrift = build({
  pipeline: audit({ tables: [[5, 2]] }),
  vlm: audit({ tables: [[6, 2]] }),
});
assert.equal(tableDrift[0]?.kind, "table-structure-disagreement");
assert.equal(tableDrift[0]?.status, "proposed");
const sameDimensionsDifferentContent = build({
  pipeline: audit({ tables: [[5, 2]], tableHashSeed: "a" }),
  vlm: audit({ tables: [[5, 2]], tableHashSeed: "b" }),
});
assert.equal(
  sameDimensionsDifferentContent[0]?.kind,
  "table-structure-disagreement",
);

const reviewed = blocked.map((row) => ({
  ...row,
  status: "accepted" as const,
  reviewer: "human",
  decisionNote: "Reviewed against the pinned source page.",
}));
assert.equal(mergeMineruDualReviews(reviewed, blocked)[0]?.reviewer, "human");
const stale = structuredClone(blocked);
stale[0]!.evidenceFingerprintSha256 = "f".repeat(64);
assert.equal(mergeMineruDualReviews(reviewed, stale)[0]?.status, "proposed");

const invalidAutomatic = structuredClone(automatic);
invalidAutomatic[0]!.reviewer = "human";
assert.match(
  validateMineruDualReviews(automatic, invalidAutomatic).join("\n"),
  /automatic decision is invalid/u,
);
const alteredPayload = structuredClone(reviewed);
if (alteredPayload[0]?.kind === "item-recall-disagreement") {
  alteredPayload[0].items[0]!.characters += 1;
}
assert.match(
  validateMineruDualReviews(blocked, alteredPayload).join("\n"),
  /payload does not match its evidence fingerprint/u,
);
const invalidStatus = structuredClone(blocked) as unknown as Array<
  Record<string, unknown>
>;
invalidStatus[0]!.status = "accpeted";
assert.match(
  validateMineruDualReviews(
    blocked,
    invalidStatus as unknown as MineruDualReview[],
  ).join("\n"),
  /status is invalid/u,
);

console.log("PHB MinerU dual-engine portable tests passed");

function build(input: {
  page?: FullMineruPageRow;
  pipeline: MineruRecallAudit;
  vlm: MineruRecallAudit;
  layoutReviews?: FullMineruLayoutReview[];
}) {
  return buildMineruDualReviewRows({
    sourceId: "phb35-core",
    sourceArtifactSha256: "a".repeat(64),
    pipelineContentListSha256: "b".repeat(64),
    vlmBatchManifestSha256: "c".repeat(64),
    pages: [
      {
        page: input.page ?? page,
        pipelineAudit: input.pipeline,
        vlmAudit: input.vlm,
        layoutReviews: input.layoutReviews ?? [],
      },
    ],
  });
}

function audit(input: {
  bboxMisses?: number[];
  textMisses?: number[];
  tables?: Array<[number, number]>;
  tableHashSeed?: string;
}): MineruRecallAudit {
  return {
    schemaVersion: 1,
    page: {
      sourcePageIndex: 10,
      printedPageNumber: 10,
      rangeKinds: ["description"],
      textLayerSha256: "d".repeat(64),
    },
    counts: {
      pdfContentItems: 2,
      pdfContentCharacters: 14,
      mineruBlocks: 1,
      mineruContentBlocks: 1,
      strictBboxCoveredItems: 2 - (input.bboxMisses?.length ?? 0),
      strictBboxMissItems: input.bboxMisses?.length ?? 0,
      normalizedTextMatchedItems: 2 - (input.textMisses?.length ?? 0),
      normalizedTextMissItems: input.textMisses?.length ?? 0,
    },
    tokenComparison: {
      pdfTokenCount: 2,
      mineruTokenCount: 2,
      sharedTokenCount: 2,
      tokenRecall: 1,
      tokenPrecision: 1,
    },
    structure: {
      blockTypeCounts: { text: 1 },
      tables: (input.tables ?? []).map(([rows, maxColumns], blockIndex) => ({
        blockIndex,
        rows,
        maxColumns,
        htmlSha256: `${input.tableHashSeed ?? ""}${String(blockIndex)}`.padEnd(
          64,
          "0",
        ),
      })),
    },
    strictBboxMisses: (input.bboxMisses ?? []).map(miss),
    normalizedTextMisses: (input.textMisses ?? []).map(miss),
  };
}

function miss(itemIndex: number) {
  return {
    itemIndex,
    characters: 7,
    textSha256: String(itemIndex).padStart(64, "0"),
  };
}

function layoutReview(
  itemIndex: number,
  status: "proposed" | "accepted" | "rejected",
): FullMineruLayoutReview {
  return {
    schemaVersion: 1,
    rowId: `layout:${itemIndex}`,
    kind: "outside-bbox-projection",
    candidateAlgorithmVersion: "mineru-bbox-candidates-v1",
    sourceId: "phb35-core",
    sourceArtifactSha256: "a".repeat(64),
    sourcePageIndex: 10,
    printedPageNumber: 10,
    contentListSha256: "b".repeat(64),
    textLayerSha256: "d".repeat(64),
    evidenceFingerprintSha256: "e".repeat(64),
    status,
    reviewer: status === "proposed" ? null : "human",
    decisionNote: status === "proposed" ? null : "Reviewed.",
    targetBlockIndex: 0,
    pdfItem: {
      itemIndex,
      text: "Missing",
      x: 10,
      y: 10,
      width: 10,
      height: 10,
      normalizedCenter: { x: 0.1, y: 0.1 },
    },
    eligibleBlocks: [
      {
        blockIndex: 0,
        blockType: "text",
        blockBbox: [0, 0, 1, 1],
        mineruText: "Text",
        distance: { horizontal: 0, vertical: 0 },
      },
    ],
  };
}

function pdfItem(text: string, x: number) {
  return {
    text,
    x,
    y: 50,
    width: 10,
    height: 10,
    fontName: "font",
    hasEol: false,
  };
}
