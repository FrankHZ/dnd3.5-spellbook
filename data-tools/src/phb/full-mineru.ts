import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { PDFDocument } from "pdf-lib";

import type {
  PhbFullExtractionManifest,
  PhbFullRangeKind,
} from "./full-manifest";
import {
  PHB_MINERU_RUNTIME_RELATIVE_PATH,
  blockText,
  compareTokenMultisets,
  groupBlocksByPage,
  parseMineruContentList,
  parseRuntimeManifest,
  ratio,
  readJson,
  resolveAbsoluteInside,
  safeId,
  toStableMineruBlock,
  verifyFileIdentity,
  type StableMineruBlock,
} from "./pilot-extraction";
import { inspectPdfTextLayer } from "./pdf-baseline";
import {
  reconstructReadingLines,
  type PhbTextPageRow,
  type PilotSourcePage,
  type ReadingLine,
} from "./pilot-entities";
import {
  resolveInside,
  sha256File,
  type PhbSourceManifest,
} from "./source-manifest";

export const PHB_FULL_MINERU_INPUT_MANIFEST_RELATIVE_PATH =
  "phb35/extracted/full/mineru-input-manifest.json";
export const PHB_FULL_PAGES_RELATIVE_PATH = "phb35/extracted/full/pages.jsonl";
export const PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH =
  "phb35/extracted/full/extraction-manifest.json";
export const PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH =
  "phb35/review/full-mineru-layout-review.jsonl";
export const PHB_FULL_LAYOUT_REVIEW_MANIFEST_RELATIVE_PATH =
  "phb35/review/full-mineru-layout-review-manifest.json";

const FIXED_PDF_DATE = new Date("2000-01-01T00:00:00.000Z");

export type FullMineruPageMapping = {
  subsetPageIndex: number;
  sourcePageIndex: number;
  printedPageNumber: number;
  rangeKinds: PhbFullRangeKind[];
};

export type FullMineruInputArtifact = {
  sourceId: string;
  sourceSha256: string;
  relativePath: string;
  bytes: number;
  sha256: string;
  pages: FullMineruPageMapping[];
};

export type FullMineruBlock = StableMineruBlock & {
  blockIndex: number;
};

export type FullMineruPageRow = PhbTextPageRow & {
  rangeKinds: PhbFullRangeKind[];
  mineru: {
    engine: "MinerU";
    version: string;
    contentListSha256: string;
    blocks: FullMineruBlock[];
  };
  comparison: ReturnType<typeof compareTokenMultisets>;
};

export type FullMineruReadingLine = ReadingLine & {
  mineruBlockIndex: number;
  mineruBlockType: string;
  mineruTextLevel: number | null;
};

export type FullMineruProjectionIssue = {
  evidenceId: string | null;
  sourceId: string;
  sourcePageIndex: number;
  blockIndex: number;
  blockType: string;
  message: string;
};

export type FullMineruLayoutEvidenceReference = {
  rowId: string;
  evidenceFingerprintSha256: string;
};

type FullMineruLayoutReviewBase = {
  schemaVersion: 1;
  rowId: string;
  sourceId: string;
  sourceArtifactSha256: string;
  sourcePageIndex: number;
  printedPageNumber: number | null;
  contentListSha256: string;
  textLayerSha256: string;
  evidenceFingerprintSha256: string;
  status: "proposed" | "accepted" | "rejected";
  reviewer: string | null;
  decisionNote: string | null;
};

export type FullMineruOutsideBboxReview = FullMineruLayoutReviewBase & {
  kind: "outside-bbox-projection";
  candidateAlgorithmVersion: "mineru-bbox-candidates-v1";
  targetBlockIndex: number;
  pdfItem: {
    itemIndex: number;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    normalizedCenter: { x: number; y: number };
  };
  eligibleBlocks: Array<{
    blockIndex: number;
    blockType: string;
    blockBbox: [number, number, number, number];
    mineruText: string;
    distance: { horizontal: number; vertical: number };
  }>;
};

export type FullMineruOrderReview = FullMineruLayoutReviewBase & {
  kind: "content-order-conflict";
  candidateAlgorithmVersion: "mineru-header-order-conflict-v1";
  blockIndex: number;
  originalOrdinal: number;
  anchorBlockIndex: number;
  anchorOrdinal: number;
  blockType: string;
  blockBbox: [number, number, number, number];
  blockText: string;
  anchorBbox: [number, number, number, number];
  anchorText: string;
};

export type FullMineruLayoutReview =
  FullMineruOutsideBboxReview | FullMineruOrderReview;

type FullMineruInputManifest = {
  schemaVersion: 1;
  sourceManifest: { relativePath: string; sha256: string };
  fullManifest: { relativePath: string; sha256: string };
  artifacts: FullMineruInputArtifact[];
};

