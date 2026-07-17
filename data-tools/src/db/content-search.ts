import Database from "better-sqlite3";

import {
  buildContentSearchDocuments,
  replaceContentSearchIndex,
  type ContentSearchMechanicRow,
  type ContentSearchSource,
  type ContentSearchSpellRow,
  type ContentSearchSummaryRow,
  type ContentSearchTextRow,
} from "./content-search-documents";
import {
  loadServerEnv,
  resolveServerRelativePath,
} from "../shared/env";

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools content:search:rebuild -- --dry-run
  npm run -w data-tools content:search:rebuild

Validates or rebuilds the derived FTS5 spell search index in CONTENT_DATABASE_URL.
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    usage();
  }
  return { dryRun };
}

function contentDbPath() {
  loadServerEnv();
  const raw = process.env.CONTENT_DATABASE_URL ?? process.env.APP_DATABASE_URL;
  if (!raw) {
    throw new Error(
      "CONTENT_DATABASE_URL or transitional APP_DATABASE_URL is not set",
    );
  }
  if (!raw.startsWith("file:")) {
    throw new Error(`Only file: SQLite URLs are supported, got ${raw}`);
  }
  return resolveServerRelativePath(raw.slice("file:".length));
}

export function assertContentSearchSchema(db: Database.Database) {
  const required = ["SpellSearchDocument", "SpellSearchIndexState"];
  const existing = new Set(
    (db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (?, ?)`,
      )
      .all(...required) as Array<{ name: string }>).map((row) => row.name),
  );
  const missing = required.filter((table) => !existing.has(table));
  if (missing.length > 0) {
    throw new Error(
      `Content search tables are missing. Apply server/db/content migrations first: ${missing.join(", ")}`,
    );
  }
}

export function readContentSearchSource(
  db: Database.Database,
): ContentSearchSource {
  const spells = db.prepare(`
    SELECT
      "legacySpellId" AS "spellId",
      "canonicalName",
      "slug",
      "descriptionText",
      "castingTimeRaw",
      "rangeRaw",
      "targetRaw",
      "effectRaw",
      "areaRaw",
      "durationRaw",
      "savingThrowRaw",
      "resistanceRaw"
    FROM "SpellContent"
    ORDER BY "legacySpellId"
  `).all() as ContentSearchSpellRow[];
  const texts = db.prepare(`
    SELECT "spellId", "lang", "variant", "name", "descriptionText"
    FROM "I18nSpellText"
    ORDER BY "spellId", "lang", "variant"
  `).all() as ContentSearchTextRow[];
  const summaries = db.prepare(`
    SELECT "spellId", "lang", "variant", "summaryText"
    FROM "I18nSpellSummaryText"
    WHERE "reviewStatus" = 'accepted'
    ORDER BY "spellId", "lang", "variant"
  `).all() as ContentSearchSummaryRow[];
  const mechanics = db.prepare(`
    SELECT
      s."legacySpellId" AS "spellId",
      mf."rawText",
      mf."category",
      mf."normalizedText"
    FROM "SpellMechanicFacet" mf
    JOIN "SpellContent" s ON s."id" = mf."spellId"
    WHERE mf."reviewStatus" = 'accepted'
    ORDER BY s."legacySpellId", mf."mechanicType"
  `).all() as ContentSearchMechanicRow[];
  return { spells, texts, summaries, mechanics };
}

export function rebuildContentSearchIndex(
  db: Database.Database,
  dryRun: boolean,
) {
  assertContentSearchSchema(db);
  const source = readContentSearchSource(db);
  const documents = buildContentSearchDocuments(source);
  if (documents.length < source.spells.length) {
    throw new Error(
      `Generated ${documents.length} search documents for ${source.spells.length} spells`,
    );
  }
  if (!dryRun) replaceContentSearchIndex(db, documents);
  return {
    mode: dryRun ? "dry-run" : "rebuild",
    spells: source.spells.length,
    localizedTexts: source.texts.length,
    summaries: source.summaries.length,
    mechanics: source.mechanics.length,
    documents: documents.length,
  };
}

function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const dbPath = contentDbPath();
  const db = new Database(dbPath, {
    readonly: dryRun,
    fileMustExist: true,
  });
  try {
    const result = rebuildContentSearchIndex(db, dryRun);
    console.log(JSON.stringify({ dbPath, ...result }, null, 2));
  } finally {
    db.close();
  }
}

if (require.main === module) main();
