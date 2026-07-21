import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { loadServerEnv, resolveServerRelativePath } from "../shared/env";
import type { PilotErrataOverlayRow } from "./pilot-errata";
import { sha256File } from "./source-manifest";

export const PHB_COMPARISON_CATEGORIES = [
  "exact-match",
  "formatting-only",
  "substantive-mismatch",
  "missing-in-db",
  "extra-in-db",
  "manual-review",
] as const;

export type PhbComparisonCategory = (typeof PHB_COMPARISON_CATEGORIES)[number];

export type PilotComparisonSpell = {
  caseId: string;
  printedName: string;
  sourcePages: number[];
  school: string;
  fields: Record<string, string>;
  bodyText: string;
  reviewFlags: string[];
  summonTable?: Array<{
    level: number;
    monsterName: string;
    alignment: string;
  }>;
};

export type PilotClassListOccurrenceForComparison = {
  caseId: string;
  printedName: string;
  owner: string;
  level: number;
  sourcePage: number | null;
  summaryText: string;
  wordingGroupKey: string;
};

export type PilotComparisonCase = {
  caseId: string;
  printedName: string;
  reviewFlags: string[];
};

export type DbSpell = {
  id: number;
  rulebookId: number;
  page: number | null;
  name: string;
  school: string;
  subschool: string | null;
  components: string;
  castingTime: string;
  range: string;
  target: string;
  effect: string;
  area: string;
  duration: string;
  savingThrow: string;
  spellResistance: string;
  description: string;
  classLevels: Array<{ owner: string; level: number }>;
  domainLevels: Array<{ owner: string; level: number }>;
  descriptors: string[];
  summaryText: string | null;
};

export type PilotDbComparisonRow = {
  schemaVersion: 1;
  caseId: string;
  printedName: string;
  category: PhbComparisonCategory;
  sourcePages: number[];
  dbSpellIds: number[];
  components: Array<{
    component: string;
    category: "exact-match" | "formatting-only" | "substantive-mismatch";
    sourceValue: string;
    dbValue: string;
  }>;
  shortDescriptions: {
    occurrenceCount: number;
    wordingGroupCount: number;
    wordingGroupKeys: string[];
    dbSummaryText: string | null;
  };
  reviewFlags: string[];
};

export type PilotComparisonDatabaseIdentity = {
  environmentVariable: string;
  logicalName: string;
  bytes: number;
  sha256: string;
};

export function comparePilotWithLocalDb(input: {
  cases: PilotComparisonCase[];
  spells: PilotComparisonSpell[];
  overlays: PilotErrataOverlayRow[];
  classListOccurrences: PilotClassListOccurrenceForComparison[];
}) {
  const rulesPath = databasePath("RULES_DATABASE_URL");
  const contentPath = optionalDatabasePath("CONTENT_DATABASE_URL");
  const rulesDb = new Database(rulesPath, {
    readonly: true,
    fileMustExist: true,
  });
  const contentDb = contentPath
    ? new Database(contentPath, { readonly: true, fileMustExist: true })
    : null;
  try {
    return input.cases.map((pilotCase) => {
      const spell = input.spells.find(
        (candidate) => candidate.caseId === pilotCase.caseId,
      );
      const dbSpells = readDbSpells(rulesDb, contentDb, pilotCase.printedName);
      const occurrences = input.classListOccurrences.filter(
        (candidate) => candidate.caseId === pilotCase.caseId,
      );
      if (!spell) {
        return compareSummaryOnlyCase(pilotCase, occurrences, dbSpells);
      }
      const overlay = input.overlays.find(
        (candidate) => candidate.caseId === spell.caseId,
      );
      if (!overlay) throw new Error(`Errata overlay missing: ${spell.caseId}`);
      const dbSummonTableValue = spell.summonTable
        ? readDbSummonTable(rulesDb)
        : undefined;
      return compareSpell(
        spell,
        overlay,
        occurrences,
        dbSpells,
        dbSummonTableValue,
      );
    });
  } finally {
    contentDb?.close();
    rulesDb.close();
  }
}

