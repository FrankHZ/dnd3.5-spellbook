import { rulesPrisma as prisma } from "../../lib/rules-prisma-client";
import { Prisma } from "prisma-rules-clean/generated/client";

const SELECT_SPELL_MIN = {
  id: true,
  slug: true,
  name: true,
} satisfies Prisma.SpellSelect;

const SELECT_SPELL_LIST = {
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

const SELECT_SPELL_DETAIL = {
  ...SELECT_SPELL_LIST,
  added: true,
  description: true,
  description_html: true,
  verified: true,
  verified_author_id: true,
  verified_time: true,
} satisfies Prisma.SpellSelect;

export async function fetchSpellsInOrder<T extends Prisma.SpellSelect>(
  ids: number[],
  select: T,
) {
  if (ids.length === 0) return [];

  const rows = (await prisma.spell.findMany({
    where: { id: { in: ids } },
    select,
  })) as (Prisma.SpellGetPayload<{ select: T }> & { id: number })[]; // Prisma cannot infer `id` on generic selects; safe cast for reorder logic

  const order = new Map<number, number>();
  ids.forEach((id, i) => order.set(id, i));

  rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return rows;
}

export async function queryByName(
  name: string,
  rulebookIds: number[],
  page: number,
  pageSize: number,
) {
  const qLower = name.toLowerCase();
  const like = `%${qLower}%`;
  const offset = (page - 1) * pageSize;

  // COUNT (spells only)
  const countRows = await prisma.$queryRaw<Array<{ cnt: number }>>(
    Prisma.sql`
        SELECT COUNT(*) as cnt
        FROM dnd_spell s
        WHERE s.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND LOWER(s.name) LIKE ${like}
      `,
  );

  const total = Number(countRows[0]?.cnt ?? 0);

  // PAGE of spell ids in stable order
  const idRows = await prisma.$queryRaw<Array<{ id: number }>>(
    Prisma.sql`
        SELECT s.id
        FROM dnd_spell s
        WHERE s.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND LOWER(s.name) LIKE ${like}
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

export async function queryByClassAndDomainLevels(
  classIds: number[],
  domainIds: number[],
  level: number,
  rulebookIds: number[],
  page: number,
  pageSize: number,
) {
  domainIds = domainIds.length > 0 ? domainIds : [-1];
  classIds = classIds.length > 0 ? classIds : [-1];
  // ---- 1) total = count distinct spells from idx table (spell-based pagination semantics)
  const countRows = await prisma.$queryRaw<Array<{ cnt: number }>>(
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

  const idRows = await prisma.$queryRaw<Array<{ id: number }>>(
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

export async function querySpellDetail(id: number) {
  const s = await prisma.spell.findUnique({
    where: { id },
    select: SELECT_SPELL_DETAIL,
  });

  return s ? s : null;
}

export async function querySpellsByIds(ids: number[]) {
  if (ids.length === 0) return [];

  return prisma.spell.findMany({
    where: { id: { in: ids } },
    select: SELECT_SPELL_LIST,
  });
}
