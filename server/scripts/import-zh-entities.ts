import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { contentPrisma } from "~/lib/content-prisma-client";
import { rulesPrisma } from "~/lib/rules-prisma-client";
import { PrismaPromise } from "@prisma/client/runtime/client";
import { BatchPayload } from "DB_CONTENT/internal/prismaNamespace";
import { Prisma } from "DB_CONTENT/client";

type Entry = {
  id: number; // classId
  name: string; // English name (reference)
  zh: string; // Chinese translation
};

const LANG = "zh";
const VARIANT = "default";
const DEFAULT_I18N_DIR = path.resolve(__dirname, "..", "..", "data", "i18n");
const I18N_DIR = path.resolve(process.env.ZH_ENTITY_I18N_DIR ?? DEFAULT_I18N_DIR);

function readEntries(fileName: string): Entry[] {
  const filePath = path.join(I18N_DIR, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON array`);
  }
  return parsed as Entry[];
}

const zhClassJson = readEntries("classes-zh.json");
const zhDomainJson = readEntries("domains-zh.json");
const zhRulebookJson = readEntries("rulebooks-zh.json");
const zhDescriptorJson = readEntries("descriptors-zh.json");
const zhSchoolJson = readEntries("schools-zh.json");
const zhSubschoolJson = readEntries("subschools-zh.json");

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

async function importEntityI18n<Row>(cfg: {
  label: string;
  lang: string;
  variant: string;

  // json input
  entries: Entry[];

  // rules db: id -> english name
  getSourceMap: () => Promise<Map<number, string>>;

  // app db ops
  deleteMany: (args: {
    where: { lang: string; variant: string };
  }) => PrismaPromise<BatchPayload>;
  createMany: (args: { data: Row[] }) => PrismaPromise<BatchPayload>;

  // mapping
  makeRow: (e: Entry) => Row;
}) {
  const {
    label,
    lang,
    variant,
    entries,
    getSourceMap,
    deleteMany,
    createMany,
    makeRow,
  } = cfg;

  const sourceMap = await getSourceMap();

  // 1) Validate ids in JSON exist in rules DB
  const badIds: number[] = [];
  for (const e of entries) if (!sourceMap.has(e.id)) badIds.push(e.id);
  if (badIds.length) {
    console.warn(
      `[WARN] ${label}: JSON contains ids not present in rules DB: ${badIds.join(", ")}`,
    );
  }

  // 2) Validate JSON coverage (ids present in rules DB but missing in JSON)
  const missingIds: number[] = [];
  for (const id of sourceMap.keys()) {
    if (!entries.some((e) => e.id === id)) missingIds.push(id);
  }
  if (missingIds.length) {
    console.warn(
      `[WARN] ${label}: rules DB has ids missing from zh JSON: ${missingIds.slice(0, 30).join(", ")}${
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
  for (const e of entries) {
    const rulesName = sourceMap.get(e.id);
    if (!rulesName) continue;
    if (norm(rulesName) !== norm(e.name)) {
      nameMismatches.push({ id: e.id, rulesName, jsonName: e.name });
    }
  }
  if (nameMismatches.length) {
    console.warn(
      `[WARN] ${label}: English name mismatches (json may be stale):`,
    );
    for (const m of nameMismatches.slice(0, 20)) {
      console.warn(`  id=${m.id} rules="${m.rulesName}" json="${m.jsonName}"`);
    }
    if (nameMismatches.length > 20)
      console.warn(`  ... (+${nameMismatches.length - 20} more)`);
  }

  // 4) Import: wipe + insert
  const rows: Row[] = entries.map(makeRow);

  await contentPrisma.$transaction([
    deleteMany({ where: { lang, variant } }),
    createMany({ data: rows }),
  ]);

  console.log(
    `[OK] Imported ${rows.length} ${label} rows for lang=${lang} variant=${variant}`,
  );
}

async function importClasses() {
  await importEntityI18n<Prisma.I18nCharacterClassTextCreateManyInput>({
    label: "I18nCharacterClassText",
    lang: LANG,
    variant: VARIANT,
    entries: zhClassJson,

    getSourceMap: async () => {
      const rows = await rulesPrisma.spellClassIndex.findMany({
        select: { classId: true, characterClass: { select: { name: true } } },
        distinct: ["classId"],
        orderBy: [{ classId: "asc" }],
      });
      const m = new Map<number, string>();
      for (const r of rows) m.set(r.classId, r.characterClass.name);
      return m;
    },

    deleteMany: contentPrisma.i18nCharacterClassText.deleteMany,
    createMany: contentPrisma.i18nCharacterClassText.createMany,

    makeRow: (e) => ({
      classId: e.id,
      lang: LANG,
      variant: VARIANT,
      name: e.zh?.trim() ? e.zh.trim() : null,
    }),
  });
}

async function importDomains() {
  await importEntityI18n<Prisma.I18nDomainTextCreateManyInput>({
    label: "I18nDomainText",
    lang: LANG,
    variant: VARIANT,
    entries: zhDomainJson,

    getSourceMap: async () => {
      const rows = await rulesPrisma.spellDomainIndex.findMany({
        select: { domainId: true, domain: { select: { name: true } } },
        distinct: ["domainId"],
        orderBy: [{ domainId: "asc" }],
      });
      const m = new Map<number, string>();
      for (const r of rows) m.set(r.domainId, r.domain.name);
      return m;
    },

    deleteMany: contentPrisma.i18nDomainText.deleteMany,
    createMany: contentPrisma.i18nDomainText.createMany,

    makeRow: (e) => ({
      domainId: e.id,
      lang: LANG,
      variant: VARIANT,
      name: e.zh?.trim() ? e.zh.trim() : null,
    }),
  });
}

async function importRulebooks() {
  await importEntityI18n<Prisma.I18nRulebookTextCreateManyInput>({
    label: "I18nRulebookText",
    lang: LANG,
    variant: VARIANT,
    entries: zhRulebookJson,

    getSourceMap: async () => {
      const rows = await rulesPrisma.rulebook.findMany({
        select: { id: true, name: true },
        orderBy: [{ id: "asc" }],
      });
      const m = new Map<number, string>();
      for (const r of rows) m.set(r.id, r.name);
      return m;
    },

    deleteMany: contentPrisma.i18nRulebookText.deleteMany,
    createMany: contentPrisma.i18nRulebookText.createMany,

    makeRow: (e) => ({
      rulebookId: e.id,
      lang: LANG,
      variant: VARIANT,
      name: e.zh?.trim() ? e.zh.trim() : null,
    }),
  });
}

async function importSchools() {
  await importEntityI18n<Prisma.I18nSpellSchoolTextCreateManyInput>({
    label: "I18nSpellSchoolText",
    lang: LANG,
    variant: VARIANT,
    entries: zhSchoolJson,

    getSourceMap: async () => {
      const rows = await rulesPrisma.spellSchool.findMany({
        select: { id: true, name: true },
        orderBy: [{ id: "asc" }],
      });
      const m = new Map<number, string>();
      for (const r of rows) m.set(r.id, r.name);
      return m;
    },

    deleteMany: (args) => contentPrisma.i18nSpellSchoolText.deleteMany(args),
    createMany: (args) => contentPrisma.i18nSpellSchoolText.createMany(args),

    makeRow: (e) => ({
      schoolId: e.id,
      lang: LANG,
      variant: VARIANT,
      name: e.zh?.trim() ? e.zh.trim() : null,
    }),
  });
}

async function importSubschools() {
  await importEntityI18n<Prisma.I18nSpellSubschoolTextCreateManyInput>({
    label: "I18nSpellSubschoolText",
    lang: LANG,
    variant: VARIANT,
    entries: zhSubschoolJson,

    getSourceMap: async () => {
      const rows = await rulesPrisma.spellSubschool.findMany({
        select: { id: true, name: true },
        orderBy: [{ id: "asc" }],
      });
      const m = new Map<number, string>();
      for (const r of rows) m.set(r.id, r.name);
      return m;
    },

    deleteMany: (args) => contentPrisma.i18nSpellSubschoolText.deleteMany(args),
    createMany: (args) => contentPrisma.i18nSpellSubschoolText.createMany(args),

    makeRow: (e) => ({
      subschoolId: e.id,
      lang: LANG,
      variant: VARIANT,
      name: e.zh?.trim() ? e.zh.trim() : null,
    }),
  });
}

async function importDescriptors() {
  await importEntityI18n<Prisma.I18nDescriptorTextCreateManyInput>({
    label: "I18nDescriptorText",
    lang: LANG,
    variant: VARIANT,
    entries: zhDescriptorJson,

    getSourceMap: async () => {
      const rows = await rulesPrisma.spellDescriptor.findMany({
        select: { id: true, name: true },
        orderBy: [{ id: "asc" }],
      });
      const m = new Map<number, string>();
      for (const r of rows) m.set(r.id, r.name);
      return m;
    },

    deleteMany: (args) => contentPrisma.i18nDescriptorText.deleteMany(args),
    createMany: (args) => contentPrisma.i18nDescriptorText.createMany(args),

    makeRow: (e) => ({
      descriptorId: e.id,
      lang: LANG,
      variant: VARIANT,
      name: e.zh?.trim() ? e.zh.trim() : null,
    }),
  });
}

async function main() {
  await importClasses();
  await importDomains();
  await importRulebooks();
  await importSchools();
  await importSubschools();
  await importDescriptors();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await rulesPrisma.$disconnect();
    await contentPrisma.$disconnect();
  });
