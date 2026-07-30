import fs from "node:fs";
import path from "node:path";

import { localDataDir, repoRoot } from "../shared/env";
import {
  PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
  PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH,
  parseFullMineruPageRows,
  validateFullMineruLayoutReviews,
  type FullMineruLayoutReview,
} from "./full-mineru";
import {
  PHB_MINERU_DUAL_REVIEW_MANIFEST_RELATIVE_PATH,
  PHB_MINERU_DUAL_REVIEW_RELATIVE_PATH,
  buildMineruDualReviewRows,
  mergeMineruDualReviews,
  validateMineruDualReviews,
  type MineruDualReview,
} from "./mineru-dual-review";
import { auditMineruPageRecall, type MineruRecallAudit } from "./mineru-recall";
import { readAndVerifyMineruBatchRunManifest } from "./mineru-batch-run";
import {
  parseMineruContentList,
  readJson,
  resolveAbsoluteInside,
  toStableMineruBlock,
} from "./pilot-extraction";
import { sha256File } from "./source-manifest";

const REPORT_RELATIVE_PATH =
  "data-tools/out/phb/mineru-dual-engine.generated.json";
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

type CurrentFullExtractionManifest = {
  schemaVersion: 2;
  sources: Array<{
    sourceId: string;
    sourceArtifactSha256: string;
    mineruContentList: {
      relativePath: string;
      sha256: string;
    };
    pageCount: number;
  }>;
  output: {
    relativePath: string;
    sha256: string;
  };
};

export type MineruDualReviewManifest = {
  schemaVersion: 1;
  source: {
    id: string;
    artifactSha256: string;
  };
  pipeline: {
    extractionManifest: FileIdentity;
    pages: FileIdentity;
    contentList: FileIdentity;
  };
  vlm: {
    batchManifest: FileIdentity;
    version: string;
    model: {
      repository: string;
      revision: string;
    };
  };
  layoutReview: FileIdentity;
  review: FileIdentity;
  counts: {
    pages: number;
    disagreementRows: number;
    itemRows: number;
    tableRows: number;
    proposed: number;
    accepted: number;
    rejected: number;
  };
};

type FileIdentity = {
  relativePath: string;
  sha256: string;
};

type MineruBatchReader = typeof readAndVerifyMineruBatchRunManifest;

export function runMineruDualReview(input: {
  dataRoot?: string;
  batchManifestPath: string;
  batchReader?: MineruBatchReader;
}) {
  const context = loadDualContext({
    dataRoot: input.dataRoot ?? localDataDir(),
    batchManifestPath: input.batchManifestPath,
    ...(input.batchReader ? { batchReader: input.batchReader } : {}),
  });
  const existing = fs.existsSync(context.reviewPath)
    ? readJsonl<MineruDualReview>(
        context.reviewPath,
        "PHB MinerU dual-engine review",
      )
    : [];
  const reviews = mergeMineruDualReviews(existing, context.candidates);
  const errors = validateMineruDualReviews(context.candidates, reviews);
  if (errors.length > 0) {
    throw new Error(
      `PHB MinerU dual-engine review is invalid:\n${errors.join("\n")}`,
    );
  }
  writeJsonl(context.reviewPath, reviews);
  const manifest = buildManifest(context, reviews);
  const manifestPath = path.join(
    context.dataRoot,
    PHB_MINERU_DUAL_REVIEW_MANIFEST_RELATIVE_PATH,
  );
  writeJson(manifestPath, manifest);
  const reportPath = path.join(repoRoot(), REPORT_RELATIVE_PATH);
  writeJson(reportPath, {
    schemaVersion: 1,
    sourceId: manifest.source.id,
    pipeline: {
      extractionManifestSha256: manifest.pipeline.extractionManifest.sha256,
      contentListSha256: manifest.pipeline.contentList.sha256,
    },
    vlm: {
      batchManifestSha256: manifest.vlm.batchManifest.sha256,
      version: manifest.vlm.version,
      model: manifest.vlm.model,
    },
    counts: manifest.counts,
    rows: reviews.map((row) => ({
      rowId: row.rowId,
      kind: row.kind,
      sourcePageIndex: row.sourcePageIndex,
      evidenceFingerprintSha256: row.evidenceFingerprintSha256,
      status: row.status,
    })),
  });
  return { manifest, manifestPath, reportPath };
}

