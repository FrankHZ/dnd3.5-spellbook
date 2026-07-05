import crypto from "node:crypto";
import { type NextFunction, type Request, type Response } from "express";
import { ApiError } from "#server/utils/errors";

const TOKEN_HEADER = "x-spellbook-operations-token";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isExplicitlyPublic() {
  return process.env.ENABLE_DB_STATUS_PUBLIC === "true";
}

function configuredToken() {
  const value = process.env.SPELLBOOK_DB_STATUS_TOKEN;
  return value && value.length > 0 ? value : undefined;
}

function requestToken(req: Request) {
  const headerToken = req.get(TOKEN_HEADER);
  if (headerToken) return headerToken;

  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function dbStatusAccessMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!isProduction() || isExplicitlyPublic()) {
    next();
    return;
  }

  const expectedToken = configuredToken();
  const providedToken = requestToken(req);
  if (
    expectedToken &&
    providedToken &&
    timingSafeEqual(providedToken, expectedToken)
  ) {
    next();
    return;
  }

  next(new ApiError(404, "Not found", `No route for ${req.method} ${req.path}`));
}
