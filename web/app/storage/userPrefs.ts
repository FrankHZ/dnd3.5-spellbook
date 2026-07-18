import { LS_KEY_PREFS } from "./keys";
import type { Lang } from "@dnd/contracts";
import { type UserPrefsState, STORAGE_VERSION } from "./userPrefs.type";
import {
  DEFAULT_LANG,
  DEFAULT_ZH_VARIANT,
  SUPPORTED_LANGS,
} from "~/i18n/config";

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
  displayPrefs: {
    spellListDensity: "compact",
    spellCardDetails: "summary",
    zhDisplay: {
      spellNamesWithEnglish: true,
      classDomainLabelsWithEnglish: false,
      filterFacetLabelsWithEnglish: false,
      rulebookLabelStyle: "english",
    },
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

type StoredRecord = Record<string, unknown>;

function asStoredRecord(value: unknown): StoredRecord | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as StoredRecord;
}

function isStringChoice<T extends string>(
  value: unknown,
  choices: readonly T[],
): value is T {
  return (
    typeof value === "string" &&
    (choices as readonly string[]).includes(value)
  );
}

function isPositiveIntegerArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => Number.isInteger(item) && item > 0)
  );
}

function isBrowseLevel(
  value: unknown,
): value is UserPrefsState["browseQuery"]["level"] {
  return (
    value === "all" ||
    (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 9)
  );
}

function mergeState(parsed: StoredRecord): UserPrefsState {
  const defaults = getDefaultState();
  const browseQuery = asStoredRecord(parsed.browseQuery) ?? {};
  const browsePrefs = asStoredRecord(parsed.browsePrefs) ?? {};
  const displayPrefs = asStoredRecord(parsed.displayPrefs) ?? {};
  const zhDisplay = asStoredRecord(displayPrefs.zhDisplay) ?? {};
  const uiPrefs = asStoredRecord(parsed.uiPrefs) ?? {};

  const storedCardDetails = isStringChoice(
    displayPrefs.spellCardDetails,
    ["summary", "full"] as const,
  )
    ? displayPrefs.spellCardDetails
    : undefined;
  const legacyCardDetails = isStringChoice(
    browsePrefs.cardView,
    ["simple", "all"] as const,
  )
    ? browsePrefs.cardView === "all"
      ? "full"
      : "summary"
    : undefined;

  const nextUiPrefs: UserPrefsState["uiPrefs"] = {
    ...defaults.uiPrefs,
    lang: isStringChoice(uiPrefs.lang, SUPPORTED_LANGS)
      ? uiPrefs.lang
      : defaults.uiPrefs.lang,
    zhVariant:
      typeof uiPrefs.zhVariant === "string"
        ? uiPrefs.zhVariant
        : defaults.uiPrefs.zhVariant,
  };
  if (isStringChoice(uiPrefs.theme, ["light", "dark"] as const)) {
    nextUiPrefs.theme = uiPrefs.theme;
  }

  return {
    storageVersion: STORAGE_VERSION,
    includePrestige:
      typeof parsed.includePrestige === "boolean"
        ? parsed.includePrestige
        : defaults.includePrestige,
    selectedRulebookIds: isPositiveIntegerArray(parsed.selectedRulebookIds)
      ? parsed.selectedRulebookIds
      : defaults.selectedRulebookIds,
    browseQuery: {
      classIds: isPositiveIntegerArray(browseQuery.classIds)
        ? browseQuery.classIds
        : defaults.browseQuery.classIds,
      domainIds: isPositiveIntegerArray(browseQuery.domainIds)
        ? browseQuery.domainIds
        : defaults.browseQuery.domainIds,
      level: isBrowseLevel(browseQuery.level)
        ? browseQuery.level
        : defaults.browseQuery.level,
    },
    browsePrefs: {
      cardView: isStringChoice(
        browsePrefs.cardView,
        ["simple", "all"] as const,
      )
        ? browsePrefs.cardView
        : defaults.browsePrefs.cardView,
      groupMode: isStringChoice(
        browsePrefs.groupMode,
        ["flat", "grouped"] as const,
      )
        ? browsePrefs.groupMode
        : defaults.browsePrefs.groupMode,
    },
    displayPrefs: {
      spellListDensity: isStringChoice(
        displayPrefs.spellListDensity,
        ["compact", "comfortable"] as const,
      )
        ? displayPrefs.spellListDensity
        : defaults.displayPrefs.spellListDensity,
      spellCardDetails:
        storedCardDetails ??
        legacyCardDetails ??
        defaults.displayPrefs.spellCardDetails,
      zhDisplay: {
        spellNamesWithEnglish:
          typeof zhDisplay.spellNamesWithEnglish === "boolean"
            ? zhDisplay.spellNamesWithEnglish
            : defaults.displayPrefs.zhDisplay.spellNamesWithEnglish,
        classDomainLabelsWithEnglish:
          typeof zhDisplay.classDomainLabelsWithEnglish === "boolean"
            ? zhDisplay.classDomainLabelsWithEnglish
            : defaults.displayPrefs.zhDisplay.classDomainLabelsWithEnglish,
        filterFacetLabelsWithEnglish:
          typeof zhDisplay.filterFacetLabelsWithEnglish === "boolean"
            ? zhDisplay.filterFacetLabelsWithEnglish
            : defaults.displayPrefs.zhDisplay.filterFacetLabelsWithEnglish,
        rulebookLabelStyle: isStringChoice(
          zhDisplay.rulebookLabelStyle,
          ["localized", "english"] as const,
        )
          ? zhDisplay.rulebookLabelStyle
          : defaults.displayPrefs.zhDisplay.rulebookLabelStyle,
      },
    },
    uiPrefs: nextUiPrefs,
  };
}

export function loadState(): UserPrefsState {
  try {
    const raw = localStorage.getItem(LS_KEY_PREFS);
    if (!raw) return getDefaultState();
    const parsed = asStoredRecord(JSON.parse(raw));

    if (parsed?.storageVersion !== STORAGE_VERSION) return getDefaultState();
    return mergeState(parsed);
  } catch {
    return getDefaultState();
  }
}

export function saveState(state: UserPrefsState) {
  localStorage.setItem(LS_KEY_PREFS, JSON.stringify(state));
}
