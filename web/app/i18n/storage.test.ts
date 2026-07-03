import { afterEach, describe, expect, it, vi } from "vitest";

import { getI18nFromStorage } from "./storage";
import { DEFAULT_STATE } from "~/storage/userPrefs";

vi.mock("~/storage/userPrefs", () => ({
  DEFAULT_STATE: {
    storageVersion: 1,
    includePrestige: false,
    selectedRulebookIds: [4, 6],
    browseQuery: { classIds: [], domainIds: [], level: "all" },
    browsePrefs: { cardView: "simple", groupMode: "grouped" },
    uiPrefs: { lang: "en", zhVariant: "chm" },
  },
  detectPreferredLang: vi.fn(() => "en"),
  loadState: vi.fn(),
}));

import { detectPreferredLang, loadState } from "~/storage/userPrefs";

const mockedLoadState = vi.mocked(loadState);
const mockedDetectPreferredLang = vi.mocked(detectPreferredLang);

describe("i18n storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("falls back to English when running without window", () => {
    vi.stubGlobal("window", undefined);

    expect(getI18nFromStorage()).toEqual({ lang: "en" });
    expect(loadState).not.toHaveBeenCalled();
  });

  it("returns zh language and variant from stored preferences", () => {
    vi.stubGlobal("window", {});
    mockedLoadState.mockReturnValue({
      ...DEFAULT_STATE,
      uiPrefs: { lang: "zh", zhVariant: "chm" },
    });

    expect(getI18nFromStorage()).toEqual({ lang: "zh", variant: "chm" });
  });

  it("does not return a variant for English", () => {
    vi.stubGlobal("window", {});
    mockedLoadState.mockReturnValue({
      ...DEFAULT_STATE,
      uiPrefs: { lang: "en", zhVariant: "chm" },
    });

    expect(getI18nFromStorage()).toEqual({ lang: "en", variant: undefined });
  });

  it("falls back to English when loading preferences fails", () => {
    vi.stubGlobal("window", {});
    mockedLoadState.mockImplementation(() => {
      throw new Error("bad storage");
    });

    expect(getI18nFromStorage()).toEqual({ lang: "en" });
    expect(mockedDetectPreferredLang).toHaveBeenCalled();
  });
});
