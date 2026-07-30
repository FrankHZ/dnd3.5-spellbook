import crypto from "node:crypto";

import {
  isKnownPageFurniture,
  isContentBlock,
  normalizedItemCenter,
  pointInside,
  type FullMineruLayoutReview,
  type FullMineruPageRow,
} from "./full-mineru";
import {
  normalizeRecallText,
  type MineruRecallAudit,
  type MineruStructureSummary,
} from "./mineru-recall";
import { blockText, type StableMineruBlock } from "./pilot-extraction";

export const PHB_MINERU_DUAL_REVIEW_RELATIVE_PATH =
  "phb35/review/full-mineru-dual-engine-review.jsonl";
export const PHB_MINERU_DUAL_REVIEW_MANIFEST_RELATIVE_PATH =
  "phb35/review/full-mineru-dual-engine-review-manifest.json";
export const MINERU_DUAL_REVIEWER = "data-tools:auto";
export const MINERU_DUAL_AUTOMATIC_NOTE =
  "Pipeline/PDF.js authority is unchanged; every item is strict-bbox projected, matched inside a structural MinerU block, or covered by current accepted layout evidence.";

type ReviewStatus = "proposed" | "accepted" | "rejected";

type MineruDualReviewBase = {
  schemaVersion: 1;
  rowId: string;
  sourceId: string;
  sourceArtifactSha256: string;
  sourcePageIndex: number;
  printedPageNumber: number | null;
  pipelineContentListSha256: string;
  vlmBatchManifestSha256: string;
  textLayerSha256: string;
  evidenceFingerprintSha256: string;
  status: ReviewStatus;
  reviewer: string | null;
  decisionNote: string | null;
};

export type MineruDualItemState = {
  itemIndex: number;
  characters: number;
  textSha256: string;
  pipeline: {
    strictBboxCovered: boolean;
    structuralBboxCovered: boolean;
    structuralTextMatched: boolean;
    normalizedTextMatched: boolean;
  };
  vlm: {
    strictBboxCovered: boolean;
    normalizedTextMatched: boolean;
  };
  layoutEvidence: {
    rowId: string;
    kind: "outside-bbox-projection" | "image-adjacent-exclusion";
    evidenceFingerprintSha256: string;
    status: ReviewStatus;
  } | null;
};

export type MineruDualItemReview = MineruDualReviewBase & {
  kind: "item-recall-disagreement";
  candidateAlgorithmVersion: "mineru-dual-item-recall-v1";
  items: MineruDualItemState[];
};

export type MineruDualTableReview = MineruDualReviewBase & {
  kind: "table-structure-disagreement";
  candidateAlgorithmVersion: "mineru-dual-table-structure-v2";
  pipelineTables: MineruStructureSummary["tables"];
  vlmTables: MineruStructureSummary["tables"];
};

export type MineruDualReview = MineruDualItemReview | MineruDualTableReview;

export function buildMineruDualReviewRows(input: {
  sourceId: string;
  sourceArtifactSha256: string;
  pipelineContentListSha256: string;
  vlmBatchManifestSha256: string;
  pages: Array<{
    page: FullMineruPageRow;
    pipelineAudit: MineruRecallAudit;
    vlmAudit: MineruRecallAudit;
    layoutReviews: FullMineruLayoutReview[];
  }>;
}) {
  return input.pages.flatMap((pageInput) =>
    buildPageReviewRows({
      ...input,
      ...pageInput,
    }),
  );
}

export function mergeMineruDualReviews(
  existing: MineruDualReview[],
  candidates: MineruDualReview[],
) {
  const existingById = new Map(existing.map((row) => [row.rowId, row]));
  return candidates.map((candidate) => {
    if (isAutomaticItemReview(candidate)) return candidate;
    const previous = existingById.get(candidate.rowId);
    if (
      !previous ||
      previous.kind !== candidate.kind ||
      previous.evidenceFingerprintSha256 !== candidate.evidenceFingerprintSha256
    ) {
      return candidate;
    }
    return {
      ...candidate,
      status: previous.status,
      reviewer: previous.reviewer,
      decisionNote: previous.decisionNote,
    } satisfies MineruDualReview;
  });
}

