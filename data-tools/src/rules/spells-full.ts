import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";

type Mode = "inspect" | "generate";
type ReportTarget = "known-misses" | "short-desc-rules-gaps" | "corpus-inventory";
type InventoryCategory =
  | "ready"
  | "duplicate"
  | "mismatch"
  | "manual-review"
  | "deferred";

type ParsedSpell = {
  name: string;
  source: string;
  school: string;
  subschool?: string;
  descriptors?: string;
  class?: Record<string, number | string>;
  domain?: Record<string, number | string>;
  components?: Record<string, boolean>;
  attributes?: Record<string, string>;
  description?: string[];
  page?: string;
};

type KnownMiss = {
  name: string;
  targetRulebook: string;
  sourceName?: string;
  generate: boolean;
  note?: string;
};

type CandidateReport = {
  name: string;
  targetRulebook: string;
  parsedStatus: "exact" | "missing";
  rulesStatus: "missing" | "exists";
  generated: boolean;
  notes: string[];
};

type GapDecision = {
  key?: string;
  name?: string;
  sources?: string[];
  descriptionSamples?: string[];
  decision?: string;
  recommendedAction?: string;
  confidence?: string;
};

type LookupRow = { id: number; label: string };
type RulebookRow = { id: number; abbr: string; name: string };
type SpellIdentityRow = {
  id: number;
  name: string;
  slug: string;
  rulebookId: number;
  rulebook: string;
  rulebookName: string;
};

type SourceAppearance = {
  raw: string;
  label: string;
  page: number | null;
};

type ResolvedSourceAppearance = SourceAppearance & {
  targetRulebook?: RulebookRow;
  notes: string[];
};

type ConversionLookups = {
  classes: Map<string, LookupRow>;
  domains: Map<string, LookupRow>;
  schools: Map<string, LookupRow>;
  subschools: Map<string, LookupRow>;
  spellDescriptors: Map<string, LookupRow>;
};

type CorpusInventoryEntry = {
  category: InventoryCategory;
  name: string;
  source: string;
  sourceLabel: string;
  page: number | null;
  targetRulebook?: string;
  targetRulebookName?: string;
  existingSpellId?: number;
  existingSpellName?: string;
  duplicateSpellIds?: number[];
  notes: string[];
};

type CorpusReviewArtifactRow = CorpusInventoryEntry & {
  schemaVersion: 1;
  reviewSource: "spells-full-corpus-inventory";
  reviewDecision: "rejected" | "ambiguous";
  reviewReason:
    | "already-in-rules-db"
    | "confirmed-typo-or-duplicate"
    | "source-or-edition-ambiguity"
    | "conversion-mismatch";
};

const SPELLS_FULL_JSON = path.join(
  localDataDir(),
  "spells-full",
  "spells-parsed.json",
);
const DEFAULT_RULES_GAPS_PATH = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "short-desc-qa",
  "review-queues",
  "en-rules-db-gaps.jsonl",
);
const REPORT_ROOT = path.join(repoRoot(), "data-tools", "out", "spells-full");
const PATCH_ROOT = path.join(localDataDir(), "rules-patches");
const SPELLS_FULL_LOCAL_DIR = path.join(localDataDir(), "spells-full");
const DEFAULT_REJECTED_PATH = path.join(
  SPELLS_FULL_LOCAL_DIR,
  "full-corpus-rejected.generated.jsonl",
);
const DEFAULT_AMBIGUOUS_PATH = path.join(
  SPELLS_FULL_LOCAL_DIR,
  "full-corpus-ambiguous.generated.jsonl",
);

const KNOWN_MISSES: KnownMiss[] = [
  {
    name: "Resistance Item",
    targetRulebook: "ECS",
    sourceName: "Eberron Campaign Setting",
    generate: true,
  },
  {
    name: "Skill Enhancement",
    targetRulebook: "ECS",
    sourceName: "Eberron Campaign Setting",
    generate: true,
  },
  {
    name: "Spider Poison",
    targetRulebook: "Sc_",
    sourceName: "Spell Compendium",
    generate: false,
    note: "Existing Mag row uses slug spider-poison; needs clone/source decision.",
  },
  {
    name: "Shield Of Faith, Legion's",
    targetRulebook: "ECS",
    generate: false,
    note: "No exact parsed JSON match found.",
  },
];

const SOURCE_TO_RULEBOOK: Record<string, string> = {
  "Eberron Campaign Setting": "ECS",
  "Explorer's Handbook": "EH",
  "Magic of Eberron": "MoE",
  "Player's Guide to Eberron": "PE",
  "Player’s Guide to Eberron": "PE",
  "Races of Eberron": "RE",
  "Spell Compendium": "Sc_",
  "Forgotten Realms: Magic of Faerûn": "Mag",
  "Forgotten Realms: Magic of Faerun": "Mag",
};

const SOURCE_LABEL_ALIASES_TO_RULEBOOK: Record<string, string> = {
  "defenders of the faith": "DF",
  "eberron dragons of eberron": "DE",
  "eberron magic of eberron": "MoE",
  "fiendish codex i": "FCI",
  "fiendish codex ii": "FCII",
  "forgotten realms city of splendor waterdeep": "CSW",
  "forgotten realms magic of faerun": "Mag",
  "forgotten realms powers of faerun": "PF",
  "forgotten realms players guide to faerun": "PG",
  "libris mortis": "LM",
  "master of the wild": "MW",
  "masters of the wild": "MW",
  "miniature s handbook": "MH",
  "miniatures handbook": "MH",
  "player s handbook 3 0": "PHB",
  "player s handbook 3 5": "PH",
  "players handbook 3 0": "PHB",
  "players handbook 3 5": "PH",
  "players handbook v 3 5": "PH",
  "song and silence": "SaS",
  "tome and blood": "TB",
  "dungeon masters guide 3 5": "DMG",
  "dungeon masters guide v 3 5": "DMG",
};

