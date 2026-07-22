import type { IncomingMessage } from "node:http";
import crypto from "node:crypto";

export type SecurityFailure = {
  status: 401 | 403;
  code: "invalid-host" | "invalid-origin" | "invalid-token";
  message: string;
};

export function createReviewToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function validateApiSecurity(
  request: IncomingMessage,
  token: string,
): SecurityFailure | null {
  const host = parseLoopbackHost(headerValue(request, "host"));
  if (!host) {
    return {
      status: 403,
      code: "invalid-host",
      message: "Requests must use the loopback review-console host.",
    };
  }

  if (!tokensMatch(headerValue(request, "x-phb-review-token"), token)) {
    return {
      status: 401,
      code: "invalid-token",
      message: "A valid PHB review token is required.",
    };
  }

  if (isMutatingMethod(request.method)) {
    const origin = parseLoopbackOrigin(headerValue(request, "origin"));
    if (!origin || origin.host !== host) {
      return {
        status: 403,
        code: "invalid-origin",
        message: "Mutating requests must be same-origin.",
      };
    }
  }

  return null;
}

function headerValue(request: IncomingMessage, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? null : (value ?? null);
}

function parseLoopbackHost(value: string | null) {
  if (!value || value.includes(",")) return null;
  try {
    const url = new URL(`http://${value}`);
    if (
      url.protocol !== "http:" ||
      url.hostname !== "127.0.0.1" ||
      url.username ||
      url.password ||
      !isValidPort(url.port)
    ) {
      return null;
    }
    return url.host;
  } catch {
    return null;
  }
}

function parseLoopbackOrigin(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "http:" ||
      url.hostname !== "127.0.0.1" ||
      url.username ||
      url.password ||
      !isValidPort(url.port) ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function isValidPort(port: string) {
  if (!port) return true;
  const numericPort = Number(port);
  return (
    Number.isInteger(numericPort) && numericPort >= 1 && numericPort <= 65535
  );
}

function isMutatingMethod(method: string | undefined) {
  return !["GET", "HEAD", "OPTIONS"].includes(method ?? "GET");
}

function tokensMatch(observed: string | null, expected: string) {
  if (!observed || observed.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(observed), Buffer.from(expected));
}
