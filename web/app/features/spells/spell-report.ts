import type {
  AppVersionMetadata,
  Lang,
  SpellDetailView,
  SpellFieldProvenance,
  SpellItemView,
} from "@dnd/contracts";
import { getDisplayName } from "~/i18n/display/name";
import { getSpellShortDescription } from "~/i18n/display/spell-short-description";

export type ReportableSpell = Pick<
  SpellItemView,
  "id" | "name" | "rulebook"
> & {
  i18n?: SpellDetailView["i18n"];
  description?: SpellDetailView["description"];
};

function fieldSource(
  variant: string | undefined,
  provenance?: SpellFieldProvenance,
) {
  const selected = variant || "unknown";
  return provenance
    ? `${selected}; language=${provenance.language}; origin=${provenance.origin.kind}`
    : selected;
}

// Describe displayed fields, never the requested effective selection policy.
export function getSpellReportSources(spell: ReportableSpell, lang: Lang) {
  const overlay = spell.i18n;
  const localizedBody =
    overlay?.description?.html || overlay?.description?.text;
  return {
    name:
      lang === "zh" && overlay?.name != null
        ? fieldSource(overlay.variant, overlay.nameProvenance)
        : "en (canonical)",
    summary: getSpellShortDescription(spell, lang)
      ? `${overlay!.summary!.lang}/${overlay!.summary!.variant || "unknown"}`
      : "not displayed",
    body: !spell.description
      ? "not loaded (card)"
      : lang === "zh" && localizedBody
        ? fieldSource(overlay?.variant, overlay?.bodyProvenance)
        : "en (canonical)",
  };
}

// Code-point truncation preserves Unicode. Strip line breaks from metadata so
// names cannot introduce additional report sections. Only allowlisted fields
// enter the draft; never use location.href or browser collection/session state.
function brief(value: string | undefined, limit: number) {
  const chars = Array.from((value ?? "").replace(/\s+/gu, " ").trim());
  return chars.length > limit
    ? chars.slice(0, limit - 1).join("") + "…"
    : chars.join("");
}

export function buildSpellReportUrl({
  spell,
  lang,
  version,
}: {
  spell: ReportableSpell;
  lang: Lang;
  version: AppVersionMetadata;
}) {
  const sources = getSpellReportSources(spell, lang);
  const detailUrl = `https://www.d20spellcodex.com/spells/${spell.id}`;
  const prompts =
    lang === "zh"
      ? "## 问题描述\n\n\n## 期望或建议\n\n\n## 来源（可选）\n\n"
      : "## Problem\n\n\n## Expected / suggested correction\n\n\n## Source (optional)\n\n";
  // Bound the encoded URL too: non-ASCII characters cost more than ASCII.
  let limit = 64;
  let url: URL;
  do {
    const text = (value: string | undefined) => brief(value, limit);
    url = new URL("https://github.com/FrankHZ/dnd3.5-spellbook/issues/new");
    url.searchParams.set(
      "title",
      `[Spell #${spell.id}] ${text(getDisplayName(spell, lang))}`,
    );
    url.searchParams.set(
      "body",
      [
        prompts,
        "---",
        `Spell ID: ${spell.id}`,
        `English: ${text(spell.name)}`,
        ...(spell.i18n?.name ? [`中文: ${text(spell.i18n.name)}`] : []),
        `Rulebook: ${text(spell.rulebook.name)} (${text(spell.rulebook.abbr)})`,
        `Spell: ${detailUrl}`,
        `UI language: ${lang}`,
        `Name variant: ${text(sources.name)}`,
        `Summary variant: ${text(sources.summary)}`,
        `Body variant: ${text(sources.body)}`,
        `Frontend: ${text(version.versionLabel) || "local"}`,
        ...(version.commitSha || version.shortSha
          ? [`Commit: ${text(version.commitSha || version.shortSha)}`]
          : []),
      ].join("\n"),
    );
    limit = Math.floor(limit / 2);
  } while (url.href.length > 4000 && limit >= 8);
  return url.href;
}
