import type { ReadStream } from "node:fs";

import type { FullDbComparisonRow } from "../phb/full-comparison";
import type {
  FullDetachedTableEvidence,
  FullMineruTableEvidence,
  FullSpellEntity,
} from "../phb/full-extraction";
import type { FullListOccurrence } from "../phb/full-lists";
import type {
  FullMineruBlock,
  FullMineruLayoutReview,
  FullMineruPageRow,
} from "../phb/full-mineru";
import type { FullRowReview } from "../phb/full-row-review";
import type { SrdAdjudicationRow } from "../phb/srd-adjudication";

export const PHB_REVIEW_QUEUE_IDS = [
  "mineru-layout",
  "english-residual",
] as const;

export type PhbReviewQueueId = (typeof PHB_REVIEW_QUEUE_IDS)[number];
export type PhbReviewStatus = "proposed" | "accepted" | "rejected";
export type PhbReviewDecisionStatus = Exclude<PhbReviewStatus, "proposed">;
export type PhbCanonicalRerunRequired =
  { from: "phb:source:extract" } | { from: "phb:source:compare" } | null;

export type PhbReviewQueueAvailability =
  | { available: true }
  | {
      available: false;
      code: "stale-queue" | "missing-artifact" | "invalid-artifact";
      message: string;
      requiredRerunFrom: "phb:source:extract" | null;
    };

export type PhbReviewQueueSummary = {
  queueId: PhbReviewQueueId;
  availability: PhbReviewQueueAvailability;
  canonicalRerunRequired: PhbCanonicalRerunRequired;
  total: number;
  countsByStatus: Record<PhbReviewStatus, number>;
  facets: Record<string, Record<string, number>>;
};

export type PhbReviewListItem = {
  queueId: PhbReviewQueueId;
  itemId: string;
  label: string;
  status: PhbReviewStatus;
  kind: string;
  category: string | null;
  sourceId: string;
  sourcePageIndex: number | null;
  printedPageNumber: number | null;
  evidenceFingerprintSha256: string;
  reviewFingerprintSha256: string;
  reviewer: string | null;
  decisionNote: string | null;
  allowedActions: PhbReviewDecisionStatus[];
};

export type PhbReviewQueue = {
  summary: PhbReviewQueueSummary;
  items: PhbReviewListItem[];
};

export type PhbReviewPageEvidence = {
  sourceId: string;
  sourcePageIndex: number;
  printedPageNumber: number | null;
  width: number;
  height: number;
  mineruBlocks: FullMineruBlock[];
  pdfItems: FullMineruPageRow["pdfjs"]["items"];
};

export type MineruLayoutReviewDetail = {
  queueId: "mineru-layout";
  item: PhbReviewListItem;
  candidate: FullMineruLayoutReview;
  page: PhbReviewPageEvidence;
};

export type EnglishResidualReviewDetail = {
  queueId: "english-residual";
  item: PhbReviewListItem;
  comparison: FullDbComparisonRow;
  rowReview: FullRowReview;
  adjudication: SrdAdjudicationRow;
  evidence: {
    spellEntities: FullSpellEntity[];
    listOccurrences: FullListOccurrence[];
    errataOverlays: Array<Record<string, unknown>>;
    detachedTables: FullDetachedTableEvidence[];
    mineruTables: FullMineruTableEvidence[];
  };
};

export type PhbReviewItemDetail =
  MineruLayoutReviewDetail | EnglishResidualReviewDetail;

export type PhbReviewDecisionRequest = {
  queueId: PhbReviewQueueId;
  itemId: string;
  reviewFingerprintSha256: string;
  status: PhbReviewDecisionStatus;
  reviewer: string;
  decisionNote: string;
  selection?: {
    targetBlockIndex?: number;
    anchorBlockIndex?: number;
  };
};

export type PhbReviewDecisionResult = {
  item: PhbReviewListItem;
  changed: boolean;
  canonicalRerunRequired: PhbCanonicalRerunRequired;
};

export type PhbReviewSourcePdf = {
  sourceId: string;
  bytes: number;
  sha256: string;
  mediaType: "application/pdf";
  createReadStream(range?: { start: number; end: number }): ReadStream;
};

export interface PhbReviewService {
  listQueues(): PhbReviewQueueSummary[];
  getQueue(queueId: PhbReviewQueueId): PhbReviewQueue;
  getItem(queueId: PhbReviewQueueId, itemId: string): PhbReviewItemDetail;
  getSourcePdf(sourceId: string): PhbReviewSourcePdf;
  submitDecision(
    request: PhbReviewDecisionRequest,
  ): Promise<PhbReviewDecisionResult>;
}
