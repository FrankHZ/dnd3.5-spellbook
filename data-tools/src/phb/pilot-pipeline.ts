import fs from "node:fs";
import path from "node:path";

import {
  loadServerEnv,
  localDataDir,
  repoRoot,
  resolveServerRelativePath,
} from "../shared/env";
import { readPhbErrataInventory } from "./errata-inventory";
import {
  comparePilotWithLocalDb,
  PHB_COMPARISON_CATEGORIES,
  type PilotClassListOccurrenceForComparison,
  type PilotComparisonSpell,
  type PilotDbComparisonRow,
} from "./pilot-comparison";
import {
  extractPilotEntities,
  parsePilotPageRows,
  type PilotEntityRow,
} from "./pilot-entities";
import { buildPilotErrataOverlays } from "./pilot-errata";
import { readPhbPilotManifest } from "./pilot-manifest";
import {
  buildProposedPilotRowReviews,
  type PilotRowReview,
  validatePilotRowReviews,
} from "./pilot-row-review";
import { sha256File } from "./source-manifest";

export const PHB_PILOT_ENTITIES_RELATIVE_PATH =
  "phb35/extracted/pilot/entities.jsonl";
export const PHB_PILOT_ENTITIES_MANIFEST_RELATIVE_PATH =
  "phb35/extracted/pilot/entities-manifest.json";
export const PHB_PILOT_ERRATA_OVERLAYS_RELATIVE_PATH =
  "phb35/extracted/pilot/errata-overlays.jsonl";
export const PHB_PILOT_ERRATA_MANIFEST_RELATIVE_PATH =
  "phb35/extracted/pilot/errata-overlay-manifest.json";
export const PHB_PILOT_DB_COMPARISON_RELATIVE_PATH =
  "phb35/extracted/pilot/db-comparison.jsonl";
export const PHB_PILOT_DB_COMPARISON_MANIFEST_RELATIVE_PATH =
  "phb35/extracted/pilot/db-comparison-manifest.json";
export const PHB_PILOT_ROW_REVIEW_RELATIVE_PATH =
  "phb35/review/pilot-row-review.jsonl";
export const PHB_PILOT_ROW_REVIEW_MANIFEST_RELATIVE_PATH =
  "phb35/review/pilot-row-review-manifest.json";

const PILOT_MANIFEST = "phb35/review/pilot-manifest.json";
const PAGES = "phb35/extracted/pilot/pages.jsonl";
const ERRATA_INVENTORY = "phb35/review/errata-inventory.jsonl";

