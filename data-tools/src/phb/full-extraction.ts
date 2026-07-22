import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  extractSpellAtHeading,
  isSpellHeadingAt,
  joinWrappedLines,
  type PhbTextPageRow,
  type PilotSpellFieldName,
  type PilotSourcePage,
  type ReadingLine,
} from "./pilot-entities";
import {
  readPhbFullExtractionManifest,
  type PhbFullExtractionManifest,
} from "./full-manifest";
import {
  PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
  PHB_FULL_LAYOUT_REVIEW_MANIFEST_RELATIVE_PATH,
  PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH,
  PHB_FULL_PAGES_RELATIVE_PATH,
  buildFullMineruLayoutReviewCandidates,
  mergeFullMineruLayoutReviews,
  layoutEvidenceForSourcePages,
  parseFullMineruPageRows,
  reconstructMineruReadingLines,
  validateFullMineruLayoutReviews,
  type FullMineruLayoutEvidenceReference,
  type FullMineruLayoutReview,
  type FullMineruPageRow,
} from "./full-mineru";
import { extractFullSpellLists } from "./full-lists";
import { resolveInside, sha256File } from "./source-manifest";

export {
  PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
  PHB_FULL_PAGES_RELATIVE_PATH,
} from "./full-mineru";
export const PHB_FULL_ENTITIES_RELATIVE_PATH =
  "phb35/extracted/full/entities.jsonl";
export const PHB_FULL_ISSUES_RELATIVE_PATH =
  "phb35/extracted/full/issues.jsonl";
export const PHB_FULL_DETACHED_TABLES_RELATIVE_PATH =
  "phb35/extracted/full/detached-tables.jsonl";
export const PHB_FULL_MINERU_TABLES_RELATIVE_PATH =
  "phb35/extracted/full/mineru-tables.jsonl";
export const PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH =
  "phb35/extracted/full/entities-manifest.json";
export const PHB_FULL_LIST_ROWS_RELATIVE_PATH =
  "phb35/extracted/full/list-rows.jsonl";
export const PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH =
  "phb35/extracted/full/list-occurrences.jsonl";
export const PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH =
  "phb35/extracted/full/list-footnotes.jsonl";
export const PHB_FULL_LIST_ISSUES_RELATIVE_PATH =
  "phb35/extracted/full/list-issues.jsonl";

const EXPECTED_DETACHED_TABLES = [
  "Contact Other Plane",
  "Detect Evil",
  "Detect Magic",
  "Prismatic Wall",
  "Summon Monster",
  "Summon Nature’s Ally",
  "Teleport",
] as const;
const SHARED_DETACHED_TABLES = new Set([
  "summon monster",
  "summon nature's ally",
]);

export type FullPageRow = FullMineruPageRow;

export type FullSpellEntity = {
  schemaVersion: 1;
  rowId: string;
  entityType: "spell";
  printedName: string;
  sourcePages: PilotSourcePage[];
  school: string;
  fields: Partial<Record<PilotSpellFieldName, string>>;
  bodyText: string;
  sourceText: string;
  reviewFlags: string[];
  mineruTableEvidence: Array<{
    rowId: string;
    evidenceSha256: string;
  }>;
  mineruLayoutEvidence: FullMineruLayoutEvidenceReference[];
};

export type FullMineruTableEvidence = {
  schemaVersion: 1;
  rowId: string;
  sourceId: string;
  sourcePageIndex: number;
  printedPageNumber: number | null;
  blockIndex: number;
  bbox: [number, number, number, number] | null;
  tableHtml: string | null;
  captions: string[];
  footnotes: string[];
  projectedText: string;
  evidenceSha256: string;
};

export type FullDetachedTableEvidence = {
  schemaVersion: 1;
  rowId: string;
  printedName: string;
  attachToSpell: boolean;
  sourcePages: PilotSourcePage[];
  sourceText: string;
  lines: Array<{
    sourceId: string;
    sourcePageIndex: number;
    printedPageNumber: number | null;
    text: string;
    x: number;
    y: number;
    height: number;
    segments: ReadingLine["segments"];
  }>;
};