export function readCurrentPhbDbSpells(): DbSpell[] {
  const rulesPath = databasePath("RULES_DATABASE_URL");
  const contentPath = optionalDatabasePath("CONTENT_DATABASE_URL");
  const rulesDb = new Database(rulesPath, {
    readonly: true,
    fileMustExist: true,
  });
  const contentDb = contentPath
    ? new Database(contentPath, { readonly: true, fileMustExist: true })
    : null;
  try {
    const names = rulesDb
      .prepare(
        `SELECT s.name
         FROM dnd_spell s
         JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
         WHERE rb.abbr = 'PH'
         ORDER BY s.name, s.id`,
      )
      .all() as Array<{ name: string }>;
    return names.flatMap((row) => readDbSpells(rulesDb, contentDb, row.name));
  } finally {
    contentDb?.close();
    rulesDb.close();
  }
}

export function readCurrentPhbSummonTable() {
  const rulesPath = databasePath("RULES_DATABASE_URL");
  const rulesDb = new Database(rulesPath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    return readDbSummonTable(rulesDb);
  } finally {
    rulesDb.close();
  }
}

export function compareSpell(
  spell: PilotComparisonSpell,
  overlay: PilotErrataOverlayRow,
  occurrences: PilotClassListOccurrenceForComparison[],
  dbSpells: DbSpell[],
  dbSummonTableValue?: string,
): PilotDbComparisonRow {
  const wordingGroupKeys = Array.from(
    new Set(occurrences.map((row) => row.wordingGroupKey)),
  ).sort();
  const reviewFlags = [...spell.reviewFlags, ...overlay.reviewFlags];
  if (wordingGroupKeys.length > 1) {
    reviewFlags.push("short-description-wording-conflict");
  }
  if (dbSpells.length === 0) {
    return baseComparisonRow(
      spell,
      "missing-in-db",
      [],
      occurrences,
      wordingGroupKeys,
      null,
      reviewFlags,
    );
  }
  if (dbSpells.length > 1) {
    return baseComparisonRow(
      spell,
      "extra-in-db",
      dbSpells.map((row) => row.id),
      occurrences,
      wordingGroupKeys,
      dbSpells[0]?.summaryText ?? null,
      reviewFlags,
    );
  }
  const db = dbSpells[0];
  if (!db) throw new Error(`DB comparison invariant failed: ${spell.caseId}`);
  const sourceFields = normalizedFieldMap(overlay.effectiveFields);
  const components = [
    compareComponent("name", spell.printedName, db.name),
    compareComponent(
      "page",
      spell.sourcePages[0]?.toString() ?? "",
      db.page?.toString() ?? "",
    ),
    compareComponent(
      "school",
      overlay.effectiveSchool ?? spell.school,
      dbSchool(db),
    ),
    compareComponent(
      "body",
      overlay.effectiveBodyText,
      spell.summonTable
        ? (db.description.split(/\nh4\./u)[0] ?? "")
        : db.description,
      {
        allowDbExpansion:
          /^(?:this spell functions like|this spell is similar to)\b/iu.test(
            overlay.effectiveBodyText,
          ),
      },
    ),
  ];
  const optionalFieldComparisons = [
    ["components", "components", db.components],
    ["castingTime", "castingtime", db.castingTime],
    ["range", "range", db.range],
    ["duration", "duration", db.duration],
    ["savingThrow", "savingthrow", db.savingThrow],
    ["spellResistance", "spellresistance", db.spellResistance],
  ] as const;
  for (const [component, sourceField, dbValue] of optionalFieldComparisons) {
    const sourceValue = sourceFields[sourceField];
    if (sourceValue !== undefined) {
      components.push(compareComponent(component, sourceValue, dbValue));
    }
  }
  const targetEffectArea = sourceTargetEffectArea(sourceFields);
  if (targetEffectArea) {
    components.push(
      compareComponent(
        "targetEffectArea",
        targetEffectArea,
        dbTargetEffectArea(db),
      ),
    );
  }
  if (spell.summonTable) {
    components.push(
      compareComponent(
        "summonTable",
        spell.summonTable
          .map((row) => `${row.level}\t${row.monsterName}\t${row.alignment}`)
          .join("\n"),
        dbSummonTableValue ?? dbSummonTable(db.description),
      ),
    );
  }
  const levelValue = sourceFields.level;
  if (levelValue) {
    components.push(
      compareComponent(
        "level",
        normalizeLevelText(levelValue),
        normalizeLevelText(dbLevelText(db, levelValue)),
      ),
    );
  }
  components.push(...shortDescriptionComponents(occurrences, db.summaryText));
  let category = highestComponentCategory(components);
  if (overlay.reviewRequired || reviewFlags.some(isBlockingReviewFlag)) {
    category = "manual-review";
  }
  return baseComparisonRow(
    spell,
    category,
    [db.id],
    occurrences,
    wordingGroupKeys,
    db.summaryText,
    reviewFlags,
    components,
  );
}