export function validateMineruDualReviews(
  candidates: MineruDualReview[],
  reviews: MineruDualReview[],
  options: { requireTerminal?: boolean } = {},
) {
  const errors: string[] = [];
  const expectedById = new Map(candidates.map((row) => [row.rowId, row]));
  const seen = new Set<string>();
  for (const [index, review] of reviews.entries()) {
    const prefix = `dualReviews[${index}]`;
    if (seen.has(review.rowId)) {
      errors.push(`${prefix}.rowId is duplicated`);
      continue;
    }
    seen.add(review.rowId);
    const expected = expectedById.get(review.rowId);
    if (!expected || expected.kind !== review.kind) {
      errors.push(`${prefix}.rowId is not a current dual-engine candidate`);
      continue;
    }
    if (
      review.evidenceFingerprintSha256 !== expected.evidenceFingerprintSha256
    ) {
      errors.push(`${prefix}.evidenceFingerprintSha256 is stale`);
    }
    if (
      review.evidenceFingerprintSha256 !== reviewEvidenceFingerprint(review)
    ) {
      errors.push(`${prefix} payload does not match its evidence fingerprint`);
    }
    if (!new Set(["proposed", "accepted", "rejected"]).has(review.status)) {
      errors.push(`${prefix}.status is invalid`);
    }
    if (
      review.status !== "proposed" &&
      (!isNonEmptyString(review.reviewer) ||
        !isNonEmptyString(review.decisionNote))
    ) {
      errors.push(`${prefix} terminal decision requires reviewer and note`);
    }
    if (isAutomaticItemReview(expected)) {
      if (
        review.status !== "accepted" ||
        review.reviewer !== MINERU_DUAL_REVIEWER ||
        review.decisionNote !== MINERU_DUAL_AUTOMATIC_NOTE
      ) {
        errors.push(`${prefix} automatic decision is invalid`);
      }
    }
    if (options.requireTerminal && review.status === "proposed") {
      errors.push(`${prefix} is still proposed`);
    }
  }
  for (const rowId of expectedById.keys()) {
    if (!seen.has(rowId)) errors.push(`dual review is missing ${rowId}`);
  }
  return errors;
}

function buildPageReviewRows(input: {
  sourceId: string;
  sourceArtifactSha256: string;
  pipelineContentListSha256: string;
  vlmBatchManifestSha256: string;
  page: FullMineruPageRow;
  pipelineAudit: MineruRecallAudit;
  vlmAudit: MineruRecallAudit;
  layoutReviews: FullMineruLayoutReview[];
}) {
  const rows: MineruDualReview[] = [];
  const common = {
    schemaVersion: 1 as const,
    sourceId: input.sourceId,
    sourceArtifactSha256: input.sourceArtifactSha256,
    sourcePageIndex: input.page.sourcePageIndex,
    printedPageNumber: input.page.printedPageNumber,
    pipelineContentListSha256: input.pipelineContentListSha256,
    vlmBatchManifestSha256: input.vlmBatchManifestSha256,
    textLayerSha256: input.page.pdfjs.textLayerSha256,
  };
  const items = buildItemStates(input);
  if (items.length > 0) {
    const evidence = {
      ...common,
      kind: "item-recall-disagreement" as const,
      candidateAlgorithmVersion: "mineru-dual-item-recall-v1" as const,
      items,
    };
    const automatic = items.every((item) =>
      item.layoutEvidence !== null
        ? item.layoutEvidence.status === "accepted"
        : item.pipeline.strictBboxCovered ||
          (item.pipeline.structuralBboxCovered &&
            item.pipeline.structuralTextMatched),
    );
    rows.push({
      ...evidence,
      rowId: `${input.sourceId}:${input.page.sourcePageIndex}:item-recall`,
      evidenceFingerprintSha256: hashJson(evidence),
      status: automatic ? "accepted" : "proposed",
      reviewer: automatic ? MINERU_DUAL_REVIEWER : null,
      decisionNote: automatic ? MINERU_DUAL_AUTOMATIC_NOTE : null,
    });
  }

  if (
    tableEvidenceSignature(input.pipelineAudit.structure.tables) !==
    tableEvidenceSignature(input.vlmAudit.structure.tables)
  ) {
    const evidence = {
      ...common,
      kind: "table-structure-disagreement" as const,
      candidateAlgorithmVersion: "mineru-dual-table-structure-v2" as const,
      pipelineTables: input.pipelineAudit.structure.tables,
      vlmTables: input.vlmAudit.structure.tables,
    };
    rows.push({
      ...evidence,
      rowId: `${input.sourceId}:${input.page.sourcePageIndex}:table-structure`,
      evidenceFingerprintSha256: hashJson(evidence),
      status: "proposed",
      reviewer: null,
      decisionNote: null,
    });
  }
  return rows;
}

