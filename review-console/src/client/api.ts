import type {
  PhbReviewDecisionRequest,
  PhbReviewDecisionResult,
  PhbReviewItemDetail,
  PhbReviewQueue,
  PhbReviewQueueId,
  PhbReviewQueueSummary,
} from "data-tools/phb-review";

export class ReviewApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown,
  ) {
    super(message);
    this.name = "ReviewApiError";
  }
}

export function readReviewToken() {
  const token = document
    .querySelector<HTMLMetaElement>('meta[name="phb-review-token"]')
    ?.content.trim();
  if (!token) throw new Error("The local review session token is missing.");
  return token;
}

export function createReviewApi(token: string) {
  const request = async <T>(path: string, init: RequestInit = {}) => {
    const response = await fetch(path, {
      ...init,
      headers: {
        "x-phb-review-token": token,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      cache: "no-store",
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      const error = apiErrorBody(body);
      throw new ReviewApiError(
        response.status,
        error?.code ?? "request-failed",
        error?.message ?? `Review API request failed (${response.status}).`,
        error?.details,
      );
    }
    return body as T;
  };

  return {
    token,
    listQueues: async () =>
      (
        await request<{ queues: PhbReviewQueueSummary[] }>("/api/queues")
      ).queues,
    getQueue: (queueId: PhbReviewQueueId) =>
      request<PhbReviewQueue>(`/api/queues/${encodeURIComponent(queueId)}`),
    getItem: (queueId: PhbReviewQueueId, itemId: string) =>
      request<PhbReviewItemDetail>(
        `/api/queues/${encodeURIComponent(queueId)}/items/${encodeURIComponent(itemId)}`,
      ),
    submitDecision: (decision: PhbReviewDecisionRequest) =>
      request<PhbReviewDecisionResult>("/api/decisions", {
        method: "POST",
        body: JSON.stringify(decision),
      }),
    pdfUrl: (sourceId: string) =>
      `/api/sources/${encodeURIComponent(sourceId)}/pdf`,
  };
}

export type ReviewApi = ReturnType<typeof createReviewApi>;

function apiErrorBody(body: unknown) {
  if (!body || typeof body !== "object" || !("error" in body)) return undefined;
  const error = body.error;
  if (!error || typeof error !== "object") return undefined;
  return error as { code?: string; message?: string; details?: unknown };
}
