import { Prisma } from "prisma-rules-clean/generated/client";
import { rulesPrisma as prisma } from "../db/rules-prisma-client";
import aliasMapGlobal from "DATA/chm-mapping/enName-aliases-global.json";
import aliasMapExtra from "DATA/chm-mapping/enName-aliases-extra.json";
import { BOOK_LABEL_TO_ABBR } from "./mapping";

const ZH_BOOK_MAP: Record<string, string> = BOOK_LABEL_TO_ABBR;
const BUILTIN_EN_ALIAS_MAP_GLOBAL: Record<string, string> = {
  "Action Before Throught": "Action Before Thought",
  "Acid Rainm": "Acid Rain",
  "Acid Spash": "Acid Splash",
  Aimingat: "Aiming at",
  AimingatTarget: "Aiming at the Target",
  "Aimingat the Target": "Aiming at the Target",
  "Animate Legionm": "Animate Legion",
  "Awaken, Maxx": "Awaken, Mass",
  BallistaThrow: "Ballista Throw",
  "Bigby's Striking Hand": "Bigby's Slapping Hand",
  "Blade of Fire": "Blades of Fire",
  "Blingind Color Surge": "Blinding Color Surge",
  "Body Out side Body": "Body Outside Body",
  BrainSpider: "Brain Spider",
  "Cloud kill": "Cloudkill",
  "Command Plant": "Command Plants",
  "Cown of Brilliance": "Crown of Brilliance",
  "Creeping Cold, Great": "Creeping Cold, Greater",
  "Dance Of Blade": "Bladeweave",
  "Dance Of Blades": "Dancing Blade",
  "Dance of th Unicorn": "Dance of the Unicorn",
  "DauntingS trike": "Daunting Strike",
  "Dispal Magic, Greater": "Dispel Magic, Greater",
  "Dragons Flame": "Dragon's Flame",
  Draconsight: "Dragonsight",
  "Earth bolt": "Earth Bolt",
  "Earth Bolt": "Earthbolt",
  "Embrace th Wild": "Embrace the Wild",
  "Endure Elemental": "Endure Elements",
  "Extract GiftM,": "Extract Gift",
  "Fanthe Flames": "Fan the Flames",
  "Feeble mind": "Feeblemind",
  "Fell The Greaterst Foe": "Fell the Greatest Foe",
  "Five-Shadow Creeping Ice Enervation Strike":
    "Five-Shadow Creeping Ice Enervating Strike",
  "Fire ball": "Fireball",
  "Fire burst": "Fireburst",
  "Fire burst, Greater": "Fireburst, Greater",
  "Flames Blessing": "Flame's Blessing",
  "Flameing Sphere": "Flaming Sphere",
  "Fleshto Stone": "Flesh to Stone",
  "Fly, Swify": "Fly, Swift",
  "Fools Strike": "Fool's Strike",
  "Forst Breath": "Frost Breath",
  "Ghoul Gauntle": "Ghoul Gauntlet",
  "Greater Divine Surge": "Divine Surge, Greater",
  "Greater Insightful Strike": "Insightful Strike, Greater",
  IllusoryScript: "Illusory Script",
  "Incediary Cloud": "Incendiary Cloud",
  "IronGuard's Glare": "Iron Guard's Glare",
  "Ironguard's Glare": "Iron Guard's Glare",
  "Lesser Aspect of the Deity": "Aspect of the Deity, Lesser",
  "Lesser Confusion": "Confusion, Lesser",
  "Lighting Recovery": "Lightning Recovery",
  "Lighting Throw": "Lightning Throw",
  "Lions Roar": "Lion's Roar",
  "Luminous Assassin, Less": "Luminous Assassin, Lesser",
  "Magic Circleagainst Chaos/Evil/Good/Law":
    "Magic Circle against Chaos/Evil/Good/Law",
  "Magic Missle": "Magic Missile",
  "Mind Posion": "Mind Poison",
  "Nerotic Cyst": "Necrotic Cyst",
  "Night Caress": "Night's Caress",
  "Orb of Eletricity": "Orb of Electricity",
  "Path of Exalted": "Path of the Exalted",
  "Permanet Image": "Permanent Image",
  "Plane Shift, Great": "Plane Shift, Greater",
  "Posion Thorns": "Poison Thorns",
  "Posion Vines": "Poison Vines",
  "Rain of Ember": "Rain of Embers",
  RainofNeedles: "Rain of Needles",
  "Rainof Needles": "Rain of Needles",
  "Ray Deanimation": "Ray of Deanimation",
  RayofFrost: "Ray of Frost",
  "Repel Metalor Stone": "Repel Metal or Stone",
  "Resist Energy*": "Resist Energy",
  ScorpionParry: "Scorpion Parry",
  "Shape change": "Shapechange",
  "Spider Posion": "Spider Poison",
  "Stalkerin The Night": "Stalker in the Night",
  "Staking Brand": "Stalking Brand",
  "Step Of Dancing Moth": "Step of the Dancing Moth",
  "Strike Of The Broken Shield": "Strike of the Broke Shield",
  SwarmTactics: "Swarm Tactics",
  "Thorn skin": "Thornskin",
  "Transmute Metalto Wood": "Transmute Metal to Wood",
  "Transmute Rockto Lava": "Transmute Rock to Lava",
  "True Seeing M:": "True Seeing",
  "Vigor, Great": "Vigor, Greater",
  "Vigor, Mass, Lesser": "Vigor, Mass Lesser",
  "Wall Bones": "Wall of Bones",
  "War Leaders Charge": "War Leader's Charge",
  "War Masters Charge": "War Master's Charge",
  "White Raven Tactic": "White Raven Tactics",
  "Wyrms Flame": "Wyrm's Flame",
  "列表:Otiluke's Suppressing Field": "Otiluke's Suppressing Field",
  "nerotic cyst": "Necrotic Cyst",
};
const EN_ALIAS_MAP_GLOBAL: Record<string, string> = {
  ...BUILTIN_EN_ALIAS_MAP_GLOBAL,
  ...aliasMapGlobal,
};
const BUILTIN_EN_ALIAS_EXTRA: Record<string, string[]> = {
  "Detect Chaos/Evil/Good/Law": [
    "Detect Chaos",
    "Detect Evil",
    "Detect Good",
    "Detect Law",
  ],
  "Dispel Chaos/Evil/Good/Law": [
    "Dispel Chaos",
    "Dispel Evil",
    "Dispel Good",
    "Dispel Law",
  ],
  "Magic Circle against Chaos/Evil/Good/Law": [
    "Magic Circle against Chaos",
    "Magic Circle against Evil",
    "Magic Circle against Good",
    "Magic Circle against Law",
  ],
  "Mantle of Chaos/Evil/Good/Law": [
    "Mantle of Chaos",
    "Mantle of Evil",
    "Mantle of Good",
    "Mantle of Law",
  ],
  "Mantle of Good/Law": ["Mantle of Good", "Mantle of Law"],
  "Protection from Chaos/Evil": ["Protection from Chaos", "Protection from Evil"],
  "Protection from Chaos/Evil/Good/Law": [
    "Protection from Chaos",
    "Protection from Evil",
    "Protection from Good",
    "Protection from Law",
  ],
  "Wall of Chaos/Evil/Good/Law": [
    "Wall of Chaos",
    "Wall of Evil",
    "Wall of Good",
    "Wall of Law",
  ],
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

function lookupRecordCi<T>(record: Record<string, T>, key: string): T | undefined {
  if (record[key] !== undefined) return record[key];
  const lowerKey = key.toLowerCase();
  const match = Object.entries(record).find(
    ([recordKey]) => recordKey.toLowerCase() === lowerKey,
  );
  return match?.[1];
}

function uniqueNames(names: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const normalized = name.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(name);
  }
  return result;
}

