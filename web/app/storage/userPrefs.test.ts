import { describe, expect, it } from "vitest";

import { LS_KEY_PREFS } from "./keys";
import { DEFAULT_STATE, loadState, saveState } from "./userPrefs";
import { installMemoryStorage } from "./storage-test-utils";

installMemoryStorage();

describe("user preferences storage", () => {
  it("loads defaults when storage is empty or invalid", () => {
    expect(loadState()).toEqual(DEFAULT_STATE);

    localStorage.setItem(LS_KEY_PREFS, "{bad json");

    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it("rejects unsupported storage versions", () => {
    localStorage.setItem(
      LS_KEY_PREFS,
      JSON.stringify({ ...DEFAULT_STATE, storageVersion: 999, includePrestige: true }),
    );

    expect(loadState()).toEqual(DEFAULT_STATE);
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
      uiPrefs: { lang: "zh", zhVariant: "chm" },
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
