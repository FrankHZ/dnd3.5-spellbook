import { afterEach, describe, expect, it, vi } from "vitest";

import { LS_KEY_COLLECTIONS, LS_KEY_PREFS } from "./keys";
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
      JSON.stringify({
        ...DEFAULT_STATE,
        storageVersion: 999,
        includePrestige: true,
      }),
    );

    expect(loadState()).toEqual({
      ...DEFAULT_STATE,
      uiPrefs: { ...DEFAULT_STATE.uiPrefs, lang: detectPreferredLang() },
    });
  });

  it("sanitizes malformed same-version fields without discarding valid siblings", () => {
    localStorage.setItem(
      LS_KEY_PREFS,
      JSON.stringify({
        storageVersion: 1,
        includePrestige: "yes",
        selectedRulebookIds: "bad",
        browseQuery: {
          classIds: [1, "bad"],
          domainIds: [2],
          level: 3,
        },
        browsePrefs: {
          cardView: "wide",
          groupMode: "flat",
        },
        displayPrefs: {
          spellListDensity: "dense",
          spellCardDetails: "full",
          zhDisplay: {
            spellNamesWithEnglish: "yes",
            classDomainLabelsWithEnglish: true,
            filterFacetLabelsWithEnglish: null,
            rulebookLabelStyle: "localized",
          },
        },
        uiPrefs: {
          lang: "fr",
          zhVariant: 42,
          theme: "sepia",
        },
      }),
    );

    const state = loadState();

    expect(state).toEqual({
      ...DEFAULT_STATE,
      browseQuery: {
        ...DEFAULT_STATE.browseQuery,
        domainIds: [2],
        level: 3,
      },
      browsePrefs: {
        ...DEFAULT_STATE.browsePrefs,
        groupMode: "flat",
      },
      displayPrefs: {
        ...DEFAULT_STATE.displayPrefs,
        spellCardDetails: "full",
        zhDisplay: {
          ...DEFAULT_STATE.displayPrefs.zhDisplay,
          classDomainLabelsWithEnglish: true,
          rulebookLabelStyle: "localized",
        },
      },
      uiPrefs: {
        ...DEFAULT_STATE.uiPrefs,
        lang: detectPreferredLang(),
      },
    });
    expect(state.selectedRulebookIds.join(",")).toBe("4,6");
  });

  it("uses nested defaults when same-version preference groups are malformed", () => {
    localStorage.setItem(
      LS_KEY_PREFS,
      JSON.stringify({
        storageVersion: 1,
        includePrestige: true,
        selectedRulebookIds: [1, 2],
        browseQuery: "bad",
        browsePrefs: [],
        displayPrefs: null,
        uiPrefs: 42,
      }),
    );

    expect(loadState()).toEqual({
      ...DEFAULT_STATE,
      includePrestige: true,
      selectedRulebookIds: [1, 2],
      uiPrefs: {
        ...DEFAULT_STATE.uiPrefs,
        lang: detectPreferredLang(),
      },
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
      uiPrefs: { lang: "zh", zhVariant: "effective" },
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

  it.each(["chm", "custom", "", undefined, 42])(
    "normalizes only the variant for saved value %s",
    (zhVariant) => {
      const prefs = {
        ...DEFAULT_STATE,
        includePrestige: true,
        selectedRulebookIds: [49, 86],
        browseQuery: { classIds: [1], domainIds: [2], level: 4 },
        browsePrefs: { cardView: "all", groupMode: "flat" },
        displayPrefs: {
          ...DEFAULT_STATE.displayPrefs,
          spellCardDetails: "full",
        },
        uiPrefs: { lang: "zh", theme: "dark", zhVariant },
      };
      const collectionJson = JSON.stringify({
        favorites: [876],
        prepared: [{ spellId: 876, notes: "Keep me" }],
      });
      localStorage.setItem(LS_KEY_PREFS, JSON.stringify(prefs));
      localStorage.setItem(LS_KEY_COLLECTIONS, collectionJson);
      const next = loadState();
      expect(next).toEqual({
        ...prefs,
        uiPrefs: { ...prefs.uiPrefs, zhVariant: "effective" },
      });
      // Reading does not mutate storage; subsequent normal saves preserve all siblings.
      expect(localStorage.getItem(LS_KEY_PREFS)).toBe(JSON.stringify(prefs));
      saveState(next);
      expect(localStorage.getItem(LS_KEY_COLLECTIONS)).toBe(collectionJson);
    },
  );

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