export function runPilotComparison() {
  const dataRoot = localDataDir();
  const { filePath: pilotPath, manifest } = readPhbPilotManifest(dataRoot);
  const pagesPath = resolveDataPath(dataRoot, PAGES);
  const pages = parsePilotPageRows(fs.readFileSync(pagesPath, "utf8"));
  const extraction = extractPilotEntities(manifest, pages);
  const entityRows = extraction.rows.map((row) => ({
    schemaVersion: 1,
    rowId: entityRowId(row),
    ...row,
  }));
  const entitiesPath = resolveDataPath(
    dataRoot,
    PHB_PILOT_ENTITIES_RELATIVE_PATH,
  );
  writeJsonl(entitiesPath, entityRows);
  const entitiesManifestPath = resolveDataPath(
    dataRoot,
    PHB_PILOT_ENTITIES_MANIFEST_RELATIVE_PATH,
  );
  writeJson(entitiesManifestPath, {
    schemaVersion: 1,
    pilotManifest: artifact(PILOT_MANIFEST, pilotPath),
    pages: artifact(PAGES, pagesPath),
    output: artifact(PHB_PILOT_ENTITIES_RELATIVE_PATH, entitiesPath),
    counts: {
      rows: entityRows.length,
      spells: extraction.spells.length,
      classListOccurrences: extraction.classListOccurrences.length,
      summonTables: extraction.summonTables.length,
    },
  });

  const { filePath: inventoryPath, rows: inventory } =
    readPhbErrataInventory(dataRoot);
  const overlays = buildPilotErrataOverlays(
    extraction.spells.map((spell) => ({
      caseId: spell.caseId,
      printedName: spell.printedName,
      fields: { ...spell.fields },
      bodyText: spell.bodyText,
    })),
    inventory,
    pages,
  ).map((row) => ({ rowId: `errata:${row.caseId}`, ...row }));
  const overlaysPath = resolveDataPath(
    dataRoot,
    PHB_PILOT_ERRATA_OVERLAYS_RELATIVE_PATH,
  );
  writeJsonl(overlaysPath, overlays);
  const errataManifestPath = resolveDataPath(
    dataRoot,
    PHB_PILOT_ERRATA_MANIFEST_RELATIVE_PATH,
  );
  writeJson(errataManifestPath, {
    schemaVersion: 1,
    entitiesManifest: artifact(
      PHB_PILOT_ENTITIES_MANIFEST_RELATIVE_PATH,
      entitiesManifestPath,
    ),
    inventory: artifact(ERRATA_INVENTORY, inventoryPath),
    output: artifact(PHB_PILOT_ERRATA_OVERLAYS_RELATIVE_PATH, overlaysPath),
    counts: {
      rows: overlays.length,
      applied: overlays.filter((row) =>
        row.operationResults.some((result) => result.status === "applied"),
      ).length,
      alreadyIncorporated: overlays.filter(
        (row) => row.disposition === "already-incorporated",
      ).length,
      reviewRequired: overlays.filter((row) => row.reviewRequired).length,
    },
  });

  const comparisonSpells: PilotComparisonSpell[] = extraction.spells.map(
    (spell) => {
      const summonTable = extraction.summonTables.find(
        (table) => table.caseId === spell.caseId,
      );
      return {
        caseId: spell.caseId,
        printedName: spell.printedName,
        sourcePages: spell.sourcePages.flatMap((page) =>
          page.printedPageNumber === null ? [] : [page.printedPageNumber],
        ),
        school: spell.school,
        fields: { ...spell.fields },
        bodyText: spell.bodyText,
        reviewFlags: spell.reviewFlags,
        ...(summonTable
          ? {
              summonTable: summonTable.levels.flatMap((level) =>
                level.monsters.map((monster) => ({
                  level: level.level,
                  monsterName: monster.monsterName,
                  alignment: monster.alignment,
                })),
              ),
            }
          : {}),
      };
    },
  );
  const comparisonOccurrences: PilotClassListOccurrenceForComparison[] =
    extraction.classListOccurrences.map((row) => ({
      caseId: row.caseId,
      printedName: row.printedName,
      owner: row.owner,
      level: row.level,
      summaryText: row.summaryText,
      wordingGroupKey: row.wordingGroupKey,
    }));
  const comparisons = comparePilotWithLocalDb({
    spells: comparisonSpells,
    overlays,
    classListOccurrences: comparisonOccurrences,
  }).map((row) => ({ rowId: `comparison:${row.caseId}`, ...row }));
  const comparisonsPath = resolveDataPath(
    dataRoot,
    PHB_PILOT_DB_COMPARISON_RELATIVE_PATH,
  );
  writeJsonl(comparisonsPath, comparisons);
  const dbIdentities = comparisonDatabaseIdentities();
  const comparisonManifestPath = resolveDataPath(
    dataRoot,
    PHB_PILOT_DB_COMPARISON_MANIFEST_RELATIVE_PATH,
  );
  writeJson(comparisonManifestPath, {
    schemaVersion: 1,
    errataManifest: artifact(
      PHB_PILOT_ERRATA_MANIFEST_RELATIVE_PATH,
      errataManifestPath,
    ),
    databases: dbIdentities,
    output: artifact(PHB_PILOT_DB_COMPARISON_RELATIVE_PATH, comparisonsPath),
    counts: {
      rows: comparisons.length,
      categories: categoryCounts(comparisons),
    },
  });

  const rowIdsByCase = new Map<string, string[]>();
  for (const row of entityRows) {
    const values = rowIdsByCase.get(row.caseId) ?? [];
    values.push(row.rowId);
    rowIdsByCase.set(row.caseId, values);
  }
  const proposedReviews = buildProposedPilotRowReviews({
    manifest,
    comparisons,
    classListOccurrences: comparisonOccurrences,
    entityRowIdsByCase: rowIdsByCase,
  });
  const rowReviewPath = resolveDataPath(
    dataRoot,
    PHB_PILOT_ROW_REVIEW_RELATIVE_PATH,
  );
  const rowReviews = mergeExistingReviews(rowReviewPath, proposedReviews);
  const reviewErrors = validatePilotRowReviews(manifest, rowReviews, false);
  if (reviewErrors.length > 0) {
    throw new Error(`Pilot row review is invalid:\n${reviewErrors.join("\n")}`);
  }
  writeJsonl(rowReviewPath, rowReviews);
  const rowReviewManifestPath = resolveDataPath(
    dataRoot,
    PHB_PILOT_ROW_REVIEW_MANIFEST_RELATIVE_PATH,
  );
  writeJson(rowReviewManifestPath, {
    schemaVersion: 1,
    comparisonManifest: artifact(
      PHB_PILOT_DB_COMPARISON_MANIFEST_RELATIVE_PATH,
      comparisonManifestPath,
    ),
    reviews: artifact(PHB_PILOT_ROW_REVIEW_RELATIVE_PATH, rowReviewPath),
    counts: {
      rows: rowReviews.length,
      statuses: countBy(rowReviews, (row) => row.status),
      proposedCategories: countBy(rowReviews, (row) => row.proposedCategory),
    },
  });

  const report = {
    schemaVersion: 1,
    artifacts: {
      entitiesManifest: artifact(
        PHB_PILOT_ENTITIES_MANIFEST_RELATIVE_PATH,
        entitiesManifestPath,
      ),
      errataManifest: artifact(
        PHB_PILOT_ERRATA_MANIFEST_RELATIVE_PATH,
        errataManifestPath,
      ),
      comparisonManifest: artifact(
        PHB_PILOT_DB_COMPARISON_MANIFEST_RELATIVE_PATH,
        comparisonManifestPath,
      ),
      rowReviewManifest: artifact(
        PHB_PILOT_ROW_REVIEW_MANIFEST_RELATIVE_PATH,
        rowReviewManifestPath,
      ),
    },
    counts: {
      entities: entityRows.length,
      comparisons: comparisons.length,
      comparisonCategories: categoryCounts(comparisons),
      rowReviews: rowReviews.length,
      unresolvedRowReviews: rowReviews.filter(
        (row) => row.status === "proposed",
      ).length,
    },
    commands: {
      rebuild: "npm run -w data-tools phb:source:compare -- --pilot",
      verify: "npm run -w data-tools phb:pilot:verify",
    },
  };
  const reportPath = path.join(
    repoRoot(),
    "data-tools",
    "out",
    "phb",
    "pilot-comparison.generated.json",
  );
  writeJson(reportPath, report);
  return { report, reportPath, rowReviews };
}

