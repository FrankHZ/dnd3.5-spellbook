import type { MetaI18nResponse } from "@dnd/contracts";

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
