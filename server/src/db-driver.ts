import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };

async function main() {
  // Option A: pick a known spell by slug (recommended if you know one)
  const slug = "fireball"; // change to any spell slug you know exists

  const spell = await prisma.spell.findFirst({
    where: { slug },
    include: {
      rulebook: { include: { edition: true } },
      spellSchool: true,
      spellSubschool: true,

      // class levels
      spellClassLevels: {
        include: { characterClass: true },
        orderBy: [{ level: "asc" }],
      },

      // domain levels
      spellDomainLevels: {
        include: { domain: true },
        orderBy: [{ level: "asc" }],
      },

      // descriptors
      spellDescriptors: {
        include: { spellDescriptor: true },
      },
    },
  });

  if (!spell) {
    console.log("No spell found for slug:", slug);
    return;
  }

  console.log({
    id: spell.id,
    name: spell.name,
    slug: spell.slug,
    source: {
      rulebook: spell.rulebook?.abbr,
      rulebookName: spell.rulebook?.name,
      edition: spell.rulebook?.edition?.name,
      page: spell.page,
    },
    school: spell.spellSchool?.name,
    subschool: spell.spellSubschool?.name ?? null,
    descriptors: spell.spellDescriptors.map((x) => x.spellDescriptor.name),
    classLevels: spell.spellClassLevels.map((x) => ({
      class: x.characterClass.name,
      level: x.level,
      extra: x.extra,
      prestige: x.characterClass.prestige,
    })),
    domainLevels: spell.spellDomainLevels.map((x) => ({
      domain: x.domain.name,
      level: x.level,
      extra: x.extra,
    })),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })