import fs from "node:fs";
import path from "node:path";

import {
  extractSpellAtHeading,
  isSpellHeadingAt,
  joinWrappedLines,
  reconstructReadingLines,
  type PhbTextPageRow,
  type PilotSpellFieldName,
  type PilotSourcePage,
  type ReadingLine,
} from "./pilot-entities";
import { inspectPdfTextLayer } from "./pdf-baseline";
import {
  PHB_FULL_MANIFEST_RELATIVE_PATH,
  readPhbFullExtractionManifest,
  type PhbFullExtractionManifest,
  type PhbFullRangeKind,
} from "./full-manifest";
import { extractFullSpellLists } from "./full-lists";
import {
  PHB_SOURCE_MANIFEST_RELATIVE_PATH,
  parsePhbSourceManifestText,
  readAndVerifyPhbSourceManifest,
  resolveInside,
  sha256File,
} from "./source-manifest";

export const PHB_FULL_PAGES_RELATIVE_PATH = "phb35/extracted/full/pages.jsonl";
export const PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH =
  "phb35/extracted/full/extraction-manifest.json";
export const PHB_FULL_ENTITIES_RELATIVE_PATH =
  "phb35/extracted/full/entities.jsonl";
export const PHB_FULL_ISSUES_RELATIVE_PATH =
  "phb35/extracted/full/issues.jsonl";
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

export type FullPageRow = PhbTextPageRow & {
  rangeKinds: PhbFullRangeKind[];
};

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
};

export type FullExtractionIssue = {
  schemaVersion: 1;
  issueId: string;
  kind: "spell-block-parse-failed" | "duplicate-spell-heading";
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
  const sourceVerification = readAndVerifyPhbSourceManifest(dataRoot);
  const sourceManifest = parsePhbSourceManifestText(
    fs.readFileSync(sourceVerification.manifestPath, "utf8"),
  );
  const { filePath: fullManifestPath, manifest } =
    readPhbFullExtractionManifest(dataRoot);
  if (manifest.sourceManifest.sha256 !== sourceVerification.manifestSha256) {
    throw new Error(
      `PHB full manifest pins source ${manifest.sourceManifest.sha256}, expected ${sourceVerification.manifestSha256}`,
    );
  }

  const pages: FullPageRow[] = [];
  const sourceReports: Array<{
    sourceId: string;
    sourceArtifactSha256: string;
    selectedPageCount: number;
    rangeKinds: PhbFullRangeKind[];
  }> = [];
  for (const sourceConfig of manifest.sources) {
    const verified = sourceVerification.artifacts.find(
      (artifact) => artifact.id === sourceConfig.sourceId,
    );
    const source = sourceManifest.artifacts.find(
      (artifact) => artifact.id === sourceConfig.sourceId,
    );
    if (!verified || !source) {
      throw new Error(
        `PHB full source is not pinned: ${sourceConfig.sourceId}`,
      );
    }
    const selectedIndexes = pageIndexes(sourceConfig.ranges);
    for (const index of selectedIndexes) {
      if (index >= source.pdf.pageCount) {
        throw new Error(
          `PHB full source page exceeds ${sourceConfig.sourceId} page count: ${index}`,
        );
      }
    }
    const { baseline, sourcePages } = await inspectPdfTextLayer(
      verified.path,
      selectedIndexes,
    );
    const byIndex = new Map(
      sourcePages.map((page) => [page.zeroBasedPageIndex, page]),
    );
    for (const sourcePageIndex of [...selectedIndexes].sort(
      (left, right) => left - right,
    )) {
      const page = byIndex.get(sourcePageIndex);
      if (!page) {
        throw new Error(
          `PHB full PDF.js extraction omitted ${sourceConfig.sourceId}:${sourcePageIndex}`,
        );
      }
      const matchingRanges = sourceConfig.ranges.filter(
        (range) =>
          sourcePageIndex >= range.startPageIndex &&
          sourcePageIndex <= range.endPageIndex,
      );
      const offsets = new Set(
        matchingRanges.map((range) => range.printedPageOffset),
      );
      if (offsets.size !== 1) {
        throw new Error(
          `PHB full page has conflicting printed-page offsets: ${sourceConfig.sourceId}:${sourcePageIndex}`,
        );
      }
      const printedPageOffset = [...offsets][0]!;
      pages.push({
        schemaVersion: 1,
        sourceId: sourceConfig.sourceId,
        sourceArtifactSha256: verified.sha256,
        sourcePageIndex,
        printedPageNumber: sourcePageIndex + printedPageOffset,
        rangeKinds: Array.from(
          new Set(matchingRanges.map((range) => range.kind)),
        ).sort(),
        pdfjs: {
          extractor: baseline.extractor,
          width: page.width,
          height: page.height,
          textLayerSha256: page.textLayerSha256,
          items: page.items,
        },
      });
    }
    sourceReports.push({
      sourceId: sourceConfig.sourceId,
      sourceArtifactSha256: verified.sha256,
      selectedPageCount: selectedIndexes.size,
      rangeKinds: Array.from(
        new Set(sourceConfig.ranges.map((range) => range.kind)),
      ).sort(),
    });
  }

  const pagesPath = resolveInside(dataRoot, PHB_FULL_PAGES_RELATIVE_PATH);
  writeJsonl(pagesPath, pages);
  const extractionManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
  );
  writeJson(extractionManifestPath, {
    schemaVersion: 1,
    sourceManifest: artifact(
      PHB_SOURCE_MANIFEST_RELATIVE_PATH,
      sourceVerification.manifestPath,
    ),
    gate1Review: artifact(
      manifest.gate1Review.relativePath,
      resolveInside(dataRoot, manifest.gate1Review.relativePath),
    ),
    fullExtractionManifest: artifact(
      PHB_FULL_MANIFEST_RELATIVE_PATH,
      fullManifestPath,
    ),
    sources: sourceReports,
    output: artifact(PHB_FULL_PAGES_RELATIVE_PATH, pagesPath),
    counts: {
      pages: pages.length,
      corePages: pages.filter((page) => page.sourceId === "phb35-core").length,
      errataPages: pages.filter((page) => page.rangeKinds.includes("errata"))
        .length,
    },
  });

  const descriptionPages = pages.filter((page) =>
    page.rangeKinds.includes("description"),
  );
  const discovery = discoverFullSpellEntities(descriptionPages);
  assertDetachedTableSet(discovery.detachedTableNames);
  if (discovery.removedCaptionCount !== 6) {
    throw new Error(
      `PHB illustration caption count changed: ${discovery.removedCaptionCount} != 6`,
    );
  }
  const listExtraction = extractFullSpellLists(
    pages.filter((page) => page.rangeKinds.includes("class-list")),
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
    outputs: {
      entities: artifact(PHB_FULL_ENTITIES_RELATIVE_PATH, entitiesPath),
      issues: artifact(PHB_FULL_ISSUES_RELATIVE_PATH, issuesPath),
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
      illustrationCaptionRunsRemoved: discovery.removedCaptionCount,
      ...listExtraction.counts,
    },
    sourceSetReconciliation,
  });
  return {
    pagesPath,
    extractionManifestPath,
    entitiesPath,
    issuesPath,
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
      illustrationCaptionRunsRemoved: discovery.removedCaptionCount,
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

export function discoverFullSpellEntities(pages: FullPageRow[]) {
  const sortedPages = [...pages].sort(
    (left, right) => left.sourcePageIndex - right.sourcePageIndex,
  );
  const reconstructed = mergeWrappedSpellHeadings(
    sortedPages.flatMap(reconstructReadingLines),
  );
  const captions = removeIllustrationCaptions(reconstructed);
  const detached = detachNamedTables(captions.readingLines);
  const lines = detached.readingLines;
  const headingIndexes = lines.flatMap((line, index) =>
    isSpellHeadingAt(lines, index) ? [index] : [],
  );
  const spells: FullSpellEntity[] = [];
  const issues: FullExtractionIssue[] = [];
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
    removedCaptionCount: captions.removedCount,
  };
}