export function verifyMineruDualReview(input: {
  dataRoot?: string;
  batchManifestPath: string;
  requireTerminal?: boolean;
  batchReader?: MineruBatchReader;
}) {
  const context = loadDualContext({
    dataRoot: input.dataRoot ?? localDataDir(),
    batchManifestPath: input.batchManifestPath,
    ...(input.requireTerminal === undefined
      ? {}
      : { requireTerminal: input.requireTerminal }),
    ...(input.batchReader ? { batchReader: input.batchReader } : {}),
  });
  if (!fs.existsSync(context.reviewPath)) {
    throw new Error(
      `PHB MinerU dual-engine review not found: ${PHB_MINERU_DUAL_REVIEW_RELATIVE_PATH}`,
    );
  }
  const reviews = readJsonl<MineruDualReview>(
    context.reviewPath,
    "PHB MinerU dual-engine review",
  );
  const errors = validateMineruDualReviews(
    context.candidates,
    reviews,
    input.requireTerminal === undefined
      ? {}
      : { requireTerminal: input.requireTerminal },
  );
  if (errors.length > 0) {
    throw new Error(
      `PHB MinerU dual-engine review is invalid:\n${errors.join("\n")}`,
    );
  }
  const manifestPath = path.join(
    context.dataRoot,
    PHB_MINERU_DUAL_REVIEW_MANIFEST_RELATIVE_PATH,
  );
  const manifest = parseMineruDualReviewManifest(
    readJson(manifestPath, "PHB MinerU dual-engine review manifest"),
  );
  const expected = buildManifest(context, reviews);
  if (JSON.stringify(manifest) !== JSON.stringify(expected)) {
    throw new Error("PHB MinerU dual-engine review manifest is stale");
  }
  return { manifest, manifestPath };
}

export function verifyCurrentMineruDualReview(
  dataRootInput: string,
  requireTerminal = true,
) {
  const dataRoot = path.resolve(dataRootInput);
  const manifestPath = path.join(
    dataRoot,
    PHB_MINERU_DUAL_REVIEW_MANIFEST_RELATIVE_PATH,
  );
  const manifest = parseMineruDualReviewManifest(
    readJson(manifestPath, "PHB MinerU dual-engine review manifest"),
  );
  return verifyMineruDualReview({
    dataRoot,
    batchManifestPath: manifest.vlm.batchManifest.relativePath,
    requireTerminal,
  });
}

