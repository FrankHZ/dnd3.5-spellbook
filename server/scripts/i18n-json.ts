import { rulesPrisma } from "#server/lib/rules-prisma-client";
import path from "node:path";
import { writeFileSync } from "node:fs";

const outDir = "./out/i18n";

type Entry = { id: number; name: string };

function buildI18nJson(entries: Entry[]) {
  return entries.map((e) => ({ ...e, zh: "" }));
}

async function main() {
  const classes = (
    await rulesPrisma.spellClassIndex.findMany({
      select: {
        classId: true,
        characterClass: { select: { name: true } },
      },
      distinct: ["classId"],
      orderBy: [{ classId: "asc" }],
    })
  ).map((c) => ({ id: c.classId, name: c.characterClass.name }));

  const domains = await rulesPrisma.domain.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ id: "asc" }],
  });

  const schools = await rulesPrisma.spellSchool.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ id: "asc" }],
  });

  const subschools = await rulesPrisma.spellSubschool.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ id: "asc" }],
  });

  const descriptors = await rulesPrisma.spellDescriptor.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ id: "asc" }],
  });

  const rulebooks = (
    await rulesPrisma.spell.findMany({
      select: {
        rulebook_id: true,
        rulebook: { select: { name: true } },
      },
      orderBy: [{ rulebook_id: "asc" }],
      distinct: ["rulebook_id"],
    })
  ).map((b) => ({ name: b.rulebook.name, id: b.rulebook_id }));

  [
    { entries: classes, name: "classes" },
    { entries: domains, name: "domains" },
    { entries: schools, name: "schools" },
    { entries: subschools, name: "subschools" },
    { entries: descriptors, name: "descriptors" },
    { entries: rulebooks, name: "rulebooks" },
  ].forEach((f) => {
    writeFileSync(
      path.join(outDir, `${f.name}.json`),
      JSON.stringify(buildI18nJson(f.entries), null, 2),
      "utf8",
    );
  });
}

main().finally(async () => rulesPrisma.$disconnect());