export async function buildFullInputPdfs(input: {
  dataRoot: string;
  outputRoot: string;
  sourceManifest: PhbSourceManifest;
  fullManifest: PhbFullExtractionManifest;
}) {
  const artifacts: FullMineruInputArtifact[] = [];
  fs.mkdirSync(input.outputRoot, { recursive: true });

  for (const sourceConfig of input.fullManifest.sources) {
    const source = input.sourceManifest.artifacts.find(
      (candidate) => candidate.id === sourceConfig.sourceId,
    );
    if (!source) {
      throw new Error(
        `Full manifest references unknown source: ${sourceConfig.sourceId}`,
      );
    }
    const pages = collectFullPageMappings(sourceConfig.ranges);
    const invalid = pages.find(
      (page) => page.sourcePageIndex >= source.pdf.pageCount,
    );
    if (invalid) {
      throw new Error(
        `${source.id} full page ${invalid.sourcePageIndex} exceeds the ${source.pdf.pageCount}-page source`,
      );
    }

    const sourcePath = resolveInside(input.dataRoot, source.relativePath);
    const sourcePdf = await PDFDocument.load(fs.readFileSync(sourcePath), {
      updateMetadata: false,
    });
    const subsetPdf = await PDFDocument.create();
    subsetPdf.setTitle(`PHB 3.5 full subset: ${source.id}`);
    subsetPdf.setAuthor("dnd3.5-spellbook data pipeline");
    subsetPdf.setCreator("data-tools PHB full MinerU input builder");
    subsetPdf.setProducer("pdf-lib 1.17.1");
    subsetPdf.setCreationDate(FIXED_PDF_DATE);
    subsetPdf.setModificationDate(FIXED_PDF_DATE);
    const copied = await subsetPdf.copyPages(
      sourcePdf,
      pages.map((page) => page.sourcePageIndex),
    );
    copied.forEach((page) => subsetPdf.addPage(page));
    const bytes = await subsetPdf.save({
      addDefaultPage: false,
      objectsPerTick: Number.POSITIVE_INFINITY,
      useObjectStreams: false,
      updateFieldAppearances: false,
    });
    const fileName = `${safeId(source.id)}.full.pdf`;
    const outputPath = path.join(input.outputRoot, fileName);
    fs.writeFileSync(outputPath, bytes);
    artifacts.push({
      sourceId: source.id,
      sourceSha256: source.sha256,
      relativePath: relativePath(input.dataRoot, outputPath),
      bytes: bytes.length,
      sha256: sha256(bytes),
      pages: pages.map((page, subsetPageIndex) => ({
        subsetPageIndex,
        ...page,
      })),
    });
  }
  return artifacts.sort((left, right) =>
    left.sourceId.localeCompare(right.sourceId, "en-US"),
  );
}