export function compareSummaryOnlyCase(
  pilotCase: PilotComparisonCase,
  occurrences: PilotClassListOccurrenceForComparison[],
  dbSpells: DbSpell[],
): PilotDbComparisonRow {
  const wordingGroupKeys = uniqueWordingGroupKeys(occurrences);
  const reviewFlags = [...pilotCase.reviewFlags];
  if (wordingGroupKeys.length > 1) {
    reviewFlags.push("short-description-wording-conflict");
  }
  const subject = {
    caseId: pilotCase.caseId,
    printedName: pilotCase.printedName,
    sourcePages: Array.from(
      new Set(
        occurrences.flatMap((row) =>
          row.sourcePage === null ? [] : [row.sourcePage],
        ),
      ),
    ).sort((left, right) => left - right),
  };
  if (occurrences.length === 0) {
    throw new Error(
      `Summary-only pilot case has no occurrences: ${pilotCase.caseId}`,
    );
  }
  if (dbSpells.length === 0) {
    return baseComparisonRow(
      subject,
      "missing-in-db",
      [],
      occurrences,
      wordingGroupKeys,
      null,
      reviewFlags,
    );
  }
  if (dbSpells.length > 1) {
    return baseComparisonRow(
      subject,
      "extra-in-db",
      dbSpells.map((row) => row.id),
      occurrences,
      wordingGroupKeys,
      dbSpells[0]?.summaryText ?? null,
      reviewFlags,
    );
  }
  const db = dbSpells[0]!;
  const components = shortDescriptionComponents(occurrences, db.summaryText);
  let category = highestComponentCategory(components);
  if (reviewFlags.some(isBlockingReviewFlag)) category = "manual-review";
  return baseComparisonRow(
    subject,
    category,
    [db.id],
    occurrences,
    wordingGroupKeys,
    db.summaryText,
    reviewFlags,
    components,
  );
}

function readDbSummonTable(rulesDb: Database.Database) {
  const rows = rulesDb
    .prepare(
      `SELECT s.description
       FROM dnd_spell s
       JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
       WHERE rb.abbr = 'PH'
         AND s.name IN (
           'Summon Monster I', 'Summon Monster II', 'Summon Monster III',
           'Summon Monster IV', 'Summon Monster V', 'Summon Monster VI',
           'Summon Monster VII', 'Summon Monster VIII', 'Summon Monster IX'
         )
       ORDER BY s.id`,
    )
    .all() as Array<{ description: string }>;
  return Array.from(
    new Set(rows.flatMap((row) => dbSummonTable(row.description).split("\n"))),
  )
    .filter(Boolean)
    .sort(
      (left, right) =>
        Number(left.split("\t", 1)[0]) - Number(right.split("\t", 1)[0]),
    )
    .join("\n");
}