export type FullExtractionIssue = {
  schemaVersion: 1;
  issueId: string;
  kind:
    | "spell-block-parse-failed"
    | "duplicate-spell-heading"
    | "mineru-projection-failed";
  printedName: string;
  sourceId: string;
  sourcePageIndex: number;
  printedPageNumber: number | null;
  message: string;
  status: "proposed" | "accepted" | "rejected";
  reviewer: string | null;
  decisionNote: string | null;
};

export async function runFullExtraction(dataRoot: string) {
  const { manifest } = readPhbFullExtractionManifest(dataRoot);
  const pagesPath = resolveInside(dataRoot, PHB_FULL_PAGES_RELATIVE_PATH);
  const extractionManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
  );
  if (!fs.existsSync(extractionManifestPath) || !fs.existsSync(pagesPath)) {
    throw new Error(
      "PHB full MinerU import is missing; prepare and import the full MinerU output first",
    );
  }
  const pages = parseFullMineruPageRows(fs.readFileSync(pagesPath, "utf8"));
  const layoutReviews = writeFullMineruLayoutReview(
    dataRoot,
    pages,
    extractionManifestPath,
    pagesPath,
  );

  const descriptionPages = pages.filter((page) =>
    page.rangeKinds.includes("description"),
  );
  const discovery = discoverFullSpellEntities(descriptionPages, layoutReviews);
  const mineruTables = extractFullMineruTables(descriptionPages, layoutReviews);
  if (mineruTables.length !== 59) {
    throw new Error(
      `PHB MinerU table-block count changed: ${mineruTables.length} != 59`,
    );
  }
  for (const spell of discovery.spells) {
    const pageKeys = new Set(
      spell.sourcePages.map(
        (page) => `${page.sourceId}:${page.sourcePageIndex}`,
      ),
    );
    spell.mineruTableEvidence = mineruTables
      .filter((table) =>
        pageKeys.has(`${table.sourceId}:${table.sourcePageIndex}`),
      )
      .map((table) => ({
        rowId: table.rowId,
        evidenceSha256: table.evidenceSha256,
      }));
    spell.mineruLayoutEvidence = layoutEvidenceForSourcePages(
      spell.sourcePages,
      layoutReviews,
    );
  }
  assertDetachedTableSet(discovery.detachedTableNames);
  if (discovery.excludedImageBlockCount !== 7) {
    throw new Error(
      `PHB description image-block count changed: ${discovery.excludedImageBlockCount} != 7`,
    );
  }
  const listExtraction = extractFullSpellLists(
    pages.filter((page) => page.rangeKinds.includes("class-list")),
    layoutReviews,
  );
  const sourceSetReconciliation = reconcileSourceSpellSets(
    discovery.spells,
    listExtraction.occurrences,
  );
  assertExpectedCounts(
    manifest,
    discovery.spells.length,
    listExtraction.counts,
  );
  if (
    discovery.issues.length > 0 ||
    listExtraction.issues.length > 0 ||
    sourceSetReconciliation.descriptionOnly.length > 0 ||
    sourceSetReconciliation.listOnly.length > 0
  ) {
    throw new Error(
      `PHB full extraction has unresolved source issues: ${JSON.stringify({
        descriptionIssues: discovery.issues.length,
        listIssues: listExtraction.issues.length,
        ...sourceSetReconciliation,
      })}`,
    );
  }
  const entitiesPath = resolveInside(dataRoot, PHB_FULL_ENTITIES_RELATIVE_PATH);
  const issuesPath = resolveInside(dataRoot, PHB_FULL_ISSUES_RELATIVE_PATH);
  const detachedTablesPath = resolveInside(
    dataRoot,
    PHB_FULL_DETACHED_TABLES_RELATIVE_PATH,
  );
  const mineruTablesPath = resolveInside(
    dataRoot,
    PHB_FULL_MINERU_TABLES_RELATIVE_PATH,
  );
  const listRowsPath = resolveInside(
    dataRoot,
    PHB_FULL_LIST_ROWS_RELATIVE_PATH,
  );
  const listOccurrencesPath = resolveInside(
    dataRoot,
    PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH,
  );
  const listFootnotesPath = resolveInside(
    dataRoot,
    PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH,
  );
  const listIssuesPath = resolveInside(
    dataRoot,
    PHB_FULL_LIST_ISSUES_RELATIVE_PATH,
  );
  writeJsonl(entitiesPath, discovery.spells);
  writeJsonl(issuesPath, discovery.issues);
  writeJsonl(detachedTablesPath, discovery.detachedTables);
  writeJsonl(mineruTablesPath, mineruTables);
  writeJsonl(listRowsPath, listExtraction.printedRows);
  writeJsonl(listOccurrencesPath, listExtraction.occurrences);
  writeJsonl(listFootnotesPath, listExtraction.footnotes);
  writeJsonl(listIssuesPath, listExtraction.issues);
  const entitiesManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH,
  );
  writeJson(entitiesManifestPath, {
    schemaVersion: 1,
    extractionManifest: artifact(
      PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
      extractionManifestPath,
    ),
    pages: artifact(PHB_FULL_PAGES_RELATIVE_PATH, pagesPath),
    layoutReviewManifest: artifact(
      PHB_FULL_LAYOUT_REVIEW_MANIFEST_RELATIVE_PATH,
      resolveInside(dataRoot, PHB_FULL_LAYOUT_REVIEW_MANIFEST_RELATIVE_PATH),
    ),
    outputs: {
      entities: artifact(PHB_FULL_ENTITIES_RELATIVE_PATH, entitiesPath),
      issues: artifact(PHB_FULL_ISSUES_RELATIVE_PATH, issuesPath),
      detachedTables: artifact(
        PHB_FULL_DETACHED_TABLES_RELATIVE_PATH,
        detachedTablesPath,
      ),
      mineruTables: artifact(
        PHB_FULL_MINERU_TABLES_RELATIVE_PATH,
        mineruTablesPath,
      ),
      listRows: artifact(PHB_FULL_LIST_ROWS_RELATIVE_PATH, listRowsPath),
      listOccurrences: artifact(
        PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH,
        listOccurrencesPath,
      ),
      listFootnotes: artifact(
        PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH,
        listFootnotesPath,
      ),
      listIssues: artifact(PHB_FULL_LIST_ISSUES_RELATIVE_PATH, listIssuesPath),
    },
    counts: {
      headings: discovery.headingCount,
      spells: discovery.spells.length,
      issues: discovery.issues.length,
      unresolvedIssues: discovery.issues.filter(
        (issue) => issue.status === "proposed",
      ).length,
      detachedNamedTables: discovery.detachedTableNames.length,
      mineruTableBlocks: mineruTables.length,
      mineruImageBlocksExcluded: discovery.excludedImageBlockCount,
      ...listExtraction.counts,
    },
    sourceSetReconciliation,
  });
  return {
    pagesPath,
    extractionManifestPath,
    entitiesPath,
    issuesPath,
    detachedTablesPath,
    entitiesManifestPath,
    counts: {
      pages: pages.length,
      headings: discovery.headingCount,
      spells: discovery.spells.length,
      issues: discovery.issues.length,
      printedListRows: listExtraction.counts.printedRows,
      listOccurrences: listExtraction.counts.occurrences,
      uniqueListSpellNames: listExtraction.counts.uniqueSpellNames,
      listFootnotes: listExtraction.counts.footnotes,
      detachedNamedTables: discovery.detachedTableNames.length,
      mineruTableBlocks: mineruTables.length,
      mineruImageBlocksExcluded: discovery.excludedImageBlockCount,
    },
  };
}

