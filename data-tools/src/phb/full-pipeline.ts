import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { localDataDir, repoRoot } from "../shared/env";
import { readPhbErrataInventory } from "./errata-inventory";
import {
  compareFullCorpus,
  validateFullComparisonBalance,
  validateFullComparisonSourceEvidence,
  type FullDbComparisonRow,
} from "./full-comparison";
import {
  PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH,
  PHB_FULL_ENTITIES_RELATIVE_PATH,
  PHB_FULL_DETACHED_TABLES_RELATIVE_PATH,
  PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
  PHB_FULL_ISSUES_RELATIVE_PATH,
  PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH,
  PHB_FULL_LIST_ISSUES_RELATIVE_PATH,
  PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH,
  PHB_FULL_LIST_ROWS_RELATIVE_PATH,
  PHB_FULL_MINERU_TABLES_RELATIVE_PATH,
  PHB_FULL_PAGES_RELATIVE_PATH,
  type FullPageRow,
  type FullDetachedTableEvidence,
  type FullMineruTableEvidence,
  type FullSpellEntity,
} from "./full-extraction";
import {
  PHB_FULL_ERRATA_HINTS_RELATIVE_PATH,
  readPhbFullErrataHints,
} from "./full-errata-hints";
import type { FullListOccurrence } from "./full-lists";
import { readPhbFullExtractionManifest } from "./full-manifest";
import {
  PHB_FULL_LAYOUT_REVIEW_MANIFEST_RELATIVE_PATH,
  PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH,
  PHB_FULL_MINERU_INPUT_MANIFEST_RELATIVE_PATH,
  type FullMineruLayoutReview,
} from "./full-mineru";
import {
  buildProposedFullRowReviews,
  mergeFullRowReviews,
  validateFullRowReviewEvidence,
  validateFullRowReviews,
  type FullRowReview,
} from "./full-row-review";
import {
  normalizeWordingGroup,
  type PilotEntityRow,
  type PilotSummonTableEntity,
} from "./pilot-entities";
import { buildPilotErrataOverlays } from "./pilot-errata";
import { PHB_MINERU_RUNTIME_RELATIVE_PATH } from "./pilot-extraction";
import {
  currentComparisonDatabaseIdentities,
  PHB_COMPARISON_CATEGORIES,
  readCurrentPhbDbSpells,
  readCurrentPhbSummonTable,
  type PilotClassListOccurrenceForComparison,
  validateComparisonDatabaseIdentities,
} from "./pilot-comparison";
import { resolveInside, sha256File } from "./source-manifest";

export const PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH =
  "phb35/extracted/full/errata-overlays.jsonl";
export const PHB_FULL_ERRATA_MANIFEST_RELATIVE_PATH =
  "phb35/extracted/full/errata-overlay-manifest.json";
export const PHB_FULL_DB_COMPARISON_RELATIVE_PATH =
  "phb35/extracted/full/db-comparison.jsonl";
export const PHB_FULL_DB_COMPARISON_MANIFEST_RELATIVE_PATH =
  "phb35/extracted/full/db-comparison-manifest.json";
export const PHB_FULL_ROW_REVIEW_RELATIVE_PATH =
  "phb35/review/full-row-review.jsonl";
export const PHB_FULL_ROW_REVIEW_MANIFEST_RELATIVE_PATH =
  "phb35/review/full-row-review-manifest.json";
export const PHB_FULL_ENGLISH_REVIEW_RELATIVE_PATH =
  "phb35/review/full-english-review.json";

const SRD_ADJUDICATION_RELATIVE_PATH = "phb35/review/srd-adjudication.jsonl";
const SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH =
  "phb35/review/srd-adjudication-manifest.json";

const PILOT_ENTITIES = "phb35/extracted/pilot/entities.jsonl";
const ERRATA_INVENTORY = "phb35/review/errata-inventory.jsonl";

