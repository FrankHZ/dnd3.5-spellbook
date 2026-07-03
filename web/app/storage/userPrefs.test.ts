import { afterEach, describe, expect, it, vi } from "vitest";

import { LS_KEY_PREFS } from "./keys";
import {
  DEFAULT_STATE,
  detectPreferredLang,
  loadState,
  saveState,
} from "./userPrefs";
import { installMemoryStorage } from "./storage-test-utils";

installMemoryStorage();

describe("user preferences storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads defaults when storage is empty or invalid", () => {
    const detectedDefaultState = {
      ...DEFAULT_STATE,
      uiPrefs: { ...DEFAULT_STATE.uiPrefs, lang: detectPreferredLang() },
    };

    expect(loadState()).toEqual(detectedDefaultState);

    localStorage.setItem(LS_KEY_PREFS, "{bad json");

    expect(loadState()).toEqual(detectedDefaultState);
  });

  it("detects Chinese browser preference when storage is empty", () => {
    vi.stubGlobal("navigator", {
      languages: ["zh-CN", "en-US"],
      language: "zh-CN",
    });

    expect(detectPreferredLang()).toBe("zh");
    expect(loadState()).toEqual({
      ...DEFAULT_STATE,
      uiPrefs: { ...DEFAULT_STATE.uiPrefs, lang: "zh" },
    });
  });

  it("keeps stored language over browser preference", () => {
    vi.stubGlobal("navigator", {
      languages: ["zh-CN", "en-US"],
      language: "zh-CN",
    });
    localStorage.setItem(
      LS_KEY_PREFS,
      JSON.stringify({
        storageVersion: 1,
        uiPrefs: { lang: "en", zhVariant: "chm" },
      }),
    );

    expect(loadState().uiPrefs.lang).toBe("en");
  });

  it("rejects unsupported storage versions", () => {
    localStorage.setItem(
      LS_KEY_PREFS,
      JSON.stringify({ ...DEFAULT_STATE, storageVersion: 999, includePrestige: true }),
    );

    expect(loadState()).toEqual({
      ...DEFAULT_STATE,
      uiPrefs: { ...DEFAULT_STATE.uiPrefs, lang: detectPreferredLang() },
    });
  });

  it("merges stored values over defaults", () => {
    localStorage.setItem(
      LS_KEY_PREFS,
      JSON.stringify({
        storageVersion: 1,
        selectedRulebookIds: [1, 2],
        uiPrefs: { lang: "zh", zhVariant: "chm" },
      }),
    );

    expect(loadState()).toEqual({
      ...DEFAULT_STATE,
      selectedRulebookIds: [1, 2],
      displayPrefs: DEFAULT_STATE.displayPrefs,
      uiPrefs: { lang: "zh", zhVariant: "chm" },
    });
  });

  it("loads display preferences and migrates legacy browse card view", () => {
    localStorage.setItem(
      LS_KEY_PREFS,
      JSON.stringify({
        storageVersion: 1,
        browsePrefs: { cardView: "all" },
        displayPrefs: { spellListDensity: "comfortable" },
      }),
    );

    expect(loadState().displayPrefs).toEqual({
      spellListDensity: "comfortable",
      spellCardDetails: "full",
      zhDisplay: DEFAULT_STATE.displayPrefs.zhDisplay,
    });
  });

  it("merges partial Chinese display preferences", () => {
    localStorage.setItem(
      LS_KEY_PREFS,
      JSON.stringify({
        storageVersion: 1,
        displayPrefs: {
          zhDisplay: {
            classDomainLabelsWithEnglish: true,
            rulebookLabelStyle: "english",
          },
        },
      }),
    );

    expect(loadState().displayPrefs.zhDisplay).toEqual({
      ...DEFAULT_STATE.displayPrefs.zhDisplay,
      classDomainLabelsWithEnglish: true,
      rulebookLabelStyle: "english",
    });
  });

  it("saves preferences as JSON", () => {
    const next = {
      ...DEFAULT_STATE,
      includePrestige: true,
      selectedRulebookIds: [4],
    };

    saveState(next);

    expect(JSON.parse(localStorage.getItem(LS_KEY_PREFS) ?? "")).toEqual(next);
  });
});