function reconcileSourceSpellSets(
  spells: FullSpellEntity[],
  occurrences: Array<{ printedName: string }>,
) {
  const descriptions = new Map(
    spells.map((spell) => [
      normalizeNameKey(spell.printedName),
      spell.printedName,
    ]),
  );
  const lists = new Map(
    occurrences.map((row) => [
      normalizeNameKey(row.printedName),
      row.printedName,
    ]),
  );
  return {
    descriptionSpellCount: descriptions.size,
    listSpellCount: lists.size,
    descriptionOnly: [...descriptions]
      .filter(([key]) => !lists.has(key))
      .map(([, name]) => name)
      .sort(),
    listOnly: [...lists]
      .filter(([key]) => !descriptions.has(key))
      .map(([, name]) => name)
      .sort(),
  };
}

function assertExpectedCounts(
  manifest: PhbFullExtractionManifest,
  descriptionSpells: number,
  counts: {
    printedRows: number;
    occurrences: number;
    uniqueSpellNames: number;
    classAssociations: number;
    domainAssociations: number;
  },
) {
  const actual = {
    descriptionSpells,
    printedListRows: counts.printedRows,
    listOccurrences: counts.occurrences,
    uniqueListSpellNames: counts.uniqueSpellNames,
    classAssociations: counts.classAssociations,
    domainAssociations: counts.domainAssociations,
  };
  const mismatches = Object.entries(manifest.expectedCounts).flatMap(
    ([field, expected]) =>
      actual[field as keyof typeof actual] === expected
        ? []
        : [
            `${field}: ${String(actual[field as keyof typeof actual])} != ${expected}`,
          ],
  );
  if (mismatches.length > 0) {
    throw new Error(
      `PHB full extraction counts changed:\n${mismatches.join("\n")}`,
    );
  }
}