export function runFullComparison() {
  const dataRoot = localDataDir();
  verifyFullExtractionChain(dataRoot);
  const spells = readJsonl<FullSpellEntity>(
    resolveInside(dataRoot, PHB_FULL_ENTITIES_RELATIVE_PATH),
  );
  const pages = readJsonl<FullPageRow>(
    resolveInside(dataRoot, PHB_FULL_PAGES_RELATIVE_PATH),
  );
  const listOccurrences = readJsonl<FullListOccurrence>(
    resolveInside(dataRoot, PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH),
  );
  const detachedTables = readJsonl<FullDetachedTableEvidence>(
    resolveInside(dataRoot, PHB_FULL_DETACHED_TABLES_RELATIVE_PATH),
  );
  const mineruTables = readJsonl<FullMineruTableEvidence>(
    resolveInside(dataRoot, PHB_FULL_MINERU_TABLES_RELATIVE_PATH),
  );
  const layoutReviews = readJsonl<FullMineruLayoutReview>(
    resolveInside(dataRoot, PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH),
  );
  const { filePath: inventoryPath, rows: inventory } =
    readPhbErrataInventory(dataRoot);
  const { filePath: hintsPath, rows: hintRows } =
    readPhbFullErrataHints(dataRoot);
  const inventoryIds = new Set(inventory.map((row) => row.entryId));
  const unknownHints = hintRows.filter((row) => !inventoryIds.has(row.entryId));
  if (unknownHints.length > 0) {
    throw new Error(
      `PHB full errata hints reference unknown inventory rows: ${unknownHints
        .map((row) => row.entryId)
        .join(", ")}`,
    );
  }
  const hintsByEntry = new Map(hintRows.map((row) => [row.entryId, row]));
  const effectiveInventory = inventory.map((row) => {
    const hint = hintsByEntry.get(row.entryId);
    return hint ? { ...row, operationHints: hint.operationHints } : row;
  });

  const overlayRows = buildPilotErrataOverlays(
    spells.map((spell) => ({
      caseId: spell.rowId,
      printedName: spell.printedName,
      school: spell.school,
      fields: { ...spell.fields },
      bodyText: spell.bodyText,
    })),
    effectiveInventory,
    pages,
  ).map((row) => ({ rowId: `errata:${row.caseId}`, ...row }));
  const overlaysPath = resolveInside(
    dataRoot,
    PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH,
  );
  writeJsonl(overlaysPath, overlayRows);
  const errataManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_ERRATA_MANIFEST_RELATIVE_PATH,
  );
  writeJson(errataManifestPath, {
    schemaVersion: 1,
    entitiesManifest: artifact(
      PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH,
      resolveInside(dataRoot, PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH),
    ),
    inventory: artifact(ERRATA_INVENTORY, inventoryPath),
    operationHints: artifact(PHB_FULL_ERRATA_HINTS_RELATIVE_PATH, hintsPath),
    output: artifact(PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH, overlaysPath),
    counts: {
      rows: overlayRows.length,
      listed: overlayRows.filter((row) => row.entryId !== null).length,
      applied: overlayRows.filter((row) =>
        row.operationResults.some((result) => result.status === "applied"),
      ).length,
      alreadyIncorporated: overlayRows.filter(
        (row) => row.disposition === "already-incorporated",
      ).length,
      reviewRequired: overlayRows.filter((row) => row.reviewRequired).length,
    },
  });

  const dbSpells = readCurrentPhbDbSpells();
  const summonTable = readAcceptedPilotSummonTable(dataRoot);
  const comparisonOccurrences = listOccurrences.map((row) => ({
    caseId: row.occurrenceId,
    printedName: row.printedName,
    owner: row.owner,
    level: row.level,
    sourcePage: row.sourceStart.printedPageNumber,
    summaryText: row.summaryText,
    wordingGroupKey: normalizeWordingGroup(row.summaryText),
    mineruLayoutEvidence: row.mineruLayoutEvidence,
  }));
  const comparisons = compareFullCorpus({
    spells,
    overlays: overlayRows,
    classListOccurrences: comparisonOccurrences,
    dbSpells,
    detachedTables,
    summonMonsterTable: summonTable.levels.flatMap((level) =>
      level.monsters.map((monster) => ({
        level: level.level,
        monsterName: monster.monsterName,
        alignment: monster.alignment,
      })),
    ),
    dbSummonTableValue: readCurrentPhbSummonTable(),
  });
  const balanceErrors = validateFullComparisonBalance({
    rows: comparisons,
    sourceSpellCount: spells.length,
    dbSpellCount: dbSpells.length,
  });
  if (balanceErrors.length > 0) {
    throw new Error(
      `PHB full comparison does not balance:\n${balanceErrors.join("\n")}`,
    );
  }
  const sourceEvidenceErrors = validateFullComparisonSourceEvidence(
    comparisons,
    detachedTables,
    mineruTables,
    layoutReviews,
  );
  if (sourceEvidenceErrors.length > 0) {
    throw new Error(
      `PHB full comparison source evidence is invalid:\n${sourceEvidenceErrors.join("\n")}`,
    );
  }
  const comparisonsPath = resolveInside(
    dataRoot,
    PHB_FULL_DB_COMPARISON_RELATIVE_PATH,
  );
  writeJsonl(comparisonsPath, comparisons);
  const comparisonManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_DB_COMPARISON_MANIFEST_RELATIVE_PATH,
  );
  const dbIdentities = currentComparisonDatabaseIdentities();
  writeJson(comparisonManifestPath, {
    schemaVersion: 1,
    errataManifest: artifact(
      PHB_FULL_ERRATA_MANIFEST_RELATIVE_PATH,
      errataManifestPath,
    ),
    pilotSummonTable: artifact(
      PILOT_ENTITIES,
      resolveInside(dataRoot, PILOT_ENTITIES),
    ),
    databases: dbIdentities,
    output: artifact(PHB_FULL_DB_COMPARISON_RELATIVE_PATH, comparisonsPath),
    setCounts: {
      source: spells.length,
      db: dbSpells.length,
      both: comparisons.filter((row) => row.setMembership === "both").length,
      sourceOnly: comparisons.filter(
        (row) => row.setMembership === "source-only",
      ).length,
      dbOnly: comparisons.filter((row) => row.setMembership === "db-only")
        .length,
    },
    categories: categoryCounts(comparisons),
  });

  const evidenceRowIdsByCase = buildEvidenceRowIds(
    comparisons,
    spells,
    listOccurrences,
    overlayRows,
  );
  const proposedReviews = buildProposedFullRowReviews({
    comparisons,
    evidenceRowIdsByCase,
  });
  const rowReviewPath = resolveInside(
    dataRoot,
    PHB_FULL_ROW_REVIEW_RELATIVE_PATH,
  );
  const reviews = mergeFullRowReviews(
    fs.existsSync(rowReviewPath) ? readJsonl<FullRowReview>(rowReviewPath) : [],
    proposedReviews,
  );
  const reviewErrors = [
    ...validateFullRowReviews(comparisons, reviews, false),
    ...validateFullRowReviewEvidence({
      comparisons,
      rows: reviews,
      evidenceRowIdsByCase,
    }),
  ];
  if (reviewErrors.length > 0) {
    throw new Error(
      `PHB full row review is invalid:\n${reviewErrors.join("\n")}`,
    );
  }
  writeJsonl(rowReviewPath, reviews);
  const rowReviewManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_ROW_REVIEW_MANIFEST_RELATIVE_PATH,
  );
  writeJson(rowReviewManifestPath, {
    schemaVersion: 1,
    comparisonManifest: artifact(
      PHB_FULL_DB_COMPARISON_MANIFEST_RELATIVE_PATH,
      comparisonManifestPath,
    ),
    evidence: {
      entities: artifact(
        PHB_FULL_ENTITIES_RELATIVE_PATH,
        resolveInside(dataRoot, PHB_FULL_ENTITIES_RELATIVE_PATH),
      ),
      listRows: artifact(
        PHB_FULL_LIST_ROWS_RELATIVE_PATH,
        resolveInside(dataRoot, PHB_FULL_LIST_ROWS_RELATIVE_PATH),
      ),
      listOccurrences: artifact(
        PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH,
        resolveInside(dataRoot, PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH),
      ),
      listFootnotes: artifact(
        PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH,
        resolveInside(dataRoot, PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH),
      ),
      detachedTables: artifact(
        PHB_FULL_DETACHED_TABLES_RELATIVE_PATH,
        resolveInside(dataRoot, PHB_FULL_DETACHED_TABLES_RELATIVE_PATH),
      ),
      mineruTables: artifact(
        PHB_FULL_MINERU_TABLES_RELATIVE_PATH,
        resolveInside(dataRoot, PHB_FULL_MINERU_TABLES_RELATIVE_PATH),
      ),
      mineruLayoutReview: artifact(
        PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH,
        resolveInside(dataRoot, PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH),
      ),
    },
    output: artifact(PHB_FULL_ROW_REVIEW_RELATIVE_PATH, rowReviewPath),
    counts: {
      rows: reviews.length,
      proposed: reviews.filter((row) => row.status === "proposed").length,
      accepted: reviews.filter((row) => row.status === "accepted").length,
      rejected: reviews.filter((row) => row.status === "rejected").length,
    },
  });

  const report = {
    schemaVersion: 1,
    source: {
      descriptionSpells: spells.length,
      printedListRows: readJsonl(
        resolveInside(dataRoot, PHB_FULL_LIST_ROWS_RELATIVE_PATH),
      ).length,
      listOccurrences: listOccurrences.length,
      listFootnotes: readJsonl(
        resolveInside(dataRoot, PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH),
      ).length,
      detachedNamedTables: readObject(
        resolveInside(dataRoot, PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH),
      ).counts.detachedNamedTables,
      mineruImageBlocksExcluded: readObject(
        resolveInside(dataRoot, PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH),
      ).counts.mineruImageBlocksExcluded,
      descriptionIssues: readJsonl(
        resolveInside(dataRoot, PHB_FULL_ISSUES_RELATIVE_PATH),
      ).length,
      listIssues: readJsonl(
        resolveInside(dataRoot, PHB_FULL_LIST_ISSUES_RELATIVE_PATH),
      ).length,
    },
    comparison: {
      rows: comparisons.length,
      categories: categoryCounts(comparisons),
      sourceOnly: comparisons.filter(
        (row) => row.setMembership === "source-only",
      ).length,
      dbOnly: comparisons.filter((row) => row.setMembership === "db-only")
        .length,
    },
    errata: readObject(errataManifestPath).counts,
    reviews: readObject(rowReviewManifestPath).counts,
    artifacts: {
      entitiesManifest: sha256File(
        resolveInside(dataRoot, PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH),
      ),
      comparisonManifest: sha256File(comparisonManifestPath),
      rowReviewManifest: sha256File(rowReviewManifestPath),
    },
    rerun: {
      extract: "npm run -w data-tools phb:source:extract",
      compare: "npm run -w data-tools phb:source:compare",
      report: "npm run -w data-tools phb:source:report",
    },
  };
  const reportPath = path.join(
    repoRoot(),
    "data-tools",
    "out",
    "phb",
    "full-comparison.generated.json",
  );
  writeJson(reportPath, report);
  return { report, reportPath, rowReviewPath, rowReviewManifestPath };
}

