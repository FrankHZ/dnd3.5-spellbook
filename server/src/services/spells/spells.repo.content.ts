import { I18nContext, Lang, RulebookId } from "@dnd/contracts";
import { Prisma as ContentPrisma, Prisma } from "prisma-content/generated/client";
import { contentPrisma } from "~/lib/content-prisma-client";

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

export async function queryIdsByI18nName(
  lang: Lang,
  name: string,
  rulebookIds: number[],
  maxCandidates: number,
) {
  if (rulebookIds.length === 0) return [];
  const qLower = name.toLowerCase();
  const like = `%${qLower}%`;

  const idRows = await contentPrisma.$queryRaw<Array<{ spellId: number }>>(
    Prisma.sql`
        SELECT s.spellId
        FROM I18nSpellText s
        WHERE s.rulebookId IN (${Prisma.join(rulebookIds)})
          AND LOWER(s.name) LIKE ${like}
          AND s.lang = ${lang}
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