function buildItemStates(input: {
  page: FullMineruPageRow;
  pipelineAudit: MineruRecallAudit;
  vlmAudit: MineruRecallAudit;
  layoutReviews: FullMineruLayoutReview[];
}) {
  const pipelineBboxMisses = missIndexes(input.pipelineAudit.strictBboxMisses);
  const pipelineTextMisses = missIndexes(
    input.pipelineAudit.normalizedTextMisses,
  );
  const vlmBboxMisses = missIndexes(input.vlmAudit.strictBboxMisses);
  const vlmTextMisses = missIndexes(input.vlmAudit.normalizedTextMisses);
  const layoutByItem = new Map(
    input.layoutReviews.flatMap((review) =>
      review.kind === "outside-bbox-projection" ||
      review.kind === "image-adjacent-exclusion"
        ? [[review.pdfItem.itemIndex, review] as const]
        : [],
    ),
  );
  const structuralBlocks = input.page.mineru.blocks.flatMap((block) =>
    !isContentBlock(block) && block.type !== "image" && block.bbox !== null
      ? [{ ...block, bbox: block.bbox }]
      : [],
  );
  return input.page.pdfjs.items.flatMap((item, itemIndex) => {
    if (
      item.text.trim().length === 0 ||
      isKnownPageFurniture(
        {
          printedPageNumber: input.page.printedPageNumber,
          rangeKinds: input.page.rangeKinds,
        },
        item.text,
      )
    ) {
      return [];
    }
    const point = normalizedItemCenter(input.page, item);
    const containingStructuralBlocks = structuralBlocks.filter((block) =>
      pointInside(point, block.bbox, 0),
    );
    const normalizedItemText = normalizeRecallText(item.text);
    const state = {
      itemIndex,
      characters: item.text.length,
      textSha256: sha256(item.text),
      pipeline: {
        strictBboxCovered: !pipelineBboxMisses.has(itemIndex),
        structuralBboxCovered: containingStructuralBlocks.length > 0,
        structuralTextMatched:
          normalizedItemText.length > 0 &&
          containingStructuralBlocks.some((block) =>
            normalizeRecallText(blockText(block as StableMineruBlock)).includes(
              normalizedItemText,
            ),
          ),
        normalizedTextMatched: !pipelineTextMisses.has(itemIndex),
      },
      vlm: {
        strictBboxCovered: !vlmBboxMisses.has(itemIndex),
        normalizedTextMatched: !vlmTextMisses.has(itemIndex),
      },
      layoutEvidence: layoutEvidence(layoutByItem.get(itemIndex)),
    } satisfies MineruDualItemState;
    return state.pipeline.strictBboxCovered &&
      state.pipeline.normalizedTextMatched &&
      state.pipeline.strictBboxCovered === state.vlm.strictBboxCovered &&
      state.pipeline.normalizedTextMatched === state.vlm.normalizedTextMatched
      ? []
      : [state];
  });
}

function layoutEvidence(review: FullMineruLayoutReview | undefined) {
  if (
    !review ||
    (review.kind !== "outside-bbox-projection" &&
      review.kind !== "image-adjacent-exclusion")
  ) {
    return null;
  }
  return {
    rowId: review.rowId,
    kind: review.kind,
    evidenceFingerprintSha256: review.evidenceFingerprintSha256,
    status: review.status,
  };
}

function missIndexes(rows: Array<{ itemIndex: number }>) {
  return new Set(rows.map((row) => row.itemIndex));
}

function tableEvidenceSignature(tables: MineruStructureSummary["tables"]) {
  return JSON.stringify(tables);
}

function isAutomaticItemReview(
  row: MineruDualReview,
): row is MineruDualItemReview {
  return (
    row.kind === "item-recall-disagreement" &&
    row.status === "accepted" &&
    row.reviewer === MINERU_DUAL_REVIEWER &&
    row.decisionNote === MINERU_DUAL_AUTOMATIC_NOTE
  );
}

function hashJson(value: unknown) {
  return sha256(JSON.stringify(value));
}

function reviewEvidenceFingerprint(row: MineruDualReview) {
  const evidence: Record<string, unknown> = { ...row };
  delete evidence.rowId;
  delete evidence.evidenceFingerprintSha256;
  delete evidence.status;
  delete evidence.reviewer;
  delete evidence.decisionNote;
  return hashJson(evidence);
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
