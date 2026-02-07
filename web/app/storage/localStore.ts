import { LS_KEY } from "./keys";
import { type PersistedState, STORAGE_VERSION } from "./schema";

export const DEFAULT_STATE: PersistedState = {
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

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);

    if (parsed?.storageVersion !== STORAGE_VERSION) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: PersistedState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}