export async function importMineruFull(input: {
  dataRoot: string;
  mineruOutputRoot: string;
  sourceManifest: PhbSourceManifest;
  sourceManifestSha256: string;
  fullManifest: PhbFullExtractionManifest;
  fullManifestSha256: string;
}) {
  const dataRoot = path.resolve(input.dataRoot);
  const mineruOutputRoot = resolveAbsoluteInside(
    dataRoot,
    input.mineruOutputRoot,
  );
  const inputManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_MINERU_INPUT_MANIFEST_RELATIVE_PATH,
  );
  const runtimePath = resolveInside(dataRoot, PHB_MINERU_RUNTIME_RELATIVE_PATH);
  const inputManifest = parseInputManifest(
    readJson(inputManifestPath, "PHB full MinerU input manifest"),
  );
  const runtime = parseRuntimeManifest(
    readJson(runtimePath, "PHB MinerU runtime manifest"),
  );
  if (inputManifest.sourceManifest.sha256 !== input.sourceManifestSha256) {
    throw new Error(
      "Full MinerU input does not pin the current source manifest",
    );
  }
  if (inputManifest.fullManifest.sha256 !== input.fullManifestSha256) {
    throw new Error("Full MinerU input does not pin the current full manifest");
  }

  const pageRows: FullMineruPageRow[] = [];
  const artifactReports: Array<Record<string, unknown>> = [];
  let totalPdfTokenCount = 0;
  let totalMineruTokenCount = 0;
  let totalSharedTokenCount = 0;
  let totalTableBlockCount = 0;
  for (const artifact of inputManifest.artifacts) {
    const source = input.sourceManifest.artifacts.find(
      (candidate) => candidate.id === artifact.sourceId,
    );
    if (!source || source.sha256 !== artifact.sourceSha256) {
      throw new Error(`Full MinerU input source changed: ${artifact.sourceId}`);
    }
    const subsetPath = resolveInside(dataRoot, artifact.relativePath);
    verifyFileIdentity(subsetPath, artifact.bytes, artifact.sha256);
    const stem = `${safeId(artifact.sourceId)}.full`;
    const contentListPath = path.join(
      mineruOutputRoot,
      stem,
      "txt",
      `${stem}_content_list.json`,
    );
    if (!fs.existsSync(contentListPath)) {
      throw new Error(`MinerU content list not found: ${contentListPath}`);
    }
    const blocks = parseMineruContentList(
      readJson(contentListPath, `${artifact.sourceId} MinerU content list`),
      artifact.pages.length,
    );
    const blocksByPage = groupBlocksByPage(blocks, artifact.pages.length);
    const emptyPage = blocksByPage.findIndex((page) => page.length === 0);
    if (emptyPage >= 0) {
      throw new Error(
        `${artifact.sourceId} MinerU output has no blocks for subset page ${emptyPage}`,
      );
    }

    const selectedPages = new Set(
      artifact.pages.map((page) => page.sourcePageIndex),
    );
    const sourcePath = resolveInside(dataRoot, source.relativePath);
    const { baseline, sourcePages } = await inspectPdfTextLayer(
      sourcePath,
      selectedPages,
    );
    const sourcePageByIndex = new Map(
      sourcePages.map((page) => [page.zeroBasedPageIndex, page]),
    );
    let pdfTokenCount = 0;
    let mineruTokenCount = 0;
    let sharedTokenCount = 0;
    let tableBlockCount = 0;

    for (const mapping of artifact.pages) {
      const pdfPage = sourcePageByIndex.get(mapping.sourcePageIndex);
      if (!pdfPage) {
        throw new Error(
          `${artifact.sourceId} PDF.js page missing: ${mapping.sourcePageIndex}`,
        );
      }
      const stableBlocks = (blocksByPage[mapping.subsetPageIndex] ?? []).map(
        (block, blockIndex): FullMineruBlock => ({
          blockIndex,
          ...toStableMineruBlock(block),
        }),
      );
      tableBlockCount += stableBlocks.filter(
        (block) => block.type === "table",
      ).length;
      const comparison = compareTokenMultisets(
        pdfPage.items.map((item) => item.text).join(" "),
        stableBlocks.map(blockText).join(" "),
      );
      pdfTokenCount += comparison.pdfTokenCount;
      mineruTokenCount += comparison.mineruTokenCount;
      sharedTokenCount += comparison.sharedTokenCount;
      pageRows.push({
        schemaVersion: 1,
        sourceId: artifact.sourceId,
        sourceArtifactSha256: source.sha256,
        sourcePageIndex: mapping.sourcePageIndex,
        printedPageNumber: mapping.printedPageNumber,
        rangeKinds: mapping.rangeKinds,
        pdfjs: {
          extractor: baseline.extractor,
          width: pdfPage.width,
          height: pdfPage.height,
          textLayerSha256: pdfPage.textLayerSha256,
          items: pdfPage.items,
        },
        mineru: {
          engine: runtime.engine,
          version: runtime.version,
          contentListSha256: sha256File(contentListPath),
          blocks: stableBlocks,
        },
        comparison,
      });
    }
    artifactReports.push({
      sourceId: artifact.sourceId,
      sourceArtifactSha256: source.sha256,
      subsetArtifactSha256: artifact.sha256,
      mineruContentList: artifactIdentity(
        relativePath(dataRoot, contentListPath),
        contentListPath,
      ),
      pageCount: artifact.pages.length,
      blockCount: blocks.length,
      tableBlockCount,
    });
    totalPdfTokenCount += pdfTokenCount;
    totalMineruTokenCount += mineruTokenCount;
    totalSharedTokenCount += sharedTokenCount;
    totalTableBlockCount += tableBlockCount;
  }

  pageRows.sort(
    (left, right) =>
      left.sourceId.localeCompare(right.sourceId, "en-US") ||
      left.sourcePageIndex - right.sourcePageIndex,
  );
  const pagesPath = resolveInside(dataRoot, PHB_FULL_PAGES_RELATIVE_PATH);
  writeJsonl(pagesPath, pageRows);
  const extractionManifestPath = resolveInside(
    dataRoot,
    PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
  );
  writeJson(extractionManifestPath, {
    schemaVersion: 2,
    sourceManifest: inputManifest.sourceManifest,
    gate1Review: artifactIdentity(
      input.fullManifest.gate1Review.relativePath,
      resolveInside(dataRoot, input.fullManifest.gate1Review.relativePath),
    ),
    fullExtractionManifest: inputManifest.fullManifest,
    runtimeManifest: artifactIdentity(
      PHB_MINERU_RUNTIME_RELATIVE_PATH,
      runtimePath,
    ),
    inputManifest: artifactIdentity(
      PHB_FULL_MINERU_INPUT_MANIFEST_RELATIVE_PATH,
      inputManifestPath,
    ),
    sources: artifactReports,
    output: artifactIdentity(PHB_FULL_PAGES_RELATIVE_PATH, pagesPath),
    counts: {
      pages: pageRows.length,
      corePages: pageRows.filter((page) => page.sourceId === "phb35-core")
        .length,
      errataPages: pageRows.filter((page) => page.rangeKinds.includes("errata"))
        .length,
      mineruBlocks: pageRows.reduce(
        (sum, page) => sum + page.mineru.blocks.length,
        0,
      ),
      tableBlocks: pageRows.reduce(
        (sum, page) =>
          sum +
          page.mineru.blocks.filter((block) => block.type === "table").length,
        0,
      ),
      pdfTokenCount: totalPdfTokenCount,
      mineruTokenCount: totalMineruTokenCount,
      sharedTokenCount: totalSharedTokenCount,
      tokenRecall: ratio(totalSharedTokenCount, totalPdfTokenCount),
      tokenPrecision: ratio(totalSharedTokenCount, totalMineruTokenCount),
    },
  });
  return {
    pagesPath,
    extractionManifestPath,
    report: {
      schemaVersion: 1,
      counts: {
        pages: pageRows.length,
        blocks: pageRows.reduce(
          (sum, page) => sum + page.mineru.blocks.length,
          0,
        ),
        tableBlocks: totalTableBlockCount,
      },
      tokenRecall: ratio(totalSharedTokenCount, totalPdfTokenCount),
      tokenPrecision: ratio(totalSharedTokenCount, totalMineruTokenCount),
    },
  };
}

