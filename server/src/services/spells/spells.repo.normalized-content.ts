import {
  RulebookId,
  SpellComponentFilters,
  SpellMechanicFilters,
  SpellTaxonomyFilterIds,
} from "@dnd/contracts";
import { contentPrisma } from "#server/lib/content-prisma-client";
import { Prisma } from "#prisma-content/generated/client";
import { SpellRow } from "#server/services/spells/spells.repo.rules";
import {
  expandDescriptorBucketFilterIds,
  expandSchoolFilterIds,
  expandSubschoolFilterIds,
} from "#server/services/spells/taxonomy-normalization";

type LegacyShapedSpell = SpellRow & {
  added: Date;
  description: string;
  description_html: string;
  verified: boolean;
  verified_author_id: number | null;
  verified_time: Date | null;
};

function normalizedTaxonomyWhere(filters: SpellTaxonomyFilterIds) {
  const conditions: Prisma.Sql[] = [];

  const facetCondition = (facetType: string, ids: number[]) => Prisma.sql`
    EXISTS (
      SELECT 1
      FROM "SpellTaxonomyFacet" tf
      WHERE tf."spellId" = s."id"
        AND tf."facetType" = ${facetType}
        AND tf."reviewStatus" = 'accepted'
        AND tf."legacyFacetId" IN (${Prisma.join(ids)})
    )
  `;

  const descriptorFacetCondition = () => {
    const descriptorConditions: Prisma.Sql[] = [];
    const bucketLegacyIds = expandDescriptorBucketFilterIds(
      filters.descriptorBuckets,
    );

    if (filters.descriptorIds.length > 0) {
      descriptorConditions.push(
        Prisma.sql`tf."legacyFacetId" IN (${Prisma.join(filters.descriptorIds)})`,
      );
    }
    if (filters.descriptorBuckets.includes("see-text")) {
      descriptorConditions.push(Prisma.sql`tf."facetKey" = 'see-text'`);
    }
    if (bucketLegacyIds.length > 0) {
      descriptorConditions.push(
        Prisma.sql`tf."legacyFacetId" IN (${Prisma.join(bucketLegacyIds)})`,
      );
    }
    if (descriptorConditions.length === 0) return null;

    return Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "SpellTaxonomyFacet" tf
        WHERE tf."spellId" = s."id"
          AND tf."facetType" = 'descriptor'
          AND tf."reviewStatus" = 'accepted'
          AND (${Prisma.join(descriptorConditions, " OR ")})
      )
    `;
  };

  if (filters.schoolIds.length > 0) {
    conditions.push(
      facetCondition("school", expandSchoolFilterIds(filters.schoolIds)),
    );
  }
  if (filters.subschoolIds.length > 0) {
    conditions.push(
      facetCondition("subschool", expandSubschoolFilterIds(filters.subschoolIds)),
    );
  }
  const descriptorCondition = descriptorFacetCondition();
  if (descriptorCondition) {
    conditions.push(descriptorCondition);
  }

  return conditions.length > 0
    ? Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

function normalizedComponentWhere(filters: SpellComponentFilters) {
  const conditions = filters.componentKeys.map((componentType) => Prisma.sql`
    EXISTS (
      SELECT 1
      FROM "SpellComponent" cf
      WHERE cf."spellId" = s."id"
        AND cf."componentType" = ${componentType}
        AND cf."present" = true
        AND cf."reviewStatus" = 'accepted'
    )
  `);

  return conditions.length > 0
    ? Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

function normalizedMechanicWhere(filters: SpellMechanicFilters) {
  const conditions: Prisma.Sql[] = [];
  const mechanicCondition = (mechanicType: string, keys: string[]) => Prisma.sql`
    EXISTS (
      SELECT 1
      FROM "SpellMechanicFacet" mf
      WHERE mf."spellId" = s."id"
        AND mf."mechanicType" = ${mechanicType}
        AND mf."reviewStatus" = 'accepted'
        AND mf."category" IN (${Prisma.join(keys)})
    )
  `;

  if (filters.castingTimeKeys.length > 0) {
    conditions.push(
      mechanicCondition("casting_time", filters.castingTimeKeys),
    );
  }
  if (filters.rangeKeys.length > 0) {
    conditions.push(mechanicCondition("range", filters.rangeKeys));
  }
  if (filters.durationKeys.length > 0) {
    conditions.push(mechanicCondition("duration", filters.durationKeys));
  }
  if (filters.savingThrowKeys.length > 0) {
    conditions.push(mechanicCondition("saving_throw", filters.savingThrowKeys));
  }

  return conditions.length > 0
    ? Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

export async function queryNormalizedIdsByName(
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
  const idRows = await contentPrisma.$queryRaw<Array<{ id: number }>>(
    Prisma.sql`
      SELECT s."legacySpellId" AS id
      FROM "SpellContent" s
      WHERE s."sourceRulebookId" IN (${Prisma.join(rulebookIds)})
        AND LOWER(s."canonicalName") LIKE ${like}
        ${normalizedTaxonomyWhere(taxonomyFilters)}
        ${normalizedComponentWhere(componentFilters)}
        ${normalizedMechanicWhere(mechanicFilters)}
      LIMIT ${maxCandidates}
    `,
  );

  return idRows.map((row) => Number(row.id));
}

export async function fetchNormalizedSpellsInOrder(ids: number[]) {
  return hydrateNormalizedSpells(ids);
}

export async function queryNormalizedSpellDetail(id: number) {
  const rows = await hydrateNormalizedSpells([id]);
  return rows[0] ?? null;
}

export async function queryNormalizedSpellsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return hydrateNormalizedSpells(ids);
}

export async function queryNormalizedByExactNames(
  names: string[],
  rulebookIds: RulebookId[],
): Promise<SpellRow[]> {
  if (names.length === 0 || rulebookIds.length === 0) return [];

  const spells = await contentPrisma.spellContent.findMany({
    where: {
      canonicalName: { in: names },
      sourceRulebookId: { in: rulebookIds },
    },
    select: {
      legacySpellId: true,
      canonicalName: true,
      slug: true,
    },
  });

  return spells.map((spell) => ({
    id: spell.legacySpellId,
    name: spell.canonicalName,
    slug: spell.slug,
  })) as SpellRow[];
}

export async function queryNormalizedByClassAndDomainWithLevel(
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
  if (rulebookIds.length === 0) {
    return { total: 0, spellsInOrder: [] };
  }

  const classScope = classIds.length > 0 ? classIds : [-1];
  const domainScope = domainIds.length > 0 ? domainIds : [-1];

  const countRows = await contentPrisma.$queryRaw<Array<{ cnt: number }>>(
    Prisma.sql`
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT DISTINCT le."spellId"
        FROM "SpellListEntry" le
        WHERE le."rulebookId" IN (${Prisma.join(rulebookIds)})
          AND le."level" = ${level}
          AND (
            (le."listType" = 'class' AND le."ownerLegacyId" IN (${Prisma.join(classScope)}))
            OR
            (le."listType" = 'domain' AND le."ownerLegacyId" IN (${Prisma.join(domainScope)}))
          )
      ) u
      JOIN "SpellContent" s ON s."id" = u."spellId"
      WHERE 1 = 1
        ${normalizedTaxonomyWhere(taxonomyFilters)}
        ${normalizedComponentWhere(componentFilters)}
        ${normalizedMechanicWhere(mechanicFilters)}
    `,
  );
  const total = Number(countRows[0]?.cnt ?? 0);
  const offset = (page - 1) * pageSize;

  const idRows = await contentPrisma.$queryRaw<Array<{ id: number }>>(
    Prisma.sql`
      SELECT s."legacySpellId" AS id
      FROM (
        SELECT DISTINCT le."spellId"
        FROM "SpellListEntry" le
        WHERE le."rulebookId" IN (${Prisma.join(rulebookIds)})
          AND le."level" = ${level}
          AND (
            (le."listType" = 'class' AND le."ownerLegacyId" IN (${Prisma.join(classScope)}))
            OR
            (le."listType" = 'domain' AND le."ownerLegacyId" IN (${Prisma.join(domainScope)}))
          )
      ) u
      JOIN "SpellContent" s ON s."id" = u."spellId"
      WHERE 1 = 1
        ${normalizedTaxonomyWhere(taxonomyFilters)}
        ${normalizedComponentWhere(componentFilters)}
        ${normalizedMechanicWhere(mechanicFilters)}
      ORDER BY s."canonicalName" ASC, s."legacySpellId" ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
  );

  const ids = idRows.map((row) => Number(row.id));
  return { total, spellsInOrder: await hydrateNormalizedSpells(ids) };
}

