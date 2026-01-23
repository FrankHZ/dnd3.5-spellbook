import { prisma } from "../../prisma";
import { Prisma } from "../../../generated/prisma/client";

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
  console.log(idRows);
  const ids = idRows.map((r) => Number(r.id));
  if (ids.length === 0) {
    return { total: 0, spellsInOrder: [] };
  }

  // Fetch full rows via Prisma (relations, descriptors, etc.)
  const spellRows = await prisma.spell.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      name: true,
      page: true,
      rulebook: { select: { id: true, abbr: true } },
      spellSchool: { select: { id: true, name: true, slug: true } },
      spellSubschool: { select: { id: true, name: true, slug: true } },
      spellDescriptors: {
        select: {
          spellDescriptor: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  // Preserve the SQL ordering (since IN(...) has no order guarantee)
  const order = new Map<number, number>();
  ids.forEach((id, idx) => order.set(id, idx));
  spellRows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  console.log(spellRows);

  return { total, spellsInOrder: spellRows };
}
export async function queryByClassLevel(
  classIds: number[],
  level: number,
  rulebookIds: number[],
  page: number,
  pageSize: number,
) {
  const where = {
    rulebook_id: { in: rulebookIds },
    spellClassLevels: {
      some: {
        character_class_id: { in: classIds },
        level: level,
      },
    },
  };

  const [total, spellRows] = await Promise.all([
    prisma.spell.count({ where }),
    prisma.spell.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        page: true,
        rulebook: { select: { id: true, abbr: true } },
        spellSchool: { select: { id: true, name: true, slug: true } },
        spellSubschool: { select: { id: true, name: true, slug: true } },
        spellDescriptors: {
          select: {
            spellDescriptor: { select: { id: true, name: true, slug: true } },
          },
        },
        spellClassLevels: {
          where: {
            character_class_id: { in: classIds },
            level: level,
          },
          select: {
            character_class_id: true,
            level: true,
            extra: true,
            characterClass: {
              select: { id: true, slug: true, name: true, prestige: true },
            },
          },
          orderBy: [{ character_class_id: "asc" }],
        },
      },
    }),
  ]);

  return { total, spellsInOrder: spellRows };
}

export async function querySpellDetail(id: number) {
  const s = await prisma.spell.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      added: true,
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

      description: true,
      description_html: true,

      corrupt_level: true,

      verified: true,
      verified_author_id: true,
      verified_time: true,

      spellClassLevels: {
        select: {
          level: true,
          extra: true,
          characterClass: {
            select: { id: true, slug: true, name: true, prestige: true },
          },
        },
      },

      spellDomainLevels: {
        select: {
          level: true,
          extra: true,
          domain: { select: { id: true, slug: true, name: true } },
        },
      },
    },
  });

  return s ? s : null;
}
