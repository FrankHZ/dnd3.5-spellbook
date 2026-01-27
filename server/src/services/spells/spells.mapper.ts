import type { SpellItem, SpellDetail } from "@dnd/contracts";

export function mapSpellItem(spell: any): SpellItem {
  const descriptors = (spell.spellDescriptors ?? [])
    .map((sd: any) => sd.spellDescriptor)
    .filter(Boolean)
    .map((d: any) => ({ id: d.id, name: d.name, slug: d.slug }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name) || a.id - b.id);

  const classLevels = (spell.spellClassIndexes ?? [])
    .map((cl: any) => ({
      classId: cl.characterClass.id,
      classSlug: cl.characterClass.slug,
      className: cl.characterClass.name,
      prestige: !!cl.characterClass.prestige,
      level: cl.level,
      extra: cl.extra,
    }))
    .sort(
      (a: any, b: any) =>
        a.level - b.level ||
        a.prestige - b.prestige ||
        a.className.localeCompare(b.className) ||
        a.classId - b.classId,
    );

  const domainLevels = (spell.spellDomainIndexes ?? [])
    .map((dl: any) => ({
      domainId: dl.domain.id,
      domainSlug: dl.domain.slug,
      domainName: dl.domain.name,
      level: dl.level,
      extra: dl.extra,
    }))
    .sort(
      (a: any, b: any) =>
        a.level - b.level ||
        a.domainName.localeCompare(b.domainName) ||
        a.domainId - b.domainId,
    );

  return {
    id: spell.id,
    slug: spell.slug,
    name: spell.name,
    page: spell.page ?? null,
    rulebook: {
      id: spell.rulebook.id,
      abbr: spell.rulebook.abbr,
      name: spell.rulebook.name,
      slug: spell.rulebook.slug,
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
    matchedClassLevels: classLevels,
    matchedDomainLevels: domainLevels,
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
  };
}

export function mapSpellDetail(spell: any): SpellDetail {
  const detail: SpellDetail = {
    ...mapSpellItem(spell),
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
  return detail;
}
