import { LS_KEY_PREFS } from "./keys";
import { type UserPrefsState, STORAGE_VERSION } from "./userPrefs.type";

export const DEFAULT_STATE: UserPrefsState = {
  storageVersion: STORAGE_VERSION,
  includePrestige: false,
  selectedRulebookIds: [4, 6],
  browseQuery: {
    classIds: [],
    domainIds: [],
    level: "all",
  },
  browsePrefs: {
    cardView: "simple",
    groupMode: "grouped",
  },
  uiPrefs: {
    lang: "en",
    zhVariant: "chm",
  },
};

export function loadState(): UserPrefsState {
  try {
    const raw = localStorage.getItem(LS_KEY_PREFS);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);

    if (parsed?.storageVersion !== STORAGE_VERSION) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: UserPrefsState) {
  localStorage.setItem(LS_KEY_PREFS, JSON.stringify(state));
}
