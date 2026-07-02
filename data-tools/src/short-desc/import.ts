import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";
import {
  readSummaryJsonlText,
  type SummaryRow,
} from "./summary-row-schema";

type ExistingRow = Omit<SummaryRow, "id">;

const DEFAULT_INPUT_PATH = path.join(
  localDataDir(),
  "short-desc-normalized",
  "summaries.generated.jsonl",
);
const REPORT_ROOT = path.join(repoRoot(), "data-tools", "out", "short-desc-import");

function usage(): never {
  console.error(`Usage:
  npm run -w data-tools summaries:import -- --dry-run
  npm run -w data-tools summaries:import
  npm run -w data-tools summaries:import -- --input data/short-desc-normalized/summaries.generated.jsonl

Imports accepted short descriptions into the app DB I18nSpellSummaryText table.
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  let dryRun = false;
  let inputPath = DEFAULT_INPUT_PATH;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--input") {
      const next = argv[i + 1];
      if (!next) usage();
      inputPath = path.isAbsolute(next)
        ? next
        : path.resolve(process.cwd(), next);
      i += 1;
      continue;
    }
    usage();
  }

  return { dryRun, inputPath };
}

function appDbPath() {
  loadServerEnv();
  const raw = process.env.APP_DATABASE_URL;
  if (!raw) throw new Error("APP_DATABASE_URL is not set");
  if (!raw.startsWith("file:")) {
    throw new Error(`Only file: SQLite URLs are supported, got ${raw}`);
  }
  return resolveServerRelativePath(raw.slice("file:".length));
}

function readInput(inputPath: string) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  return readSummaryJsonlText(fs.readFileSync(inputPath, "utf-8"));
}

function tableExists(db: Database.Database) {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'I18nSpellSummaryText'",
    )
    .get() as { name: string } | undefined;
  return !!row;
}

function rowChanged(existing: ExistingRow, next: SummaryRow) {
  return (
    existing.rulebookId !== next.rulebookId ||
    existing.summaryText !== next.summaryText ||
    existing.sourceKey !== next.sourceKey ||
    existing.sourceName !== next.sourceName ||
    existing.sourceKind !== next.sourceKind ||
    existing.reviewStatus !== next.reviewStatus
  );
}

function importRows(dbPath: string, rows: SummaryRow[], dryRun: boolean) {
  const db = new Database(dbPath);
  try {
    if (!tableExists(db)) {
      throw new Error(
        "I18nSpellSummaryText table is missing. Apply server/prisma-app migrations first.",
      );
    }

    const existingRows = db
      .prepare(
        `SELECT spellId, rulebookId, lang, variant, summaryText, sourceKey, sourceName, sourceKind, reviewStatus
         FROM I18nSpellSummaryText`,
      )
      .all() as ExistingRow[];
    const existingByKey = new Map<string, ExistingRow>();
    for (const row of existingRows) {
      existingByKey.set(`${row.spellId}:${row.lang}:${row.variant}`, row);
    }

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    const insertStmt = db.prepare(`
      INSERT INTO I18nSpellSummaryText (
        id, spellId, rulebookId, lang, variant, summaryText, sourceKey,
        sourceName, sourceKind, reviewStatus, updatedAt
      ) VALUES (
        @id, @spellId, @rulebookId, @lang, @variant, @summaryText, @sourceKey,
        @sourceName, @sourceKind, @reviewStatus, CURRENT_TIMESTAMP
      )
    `);

    const updateStmt = db.prepare(`
      UPDATE I18nSpellSummaryText
      SET rulebookId = @rulebookId,
          summaryText = @summaryText,
          sourceKey = @sourceKey,
          sourceName = @sourceName,
          sourceKind = @sourceKind,
          reviewStatus = @reviewStatus,
          updatedAt = CURRENT_TIMESTAMP
      WHERE spellId = @spellId AND lang = @lang AND variant = @variant
    `);

    const run = db.transaction(() => {
      for (const row of rows) {
        const key = `${row.spellId}:${row.lang}:${row.variant}`;
        const existing = existingByKey.get(key);
        if (!existing) {
          inserted += 1;
          if (!dryRun) insertStmt.run(row);
          continue;
        }
        if (rowChanged(existing, row)) {
          updated += 1;
          if (!dryRun) updateStmt.run(row);
          continue;
        }
        unchanged += 1;
      }
    });

    run();

    return {
      inserted,
      updated,
      unchanged,
      total: rows.length,
    };
  } finally {
    db.close();
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function countByLang(rows: SummaryRow[]) {
  return rows.reduce(
    (counts, row) => {
      counts[row.lang] += 1;
      return counts;
    },
    { en: 0, zh: 0 },
  );
}

function writeReport(report: unknown, dryRun: boolean) {
  fs.mkdirSync(REPORT_ROOT, { recursive: true });
  const suffix = dryRun ? "dry-run" : "apply";
  const reportPath = path.join(REPORT_ROOT, `${timestamp()}-${suffix}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
}

function main() {
  const { dryRun, inputPath } = parseArgs(process.argv.slice(2));
  const targetDbPath = appDbPath();
  const { rows, errors } = readInput(inputPath);

  if (errors.length > 0) {
    console.error("Summary import validation failed");
    for (const error of errors.slice(0, 50)) console.error(error);
    if (errors.length > 50) {
      console.error(`... ${errors.length - 50} more errors`);
    }
    process.exit(1);
  }

  const result = importRows(targetDbPath, rows, dryRun);
  const reportPath = writeReport(
    {
      mode: dryRun ? "dry-run" : "apply",
      inputPath,
      targetDbPath,
      rowCount: rows.length,
      rowsByLang: countByLang(rows),
      inserted: result.inserted,
      updated: result.updated,
      unchanged: result.unchanged,
      skipped: 0,
      blockers: 0,
    },
    dryRun,
  );
  console.log(dryRun ? "Summary import dry-run OK" : "Summary import OK");
  console.log(`Input: ${inputPath}`);
  console.log(`Target DB: ${targetDbPath}`);
  console.log(`Rows: ${result.total}`);
  console.log(`Inserted: ${result.inserted}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Unchanged: ${result.unchanged}`);
  console.log(`Report: ${reportPath}`);
}

main();