function loadDualContext(input: {
  dataRoot: string;
  batchManifestPath: string;
  requireTerminal?: boolean;
  batchReader?: MineruBatchReader;
}) {
  const dataRoot = path.resolve(input.dataRoot);
  const batch = (input.batchReader ?? readAndVerifyMineruBatchRunManifest)(
    dataRoot,
    input.batchManifestPath,
  );
  if (
    batch.manifest.selection.sourcePageStart !== null ||
    batch.manifest.selection.sourcePageEnd !== null
  ) {
    throw new Error(
      "PHB MinerU dual-engine review requires an unbounded full-source batch",
    );
  }
  const extractionManifestPath = path.join(
    dataRoot,
    PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
  );
  const extractionManifest = parseCurrentFullExtractionManifest(
    readJson(extractionManifestPath, "PHB current full extraction manifest"),
  );
  const pipelineSource = extractionManifest.sources.find(
    (source) => source.sourceId === batch.manifest.source.id,
  );
  if (
    !pipelineSource ||
    pipelineSource.sourceArtifactSha256 !== batch.manifest.source.artifactSha256
  ) {
    throw new Error("PHB pipeline/VLM source identity differs");
  }
  const pagesPath = resolveAbsoluteInside(
    dataRoot,
    extractionManifest.output.relativePath,
  );
  verifyFile(pagesPath, extractionManifest.output.sha256, "pipeline pages");
  const contentListPath = resolveAbsoluteInside(
    dataRoot,
    pipelineSource.mineruContentList.relativePath,
  );
  verifyFile(
    contentListPath,
    pipelineSource.mineruContentList.sha256,
    "pipeline content list",
  );
  const allPages = parseFullMineruPageRows(fs.readFileSync(pagesPath, "utf8"));
  const pages = allPages.filter(
    (page) => page.sourceId === batch.manifest.source.id,
  );
  if (
    pages.length !== pipelineSource.pageCount ||
    pages.length !== batch.manifest.pages.length
  ) {
    throw new Error("PHB pipeline/VLM full-source page count differs");
  }
  if (
    pages.some((page, index) => {
      const batchPage = batch.manifest.pages[index];
      return (
        !batchPage ||
        page.sourcePageIndex !== batchPage.sourcePageIndex ||
        page.printedPageNumber !== batchPage.printedPageNumber ||
        !sameStrings(page.rangeKinds, batchPage.rangeKinds)
      );
    })
  ) {
    throw new Error("PHB pipeline/VLM canonical page order differs");
  }
  const layoutReviewPath = path.join(
    dataRoot,
    PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH,
  );
  const layoutReviews = readJsonl<FullMineruLayoutReview>(
    layoutReviewPath,
    "PHB full MinerU layout review",
  );
  const layoutErrors = validateFullMineruLayoutReviews(
    allPages,
    layoutReviews,
    input.requireTerminal ? { requireTerminal: true } : {},
  );
  if (layoutErrors.length > 0) {
    throw new Error(
      `PHB full MinerU layout review is invalid:\n${layoutErrors.join("\n")}`,
    );
  }
  const batchPages = new Map(
    batch.manifest.pages.map((page) => [page.sourcePageIndex, page]),
  );
  const candidateValue = readJson(
    resolveAbsoluteInside(
      dataRoot,
      batch.manifest.output.contentListRelativePath,
    ),
    "MinerU VLM batch content list",
  );
  const candidateBlocks = parseMineruContentList(
    candidateValue,
    batch.manifest.pages.length,
  );
  const vlmBlocksByPage = new Map<
    number,
    Array<ReturnType<typeof toStableMineruBlock>>
  >();
  for (const block of candidateBlocks) {
    const current = vlmBlocksByPage.get(block.page_idx) ?? [];
    current.push(toStableMineruBlock(block));
    vlmBlocksByPage.set(block.page_idx, current);
  }
  const candidatePages = pages.map((page) => {
    if (
      page.sourceArtifactSha256 !== pipelineSource.sourceArtifactSha256 ||
      page.mineru.contentListSha256 !== pipelineSource.mineruContentList.sha256
    ) {
      throw new Error(
        `PHB pipeline page provenance changed: ${page.sourceId}[${page.sourcePageIndex}]`,
      );
    }
    const batchPage = batchPages.get(page.sourcePageIndex);
    if (!batchPage) {
      throw new Error(
        `PHB VLM batch page missing: ${page.sourceId}[${page.sourcePageIndex}]`,
      );
    }
    const vlmBlocks = vlmBlocksByPage.get(batchPage.candidatePageIndex) ?? [];
    if (vlmBlocks.length === 0) {
      throw new Error(
        `MinerU VLM content list has no blocks: ${page.sourceId}[${page.sourcePageIndex}]`,
      );
    }
    const sourcePage = {
      zeroBasedPageIndex: page.sourcePageIndex,
      width: page.pdfjs.width,
      height: page.pdfjs.height,
      textItemCount: page.pdfjs.items.length,
      textCharacterCount: page.pdfjs.items.reduce(
        (sum, item) => sum + item.text.length,
        0,
      ),
      textLayerSha256: page.pdfjs.textLayerSha256,
      items: page.pdfjs.items,
    };
    const auditInput = {
      page: sourcePage,
      printedPageNumber: page.printedPageNumber,
      rangeKinds: page.rangeKinds,
    };
    return {
      page,
      pipelineAudit: auditMineruPageRecall({
        ...auditInput,
        blocks: page.mineru.blocks,
      }),
      vlmAudit: auditMineruPageRecall({
        ...auditInput,
        blocks: vlmBlocks,
      }),
      layoutReviews: layoutReviews.filter(
        (review) =>
          review.sourceId === page.sourceId &&
          review.sourcePageIndex === page.sourcePageIndex,
      ),
    };
  });
  const candidates = buildMineruDualReviewRows({
    sourceId: batch.manifest.source.id,
    sourceArtifactSha256: batch.manifest.source.artifactSha256,
    pipelineContentListSha256: pipelineSource.mineruContentList.sha256,
    vlmBatchManifestSha256: batch.manifestSha256,
    pages: candidatePages,
  });
  return {
    dataRoot,
    batch,
    extractionManifestPath,
    pagesPath,
    contentListPath,
    layoutReviewPath,
    reviewPath: path.join(dataRoot, PHB_MINERU_DUAL_REVIEW_RELATIVE_PATH),
    pages,
    candidates,
    pipelineSource,
  };
}

