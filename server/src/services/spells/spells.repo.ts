import { appPrisma } from "~/lib/app-prisma-client";
import { rulesPrisma } from "../../lib/rules-prisma-client";
import { Prisma } from "prisma-rules-clean/generated/client";
import { Prisma as AppPrisma } from "prisma-app/generated/client";
import { I18nContext, Lang } from "@dnd/contracts";

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

export async function fetchSpellsInOrder<T extends Prisma.SpellSelect>(
  ids: number[],
  select: T,
) {
  const rows = (await rulesPrisma.spell.findMany({
    where: { id: { in: ids } },
    select,
  })) as SpellRow<T>[]; // Prisma cannot infer `id` on generic selects; safe cast for reorder logic

  const order = new Map<number, number>();
  ids.forEach((id, i) => order.set(id, i));

  rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return rows;
}

export async function queryIdsByName(
  name: string,
  rulebookIds: number[],
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
        LIMIT ${maxCandidates}
      `,
  );
  const ids = idRows.map((r) => Number(r.id));
  return ids;
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

export async function queryByClassAndDomainWithLevel(
  classIds: number[],
  domainIds: number[],
  level: number,
  rulebookIds: number[],
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
      )
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

export async function querySpellsByIds(ids: number[]) {
  if (ids.length === 0) return [];

  return rulesPrisma.spell.findMany({
    where: { id: { in: ids } },
    select: SELECT_SPELL_LIST,
  });
}

export const SELECT_SPELL_I18N_MIN = {
  spellId: true,
  lang: true,
  variant: true,
  name: true,
};

export const SELECT_SPELL_I18N_DETAIL = {
  ...SELECT_SPELL_I18N_MIN,
  descriptionHtml: true,
  descriptionText: true,
  sourceKey: true,
};

export async function querySpellI18nDetail(
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

export async function queryI18nMap(spellIds: number[], i18n: I18nContext) {
  const i18nMap = new Map<
    number,
    AppPrisma.I18nSpellTextGetPayload<{
      select: typeof SELECT_SPELL_I18N_MIN;
    }>
  >();
  if (i18n.lang != "en") {
    const spellI18n = await querySpellI18nNamesByIds(
      spellIds,
      i18n.lang,
      i18n.variant,
    );
    spellI18n.forEach((s) => i18nMap.set(s.spellId, s));
  }
  return i18nMap;
}

export async function querySpellI18nNamesByIds(
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
