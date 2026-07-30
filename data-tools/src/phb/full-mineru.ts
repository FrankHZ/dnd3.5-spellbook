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
  candidateAlgorithmVersion:
    | "mineru-bbox-candidates-v1"
    | "mineru-image-overlap-projection-v1"
    | "mineru-image-overlap-projection-v2";
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

export type FullMineruImageAdjacentReview = FullMineruLayoutReviewBase & {
  kind: "image-adjacent-exclusion";
  candidateAlgorithmVersion:
    | "mineru-image-adjacent-v1"
    | "mineru-image-overlap-exclusion-v1"
    | "mineru-image-overlap-exclusion-v2";
  pdfItem: FullMineruOutsideBboxReview["pdfItem"];
  eligibleImageBlocks: Array<{
    blockIndex: number;
    blockBbox: [number, number, number, number];
    assetPath: string | null;
    captions: string[];
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
  | FullMineruOutsideBboxReview
  | FullMineruImageAdjacentReview
  | FullMineruOrderReview;

export type FullMineruInputManifest = {
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
  const inputManifest = parseFullMineruInputManifest(
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
    const sourceConfig = input.fullManifest.sources.find(
      (candidate) => candidate.sourceId === artifact.sourceId,
    );
    if (!sourceConfig) {
      throw new Error(
        `Full extraction manifest has no source: ${artifact.sourceId}`,
      );
    }
    assertCanonicalFullPageMappings(
      artifact.pages,
      sourceConfig.ranges,
      artifact.sourceId,
    );
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
  const excludedStructuralBlocks = page.mineru.blocks.filter(
    (
      block,
    ): block is FullMineruBlock & { bbox: [number, number, number, number] } =>
      !isContentBlock(block) && block.type !== "image" && block.bbox !== null,
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
    const itemReview = pageReviews.find(
      (
        review,
      ): review is
        FullMineruOutsideBboxReview | FullMineruImageAdjacentReview =>
        (review.kind === "outside-bbox-projection" ||
          review.kind === "image-adjacent-exclusion") &&
        review.pdfItem.itemIndex === index,
    );
    if (itemReview) {
      if (
        itemReview.status === "accepted" &&
        itemReview.kind === "outside-bbox-projection" &&
        assignments.has(itemReview.targetBlockIndex)
      ) {
        assignments.get(itemReview.targetBlockIndex)!.push(index);
      }
      if (itemReview.status !== "accepted") unassigned.push(index);
      return;
    }
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
    if (
      excludedStructuralBlocks.some((block) =>
        pointInside(point, block.bbox, 0),
      )
    ) {
      return;
    }
    unassigned.push(index);
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
    (candidate) =>
      candidate.status === "proposed" ||
      (candidate.status === "rejected" &&
        candidate.kind !== "content-order-conflict"),
  )) {
    issues.push({
      evidenceId: review.rowId,
      sourceId: page.sourceId,
      sourcePageIndex: page.sourcePageIndex,
      blockIndex:
        review.kind === "content-order-conflict"
          ? review.blockIndex
          : review.kind === "outside-bbox-projection"
            ? review.targetBlockIndex
            : (review.eligibleImageBlocks[0]?.blockIndex ?? -1),
      blockType:
        review.kind === "content-order-conflict"
          ? review.blockType
          : review.kind === "outside-bbox-projection"
            ? (review.eligibleBlocks.find(
                (block) => block.blockIndex === review.targetBlockIndex,
              )?.blockType ?? "unknown")
            : "image",
      message:
        review.kind === "content-order-conflict"
          ? `MinerU content-order conflict remains unaccepted before block ${review.anchorBlockIndex}`
          : review.kind === "outside-bbox-projection"
            ? `PDF.js item ${review.pdfItem.itemIndex} has no accepted MinerU block projection`
            : `PDF.js item ${review.pdfItem.itemIndex} remains adjacent to or overlapping an image without an accepted exclusion`,
    });
  }
  if (unassigned.length > 0) {
    const reviewedIndexes = new Set(
      pageReviews
        .filter(
          (
            review,
          ): review is
            FullMineruOutsideBboxReview | FullMineruImageAdjacentReview =>
            review.kind === "outside-bbox-projection" ||
            review.kind === "image-adjacent-exclusion",
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
    ...imageAdjacentCandidates(page),
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
  options: { requireTerminal?: boolean } = {},
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
      review.evidenceFingerprintSha256 !==
      fullMineruLayoutReviewEvidenceFingerprint(review)
    ) {
      errors.push(`${prefix} payload does not match its evidence fingerprint`);
    }
    if (!new Set(["proposed", "accepted", "rejected"]).has(review.status)) {
      errors.push(`${prefix}.status is invalid`);
    }
    if (
      review.status !== "proposed" &&
      (!isNonEmptyString(review.reviewer) ||
        !isNonEmptyString(review.decisionNote))
    ) {
      errors.push(`${prefix} terminal decision requires reviewer and note`);
    }
    if (options.requireTerminal && review.status === "proposed") {
      errors.push(`${prefix} is still proposed`);
    }
    if (
      options.requireTerminal &&
      review.status === "rejected" &&
      (review.kind === "outside-bbox-projection" ||
        review.kind === "image-adjacent-exclusion")
    ) {
      errors.push(`${prefix} has no accepted item layout action`);
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
    if (
      review.kind === "outside-bbox-projection" ||
      review.kind === "image-adjacent-exclusion"
    ) {
      const itemKey = `${review.sourceId}:${review.sourcePageIndex}:${review.pdfItem.itemIndex}`;
      if (seenItems.has(itemKey)) {
        errors.push(`${prefix}.pdfItem is claimed by another review row`);
      }
      seenItems.add(itemKey);
    }
    if (
      review.kind === "image-adjacent-exclusion" &&
      review.eligibleImageBlocks.length === 0
    ) {
      errors.push(`${prefix}.eligibleImageBlocks must not be empty`);
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

export function collectFullPageMappings(
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

export function assertCanonicalFullPageMappings(
  actual: FullMineruPageMapping[],
  ranges: PhbFullExtractionManifest["sources"][number]["ranges"],
  sourceId: string,
) {
  const expected = collectFullPageMappings(ranges).map(
    (page, subsetPageIndex) => ({ subsetPageIndex, ...page }),
  );
  if (
    actual.length !== expected.length ||
    actual.some((page, index) => {
      const canonical = expected[index];
      return (
        canonical === undefined ||
        page.subsetPageIndex !== canonical.subsetPageIndex ||
        page.sourcePageIndex !== canonical.sourcePageIndex ||
        page.printedPageNumber !== canonical.printedPageNumber ||
        page.rangeKinds.length !== canonical.rangeKinds.length ||
        page.rangeKinds.some(
          (kind, kindIndex) => kind !== canonical.rangeKinds[kindIndex],
        )
      );
    })
  ) {
    throw new Error(
      `Full MinerU input page mappings are not canonical: ${sourceId}`,
    );
  }
  return expected;
}

export function isContentBlock(block: FullMineruBlock | StableMineruBlock) {
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

function imageAdjacentCandidates(
  page: FullMineruPageRow,
): FullMineruImageAdjacentReview[] {
  const contentBlocks = page.mineru.blocks.filter(
    (
      block,
    ): block is FullMineruBlock & {
      bbox: [number, number, number, number];
    } => isContentBlock(block) && block.bbox !== null,
  );
  const structuralBlocks = page.mineru.blocks.filter(
    (
      block,
    ): block is FullMineruBlock & {
      bbox: [number, number, number, number];
    } =>
      !isContentBlock(block) && block.type !== "image" && block.bbox !== null,
  );
  return page.pdfjs.items.flatMap((item, itemIndex) => {
    if (
      item.text.trim().length === 0 ||
      isKnownPageFurniture(page, item.text)
    ) {
      return [];
    }
    const point = normalizedItemCenter(page, item);
    const itemBbox = normalizedItemBbox(page, item);
    const eligibleImageBlocks = adjacentImageBlocks(page, point, itemBbox);
    if (eligibleImageBlocks.length === 0) return [];
    const overlapsImage = eligibleImageBlocks.some((block) =>
      bboxesOverlap(itemBbox, block.blockBbox),
    );
    const eligibleProjectionBlocks = projectionBlockCandidates(
      point,
      contentBlocks,
      150,
    );
    const structuralEvidence = hasStructuralEvidence(
      item.text,
      point,
      structuralBlocks,
    );
    if (
      (!overlapsImage &&
        contentBlocks.some((block) => pointInside(point, block.bbox, 0))) ||
      (!overlapsImage &&
        structuralBlocks.some((block) => pointInside(point, block.bbox, 0)))
    ) {
      return [];
    }
    if (
      overlapsImage &&
      eligibleProjectionBlocks.length > 0 &&
      !structuralEvidence
    ) {
      return [];
    }
    const pdfItem = layoutPdfItem(item, itemIndex, point);
    const candidateAlgorithmVersion = overlapsImage
      ? ("mineru-image-overlap-exclusion-v2" as const)
      : ("mineru-image-adjacent-v1" as const);
    const evidence = layoutEvidenceBase(page, {
      kind: "image-adjacent-exclusion",
      candidateAlgorithmVersion,
      pdfItem,
      eligibleImageBlocks,
    });
    return [
      {
        schemaVersion: 1,
        rowId: `mineru-layout:${safeId(page.sourceId)}:${page.sourcePageIndex}:${overlapsImage ? "image-overlap" : "image-adjacent"}:${itemIndex}`,
        sourceId: page.sourceId,
        sourceArtifactSha256: page.sourceArtifactSha256,
        sourcePageIndex: page.sourcePageIndex,
        printedPageNumber: page.printedPageNumber,
        contentListSha256: page.mineru.contentListSha256,
        textLayerSha256: page.pdfjs.textLayerSha256,
        kind: "image-adjacent-exclusion" as const,
        candidateAlgorithmVersion,
        pdfItem,
        eligibleImageBlocks,
        evidenceFingerprintSha256: hashStableJson(evidence),
        status: "proposed" as const,
        reviewer: null,
        decisionNote: null,
      },
    ];
  });
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
  const excludedStructuralBlocks = page.mineru.blocks.filter(
    (
      block,
    ): block is FullMineruBlock & {
      bbox: [number, number, number, number];
    } =>
      !isContentBlock(block) && block.type !== "image" && block.bbox !== null,
  );
  return page.pdfjs.items.flatMap((item, itemIndex) => {
    if (
      item.text.trim().length === 0 ||
      isKnownPageFurniture(page, item.text)
    ) {
      return [];
    }
    const point = normalizedItemCenter(page, item);
    const itemBbox = normalizedItemBbox(page, item);
    const eligibleImageBlocks = adjacentImageBlocks(page, point, itemBbox);
    const overlapsImage = eligibleImageBlocks.some((block) =>
      bboxesOverlap(itemBbox, block.blockBbox),
    );
    const structuralEvidence = hasStructuralEvidence(
      item.text,
      point,
      excludedStructuralBlocks,
    );
    if (
      (!overlapsImage &&
        contentBlocks.some((block) => pointInside(point, block.bbox, 0))) ||
      (!overlapsImage &&
        excludedStructuralBlocks.some((block) =>
          pointInside(point, block.bbox, 0),
        ))
    ) {
      return [];
    }
    if (eligibleImageBlocks.length > 0 && !overlapsImage) {
      return [];
    }
    if (overlapsImage && structuralEvidence) return [];
    const eligibleBlocks = projectionBlockCandidates(
      point,
      contentBlocks,
      overlapsImage ? 150 : 65,
    );
    if (eligibleBlocks.length === 0) return [];
    let targetBlockIndex = eligibleBlocks[0]!.blockIndex;
    if (
      eligibleBlocks[0]!.mineruText.trim().length === 0 &&
      eligibleBlocks[0]!.blockBbox[1] < 100
    ) {
      const preceding = contentBlocks
        .filter(
          (block) =>
            block.blockIndex < targetBlockIndex &&
            blockText(block).trim().length > 0,
        )
        .sort((left, right) => right.blockIndex - left.blockIndex)[0];
      if (preceding) {
        targetBlockIndex = preceding.blockIndex;
        if (
          !eligibleBlocks.some(
            (candidate) => candidate.blockIndex === preceding.blockIndex,
          )
        ) {
          eligibleBlocks.push({
            blockIndex: preceding.blockIndex,
            blockType: preceding.type,
            blockBbox: preceding.bbox,
            mineruText: blockText(preceding),
            distance: bboxDistance(point, preceding.bbox),
          });
        }
      }
    }
    const pdfItem = layoutPdfItem(item, itemIndex, point);
    const candidateAlgorithmVersion = overlapsImage
      ? ("mineru-image-overlap-projection-v2" as const)
      : ("mineru-bbox-candidates-v1" as const);
    const evidence = layoutEvidenceBase(page, {
      kind: "outside-bbox-projection",
      candidateAlgorithmVersion,
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
        candidateAlgorithmVersion,
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
  maxVerticalDistance = 65,
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
      ({ distance }) =>
        distance.horizontal <= 12 && distance.vertical <= maxVerticalDistance,
    )
    .sort(
      (left, right) =>
        left.distance.vertical - right.distance.vertical ||
        left.distance.horizontal - right.distance.horizontal ||
        left.blockIndex - right.blockIndex,
    );
}

function hasStructuralEvidence(
  itemText: string,
  point: { x: number; y: number },
  blocks: Array<FullMineruBlock & { bbox: [number, number, number, number] }>,
) {
  if (blocks.some((block) => pointInside(point, block.bbox, 0))) {
    return true;
  }
  const normalized = normalizeLayoutText(itemText);
  if (normalized.length < 12) return false;
  return blocks.some((block) => {
    const blockTextValue = normalizeLayoutText(blockText(block));
    return blockTextValue.includes(normalized);
  });
}

function normalizeLayoutText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/[\u2013\u2014\u2212]/gu, "-")
    .replace(/[^\p{L}\p{N}+'/-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function adjacentImageBlocks(
  page: FullMineruPageRow,
  point: { x: number; y: number },
  itemBbox: [number, number, number, number],
) {
  return page.mineru.blocks
    .filter(
      (
        block,
      ): block is FullMineruBlock & {
        bbox: [number, number, number, number];
      } => block.type === "image" && block.bbox !== null,
    )
    .map((block) => ({
      blockIndex: block.blockIndex,
      blockBbox: block.bbox,
      assetPath: block.assetPath,
      captions: block.captions,
      distance: bboxDistance(point, block.bbox),
    }))
    .filter(
      (block) =>
        bboxesOverlap(itemBbox, block.blockBbox) ||
        (block.distance.horizontal <= 30 && block.distance.vertical <= 100),
    )
    .sort(
      (left, right) =>
        left.distance.vertical - right.distance.vertical ||
        left.distance.horizontal - right.distance.horizontal ||
        left.blockIndex - right.blockIndex,
    );
}

function layoutPdfItem(
  item: PhbTextPageRow["pdfjs"]["items"][number],
  itemIndex: number,
  normalizedCenter: { x: number; y: number },
) {
  return {
    itemIndex,
    text: item.text,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    normalizedCenter,
  };
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

function fullMineruLayoutReviewEvidenceFingerprint(
  review: FullMineruLayoutReview,
) {
  const evidence: Record<string, unknown> = { ...review };
  delete evidence.schemaVersion;
  delete evidence.rowId;
  delete evidence.evidenceFingerprintSha256;
  delete evidence.status;
  delete evidence.reviewer;
  delete evidence.decisionNote;
  if (review.kind === "outside-bbox-projection") {
    delete evidence.targetBlockIndex;
  }
  return hashStableJson(evidence);
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
        : review.kind === "content-order-conflict"
          ? { anchorBlockIndex: review.anchorBlockIndex }
          : {
              excludedImageBlockIndexes: review.eligibleImageBlocks.map(
                (block) => block.blockIndex,
              ),
            },
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

export function normalizedItemCenter(
  page: { pdfjs: { width: number; height: number } },
  item: PhbTextPageRow["pdfjs"]["items"][number],
) {
  return {
    x: ((item.x + item.width / 2) / page.pdfjs.width) * 1000,
    y:
      ((page.pdfjs.height - (item.y + item.height / 2)) / page.pdfjs.height) *
      1000,
  };
}

export function normalizedItemBbox(
  page: { pdfjs: { width: number; height: number } },
  item: PhbTextPageRow["pdfjs"]["items"][number],
): [number, number, number, number] {
  const x1 = (item.x / page.pdfjs.width) * 1000;
  const x2 = ((item.x + item.width) / page.pdfjs.width) * 1000;
  const y1 =
    ((page.pdfjs.height - (item.y + item.height)) / page.pdfjs.height) * 1000;
  const y2 = ((page.pdfjs.height - item.y) / page.pdfjs.height) * 1000;
  return [
    Math.min(x1, x2),
    Math.min(y1, y2),
    Math.max(x1, x2),
    Math.max(y1, y2),
  ];
}

function bboxesOverlap(
  left: [number, number, number, number],
  right: [number, number, number, number],
) {
  return (
    Math.min(left[2], right[2]) > Math.max(left[0], right[0]) &&
    Math.min(left[3], right[3]) > Math.max(left[1], right[1])
  );
}

export function pointInside(
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

export function isKnownPageFurniture(
  page: {
    printedPageNumber: number | null;
    rangeKinds: PhbFullRangeKind[];
  },
  text: string,
) {
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

export function parseFullMineruInputManifest(
  value: unknown,
): FullMineruInputManifest {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error("PHB full MinerU input manifest is invalid");
  }
  const sourceManifest = parseArtifact(value.sourceManifest, "sourceManifest");
  const fullManifest = parseArtifact(value.fullManifest, "fullManifest");
  if (!Array.isArray(value.artifacts) || value.artifacts.length === 0) {
    throw new Error("PHB full MinerU input artifacts are invalid");
  }
  const artifacts = value.artifacts.map(parseInputArtifact);
  const sourceIds = artifacts.map((artifact) => artifact.sourceId);
  if (new Set(sourceIds).size !== sourceIds.length) {
    throw new Error("PHB full MinerU input source ids are duplicated");
  }
  return {
    schemaVersion: 1,
    sourceManifest,
    fullManifest,
    artifacts,
  };
}

function parseInputArtifact(
  value: unknown,
  artifactIndex: number,
): FullMineruInputArtifact {
  const prefix = `PHB full MinerU input artifacts[${artifactIndex}]`;
  if (
    !isRecord(value) ||
    typeof value.sourceId !== "string" ||
    value.sourceId.trim().length === 0 ||
    typeof value.sourceSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sourceSha256) ||
    typeof value.relativePath !== "string" ||
    value.relativePath.trim().length === 0 ||
    !Number.isInteger(value.bytes) ||
    (value.bytes as number) <= 0 ||
    typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) ||
    !Array.isArray(value.pages) ||
    value.pages.length === 0
  ) {
    throw new Error(`${prefix} is invalid`);
  }
  const pages = value.pages.map((page, pageIndex) =>
    parseInputPageMapping(page, pageIndex, prefix),
  );
  const sourcePageIndexes = pages.map((page) => page.sourcePageIndex);
  if (new Set(sourcePageIndexes).size !== sourcePageIndexes.length) {
    throw new Error(`${prefix} contains duplicate source pages`);
  }
  return {
    sourceId: value.sourceId,
    sourceSha256: value.sourceSha256,
    relativePath: value.relativePath,
    bytes: value.bytes as number,
    sha256: value.sha256,
    pages,
  };
}

function parseInputPageMapping(
  value: unknown,
  pageIndex: number,
  artifactPrefix: string,
): FullMineruPageMapping {
  const prefix = `${artifactPrefix}.pages[${pageIndex}]`;
  if (
    !isRecord(value) ||
    !Number.isInteger(value.subsetPageIndex) ||
    (value.subsetPageIndex as number) < 0 ||
    value.subsetPageIndex !== pageIndex ||
    !Number.isInteger(value.sourcePageIndex) ||
    (value.sourcePageIndex as number) < 0 ||
    !Number.isInteger(value.printedPageNumber) ||
    !Array.isArray(value.rangeKinds) ||
    value.rangeKinds.length === 0 ||
    !value.rangeKinds.every(
      (kind) =>
        kind === "class-list" || kind === "description" || kind === "errata",
    ) ||
    new Set(value.rangeKinds).size !== value.rangeKinds.length
  ) {
    throw new Error(`${prefix} is invalid or non-contiguous`);
  }
  return {
    subsetPageIndex: value.subsetPageIndex as number,
    sourcePageIndex: value.sourcePageIndex as number,
    printedPageNumber: value.printedPageNumber as number,
    rangeKinds: value.rangeKinds as PhbFullRangeKind[],
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
