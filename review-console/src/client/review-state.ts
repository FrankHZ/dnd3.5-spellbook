import type {
  PhbReviewDecisionRequest,
  PhbReviewDecisionStatus,
  PhbReviewItemDetail,
  PhbReviewListItem,
} from "data-tools/phb-review";

export type QueueFilters = {
  status: string;
  kind: string;
  category: string;
};

export const EMPTY_FILTERS: QueueFilters = {
  status: "all",
  kind: "all",
  category: "all",
};

export type ReviewDraft = {
  status: PhbReviewDecisionStatus | null;
  decisionNote: string;
  targetBlockIndex: number | null;
  anchorBlockIndex: number | null;
};

export const HUMAN_DECISION_SOURCE = "review-console:human";

export type ReviewLocation = {
  queueId: PhbReviewDecisionRequest["queueId"];
  itemId: string | null;
};

export function reviewLocationFromSearch(search: string): ReviewLocation {
  const params = new URLSearchParams(search);
  const queue = params.get("queue");
  const item = params.get("item")?.trim();
  return {
    queueId:
      queue === "english-residual" ? "english-residual" : "mineru-layout",
    itemId: item || null,
  };
}

export function reviewLocationSearch(
  search: string,
  { queueId, itemId }: ReviewLocation,
) {
  const params = new URLSearchParams(search);
  params.set("queue", queueId);
  if (itemId) params.set("item", itemId);
  else params.delete("item");
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function decisionSourceLabel(reviewer: string | null) {
  if (!reviewer) return "Pending";
  return reviewer.startsWith("data-tools:") ? "Automated" : "Human";
}

export function filterQueueItems(
  items: readonly PhbReviewListItem[],
  filters: QueueFilters,
) {
  return items.filter(
    (item) =>
      (filters.status === "all" || item.status === filters.status) &&
      (filters.kind === "all" || item.kind === filters.kind) &&
      (filters.category === "all" || item.category === filters.category),
  );
}

export function stableSelection(
  items: readonly PhbReviewListItem[],
  selectedId: string | null,
) {
  return items.some((item) => item.itemId === selectedId)
    ? selectedId
    : (items[0]?.itemId ?? null);
}

export function adjacentItemId(
  items: readonly PhbReviewListItem[],
  selectedId: string | null,
  offset: -1 | 1,
) {
  if (items.length === 0) return null;
  const current = items.findIndex((item) => item.itemId === selectedId);
  const index = current < 0 ? 0 : current;
  return items[Math.min(Math.max(index + offset, 0), items.length - 1)]!
    .itemId;
}

export function createReviewDraft(
  detail: PhbReviewItemDetail,
): ReviewDraft {
  const terminalStatus =
    detail.item.status === "proposed" ? null : detail.item.status;
  const isExistingDecision = terminalStatus !== null;
  return {
    status: terminalStatus,
    decisionNote: detail.item.decisionNote ?? "",
    targetBlockIndex:
      detail.queueId === "mineru-layout" &&
      detail.candidate.kind === "outside-bbox-projection" &&
      isExistingDecision
        ? detail.candidate.targetBlockIndex
        : null,
    anchorBlockIndex:
      detail.queueId === "mineru-layout" &&
      detail.candidate.kind === "content-order-conflict" &&
      isExistingDecision
        ? detail.candidate.anchorBlockIndex
        : null,
  };
}

export function isReviewDraftDirty(
  detail: PhbReviewItemDetail,
  draft: ReviewDraft,
) {
  const baseline = createReviewDraft(detail);
  return (
    draft.status !== baseline.status ||
    draft.decisionNote !== baseline.decisionNote ||
    draft.targetBlockIndex !== baseline.targetBlockIndex ||
    draft.anchorBlockIndex !== baseline.anchorBlockIndex
  );
}

export function missingDraftFields(
  detail: PhbReviewItemDetail,
  draft: ReviewDraft,
) {
  const missing: string[] = [];
  if (!draft.status) missing.push("decision");
  if (!draft.decisionNote.trim()) missing.push("decision note");
  if (
    detail.queueId === "mineru-layout" &&
    detail.candidate.kind === "outside-bbox-projection" &&
    !Number.isInteger(draft.targetBlockIndex)
  ) {
    missing.push("target block");
  }
  if (
    detail.queueId === "mineru-layout" &&
    detail.candidate.kind === "content-order-conflict" &&
    !Number.isInteger(draft.anchorBlockIndex)
  ) {
    missing.push("anchor block");
  }
  return missing;
}

export function decisionRequest(
  detail: PhbReviewItemDetail,
  draft: ReviewDraft,
): PhbReviewDecisionRequest | null {
  if (missingDraftFields(detail, draft).length > 0 || !draft.status) return null;
  const base = {
    queueId: detail.queueId,
    itemId: detail.item.itemId,
    reviewFingerprintSha256: detail.item.reviewFingerprintSha256,
    status: draft.status,
    reviewer: HUMAN_DECISION_SOURCE,
    decisionNote: draft.decisionNote.trim(),
  };
  if (
    detail.queueId === "mineru-layout" &&
    detail.candidate.kind === "outside-bbox-projection"
  ) {
    return {
      ...base,
      selection: { targetBlockIndex: draft.targetBlockIndex! },
    };
  }
  if (
    detail.queueId === "mineru-layout" &&
    detail.candidate.kind === "content-order-conflict"
  ) {
    return {
      ...base,
      selection: { anchorBlockIndex: draft.anchorBlockIndex! },
    };
  }
  return base;
}

export function facetValues(items: readonly PhbReviewListItem[], key: "kind" | "category") {
  return Array.from(
    new Set(
      items
        .map((item) => item[key])
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right, "en-US"));
}

export function reconcileStaleDecision(
  items: readonly PhbReviewListItem[],
  current: PhbReviewItemDetail,
  draft: ReviewDraft,
) {
  return {
    items: items.map((item) =>
      item.itemId === current.item.itemId ? current.item : item,
    ),
    detail: current,
    draft,
  };
}
