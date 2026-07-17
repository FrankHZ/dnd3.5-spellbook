import { getI18nFromStorage } from "~/i18n/storage";

export type ApiErrorPayload = {
  message?: string;
  error?: unknown;
  code?: string;
};

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(status: number, payload?: ApiErrorPayload) {
    super(payload?.message || `Request failed (${status})`);
    this.status = status;
    this.payload = payload;
  }
}

export function hasApiErrorCode(error: unknown, code: string) {
  return error instanceof ApiError && error.payload?.code === code;
}

function shouldSendVariant(pathname: string) {
  // v2 rule: variant only for spell endpoints
  return pathname.startsWith("/api/spells");
}

export function getConfiguredApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
}

function withApiBaseUrl(relativeUrl: string) {
  const baseUrl = getConfiguredApiBaseUrl();
  if (!baseUrl || !relativeUrl.startsWith("/")) return relativeUrl;
  return `${baseUrl}${relativeUrl}`;
}

function withI18nParams(urlStr: string): string {
  const base =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(urlStr, base);

  const { lang, variant } = getI18nFromStorage();

  if (!url.searchParams.has("lang")) url.searchParams.set("lang", lang);

  if (lang === "zh" && variant && shouldSendVariant(url.pathname)) {
    if (!url.searchParams.has("variant"))
      url.searchParams.set("variant", variant);
  }

  // return relative if input was relative
  if (urlStr.startsWith("/")) {
    return withApiBaseUrl(url.pathname + (url.search ? url.search : ""));
  }
  return url.toString();
}

export async function apiGet<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const url = withI18nParams(path);

  const res = await fetch(url, { method: "GET", signal });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export async function apiPost<ResponseT, BodyT>(
  path: string,
  body: BodyT,
  signal?: AbortSignal,
): Promise<ResponseT> {
  const url = withI18nParams(path);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new ApiError(res.status, data);
  return data as ResponseT;
}
