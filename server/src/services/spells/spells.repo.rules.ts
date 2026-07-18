import {
  RulebookId,
  SpellComponentFilters,
  SpellMechanicFilters,
  SpellTaxonomyFilterIds,
} from "@dnd/contracts";
import { rulesPrisma } from "#server/lib/rules-prisma-client";
import { Prisma } from "#prisma-rules-clean/generated/client";
import {
  expandDescriptorBucketFilterIds,
  expandSchoolFilterIds,
  expandSubschoolFilterIds,
} from "#server/services/spells/taxonomy-normalization";

export const SELECT_SPELL_MIN = {
  id: true,
  slug: true,
  name: true,
} satisfies Prisma.SpellSelect;

export const SELECT_SPELL_LIST = {
  ...SELECT_SPELL_MIN,

  page: true,
  rulebook: { select: { id: true, abbr: true, name: true, slug: true } },

  spellSchool: { select: { id: true, name: true, slug: true } },
  spellSubschool: { select: { id: true, name: true, slug: true } },

  spellDescriptors: {
    select: {
      spellDescriptor: { select: { id: true, name: true, slug: true } },
    },
  },

  // components
  verbal_component: true,
  somatic_component: true,
  material_component: true,
  arcane_focus_component: true,
  divine_focus_component: true,
  xp_component: true,
  meta_breath_component: true,
  true_name_component: true,
  corrupt_component: true,
  extra_components: true,

  // casting/stats
  casting_time: true,
  range: true,
  target: true,
  effect: true,
  area: true,
  duration: true,
  saving_throw: true,
  spell_resistance: true,

  corrupt_level: true,

  spellClassIndexes: {
    select: {
      rulebookId: true,
      classId: true,
      level: true,
      extra: true,
      characterClass: {
        select: { id: true, slug: true, name: true, prestige: true },
      },
    },
  },

  spellDomainIndexes: {
    select: {
      rulebookId: true,
      domainId: true,
      level: true,
      extra: true,
      domain: { select: { id: true, slug: true, name: true } },
    },
  },
} satisfies Prisma.SpellSelect;

export const SELECT_SPELL_DETAIL = {
  ...SELECT_SPELL_LIST,
  added: true,
  description: true,
  description_html: true,
  verified: true,
  verified_author_id: true,
  verified_time: true,
} satisfies Prisma.SpellSelect;

export type SpellRow<T extends Prisma.SpellSelect = typeof SELECT_SPELL_LIST> =
  Prisma.SpellGetPayload<{
    select: T;
  }> & { id: number };