export function writeProposedEndToEndReview() {
  const dataRoot = localDataDir();
  const { manifest } = readPhbPilotManifest(dataRoot);
  const rowReviewPath = resolveDataPath(
    dataRoot,
    PHB_PILOT_ROW_REVIEW_RELATIVE_PATH,
  );
  const rowReviews = readJsonl<PilotRowReview>(rowReviewPath);
  const reviewErrors = validatePilotRowReviews(manifest, rowReviews, true);
  if (reviewErrors.length > 0) {
    throw new Error(
      `End-to-end review requires terminal pilot rows:\n${reviewErrors.join("\n")}`,
    );
  }
  const pageReviewPath = resolveDataPath(
    dataRoot,
    "phb35/review/pilot-page-extraction-review.json",
  );
  const pageReview = JSON.parse(fs.readFileSync(pageReviewPath, "utf8")) as {
    artifacts: Array<{ role: string; relativePath: string; sha256: string }>;
    reproducibility: unknown;
  };
  const reportPath = path.join(
    repoRoot(),
    "data-tools",
    "out",
    "phb",
    "pilot-comparison.generated.json",
  );
  const comparisonReport = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
    counts: unknown;
  };
  const endToEndArtifacts = [
    ...pageReview.artifacts,
    reviewArtifact(
      "entity-extraction",
      PHB_PILOT_ENTITIES_MANIFEST_RELATIVE_PATH,
      dataRoot,
    ),
    reviewArtifact(
      "errata-overlay",
      PHB_PILOT_ERRATA_MANIFEST_RELATIVE_PATH,
      dataRoot,
    ),
    reviewArtifact(
      "db-comparison",
      PHB_PILOT_DB_COMPARISON_MANIFEST_RELATIVE_PATH,
      dataRoot,
    ),
    reviewArtifact(
      "row-review",
      PHB_PILOT_ROW_REVIEW_MANIFEST_RELATIVE_PATH,
      dataRoot,
    ),
  ];
  const review = {
    schemaVersion: 1,
    workspace: "phb35",
    stage: "end-to-end",
    status: "proposed",
    reviewer: null,
    decisionNote: null,
    runDate: new Date().toISOString().slice(0, 10),
    artifacts: endToEndArtifacts,
    reproducibility: pageReview.reproducibility,
    automatedFindings: comparisonReport.counts,
    observedRisks: [
      "PDF.js coordinates remain the text authority; MinerU is only a layout hint.",
      "Baleful Polymorph preserves the official errata text verbatim, including recorded editorial defects.",
      "Repeated short-description wording is preserved per occurrence and requires an explicit canonical decision.",
    ],
    requiredDecision:
      "Accept or reject the ten reviewed end-to-end pilot outcomes. Acceptance closes Gate 1 and authorizes full-PHB extraction, but does not accept full-corpus English rows.",
  };
  const reviewPath = resolveDataPath(
    dataRoot,
    "phb35/review/pilot-e2e-review.json",
  );
  writeJson(reviewPath, review);
  return { reviewPath, review };
}

