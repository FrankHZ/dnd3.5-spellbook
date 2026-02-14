import type {
  SpellItemView,
  SpellDetailView,
  I18nNameOverlay,
  I18nSpellDetailOverlay,
} from "@dnd/contracts";
import { Prisma as RulesPrisma } from "DB_RULES/client";
import { Prisma as AppPrisma } from "DB_APP/client";
import {
  SELECT_SPELL_DETAIL,
  SELECT_SPELL_I18N_DETAIL,
  SELECT_SPELL_I18N_MIN,
  SELECT_SPELL_LIST,
} from "./spells.repo.rules";

export function mapSpellItem(
  spell: RulesPrisma.SpellGetPayload<{ select: typeof SELECT_SPELL_LIST }>,
  spellI18n: AppPrisma.I18nSpellTextGetPayload<{
    select: typeof SELECT_SPELL_I18N_MIN;
  }> | null,
): SpellItemView {
  const descriptors = (spell.spellDescriptors ?? [])
    .map((sd: any) => sd.spellDescriptor)
    .filter(Boolean)
    .map((d: any) => ({ id: d.id, name: d.name, slug: d.slug }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name) || a.id - b.id);

  const classLevels = (spell.spellClassIndexes ?? [])
    .map((cl) => ({
      id: cl.characterClass.id,
      slug: cl.characterClass.slug,
      name: cl.characterClass.name,
      prestige: !!cl.characterClass.prestige,
      level: cl.level,
      extra: cl.extra,
    }))
    .sort(
      (a, b) =>
        a.level - b.level ||
        Number(a.prestige) - Number(b.prestige) ||
        a.name.localeCompare(b.name) ||
        a.id - b.id,
    );

  const domainLevels = (spell.spellDomainIndexes ?? [])
    .map((dl) => ({
      id: dl.domain.id,
      slug: dl.domain.slug,
      name: dl.domain.name,
      level: dl.level,
      extra: dl.extra,
    }))
    .sort(
      (a, b) =>
        a.level - b.level || a.name.localeCompare(b.name) || a.id - b.id,
    );

  const i18n: I18nNameOverlay | undefined = spellI18n
    ? {
        lang: "zh",
        name: spellI18n.name ?? undefined,
        variant: spellI18n.variant ?? undefined,
      }
    : undefined;

  return {
    id: spell.id,
    slug: spell.slug,
    name: spell.name,
    page: spell.page ?? null,
    rulebook: {
      id: spell.rulebook.id,
      abbr: spell.rulebook.abbr,
    },
    school: spell.spellSchool
      ? {
          id: spell.spellSchool.id,
          name: spell.spellSchool.name,
          slug: spell.spellSchool.slug,
        }
      : null,
    subSchool: spell.spellSubschool
      ? {
          id: spell.spellSubschool.id,
          name: spell.spellSubschool.name,
          slug: spell.spellSubschool.slug,
        }
      : null,
    descriptors,
    classLevels: classLevels,
    domainLevels: domainLevels,
    components: {
      V: !!spell.verbal_component,
      S: !!spell.somatic_component,
      M: !!spell.material_component,
      AF: !!spell.arcane_focus_component,
      DF: !!spell.divine_focus_component,
      XP: !!spell.xp_component,
      metabreath: !!spell.meta_breath_component,
      truename: !!spell.true_name_component,
      corrupt: !!spell.corrupt_component,
      extra: spell.extra_components ?? null,
    },
    casting: {
      castingTime: spell.casting_time ?? null,
      range: spell.range ?? null,
      target: spell.target ?? null,
      effect: spell.effect ?? null,
      area: spell.area ?? null,
      duration: spell.duration ?? null,
      savingThrow: spell.saving_throw ?? null,
      spellResistance: spell.spell_resistance ?? null,
    },
    corrupt: {
      level: spell.corrupt_level ?? null,
    },
    i18n,
  };
}

export function mapSpellDetail(
  spell: RulesPrisma.SpellGetPayload<{ select: typeof SELECT_SPELL_DETAIL }>,
  spellDetailI18n: AppPrisma.I18nSpellTextGetPayload<{
    select: typeof SELECT_SPELL_I18N_DETAIL;
  }> | null,
): SpellDetailView {
  const i18n: I18nSpellDetailOverlay | undefined = spellDetailI18n
    ? {
        lang: "zh",
        name: spellDetailI18n.name ?? undefined,
        variant: spellDetailI18n.variant ?? undefined,
        sourceKey: spellDetailI18n.sourceKey ?? undefined,
        description: {
          html: spellDetailI18n.descriptionHtml ?? undefined,
          text: spellDetailI18n.descriptionText ?? undefined,
        },
      }
    : undefined;

  const detail: SpellDetailView = {
    ...mapSpellItem(spell, spellDetailI18n),
    added: spell.added.toISOString(),
    description: {
      text: spell.description,
      html: spell.description_html,
    },

    verified: {
      verified: !!spell.verified,
      verifiedAuthorId: spell.verified_author_id ?? null,
      verifiedTime: spell.verified_time
        ? spell.verified_time.toISOString()
        : null,
    },
  };

  detail.i18n = i18n;

  return detail;
}
