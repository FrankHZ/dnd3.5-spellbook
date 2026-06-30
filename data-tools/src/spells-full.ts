import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "./env";

type Mode = "inspect" | "generate";

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

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools spells-full:inspect -- known-misses
  npm run -w data-tools spells-full:generate -- known-misses --write-patch spells/spells-full-known-misses.jsonl
  npm run -w data-tools spells-full:inspect -- short-desc-rules-gaps
  npm run -w data-tools spells-full:generate -- short-desc-rules-gaps --write-patch spells/short-desc-rules-gaps.jsonl

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
): Map<string, { id: number; label: string }> {
  const rows = db
    .prepare(`SELECT id, ${column} AS label FROM ${table}`)
    .all() as Array<{ id: number; label: string }>;
  return new Map(rows.map((row) => [normalize(row.label), row]));
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

function descriptors(raw: string | undefined) {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
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
) {
  const classes = loadLookup(db, "dnd_characterclass", "name");
  const domains = loadLookup(db, "dnd_domain", "name");
  const schools = loadLookup(db, "dnd_spellschool", "name");
  const subschools = loadLookup(db, "dnd_spellsubschool", "name");
  const spellDescriptors = loadLookup(db, "dnd_spelldescriptor", "name");

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
      if (!classes.has(normalize(className))) {
        notes.push(`unresolved class: ${className}`);
        return [];
      }
      return [{ class: className, level: parsed.level, extra: parsed.extra }];
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

  if (notes.some((note) => note.startsWith("unresolved") || note.startsWith("unparsed"))) {
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
  if (target !== "known-misses" && target !== "short-desc-rules-gaps") usage();

  const writePatchIndex = args.indexOf("--write-patch");
  const patchPath =
    writePatchIndex >= 0 ? args[writePatchIndex + 1] : undefined;
  if (writePatchIndex >= 0 && !patchPath) usage();

  if (target === "known-misses") {
    runMisses(command, patchPath, KNOWN_MISSES, "known-misses");
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

main();
