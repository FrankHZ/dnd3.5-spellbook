import type { SpellCoreItem } from "@dnd/contracts";

export function mapSpellCore(spell: any): SpellCoreItem {
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
    descriptors: (spell.spellDescriptors ?? [])
      .map((sd: any) => sd.spellDescriptor)
      .filter(Boolean)
      .map((d: any) => ({ id: d.id, name: d.name, slug: d.slug })),
  };
}
