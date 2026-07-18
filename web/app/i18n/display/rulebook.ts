import type { MetaI18nResponse, RulebookMin } from "@dnd/contracts";

export type RulebookDisplay = {
  abbr: string;
  name: string;
  sourceAbbr: string;
  sourceName: string;
};

const EMPTY_RULEBOOK_DISPLAY: RulebookDisplay = {
  abbr: "—",
  name: "—",
  sourceAbbr: "—",
  sourceName: "—",
};

function getLocalizedRulebookAbbr(name: string) {
  const stripped = name
    .replace(/\s+v?\d+(?:\.\d+)?$/i, "")
    .replace(/\s+\d{2,4}\.\d+$/, "")
    .trim();

  return stripped || name;
}

export function getRulebookDisplay(
  meta: MetaI18nResponse | undefined,
  rulebook: RulebookMin | null | undefined,
  lang: "en" | "zh",
): RulebookDisplay {
  if (!rulebook) return EMPTY_RULEBOOK_DISPLAY;

  const zhName = lang === "zh" ? meta?.rulebooks?.[rulebook.id]?.name : undefined;
  const fallbackName = rulebook.displayName ?? rulebook.name;
  const name = zhName ?? fallbackName;
  const fallbackAbbr = rulebook.displayAbbr ?? rulebook.abbr ?? fallbackName;
  const abbr =
    lang === "zh" && zhName !== undefined
      ? getLocalizedRulebookAbbr(zhName)
      : fallbackAbbr;

  return {
    abbr,
    name,
    sourceAbbr: rulebook.abbr,
    sourceName: rulebook.name,
  };
}