function removeIllustrationCaptions(lines: ReadingLine[]) {
  const readingLines: ReadingLine[] = [];
  let removedCount = 0;
  for (let index = 0; index < lines.length;) {
    const first = lines[index]!;
    if (!isStandaloneItalicLine(first)) {
      readingLines.push(first);
      index += 1;
      continue;
    }
    const run = [first];
    let stop = index + 1;
    while (
      stop < lines.length &&
      isStandaloneItalicLine(lines[stop]!) &&
      lines[stop]!.page === first.page &&
      Math.abs(lines[stop]!.x - first.x) < 12 &&
      run[run.length - 1]!.y - lines[stop]!.y < 16
    ) {
      run.push(lines[stop]!);
      stop += 1;
    }
    const text = joinWrappedLines(run.map((line) => line.text));
    if (
      /^(?:Illus\. by\b|The subject of\b|[A-Z][a-z]+ (?:casts|summons)\b|Prismatic wall makes\b)/u.test(
        text,
      )
    ) {
      removedCount += 1;
    } else {
      readingLines.push(...run);
    }
    index = stop;
  }
  return { readingLines, removedCount };
}

function isStandaloneItalicLine(line: ReadingLine) {
  const visible = line.segments.filter(
    (segment) => segment.text.trim().length > 0,
  );
  return visible.length === 1 && visible[0]!.fontName === "g_d2_f9";
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

function mergeWrappedSpellHeadings(
  lines: ReturnType<typeof reconstructReadingLines>,
) {
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

function pageIndexes(
  ranges: PhbFullExtractionManifest["sources"][number]["ranges"],
) {
  const result = new Set<number>();
  for (const range of ranges) {
    for (
      let page = range.startPageIndex;
      page <= range.endPageIndex;
      page += 1
    ) {
      result.add(page);
    }
  }
  return result;
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