function mergeExistingReviews(
  filePath: string,
  proposed: PilotRowReview[],
): PilotRowReview[] {
  if (!fs.existsSync(filePath)) return proposed;
  const existing = readJsonl<PilotRowReview>(filePath);
  const byCase = new Map(existing.map((row) => [row.caseId, row]));
  return proposed.map((row) => {
    const previous = byCase.get(row.caseId);
    if (
      previous &&
      previous.proposedCategory === row.proposedCategory &&
      JSON.stringify(previous.evidenceRowIds) ===
        JSON.stringify(row.evidenceRowIds)
    ) {
      return previous;
    }
    return row;
  });
}

function entityRowId(row: PilotEntityRow) {
  if (row.entityType === "spell") return `spell:${row.caseId}`;
  if (row.entityType === "summon-table") return `summon-table:${row.caseId}`;
  return [
    "class-list",
    row.caseId,
    slug(row.owner),
    row.level,
    row.sourcePage.printedPageNumber ?? row.sourcePage.sourcePageIndex,
  ].join(":");
}

function comparisonDatabaseIdentities() {
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

function categoryCounts(rows: PilotDbComparisonRow[]) {
  return Object.fromEntries(
    PHB_COMPARISON_CATEGORIES.map((category) => [
      category,
      rows.filter((row) => row.category === category).length,
    ]),
  );
}

function countBy<T>(rows: T[], key: (row: T) => string) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = key(row);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function artifact(relativePath: string, filePath: string) {
  return { relativePath, sha256: sha256File(filePath) };
}

function reviewArtifact(role: string, relativePath: string, dataRoot: string) {
  return {
    role,
    relativePath,
    sha256: sha256File(resolveDataPath(dataRoot, relativePath)),
  };
}

function resolveDataPath(dataRoot: string, relativePath: string) {
  const resolved = path.resolve(dataRoot, relativePath);
  const relative = path.relative(dataRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes local data root: ${relativePath}`);
  }
  return resolved;
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath: string, rows: unknown[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    "utf8",
  );
}

function readJsonl<T>(filePath: string) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

function slug(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