export function writeProposedFullEnglishReview() {
  const dataRoot = localDataDir();
  verifyFullExtractionChain(dataRoot);
  const comparisonsPath = resolveInside(
    dataRoot,
    PHB_FULL_DB_COMPARISON_RELATIVE_PATH,
  );
  const comparisonManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_DB_COMPARISON_MANIFEST_RELATIVE_PATH,
  );
  const comparisonManifest = readObject(comparisonManifestPath);
  verifyFullComparisonArtifacts(dataRoot, comparisonManifest);
  const databaseErrors = validateComparisonDatabaseIdentities(
    comparisonManifest.databases,
    currentComparisonDatabaseIdentities(),
  );
  if (databaseErrors.length > 0) {
    throw new Error(
      `PHB full comparison database identities are stale:\n${databaseErrors.join("\n")}`,
    );
  }

  const rowReviewPath = resolveInside(
    dataRoot,
    PHB_FULL_ROW_REVIEW_RELATIVE_PATH,
  );
  const rowReviewManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_ROW_REVIEW_MANIFEST_RELATIVE_PATH,
  );
  const rowReviewManifest = readObject(rowReviewManifestPath);
  expectArtifact(
    rowReviewManifest.comparisonManifest,
    comparisonManifestPath,
    "row review -> comparison",
  );
  expectArtifact(
    rowReviewManifest.output,
    rowReviewPath,
    "row review manifest -> rows",
  );
  verifyRowReviewEvidenceArtifacts(dataRoot, rowReviewManifest);
  const comparisons = readJsonl<FullDbComparisonRow>(comparisonsPath);
  const detachedTables = readJsonl<FullDetachedTableEvidence>(
    resolveInside(dataRoot, PHB_FULL_DETACHED_TABLES_RELATIVE_PATH),
  );
  const mineruTables = readJsonl<FullMineruTableEvidence>(
    resolveInside(dataRoot, PHB_FULL_MINERU_TABLES_RELATIVE_PATH),
  );
  const layoutReviews = readJsonl<FullMineruLayoutReview>(
    resolveInside(dataRoot, PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH),
  );
  const sourceEvidenceErrors = validateFullComparisonSourceEvidence(
    comparisons,
    detachedTables,
    mineruTables,
    layoutReviews,
  );
  if (sourceEvidenceErrors.length > 0) {
    throw new Error(
      `PHB full comparison source evidence is stale:\n${sourceEvidenceErrors.join("\n")}`,
    );
  }
  const reviews = readJsonl<FullRowReview>(rowReviewPath);
  const srdAdjudication = verifySrdBackedReviews(dataRoot, reviews);
  const spells = readJsonl<FullSpellEntity>(
    resolveInside(dataRoot, PHB_FULL_ENTITIES_RELATIVE_PATH),
  );
  const occurrences = readJsonl<FullListOccurrence>(
    resolveInside(dataRoot, PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH),
  );
  const overlays = readJsonl<ArrayElementWithIds>(
    resolveInside(dataRoot, PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH),
  );
  const evidenceRowIdsByCase = buildEvidenceRowIds(
    comparisons,
    spells,
    occurrences,
    overlays,
  );
  const reviewErrors = [
    ...validateFullRowReviews(comparisons, reviews, true),
    ...validateFullRowReviewEvidence({
      comparisons,
      rows: reviews,
      evidenceRowIdsByCase,
    }),
  ];
  if (reviewErrors.length > 0) {
    const proposed = reviews.filter((row) => row.status === "proposed").length;
    throw new Error(
      `PHB full English review requires terminal row decisions (${proposed} proposed):\n${reviewErrors
        .slice(0, 20)
        .join(
          "\n",
        )}${reviewErrors.length > 20 ? `\n... ${reviewErrors.length - 20} more` : ""}`,
    );
  }

  const reviewPath = resolveInside(
    dataRoot,
    PHB_FULL_ENGLISH_REVIEW_RELATIVE_PATH,
  );
  const review = {
    schemaVersion: 1,
    workspace: "phb35",
    stage: "full-english",
    status: "proposed",
    reviewer: null,
    decisionNote: null,
    artifacts: [
      reviewArtifact(
        "entity-extraction",
        PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH,
        dataRoot,
      ),
      reviewArtifact(
        "errata-overlay",
        PHB_FULL_ERRATA_MANIFEST_RELATIVE_PATH,
        dataRoot,
      ),
      reviewArtifact(
        "db-comparison",
        PHB_FULL_DB_COMPARISON_MANIFEST_RELATIVE_PATH,
        dataRoot,
      ),
      reviewArtifact(
        "row-review",
        PHB_FULL_ROW_REVIEW_MANIFEST_RELATIVE_PATH,
        dataRoot,
      ),
      ...(srdAdjudication
        ? [
            reviewArtifact(
              "srd-adjudication",
              SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH,
              dataRoot,
            ),
          ]
        : []),
    ],
    automatedFindings: {
      sourceSpells: spells.length,
      dbSpells: comparisons.filter((row) => row.setMembership !== "source-only")
        .length,
      comparisons: comparisons.length,
      comparisonCategories: categoryCounts(comparisons),
      sourceOnly: comparisons.filter(
        (row) => row.setMembership === "source-only",
      ).length,
      dbOnly: comparisons.filter((row) => row.setMembership === "db-only")
        .length,
      rowReviews: reviews.length,
      unresolvedRowReviews: 0,
    },
    requiredDecision:
      "Accept or reject the terminal full-PHB English row decisions. Acceptance closes integrated Gate 2 only when the owning release plan records it; this review does not activate DB patches or translation.",
  };
  writeJson(reviewPath, review);
  return { reviewPath, review };
}