export function discoverFullSpellEntities(
  pages: FullPageRow[],
  layoutReviews: FullMineruLayoutReview[] = [],
) {
  const sortedPages = [...pages].sort(
    (left, right) => left.sourcePageIndex - right.sourcePageIndex,
  );
  const projections = sortedPages.map((page) =>
    reconstructMineruReadingLines(page, layoutReviews),
  );
  const reconstructed = mergeWrappedSpellHeadings(
    projections.flatMap((projection) => projection.lines),
  );
  const detached = detachNamedTables(reconstructed);
  const lines = detached.readingLines;
  const headingIndexes = lines.flatMap((line, index) =>
    isSpellHeadingAt(lines, index) ? [index] : [],
  );
  const spells: FullSpellEntity[] = [];
  const issues: FullExtractionIssue[] = projections.flatMap((projection) =>
    projection.issues.map((projectionIssue) => {
      const page = sortedPages.find(
        (candidate) =>
          candidate.sourceId === projectionIssue.sourceId &&
          candidate.sourcePageIndex === projectionIssue.sourcePageIndex,
      )!;
      return {
        schemaVersion: 1,
        issueId:
          projectionIssue.evidenceId ??
          `mineru-projection:${slug(projectionIssue.sourceId)}:${projectionIssue.sourcePageIndex}:${projectionIssue.blockIndex}`,
        kind: "mineru-projection-failed",
        printedName: `MinerU block ${projectionIssue.blockIndex}`,
        sourceId: projectionIssue.sourceId,
        sourcePageIndex: projectionIssue.sourcePageIndex,
        printedPageNumber: page.printedPageNumber,
        message: projectionIssue.message,
        status: "proposed",
        reviewer: null,
        decisionNote: null,
      } satisfies FullExtractionIssue;
    }),
  );
  const names = new Map<string, number>();
  for (const headingIndex of headingIndexes) {
    const heading = lines[headingIndex]!;
    const printedName = heading.text;
    const nameKey = normalizeNameKey(printedName);
    const occurrence = (names.get(nameKey) ?? 0) + 1;
    names.set(nameKey, occurrence);
    if (occurrence > 1) {
      issues.push(
        issue(
          "duplicate-spell-heading",
          printedName,
          heading.page,
          `Spell heading occurs ${occurrence} times in the extracted description range`,
          occurrence,
        ),
      );
      continue;
    }
    try {
      const extracted = extractSpellAtHeading(
        lines,
        headingIndex,
        `PHB full spell ${printedName}`,
      );
      spells.push({
        schemaVersion: 1,
        rowId: `spell:${slug(printedName)}`,
        entityType: "spell",
        ...extracted,
        mineruTableEvidence: [],
        mineruLayoutEvidence: [],
      });
    } catch (error) {
      issues.push(
        issue(
          "spell-block-parse-failed",
          printedName,
          heading.page,
          errorMessage(error),
          occurrence,
        ),
      );
    }
  }
  for (const table of detached.tables) {
    if (!table.attachToSpell) continue;
    const owner = spells.find(
      (spell) =>
        normalizeNameKey(spell.printedName) ===
        normalizeNameKey(table.printedName),
    );
    if (!owner) {
      issues.push(
        issue(
          "spell-block-parse-failed",
          table.printedName,
          table.lines[0]!.page,
          "Detached named table has no extracted spell owner",
          1,
        ),
      );
      continue;
    }
    const tableTextLines = table.lines
      .slice(1)
      .filter((line) => !/^Illus\. by\b/u.test(line.text));
    owner.bodyText = joinWrappedLines([
      owner.bodyText,
      ...tableTextLines.map((line) => line.text),
    ]);
    owner.sourceText = [
      owner.sourceText,
      ...table.lines.map((line) => line.text),
    ].join("\n");
    owner.sourcePages = uniqueSourcePages([
      ...owner.sourcePages,
      ...table.lines.map((line) => sourcePage(line.page)),
    ]);
    owner.reviewFlags = Array.from(
      new Set([...owner.reviewFlags, "detached-named-table", "table-or-list"]),
    ).sort();
  }
  return {
    headingCount: headingIndexes.length,
    spells,
    issues,
    detachedTableNames: detached.tables.map((table) => table.printedName),
    detachedTables: detached.tables.map((table): FullDetachedTableEvidence => ({
      schemaVersion: 1,
      rowId: `detached-table:${slug(table.printedName)}`,
      printedName: table.printedName,
      attachToSpell: table.attachToSpell,
      sourcePages: uniqueSourcePages(
        table.lines.map((line) => sourcePage(line.page)),
      ),
      sourceText: table.lines.map((line) => line.text).join("\n"),
      lines: table.lines.map((line) => ({
        sourceId: line.page.sourceId,
        sourcePageIndex: line.page.sourcePageIndex,
        printedPageNumber: line.page.printedPageNumber,
        text: line.text,
        x: line.x,
        y: line.y,
        height: line.height,
        segments: line.segments,
      })),
    })),
    excludedImageBlockCount: pages.reduce(
      (count, page) =>
        count +
        page.mineru.blocks.filter((block) => block.type === "image").length,
      0,
    ),
  };
}

