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
