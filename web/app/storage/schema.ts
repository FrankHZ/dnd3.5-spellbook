import type { Lang } from "@dnd/contracts";

export const STORAGE_VERSION = 1;

export type UiPrefs = {
  theme?: "light" | "dark";
  lang: Lang;
  zhVariant?: string;
};

export type PersistedStateV1 = {
  storageVersion: 1;
  includePrestige: boolean;
  selectedRulebookIds: number[];
  browseClassIds: number[];
  browseDomainIds: number[];
  browseLevel: number | null;
  uiPrefs: UiPrefs;
};

export type PersistedState = PersistedStateV1;
