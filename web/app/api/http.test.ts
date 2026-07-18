import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiGet,
  ApiError,
  apiPost,
  getApiErrorDisplayMessage,
  getConfiguredApiBaseUrl,
  hasApiErrorCode,
} from "./http";
import { getI18nFromStorage } from "~/i18n/storage";

vi.mock("~/i18n/storage", () => ({
  getI18nFromStorage: vi.fn(),
}));

const mockedGetI18nFromStorage = vi.mocked(getI18nFromStorage);

function mockFetchResponse({
  ok = true,
  status = 200,
  body = {},
}: {
  ok?: boolean;
  status?: number;
  body?: unknown;
}) {
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

describe("api http helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockedGetI18nFromStorage.mockReturnValue({ lang: "en" });
    globalThis.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ body: { ok: true } }));
  });

  it("adds lang to relative GET requests without replacing existing query params", async () => {
    await apiGet("/api/spells/search?q=fire");

    expect(fetch).toHaveBeenCalledWith("/api/spells/search?q=fire&lang=en", {
      method: "GET",
      signal: undefined,
    });
  });

  it("preserves explicit lang params", async () => {
    mockedGetI18nFromStorage.mockReturnValue({ lang: "zh", variant: "chm" });

    await apiGet("/api/spells/search?q=fire&lang=en");

    expect(fetch).toHaveBeenCalledWith("/api/spells/search?q=fire&lang=en&variant=chm", {
      method: "GET",
      signal: undefined,
    });
  });

  it("adds zh variant only for spell endpoints", async () => {
    mockedGetI18nFromStorage.mockReturnValue({ lang: "zh", variant: "chm" });

    await apiGet("/api/spells/1");
    await apiGet("/api/meta/i18n");

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/spells/1?lang=zh&variant=chm", {
      method: "GET",
      signal: undefined,
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/meta/i18n?lang=zh", {
      method: "GET",
      signal: undefined,
    });
  });

  it("sends JSON bodies for POST requests", async () => {
    mockedGetI18nFromStorage.mockReturnValue({ lang: "zh", variant: "chm" });

    await apiPost("/api/spells/resolve", { names: ["Magic Missile"] });

    expect(fetch).toHaveBeenCalledWith("/api/spells/resolve?lang=zh&variant=chm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: ["Magic Missile"] }),
      signal: undefined,
    });
  });

  it("prepends the configured API base URL for relative API requests", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.d20spellcodex.com/");

    await apiGet("/api/spells/search?q=fire");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.d20spellcodex.com/api/spells/search?q=fire&lang=en",
      {
        method: "GET",
        signal: undefined,
      },
    );
  });

  it("normalizes the configured API base URL for display consumers", () => {
    expect(getConfiguredApiBaseUrl()).toBe("");

    vi.stubEnv("VITE_API_BASE_URL", "https://api.d20spellcodex.com/");

    expect(getConfiguredApiBaseUrl()).toBe("https://api.d20spellcodex.com");
  });

  it("throws ApiError with response payload when the API fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        ok: false,
        status: 400,
        body: { message: "Invalid request", error: "q is required" },
      }),
    );

    await expect(apiGet("/api/spells/search")).rejects.toMatchObject({
      name: "Error",
      status: 400,
      payload: { message: "Invalid request", error: "q is required" },
    } satisfies Partial<ApiError>);
  });

  it("exposes stable API error codes to feature consumers", () => {
    const error = new ApiError(503, {
      message: "Full-text search unavailable",
      code: "FULL_TEXT_SEARCH_UNAVAILABLE",
    });

    expect(hasApiErrorCode(error, "FULL_TEXT_SEARCH_UNAVAILABLE")).toBe(true);
    expect(hasApiErrorCode(error, "OTHER_ERROR")).toBe(false);
    expect(hasApiErrorCode(new Error("nope"), "FULL_TEXT_SEARCH_UNAVAILABLE"))
      .toBe(false);
  });

  it("uses localized display copy instead of unknown server messages", () => {
    const error = new ApiError(500, {
      message: "Internal server error",
      error: "database details",
    });

    expect(
      getApiErrorDisplayMessage(error, "Request failed. Please try again."),
    ).toBe("Request failed. Please try again.");
    expect(getApiErrorDisplayMessage(error, "请求失败，请重试。")).toBe(
      "请求失败，请重试。",
    );
  });

  it("allows stable error codes to keep specific localized behavior", () => {
    const error = new ApiError(503, {
      message: "Full-text search unavailable",
      code: "FULL_TEXT_SEARCH_UNAVAILABLE",
    });

    expect(
      getApiErrorDisplayMessage(error, "Request failed.", {
        FULL_TEXT_SEARCH_UNAVAILABLE: "Full-text search is unavailable.",
      }),
    ).toBe("Full-text search is unavailable.");
  });
});
