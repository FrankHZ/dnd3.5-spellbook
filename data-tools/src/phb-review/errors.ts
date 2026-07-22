import type { PhbReviewItemDetail, PhbReviewQueueAvailability } from "./types";

export type PhbReviewErrorCode =
  | "invalid-request"
  | "not-found"
  | "stale-decision"
  | "stale-queue"
  | "invalid-queue";

export class PhbReviewError extends Error {
  constructor(
    readonly code: PhbReviewErrorCode,
    message: string,
    readonly details:
      | { current: PhbReviewItemDetail }
      | { availability: PhbReviewQueueAvailability }
      | null = null,
  ) {
    super(message);
    this.name = "PhbReviewError";
  }
}
