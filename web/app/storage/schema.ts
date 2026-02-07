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

export type PersistedStateV1 = {
  storageVersion: 1;
  includePrestige: boolean;
  selectedRulebookIds: number[];
  browseQuery: BrowseQuery;
  browsePrefs: BrowsePrefs;
  uiPrefs: UiPrefs;
};

export type PersistedState = PersistedStateV1;