const IMARVIN_SOURCE_ABBR_TO_RULEBOOK: Record<string, string> = {
  ECS: "ECS",
  EH: "EH",
  MoE: "MoE",
  PGtE: "PE",
  RE: "RE",
  SPC: "Sc_",
};

const RULEBOOK_TO_SOURCE_NAME: Record<string, string> = {
  ECS: "Eberron Campaign Setting",
  EH: "Explorer's Handbook",
  MoE: "Magic of Eberron",
  PE: "Player's Guide to Eberron",
  RE: "Races of Eberron",
  Sc_: "Spell Compendium",
};

const MANUAL_REVIEW_READY_BLOCKLIST: Record<string, string> = {
  "BE:Glorious Apparel":
    "possible duplicate of existing BE row Glorious Raiment",
  "CM:Dawnburst": "possible duplicate of existing CM row Dawn Burst",
  "CM:Otiluke’s Suppressing Field":
    "possible duplicate of existing CM row Otiluke's Supressing Field",
  "CR:Necrotic Spell Bomb":
    "possible duplicate of existing CR row Necrotic Skull Bomb",
  "CV:Dawnshroud": "possible duplicate of existing CV row Dawn Shroud",
  "Fr:Ice to Flesh 2": "possible duplicate of existing Fr row Ice to Flesh",
  "FRCS:Portal Seal":
    "possible duplicate of existing FRCS row Gate Seal",
  "Gh:Alarm, Ethereal": "possible duplicate of existing Gh row Ethereal Alarm",
  "Gh:Black Lung": "possible duplicate of existing Gh row Black Lungs",
  "HH:Familiar Geas": "possible duplicate of existing HH row Familial Geas",
  "LE:Mailied Might of the Magelords":
    "possible duplicate of existing LE row Mailed Might of the Magelords",
  "Mag:Symbol (Death Symbol of Bane)":
    "possible duplicate of existing Mag row Symbol",
  "Mag:Symbol (Symbol of Spell Loss)":
    "possible duplicate of existing Mag row Symbol",
  "MW:Animal Trance, Mass":
    "possible duplicate of existing MW row Trance, Mass",
  "PH2:Channeled Pyroblast":
    "possible duplicate of existing PH2 row Channeled Pyroburst",
  "PH2:Kelgore’s Fire Mist":
    "possible duplicate of existing PH2 row Kelgore's Fire Bolt",
  "RE:Unfettered Heroism":
    "possible duplicate of existing RE row Unfettered Herosim",
  "Sa:Protection from Desiccation":
    "possible duplicate of existing Sa row Protection from Dessication",
  "SaS:Sign of Discord":
    "possible duplicate of existing SaS row Song of Discord",
  "Sto:Tern’s Resistance":
    "possible duplicate of existing Sto row Tern's Persistence",
  "Sto:Wake of Trailing":
    "possible duplicate of existing Sto row Wake Trailing",
  "TM:Augment Truefiend":
    "possible duplicate of existing TM row Augment Truefriend",
  "TM:Bane of the Archrivel":
    "possible duplicate of existing TM row Bane of the Archrival",
  "Una:Mage Armor, Improved":
    "possible duplicate of existing Una row Improved Mage Armor",
};

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools spells-full:inspect -- known-misses
  npm run -w data-tools spells-full:generate -- known-misses --write-patch pending/spells/spells-full-known-misses.jsonl
  npm run -w data-tools spells-full:inspect -- short-desc-rules-gaps
  npm run -w data-tools spells-full:generate -- short-desc-rules-gaps --write-patch pending/spells/short-desc-rules-gaps.jsonl
  npm run -w data-tools spells-full:inspect -- corpus-inventory
  npm run -w data-tools spells-full:generate -- corpus-inventory --write-patch pending/spells/full-corpus-ready.generated.jsonl

spells-full source data is read from data/spells-full/spells-parsed.json.
Patch paths are resolved under data/rules-patches/.
`);
  process.exit(1);
}

function rulesDbPath() {
  loadServerEnv();
  const raw = process.env.RULES_DATABASE_URL;
  if (!raw) throw new Error("RULES_DATABASE_URL is not set");
  if (!raw.startsWith("file:")) {
    throw new Error(`Only file: SQLite URLs are supported, got ${raw}`);
  }
  return resolveServerRelativePath(raw.slice("file:".length));
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanSpellNameForMatch(value: string) {
  return normalize(value)
    .replace(/\s*\((?:m|f|df|xp|v|s|af|x)\)\s*$/, "")
    .replace(/,\s*(greater|lesser)$/, " $1")
    .trim();
}

function sourceLabelKey(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function writeReport(report: unknown, name: string) {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });
  const reportPath = path.join(REPORT_ROOT, `${timestamp()}-${name}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

function writeJsonl(rows: unknown[], outputPath: string) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const body =
    rows.length > 0 ? `${rows.map((item) => JSON.stringify(item)).join("\n")}\n` : "";
  fs.writeFileSync(outputPath, body);
}

