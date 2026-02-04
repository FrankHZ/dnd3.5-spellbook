import type { SpellDetailView } from "@dnd/contracts";

export type SpellDesc = {
  html?: string;
  text?: string;
  sourceKey?: string;
  usedFallback: boolean;
};

export function getSpellDescription(
  spell: SpellDetailView,
  lang: "en" | "zh",
): SpellDesc {
  if (lang === "zh") {
    const zh = spell.i18n?.description;
    const zhHtml = zh?.html;
    const zhText = zh?.text;

    if (zhHtml || zhText) {
      return {
        html: zhHtml,
        text: zhText,
        sourceKey: spell.i18n?.sourceKey,
        usedFallback: false,
      };
    }
    // fallback to EN
    return {
      html: spell.description.html ?? undefined,
      text: spell.description.text ?? undefined,
      usedFallback: true,
    };
  }

  return {
    html: spell.description.html ?? undefined,
    text: spell.description.text ?? undefined,
    usedFallback: false,
  };
}