function rulesTaxonomyWhere(filters: SpellTaxonomyFilterIds) {
  const conditions: Prisma.Sql[] = [];

  if (filters.schoolIds.length > 0) {
    const schoolIds = expandSchoolFilterIds(filters.schoolIds);
    conditions.push(
      Prisma.sql`s.school_id IN (${Prisma.join(schoolIds)})`,
    );
  }
  if (filters.subschoolIds.length > 0) {
    const subschoolIds = expandSubschoolFilterIds(filters.subschoolIds);
    conditions.push(
      Prisma.sql`s.sub_school_id IN (${Prisma.join(subschoolIds)})`,
    );
  }
  const descriptorIds = Array.from(
    new Set([
      ...filters.descriptorIds,
      ...expandDescriptorBucketFilterIds(filters.descriptorBuckets),
    ]),
  ).sort((a, b) => a - b);
  if (descriptorIds.length > 0) {
    conditions.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM dnd_spell_descriptors sd
        WHERE sd.spell_id = s.id
          AND sd.spelldescriptor_id IN (${Prisma.join(descriptorIds)})
      )
    `);
  }

  return conditions.length > 0
    ? Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

function rulesComponentWhere(filters: SpellComponentFilters) {
  const conditions = filters.componentKeys.map((key) => {
    if (key === "verbal") return Prisma.sql`s.verbal_component = 1`;
    if (key === "somatic") return Prisma.sql`s.somatic_component = 1`;
    if (key === "material") return Prisma.sql`s.material_component = 1`;
    if (key === "arcane_focus") {
      return Prisma.sql`s.arcane_focus_component = 1`;
    }
    if (key === "divine_focus") {
      return Prisma.sql`s.divine_focus_component = 1`;
    }
    if (key === "xp") return Prisma.sql`s.xp_component = 1`;
    if (key === "metabreath") {
      return Prisma.sql`s.meta_breath_component = 1`;
    }
    if (key === "truename") return Prisma.sql`s.true_name_component = 1`;
    return Prisma.sql`s.corrupt_component = 1`;
  });

  return conditions.length > 0
    ? Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

function rulesMechanicWhere(filters: SpellMechanicFilters) {
  const conditions: Prisma.Sql[] = [];
  const castingTimeConditions = filters.castingTimeKeys.map((key) => {
    const field = Prisma.sql`LOWER(COALESCE(s.casting_time, ''))`;
    if (key === "immediate_action") {
      return Prisma.sql`${field} LIKE '%immediate action%'`;
    }
    if (key === "swift_action") {
      return Prisma.sql`${field} LIKE '%swift action%'`;
    }
    if (key === "free_action") return Prisma.sql`${field} LIKE '%free action%'`;
    if (key === "standard_action") {
      return Prisma.sql`${field} LIKE '%standard action%'`;
    }
    if (key === "full_round_action") {
      return Prisma.sql`${field} LIKE '%full-round action%'`;
    }
    if (key === "round") {
      return Prisma.sql`(${field} LIKE '%round%' AND ${field} NOT LIKE '%full-round action%')`;
    }
    if (key === "minute") return Prisma.sql`${field} LIKE '%minute%'`;
    return Prisma.sql`${field} LIKE '%hour%'`;
  });

  if (castingTimeConditions.length > 0) {
    conditions.push(Prisma.sql`(${Prisma.join(castingTimeConditions, " OR ")})`);
  }

  const rangeConditions = filters.rangeKeys.map((key) => {
    const field = Prisma.sql`LOWER(COALESCE(s.range, ''))`;
    if (key === "personal") return Prisma.sql`${field} LIKE 'personal%'`;
    if (key === "touch") return Prisma.sql`${field} LIKE 'touch%'`;
    if (key === "close") return Prisma.sql`${field} LIKE 'close%'`;
    if (key === "medium") return Prisma.sql`${field} LIKE 'medium%'`;
    if (key === "long") return Prisma.sql`${field} LIKE 'long%'`;
    if (key === "unlimited") return Prisma.sql`${field} LIKE 'unlimited%'`;
    return Prisma.sql`COALESCE(s.range, '') GLOB '[0-9]*'`;
  });

  if (rangeConditions.length > 0) {
    conditions.push(Prisma.sql`(${Prisma.join(rangeConditions, " OR ")})`);
  }

  const durationConditions = filters.durationKeys.map((key) => {
    const field = Prisma.sql`LOWER(COALESCE(s.duration, ''))`;
    if (key === "instantaneous") {
      return Prisma.sql`${field} LIKE '%instantaneous%'`;
    }
    if (key === "permanent") return Prisma.sql`${field} LIKE '%permanent%'`;
    if (key === "concentration") {
      return Prisma.sql`${field} LIKE '%concentration%'`;
    }
    return Prisma.sql`
      (
        ${field} GLOB '*[0-9]*'
        AND ${field} NOT LIKE '%instantaneous%'
        AND ${field} NOT LIKE '%permanent%'
        AND ${field} NOT LIKE '%concentration%'
      )
    `;
  });

  if (durationConditions.length > 0) {
    conditions.push(Prisma.sql`(${Prisma.join(durationConditions, " OR ")})`);
  }

  const savingThrowConditions = filters.savingThrowKeys.map((key) => {
    const field = Prisma.sql`LOWER(COALESCE(s.saving_throw, ''))`;
    if (key === "none") {
      return Prisma.sql`(${field} = '' OR ${field} = 'none' OR ${field} LIKE 'no %')`;
    }
    if (key === "fortitude") return Prisma.sql`${field} LIKE '%fortitude%'`;
    if (key === "reflex") return Prisma.sql`${field} LIKE '%reflex%'`;
    return Prisma.sql`${field} LIKE '%will%'`;
  });

  if (savingThrowConditions.length > 0) {
    conditions.push(
      Prisma.sql`(${Prisma.join(savingThrowConditions, " OR ")})`,
    );
  }

  const spellResistanceConditions = filters.spellResistanceKeys.map((key) => {
    const field = Prisma.sql`LOWER(COALESCE(s.spell_resistance, ''))`;
    if (key === "yes") {
      return Prisma.sql`(${field} = 'yes' OR ${field} LIKE 'yes %')`;
    }
    return Prisma.sql`(${field} = 'no' OR ${field} LIKE 'no %')`;
  });

  if (spellResistanceConditions.length > 0) {
    conditions.push(
      Prisma.sql`(${Prisma.join(spellResistanceConditions, " OR ")})`,
    );
  }

  return conditions.length > 0
    ? Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

export async function fetchSpellsInOrder<T extends Prisma.SpellSelect>(
  ids: number[],
  select: T,
) {
  const rows = (await rulesPrisma.spell.findMany({
    where: { id: { in: ids } },
    select,
  })) as SpellRow<T>[]; // Prisma cannot infer `id` on generic selects; safe cast for reorder logic

  const rowById = new Map(rows.map((row) => [row.id, row]));

  return ids
    .map((id) => rowById.get(id))
    .filter((row): row is SpellRow<T> => Boolean(row));
}

export async function queryIdsByName(
  name: string,
  rulebookIds: number[],
  taxonomyFilters: SpellTaxonomyFilterIds,
  componentFilters: SpellComponentFilters,
  mechanicFilters: SpellMechanicFilters,
  maxCandidates: number,
) {
  if (rulebookIds.length === 0) return [];

  const qLower = name.toLowerCase();
  const like = `%${qLower}%`;

  const idRows = await rulesPrisma.$queryRaw<Array<{ id: number }>>(
    Prisma.sql`
        SELECT s.id
        FROM dnd_spell s
        WHERE s.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND LOWER(s.name) LIKE ${like}
          ${rulesTaxonomyWhere(taxonomyFilters)}
          ${rulesComponentWhere(componentFilters)}
          ${rulesMechanicWhere(mechanicFilters)}
        ORDER BY LOWER(s.name) ASC, s.id ASC
        LIMIT ${maxCandidates}
      `,
  );
  const ids = idRows.map((r) => Number(r.id));
  return ids;
}

export async function queryByClassAndDomainWithLevel(
  classIds: number[],
  domainIds: number[],
  level: number,
  rulebookIds: number[],
  taxonomyFilters: SpellTaxonomyFilterIds,
  componentFilters: SpellComponentFilters,
  mechanicFilters: SpellMechanicFilters,
  page: number,
  pageSize: number,
) {
  if (rulebookIds.length === 0)
    return {
      total: 0,
      spellsInOrder: [],
    };

  domainIds = domainIds.length > 0 ? domainIds : [-1];
  classIds = classIds.length > 0 ? classIds : [-1];
  // ---- 1) total = count distinct spells from idx table (spell-based pagination semantics)
  const countRows = await rulesPrisma.$queryRaw<Array<{ cnt: number }>>(
    Prisma.sql`
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT i.spell_id
        FROM idx_spell_class_level i
        WHERE i.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND i.class_id IN (${Prisma.join(classIds)})
          AND i.level = ${level}
        UNION
        SELECT j.spell_id
        FROM idx_spell_domain_level j
        WHERE j.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND j.domain_id IN (${Prisma.join(domainIds)})
          AND j.level = ${level}
      ) u
      JOIN dnd_spell s ON s.id = u.spell_id
      WHERE 1 = 1
        ${rulesTaxonomyWhere(taxonomyFilters)}
        ${rulesComponentWhere(componentFilters)}
        ${rulesMechanicWhere(mechanicFilters)}
    `,
  );
  const total = Number(countRows[0]?.cnt ?? 0);

  // ---- 2) page spell ids in stable order by Spell.name, Spell.id
  const offset = (page - 1) * pageSize;

  const idRows = await rulesPrisma.$queryRaw<Array<{ id: number }>>(
    Prisma.sql`
      SELECT s.id AS id
      FROM (
        SELECT spell_id FROM idx_spell_class_level i 
        WHERE i.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND i.class_id IN (${Prisma.join(classIds)})
          AND i.level = ${level}
        UNION
        SELECT spell_id FROM idx_spell_domain_level j
        WHERE j.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND j.domain_id IN (${Prisma.join(domainIds)})
          AND j.level = ${level}
      ) u
      JOIN dnd_spell s ON s.id = u.spell_id
      WHERE 1 = 1
        ${rulesTaxonomyWhere(taxonomyFilters)}
        ${rulesComponentWhere(componentFilters)}
        ${rulesMechanicWhere(mechanicFilters)}
      ORDER BY s.name ASC, s.id ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
  );

  const ids = idRows.map((r) => Number(r.id));
  return {
    total,
    spellsInOrder: await fetchSpellsInOrder(ids, SELECT_SPELL_LIST),
  };
}