function candidateNamesFor(enName: string) {
  const primary = lookupRecordCi(EN_ALIAS_MAP_GLOBAL, enName) ?? enName;
  const extras = [
    ...(lookupRecordCi(BUILTIN_EN_ALIAS_EXTRA, enName) ?? []),
    ...(lookupRecordCi(BUILTIN_EN_ALIAS_EXTRA, primary) ?? []),
    ...(lookupRecordCi(EN_ALIAS_EXTRA, enName) ?? []),
    ...(lookupRecordCi(EN_ALIAS_EXTRA, primary) ?? []),
  ];
  return uniqueNames([primary, ...extras]).map(
    (name) => lookupRecordCi(EN_ALIAS_MAP_GLOBAL, name) ?? name,
  );
}

export async function matchByEnNameAllBooks(opts: {
  enName: string; // already normalized
  bookLabels: string[];
}): Promise<MatchResult[]> {
  const { rulebookIds, rulebookAbbrMap } = await load();

  const missingLabels = checkingMissLabel(opts);

  const rows: Array<{ id: number; rulebook_id: number }> = [];
  const candidateNames = candidateNamesFor(opts.enName);

  for (const enName of candidateNames) {
    const nameRows = await prisma.$queryRaw<
    Array<{ id: number; rulebook_id: number }>
    >(
      Prisma.sql`
      SELECT s.id, s.rulebook_id
      FROM dnd_spell s
      WHERE s.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND LOWER(s.name) = LOWER(${enName})
    `,
    );
    rows.push(...nameRows);
  }

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

  const uniqueRows = Array.from(
    new Map(rows.map((row) => [row.id, row])).values(),
  );

  const results: MatchResult[] = uniqueRows.map((r) => ({
    spellId: Number(r.id),
    rulebookId: Number(r.rulebook_id),
    rulebookAbbr: rulebookAbbrMap.get(Number(r.rulebook_id)) ?? null,
    chmRulebookLabels: opts.bookLabels,
    matchMethod: `match:enExactCiAllBooks; expand:${uniqueRows.length}`,
    matchConfidence: 1.0,
    flags: ["MULTI_BOOK_BY_ENNAME"],
  }));

  return [...missingLabels, ...results];
}
