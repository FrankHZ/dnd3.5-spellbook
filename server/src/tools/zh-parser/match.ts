import { Prisma } from "DB_RULES/client";
import { rulesPrismaClient as prisma } from "~/lib/rules-prisma-client";
import aliasMapGlobal from "DATA/enName-aliases-global.json";
import aliasMapExtra from "DATA/enName-aliases-extra.json";
import bookMap from "DATA/books-zh-mapping.json";

const ZH_BOOK_MAP: Record<string, string> = bookMap;
const EN_ALIAS_MAP_GLOBAL: Record<string, string> = aliasMapGlobal;
const EN_ALIAS_EXTRA: Record<string, string[]> = aliasMapExtra;

let rulebookIds: null | number[] = null;
let rulebookAbbrMap: null | Map<number, string> = null;

async function load() {
  if (rulebookIds && rulebookAbbrMap) {
    return { rulebookIds, rulebookAbbrMap };
  }
  const abbrs = Object.values(ZH_BOOK_MAP);
  const rulebooks = await prisma.rulebook.findMany({
    where: { abbr: { in: abbrs } },
    select: { abbr: true, id: true },
  });

  rulebookIds = rulebooks.map((r) => Number(r.id));
  rulebookAbbrMap = new Map();
  rulebooks.forEach((r) => rulebookAbbrMap?.set(r.id, r.abbr));
  return { rulebookIds, rulebookAbbrMap };
}

type FailReason =
  | "unknownBookLabel"
  | "missingRulebookInDb"
  | "missingSpellInDb";

export type MatchResult = {
  spellId: number | null;
  rulebookId: number | null;
  rulebookAbbr: string | null;
  chmBookLabels: string[];
  matchMethod: string;
  matchConfidence: number;
  failReason?: FailReason;
};

export async function matchByEnNameAllBooks(opts: {
  enName: string; // already normalized
  bookLabels: string[];
}): Promise<MatchResult[]> {
  const { rulebookIds, rulebookAbbrMap } = await load();

  let enName = opts.enName;
  if (EN_ALIAS_MAP_GLOBAL[enName])
    enName = EN_ALIAS_MAP_GLOBAL[enName] as string;

  const rows = await prisma.$queryRaw<
    Array<{ id: number; rulebook_id: number }>
  >(
    Prisma.sql`
      SELECT s.id, s.rulebook_id
      FROM dnd_spell s
      WHERE s.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND LOWER(s.name) = LOWER(${enName})
    `,
  );

  if (rows.length === 0) {
    return [
      {
        spellId: null,
        rulebookId: null,
        rulebookAbbr: null,
        chmBookLabels: opts.bookLabels,
        matchMethod: `match:enExactCiAllBooksMiss`,
        matchConfidence: 0,
        failReason: "missingSpellInDb",
      },
    ];
  }

  const results: MatchResult[] = rows.map((r) => ({
    spellId: Number(r.id),
    rulebookId: Number(r.rulebook_id),
    rulebookAbbr: rulebookAbbrMap.get(Number(r.rulebook_id)) ?? null,
    chmBookLabels: opts.bookLabels,
    matchMethod: `match:enExactCiAllBooks; expand:${rows.length}`,
    matchConfidence: 1.0,
    flags: ["MULTI_BOOK_BY_ENNAME"],
  }));

  if (EN_ALIAS_EXTRA[enName]) {
    const extraNames = EN_ALIAS_EXTRA[enName] as string[];
    for (const name of extraNames) {
      const extraResults = await matchByEnNameAllBooks({
        enName: name,
        bookLabels: opts.bookLabels,
      });
      extraResults.forEach((r) => results.push(r));
    }
  }

  return results;
}