export function extractFullMineruTables(
  pages: FullPageRow[],
  layoutReviews: FullMineruLayoutReview[] = [],
): FullMineruTableEvidence[] {
  return pages.flatMap((page) => {
    const projection = reconstructMineruReadingLines(page, layoutReviews);
    return page.mineru.blocks
      .filter((block) => block.type === "table")
      .map((block) => {
        const rowId = [
          "mineru-table",
          slug(page.sourceId),
          page.sourcePageIndex,
          block.blockIndex,
        ].join(":");
        const projectedText = projection.lines
          .filter(
            (line) =>
              line.mineruBlockIndex === block.blockIndex &&
              line.mineruBlockType === "table",
          )
          .map((line) => line.text)
          .join("\n");
        const evidence = {
          sourceId: page.sourceId,
          sourcePageIndex: page.sourcePageIndex,
          printedPageNumber: page.printedPageNumber,
          blockIndex: block.blockIndex,
          bbox: block.bbox,
          tableHtml: block.tableHtml,
          captions: block.captions,
          footnotes: block.footnotes,
          projectedText,
        };
        return {
          schemaVersion: 1,
          rowId,
          ...evidence,
          evidenceSha256: crypto
            .createHash("sha256")
            .update(JSON.stringify(evidence))
            .digest("hex"),
        };
      });
  });
}