function resolvePatchPath(rawPath: string) {
  if (path.isAbsolute(rawPath)) {
    throw new Error(
      "Patch path must be relative to data/rules-patches",
    );
  }

  const resolved = path.resolve(PATCH_ROOT, rawPath);
  const relative = path.relative(PATCH_ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Patch path escapes patch root: ${rawPath}`);
  }
  if (!resolved.toLowerCase().endsWith(".jsonl")) {
    throw new Error(`Patch path must end with .jsonl: ${rawPath}`);
  }
  return resolved;
}

function loadParsedSpells() {
  if (!fs.existsSync(SPELLS_FULL_JSON)) {
    throw new Error(`spells-full JSON not found: ${SPELLS_FULL_JSON}`);
  }
  const parsed = JSON.parse(fs.readFileSync(SPELLS_FULL_JSON, "utf-8")) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("spells-full JSON must be an array");
  }
  return parsed as ParsedSpell[];
}

function parseJsonlFile<T>(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSONL file not found: ${filePath}`);
  }
  return fs
    .readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .flatMap((line, index) => {
      const text = line.trim();
      if (!text) return [];
      try {
        return [JSON.parse(text) as T];
      } catch (error) {
        throw new Error(
          `${filePath}:${index + 1}: invalid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    });
}

function loadLookup(
  db: Database.Database,
  table: string,
  column: string,
): Map<string, LookupRow> {
  const rows = db
    .prepare(`SELECT id, ${column} AS label FROM ${table}`)
    .all() as Array<{ id: number; label: string }>;
  return new Map(rows.map((row) => [normalize(row.label), row]));
}

function loadConversionLookups(db: Database.Database): ConversionLookups {
  return {
    classes: loadLookup(db, "dnd_characterclass", "name"),
    domains: loadLookup(db, "dnd_domain", "name"),
    schools: loadLookup(db, "dnd_spellschool", "name"),
    subschools: loadLookup(db, "dnd_spellsubschool", "name"),
    spellDescriptors: loadLookup(db, "dnd_spelldescriptor", "name"),
  };
}

function loadRulebooks(db: Database.Database) {
  return db
    .prepare("SELECT id, abbr, name FROM dnd_rulebook ORDER BY id")
    .all() as RulebookRow[];
}

function loadSpellIdentities(db: Database.Database) {
  return db
    .prepare(
      `
        SELECT s.id, s.name, s.slug, s.rulebook_id AS rulebookId,
               rb.abbr AS rulebook, rb.name AS rulebookName
        FROM dnd_spell s
        JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
      `,
    )
    .all() as SpellIdentityRow[];
}

function currentMaxSpellId(db: Database.Database) {
  const row = db
    .prepare("SELECT COALESCE(MAX(id), 0) AS maxId FROM dnd_spell")
    .get() as { maxId: number };
  return row.maxId;
}

function existingSpell(
  db: Database.Database,
  name: string,
  rulebookAbbr: string,
) {
  return db
    .prepare(
      `
      SELECT s.id, s.name, rb.abbr AS rulebook
      FROM dnd_spell s
      JOIN dnd_rulebook rb ON rb.id = s.rulebook_id
      WHERE lower(s.name) = lower(?) AND rb.abbr = ?
    `,
    )
    .get(name, rulebookAbbr) as
    | { id: number; name: string; rulebook: string }
    | undefined;
}

function existingSlug(db: Database.Database, slug: string) {
  return db
    .prepare("SELECT id, name FROM dnd_spell WHERE slug = ?")
    .get(slug) as { id: number; name: string } | undefined;
}

function parseLevel(value: number | string) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return { level: value, extra: "" };
  }
  const text = String(value).trim();
  const match = text.match(/^(\d+)(?:\s*\((.+)\))?$/);
  if (!match || !match[1]) return undefined;
  return { level: Number(match[1]), extra: match[2] ?? "" };
}

function parseSourceAppearance(raw: string): SourceAppearance {
  const trimmed = raw.trim();
  if (!trimmed) return { raw, label: "", page: null };
  if (/^dragon magazine\s+\d+$/i.test(trimmed)) {
    return { raw: trimmed, label: trimmed, page: null };
  }

  const match = trimmed.match(/^(.*?)\s+(\d{1,3})(?:[),])?$/);
  if (match?.[1] && match[2]) {
    return {
      raw: trimmed,
      label: match[1].trim(),
      page: Number(match[2]),
    };
  }
  return { raw: trimmed, label: trimmed, page: null };
}

function sourceAppearances(source: string | undefined) {
  const parts = (source ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return [parseSourceAppearance("")];
  return parts.map(parseSourceAppearance);
}

function makeRulebookResolver(rulebooks: RulebookRow[]) {
  const byName = new Map<string, RulebookRow>();
  const byAbbr = new Map<string, RulebookRow[]>();
  for (const rulebook of rulebooks) {
    byName.set(sourceLabelKey(rulebook.name), rulebook);
    const current = byAbbr.get(rulebook.abbr) ?? [];
    current.push(rulebook);
    byAbbr.set(rulebook.abbr, current);
  }

  function byAbbrUnique(abbr: string) {
    const rows = byAbbr.get(abbr) ?? [];
    return rows.length === 1 ? rows[0] : undefined;
  }

  return (appearance: SourceAppearance): ResolvedSourceAppearance => {
    const notes: string[] = [];
    const key = sourceLabelKey(appearance.label);

    const alias = SOURCE_LABEL_ALIASES_TO_RULEBOOK[key];
    const aliasRulebook = alias ? byAbbrUnique(alias) : undefined;
    if (alias && aliasRulebook) {
      return { ...appearance, targetRulebook: aliasRulebook, notes };
    }
    if (alias && !aliasRulebook) {
      notes.push(`ambiguous or missing rulebook alias: ${alias}`);
      return { ...appearance, notes };
    }

    const direct = byName.get(key);
    if (direct) return { ...appearance, targetRulebook: direct, notes };

    const colonSuffix = appearance.label.split(":").at(-1)?.trim();
    if (colonSuffix && colonSuffix !== appearance.label) {
      const suffixRulebook = byName.get(sourceLabelKey(colonSuffix));
      if (suffixRulebook) {
        notes.push(`mapped from source suffix: ${colonSuffix}`);
        return { ...appearance, targetRulebook: suffixRulebook, notes };
      }
    }

    const inferred = inferRulebookFromSource(appearance.raw);
    const inferredRulebook = inferred ? byAbbrUnique(inferred) : undefined;
    if (inferred && inferredRulebook) {
      notes.push(`mapped from source alias: ${inferred}`);
      return { ...appearance, targetRulebook: inferredRulebook, notes };
    }

    notes.push(appearance.label ? "unmapped source label" : "missing source label");
    return { ...appearance, notes };
  };
}

function spellNameVariants(name: string) {
  const variants = name
    .split(/\s+\/\s+/)
    .map((variant) => variant.trim())
    .filter(Boolean);
  return variants.length > 0 ? variants : [name];
}

function conversionCheck(spell: ParsedSpell, lookups: ConversionLookups) {
  const notes: string[] = [];
  const blockers: string[] = [];
  const slug = slugify(spell.name);

  if (spell.name.length > 64) {
    blockers.push(`spell name exceeds legacy column width: ${spell.name.length}`);
  }
  if (slug.length > 64) {
    blockers.push(`spell slug exceeds legacy column width: ${slug.length}`);
  }
  if (descriptionText(spell).length === 0) {
    blockers.push("missing description text");
  }

  if (!lookups.schools.has(normalize(spell.school))) {
    blockers.push(`unresolved school: ${spell.school}`);
  }
  if (
    spell.subschool?.trim() &&
    !lookups.subschools.has(normalize(spell.subschool))
  ) {
    blockers.push(`unresolved subschool: ${spell.subschool}`);
  }

  const classLevels = Object.entries(spell.class ?? {}).flatMap(
    ([className, rawLevel]) => {
      const parsed = parseLevel(rawLevel);
      if (!parsed) {
        blockers.push(`unparsed class level: ${className}=${rawLevel}`);
        return [];
      }
      return expandClassNames(className).flatMap((expandedName) => {
        const classRow = lookups.classes.get(normalize(expandedName));
        if (!classRow) {
          notes.push(`skipped unresolved class: ${expandedName}`);
          return [];
        }
        return [{ class: classRow.label, level: parsed.level }];
      });
    },
  );

  const domainLevels = Object.entries(spell.domain ?? {}).flatMap(
    ([domainName, rawLevel]) => {
      const parsed = parseLevel(rawLevel);
      if (!parsed) {
        blockers.push(`unparsed domain level: ${domainName}=${rawLevel}`);
        return [];
      }
      if (!lookups.domains.has(normalize(domainName))) {
        notes.push(`skipped unresolved domain: ${domainName}`);
        return [];
      }
      return [{ domain: domainName, level: parsed.level }];
    },
  );

  for (const descriptor of descriptors(spell.descriptors)) {
    if (!lookups.spellDescriptors.has(normalize(descriptor))) {
      blockers.push(`unresolved descriptor: ${descriptor}`);
    }
  }

  if (classLevels.length === 0 && domainLevels.length === 0) {
    blockers.push("no resolvable class or domain levels");
  }

  return { blockers, notes };
}

function manualReviewBlocker(spell: Pick<ParsedSpell, "name">, rulebookAbbr: string) {
  return MANUAL_REVIEW_READY_BLOCKLIST[`${rulebookAbbr}:${spell.name}`];
}

function descriptors(raw: string | undefined) {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function expandClassNames(className: string) {
  const trimmed = className.trim();
  if (trimmed === "Crusader (base)") return ["Crusader"];
  if (trimmed.includes("/")) {
    return trimmed
      .split("/")
      .map((name) => name.trim())
      .filter(Boolean);
  }
  return [trimmed];
}

function descriptionText(spell: ParsedSpell) {
  return (spell.description ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
}

function descriptionHtml(spell: ParsedSpell) {
  return (spell.description ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function sourceContains(spell: ParsedSpell, sourceName: string | undefined) {
  if (!sourceName) return true;
  return normalize(spell.source).includes(normalize(sourceName));
}

function sourcePage(spell: ParsedSpell, sourceName: string | undefined) {
  if (!sourceName) return Number(spell.page) || null;
  const escaped = sourceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = spell.source.match(new RegExp(`${escaped}\\s+(\\d+)`, "i"));
  if (match?.[1]) return Number(match[1]);
  return Number(spell.page) || null;
}

function inferRulebookFromSource(source: string | undefined) {
  if (!source) return undefined;
  const abbrMatch = source.match(/\((ECS|EH|MoE|PGtE|RE|SPC)\b/);
  if (abbrMatch?.[1]) {
    return IMARVIN_SOURCE_ABBR_TO_RULEBOOK[abbrMatch[1]];
  }

  for (const [sourceName, rulebook] of Object.entries(SOURCE_TO_RULEBOOK)) {
    if (normalize(source).includes(normalize(sourceName))) {
      return rulebook;
    }
  }
  return undefined;
}

function missFromGapDecision(decision: GapDecision) {
  const name = decision.name?.trim();
  if (!name) return undefined;

  const source = decision.sources?.[0];
  const targetRulebook = inferRulebookFromSource(source);
  if (!targetRulebook) return undefined;

  const notes = [
    `short-desc QA key: ${decision.key ?? cleanSpellNameForMatch(name)}`,
  ];
  if (source) notes.push(`short-desc source: ${source}`);
  if (decision.descriptionSamples?.[0]) {
    notes.push(`short-desc sample: ${decision.descriptionSamples[0]}`);
  }
  if (decision.recommendedAction) {
    notes.push(`review action: ${decision.recommendedAction}`);
  }
  if (decision.confidence) {
    notes.push(`review confidence: ${decision.confidence}`);
  }

  const miss: KnownMiss = {
    name,
    targetRulebook,
    generate: true,
    note: notes.join(" | "),
  };
  const sourceName = RULEBOOK_TO_SOURCE_NAME[targetRulebook];
  if (sourceName) miss.sourceName = sourceName;
  return miss;
}

function skippedGap(
  decision: GapDecision,
  notes: string[],
): { name?: string; sources?: string[]; notes: string[] } {
  const skipped: { name?: string; sources?: string[]; notes: string[] } = {
    notes,
  };
  if (decision.name) skipped.name = decision.name;
  if (decision.sources) skipped.sources = decision.sources;
  return skipped;
}

function loadRulesGapMisses(inputPath: string) {
  const decisions = parseJsonlFile<GapDecision>(inputPath);
  const misses: KnownMiss[] = [];
  const skipped: Array<{ name?: string; sources?: string[]; notes: string[] }> = [];

  for (const decision of decisions) {
    if (decision.decision && decision.decision !== "rules_db_gap") {
      skipped.push(
        skippedGap(decision, [`unsupported decision: ${decision.decision}`]),
      );
      continue;
    }

    const miss = missFromGapDecision(decision);
    if (!miss) {
      skipped.push(
        skippedGap(decision, [
          "could not infer target rulebook from reviewed source",
        ]),
      );
      continue;
    }
    misses.push(miss);
  }

  return { misses, skipped };
}

function convertCandidate(
  db: Database.Database,
  spell: ParsedSpell,
  miss: KnownMiss,
  spellId: number,
  notes: string[],
  lookups = loadConversionLookups(db),
) {
  const { classes, domains, schools, subschools, spellDescriptors } = lookups;

  if (!schools.has(normalize(spell.school))) {
    notes.push(`unresolved school: ${spell.school}`);
  }
  if (spell.subschool?.trim() && !subschools.has(normalize(spell.subschool))) {
    notes.push(`unresolved subschool: ${spell.subschool}`);
  }

  const classLevels = Object.entries(spell.class ?? {}).flatMap(
    ([className, rawLevel]) => {
      const parsed = parseLevel(rawLevel);
      if (!parsed) {
        notes.push(`unparsed class level: ${className}=${rawLevel}`);
        return [];
      }
      return expandClassNames(className).flatMap((expandedName) => {
        const classRow = classes.get(normalize(expandedName));
        if (!classRow) {
          notes.push(`skipped unresolved class: ${expandedName}`);
          return [];
        }
        return [
          { class: classRow.label, level: parsed.level, extra: parsed.extra },
        ];
      });
    },
  );

  const domainLevels = Object.entries(spell.domain ?? {}).flatMap(
    ([domainName, rawLevel]) => {
      const parsed = parseLevel(rawLevel);
      if (!parsed) {
        notes.push(`unparsed domain level: ${domainName}=${rawLevel}`);
        return [];
      }
      if (!domains.has(normalize(domainName))) {
        notes.push(`unresolved domain: ${domainName}`);
        return [];
      }
      return [{ domain: domainName, level: parsed.level, extra: parsed.extra }];
    },
  );

  const descriptorNames = descriptors(spell.descriptors);
  for (const descriptor of descriptorNames) {
    if (!spellDescriptors.has(normalize(descriptor))) {
      notes.push(`unresolved descriptor: ${descriptor}`);
    }
  }

  if (classLevels.length === 0 && domainLevels.length === 0) {
    notes.push("no resolvable class or domain levels");
  }

  if (
    notes.some(
      (note) =>
        note.startsWith("unresolved school") ||
        note.startsWith("unresolved subschool") ||
        note.startsWith("unresolved descriptor") ||
        note.startsWith("unparsed") ||
        note === "no resolvable class or domain levels",
    )
  ) {
    return undefined;
  }

  const attributes = spell.attributes ?? {};
  const components = spell.components ?? {};
  const sourceName = miss.sourceName;

  return {
    op: "insertSpell",
    id: spellId,
    browseVisible: true,
    source: {
      rulebook: miss.targetRulebook,
      page: sourcePage(spell, sourceName),
      provenance: "spells-full parsed source",
    },
    spell: {
      name: spell.name,
      slug: slugify(spell.name),
      school: spell.school,
      subschool: spell.subschool?.trim() ? spell.subschool.trim() : null,
      components: {
        verbal: components.V === true,
        somatic: components.S === true,
        material: components.M === true,
        arcaneFocus: components.AF === true,
        divineFocus: components.DF === true,
        xp: components.XP === true,
        metaBreath: false,
        trueName: false,
        corrupt: false,
      },
      castingTime: attributes.castingTime ?? null,
      range: attributes.range ?? null,
      target: attributes.target ?? null,
      effect: attributes.effect ?? null,
      area: attributes.area ?? null,
      duration: attributes.duration ?? null,
      savingThrow: attributes.savingThrow ?? null,
      spellResistance: attributes.spellResistance ?? null,
      extraComponents: "",
      description: descriptionText(spell),
      descriptionHtml: descriptionHtml(spell),
      verified: false,
      added: "2026-05-17 00:00:00",
    },
    levels: {
      classes: classLevels,
      domains: domainLevels,
    },
    descriptors: descriptorNames,
  };
}

function findExactTargetSpell(
  byRulebookAndName: Map<string, SpellIdentityRow>,
  spell: ParsedSpell,
  rulebookId: number,
) {
  for (const variant of spellNameVariants(spell.name)) {
    const row = byRulebookAndName.get(
      `${rulebookId}:${cleanSpellNameForMatch(variant)}`,
    );
    if (row) return row;
  }
  return undefined;
}

function findNameDuplicates(
  byName: Map<string, SpellIdentityRow[]>,
  spell: ParsedSpell,
) {
  const rows: SpellIdentityRow[] = [];
  const seenIds = new Set<number>();
  for (const variant of spellNameVariants(spell.name)) {
    for (const row of byName.get(cleanSpellNameForMatch(variant)) ?? []) {
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      rows.push(row);
    }
  }
  return rows;
}

function indexSpellIdentities(spells: SpellIdentityRow[]) {
  const byRulebookAndName = new Map<string, SpellIdentityRow>();
  const byName = new Map<string, SpellIdentityRow[]>();
  const bySlug = new Map<string, SpellIdentityRow>();

  for (const spell of spells) {
    const nameKey = cleanSpellNameForMatch(spell.name);
    byRulebookAndName.set(`${spell.rulebookId}:${nameKey}`, spell);
    const nameRows = byName.get(nameKey) ?? [];
    nameRows.push(spell);
    byName.set(nameKey, nameRows);
    bySlug.set(spell.slug, spell);
  }

  return { byRulebookAndName, byName, bySlug };
}

function buildInventoryEntry(params: {
  category: InventoryCategory;
  spell: ParsedSpell;
  appearance: ResolvedSourceAppearance;
  notes: string[];
  existing?: SpellIdentityRow;
  duplicates?: SpellIdentityRow[];
}): CorpusInventoryEntry {
  const { category, spell, appearance, notes, existing, duplicates } = params;
  const entry: CorpusInventoryEntry = {
    category,
    name: spell.name,
    source: spell.source,
    sourceLabel: appearance.label,
    page: appearance.page,
    notes,
  };
  if (appearance.targetRulebook) {
    entry.targetRulebook = appearance.targetRulebook.abbr;
    entry.targetRulebookName = appearance.targetRulebook.name;
  }
  if (existing) {
    entry.existingSpellId = existing.id;
    entry.existingSpellName = existing.name;
  }
  if (duplicates && duplicates.length > 0) {
    entry.duplicateSpellIds = duplicates.map((row) => row.id);
  }
  return entry;
}

function summarizeInventory(entries: CorpusInventoryEntry[]) {
  const counts: Record<InventoryCategory, number> = {
    ready: 0,
    duplicate: 0,
    mismatch: 0,
    "manual-review": 0,
    deferred: 0,
  };
  const byRulebook: Record<string, Record<InventoryCategory, number>> = {};
  for (const entry of entries) {
    counts[entry.category] += 1;
    const key = entry.targetRulebook ?? "(unmapped)";
    byRulebook[key] ??= {
      ready: 0,
      duplicate: 0,
      mismatch: 0,
      "manual-review": 0,
      deferred: 0,
    };
    byRulebook[key][entry.category] += 1;
  }
  return { counts, byRulebook };
}

function manualReviewRejectionNote(entry: CorpusInventoryEntry) {
  if (!entry.targetRulebook) return undefined;
  return manualReviewBlocker({ name: entry.name }, entry.targetRulebook);
}

function reviewArtifactRow(
  entry: CorpusInventoryEntry,
  reviewDecision: CorpusReviewArtifactRow["reviewDecision"],
  reviewReason: CorpusReviewArtifactRow["reviewReason"],
): CorpusReviewArtifactRow {
  return {
    schemaVersion: 1,
    reviewSource: "spells-full-corpus-inventory",
    reviewDecision,
    reviewReason,
    ...entry,
  };
}

function buildReviewArtifacts(entries: CorpusInventoryEntry[]) {
  const rejected: CorpusReviewArtifactRow[] = [];
  const ambiguous: CorpusReviewArtifactRow[] = [];

  for (const entry of entries) {
    if (entry.category === "duplicate") {
      rejected.push(reviewArtifactRow(entry, "rejected", "already-in-rules-db"));
      continue;
    }

    if (entry.category === "manual-review" && manualReviewRejectionNote(entry)) {
      rejected.push(
        reviewArtifactRow(entry, "rejected", "confirmed-typo-or-duplicate"),
      );
      continue;
    }

    if (entry.category === "manual-review") {
      ambiguous.push(
        reviewArtifactRow(entry, "ambiguous", "source-or-edition-ambiguity"),
      );
      continue;
    }

    if (entry.category === "mismatch") {
      ambiguous.push(reviewArtifactRow(entry, "ambiguous", "conversion-mismatch"));
    }
  }

  return { rejected, ambiguous };
}

function runCorpusInventory(mode: Mode, patchPath: string | undefined) {
  const parsedSpells = loadParsedSpells();
  const db = new Database(rulesDbPath(), { readonly: true });
  try {
    const lookups = loadConversionLookups(db);
    const resolveRulebook = makeRulebookResolver(loadRulebooks(db));
    const spellIndexes = indexSpellIdentities(loadSpellIdentities(db));
    const entries: CorpusInventoryEntry[] = [];
    const generated: unknown[] = [];
    let nextSpellId = currentMaxSpellId(db) + 1;

    for (const spell of parsedSpells) {
      const appearances = sourceAppearances(spell.source).map(resolveRulebook);
      const mapped = appearances.filter((appearance) => appearance.targetRulebook);
      const unresolved = appearances.filter(
        (appearance) => !appearance.targetRulebook,
      );

      if (mapped.length === 0) {
        entries.push(
          buildInventoryEntry({
            category: "deferred",
            spell,
            appearance: appearances[0] ?? {
              raw: "",
              label: "",
              page: null,
              notes: ["missing source label"],
            },
            notes: appearances.flatMap((appearance) => appearance.notes),
          }),
        );
        continue;
      }

      for (const appearance of mapped) {
        const targetRulebook = appearance.targetRulebook;
        if (!targetRulebook) continue;
        const notes = [...appearance.notes];
        const existing = findExactTargetSpell(
          spellIndexes.byRulebookAndName,
          spell,
          targetRulebook.id,
        );
        const slugRow = spellIndexes.bySlug.get(slugify(spell.name));
        const duplicates = findNameDuplicates(spellIndexes.byName, spell);

        if (existing || slugRow) {
          if (slugRow && (!existing || slugRow.id !== existing.id)) {
            notes.push(`slug already exists as id ${slugRow.id}: ${slugRow.name}`);
          }
          const duplicateExisting = existing ?? slugRow;
          entries.push(
            buildInventoryEntry({
              category: "duplicate",
              spell,
              appearance,
              notes,
              ...(duplicateExisting ? { existing: duplicateExisting } : {}),
              duplicates,
            }),
          );
          continue;
        }

        const manualReviewNote = manualReviewBlocker(spell, targetRulebook.abbr);
        if (manualReviewNote) {
          entries.push(
            buildInventoryEntry({
              category: "manual-review",
              spell,
              appearance,
              notes: [...notes, manualReviewNote],
              duplicates,
            }),
          );
          continue;
        }

        if (unresolved.length > 0 || mapped.length > 1) {
          if (mapped.length > 1) {
            notes.push(
              `multiple mapped source appearances: ${mapped
                .map((item) => item.targetRulebook?.abbr)
                .filter(Boolean)
                .join(", ")}`,
            );
          }
          for (const unresolvedAppearance of unresolved) {
            notes.push(
              `${unresolvedAppearance.label || "(blank source)"}: ${unresolvedAppearance.notes.join("; ")}`,
            );
          }
          entries.push(
            buildInventoryEntry({
              category: "manual-review",
              spell,
              appearance,
              notes,
              duplicates,
            }),
          );
          continue;
        }

        if (duplicates.length > 0) {
          notes.push(
            `same normalized name exists in other rulebooks: ${duplicates
              .map((row) => `${row.id}/${row.rulebook}`)
              .join(", ")}`,
          );
          entries.push(
            buildInventoryEntry({
              category: "manual-review",
              spell,
              appearance,
              notes,
              duplicates,
            }),
          );
          continue;
        }

        const check = conversionCheck(spell, lookups);
        notes.push(...check.notes);
        if (check.blockers.length > 0) {
          entries.push(
            buildInventoryEntry({
              category: "mismatch",
              spell,
              appearance,
              notes: [...notes, ...check.blockers],
            }),
          );
          continue;
        }

        let candidate: unknown | undefined;
        if (mode === "generate") {
          const candidateNotes = [...notes];
          candidate = convertCandidate(
            db,
            spell,
            {
              name: spell.name,
              targetRulebook: targetRulebook.abbr,
              sourceName: appearance.label,
              generate: true,
            },
            nextSpellId,
            candidateNotes,
            lookups,
          );
          if (candidate) {
            generated.push(candidate);
            nextSpellId += 1;
          } else {
            notes.push(...candidateNotes.filter((note) => !notes.includes(note)));
          }
        }

        entries.push(
          buildInventoryEntry({
            category: candidate || mode === "inspect" ? "ready" : "mismatch",
            spell,
            appearance,
            notes,
          }),
        );
      }
    }

    const summary = summarizeInventory(entries);
    const reviewArtifacts = buildReviewArtifacts(entries);
    const reportPath = writeReport(
      {
        mode,
        sourcePath: SPELLS_FULL_JSON,
        generatedCount: generated.length,
        summary,
        reviewArtifactCounts: {
          rejected: reviewArtifacts.rejected.length,
          ambiguous: reviewArtifacts.ambiguous.length,
        },
        entries,
      },
      `spells-full-corpus-inventory-${mode}`,
    );

    let writtenPatchPath: string | undefined;
    if (mode === "generate" && patchPath) {
      const resolved = resolvePatchPath(patchPath);
      writeJsonl(generated, resolved);
      writtenPatchPath = resolved;
    }

    let writtenRejectedPath: string | undefined;
    let writtenAmbiguousPath: string | undefined;
    if (mode === "generate") {
      writeJsonl(reviewArtifacts.rejected, DEFAULT_REJECTED_PATH);
      writeJsonl(reviewArtifacts.ambiguous, DEFAULT_AMBIGUOUS_PATH);
      writtenRejectedPath = DEFAULT_REJECTED_PATH;
      writtenAmbiguousPath = DEFAULT_AMBIGUOUS_PATH;
    }

    console.log(`spells-full corpus-inventory ${mode} OK`);
    console.log(`Source spells: ${parsedSpells.length}`);
    for (const [category, count] of Object.entries(summary.counts)) {
      console.log(`${category}: ${count}`);
    }
    console.log(`Generated: ${generated.length}`);
    console.log(`Rejected: ${reviewArtifacts.rejected.length}`);
    console.log(`Ambiguous: ${reviewArtifacts.ambiguous.length}`);
    console.log(`Report: ${reportPath}`);
    if (writtenPatchPath) console.log(`Patch: ${writtenPatchPath}`);
    if (writtenRejectedPath) console.log(`Rejected file: ${writtenRejectedPath}`);
    if (writtenAmbiguousPath) console.log(`Ambiguous file: ${writtenAmbiguousPath}`);
  } finally {
    db.close();
  }
}

function runMisses(
  mode: Mode,
  patchPath: string | undefined,
  misses: KnownMiss[],
  reportName: string,
  extraReport: Record<string, unknown> = {},
) {
  const parsedSpells = loadParsedSpells();
  const db = new Database(rulesDbPath(), { readonly: true });
  try {
    const report: CandidateReport[] = [];
    const generated: unknown[] = [];
    let nextSpellId = currentMaxSpellId(db) + 1;

    for (const miss of misses) {
      const notes: string[] = [];
      if (miss.note) notes.push(miss.note);

      const parsed = parsedSpells.find(
        (spell) =>
          cleanSpellNameForMatch(spell.name) ===
            cleanSpellNameForMatch(miss.name) &&
          sourceContains(spell, miss.sourceName),
      );
      if (!parsed) {
        report.push({
          name: miss.name,
          targetRulebook: miss.targetRulebook,
          parsedStatus: "missing",
          rulesStatus: existingSpell(db, miss.name, miss.targetRulebook)
            ? "exists"
            : "missing",
          generated: false,
          notes,
        });
        continue;
      }

      const rulesRow = existingSpell(db, parsed.name, miss.targetRulebook);
      if (rulesRow) {
        notes.push(`rules DB already has id ${rulesRow.id}`);
      }
      const slugRow = existingSlug(db, slugify(parsed.name));
      if (slugRow) {
        notes.push(`slug already exists as id ${slugRow.id}: ${slugRow.name}`);
      }

      let candidate: unknown | undefined;
      if (mode === "generate" && miss.generate && !rulesRow && !slugRow) {
        candidate = convertCandidate(db, parsed, miss, nextSpellId, notes);
        if (candidate) {
          generated.push(candidate);
          nextSpellId += 1;
        }
      }

      report.push({
        name: parsed.name,
        targetRulebook: miss.targetRulebook,
        parsedStatus: "exact",
        rulesStatus: rulesRow ? "exists" : "missing",
        generated: candidate ? true : false,
        notes,
      });
    }

    const reportPath = writeReport(
      {
        mode,
        sourcePath: SPELLS_FULL_JSON,
        ...extraReport,
        generatedCount: generated.length,
        misses: report,
      },
      `spells-full-${reportName}-${mode}`,
    );

    let writtenPatchPath: string | undefined;
    if (mode === "generate" && patchPath) {
      const resolved = resolvePatchPath(patchPath);
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(
        resolved,
        `${generated.map((item) => JSON.stringify(item)).join("\n")}\n`,
      );
      writtenPatchPath = resolved;
    }

    console.log(`spells-full ${reportName} ${mode} OK`);
    console.log(`Misses: ${report.length}`);
    console.log(`Generated: ${generated.length}`);
    console.log(`Report: ${reportPath}`);
    if (writtenPatchPath) console.log(`Patch: ${writtenPatchPath}`);
  } finally {
    db.close();
  }
}

function main() {
  const [, , command, target, ...args] = process.argv;
  if (command !== "inspect" && command !== "generate") usage();
  if (
    target !== "known-misses" &&
    target !== "short-desc-rules-gaps" &&
    target !== "corpus-inventory"
  ) {
    usage();
  }

  const writePatchIndex = args.indexOf("--write-patch");
  const patchPath =
    writePatchIndex >= 0 ? args[writePatchIndex + 1] : undefined;
  if (writePatchIndex >= 0 && !patchPath) usage();

  if (target === "known-misses") {
    runMisses(command, patchPath, KNOWN_MISSES, "known-misses");
    return;
  }

  if (target === "corpus-inventory") {
    runCorpusInventory(command, patchPath);
    return;
  }

  const inputIndex = args.indexOf("--input");
  const inputPathArg =
    inputIndex >= 0 ? args[inputIndex + 1] : DEFAULT_RULES_GAPS_PATH;
  if (!inputPathArg) usage();

  const { misses, skipped } = loadRulesGapMisses(inputPathArg);
  runMisses(command, patchPath, misses, "short-desc-rules-gaps", {
    rulesGapQueue: inputPathArg,
    skipped,
  });
}

export {
  buildReviewArtifacts,
  cleanSpellNameForMatch,
  conversionCheck,
  makeRulebookResolver,
  manualReviewBlocker,
  parseSourceAppearance,
  sourceAppearances,
  sourceLabelKey,
  spellNameVariants,
  summarizeInventory,
};

if (require.main === module) {
  main();
}
