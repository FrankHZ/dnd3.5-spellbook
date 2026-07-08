import fs from "node:fs";
import path from "node:path";

import { localDataDir, repoRoot } from "../shared/env";

type InventoryEntry = {
  category: string;
  name: string;
  sourceLabel: string;
};

type InventoryReport = {
  entries: InventoryEntry[];
};

type SourceCategory =
  | "parser-artifact"
  | "ambiguous-core-source"
  | "wotc-3e-legacy"
  | "wotc-3e35-periodical"
  | "wotc-setting-source-label"
  | "wotc-web-article"
  | "wotc-adventure"
  | "wotc-organized-play"
  | "licensed-d20-setting"
  | "licensed-d20-other-ip"
  | "official-fan-conversion"
  | "legacy-setting-conversion"
  | "unclassified";

type ImportDisposition =
  | "defer-parser-artifact"
  | "defer-out-of-scope"
  | "candidate-import"
  | "candidate-import-rulebook"
  | "manual-review-source"
  | "candidate-alias-review";

type RulebookSourceRow = {
  schemaVersion: 1;
  source: "spells-full-corpus-inventory";
  sourceLabel: string;
  entryCount: number;
  examples: string[];
  sourceCategory: SourceCategory;
  sourceFamily: string;
  importDisposition: ImportDisposition;
  confidence: "high" | "medium" | "low";
  evidenceUrls: string[];
  notes: string[];
};

const REPORT_ROOT = path.join(repoRoot(), "data-tools", "out", "spells-full");
const DEFAULT_OUTPUT_PATH = path.join(
  localDataDir(),
  "spells-full",
  "source-rulebooks.generated.jsonl",
);

const EVIDENCE = {
  darkSun: "https://athas.org/products/ds3",
  dragonMagazine: "https://rpggeek.com/rpgperiodical/1221/dragon",
  dragonlance: "https://rpggeek.com/rpgitem/44920/dragonlance-campaign-setting",
  kalamar: "https://www.rpg.net/reviews/archive/9/9179.phtml",
  ravenloft:
    "https://index.rpg.net/display-search.phtml?include=publisher%3A%3ASword+%26+Sorcery&key=background&sort=background&value=Ravenloft",
  rokugan: "https://www.rpg.net/reviews/archive/classic/rev_5564.phtml",
};

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools spells-full:rulebooks
  npm run -w data-tools spells-full:rulebooks -- --input data-tools/out/spells-full/<report>.json
  npm run -w data-tools spells-full:rulebooks -- --output ../data/spells-full/source-rulebooks.generated.jsonl

Reads a spells-full corpus inventory report and writes local deferred source
labels as review JSONL. The command does not read or write SQLite databases.
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let input: string | undefined;
  let output = DEFAULT_OUTPUT_PATH;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") {
      const next = argv[index + 1];
      if (!next) usage();
      input = resolveCliPath(next);
      index += 1;
      continue;
    }
    if (arg === "--output") {
      const next = argv[index + 1];
      if (!next) usage();
      output = resolveCliPath(next);
      index += 1;
      continue;
    }
    usage();
  }

  return { input: input ?? latestInventoryReport(), output };
}