export function verifyFullExtractionChain(dataRoot: string) {
  const { filePath: fullManifestPath, manifest: fullManifest } =
    readPhbFullExtractionManifest(dataRoot);
  const extractionManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
  );
  const extraction = readObject(extractionManifestPath);
  if (extraction.schemaVersion !== 2) {
    throw new Error("PHB full extraction must use the MinerU-backed schema");
  }
  expectArtifact(
    extraction.fullExtractionManifest,
    fullManifestPath,
    "full extraction manifest",
  );
  expectArtifact(
    extraction.sourceManifest,
    resolveInside(dataRoot, fullManifest.sourceManifest.relativePath),
    "extraction -> source manifest",
  );
  expectArtifact(
    extraction.gate1Review,
    resolveInside(dataRoot, fullManifest.gate1Review.relativePath),
    "extraction -> Gate 1 review",
  );
  expectArtifact(
    extraction.output,
    resolveInside(dataRoot, PHB_FULL_PAGES_RELATIVE_PATH),
    "extraction -> pages",
  );
  expectArtifact(
    extraction.runtimeManifest,
    resolveInside(dataRoot, PHB_MINERU_RUNTIME_RELATIVE_PATH),
    "extraction -> MinerU runtime",
  );
  const inputManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_MINERU_INPUT_MANIFEST_RELATIVE_PATH,
  );
  expectArtifact(
    extraction.inputManifest,
    inputManifestPath,
    "extraction -> MinerU input manifest",
  );
  const inputManifest = readObject(inputManifestPath);
  expectArtifact(
    inputManifest.sourceManifest,
    resolveInside(dataRoot, fullManifest.sourceManifest.relativePath),
    "MinerU input -> source manifest",
  );
  expectArtifact(
    inputManifest.fullManifest,
    fullManifestPath,
    "MinerU input -> full extraction manifest",
  );
  const inputArtifacts = Array.isArray(inputManifest.artifacts)
    ? inputManifest.artifacts
    : [];
  if (inputArtifacts.length !== fullManifest.sources.length) {
    throw new Error("PHB full MinerU input artifact count changed");
  }
  for (const value of inputArtifacts) {
    const inputArtifact = record(value, "MinerU input artifact");
    if (typeof inputArtifact.relativePath !== "string") {
      throw new Error("PHB full MinerU input artifact path is invalid");
    }
    expectArtifact(
      inputArtifact,
      resolveInside(dataRoot, inputArtifact.relativePath),
      "MinerU input -> subset PDF",
    );
  }
  const sourceReports = Array.isArray(extraction.sources)
    ? extraction.sources
    : [];
  if (sourceReports.length !== fullManifest.sources.length) {
    throw new Error("PHB full MinerU output source count changed");
  }
  for (const value of sourceReports) {
    const sourceReport = record(value, "MinerU output source");
    const contentList = record(
      sourceReport.mineruContentList,
      "MinerU content-list artifact",
    );
    if (typeof contentList.relativePath !== "string") {
      throw new Error("PHB full MinerU content-list path is invalid");
    }
    expectArtifact(
      contentList,
      resolveInside(dataRoot, contentList.relativePath),
      "MinerU output -> content list",
    );
  }
  const entitiesManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH,
  );
  const entities = readObject(entitiesManifestPath);
  expectArtifact(
    entities.extractionManifest,
    extractionManifestPath,
    "entities -> extraction",
  );
  expectArtifact(
    entities.pages,
    resolveInside(dataRoot, PHB_FULL_PAGES_RELATIVE_PATH),
    "entities -> pages",
  );
  expectArtifact(
    entities.layoutReviewManifest,
    resolveInside(dataRoot, PHB_FULL_LAYOUT_REVIEW_MANIFEST_RELATIVE_PATH),
    "entities -> MinerU layout review",
  );
  verifyFullMineruLayoutReviewChain(dataRoot);
  for (const [field, relativePath] of [
    ["entities", PHB_FULL_ENTITIES_RELATIVE_PATH],
    ["issues", PHB_FULL_ISSUES_RELATIVE_PATH],
    ["detachedTables", PHB_FULL_DETACHED_TABLES_RELATIVE_PATH],
    ["mineruTables", PHB_FULL_MINERU_TABLES_RELATIVE_PATH],
    ["listRows", PHB_FULL_LIST_ROWS_RELATIVE_PATH],
    ["listOccurrences", PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH],
    ["listFootnotes", PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH],
    ["listIssues", PHB_FULL_LIST_ISSUES_RELATIVE_PATH],
  ] as const) {
    const outputs = record(entities.outputs, "entities outputs");
    expectArtifact(
      outputs[field],
      resolveInside(dataRoot, relativePath),
      `entities -> ${field}`,
    );
  }
  assertEmptyJsonl(
    resolveInside(dataRoot, PHB_FULL_ISSUES_RELATIVE_PATH),
    "description issues",
  );
  assertEmptyJsonl(
    resolveInside(dataRoot, PHB_FULL_LIST_ISSUES_RELATIVE_PATH),
    "list issues",
  );
}

