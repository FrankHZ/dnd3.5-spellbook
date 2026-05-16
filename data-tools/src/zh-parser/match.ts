import { Prisma } from "prisma-rules-clean/generated/client";
import { rulesPrisma as prisma } from "../db/rules-prisma-client";
import aliasMapGlobal from "DATA/chm-mapping/enName-aliases-global.json";
import aliasMapExtra from "DATA/chm-mapping/enName-aliases-extra.json";
import { BOOK_LABEL_TO_ABBR } from "./mapping";

const ZH_BOOK_MAP: Record<string, string> = BOOK_LABEL_TO_ABBR;
const BUILTIN_EN_ALIAS_MAP_GLOBAL: Record<string, string> = {
  "Action Before Throught": "Action Before Thought",
  "Dragons Flame": "Dragon's Flame",
  "Fanthe Flames": "Fan the Flames",
  "Five-Shadow Creeping Ice Enervation Strike":
    "Five-Shadow Creeping Ice Enervating Strike",
  "Flames Blessing": "Flame's Blessing",
  "Ironguard's Glare": "Iron Guard's Glare",
  "Lighting Recovery": "Lightning Recovery",
  "Lighting Throw": "Lightning Throw",
  "Stalkerin The Night": "Stalker in the Night",
  "Step Of Dancing Moth": "Step of the Dancing Moth",
  "Strike Of The Broken Shield": "Strike of the Broke Shield",
  SwarmTactics: "Swarm Tactics",
  "White Raven Tactic": "White Raven Tactics",
};
const EN_ALIAS_MAP_GLOBAL: Record<string, string> = {
  ...BUILTIN_EN_ALIAS_MAP_GLOBAL,
  ...aliasMapGlobal,
};
const EN_ALIAS_EXTRA: Record<string, string[]> = aliasMapExtra;

function checkingMissLabel(opts: {
  enName: string; // already normalized
  bookLabels: string[];
}): MatchResult[] {
  const missingLabel = opts.bookLabels.filter(
    (label) => ZH_BOOK_MAP[label] === undefined,
  );
  return missingLabel.map((label) => {
    return {
      spellId: null,
      rulebookId: null,
      rulebookAbbr: null,
      chmRulebookLabels: opts.bookLabels,
      matchMethod: `UnknownZhBookLabel:${label}`,
      matchConfidence: 0,
      failReason: "unknownBookLabel",
    };
  });
}

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
  chmRulebookLabels: string[];
  matchMethod: string;
  matchConfidence: number;
  failReason?: FailReason;
  flags?: string[];
};

export async function matchByEnNameAllBooks(opts: {
  enName: string; // already normalized
  bookLabels: string[];
}): Promise<MatchResult[]> {
  const { rulebookIds, rulebookAbbrMap } = await load();

  const missingLabels = checkingMissLabel(opts);

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
      ...missingLabels,
      {
        spellId: null,
        rulebookId: null,
        rulebookAbbr: null,
        chmRulebookLabels: opts.bookLabels,
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
    chmRulebookLabels: opts.bookLabels,
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

  return [...missingLabels, ...results];
}