export function compareComponent(
  component: string,
  sourceValue: string,
  dbValue: string,
  options: { allowDbExpansion?: boolean } = {},
) {
  const normalize =
    component === "components" ? normalizeComponents : normalizeExact;
  const meaning =
    component === "components"
      ? normalizeComponents
      : component === "school"
        ? normalizeSchool
        : normalizeMeaning;
  const exactSource = normalize(sourceValue);
  const exactDb = normalize(dbValue);
  const meaningMatches = meaning(sourceValue) === meaning(dbValue);
  const sourceMeaning = meaning(sourceValue);
  const dbMeaning = meaning(dbValue);
  const dbExpansionMatches =
    options.allowDbExpansion === true &&
    sourceMeaning.length > 0 &&
    ` ${dbMeaning} `.includes(` ${sourceMeaning} `);
  const category =
    exactSource === exactDb
      ? ("exact-match" as const)
      : meaningMatches || dbExpansionMatches
        ? ("formatting-only" as const)
        : ("substantive-mismatch" as const);
  return { component, category, sourceValue, dbValue };
}

function readDbSpells(
  rulesDb: Database.Database,
  contentDb: Database.Database | null,
  printedName: string,
): DbSpell[] {
  const rows = rulesDb
    .prepare(
      `SELECT s.*, rb.abbr AS rulebook_abbr, sc.name AS school_name,
              ss.name AS subschool_name
       FROM dnd_spell s
       JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
       JOIN dnd_spellschool sc ON sc.id = s.school_id
       LEFT JOIN dnd_spellsubschool ss ON ss.id = s.sub_school_id
       WHERE lower(s.name) = lower(?) AND rb.abbr = 'PH'
       ORDER BY s.id`,
    )
    .all(printedName) as Array<Record<string, unknown>>;
  return rows.map((row) => {
    const id = row.id as number;
    const rulebookId = row.rulebook_id as number;
    const classLevels = rulesDb
      .prepare(
        `SELECT cc.name AS owner, scl.level
         FROM dnd_spellclasslevel scl
         JOIN dnd_characterclass cc ON cc.id = scl.character_class_id
         WHERE scl.spell_id = ?`,
      )
      .all(id) as Array<{ owner: string; level: number }>;
    const domainLevels = rulesDb
      .prepare(
        `SELECT d.name AS owner, sdl.level
         FROM dnd_spelldomainlevel sdl
         JOIN dnd_domain d ON d.id = sdl.domain_id
         WHERE sdl.spell_id = ?`,
      )
      .all(id) as Array<{ owner: string; level: number }>;
    const descriptors = rulesDb
      .prepare(
        `SELECT sd.name
         FROM dnd_spell_descriptors link
         JOIN dnd_spelldescriptor sd ON sd.id = link.spelldescriptor_id
         WHERE link.spell_id = ? ORDER BY sd.name`,
      )
      .all(id) as Array<{ name: string }>;
    const summary = contentDb
      ? (contentDb
          .prepare(
            `SELECT summaryText FROM I18nSpellSummaryText
             WHERE spellId = ? AND rulebookId = ? AND lang = 'en'
               AND reviewStatus = 'accepted'
             ORDER BY variant LIMIT 1`,
          )
          .get(id, rulebookId) as { summaryText: string } | undefined)
      : undefined;
    return {
      id,
      rulebookId,
      page: (row.page as number | null) ?? null,
      name: row.name as string,
      school: row.school_name as string,
      subschool: (row.subschool_name as string | null) ?? null,
      components: componentText(row),
      castingTime: text(row.casting_time),
      range: text(row.range),
      target: text(row.target),
      effect: text(row.effect),
      area: text(row.area),
      duration: text(row.duration),
      savingThrow: text(row.saving_throw),
      spellResistance: text(row.spell_resistance),
      description: text(row.description),
      classLevels,
      domainLevels,
      descriptors: descriptors.map((entry) => entry.name),
      summaryText: summary?.summaryText ?? null,
    };
  });
}