export function reconstructMineruReadingLines(
  page: FullMineruPageRow,
  layoutReviews: FullMineruLayoutReview[] = [],
) {
  const lines: FullMineruReadingLine[] = [];
  const issues: FullMineruProjectionIssue[] = [];
  const pageReviews = mergeFullMineruLayoutReviews(
    layoutReviews.filter(
      (review) =>
        review.sourceId === page.sourceId &&
        review.sourcePageIndex === page.sourcePageIndex,
    ),
    buildFullMineruLayoutReviewCandidates([page]),
  );
  const contentBlocks = orderedContentBlocks(page.mineru.blocks, pageReviews);
  const excludedBlocks = page.mineru.blocks.filter(
    (
      block,
    ): block is FullMineruBlock & { bbox: [number, number, number, number] } =>
      !isContentBlock(block) && block.bbox !== null,
  );
  const assignments = new Map<number, number[]>(
    contentBlocks.map((block) => [block.blockIndex, []]),
  );
  const unassigned: number[] = [];
  page.pdfjs.items.forEach((item, index) => {
    if (
      item.text.trim().length === 0 ||
      isKnownPageFurniture(page, item.text)
    ) {
      return;
    }
    const point = normalizedItemCenter(page, item);
    const containing = contentBlocks
      .filter((block) => pointInside(point, block.bbox, 0))
      .sort(
        (left, right) =>
          bboxArea(left.bbox) - bboxArea(right.bbox) ||
          left.blockIndex - right.blockIndex,
      )[0];
    if (containing) {
      assignments.get(containing.blockIndex)!.push(index);
      return;
    }
    if (excludedBlocks.some((block) => pointInside(point, block.bbox, 0))) {
      return;
    }
    if (
      excludedBlocks
        .filter((block) => block.type === "image")
        .some((block) => {
          const distance = bboxDistance(point, block.bbox);
          return distance.horizontal <= 30 && distance.vertical <= 100;
        })
    ) {
      return;
    }
    const accepted = pageReviews.find(
      (review): review is FullMineruOutsideBboxReview =>
        review.kind === "outside-bbox-projection" &&
        review.status === "accepted" &&
        review.pdfItem.itemIndex === index,
    );
    if (accepted && assignments.has(accepted.targetBlockIndex)) {
      assignments.get(accepted.targetBlockIndex)!.push(index);
    } else {
      unassigned.push(index);
    }
  });

  for (const block of contentBlocks) {
    const indexes = assignments.get(block.blockIndex) ?? [];
    const projected = reconstructReadingLines({
      ...page,
      pdfjs: {
        ...page.pdfjs,
        items: indexes.map((index) => page.pdfjs.items[index]!),
      },
    });
    const hasProposedOutsideProjection = pageReviews.some(
      (review) =>
        review.kind === "outside-bbox-projection" &&
        review.status === "proposed" &&
        review.targetBlockIndex === block.blockIndex,
    );
    if (
      projected.length === 0 &&
      blockText(block).trim().length > 0 &&
      !hasProposedOutsideProjection
    ) {
      issues.push({
        evidenceId: null,
        sourceId: page.sourceId,
        sourcePageIndex: page.sourcePageIndex,
        blockIndex: block.blockIndex,
        blockType: block.type,
        message:
          "MinerU content block has no unambiguous PDF.js text projection",
      });
    }
    lines.push(
      ...projected.map((line) => ({
        ...line,
        page,
        mineruBlockIndex: block.blockIndex,
        mineruBlockType: block.type,
        mineruTextLevel: block.textLevel,
      })),
    );
  }
  for (const review of pageReviews.filter(
    (candidate) => candidate.status === "proposed",
  )) {
    issues.push({
      evidenceId: review.rowId,
      sourceId: page.sourceId,
      sourcePageIndex: page.sourcePageIndex,
      blockIndex:
        review.kind === "content-order-conflict"
          ? review.blockIndex
          : review.targetBlockIndex,
      blockType:
        review.kind === "content-order-conflict"
          ? review.blockType
          : (review.eligibleBlocks.find(
              (block) => block.blockIndex === review.targetBlockIndex,
            )?.blockType ?? "unknown"),
      message:
        review.kind === "content-order-conflict"
          ? `MinerU content-order conflict remains proposed before block ${review.anchorBlockIndex}`
          : `PDF.js item ${review.pdfItem.itemIndex} remains outside the accepted MinerU block boundary`,
    });
  }
  if (unassigned.length > 0) {
    const reviewedIndexes = new Set(
      pageReviews
        .filter(
          (review): review is FullMineruOutsideBboxReview =>
            review.kind === "outside-bbox-projection",
        )
        .map((review) => review.pdfItem.itemIndex),
    );
    const unexplained = unassigned.filter(
      (index) => !reviewedIndexes.has(index),
    );
    if (unexplained.length === 0)
      return {
        lines,
        issues,
        layoutEvidence: acceptedLayoutEvidence(pageReviews),
      };
    issues.push({
      evidenceId: null,
      sourceId: page.sourceId,
      sourcePageIndex: page.sourcePageIndex,
      blockIndex: -1,
      blockType: "unassigned-pdfjs",
      message: `${unexplained.length} PDF.js text items are outside all MinerU content/non-content block boundaries and layout review: ${unexplained
        .slice(0, 3)
        .map((index) => page.pdfjs.items[index]!.text.trim())
        .join(" | ")}`,
    });
  }
  return { lines, issues, layoutEvidence: acceptedLayoutEvidence(pageReviews) };
}

