export type Lang = "en" | "zh";

export type I18nContext = {
  lang: Lang;
  variant?: string | undefined;
};

export type I18nNameOverlay = {
  lang: "zh";
  variant?: string | undefined;
  name?: string | undefined;
};

export type I18nSpellSummaryOverlay = {
  lang: Lang;
  variant?: string | undefined;
  shortDescription?: string | undefined;
  sourceKey?: string | undefined;
};

export type I18nSpellOverlay = {
  lang?: "zh" | undefined;
  variant?: string | undefined;
  name?: string | undefined;
  summary?: I18nSpellSummaryOverlay | undefined;
};
