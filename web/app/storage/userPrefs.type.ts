import type { Lang } from "@dnd/contracts";

export const STORAGE_VERSION = 1;

export type UiPrefs = {
  theme?: "light" | "dark";
  lang: Lang;
  zhVariant?: string;
};

export type BrowseQuery = {
  classIds: number[];
  domainIds: number[];
  level: number | "all";
};

export type BrowsePrefs = {
  cardView: "simple" | "all";
  groupMode: "flat" | "grouped";
};

export type SpellListDensity = "compact" | "comfortable";

export type SpellCardDetailMode = "summary" | "full";

export type RulebookLabelStyle = "localized" | "english";

export type ZhDisplayPrefs = {
  spellNamesWithEnglish: boolean;
  classDomainLabelsWithEnglish: boolean;
  filterFacetLabelsWithEnglish: boolean;
  rulebookLabelStyle: RulebookLabelStyle;
};

export type DisplayPrefs = {
  spellListDensity: SpellListDensity;
  spellCardDetails: SpellCardDetailMode;
  zhDisplay: ZhDisplayPrefs;
};

export type UserPrefsStateV1 = {
  storageVersion: 1;
  includePrestige: boolean;
  selectedRulebookIds: number[];
  browseQuery: BrowseQuery;
  browsePrefs: BrowsePrefs;
  displayPrefs: DisplayPrefs;
  uiPrefs: UiPrefs;
};

export type UserPrefsState = UserPrefsStateV1;