export function buildFullMineruLayoutReviewCandidates(
  pages: FullMineruPageRow[],
): FullMineruLayoutReview[] {
  return pages.flatMap((page) => [
    ...outsideBboxCandidates(page),
    ...contentOrderCandidates(page),
  ]);
}

export function mergeFullMineruLayoutReviews(
  existing: FullMineruLayoutReview[],
  candidates: FullMineruLayoutReview[],
) {
  const byId = new Map(existing.map((review) => [review.rowId, review]));
  return candidates.map((candidate) => {
    const previous = byId.get(candidate.rowId);
    if (
      !previous ||
      previous.kind !== candidate.kind ||
      previous.evidenceFingerprintSha256 !== candidate.evidenceFingerprintSha256
    ) {
      return candidate;
    }
    return {
      ...candidate,
      ...(candidate.kind === "outside-bbox-projection" &&
      previous.kind === "outside-bbox-projection"
        ? { targetBlockIndex: previous.targetBlockIndex }
        : {}),
      ...(candidate.kind === "content-order-conflict" &&
      previous.kind === "content-order-conflict"
        ? { anchorBlockIndex: previous.anchorBlockIndex }
        : {}),
      status: previous.status,
      reviewer: previous.reviewer,
      decisionNote: previous.decisionNote,
    } satisfies FullMineruLayoutReview;
  });
}

export function validateFullMineruLayoutReviews(
  pages: FullMineruPageRow[],
  reviews: FullMineruLayoutReview[],
) {
  const errors: string[] = [];
  const candidates = buildFullMineruLayoutReviewCandidates(pages);
  const expected = new Map(candidates.map((row) => [row.rowId, row]));
  const seen = new Set<string>();
  const seenItems = new Set<string>();
  for (const [index, review] of reviews.entries()) {
    const prefix = `layoutReviews[${index}]`;
    if (seen.has(review.rowId)) errors.push(`${prefix}.rowId is duplicated`);
    seen.add(review.rowId);
    const candidate = expected.get(review.rowId);
    if (!candidate) {
      errors.push(`${prefix}.rowId is not a current layout candidate`);
      continue;
    }
    if (
      candidate.evidenceFingerprintSha256 !== review.evidenceFingerprintSha256
    ) {
      errors.push(`${prefix}.evidenceFingerprintSha256 is stale`);
    }
    if (
      review.status !== "proposed" &&
      (!review.reviewer || !review.decisionNote)
    ) {
      errors.push(`${prefix} terminal decision requires reviewer and note`);
    }
    const page = pages.find(
      (value) =>
        value.sourceId === review.sourceId &&
        value.sourcePageIndex === review.sourcePageIndex,
    );
    const blockIndexes = new Set(
      page?.mineru.blocks.map((block) => block.blockIndex) ?? [],
    );
    if (
      review.kind === "outside-bbox-projection" &&
      !review.eligibleBlocks.some(
        (block) => block.blockIndex === review.targetBlockIndex,
      )
    ) {
      errors.push(`${prefix}.targetBlockIndex is not an eligible block`);
    }
    if (review.kind === "outside-bbox-projection") {
      const itemKey = `${review.sourceId}:${review.sourcePageIndex}:${review.pdfItem.itemIndex}`;
      if (seenItems.has(itemKey)) {
        errors.push(`${prefix}.pdfItem is claimed by another review row`);
      }
      seenItems.add(itemKey);
    }
    if (
      review.kind === "content-order-conflict" &&
      !blockIndexes.has(review.anchorBlockIndex)
    ) {
      errors.push(`${prefix}.anchorBlockIndex is not on the source page`);
    }
  }
  for (const rowId of expected.keys()) {
    if (!seen.has(rowId)) errors.push(`layout review is missing ${rowId}`);
  }
  return errors;
}