export async function queryNormalizedByClassAndDomainAllLevels(
  classIds: number[],
  domainIds: number[],
  rulebookIds: number[],
  taxonomyFilters: SpellTaxonomyFilterIds,
  componentFilters: SpellComponentFilters,
  mechanicFilters: SpellMechanicFilters,
  page: number,
  pageSize: number,
) {
  if (rulebookIds.length === 0) {
    return { total: 0, spellsInOrder: [], levelsInOrder: [] };
  }

  const classScope = classIds.length > 0 ? classIds : [-1];
  const domainScope = domainIds.length > 0 ? domainIds : [-1];

  const countRows = await contentPrisma.$queryRaw<Array<{ cnt: number }>>(
    Prisma.sql`
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT le."spellId", le."level"
        FROM "SpellListEntry" le
        WHERE le."rulebookId" IN (${Prisma.join(rulebookIds)})
          AND (
            (le."listType" = 'class' AND le."ownerLegacyId" IN (${Prisma.join(classScope)}))
            OR
            (le."listType" = 'domain' AND le."ownerLegacyId" IN (${Prisma.join(domainScope)}))
          )
        GROUP BY le."spellId", le."level"
      ) u
      JOIN "SpellContent" s ON s."id" = u."spellId"
      WHERE 1 = 1
        ${normalizedTaxonomyWhere(taxonomyFilters)}
        ${normalizedComponentWhere(componentFilters)}
        ${normalizedMechanicWhere(mechanicFilters)}
    `,
  );
  const total = Number(countRows[0]?.cnt ?? 0);
  const offset = (page - 1) * pageSize;

  const rowPairs = await contentPrisma.$queryRaw<
    Array<{ id: number; level: number }>
  >(
    Prisma.sql`
      SELECT s."legacySpellId" AS id, u."level" AS level
      FROM (
        SELECT le."spellId", le."level"
        FROM "SpellListEntry" le
        WHERE le."rulebookId" IN (${Prisma.join(rulebookIds)})
          AND (
            (le."listType" = 'class' AND le."ownerLegacyId" IN (${Prisma.join(classScope)}))
            OR
            (le."listType" = 'domain' AND le."ownerLegacyId" IN (${Prisma.join(domainScope)}))
          )
        GROUP BY le."spellId", le."level"
      ) u
      JOIN "SpellContent" s ON s."id" = u."spellId"
      WHERE 1 = 1
        ${normalizedTaxonomyWhere(taxonomyFilters)}
        ${normalizedComponentWhere(componentFilters)}
        ${normalizedMechanicWhere(mechanicFilters)}
      ORDER BY u."level" ASC, s."canonicalName" ASC, s."legacySpellId" ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `,
  );

  const ids = rowPairs.map((row) => Number(row.id));
  const levelsInOrder = rowPairs.map((row) => Number(row.level));
  return {
    total,
    spellsInOrder: await hydrateNormalizedSpells(ids),
    levelsInOrder,
  };
}