export function verifyFullErrataChain(dataRoot: string) {
  const manifestPath = resolveInside(
    dataRoot,
    PHB_FULL_ERRATA_MANIFEST_RELATIVE_PATH,
  );
  const manifest = readObject(manifestPath);
  for (const [field, relativePath, label] of [
    ["entitiesManifest", PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH, "entities"],
    ["inventory", ERRATA_INVENTORY, "inventory"],
    ["operationHints", PHB_FULL_ERRATA_HINTS_RELATIVE_PATH, "operation hints"],
    ["output", PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH, "overlays"],
  ] as const) {
    expectArtifact(
      manifest[field],
      resolveInside(dataRoot, relativePath),
      `errata manifest -> ${label}`,
    );
  }
}

export function verifyFullMineruLayoutReviewChain(dataRoot: string) {
  const manifestPath = resolveInside(
    dataRoot,
    PHB_FULL_LAYOUT_REVIEW_MANIFEST_RELATIVE_PATH,
  );
  const manifest = readObject(manifestPath);
  for (const [field, relativePath, label] of [
    [
      "extractionManifest",
      PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
      "extraction",
    ],
    ["pages", PHB_FULL_PAGES_RELATIVE_PATH, "pages"],
    ["output", PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH, "review rows"],
  ] as const) {
    expectArtifact(
      manifest[field],
      resolveInside(dataRoot, relativePath),
      `MinerU layout review -> ${label}`,
    );
  }
  const proposed = readJsonl<FullMineruLayoutReview>(
    resolveInside(dataRoot, PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH),
  ).filter((review) => review.status === "proposed");
  if (proposed.length > 0) {
    throw new Error(
      `PHB full MinerU layout review has ${proposed.length} proposed rows`,
    );
  }
}