export function parseFullMineruPageRows(text: string): FullMineruPageRow[] {
  const rows = text
    .split(/\r?\n/gu)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      let value: unknown;
      try {
        value = JSON.parse(line) as unknown;
      } catch (error) {
        throw new Error(
          `PHB full MinerU page row ${index + 1} is invalid JSON: ${String(error)}`,
        );
      }
      if (
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        !isRecord(value.pdfjs) ||
        !Array.isArray(value.pdfjs.items) ||
        !isRecord(value.mineru) ||
        value.mineru.engine !== "MinerU" ||
        !Array.isArray(value.mineru.blocks) ||
        !Array.isArray(value.rangeKinds)
      ) {
        throw new Error(`PHB full MinerU page row ${index + 1} is invalid`);
      }
      return value as FullMineruPageRow;
    });
  const keys = rows.map((row) => `${row.sourceId}:${row.sourcePageIndex}`);
  if (new Set(keys).size !== keys.length) {
    throw new Error("PHB full MinerU page rows contain duplicate source pages");
  }
  return rows;
}

function collectFullPageMappings(
  ranges: PhbFullExtractionManifest["sources"][number]["ranges"],
) {
  const pages = new Map<
    number,
    { printedPageNumbers: Set<number>; rangeKinds: Set<PhbFullRangeKind> }
  >();
  for (const range of ranges) {
    for (
      let sourcePageIndex = range.startPageIndex;
      sourcePageIndex <= range.endPageIndex;
      sourcePageIndex += 1
    ) {
      const page = pages.get(sourcePageIndex) ?? {
        printedPageNumbers: new Set<number>(),
        rangeKinds: new Set<PhbFullRangeKind>(),
      };
      page.printedPageNumbers.add(sourcePageIndex + range.printedPageOffset);
      page.rangeKinds.add(range.kind);
      pages.set(sourcePageIndex, page);
    }
  }
  return Array.from(pages, ([sourcePageIndex, page]) => {
    const printed = [...page.printedPageNumbers];
    if (printed.length !== 1) {
      throw new Error(
        `Full source page ${sourcePageIndex} has conflicting printed pages: ${printed.join(", ")}`,
      );
    }
    return {
      sourcePageIndex,
      printedPageNumber: printed[0]!,
      rangeKinds: [...page.rangeKinds].sort(),
    };
  }).sort((left, right) => left.sourcePageIndex - right.sourcePageIndex);
}

function isContentBlock(block: FullMineruBlock) {
  return (
    block.type === "text" ||
    block.type === "table" ||
    block.type === "list" ||
    (block.type === "header" && (block.text?.includes(":") ?? false))
  );
}

function orderedContentBlocks(
  blocks: FullMineruBlock[],
  reviews: FullMineruLayoutReview[],
) {
  type PositionedBlock = FullMineruBlock & {
    bbox: [number, number, number, number];
  };
  const positioned = blocks.filter(
    (block): block is PositionedBlock =>
      isContentBlock(block) && block.bbox !== null,
  );
  const ordered = [...positioned];
  for (const review of reviews.filter(
    (candidate): candidate is FullMineruOrderReview =>
      candidate.kind === "content-order-conflict" &&
      candidate.status === "accepted",
  )) {
    const currentIndex = ordered.findIndex(
      (block) => block.blockIndex === review.blockIndex,
    );
    const anchorIndex = ordered.findIndex(
      (block) => block.blockIndex === review.anchorBlockIndex,
    );
    if (currentIndex < 0 || anchorIndex < 0) continue;
    const [block] = ordered.splice(currentIndex, 1);
    const updatedAnchor = ordered.findIndex(
      (candidate) => candidate.blockIndex === review.anchorBlockIndex,
    );
    ordered.splice(updatedAnchor, 0, block!);
  }
  return ordered;
}

function outsideBboxCandidates(
  page: FullMineruPageRow,
): FullMineruOutsideBboxReview[] {
  const contentBlocks = page.mineru.blocks.filter(
    (
      block,
    ): block is FullMineruBlock & {
      bbox: [number, number, number, number];
    } => isContentBlock(block) && block.bbox !== null,
  );
  const excludedBlocks = page.mineru.blocks.filter(
    (
      block,
    ): block is FullMineruBlock & {
      bbox: [number, number, number, number];
    } => !isContentBlock(block) && block.bbox !== null,
  );
  return page.pdfjs.items.flatMap((item, itemIndex) => {
    if (
      item.text.trim().length === 0 ||
      isKnownPageFurniture(page, item.text)
    ) {
      return [];
    }
    const point = normalizedItemCenter(page, item);
    if (
      contentBlocks.some((block) => pointInside(point, block.bbox, 0)) ||
      excludedBlocks.some((block) => pointInside(point, block.bbox, 0))
    ) {
      return [];
    }
    if (
      excludedBlocks
        .filter((block) => block.type === "image")
        .some((block) => {
          const distance = bboxDistance(point, block.bbox);
          return distance.horizontal <= 30 && distance.vertical <= 100;
        })
    ) {
      return [];
    }
    const eligibleBlocks = projectionBlockCandidates(point, contentBlocks);
    if (eligibleBlocks.length === 0) return [];
    const pdfItem = {
      itemIndex,
      text: item.text,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      normalizedCenter: point,
    };
    const targetBlockIndex = eligibleBlocks[0]!.blockIndex;
    const evidence = layoutEvidenceBase(page, {
      kind: "outside-bbox-projection",
      candidateAlgorithmVersion: "mineru-bbox-candidates-v1",
      pdfItem,
      eligibleBlocks,
    });
    return [
      {
        schemaVersion: 1,
        rowId: `mineru-layout:${safeId(page.sourceId)}:${page.sourcePageIndex}:outside-bbox:${itemIndex}`,
        sourceId: page.sourceId,
        sourceArtifactSha256: page.sourceArtifactSha256,
        sourcePageIndex: page.sourcePageIndex,
        printedPageNumber: page.printedPageNumber,
        contentListSha256: page.mineru.contentListSha256,
        textLayerSha256: page.pdfjs.textLayerSha256,
        kind: "outside-bbox-projection" as const,
        candidateAlgorithmVersion: "mineru-bbox-candidates-v1" as const,
        targetBlockIndex,
        pdfItem,
        eligibleBlocks,
        evidenceFingerprintSha256: hashStableJson(evidence),
        status: "proposed" as const,
        reviewer: null,
        decisionNote: null,
      },
    ];
  });
}

