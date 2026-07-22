import { describe, expect, it } from "vitest";
import type {
  MineruLayoutReviewDetail,
  PhbReviewListItem,
} from "data-tools/phb-review";

import {
  adjacentItemId,
  createReviewDraft,
  decisionRequest,
  filterQueueItems,
  missingDraftFields,
  reconcileStaleDecision,
  stableSelection,
} from "./review-state";

const fingerprint = "a".repeat(64);

function item(
  itemId: string,
  status: PhbReviewListItem["status"],
  kind = "outside-bbox-projection",
): PhbReviewListItem {
  return {
    queueId: "mineru-layout",
    itemId,
    label: itemId,
    status,
    kind,
    category: null,
    sourceId: "phb35-core",
    sourcePageIndex: 1,
    printedPageNumber: 2,
    evidenceFingerprintSha256: fingerprint,
    reviewFingerprintSha256: fingerprint,
    reviewer: null,
    decisionNote: null,
    allowedActions: ["accepted", "rejected"],
  };
}

const items = [
  item("one", "proposed"),
  item("two", "accepted", "content-order-conflict"),
  item("three", "rejected"),
];

function detail(): MineruLayoutReviewDetail {
  return {
    queueId: "mineru-layout",
    item: items[0]!,
    candidate: {
      schemaVersion: 1,
      rowId: "one",
      sourceId: "phb35-core",
      sourceArtifactSha256: fingerprint,
      sourcePageIndex: 1,
      printedPageNumber: 2,
      contentListSha256: fingerprint,
      textLayerSha256: fingerprint,
      evidenceFingerprintSha256: fingerprint,
      status: "proposed",
      reviewer: null,
      decisionNote: null,
      kind: "outside-bbox-projection",
      candidateAlgorithmVersion: "mineru-bbox-candidates-v1",
      targetBlockIndex: 4,
      pdfItem: {
        itemIndex: 1,
        text: "Candidate",
        x: 1,
        y: 1,
        width: 1,
        height: 1,
        normalizedCenter: { x: 10, y: 10 },
      },
      eligibleBlocks: [
        {
          blockIndex: 4,
          blockType: "text",
          blockBbox: [0, 0, 10, 10],
          mineruText: "Block",
          distance: { horizontal: 0, vertical: 2 },
        },
      ],
    },
    page: {
      sourceId: "phb35-core",
      sourcePageIndex: 1,
      printedPageNumber: 2,
      width: 100,
      height: 100,
      mineruBlocks: [],
      pdfItems: [],
    },
  };
}

describe("review console client state", () => {
  it("filters queue facets without changing source order", () => {
    expect(
      filterQueueItems(items, {
        status: "accepted",
        kind: "all",
        category: "all",
      }).map((row) => row.itemId),
    ).toEqual(["two"]);
  });

  it("keeps stable selection and clamps previous/next navigation", () => {
    expect(stableSelection(items, "two")).toBe("two");
    expect(stableSelection(items, "missing")).toBe("one");
    expect(adjacentItemId(items, "one", -1)).toBe("one");
    expect(adjacentItemId(items, "two", 1)).toBe("three");
    expect(adjacentItemId(items, "three", 1)).toBe("three");
  });

  it("requires an explicit decision, reviewer, note, and eligible target", () => {
    const current = detail();
    const draft = createReviewDraft(current, "reviewer-id");
    expect(missingDraftFields(current, draft)).toEqual([
      "decision",
      "decision note",
      "target block",
    ]);
    expect(decisionRequest(current, draft)).toBeNull();

    const complete = {
      ...draft,
      status: "accepted" as const,
      decisionNote: "The PDF item belongs to block 4.",
      targetBlockIndex: 4,
    };
    expect(decisionRequest(current, complete)).toMatchObject({
      status: "accepted",
      reviewer: "reviewer-id",
      selection: { targetBlockIndex: 4 },
    });
  });

  it("does not silently preselect a target for a proposed row", () => {
    expect(createReviewDraft(detail()).targetBlockIndex).toBeNull();
  });

  it("loads current stale evidence without discarding draft fields", () => {
    const original = detail();
    const draft = {
      ...createReviewDraft(original, "reviewer-id"),
      status: "accepted" as const,
      decisionNote: "Keep this unsaved note.",
      targetBlockIndex: 4,
    };
    const current = {
      ...original,
      item: {
        ...original.item,
        reviewFingerprintSha256: "b".repeat(64),
      },
    };
    const reconciled = reconcileStaleDecision(items, current, draft);
    expect(reconciled.detail.item.reviewFingerprintSha256).toBe("b".repeat(64));
    expect(reconciled.items[0]!.reviewFingerprintSha256).toBe("b".repeat(64));
    expect(reconciled.draft).toBe(draft);
  });
});