export function verifyFullComparisonArtifacts(
  dataRoot: string,
  comparisonManifest: Record<string, unknown>,
) {
  verifyFullErrataChain(dataRoot);
  for (const [field, relativePath, label] of [
    ["output", PHB_FULL_DB_COMPARISON_RELATIVE_PATH, "comparisons"],
    ["errataManifest", PHB_FULL_ERRATA_MANIFEST_RELATIVE_PATH, "errata"],
    ["pilotSummonTable", PILOT_ENTITIES, "pilot summon table"],
  ] as const) {
    expectArtifact(
      comparisonManifest[field],
      resolveInside(dataRoot, relativePath),
      `comparison manifest -> ${label}`,
    );
  }
}

export function verifyRowReviewEvidenceArtifacts(
  dataRoot: string,
  rowReviewManifest: Record<string, unknown>,
) {
  const evidence = record(rowReviewManifest.evidence, "row review evidence");
  for (const [field, relativePath] of [
    ["entities", PHB_FULL_ENTITIES_RELATIVE_PATH],
    ["listRows", PHB_FULL_LIST_ROWS_RELATIVE_PATH],
    ["listOccurrences", PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH],
    ["listFootnotes", PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH],
    ["detachedTables", PHB_FULL_DETACHED_TABLES_RELATIVE_PATH],
    ["mineruTables", PHB_FULL_MINERU_TABLES_RELATIVE_PATH],
    ["mineruLayoutReview", PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH],
  ] as const) {
    expectArtifact(
      evidence[field],
      resolveInside(dataRoot, relativePath),
      `row review evidence -> ${field}`,
    );
  }
}

