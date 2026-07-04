import type { CorsOptions } from "cors";
import type { NextFunction, Request, Response } from "express";

const API_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function allowedCorsOrigins() {
  return (process.env.SPELLBOOK_CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (!isProduction()) {
        callback(null, true);
        return;
      }

      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedCorsOrigins().includes(origin));
    },
  };
}

export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
  next();
}
