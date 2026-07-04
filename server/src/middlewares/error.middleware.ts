import { type Request, type Response, type NextFunction } from "express";
import { ApiError } from "../utils/errors";
import { logger } from "../logger";

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