export function verifySrdBackedReviews(
  dataRoot: string,
  reviews: FullRowReview[],
) {
  const backed = reviews.filter(
    (row) => row.reviewer === "data-tools:srd-adjudication",
  );
  if (backed.length === 0) return null;
  const manifestPath = resolveInside(
    dataRoot,
    SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH,
  );
  const adjudicationPath = resolveInside(
    dataRoot,
    SRD_ADJUDICATION_RELATIVE_PATH,
  );
  const manifest = readObject(manifestPath);
  const inputs = record(manifest.inputs, "SRD adjudication inputs");
  for (const [field, label] of [
    ["extractionManifest", "extraction manifest"],
    ["comparisons", "comparisons"],
    ["aliases", "aliases"],
  ] as const) {
    const value = record(inputs[field], `SRD adjudication ${label}`);
    if (typeof value.relativePath !== "string") {
      throw new Error(`PHB SRD adjudication ${label} path is invalid`);
    }
    expectArtifact(
      value,
      resolveInside(dataRoot, value.relativePath),
      `SRD adjudication -> ${label}`,
    );
  }
  expectArtifact(manifest.output, adjudicationPath, "SRD adjudication -> rows");
  const currentReviewEvidence = hashStableJson(
    reviews.map((row) => ({
      caseId: row.caseId,
      proposedCategory: row.proposedCategory,
      evidenceRowIds: row.evidenceRowIds,
      evidenceFingerprintSha256: row.evidenceFingerprintSha256,
    })),
  );
  if (inputs.rowReviewEvidenceSha256 !== currentReviewEvidence) {
    throw new Error("PHB SRD adjudication row review evidence is stale");
  }
  const adjudications = new Map(
    readJsonl<{
      caseId: string;
      status: string;
      rule: string;
      evidenceFingerprintSha256: string;
    }>(adjudicationPath).map((row) => [row.caseId, row]),
  );
  for (const review of backed) {
    const row = adjudications.get(review.caseId);
    if (!row || row.status !== "terminal-candidate") {
      throw new Error(
        `PHB SRD-backed review has no terminal evidence: ${review.caseId}`,
      );
    }
    const expected = `Accepted by SRD adjudication ${row.evidenceFingerprintSha256}: ${row.rule}.`;
    if (review.status !== "accepted" || review.decisionNote !== expected) {
      throw new Error(
        `PHB SRD-backed review decision is stale: ${review.caseId}`,
      );
    }
  }
  return { manifestPath, adjudicationPath, rows: backed.length };
}

