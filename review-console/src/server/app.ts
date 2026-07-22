import type { IncomingMessage, ServerResponse } from "node:http";

import {
  PhbReviewError,
  type PhbReviewDecisionRequest,
  type PhbReviewService,
} from "data-tools/phb-review";

import { validateApiSecurity } from "./security.js";

export type ReviewConsoleApiOptions = {
  service: PhbReviewService;
  token: string;
};

export function createReviewConsoleApi(options: ReviewConsoleApiOptions) {
  return async function handleReviewConsoleApi(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (!url.pathname.startsWith("/api/")) return false;

    const securityFailure = validateApiSecurity(request, options.token);
    if (securityFailure) {
      sendJson(response, securityFailure.status, { error: securityFailure });
      return true;
    }

    try {
      if (request.method === "GET" && url.pathname === "/api/queues") {
        sendJson(response, 200, { queues: options.service.listQueues() });
        return true;
      }

      const queueMatch = /^\/api\/queues\/([^/]+)$/u.exec(url.pathname);
      if (request.method === "GET" && queueMatch) {
        sendJson(
          response,
          200,
          options.service.getQueue(
            decodeSegment(
              queueMatch[1]!,
            ) as PhbReviewDecisionRequest["queueId"],
          ),
        );
        return true;
      }

      const itemMatch = /^\/api\/queues\/([^/]+)\/items\/([^/]+)$/u.exec(
        url.pathname,
      );
      if (request.method === "GET" && itemMatch) {
        sendJson(
          response,
          200,
          options.service.getItem(
            decodeSegment(itemMatch[1]!) as PhbReviewDecisionRequest["queueId"],
            decodeSegment(itemMatch[2]!),
          ),
        );
        return true;
      }

      const pdfMatch = /^\/api\/sources\/([^/]+)\/pdf$/u.exec(url.pathname);
      if ((request.method === "GET" || request.method === "HEAD") && pdfMatch) {
        await sendSourcePdf(
          response,
          options.service,
          decodeSegment(pdfMatch[1]!),
          request,
        );
        return true;
      }

      if (request.method === "POST" && url.pathname === "/api/decisions") {
        const body = await readJsonBody(request);
        const result = await options.service.submitDecision(
          body as PhbReviewDecisionRequest,
        );
        sendJson(response, 200, result);
        return true;
      }

      sendJson(response, 404, {
        error: { code: "not-found", message: "API route not found." },
      });
      return true;
    } catch (error) {
      sendServiceError(response, error);
      return true;
    }
  };
}

async function sendSourcePdf(
  response: ServerResponse,
  service: PhbReviewService,
  sourceId: string,
  request: IncomingMessage,
) {
  const source = service.getSourcePdf(sourceId);
  const size = source.bytes;

  const range = parseRange(request.headers.range, size);
  if (range === "invalid") {
    response.writeHead(416, {
      "Content-Range": `bytes */${size}`,
      "Accept-Ranges": "bytes",
    });
    response.end();
    return;
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? size - 1;
  const length = end - start + 1;
  response.writeHead(range ? 206 : 200, {
    "Accept-Ranges": "bytes",
    "Content-Type": source.mediaType,
    "Content-Length": String(length),
    "Content-Disposition": "inline; filename=phb-source.pdf",
    ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  const stream = source.createReadStream({ start, end });
  stream.on("error", () => {
    if (!response.headersSent) {
      sendJson(response, 500, {
        error: {
          code: "source-unavailable",
          message: "PHB source PDF is unavailable.",
        },
      });
    } else {
      response.destroy();
    }
  });
  stream.pipe(response);
}

function parseRange(value: string | undefined, size: number) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/u.exec(value);
  if (!match || size <= 0) return "invalid" as const;
  const startValue = match[1]!;
  const endValue = match[2]!;
  if (!startValue && !endValue) return "invalid" as const;
  if (!startValue) {
    const suffixLength = Number(endValue);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0)
      return "invalid" as const;
    return { start: Math.max(size - suffixLength, 0), end: size - 1 };
  }
  const start = Number(startValue);
  const requestedEnd = endValue ? Number(endValue) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= size
  ) {
    return "invalid" as const;
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += value.length;
    if (bytes > 1_000_000) {
      throw new PhbReviewError(
        "invalid-request",
        "Decision request is too large.",
      );
    }
    chunks.push(value);
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new PhbReviewError(
        "invalid-request",
        "Decision request must be a JSON object.",
      );
    }
    return parsed;
  } catch (error) {
    if (error instanceof PhbReviewError) throw error;
    throw new PhbReviewError(
      "invalid-request",
      "Decision request must be valid JSON.",
    );
  }
}

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new PhbReviewError("invalid-request", "Request path is invalid.");
  }
}

function sendServiceError(response: ServerResponse, error: unknown) {
  if (error instanceof PhbReviewError) {
    const status =
      error.code === "not-found"
        ? 404
        : error.code === "stale-decision" || error.code === "stale-queue"
          ? 409
          : 400;
    const details = error.details ? { details: error.details } : {};
    sendJson(response, status, {
      error: { code: error.code, message: error.message, ...details },
    });
    return;
  }
  sendJson(response, 500, {
    error: {
      code: "internal-error",
      message: "Review console request failed.",
    },
  });
}

function sendJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}