function detachNamedTables(lines: ReadingLine[]) {
  const spellNames = new Set(
    lines.flatMap((line, index) =>
      isSpellHeadingAt(lines, index) ? [normalizeNameKey(line.text)] : [],
    ),
  );
  const readingLines: ReadingLine[] = [];
  const tables: Array<{
    printedName: string;
    lines: ReadingLine[];
    attachToSpell: boolean;
  }> = [];
  const pages = new Map<PhbTextPageRow, ReadingLine[]>();
  for (const line of lines) {
    const pageLines = pages.get(line.page) ?? [];
    pageLines.push(line);
    pages.set(line.page, pageLines);
  }
  for (const pageLines of pages.values()) {
    const sharedMarkerIndex = pageLines.findIndex((line, index) => {
      const name = normalizeNameKey(line.text);
      return (
        SHARED_DETACHED_TABLES.has(name) &&
        isDetachedTableMarker(pageLines, index, spellNames)
      );
    });
    let filteredPageLines = pageLines;
    if (sharedMarkerIndex >= 0) {
      const marker = pageLines[sharedMarkerIndex]!;
      const sharedLines = pageLines.filter(
        (line) => line === marker || line.height < 8.5,
      );
      tables.push({
        printedName: marker.text,
        lines: sharedLines,
        attachToSpell: false,
      });
      const sharedSet = new Set(sharedLines);
      filteredPageLines = pageLines.filter((line) => !sharedSet.has(line));
    }
    let index = 0;
    while (index < filteredPageLines.length) {
      if (!isDetachedTableMarker(filteredPageLines, index, spellNames)) {
        readingLines.push(filteredPageLines[index]!);
        index += 1;
        continue;
      }
      const start = index;
      index += 1;
      while (
        index < filteredPageLines.length &&
        !isSpellHeadingAt(filteredPageLines, index) &&
        !isDetachedTableMarker(filteredPageLines, index, spellNames)
      ) {
        index += 1;
      }
      const printedName = filteredPageLines[start]!.text;
      tables.push({
        printedName,
        lines: filteredPageLines.slice(start, index),
        attachToSpell: !SHARED_DETACHED_TABLES.has(
          normalizeNameKey(printedName),
        ),
      });
    }
  }
  return { readingLines, tables };
}

function isDetachedTableMarker(
  lines: ReadingLine[],
  index: number,
  spellNames: Set<string>,
) {
  const line = lines[index];
  if (!line || isSpellHeadingAt(lines, index)) return false;
  const name = normalizeNameKey(line.text);
  return (
    (spellNames.has(name) || SHARED_DETACHED_TABLES.has(name)) &&
    line.height > 9.5 &&
    line.height < 10.5
  );
}

function assertDetachedTableSet(actualNames: string[]) {
  const actual = [...actualNames].sort((left, right) =>
    left.localeCompare(right, "en-US"),
  );
  const expected = [...EXPECTED_DETACHED_TABLES].sort((left, right) =>
    left.localeCompare(right, "en-US"),
  );
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `PHB detached named tables changed: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`,
    );
  }
}

function sourcePage(page: PhbTextPageRow): PilotSourcePage {
  return {
    sourceId: page.sourceId,
    sourceArtifactSha256: page.sourceArtifactSha256,
    sourcePageIndex: page.sourcePageIndex,
    printedPageNumber: page.printedPageNumber,
    textLayerSha256: page.pdfjs.textLayerSha256,
  };
}

function uniqueSourcePages(pages: PilotSourcePage[]) {
  return Array.from(
    new Map(
      pages.map((page) => [`${page.sourceId}:${page.sourcePageIndex}`, page]),
    ).values(),
  ).sort(
    (left, right) =>
      left.sourceId.localeCompare(right.sourceId, "en-US") ||
      left.sourcePageIndex - right.sourcePageIndex,
  );
}