function buildManifest(
  context: ReturnType<typeof loadDualContext>,
  reviews: MineruDualReview[],
): MineruDualReviewManifest {
  return {
    schemaVersion: 1,
    source: {
      id: context.batch.manifest.source.id,
      artifactSha256: context.batch.manifest.source.artifactSha256,
    },
    pipeline: {
      extractionManifest: fileIdentity(
        context.dataRoot,
        context.extractionManifestPath,
      ),
      pages: fileIdentity(context.dataRoot, context.pagesPath),
      contentList: fileIdentity(context.dataRoot, context.contentListPath),
    },
    vlm: {
      batchManifest: fileIdentity(context.dataRoot, context.batch.manifestPath),
      version: context.batch.manifest.runtime.version,
      model: context.batch.manifest.runtime.model,
    },
    layoutReview: fileIdentity(context.dataRoot, context.layoutReviewPath),
    review: fileIdentity(context.dataRoot, context.reviewPath),
    counts: {
      pages: context.pages.length,
      disagreementRows: reviews.length,
      itemRows: reviews.filter((row) => row.kind === "item-recall-disagreement")
        .length,
      tableRows: reviews.filter(
        (row) => row.kind === "table-structure-disagreement",
      ).length,
      proposed: reviews.filter((row) => row.status === "proposed").length,
      accepted: reviews.filter((row) => row.status === "accepted").length,
      rejected: reviews.filter((row) => row.status === "rejected").length,
    },
  };
}

export function parseMineruDualReviewManifest(
  value: unknown,
): MineruDualReviewManifest {
  const source =
    isRecord(value) && isRecord(value.source) ? value.source : null;
  const pipeline =
    isRecord(value) && isRecord(value.pipeline) ? value.pipeline : null;
  const vlm = isRecord(value) && isRecord(value.vlm) ? value.vlm : null;
  const model = vlm && isRecord(vlm.model) ? vlm.model : null;
  const counts =
    isRecord(value) && isRecord(value.counts) ? value.counts : null;
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !source ||
    typeof source.id !== "string" ||
    !isSha256(source.artifactSha256) ||
    !pipeline ||
    !isFileIdentity(pipeline.extractionManifest) ||
    !isFileIdentity(pipeline.pages) ||
    !isFileIdentity(pipeline.contentList) ||
    !vlm ||
    !isFileIdentity(vlm.batchManifest) ||
    typeof vlm.version !== "string" ||
    !model ||
    typeof model.repository !== "string" ||
    typeof model.revision !== "string" ||
    !isFileIdentity(value.layoutReview) ||
    !isFileIdentity(value.review) ||
    !counts ||
    !isNonNegativeInteger(counts.pages) ||
    !isNonNegativeInteger(counts.disagreementRows) ||
    !isNonNegativeInteger(counts.itemRows) ||
    !isNonNegativeInteger(counts.tableRows) ||
    !isNonNegativeInteger(counts.proposed) ||
    !isNonNegativeInteger(counts.accepted) ||
    !isNonNegativeInteger(counts.rejected) ||
    counts.disagreementRows !== counts.itemRows + counts.tableRows ||
    counts.disagreementRows !==
      counts.proposed + counts.accepted + counts.rejected
  ) {
    throw new Error("PHB MinerU dual-engine review manifest is invalid");
  }
  return value as MineruDualReviewManifest;
}

function parseCurrentFullExtractionManifest(
  value: unknown,
): CurrentFullExtractionManifest {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 2 ||
    !Array.isArray(value.sources) ||
    !isRecord(value.output)
  ) {
    throw new Error("PHB current full extraction manifest is invalid");
  }
  return value as CurrentFullExtractionManifest;
}

function fileIdentity(dataRoot: string, filePath: string): FileIdentity {
  return {
    relativePath: path.relative(dataRoot, filePath).replace(/\\/gu, "/"),
    sha256: sha256File(filePath),
  };
}

function verifyFile(filePath: string, sha256: string, label: string) {
  if (!fs.existsSync(filePath) || sha256File(filePath) !== sha256) {
    throw new Error(`PHB ${label} changed`);
  }
}

function readJsonl<T>(filePath: string, label: string): T[] {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found`);
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/gu)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line) as T;
      } catch (error) {
        throw new Error(
          `${label} row ${index + 1} is invalid: ${String(error)}`,
        );
      }
    });
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

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileIdentity(value: unknown): value is FileIdentity {
  if (!isRecord(value)) return false;
  return isRelativePath(value.relativePath) && isSha256(value.sha256);
}

function isRelativePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.replace(/\\/gu, "/").split("/").includes("..")
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function sameStrings(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
