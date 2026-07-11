import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import {
  localDataDir,
  loadServerEnv,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";
import {
  normalizePublicationName,
  readRulebookPublicationJsonlText,
} from "./labels-audit";
import { deriveRulebookPublicationMetadata } from "./publication-metadata";

const DEFAULT_OUTPUT_PATH = path.join(
  localDataDir(),
  "rulebook-publications",
  "publications.jsonl",
);
const CHM_PUBLICATIONS_JSONL_PATH = path.join(
  localDataDir(),
  "rulebook-labels",
  "chm-publications.jsonl",
);

type RulebookRow = {
  id: number;
  dndEditionId: number;
  name: string;
  abbr: string;
  slug: string;
  year: string | null;
  published: string | null;
  officialUrl: string | null;
  image: string | null;
  editionSlug: string | null;
  editionCore: number | boolean | null;
};

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools rulebooks:publications:seed
  npm run -w data-tools rulebooks:publications:seed -- --output ../data/rulebook-publications/publications.jsonl
  npm run -w data-tools rulebooks:publications:seed -- --force

Seeds the maintained publication metadata JSONL from the configured rules DB and
the local CHM publication-label JSONL. Review and edit the generated data repo
file before treating it as authoritative.
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let output = DEFAULT_OUTPUT_PATH;
  let force = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      const next = argv[index + 1];
      if (!next) usage();
      output = path.isAbsolute(next) ? next : path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    usage();
  }

  return { output, force };
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

function readChmPublicationLabels() {
  const byName = new Map<string, { displayAbbr: string; zhName: string }>();
  if (!fs.existsSync(CHM_PUBLICATIONS_JSONL_PATH)) return byName;

  const sourcePath = path.relative(localDataDir(), CHM_PUBLICATIONS_JSONL_PATH);
  const parsed = readRulebookPublicationJsonlText(
    fs.readFileSync(CHM_PUBLICATIONS_JSONL_PATH, "utf8"),
    sourcePath,
  );
  if (parsed.errors.length > 0) {
    throw new Error(
      `Invalid CHM publication JSONL ${CHM_PUBLICATIONS_JSONL_PATH}:\n${parsed.errors.join("\n")}`,
    );
  }

  for (const row of parsed.rows) {
    byName.set(normalizePublicationName(row.englishName), {
      displayAbbr: row.displayAbbr,
      zhName: row.zhName,
    });
  }
  return byName;
}

function readRulebookRows(db: Database.Database) {
  return db
    .prepare(
      `
      SELECT rb.id,
             rb.dnd_edition_id AS dndEditionId,
             rb.name,
             rb.abbr,
             rb.slug,
             NULLIF(TRIM(rb.year), '') AS year,
             rb.published,
             NULLIF(TRIM(rb.official_url), '') AS officialUrl,
             NULLIF(TRIM(rb.image), '') AS image,
             edition.slug AS editionSlug,
             edition.core AS editionCore
      FROM dnd_rulebook rb
      LEFT JOIN dnd_dndedition edition ON edition.id = rb.dnd_edition_id
      ORDER BY rb.id
    `,
    )
    .all() as RulebookRow[];
}

function seedPublicationRows(rows: RulebookRow[]) {
  const labels = readChmPublicationLabels();
  return rows.map((row) => {
    const label = labels.get(normalizePublicationName(row.name));
    const metadata = deriveRulebookPublicationMetadata(row);
    const published = normalizeDate(row.published);
    const year = normalizeYear(row.year) ?? (published ? published.slice(0, 4) : null);

    return {
      schemaVersion: 1,
      legacyRulebookId: row.id,
      source: label ? "rules-clean+chm-publications" : "rules-clean",
      name: row.name,
      abbr: row.abbr,
      displayAbbr: label?.displayAbbr ?? row.abbr,
      ...(label?.zhName ? { zhName: label.zhName } : {}),
      category: metadata.category,
      family: metadata.family,
      sourceKind: metadata.sourceKind,
      displayOrder: metadata.displayOrder,
      year,
      published,
      officialUrl: row.officialUrl,
      image: row.image,
      reviewStatus: "review",
    };
  });
}

function normalizeYear(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return /^\d{4}$/.test(trimmed) ? trimmed : null;
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function writeJsonl(filePath: string, rows: unknown[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    "utf8",
  );
}

function main() {
  const { output, force } = parseArgs(process.argv.slice(2));
  if (!force && fs.existsSync(output)) {
    throw new Error(
      `Refusing to overwrite existing publication metadata JSONL: ${output}\n` +
        "Use --force to rebuild the seed file.",
    );
  }
  const db = new Database(rulesDbPath(), { readonly: true, fileMustExist: true });
  try {
    const rows = seedPublicationRows(readRulebookRows(db));
    writeJsonl(output, rows);
    console.log(`Rulebook publication metadata written: ${output}`);
    console.log(`Rows: ${rows.length}`);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}
