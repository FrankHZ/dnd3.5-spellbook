import type { Lang } from "@dnd/contracts";

export const DEFAULT_LANG: Lang = "en";
export const SUPPORTED_LANGS = ["en", "zh"] as const satisfies readonly Lang[];
export const DEFAULT_ZH_VARIANT = "chm";

export const I18N_NAMESPACES = [
  "translation",
  "topbar",
  "pager",
  "collections",
  "collections-default",
  "metamagic",
  "publications",
  "settings",
  "spell-browse",
  "spell-filter-vocabulary",
  "spell-mechanic-vocabulary",
  "spell-filters",
  "spell-scope",
  "spell-search",
  "spell-detail",
  "about",
] as const;

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export type I18nNamespace = (typeof I18N_NAMESPACES)[number];
