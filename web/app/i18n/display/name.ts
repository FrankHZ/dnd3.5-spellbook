export type WithI18nName = {
  name: string;
  i18n?: { name?: string };
};

export function getDisplayName<T extends WithI18nName>(
  view: T,
  lang: "en" | "zh",
) {
  if (lang === "zh") return view.i18n?.name ?? view.name;
  return view.name;
}

export function getDisplayNameWithEn<T extends WithI18nName>(
  view: T,
  lang: "en" | "zh",
) {
  if (lang === "zh")
    return view.i18n?.name ? `${view.i18n?.name} - ${view.name}` : view.name;
  return view.name;
}
