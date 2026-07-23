import { describe, expect, it } from "vitest";
import type {
  MineruLayoutReviewDetail,
  PhbReviewListItem,
} from "data-tools/phb-review";

import {
  adjacentItemId,
  createReviewDraft,
  decisionSourceLabel,
  decisionRequest,
  filterQueueItems,
  isReviewDraftDirty,
  missingDraftFields,
  reconcileStaleDecision,
  reviewLocationFromSearch,
  reviewLocationSearch,
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

  it("round-trips a stable queue and item location through the URL", () => {
    expect(
      reviewLocationFromSearch(
        "?queue=english-residual&item=spell%3Aanimal-growth",
      ),
    ).toEqual({
      queueId: "english-residual",
      itemId: "spell:animal-growth",
    });
    expect(
      reviewLocationSearch("?debug=1", {
        queueId: "mineru-layout",
        itemId: "layout:57",
      }),
    ).toBe("?debug=1&queue=mineru-layout&item=layout%3A57");
  });

  it("falls back to the layout queue for invalid URL state", () => {
    expect(reviewLocationFromSearch("?queue=unknown&item=%20")).toEqual({
      queueId: "mineru-layout",
      itemId: null,
    });
  });

  it("requires an explicit decision, note, and eligible target", () => {
    const current = detail();
    const draft = createReviewDraft(current);
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
      reviewer: "review-console:human",
      selection: { targetBlockIndex: 4 },
    });
  });

  it("reduces reviewer metadata to human or automated provenance", () => {
    expect(decisionSourceLabel(null)).toBe("Pending");
    expect(decisionSourceLabel("data-tools:auto")).toBe("Automated");
    expect(decisionSourceLabel("data-tools:srd-adjudication")).toBe("Automated");
    expect(decisionSourceLabel("review-console:human")).toBe("Human");
    expect(decisionSourceLabel("legacy-reviewer-id")).toBe("Human");
  });

  it("does not silently preselect a target for a proposed row", () => {
    expect(createReviewDraft(detail()).targetBlockIndex).toBeNull();
  });

  it("detects decision, note, and target changes as an unsaved draft", () => {
    const current = detail();
    const draft = createReviewDraft(current);
    expect(isReviewDraftDirty(current, draft)).toBe(false);
    expect(
      isReviewDraftDirty(current, {
        ...draft,
        decisionNote: "Unsaved evidence note.",
      }),
    ).toBe(true);
    expect(
      isReviewDraftDirty(current, {
        ...draft,
        status: "accepted",
        targetBlockIndex: 4,
      }),
    ).toBe(true);
  });

  it("loads current stale evidence without discarding draft fields", () => {
    const original = detail();
    const draft = {
      ...createReviewDraft(original),
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