function mergeWrappedSpellHeadings(lines: ReadingLine[]) {
  const merged = [...lines];
  for (let index = 1; index < merged.length; index += 1) {
    if (!isSpellHeadingAt(merged, index)) continue;
    const previous = merged[index - 1]!;
    const current = merged[index]!;
    const previousHeight = Math.max(
      ...previous.segments.map((segment) => segment.height),
    );
    const currentHeight = Math.max(
      ...current.segments.map((segment) => segment.height),
    );
    const fonts = new Set(
      [...previous.segments, ...current.segments]
        .filter((segment) => segment.text.trim().length > 0)
        .map((segment) => segment.fontName),
    );
    const verticalGap = previous.y - current.y;
    if (
      previous.page !== current.page ||
      previousHeight < 10.5 ||
      currentHeight < 10.5 ||
      fonts.size !== 1 ||
      verticalGap < 8 ||
      verticalGap > 16 ||
      !/^\p{Lu}[\p{L}\p{N}’'(),/\- ]+$/u.test(previous.text)
    ) {
      continue;
    }
    merged.splice(index - 1, 2, {
      page: current.page,
      text: `${previous.text} ${current.text}`,
      x: Math.min(previous.x, current.x),
      y: previous.y,
      height: Math.max(previous.height, current.height),
      segments: [...previous.segments, ...current.segments],
    });
    index -= 1;
  }
  return merged;
}

function issue(
  kind: FullExtractionIssue["kind"],
  printedName: string,
  page: PhbTextPageRow,
  message: string,
  occurrence: number,
): FullExtractionIssue {
  return {
    schemaVersion: 1,
    issueId: `${kind}:${slug(printedName)}:${occurrence}`,
    kind,
    printedName,
    sourceId: page.sourceId,
    sourcePageIndex: page.sourcePageIndex,
    printedPageNumber: page.printedPageNumber,
    message,
    status: "proposed",
    reviewer: null,
    decisionNote: null,
  };
}

function normalizeNameKey(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[‘’]/gu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function slug(value: string) {
  return normalizeNameKey(value)
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function writeFullMineruLayoutReview(
  dataRoot: string,
  pages: FullMineruPageRow[],
  extractionManifestPath: string,
  pagesPath: string,
) {
  const reviewPath = resolveInside(
    dataRoot,
    PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH,
  );
  const existing = fs.existsSync(reviewPath)
    ? readJsonl<FullMineruLayoutReview>(reviewPath)
    : [];
  const reviews = mergeFullMineruLayoutReviews(
    existing,
    buildFullMineruLayoutReviewCandidates(pages),
  );
  const errors = validateFullMineruLayoutReviews(pages, reviews);
  if (errors.length > 0) {
    throw new Error(
      `PHB full MinerU layout review is invalid:\n${errors.join("\n")}`,
    );
  }
  const outside = reviews.filter(
    (review) => review.kind === "outside-bbox-projection",
  );
  const order = reviews.filter(
    (review) => review.kind === "content-order-conflict",
  );
  if (outside.length !== 126 || order.length !== 2) {
    throw new Error(
      `PHB full MinerU layout candidate counts changed: outside=${outside.length} order=${order.length}`,
    );
  }
  writeJsonl(reviewPath, reviews);
  const manifestPath = resolveInside(
    dataRoot,
    PHB_FULL_LAYOUT_REVIEW_MANIFEST_RELATIVE_PATH,
  );
  writeJson(manifestPath, {
    schemaVersion: 1,
    extractionManifest: artifact(
      PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
      extractionManifestPath,
    ),
    pages: artifact(PHB_FULL_PAGES_RELATIVE_PATH, pagesPath),
    output: artifact(PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH, reviewPath),
    counts: {
      rows: reviews.length,
      outsideBboxProjection: outside.length,
      contentOrderConflict: order.length,
      accepted: reviews.filter((review) => review.status === "accepted").length,
      proposed: reviews.filter((review) => review.status === "proposed").length,
      rejected: reviews.filter((review) => review.status === "rejected").length,
    },
  });
  return reviews;
}

function readJsonl<T>(filePath: string): T[] {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/gu)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

function artifact(relativePath: string, filePath: string) {
  return { relativePath, sha256: sha256File(filePath) };
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
