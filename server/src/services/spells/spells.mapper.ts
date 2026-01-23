export type SpellListCoreDTO = {
  id: number;
  slug: string;
  name: string;
  page: number | null;
  rulebook: { id: number; abbr: string };
  school: { id: number; name: string; slug: string } | null;
  subSchool: { id: number; name: string; slug: string } | null;
  descriptors: Array<{ id: number; name: string; slug: string }>;
};

export type SpellNameSearchResponseDTO = {
  page: number;
  pageSize: number;
  total: number;
  q: string;
  rulebookIds: number[];
  items: SpellListCoreDTO[];
};

export type SpellByClassLevelItemDTO = SpellListCoreDTO & {
  matchedClassLevels: Array<{
    classId: number;
    classSlug: string;
    className: string;
    prestige: boolean;
    level: number;
    extra: string;
  }>;
};

export type SpellByClassLevelResponseDTO = {
  page: number;
  pageSize: number;
  total: number;
  level: number;
  classIds: number[];
  rulebookIds: number[];
  items: SpellByClassLevelItemDTO[];
};

export type SpellDetailDTO = {
  id: number;
  slug: string;
  name: string;
  added: string; // ISO

  rulebook: { id: number; abbr: string; name: string; slug: string };
  page: number | null;

  school: { id: number; name: string; slug: string } | null;
  subSchool: { id: number; name: string; slug: string } | null;

  descriptors: Array<{ id: number; name: string; slug: string }>;

  components: {
    V: boolean;
    S: boolean;
    M: boolean;
    AF: boolean;
    DF: boolean;
    XP: boolean;
    metabreath: boolean;
    truename: boolean;
    corrupt: boolean;
    extra?: string | null;
  };

  casting: {
    castingTime?: string | null;
    range?: string | null;
    target?: string | null;
    effect?: string | null;
    area?: string | null;
    duration?: string | null;
    savingThrow?: string | null;
    spellResistance?: string | null;
  };

  description: {
    text: string;
    html: string;
  };

  classLevels: Array<{
    classId: number;
    classSlug: string;
    className: string;
    prestige: boolean;
    level: number;
    extra: string;
  }>;

  domainLevels: Array<{
    domainId: number;
    domainSlug: string;
    domainName: string;
    level: number;
    extra: string;
  }>;

  verified: {
    verified: boolean;
    verifiedAuthorId?: number | null;
    verifiedTime?: string | null; // ISO
  };

  corrupt?: {
    level?: number | null;
  };
};

export function mapSpellCore(spell: any): SpellListCoreDTO {
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