function resolveCliPath(value: string) {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function latestInventoryReport() {
  if (!fs.existsSync(REPORT_ROOT)) {
    throw new Error(`spells-full report directory not found: ${REPORT_ROOT}`);
  }
  const candidates = fs
    .readdirSync(REPORT_ROOT)
    .filter((name) => name.endsWith("spells-full-corpus-inventory-generate.json"))
    .map((name) => path.join(REPORT_ROOT, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const latest = candidates[0];
  if (!latest) {
    throw new Error(`No corpus-inventory generate report found in ${REPORT_ROOT}`);
  }
  return latest;
}

function readInventoryReport(input: string) {
  const parsed = JSON.parse(fs.readFileSync(input, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.entries)) {
    throw new Error(`Invalid inventory report: ${input}`);
  }
  return parsed as InventoryReport;
}

function buildRows(report: InventoryReport) {
  const grouped = new Map<string, { count: number; examples: string[] }>();
  for (const entry of report.entries) {
    if (entry.category !== "deferred") continue;
    const sourceLabel = entry.sourceLabel?.trim() || "(missing source label)";
    const row = grouped.get(sourceLabel) ?? { count: 0, examples: [] };
    row.count += 1;
    if (row.examples.length < 5) row.examples.push(entry.name);
    grouped.set(sourceLabel, row);
  }

  return [...grouped.entries()]
    .map(([sourceLabel, group]): RulebookSourceRow => ({
      schemaVersion: 1,
      source: "spells-full-corpus-inventory",
      sourceLabel,
      entryCount: group.count,
      examples: group.examples,
      ...classifySourceLabel(sourceLabel),
    }))
    .sort((a, b) => b.entryCount - a.entryCount || a.sourceLabel.localeCompare(b.sourceLabel));
}

function classifySourceLabel(sourceLabel: string): Omit<
  RulebookSourceRow,
  "schemaVersion" | "source" | "sourceLabel" | "entryCount" | "examples"
> {
  if (sourceLabel === "(missing source label)") {
    return classification(
      "parser-artifact",
      "missing source label",
      "defer-parser-artifact",
      "high",
      [],
      ["Source row did not retain a source label; inspect parsed input before use."],
    );
  }

  if (/^Dragon Magazine\b|^Dragon Annual\b/i.test(sourceLabel)) {
    const dragonIssue = dragonMagazineIssue(sourceLabel);
    if (dragonIssue !== undefined && dragonIssue < 309) {
      return classification(
        "wotc-3e35-periodical",
        "Dragon Magazine",
        "defer-out-of-scope",
        "high",
        [EVIDENCE.dragonMagazine],
        ["Dragon Magazine issue predates the Dragon #309 D&D 3.5 cutover."],
      );
    }
    if (dragonIssue !== undefined) {
      return classification(
        "wotc-3e35-periodical",
        "Dragon Magazine",
        "candidate-import-rulebook",
        "high",
        [EVIDENCE.dragonMagazine],
        ["Dragon Magazine issue is D&D 3.5-era; add or map an issue rulebook before spell import."],
      );
    }
    return classification(
      "wotc-3e35-periodical",
      "Dragon Magazine",
      "manual-review-source",
      "high",
      [EVIDENCE.dragonMagazine],
      ["Periodical issue content; review article issue and D&D edition before import."],
    );
  }

  if (/^Dungeon Magazine\b/i.test(sourceLabel)) {
    return classification(
      "wotc-3e35-periodical",
      "Dungeon Magazine",
      "manual-review-source",
      "medium",
      [EVIDENCE.dragonMagazine],
      ["Periodical adventure content; review issue, article, and D&D edition before import."],
    );
  }

  if (/^Rokugan\b|^Magic of Rokugan$/i.test(sourceLabel)) {
    return classification(
      "licensed-d20-setting",
      "Rokugan / Legend of the Five Rings d20",
      "defer-out-of-scope",
      "high",
      [EVIDENCE.rokugan],
      ["AEG d20 setting line; keep outside automatic rules DB import."],
    );
  }

  if (/^Kalamar\b|^Villain Design Handbook$/i.test(sourceLabel)) {
    return classification(
      "licensed-d20-setting",
      "Kingdoms of Kalamar",
      "defer-out-of-scope",
      "high",
      [EVIDENCE.kalamar],
      ["Kenzer setting line; do not fold into WotC rules DB import automatically."],
    );
  }

  if (/^Dark Sun\b/i.test(sourceLabel)) {
    return classification(
      "official-fan-conversion",
      "Athas.org Dark Sun 3 / 3.5",
      "defer-out-of-scope",
      "high",
      [EVIDENCE.darkSun],
      ["Rules conversion source; treat separately from published rules DB sources."],
    );
  }

  if (/^Ravenloft\b/i.test(sourceLabel)) {
    return classification(
      "licensed-d20-setting",
      "Ravenloft d20 / Sword & Sorcery",
      "defer-out-of-scope",
      "high",
      [EVIDENCE.ravenloft],
      ["Licensed d20 setting line; keep outside automatic rules DB import."],
    );
  }

  if (/^Dragonlance\b|^War of the Lance$|^Holy Orders of the Stars$|^Legends of the Twins$/i.test(sourceLabel)) {
    return classification(
      "licensed-d20-setting",
      "Dragonlance d20",
      "defer-out-of-scope",
      "medium",
      [EVIDENCE.dragonlance],
      ["Dragonlance family sources other than DCS are deferred from the v1.1 published-corpus scope."],
    );
  }

  if (/^Call of Cthulhu\b|^Warcraft\b|^Diablo\b/i.test(sourceLabel)) {
    return classification(
      "licensed-d20-other-ip",
      sourceLabel.split(":")[0] ?? sourceLabel,
      "defer-out-of-scope",
      "medium",
      [],
      ["Licensed non-D&D setting/IP source; exclude from full D&D spell corpus import."],
    );
  }

  if (/^Birthright\b/i.test(sourceLabel)) {
    return classification(
      "official-fan-conversion",
      "Birthright d20 conversion",
      "defer-out-of-scope",
      "medium",
      [],
      ["Conversion source; keep outside automatic rules DB import."],
    );
  }

  if (/^Planescape\b/i.test(sourceLabel)) {
    return classification(
      "legacy-setting-conversion",
      "Planescape conversion",
      "defer-out-of-scope",
      "medium",
      [],
      ["Legacy setting conversion source; no direct current rules DB rulebook."],
    );
  }

  if (/^Player.?s Handbook$|^Dungeon Master.?s Guide$|^Player.?s Handbook, Rules Compendium$/i.test(sourceLabel)) {
    return classification(
      "ambiguous-core-source",
      "ambiguous core rulebook",
      "manual-review-source",
      "high",
      [],
      ["Source label lacks edition marker; avoid automatic PH/PHB/DMG mapping."],
    );
  }

  if (/^Player.?s Handbook 3\.0\b|^Dungeon Master.?s Guide 3\.0\b/i.test(sourceLabel)) {
    return classification(
      "wotc-3e-legacy",
      "D&D 3.0 core rulebook",
      "candidate-alias-review",
      "medium",
      [],
      ["3.0 source label; map only when row-level content is still useful after 3.5 duplicate checks."],
    );
  }

  if (
    /^Far Corners of the World\b|^Wyrms of the North\b|^Perilous Gateways\b|^Random Encounters\b|^Magic Books of Faer[uû]n\b|^Fey Feature\b|^Dragonshards\b|^Realms Personalities\b|^Web\b|^Web Adventure\b|^Ghostwalk web enhancement\b|^Ghostwalk 3\.0:|^Forgotten Realms: .*web enhancement\b|^Dungeon Magazine .*Web Enhancement\b|^April Fools\b|^Behind the Screen\b|^Celebrity Game Tables\b|^New College Life\b|^Part of the Pack\b|^Adventures:|^Magic Items:|^WB\d+$/i.test(
      sourceLabel,
    )
  ) {
    return classification(
      "wotc-web-article",
      "WotC web article or web enhancement",
      "manual-review-source",
      "medium",
      [],
      ["Web/article source; needs URL-level provenance before import."],
    );
  }

  if (/^Living Greyhawk\b/i.test(sourceLabel)) {
    return classification(
      "wotc-organized-play",
      "Living Greyhawk",
      "defer-out-of-scope",
      "medium",
      [],
      ["Organized-play adventure source; exclude from automatic corpus import."],
    );
  }

  if (/^Lord of the Iron Fortress$|^Bastion of Broken Souls$|^The Standing Stone$|^Expeditions? to Undermountain$/i.test(sourceLabel)) {
    if (/^Expeditions? to Undermountain$/i.test(sourceLabel)) {
      return classification(
        "wotc-adventure",
        "Expedition to Undermountain",
        "candidate-import-rulebook",
        "medium",
        [],
        ["D&D 3.5-era adventure/source label; add or map a rulebook before spell import."],
      );
    }
    return classification(
      "wotc-adventure",
      sourceLabel,
      "defer-out-of-scope",
      "medium",
      [],
      ["D&D 3.0-era adventure/module source; defer under the current corpus policy."],
    );
  }

  if (/^Spellbook:/i.test(sourceLabel)) {
    return classification(
      "wotc-web-article",
      "WotC online spellbook",
      "manual-review-source",
      "low",
      [],
      ["Spellbook source label needs original URL/provenance before import."],
    );
  }

  if (/^Forgotten Realms\b|^Eberron:/i.test(sourceLabel)) {
    if (
      /^Eberron: City of Stormreach$/i.test(sourceLabel) ||
      /^Eberron: Shadows of the Last War$/i.test(sourceLabel) ||
      /^Forgotten Realms: Anauroch$/i.test(sourceLabel)
    ) {
      return classification(
        "wotc-setting-source-label",
        sourceLabel.startsWith("Eberron:") ? "Eberron source label" : "Forgotten Realms source label",
        "candidate-import-rulebook",
        "medium",
        [],
        ["D&D 3.5 source label; add or map a rulebook before spell import."],
      );
    }
    if (
      /^Eberron: Dragons of Eberron$/i.test(sourceLabel) ||
      /^Forgotten Realms: Powers of Faer[uû]n$/i.test(sourceLabel)
    ) {
      return classification(
        "wotc-setting-source-label",
        sourceLabel.startsWith("Eberron:") ? "Eberron source label" : "Forgotten Realms source label",
        "candidate-import",
        "medium",
        [],
        ["D&D 3.5 source label maps to an existing rules DB rulebook alias."],
      );
    }
    if (
      /^Forgotten Realms: Monsters of Faer[uû]n$/i.test(sourceLabel) ||
      /^Forgotten Realms Campaign Setting, Player.?s Handbook, Tome and Blood$/i.test(sourceLabel)
    ) {
      return classification(
        "wotc-setting-source-label",
        "Forgotten Realms source label",
        "defer-out-of-scope",
        "medium",
        [],
        ["D&D 3.0 or mixed 3.0 source label; defer under the current corpus policy."],
      );
    }
    return classification(
      "wotc-setting-source-label",
      sourceLabel.startsWith("Eberron:") ? "Eberron source label" : "Forgotten Realms source label",
      "manual-review-source",
      "medium",
      [],
      ["Setting source label needs row-level book/source confirmation before import."],
    );
  }

  return classification(
    "unclassified",
    "unclassified source",
    "manual-review-source",
    "low",
    [],
    ["No durable source-family classification yet."],
  );
}

function dragonMagazineIssue(sourceLabel: string) {
  const match = sourceLabel.match(/^Dragon Magazine\s+(\d{3})\b/i);
  return match?.[1] ? Number(match[1]) : undefined;
}

function classification(
  sourceCategory: SourceCategory,
  sourceFamily: string,
  importDisposition: ImportDisposition,
  confidence: RulebookSourceRow["confidence"],
  evidenceUrls: string[],
  notes: string[],
) {
  return {
    sourceCategory,
    sourceFamily,
    importDisposition,
    confidence,
    evidenceUrls,
    notes,
  };
}

function writeJsonl(rows: RulebookSourceRow[], output: string) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function main() {
  const { input, output } = parseArgs(process.argv.slice(2));
  const report = readInventoryReport(input);
  const rows = buildRows(report);
  writeJsonl(rows, output);

  const byCategory = new Map<string, number>();
  for (const row of rows) {
    byCategory.set(row.sourceCategory, (byCategory.get(row.sourceCategory) ?? 0) + 1);
  }

  console.log("spells-full source rulebooks OK");
  console.log(`Input: ${input}`);
  console.log(`Rows: ${rows.length}`);
  for (const [category, count] of [...byCategory.entries()].sort()) {
    console.log(`${category}: ${count}`);
  }
  console.log(`Output: ${output}`);
}

if (require.main === module) {
  main();
}

export { buildRows, classifySourceLabel };
