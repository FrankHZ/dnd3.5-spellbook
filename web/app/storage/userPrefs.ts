import { LS_KEY_PREFS } from "./keys";
import type { Lang } from "@dnd/contracts";
import { type UserPrefsState, STORAGE_VERSION } from "./userPrefs.type";
import { DEFAULT_LANG, DEFAULT_ZH_VARIANT } from "~/i18n/config";

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
    lang: DEFAULT_LANG,
    zhVariant: DEFAULT_ZH_VARIANT,
  },
};

export function detectPreferredLang(): Lang {
  if (typeof navigator === "undefined") return DEFAULT_LANG;

  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter((value): value is string => typeof value === "string");

  return candidates.some((value) => value.toLowerCase().startsWith("zh"))
    ? "zh"
    : DEFAULT_LANG;
}

function getDefaultState(): UserPrefsState {
  return {
    ...DEFAULT_STATE,
    uiPrefs: {
      ...DEFAULT_STATE.uiPrefs,
      lang: detectPreferredLang(),
    },
  };
}

function mergeState(parsed: Partial<UserPrefsState>): UserPrefsState {
  const defaults = getDefaultState();
  return {
    ...defaults,
    ...parsed,
    uiPrefs: {
      ...defaults.uiPrefs,
      ...parsed.uiPrefs,
    },
  };
}

export function loadState(): UserPrefsState {
  try {
    const raw = localStorage.getItem(LS_KEY_PREFS);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);

    if (parsed?.storageVersion !== STORAGE_VERSION) return getDefaultState();
    return mergeState(parsed);
  } catch {
    return getDefaultState();
  }
}

export function saveState(state: UserPrefsState) {
  localStorage.setItem(LS_KEY_PREFS, JSON.stringify(state));
}