function baseComparisonRow(
  spell: Pick<PilotComparisonSpell, "caseId" | "printedName" | "sourcePages">,
  category: PhbComparisonCategory,
  dbSpellIds: number[],
  occurrences: PilotClassListOccurrenceForComparison[],
  wordingGroupKeys: string[],
  dbSummaryText: string | null,
  reviewFlags: string[],
  components: PilotDbComparisonRow["components"] = [],
): PilotDbComparisonRow {
  return {
    schemaVersion: 1,
    caseId: spell.caseId,
    printedName: spell.printedName,
    category,
    sourcePages: spell.sourcePages,
    dbSpellIds,
    components,
    shortDescriptions: {
      occurrenceCount: occurrences.length,
      wordingGroupCount: wordingGroupKeys.length,
      wordingGroupKeys,
      dbSummaryText,
    },
    reviewFlags: Array.from(new Set(reviewFlags)).sort(),
  };
}

function shortDescriptionComponents(
  occurrences: PilotClassListOccurrenceForComparison[],
  dbSummaryText: string | null,
) {
  const groups = new Map<string, string>();
  for (const occurrence of occurrences) {
    if (!groups.has(occurrence.wordingGroupKey)) {
      groups.set(occurrence.wordingGroupKey, occurrence.summaryText);
    }
  }
  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right, "en-US"))
    .map(([, sourceValue], index) =>
      compareComponent(
        `shortDescription:${index + 1}`,
        sourceValue,
        dbSummaryText ?? "",
      ),
    );
}

function uniqueWordingGroupKeys(
  occurrences: PilotClassListOccurrenceForComparison[],
) {
  return Array.from(
    new Set(occurrences.map((row) => row.wordingGroupKey)),
  ).sort();
}

function highestComponentCategory(
  components: PilotDbComparisonRow["components"],
): PhbComparisonCategory {
  if (components.some((row) => row.category === "substantive-mismatch")) {
    return "substantive-mismatch";
  }
  if (components.some((row) => row.category === "formatting-only")) {
    return "formatting-only";
  }
  return "exact-match";
}

function isBlockingReviewFlag(value: string) {
  return (
    value === "inventory-review-required" ||
    value === "errata-target-not-found" ||
    value === "already-incorporated-overlay-mutated-source" ||
    value === "short-description-wording-conflict" ||
    value.startsWith("parser-issue:") ||
    value.startsWith("uncertain:")
  );
}

function normalizedFieldMap(fields: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key.toLocaleLowerCase("en-US").replace(/[^a-z]/g, ""),
      value,
    ]),
  );
}

function sourceTargetEffectArea(fields: Record<string, string>) {
  return labeledNonempty([
    ["Target", fields.targets ?? fields.target],
    ["Effect", fields.effect],
    ["Area", fields.area],
    ["Target or Area", fields.targetorarea],
    ["Target, Effect, or Area", fields.targeteffectorarea],
    ["Target/Effect", fields.targeteffect],
    ["Area or Target", fields.areaortarget],
  ]);
}

function dbTargetEffectArea(db: DbSpell) {
  return labeledNonempty([
    ["Target", db.target],
    ["Effect", db.effect],
    ["Area", db.area],
  ]);
}

function labeledNonempty(
  values: Array<readonly [label: string, value: string | undefined]>,
) {
  return values
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
    .map(([label, value]) => `${label}: ${value}`)
    .join(" / ");
}

function dbSchool(db: DbSpell) {
  const subschool = db.subschool ? ` (${db.subschool})` : "";
  const descriptors =
    db.descriptors.length > 0 ? ` [${db.descriptors.join(", ")}]` : "";
  return `${db.school}${subschool}${descriptors}`;
}