function contentOrderCandidates(
  page: FullMineruPageRow,
): FullMineruOrderReview[] {
  type PositionedBlock = FullMineruBlock & {
    bbox: [number, number, number, number];
  };
  const positioned = page.mineru.blocks.filter(
    (block): block is PositionedBlock =>
      isContentBlock(block) && block.bbox !== null,
  );
  return positioned.flatMap((block, blockPosition) => {
    if (block.type !== "header") return [];
    const anchor = positioned.find(
      (candidate, candidatePosition) =>
        candidatePosition < blockPosition &&
        candidate.type !== "header" &&
        horizontalOverlap(block.bbox, candidate.bbox) > 0 &&
        candidate.bbox[1] >= block.bbox[3] - 5,
    );
    if (!anchor) return [];
    const evidence = layoutEvidenceBase(page, {
      kind: "content-order-conflict",
      candidateAlgorithmVersion: "mineru-header-order-conflict-v1",
      blockIndex: block.blockIndex,
      originalOrdinal: blockPosition,
      anchorBlockIndex: anchor.blockIndex,
      anchorOrdinal: positioned.findIndex(
        (candidate) => candidate.blockIndex === anchor.blockIndex,
      ),
      blockType: block.type,
      blockBbox: block.bbox,
      blockText: blockText(block),
      anchorBbox: anchor.bbox,
      anchorText: blockText(anchor),
    });
    return [
      {
        schemaVersion: 1,
        rowId: `mineru-layout:${safeId(page.sourceId)}:${page.sourcePageIndex}:content-order:${block.blockIndex}`,
        sourceId: page.sourceId,
        sourceArtifactSha256: page.sourceArtifactSha256,
        sourcePageIndex: page.sourcePageIndex,
        printedPageNumber: page.printedPageNumber,
        contentListSha256: page.mineru.contentListSha256,
        textLayerSha256: page.pdfjs.textLayerSha256,
        kind: "content-order-conflict" as const,
        candidateAlgorithmVersion: "mineru-header-order-conflict-v1" as const,
        blockIndex: block.blockIndex,
        originalOrdinal: blockPosition,
        anchorBlockIndex: anchor.blockIndex,
        anchorOrdinal: positioned.findIndex(
          (candidate) => candidate.blockIndex === anchor.blockIndex,
        ),
        blockType: block.type,
        blockBbox: block.bbox,
        blockText: blockText(block),
        anchorBbox: anchor.bbox,
        anchorText: blockText(anchor),
        evidenceFingerprintSha256: hashStableJson(evidence),
        status: "proposed" as const,
        reviewer: null,
        decisionNote: null,
      },
    ];
  });
}

function projectionBlockCandidates(
  point: { x: number; y: number },
  blocks: Array<FullMineruBlock & { bbox: [number, number, number, number] }>,
) {
  return blocks
    .map((block) => ({
      blockIndex: block.blockIndex,
      blockType: block.type,
      blockBbox: block.bbox,
      mineruText: blockText(block),
      distance: bboxDistance(point, block.bbox),
    }))
    .filter(
      ({ distance }) => distance.horizontal <= 12 && distance.vertical <= 65,
    )
    .sort(
      (left, right) =>
        left.distance.vertical - right.distance.vertical ||
        left.distance.horizontal - right.distance.horizontal ||
        left.blockIndex - right.blockIndex,
    );
}

function layoutEvidenceBase(
  page: FullMineruPageRow,
  evidence: Record<string, unknown>,
) {
  return {
    sourceId: page.sourceId,
    sourceArtifactSha256: page.sourceArtifactSha256,
    sourcePageIndex: page.sourcePageIndex,
    printedPageNumber: page.printedPageNumber,
    contentListSha256: page.mineru.contentListSha256,
    textLayerSha256: page.pdfjs.textLayerSha256,
    ...evidence,
  };
}

function hashStableJson(value: unknown) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

