import type { MetaI18nResponse } from "@dnd/contracts";

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

export type WithIdName = {
  id: number;
  name: string;
};

export type MetaDict =
  | "rulebooks"
  | "classes"
  | "domains"
  | "schools"
  | "subschools"
  | "descriptors";

export function getMetaDisplayName(
  meta: MetaI18nResponse | undefined,
  dict: MetaDict,
  entity: WithIdName | null | undefined,
  lang: "en" | "zh",
) {
  if (!entity) return "—";
  if (lang !== "zh") return entity.name;
  return meta?.[dict]?.[entity.id]?.name ?? entity.name;
}

/** New: meta i18n name with EN appended (zh - en) */
export function getMetaDisplayNameWithEn(
  meta: MetaI18nResponse | undefined,
  dict: MetaDict,
  entity: WithIdName | null | undefined,
  lang: "en" | "zh",
) {
  if (!entity) return "—";
  if (lang !== "zh") return entity.name;

  const zh = meta?.[dict]?.[entity.id]?.name;
  return zh ? `${zh} - ${entity.name}` : entity.name;
}