function componentText(row: Record<string, unknown>) {
  const values: string[] = [];
  if (row.verbal_component) values.push("V");
  if (row.somatic_component) values.push("S");
  if (row.material_component) values.push("M");
  const arcane = Boolean(row.arcane_focus_component);
  const divine = Boolean(row.divine_focus_component);
  if (arcane && divine) values.push("F/DF");
  else if (arcane) values.push("F");
  else if (divine) values.push("DF");
  if (row.xp_component) values.push("XP");
  const extra = text(row.extra_components);
  if (extra) values.push(extra);
  return values.join(", ");
}

function dbLevelText(db: DbSpell, sourceLevel: string) {
  const requested = parseLevelEntries(sourceLevel);
  return requested
    .map((entry) => {
      const candidates = entry.domain ? db.domainLevels : db.classLevels;
      if (entry.owner === "Sorcerer/Wizard") {
        const hasBoth = ["Sorcerer", "Wizard"].every((owner) =>
          candidates.some(
            (candidate) =>
              normalizeOwner(candidate.owner) === normalizeOwner(owner) &&
              candidate.level === entry.level,
          ),
        );
        return hasBoth ? `${entry.owner} ${entry.level}` : `${entry.owner} ?`;
      }
      const match = candidates.find(
        (candidate) =>
          normalizeOwner(candidate.owner) === normalizeOwner(entry.owner) &&
          candidate.level === entry.level,
      );
      return match ? `${entry.owner} ${entry.level}` : `${entry.owner} ?`;
    })
    .join(", ");
}

function parseLevelEntries(value: string) {
  const aliases: Record<string, string> = {
    brd: "Bard",
    clr: "Cleric",
    drd: "Druid",
    pal: "Paladin",
    rgr: "Ranger",
    "sor/wiz": "Sorcerer/Wizard",
    wiz: "Wizard",
  };
  return value.split(/,\s*/).flatMap((part) => {
    const match = /^(.*?)\s+(\d+)$/.exec(part.trim());
    if (!match?.[1] || !match[2]) return [];
    const rawOwner = match[1];
    const owner = aliases[rawOwner.toLocaleLowerCase("en-US")] ?? rawOwner;
    return [
      {
        owner,
        level: Number(match[2]),
        domain: !(rawOwner.toLocaleLowerCase("en-US") in aliases),
      },
    ];
  });
}

function normalizeLevelText(value: string) {
  return parseLevelEntries(value)
    .map((entry) => `${normalizeOwner(entry.owner)} ${entry.level}`)
    .sort()
    .join(",");
}

function normalizeOwner(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace("sorcerer/wizard", "sor/wiz")
    .replace(/[^a-z/]/g, "");
}

function normalizeExact(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMeaning(value: string) {
  const normalized = normalizeExact(value)
    .replace(/"([^"\n]+)":\/?\S+/g, "$1")
    .replace(/[_*]/g, "")
    .replace(/\|_?\.?/g, " ")
    .replace(/\^([^\^]+)\^/g, "$1")
    .replace(/--|[–—]/g, " ")
    .replace(/(?<=\d)[x×](?=\d)/gi, " ")
    .replace(/(?<=[a-z])-(?=[a-z])/gi, "")
    .replace(/\b([MF])\/DF\b/g, "$1, DF")
    .replace(/\bTargets:/i, "Target:")
    .replace(/\s+/g, " ")
    .trim();
  return meaningTokens(normalized).join(" ");
}

function normalizeSchool(value: string) {
  const normalized = normalizeExact(value);
  const match = /^([^\[(]+?)(?:\s*\(([^)]*)\))?(?:\s*\[([^\]]*)\])?$/u.exec(
    normalized,
  );
  if (!match) return normalizeMeaning(value);
  const normalizePart = (part: string) =>
    meaningTokens(part.replace(/-/gu, " ")).join(" ");
  const normalizeList = (part: string | undefined) =>
    (part ?? "")
      .split(/\s*(?:,|\band\b)\s*/iu)
      .map(normalizePart)
      .filter(Boolean)
      .sort()
      .join(",");
  return [
    normalizePart(match[1]!),
    normalizeList(match[2]),
    normalizeList(match[3]),
  ].join("|");
}

