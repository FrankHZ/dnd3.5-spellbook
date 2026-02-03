import "dotenv/config";
import { appPrisma } from "~/lib/app-prisma-client";
import { rulesPrisma } from "~/lib/rules-prisma-client";
import zhClassJson from "DATA/i18n/classes-zh.json";

type Entry = {
  id: number; // classId
  name: string; // English name (reference)
  zh: string; // Chinese translation
};

const LANG = "zh";
const VARIANT = "default";
const zhClasses: Entry[] = zhClassJson;

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

async function importClasses() {
  // Source of truth: what classes exist in scoped rules DB
  const sourceClasses = await rulesPrisma.spellClassIndex.findMany({
    select: {
      classId: true,
      characterClass: { select: { name: true } },
    },
    distinct: ["classId"],
    orderBy: [{ classId: "asc" }],
  });

  const classMap = new Map<number, { name: string }>();
  for (const c of sourceClasses) {
    classMap.set(c.classId, { name: c.characterClass.name });
  }

  // 1) Validate ids in JSON exist in rules DB
  const badIds: number[] = [];
  for (const c of zhClasses) {
    if (!classMap.has(c.id)) badIds.push(c.id);
  }
  if (badIds.length) {
    console.warn(
      `[WARN] zhClasses contains ids not present in rules DB: ${badIds.join(", ")}`,
    );
  }

  // 2) Validate JSON coverage (optional but useful)
  const missingIds: number[] = [];
  for (const classId of classMap.keys()) {
    if (!zhClasses.some((c) => c.id === classId)) missingIds.push(classId);
  }
  if (missingIds.length) {
    console.warn(
      `[WARN] rules DB has classIds missing from zh JSON: ${missingIds.slice(0, 30).join(", ")}${
        missingIds.length > 30 ? ` ... (+${missingIds.length - 30})` : ""
      }`,
    );
  }

  // 3) Validate English name matches (stale json detection)
  const nameMismatches: Array<{
    id: number;
    rulesName: string;
    jsonName: string;
  }> = [];
  for (const c of zhClasses) {
    const src = classMap.get(c.id);
    if (!src) continue;
    if (norm(src.name) !== norm(c.name)) {
      nameMismatches.push({ id: c.id, rulesName: src.name, jsonName: c.name });
    }
  }
  if (nameMismatches.length) {
    console.warn(`[WARN] English name mismatches (json may be stale):`);
    for (const m of nameMismatches.slice(0, 20)) {
      console.warn(`  id=${m.id} rules="${m.rulesName}" json="${m.jsonName}"`);
    }
    if (nameMismatches.length > 20) {
      console.warn(`  ... (+${nameMismatches.length - 20} more)`);
    }
  }

  // 4) Import: wipe current lang+variant then insert
  const rows = zhClasses.map((c) => ({
    classId: c.id,
    lang: LANG,
    variant: VARIANT,
    name: c.zh?.trim() ? c.zh.trim() : null,
  }));

  await appPrisma.$transaction([
    appPrisma.i18nCharacterClassText.deleteMany({
      where: { lang: LANG, variant: VARIANT },
    }),
    appPrisma.i18nCharacterClassText.createMany({
      data: rows,
    }),
  ]);

  console.log(
    `[OK] Imported ${rows.length} I18nCharacterClassText rows for lang=${LANG} variant=${VARIANT}`,
  );
}

async function main() {
  await importClasses();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await rulesPrisma.$disconnect();
    await appPrisma.$disconnect();
  });
