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
  "Bigby's Striking Hand": "Bigby's Striking Fist",
  "Blade of Fire": "Blades of Fire",
  "Blingind Color Surge": "Blinding Color Surge",
  "Body Out side Body": "Body Outside Body",
  "Bolt of Bedevilment": "Bolts of Bedevilment",
  BrainSpider: "Brain Spider",
  "Cloud kill": "Cloudkill",
  "Command Plant": "Command Plants",
  "Cown of Brilliance": "Crown of Brilliance",
  "Creeping Cold, Great": "Creeping Cold, Greater",
  "Dance Of Blade": "Dancing Blade",
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
  "Greater Aspect of the Deity": "Aspect of the Deity, Greater",
  "Greater Command": "Command, Greater",
  "Heroes'Feast": "Heroes' Feast",
  IllusoryScript: "Illusory Script",
  "Incediary Cloud": "Incendiary Cloud",
  "IronGuard's Glare": "Iron Guard's Glare",
  "Ironguard's Glare": "Iron Guard's Glare",
  "Lesser Aspect of the Deity": "Aspect of the Deity, Lesser",
  "Lesser Confusion": "Confusion, Lesser",
  "Lesser Telepathic Bond": "Telepathic Bond, Lesser",
  "Lighting Recovery": "Lightning Recovery",
  "Lighting Throw": "Lightning Throw",
  "Lions Roar": "Lion's Roar",
  "Luminous Assassin, Less": "Luminous Assassin, Lesser",
  "Magic Circleagainst Chaos/Evil/Good/Law":
    "Magic Circle against Chaos/Evil/Good/Law",
  "Magic Missle": "Magic Missile",
  "Mass Bear's Endurance": "Bear's Endurance, Mass",
  "Mass Heal": "Heal, Mass",
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
  "Snow Sight": "Snowsight",
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
  "vard's Black Tentacles": "Evard's Black Tentacles",
  "Wall Bones": "Wall of Bones",
  "War Leaders Charge": "War Leader's Charge",
  "War Masters Charge": "War Master's Charge",
  "winter's Embrane": "Winter's Embrace",
  "White Raven Tactic": "White Raven Tactics",
  "Wyrms Flame": "Wyrm's Flame",
  "nerotic cyst": "Necrotic Cyst",
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
const SEMANTIC_RISK_ALIAS_KEYS = new Set(
  [
    "Blade of Fire",
    "Dance Of Blades",
    "Slapping Hand",
  ].map((key) => key.toLowerCase()),
);

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
  resolvedEnName?: string | null;
  aliasChain?: AliasStep[];
  aliasCategories?: AliasCategory[];
  aliasReview?: "none" | "low" | "required";
};

export type AliasSource = "builtin" | "data";
export type AliasStepKind = "global" | "extra";
export type AliasCategory =
  | "typo"
  | "punctuation"
  | "inversion"
  | "fanout"
  | "semantic-risk"
  | "source-specific";

export type AliasStep = {
  from: string;
  to: string;
  kind: AliasStepKind;
  source: AliasSource;
  category: AliasCategory;
  reviewRequired: boolean;
};

type AliasEntry<T> = {
  value: T;
  source: AliasSource;
};

type ResolvedName = {
  name: string;
  aliasChain: AliasStep[];
};

function lookupRecordCi<T>(
  record: Record<string, T>,
  key: string,
): T | undefined {
  if (record[key] !== undefined) return record[key];
  const lowerKey = key.toLowerCase();
  const match = Object.entries(record).find(
    ([recordKey]) => recordKey.toLowerCase() === lowerKey,
  );
  return match?.[1];
}

function lookupAliasEntryCi<T>(
  records: Array<{ record: Record<string, T>; source: AliasSource }>,
  key: string,
): AliasEntry<T> | undefined {
  for (const { record, source } of records) {
    const value = lookupRecordCi(record, key);
    if (value !== undefined) return { value, source };
  }
  return undefined;
}

function compactAliasText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function aliasCategory(opts: {
  from: string;
  to: string;
  kind: AliasStepKind;
  targetCount: number;
}): AliasCategory {
  const fromLower = opts.from.toLowerCase();
  if (SEMANTIC_RISK_ALIAS_KEYS.has(fromLower)) return "semantic-risk";
  if (opts.targetCount > 1 || opts.from.includes("/")) return "fanout";
  if (/^列表:/i.test(opts.from)) return "source-specific";
  if (
    opts.from.includes(",") ||
    opts.to.includes(",") ||
    /\b(greater|lesser|mass)\b/i.test(opts.from)
  ) {
    return "inversion";
  }
  if (compactAliasText(opts.from) === compactAliasText(opts.to)) {
    return "punctuation";
  }
  return "typo";
}

