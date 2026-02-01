// Usage (example): npx tsx scripts/zh-backcheck.ts ./out/matched.json ./out/missing-zh.json

import fs from "node:fs";
import path from "node:path";
import { prisma } from "../../../prisma";

type MatchedEntry = {
  spellId: number | null;
  rulebookId: number | null;
  rulebookAbbr?: string | null;
  enName?: string;
  zhName?: string;
  sourceKey?: string;
};

async function main() {
  const matchedPath = process.argv[2];
  const outPath = process.argv[3] ?? "./missing-zh.json";

  if (!matchedPath) {
    console.error(
      "Missing args. Example: npx tsx scripts/zh-backcheck.ts ./out/matched.json ./out/missing-zh.json",
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(matchedPath, "utf-8");
  const matched = JSON.parse(raw) as MatchedEntry[];

  // 1) collect rulebookIds + spellIds from matched entries
  const rulebookIdSet = new Set<number>();
  const matchedSpellIdSet = new Set<number>();

  for (const r of matched) {
    if (typeof r.rulebookId === "number") rulebookIdSet.add(r.rulebookId);
    if (typeof r.spellId === "number") matchedSpellIdSet.add(r.spellId);
  }

  const rulebookIds = [...rulebookIdSet].sort((a, b) => a - b);
  const matchedSpellIds = [...matchedSpellIdSet];

  if (rulebookIds.length === 0) {
    console.error("No rulebookIds found in matched.json");
    process.exit(1);
  }

  // 2) fetch all spells in those rulebooks
  const spells = await prisma.spell.findMany({
    where: { rulebook_id: { in: rulebookIds } },
    select: { id: true, name: true, rulebook_id: true },
  });

  // 3) filter spells that do NOT have a matched entry
  const missing = spells.filter((s) => !matchedSpellIdSet.has(s.id));

  // 4) decorate with rulebook info + group by rulebook
  const rulebooks = await prisma.rulebook.findMany({
    where: { id: { in: rulebookIds } },
    select: { id: true, abbr: true, name: true },
  });
  const rbById = new Map(rulebooks.map((r) => [r.id, r]));

  const grouped: Record<
    string,
    {
      rulebookId: number;
      rulebookAbbr: string;
      rulebookName: string;
      missingSpells: Array<{ id: number; name: string }>;
    }
  > = {};

  for (const s of missing) {
    const rb = rbById.get(s.rulebook_id);
    const abbr = rb?.abbr ?? `rb_${s.rulebook_id}`;
    const key = `${abbr}#${s.rulebook_id}`;

    if (!grouped[key]) {
      grouped[key] = {
        rulebookId: s.rulebook_id,
        rulebookAbbr: rb?.abbr ?? "",
        rulebookName: rb?.name ?? "",
        missingSpells: [],
      };
    }

    grouped[key]!.missingSpells.push({ id: s.id, name: s.name });
  }

  // stable output
  for (const k of Object.keys(grouped)) {
    grouped[k]!.missingSpells.sort((a, b) => a.name.localeCompare(b.name));
  }

  const report = {
    inputMatched: path.resolve(matchedPath),
    rulebookIds,
    matchedSpellCount: matchedSpellIds.length,
    totalSpellCountInBooks: spells.length,
    missingCount: missing.length,
    grouped,
  };

  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`Rulebooks checked: ${rulebookIds.length}`);
  console.log(`Spells in those books: ${spells.length}`);
  console.log(`Matched spellIds: ${matchedSpellIds.length}`);
  console.log(`Missing zh entries: ${missing.length}`);
  console.log(`Wrote: ${path.resolve(outPath)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
