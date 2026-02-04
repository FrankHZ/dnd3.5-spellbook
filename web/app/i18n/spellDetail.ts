import type { SpellDetailView } from "@dnd/contracts";

export type SpellDesc = { html?: string; text?: string };

export function getSpellDescription(
  spell: SpellDetailView,
  lang: "en" | "zh",
): { html?: string; text?: string; usedFallback: boolean } {
  if (lang === "zh") {
    const zh = spell.i18n?.description;
    const zhHtml = zh?.html;
    const zhText = zh?.text;

    if (zhHtml || zhText) {
      return { html: zhHtml, text: zhText, usedFallback: false };
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
