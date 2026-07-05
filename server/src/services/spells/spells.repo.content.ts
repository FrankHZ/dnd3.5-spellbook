import {
  I18nContext,
  Lang,
  RulebookId,
  SpellComponentFilters,
  SpellMechanicFilters,
  SpellTaxonomyFilterIds,
} from "@dnd/contracts";
import { Prisma as ContentPrisma, Prisma } from "#prisma-content/generated/client";
import { contentPrisma } from "#server/lib/content-prisma-client";
import {
  expandDescriptorBucketFilterIds,
  expandSchoolFilterIds,
  expandSubschoolFilterIds,
} from "#server/services/spells/taxonomy-normalization";

export const SELECT_SPELL_I18N_MIN = {
  spellId: true,
  lang: true,
  variant: true,
  name: true,
} satisfies Prisma.I18nSpellTextSelect;

export const SELECT_SPELL_I18N_DETAIL = {
  ...SELECT_SPELL_I18N_MIN,
  descriptionHtml: true,
  descriptionText: true,
  sourceKey: true,
} satisfies Prisma.I18nSpellTextSelect;

export const SELECT_SPELL_I18N_SUMMARY = {
  spellId: true,
  rulebookId: true,
  lang: true,
  variant: true,
  summaryText: true,
  sourceKey: true,
} satisfies Prisma.I18nSpellSummaryTextSelect;

export type SpellI18nRow<
  T extends Prisma.I18nSpellTextSelect = typeof SELECT_SPELL_I18N_MIN,
> = Prisma.I18nSpellTextGetPayload<{
  select: T;
}>;

export type SpellI18nSummaryRow =
  ContentPrisma.I18nSpellSummaryTextGetPayload<{
    select: typeof SELECT_SPELL_I18N_SUMMARY;
  }>;

function summaryTarget(i18n: I18nContext): { lang: Lang; variant: string } {
  if (i18n.lang === "en") {
    return { lang: "en", variant: "imarvin" };
  }
  return { lang: i18n.lang, variant: i18n.variant ?? "chm" };
}

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
  if (filters.spellResistanceKeys.length > 0) {
    conditions.push(
      mechanicCondition("spell_resistance", filters.spellResistanceKeys),
    );
  }

  return conditions.length > 0
    ? Prisma.sql`AND ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

export async function queryIdsByI18nName(
  lang: Lang,
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

  const idRows = await contentPrisma.$queryRaw<Array<{ spellId: number }>>(
    Prisma.sql`
        SELECT i.spellId
        FROM I18nSpellText i
        JOIN "SpellContent" s ON s."legacySpellId" = i.spellId
        WHERE i.rulebookId IN (${Prisma.join(rulebookIds)})
          AND LOWER(i.name) LIKE ${like}
          AND i.lang = ${lang}
          ${normalizedTaxonomyWhere(taxonomyFilters)}
          ${normalizedComponentWhere(componentFilters)}
          ${normalizedMechanicWhere(mechanicFilters)}
        LIMIT ${maxCandidates}
      `,
  );

  const ids = idRows.map((r) => Number(r.spellId));

  return ids;
}

export async function queryI18nDetail(
  id: number,
  lang: "zh",
  variant?: string,
) {
  const s = await contentPrisma.i18nSpellText.findUnique({
    where: {
      spellId_lang_variant: {
        spellId: id,
        lang,
        ...(variant ? { variant } : { variant: "chm" }),
      },
    },
    select: SELECT_SPELL_I18N_DETAIL,
  });

  return s ? s : null;
}

export async function queryI18nSummaryDetail(id: number, i18n: I18nContext) {
  const target = summaryTarget(i18n);
  const summary = await contentPrisma.i18nSpellSummaryText.findUnique({
    where: {
      spellId_lang_variant: {
        spellId: id,
        lang: target.lang,
        variant: target.variant,
      },
    },
    select: SELECT_SPELL_I18N_SUMMARY,
  });

  return summary ? summary : null;
}

export async function queryI18nMap(
  spellIds: number[],
  i18n: I18nContext,
): Promise<Map<number, SpellI18nRow>> {
  const i18nMap = new Map<
    number,
    ContentPrisma.I18nSpellTextGetPayload<{
      select: typeof SELECT_SPELL_I18N_MIN;
    }>
  >();
  if (i18n.lang != "en") {
    const spellI18n = await queryI18nNamesByIds(
      spellIds,
      i18n.lang,
      i18n.variant,
    );
    spellI18n.forEach((s) => i18nMap.set(s.spellId, s));
  }
  return i18nMap;
}

export async function queryI18nSummaryMap(
  spellIds: number[],
  i18n: I18nContext,
): Promise<Map<number, SpellI18nSummaryRow>> {
  const summaryMap = new Map<number, SpellI18nSummaryRow>();
  if (spellIds.length === 0) return summaryMap;

  const target = summaryTarget(i18n);
  const summaries = await contentPrisma.i18nSpellSummaryText.findMany({
    where: {
      spellId: { in: spellIds },
      lang: target.lang,
      variant: target.variant,
    },
    select: SELECT_SPELL_I18N_SUMMARY,
  });
  summaries.forEach((summary) => summaryMap.set(summary.spellId, summary));
  return summaryMap;
}

export async function queryI18nNamesByIds(
  ids: number[],
  lang: "zh",
  variant?: string,
) {
  const s = await contentPrisma.i18nSpellText.findMany({
    where: {
      spellId: { in: ids },
      lang,
      ...(variant ? { variant } : { variant: "chm" }),
    },
    select: SELECT_SPELL_I18N_MIN,
  });

  return s;
}

// Does not check alias for now
export async function queryByExactI18nNames(
  names: string[],
  rulebookIds: RulebookId[],
  lang: "zh",
  variant?: string,
) {
  if (names.length === 0) return [];

  const rows = await contentPrisma.i18nSpellText.findMany({
    where: {
      lang,
      name: { in: names },
      rulebookId: { in: rulebookIds },
      ...(variant ? { variant } : { variant: "chm" }),
    },
    select: SELECT_SPELL_I18N_MIN,
  });

  return rows;
}