function makeAliasStep(opts: {
  from: string;
  to: string;
  kind: AliasStepKind;
  source: AliasSource;
  targetCount?: number;
}): AliasStep {
  const category = aliasCategory({
    from: opts.from,
    to: opts.to,
    kind: opts.kind,
    targetCount: opts.targetCount ?? 1,
  });
  return {
    from: opts.from,
    to: opts.to,
    kind: opts.kind,
    source: opts.source,
    category,
    reviewRequired: category === "semantic-risk" || category === "source-specific",
  };
}

function lookupGlobalAlias(enName: string): AliasEntry<string> | undefined {
  return lookupAliasEntryCi(
    [
      { record: BUILTIN_EN_ALIAS_MAP_GLOBAL, source: "builtin" },
      { record: aliasMapGlobal, source: "data" },
    ],
    enName,
  );
}

function lookupExtraAliases(enName: string): Array<AliasEntry<string[]>> {
  const entries: Array<AliasEntry<string[]>> = [];
  const builtin = lookupRecordCi(BUILTIN_EN_ALIAS_EXTRA, enName);
  if (builtin) entries.push({ value: builtin, source: "builtin" });
  const data = lookupRecordCi(EN_ALIAS_EXTRA, enName);
  if (data) entries.push({ value: data, source: "data" });
  return entries;
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

function resolveGlobalAliasChain(enName: string) {
  const chain: AliasStep[] = [];
  let current = enName;
  const seen = new Set<string>([current]);

  for (let depth = 0; depth < 8; depth += 1) {
    const alias = lookupGlobalAlias(current);
    if (!alias) break;
    const next = alias.value;
    chain.push(
      makeAliasStep({
        from: current,
        to: next,
        kind: "global",
        source: alias.source,
      }),
    );
    if (seen.has(next)) break;
    seen.add(next);
    current = next;
  }

  return { name: current, aliasChain: chain };
}

function uniqueResolvedNames(names: ResolvedName[]) {
  const seen = new Set<string>();
  const result: ResolvedName[] = [];
  for (const name of names) {
    const key = name.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

function candidateNamesFor(enName: string): ResolvedName[] {
  const primary = resolveGlobalAliasChain(enName);
  const extras: ResolvedName[] = [];
  for (const key of uniqueNames([enName, primary.name])) {
    for (const extra of lookupExtraAliases(key)) {
      for (const target of extra.value) {
        const step = makeAliasStep({
          from: key,
          to: target,
          kind: "extra",
          source: extra.source,
          targetCount: extra.value.length,
        });
        const resolved = resolveGlobalAliasChain(target);
        extras.push({
          name: resolved.name,
          aliasChain: [step, ...resolved.aliasChain],
        });
      }
    }
  }
  return uniqueResolvedNames([primary, ...extras]);
}

function aliasCategories(aliasChain: AliasStep[]) {
  return [...new Set(aliasChain.map((step) => step.category))];
}

function aliasReview(aliasChain: AliasStep[]): "none" | "low" | "required" {
  if (aliasChain.length === 0) return "none";
  return aliasChain.some((step) => step.reviewRequired) ? "required" : "low";
}

export async function matchByEnNameAllBooks(opts: {
  enName: string; // already normalized
  bookLabels: string[];
}): Promise<MatchResult[]> {
  const { rulebookIds, rulebookAbbrMap } = await load();

  const missingLabels = checkingMissLabel(opts);

  const candidateNames = candidateNamesFor(opts.enName);
  const rows: Array<{
    id: number;
    rulebook_id: number;
    resolved: ResolvedName;
  }> = [];

  for (const candidateName of candidateNames) {
    const nameRows = await prisma.$queryRaw<
    Array<{ id: number; rulebook_id: number }>
    >(
      Prisma.sql`
      SELECT s.id, s.rulebook_id
      FROM dnd_spell s
      WHERE s.rulebook_id IN (${Prisma.join(rulebookIds)})
          AND LOWER(s.name) = LOWER(${candidateName.name})
    `,
    );
    rows.push(...nameRows.map((row) => ({ ...row, resolved: candidateName })));
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
    matchMethod: `match:${
      r.resolved.aliasChain.length > 0 ? "enAliasCiAllBooks" : "enExactCiAllBooks"
    }; expand:${uniqueRows.length}`,
    matchConfidence: 1.0,
    flags: ["MULTI_BOOK_BY_ENNAME"],
    resolvedEnName: r.resolved.name,
    aliasChain: r.resolved.aliasChain,
    aliasCategories: aliasCategories(r.resolved.aliasChain),
    aliasReview: aliasReview(r.resolved.aliasChain),
  }));

  return [...missingLabels, ...results];
}
