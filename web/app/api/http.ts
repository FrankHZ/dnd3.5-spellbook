import { getI18nFromStorage } from "~/i18n/i18n-storage";

export type ApiErrorPayload = { message?: string; error?: unknown };

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(status: number, payload?: ApiErrorPayload) {
    super(payload?.message || `Request failed (${status})`);
    this.status = status;
    this.payload = payload;
  }
}

function shouldSendVariant(pathname: string) {
  // v2 rule: variant only for spell endpoints
  return pathname.startsWith("/api/spells");
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
  if (urlStr.startsWith("/"))
    return url.pathname + (url.search ? url.search : "");
  return url.toString();
}

export async function apiGet<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const url = withI18nParams(path);

  console.log(`Fetching API endpoint: GET ${url}`);

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

  console.log(`Fetching API endpoint: POST ${url}`);
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