async function hydrateNormalizedSpells(ids: number[]) {
  if (ids.length === 0) return [];

  const spells = await contentPrisma.spellContent.findMany({
    where: { legacySpellId: { in: ids } },
  });
  const spellIds = spells.map((spell) => spell.id);
  const rulebookIds = Array.from(
    new Set(spells.map((spell) => spell.sourceRulebookId)),
  );

  const [rulebooks, facets, listEntries, components] = await Promise.all([
    contentPrisma.rulebookContent.findMany({
      where: { legacyRulebookId: { in: rulebookIds } },
    }),
    contentPrisma.spellTaxonomyFacet.findMany({
      where: { spellId: { in: spellIds } },
      orderBy: [{ spellId: "asc" }, { facetType: "asc" }, { sortOrder: "asc" }],
    }),
    contentPrisma.spellListEntry.findMany({
      where: { spellId: { in: spellIds } },
      orderBy: [{ spellId: "asc" }, { listType: "asc" }, { level: "asc" }],
    }),
    contentPrisma.spellComponent.findMany({
      where: { spellId: { in: spellIds } },
    }),
  ]);

  const rulebookById = new Map(
    rulebooks.map((rulebook) => [rulebook.legacyRulebookId, rulebook]),
  );
  const facetsBySpell = groupBy(facets, (facet) => facet.spellId);
  const listEntriesBySpell = groupBy(listEntries, (entry) => entry.spellId);
  const componentsBySpell = groupBy(components, (component) => component.spellId);
  const spellByLegacyId = new Map(
    spells.map((spell) => [
      spell.legacySpellId,
      toLegacyShapedSpell(
        spell,
        rulebookById.get(spell.sourceRulebookId),
        facetsBySpell.get(spell.id) ?? [],
        listEntriesBySpell.get(spell.id) ?? [],
        componentsBySpell.get(spell.id) ?? [],
      ),
    ]),
  );

  return ids
    .map((id) => spellByLegacyId.get(id))
    .filter((spell): spell is LegacyShapedSpell => Boolean(spell));
}

