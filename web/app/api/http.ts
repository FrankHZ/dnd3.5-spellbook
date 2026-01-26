export type ApiErrorPayload = { message?: string; error?: unknown };

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;

  constructor(status: number, payload?: ApiErrorPayload) {
    super(payload?.message || `Request failed (${status})`);
    this.status = status;
    this.payload = payload;
  }
}

export async function apiGet<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  console.log(`Fetching API endpoint: ${path}`);

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { method: "GET", signal });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