export async function queryByClassAndDomainAllLevels(
  classIds: number[],
  domainIds: number[],
  rulebookIds: number[],
  taxonomyFilters: SpellTaxonomyFilterIds,
  componentFilters: SpellComponentFilters,
  mechanicFilters: SpellMechanicFilters,
  page: number,
  pageSize: number,
) {
  if (rulebookIds.length === 0)
    return {
      total: 0,
      spellsInOrder: [],
      levelsInOrder: [], // parallel array to spellsInOrder
    };

  // use sentinel to avoid empty IN () for SQL
  domainIds = domainIds.length > 0 ? domainIds : [-1];
  classIds = classIds.length > 0 ? classIds : [-1];

  // ---- 1) total = count distinct (spell_id, level) pairs
  const countRows = await rulesPrisma.$queryRaw<Array<{ cnt: number }>>(
    Prisma.sql`
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT i.spell_id, i.level
        FROM idx_spell_class_level i
        WHERE i.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND i.class_id IN (${Prisma.join(classIds)})
        UNION
        SELECT j.spell_id, j.level
        FROM idx_spell_domain_level j
        WHERE j.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND j.domain_id IN (${Prisma.join(domainIds)})
      ) u
      JOIN dnd_spell s ON s.id = u.spell_id
      WHERE 1 = 1
        ${rulesTaxonomyWhere(taxonomyFilters)}
        ${rulesComponentWhere(componentFilters)}
        ${rulesMechanicWhere(mechanicFilters)}
    `,
  );
  const total = Number(countRows[0]?.cnt ?? 0);

  // ---- 2) page (spell_id, level) rows in stable order by Spell.name, Spell.id, level
  const offset = (page - 1) * pageSize;

  const rowPairs = await rulesPrisma.$queryRaw<
    Array<{ id: number; level: number }>
  >(
    Prisma.sql`
      SELECT s.id AS id, u.level AS level
      FROM (
        SELECT i.spell_id, i.level
        FROM idx_spell_class_level i
        WHERE i.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND i.class_id IN (${Prisma.join(classIds)})
        UNION
        SELECT j.spell_id, j.level
        FROM idx_spell_domain_level j
        WHERE j.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND j.domain_id IN (${Prisma.join(domainIds)})
      ) u
      JOIN dnd_spell s ON s.id = u.spell_id
      WHERE 1 = 1
        ${rulesTaxonomyWhere(taxonomyFilters)}
        ${rulesComponentWhere(componentFilters)}
        ${rulesMechanicWhere(mechanicFilters)}
      ORDER BY u.level ASC, s.name ASC, s.id ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
  );

  const ids = rowPairs.map((r) => Number(r.id));
  const levelsInOrder = rowPairs.map((r) => Number(r.level));

  return {
    total,
    spellsInOrder: await fetchSpellsInOrder(ids, SELECT_SPELL_LIST),
    levelsInOrder,
  };
}

export async function querySpellDetail(id: number) {
  const s = await rulesPrisma.spell.findUnique({
    where: { id },
    select: SELECT_SPELL_DETAIL,
  });

  return s ? s : null;
}

export async function querySpellsByIds(ids: number[]): Promise<SpellRow[]> {
  if (ids.length === 0) return [];

  return rulesPrisma.spell.findMany({
    where: { id: { in: ids } },
    select: SELECT_SPELL_LIST,
  });
}

export async function queryByExactNames(
  names: string[],
  rulebookIds: RulebookId[],
): Promise<SpellRow<typeof SELECT_SPELL_MIN>[]> {
  if (names.length === 0) return [];

  const spells = await rulesPrisma.spell.findMany({
    where: { name: { in: names }, rulebook_id: { in: rulebookIds } },
    select: SELECT_SPELL_MIN,
  });

  return spells;
}
