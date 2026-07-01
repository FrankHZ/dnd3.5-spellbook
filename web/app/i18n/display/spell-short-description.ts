import type { Lang } from "@dnd/contracts";

type WithSpellSummary = {
  i18n?: {
    summary?: {
      lang?: Lang;
      variant?: string;
      shortDescription?: string;
    };
  };
};

export function getSpellShortDescription(
  spell: WithSpellSummary,
  lang: Lang,
) {
  const summary = spell.i18n?.summary;
  if (summary?.lang !== lang) return undefined;

  const text = summary.shortDescription?.trim();
  return text ? text : undefined;
}