export function fullMineruLayoutDecisionFingerprint(
  review: FullMineruLayoutReview,
) {
  return hashStableJson({
    rowId: review.rowId,
    evidenceFingerprintSha256: review.evidenceFingerprintSha256,
    selectedTarget:
      review.kind === "outside-bbox-projection"
        ? { targetBlockIndex: review.targetBlockIndex }
        : { anchorBlockIndex: review.anchorBlockIndex },
    status: review.status,
    reviewer: review.reviewer,
    decisionNote: review.decisionNote,
  });
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right, "en-US"))
      .map(([key, nested]) => [key, stableValue(nested)]),
  );
}

function acceptedLayoutEvidence(
  reviews: FullMineruLayoutReview[],
): FullMineruLayoutEvidenceReference[] {
  return reviews
    .filter((review) => review.status === "accepted")
    .map((review) => ({
      rowId: review.rowId,
      evidenceFingerprintSha256: fullMineruLayoutDecisionFingerprint(review),
    }))
    .sort((left, right) => left.rowId.localeCompare(right.rowId, "en-US"));
}

export function layoutEvidenceForSourcePages(
  pages: PilotSourcePage[],
  reviews: FullMineruLayoutReview[],
) {
  const pageKeys = new Set(
    pages.map((page) => `${page.sourceId}:${page.sourcePageIndex}`),
  );
  return reviews
    .filter(
      (review) =>
        review.status === "accepted" &&
        pageKeys.has(`${review.sourceId}:${review.sourcePageIndex}`),
    )
    .map((review) => ({
      rowId: review.rowId,
      evidenceFingerprintSha256: fullMineruLayoutDecisionFingerprint(review),
    }))
    .sort((left, right) => left.rowId.localeCompare(right.rowId, "en-US"));
}

function horizontalOverlap(
  left: [number, number, number, number],
  right: [number, number, number, number],
) {
  return Math.max(0, Math.min(left[2], right[2]) - Math.max(left[0], right[0]));
}

function normalizedItemCenter(
  page: FullMineruPageRow,
  item: PhbTextPageRow["pdfjs"]["items"][number],
) {
  return {
    x: ((item.x + item.width / 2) / page.pdfjs.width) * 1000,
    y:
      ((page.pdfjs.height - (item.y + item.height / 2)) / page.pdfjs.height) *
      1000,
  };
}

function pointInside(
  point: { x: number; y: number },
  bbox: [number, number, number, number],
  tolerance: number,
) {
  return (
    point.x >= bbox[0] - tolerance &&
    point.x <= bbox[2] + tolerance &&
    point.y >= bbox[1] - tolerance &&
    point.y <= bbox[3] + tolerance
  );
}

function bboxArea(bbox: [number, number, number, number]) {
  return (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]);
}

function bboxDistance(
  point: { x: number; y: number },
  bbox: [number, number, number, number],
) {
  return {
    horizontal:
      point.x < bbox[0]
        ? bbox[0] - point.x
        : point.x > bbox[2]
          ? point.x - bbox[2]
          : 0,
    vertical:
      point.y < bbox[1]
        ? bbox[1] - point.y
        : point.y > bbox[3]
          ? point.y - bbox[3]
          : 0,
  };
}

function isKnownPageFurniture(page: FullMineruPageRow, text: string) {
  const normalized = text.trim();
  return (
    normalized === String(page.printedPageNumber) ||
    normalized === "CHAPTER 11:" ||
    normalized === "SPELLS" ||
    /^Illus\. by\b/u.test(normalized) ||
    (page.rangeKinds.includes("class-list") &&
      /^(?:Abjur|Conj|Div|Ench|Evoc|Illus|Necro|Trans)$/u.test(normalized))
  );
}

function parseInputManifest(value: unknown): FullMineruInputManifest {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error("PHB full MinerU input manifest is invalid");
  }
  const sourceManifest = parseArtifact(value.sourceManifest, "sourceManifest");
  const fullManifest = parseArtifact(value.fullManifest, "fullManifest");
  if (!Array.isArray(value.artifacts) || value.artifacts.length === 0) {
    throw new Error("PHB full MinerU input artifacts are invalid");
  }
  return {
    schemaVersion: 1,
    sourceManifest,
    fullManifest,
    artifacts: value.artifacts as FullMineruInputArtifact[],
  };
}

function parseArtifact(value: unknown, label: string) {
  if (
    !isRecord(value) ||
    typeof value.relativePath !== "string" ||
    !/^[a-f0-9]{64}$/u.test(String(value.sha256))
  ) {
    throw new Error(`PHB full MinerU input ${label} is invalid`);
  }
  return { relativePath: value.relativePath, sha256: String(value.sha256) };
}

function artifactIdentity(relativePathValue: string, filePath: string) {
  return { relativePath: relativePathValue, sha256: sha256File(filePath) };
}

function relativePath(root: string, filePath: string) {
  return path.relative(root, filePath).replace(/\\/gu, "/");
}

function sha256(value: Uint8Array) {
  return crypto.createHash("sha256").update(value).digest("hex");
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