function toLegacyShapedSpell(
  spell: any,
  rulebook: any,
  facets: any[],
  listEntries: any[],
  components: any[],
): LegacyShapedSpell {
  if (!rulebook) {
    throw new Error(`Missing RulebookContent for spell ${spell.legacySpellId}`);
  }

  const school = facets.find((facet) => facet.facetType === "school") ?? null;
  const subschool =
    facets.find((facet) => facet.facetType === "subschool") ?? null;
  const descriptors = facets.filter((facet) => facet.facetType === "descriptor");

  const componentPresent = (type: string) =>
    Boolean(
      components.find((component) => component.componentType === type)?.present,
    );

  return {
    id: spell.legacySpellId,
    slug: spell.slug,
    name: spell.canonicalName,
    page: spell.sourcePage,
    rulebook: {
      id: rulebook.legacyRulebookId,
      abbr: rulebook.abbr,
      name: rulebook.name,
      slug: rulebook.slug,
      ...(rulebook.displayAbbr ? { displayAbbr: rulebook.displayAbbr } : {}),
      ...(rulebook.displayName ? { displayName: rulebook.displayName } : {}),
    },
    spellSchool: school
      ? {
          id: school.legacyFacetId ?? 0,
          name: school.name,
          slug: school.slug ?? school.facetKey,
        }
      : null,
    spellSubschool: subschool
      ? {
          id: subschool.legacyFacetId ?? 0,
          name: subschool.name,
          slug: subschool.slug ?? subschool.facetKey,
        }
      : null,
    spellDescriptors: descriptors.map((descriptor) => ({
      spellDescriptor: {
        id: descriptor.legacyFacetId,
        name: descriptor.name,
        slug: descriptor.slug ?? descriptor.facetKey,
        rawText: descriptor.rawText,
      },
    })),
    verbal_component: componentPresent("verbal"),
    somatic_component: componentPresent("somatic"),
    material_component: componentPresent("material"),
    arcane_focus_component: componentPresent("arcane_focus"),
    divine_focus_component: componentPresent("divine_focus"),
    xp_component: componentPresent("xp"),
    meta_breath_component: componentPresent("metabreath"),
    true_name_component: componentPresent("truename"),
    corrupt_component: componentPresent("corrupt"),
    extra_components: spell.componentsRaw,
    casting_time: spell.castingTimeRaw,
    range: spell.rangeRaw,
    target: spell.targetRaw,
    effect: spell.effectRaw,
    area: spell.areaRaw,
    duration: spell.durationRaw,
    saving_throw: spell.savingThrowRaw,
    spell_resistance: spell.resistanceRaw,
    corrupt_level: spell.corruptLevel ?? null,
    spellClassIndexes: listEntries
      .filter((entry) => entry.listType === "class")
      .map((entry) => ({
        rulebookId: entry.rulebookId,
        classId: entry.ownerLegacyId,
        level: entry.level,
        extra: entry.rawExtra ?? "",
        characterClass: {
          id: entry.ownerLegacyId,
          slug: entry.ownerSlug,
          name: entry.ownerName,
          prestige: Boolean(entry.ownerPrestige),
        },
      })),
    spellDomainIndexes: listEntries
      .filter((entry) => entry.listType === "domain")
      .map((entry) => ({
        rulebookId: entry.rulebookId,
        domainId: entry.ownerLegacyId,
        level: entry.level,
        extra: entry.rawExtra ?? "",
        domain: {
          id: entry.ownerLegacyId,
          slug: entry.ownerSlug,
          name: entry.ownerName,
        },
      })),
    added: toDate(spell.addedAt),
    description: spell.descriptionText,
    description_html: spell.descriptionHtml ?? spell.descriptionText,
    verified: Boolean(spell.verified),
    verified_author_id: spell.verifiedAuthorId ?? null,
    verified_time: spell.verifiedTime ? toDate(spell.verifiedTime) : null,
  } as LegacyShapedSpell;
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function groupBy<T>(rows: T[], keyOf: (row: T) => string) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const existing = grouped.get(key);
    if (existing) existing.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
}