export function assertEmptyJsonl(filePath: string, label: string) {
  if (readJsonl(filePath).length > 0) {
    throw new Error(`PHB full ${label} must be empty at Gate 2`);
  }
}

function readAcceptedPilotSummonTable(dataRoot: string) {
  const rows = readJsonl<PilotEntityRow>(
    resolveInside(dataRoot, PILOT_ENTITIES),
  );
  const matches = rows.filter(
    (row): row is PilotSummonTableEntity => row.entityType === "summon-table",
  );
  if (matches.length !== 1) {
    throw new Error(
      `Accepted pilot must contain one Summon Monster table: ${matches.length}`,
    );
  }
  return matches[0]!;
}

function buildEvidenceRowIds(
  comparisons: FullDbComparisonRow[],
  spells: FullSpellEntity[],
  occurrences: FullListOccurrence[],
  overlays: ArrayElementWithIds[],
) {
  const spellsByCase = new Map(spells.map((spell) => [spell.rowId, spell]));
  const overlaysByCase = new Map(
    overlays.map((row) => [row.caseId, row.rowId]),
  );
  const occurrencesByName = new Map<string, string[]>();
  for (const row of occurrences) {
    const key = normalizeName(row.printedName);
    const ids = occurrencesByName.get(key) ?? [];
    ids.push(row.occurrenceId);
    occurrencesByName.set(key, ids);
  }
  return new Map(
    comparisons.map((comparison) => {
      const ids = [
        ...(spellsByCase.has(comparison.caseId) ? [comparison.caseId] : []),
        ...(occurrencesByName.get(normalizeName(comparison.printedName)) ?? []),
        ...(overlaysByCase.has(comparison.caseId)
          ? [overlaysByCase.get(comparison.caseId)!]
          : []),
        ...comparison.dbSpellIds.map((id) => `db-spell:${id}`),
        ...comparison.sourceEvidence.map((evidence) => evidence.rowId),
      ];
      return [comparison.caseId, Array.from(new Set(ids)).sort()] as const;
    }),
  );
}

type ArrayElementWithIds = { rowId: string; caseId: string };

function categoryCounts(rows: FullDbComparisonRow[]) {
  return Object.fromEntries(
    PHB_COMPARISON_CATEGORIES.map((category) => [
      category,
      rows.filter((row) => row.category === category).length,
    ]),
  );
}

function expectArtifact(value: unknown, filePath: string, label: string) {
  const artifactValue = record(value, label);
  if (artifactValue.sha256 !== sha256File(filePath)) {
    throw new Error(`PHB full artifact is stale: ${label}`);
  }
}

function artifact(relativePath: string, filePath: string) {
  return { relativePath, sha256: sha256File(filePath) };
}

function hashStableJson(value: unknown) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right, "en-US"))
      .map(([key, nested]) => [key, stableValue(nested)]),
  );
}

function reviewArtifact(role: string, relativePath: string, dataRoot: string) {
  return {
    role,
    relativePath,
    sha256: sha256File(resolveInside(dataRoot, relativePath)),
  };
}

function readObject(filePath: string) {
  if (!fs.existsSync(filePath))
    throw new Error(`PHB artifact not found: ${filePath}`);
  return record(
    JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown,
    filePath,
  );
}

function readJsonl<T = unknown>(filePath: string): T[] {
  if (!fs.existsSync(filePath))
    throw new Error(`PHB artifact not found: ${filePath}`);
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath: string, rows: unknown[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    rows.length > 0
      ? `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`
      : "",
    "utf8",
  );
}

function record(value: unknown, label: string): Record<string, any> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`PHB ${label} must be an object`);
  }
  return value as Record<string, any>;
}

function normalizeName(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[‘’]/gu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}
