import { type Request, type Response, type NextFunction } from "express";
import { ApiError } from "#server/utils/errors";
import { logger } from "#server/logger";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error({
    err,
    method: _req.method,
    path: _req.originalUrl,
  });

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      message: err.message,
      error: err.details ?? err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  const verboseFallback = process.env.NODE_ENV !== "production";
  const fallbackError = verboseFallback
    ? err instanceof Error
      ? err.message
      : "Unknown error"
    : "Internal server error";

  res.status(500).json({
    message: "Internal server error",
    error: fallbackError,
  });
  return;
}
