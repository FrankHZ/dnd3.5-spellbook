import { I18nContext, Lang, RulebookId } from "@dnd/contracts";
import { Prisma as AppPrisma, Prisma } from "prisma-app/generated/client";
import { appPrisma } from "~/lib/app-prisma-client";

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

export type SpellI18nRow<
  T extends Prisma.I18nSpellTextSelect = typeof SELECT_SPELL_I18N_MIN,
> = Prisma.I18nSpellTextGetPayload<{
  select: T;
}>;

export async function queryIdsByI18nName(
  lang: Lang,
  name: string,
  rulebookIds: number[],
  maxCandidates: number,
) {
  if (rulebookIds.length === 0) return [];
  const qLower = name.toLowerCase();
  const like = `%${qLower}%`;

  const idRows = await appPrisma.$queryRaw<Array<{ spellId: number }>>(
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
  const s = await appPrisma.i18nSpellText.findUnique({
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

export async function queryI18nMap(
  spellIds: number[],
  i18n: I18nContext,
): Promise<Map<number, SpellI18nRow>> {
  const i18nMap = new Map<
    number,
    AppPrisma.I18nSpellTextGetPayload<{
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

export async function queryI18nNamesByIds(
  ids: number[],
  lang: "zh",
  variant?: string,
) {
  const s = await appPrisma.i18nSpellText.findMany({
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

  const rows = await appPrisma.i18nSpellText.findMany({
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
