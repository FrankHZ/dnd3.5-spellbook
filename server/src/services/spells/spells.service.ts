import { getDefaultRulebookIds } from "../rulebooks.service";
import {
  mapSpellCore,
  type SpellByClassLevelItemDTO,
  type SpellByClassLevelResponseDTO,
  type SpellDetailDTO,
} from "./spells.mapper";
import {
  queryByClassLevel,
  queryByName,
  querySpellDetail,
} from "./spells.repo";

export const spellsService = {
  async searchByName(input: {
    q: string;
    rulebookIds?: number[] | undefined;
    page: number;
    pageSize: number;
  }) {
    const rulebookIds =
      input.rulebookIds && input.rulebookIds.length > 0
        ? input.rulebookIds
        : await getDefaultRulebookIds();

    const { total, spellsInOrder } = await queryByName(
      input.q,
      rulebookIds,
      input.page,
      input.pageSize,
    );

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      q: input.q,
      rulebookIds,
      items: spellsInOrder.map(mapSpellCore),
    };
  },
  async listByClassLevel(input: {
    classIds: number[];
    level: number;
    rulebookIds?: number[] | undefined;
    page: number;
    pageSize: number;
  }): Promise<SpellByClassLevelResponseDTO> {
    const rulebookIds =
      input.rulebookIds && input.rulebookIds.length > 0
        ? input.rulebookIds
        : await getDefaultRulebookIds();

    const { total, spellsInOrder } = await queryByClassLevel(
      input.classIds,
      input.level,
      rulebookIds,
      input.page,
      input.pageSize,
    );

    const items: SpellByClassLevelItemDTO[] = spellsInOrder.map((s: any) => {
      const core = mapSpellCore(s);
      const matchedClassLevels = (s.spellClassLevels ?? []).map((cl: any) => ({
        classId: cl.characterClass.id,
        classSlug: cl.characterClass.slug,
        className: cl.characterClass.name,
        prestige: !!cl.characterClass.prestige,
        level: cl.level,
        extra: cl.extra,
      }));

      return { ...core, matchedClassLevels };
    });

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      level: input.level,
      classIds: input.classIds,
      rulebookIds,
      items,
    };
  },
  async getSpellDetail(input: { id: number }): Promise<SpellDetailDTO | null> {
    const spell = await querySpellDetail(input.id);
    if (!spell) {
      return null;
    }

    const descriptors = (spell.spellDescriptors ?? [])
      .map((sd: any) => sd.spellDescriptor)
      .filter(Boolean)
      .map((d: any) => ({ id: d.id, name: d.name, slug: d.slug }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name) || a.id - b.id);

    const classLevels = (spell.spellClassLevels ?? [])
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

    const domainLevels = (spell.spellDomainLevels ?? [])
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

    const detail: SpellDetailDTO = {
      id: spell.id,
      slug: spell.slug,
      name: spell.name,
      added: spell.added.toISOString(),

      rulebook: spell.rulebook,
      page: spell.page ?? null,

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

      description: {
        text: spell.description,
        html: spell.description_html,
      },

      classLevels,
      domainLevels,

      verified: {
        verified: !!spell.verified,
        verifiedAuthorId: spell.verified_author_id ?? null,
        verifiedTime: spell.verified_time
          ? spell.verified_time.toISOString()
          : null,
      },

      corrupt: {
        level: spell.corrupt_level ?? null,
      },
    };

    return detail;
  },
};