function meaningTokens(value: string) {
  return (
    value.toLocaleLowerCase("en-US").match(/[a-z0-9]+(?:'[a-z0-9]+)*/gu) ?? []
  );
}

function normalizeComponents(value: string) {
  return (
    normalizeExact(value)
      .toUpperCase()
      .match(/\b(?:DF|XP|V|S|M|F)\b/gu) ?? []
  )
    .sort()
    .join(",");
}

export function dbSummonTable(value: string) {
  const sections = value.split(/\nh4\.\s*([1-9])(?:ST|ND|RD|TH) LEVEL\s*\n/iu);
  const rows: string[] = [];
  for (let index = 1; index < sections.length; index += 2) {
    const level = Number(sections[index]);
    const table = sections[index + 1] ?? "";
    for (const line of table.split(/\r?\n/u)) {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);
      if (cells.length !== 2 || /monster|alignement/i.test(cells.join(" "))) {
        continue;
      }
      if (!/^(?:LG|NG|CG|N|CN|LE|NE|CE)$/u.test(cells[1] ?? "")) {
        continue;
      }
      rows.push(
        `${level}\t${(cells[0] ?? "").replace(/\s*\^?1\^?\s*$/u, "")}\t${cells[1]}`,
      );
    }
  }
  return rows.join("\n");
}

export function currentComparisonDatabaseIdentities(): PilotComparisonDatabaseIdentity[] {
  loadServerEnv();
  return ["RULES_DATABASE_URL", "CONTENT_DATABASE_URL"].map((name) => {
    const raw = process.env[name];
    if (!raw?.startsWith("file:")) {
      throw new Error(`${name} must be a file: SQLite URL`);
    }
    const filePath = resolveServerRelativePath(raw.slice("file:".length));
    if (!fs.existsSync(filePath)) throw new Error(`${name} file is missing`);
    return {
      environmentVariable: name,
      logicalName: path.basename(filePath),
      bytes: fs.statSync(filePath).size,
      sha256: sha256File(filePath),
    };
  });
}

export function validateComparisonDatabaseIdentities(
  recorded: unknown,
  current: PilotComparisonDatabaseIdentity[],
) {
  if (!Array.isArray(recorded)) return ["databases must be an array"];
  const errors: string[] = [];
  const rows = recorded.filter(isDatabaseIdentity);
  if (rows.length !== recorded.length) {
    errors.push("databases contains an invalid identity");
  }
  const names = rows.map((row) => row.environmentVariable);
  if (new Set(names).size !== names.length) {
    errors.push("databases contains duplicate environmentVariable values");
  }
  for (const expected of current) {
    const actual = rows.find(
      (row) => row.environmentVariable === expected.environmentVariable,
    );
    if (!actual) {
      errors.push(`databases is missing ${expected.environmentVariable}`);
      continue;
    }
    for (const field of ["logicalName", "bytes", "sha256"] as const) {
      if (actual[field] !== expected[field]) {
        errors.push(`${expected.environmentVariable} ${field} is stale`);
      }
    }
  }
  if (rows.length !== current.length) {
    errors.push("databases identity count does not match current inputs");
  }
  return errors;
}

function isDatabaseIdentity(
  value: unknown,
): value is PilotComparisonDatabaseIdentity {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.environmentVariable === "string" &&
    typeof row.logicalName === "string" &&
    Number.isInteger(row.bytes) &&
    (row.bytes as number) > 0 &&
    typeof row.sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(row.sha256)
  );
}

function databasePath(name: "RULES_DATABASE_URL" | "CONTENT_DATABASE_URL") {
  loadServerEnv();
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is not set`);
  if (!raw.startsWith("file:")) {
    throw new Error(`Only file: SQLite URLs are supported for ${name}`);
  }
  return resolveServerRelativePath(raw.slice("file:".length));
}

function optionalDatabasePath(name: "CONTENT_DATABASE_URL") {
  loadServerEnv();
  return process.env[name] ? databasePath(name) : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
