import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { inspectPdfTextLayer } from "./pdf-baseline";
import type { PhbSourceManifest } from "./source-manifest";
import { resolveInside, sha256File } from "./source-manifest";

export const PHB_PILOT_INPUT_MANIFEST_RELATIVE_PATH =
  "phb35/extracted/pilot/input-manifest.json";
export const PHB_MINERU_RUNTIME_RELATIVE_PATH =
  "phb35/source/mineru-runtime.json";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

type PilotPageMapping = {
  subsetPageIndex: number;
  sourcePageIndex: number;
  printedPageNumber: number | null;
  caseIds: string[];
  kinds: string[];
};

type PilotInputArtifact = {
  sourceId: string;
  sourceSha256: string;
  relativePath: string;
  bytes: number;
  sha256: string;
  pages: PilotPageMapping[];
};

type PilotInputManifest = {
  schemaVersion: 1;
  sourceManifest: { relativePath: string; sha256: string };
  pilotManifest: { relativePath: string; sha256: string; status: string };
  artifacts: PilotInputArtifact[];
};

type MineruRuntimeManifest = {
  schemaVersion: 1;
  engine: "MinerU";
  version: string;
  backend: "pipeline";
  method: "txt";
  pythonVersion: string;
  model: { repository: string; revision: string };
  dependencies: Record<string, string>;
  options: Record<string, boolean | number | string>;
};

type MineruBlock = {
  type: string;
  page_idx: number;
  bbox?: unknown;
  text?: unknown;
  text_level?: unknown;
  table_body?: unknown;
  table_caption?: unknown;
  table_footnote?: unknown;
  image_caption?: unknown;
  image_footnote?: unknown;
  img_path?: unknown;
};

type StableMineruBlock = {
  type: string;
  bbox: [number, number, number, number] | null;
  text: string | null;
  textLevel: number | null;
  tableHtml: string | null;
  captions: string[];
  footnotes: string[];
  assetPath: string | null;
  textOrigin: "text-layer" | "ocr-risk" | "none";
};

export async function importMineruPilot(input: {
  dataRoot: string;
  mineruOutputRoot: string;
  sourceManifest: PhbSourceManifest;
  sourceManifestSha256: string;
}) {
  const dataRoot = path.resolve(input.dataRoot);
  const mineruOutputRoot = resolveAbsoluteInside(
    dataRoot,
    input.mineruOutputRoot,
  );
  const inputManifestPath = resolveInside(
    dataRoot,
    PHB_PILOT_INPUT_MANIFEST_RELATIVE_PATH,
  );
  const runtimePath = resolveInside(dataRoot, PHB_MINERU_RUNTIME_RELATIVE_PATH);
  const inputManifest = parseInputManifest(
    readJson(inputManifestPath, "PHB pilot input manifest"),
  );
  const runtime = parseRuntimeManifest(
    readJson(runtimePath, "PHB MinerU runtime manifest"),
  );
  if (inputManifest.sourceManifest.sha256 !== input.sourceManifestSha256) {
    throw new Error(
      "Pilot input manifest does not pin the current source manifest",
    );
  }

  const outputDir = resolveInside(dataRoot, "phb35/extracted/pilot");
  const pageRows: unknown[] = [];
  const artifactReports = [];

  for (const artifact of inputManifest.artifacts) {
    const source = input.sourceManifest.artifacts.find(
      (candidate) => candidate.id === artifact.sourceId,
    );
    if (!source) {
      throw new Error(
        `Pilot input references unknown source: ${artifact.sourceId}`,
      );
    }
    if (source.sha256 !== artifact.sourceSha256) {
      throw new Error(`Pilot input source hash changed: ${artifact.sourceId}`);
    }
    const subsetPath = resolveInside(dataRoot, artifact.relativePath);
    verifyFileIdentity(subsetPath, artifact.bytes, artifact.sha256);

    const stem = `${safeId(artifact.sourceId)}.pilot`;
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
        toStableMineruBlock,
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
        subsetArtifactSha256: artifact.sha256,
        subsetPageIndex: mapping.subsetPageIndex,
        sourcePageIndex: mapping.sourcePageIndex,
        printedPageNumber: mapping.printedPageNumber,
        caseIds: mapping.caseIds,
        kinds: mapping.kinds,
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
      mineruContentListSha256: sha256File(contentListPath),
      pageCount: artifact.pages.length,
      blockCount: blocks.length,
      tableBlockCount,
      pdfTokenCount,
      mineruTokenCount,
      sharedTokenCount,
      tokenRecall: ratio(sharedTokenCount, pdfTokenCount),
      tokenPrecision: ratio(sharedTokenCount, mineruTokenCount),
    });
  }

  pageRows.sort((left, right) => {
    const leftRow = left as { sourceId: string; subsetPageIndex: number };
    const rightRow = right as { sourceId: string; subsetPageIndex: number };
    return (
      leftRow.sourceId.localeCompare(rightRow.sourceId) ||
      leftRow.subsetPageIndex - rightRow.subsetPageIndex
    );
  });
  const pagesPath = path.join(outputDir, "pages.jsonl");
  writeJsonl(pagesPath, pageRows);
  const extractionManifest = {
    schemaVersion: 1,
    sourceManifest: inputManifest.sourceManifest,
    pilotManifest: inputManifest.pilotManifest,
    inputManifest: {
      relativePath: PHB_PILOT_INPUT_MANIFEST_RELATIVE_PATH,
      sha256: sha256File(inputManifestPath),
    },
    runtime: {
      relativePath: PHB_MINERU_RUNTIME_RELATIVE_PATH,
      sha256: sha256File(runtimePath),
      engine: runtime.engine,
      version: runtime.version,
      backend: runtime.backend,
      method: runtime.method,
    },
    output: {
      relativePath: "phb35/extracted/pilot/pages.jsonl",
      sha256: sha256File(pagesPath),
      rowCount: pageRows.length,
    },
    artifacts: artifactReports,
  };
  const extractionManifestPath = path.join(
    outputDir,
    "extraction-manifest.json",
  );
  writeJson(extractionManifestPath, extractionManifest);
  return { extractionManifestPath, pagesPath, report: extractionManifest };
}

export function compareTokenMultisets(pdfText: string, mineruText: string) {
  const pdf = countTokens(pdfText);
  const mineru = countTokens(mineruText);
  let sharedTokenCount = 0;
  for (const [token, count] of pdf) {
    sharedTokenCount += Math.min(count, mineru.get(token) ?? 0);
  }
  const pdfTokenCount = sumCounts(pdf);
  const mineruTokenCount = sumCounts(mineru);
  return {
    pdfTokenCount,
    mineruTokenCount,
    sharedTokenCount,
    tokenRecall: ratio(sharedTokenCount, pdfTokenCount),
    tokenPrecision: ratio(sharedTokenCount, mineruTokenCount),
  };
}

function parseInputManifest(value: unknown): PilotInputManifest {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error("PHB pilot input manifest must use schemaVersion 1");
  }
  if (!isRecord(value.sourceManifest) || !isRecord(value.pilotManifest)) {
    throw new Error("PHB pilot input manifest is missing manifest provenance");
  }
  if (
    typeof value.sourceManifest.relativePath !== "string" ||
    typeof value.sourceManifest.sha256 !== "string" ||
    !SHA256_PATTERN.test(value.sourceManifest.sha256) ||
    typeof value.pilotManifest.relativePath !== "string" ||
    typeof value.pilotManifest.sha256 !== "string" ||
    !SHA256_PATTERN.test(value.pilotManifest.sha256) ||
    typeof value.pilotManifest.status !== "string"
  ) {
    throw new Error("PHB pilot input manifest provenance is invalid");
  }
  if (!Array.isArray(value.artifacts) || value.artifacts.length !== 2) {
    throw new Error("PHB pilot input manifest must contain two artifacts");
  }
  const sourceIds = new Set<string>();
  for (const artifact of value.artifacts) {
    if (
      !isRecord(artifact) ||
      typeof artifact.sourceId !== "string" ||
      typeof artifact.sourceSha256 !== "string" ||
      !SHA256_PATTERN.test(artifact.sourceSha256) ||
      typeof artifact.relativePath !== "string" ||
      !Number.isInteger(artifact.bytes) ||
      (artifact.bytes as number) <= 0 ||
      typeof artifact.sha256 !== "string" ||
      !SHA256_PATTERN.test(artifact.sha256) ||
      !Array.isArray(artifact.pages)
    ) {
      throw new Error("PHB pilot input artifact is invalid");
    }
    if (sourceIds.has(artifact.sourceId)) {
      throw new Error(
        `PHB pilot input sourceId is duplicated: ${artifact.sourceId}`,
      );
    }
    sourceIds.add(artifact.sourceId);
    if (artifact.pages.length === 0) {
      throw new Error(`PHB pilot input has no pages: ${artifact.sourceId}`);
    }
    artifact.pages.forEach((page, index) => {
      if (
        !isRecord(page) ||
        page.subsetPageIndex !== index ||
        !Number.isInteger(page.sourcePageIndex) ||
        (page.sourcePageIndex as number) < 0 ||
        (page.printedPageNumber !== null &&
          (!Number.isInteger(page.printedPageNumber) ||
            (page.printedPageNumber as number) <= 0)) ||
        !isStringArray(page.caseIds) ||
        page.caseIds.length === 0 ||
        !isStringArray(page.kinds) ||
        page.kinds.length === 0
      ) {
        throw new Error(
          `PHB pilot input page ${artifact.sourceId}[${index}] is invalid`,
        );
      }
    });
  }
  return value as PilotInputManifest;
}

function parseRuntimeManifest(value: unknown): MineruRuntimeManifest {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.engine !== "MinerU" ||
    typeof value.version !== "string" ||
    value.backend !== "pipeline" ||
    value.method !== "txt" ||
    typeof value.pythonVersion !== "string" ||
    !isRecord(value.model) ||
    typeof value.model.repository !== "string" ||
    typeof value.model.revision !== "string" ||
    !isRecord(value.dependencies) ||
    !isRecord(value.options)
  ) {
    throw new Error("PHB MinerU runtime manifest is invalid");
  }
  return value as MineruRuntimeManifest;
}

function parseMineruContentList(value: unknown, pageCount: number) {
  if (!Array.isArray(value))
    throw new Error("MinerU content list must be an array");
  return value.map((entry, index) => {
    if (
      !isRecord(entry) ||
      typeof entry.type !== "string" ||
      !Number.isInteger(entry.page_idx) ||
      (entry.page_idx as number) < 0 ||
      (entry.page_idx as number) >= pageCount
    ) {
      throw new Error(`MinerU content list entry ${index} is invalid`);
    }
    return entry as MineruBlock;
  });
}

function groupBlocksByPage(blocks: MineruBlock[], pageCount: number) {
  const pages = Array.from({ length: pageCount }, () => [] as MineruBlock[]);
  for (const block of blocks) pages[block.page_idx]?.push(block);
  return pages;
}

function toStableMineruBlock(block: MineruBlock): StableMineruBlock {
  const captions = strings(
    block.type === "table" ? block.table_caption : block.image_caption,
  );
  const footnotes = strings(
    block.type === "table" ? block.table_footnote : block.image_footnote,
  );
  return {
    type: block.type,
    bbox: bbox(block.bbox),
    text: typeof block.text === "string" ? block.text : null,
    textLevel: Number.isInteger(block.text_level)
      ? (block.text_level as number)
      : null,
    tableHtml: typeof block.table_body === "string" ? block.table_body : null,
    captions,
    footnotes,
    assetPath: typeof block.img_path === "string" ? block.img_path : null,
    textOrigin:
      block.type === "table"
        ? "ocr-risk"
        : typeof block.text === "string"
          ? "text-layer"
          : "none",
  };
}

function blockText(block: StableMineruBlock) {
  return [
    block.text ?? "",
    stripHtml(block.tableHtml ?? ""),
    ...block.captions,
    ...block.footnotes,
  ].join(" ");
}

function countTokens(value: string) {
  const counts = new Map<string, number>();
  const normalized = value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u2018\u2019]/g, "'");
  for (const token of normalized.match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ??
    []) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

function sumCounts(counts: Map<string, number>) {
  let total = 0;
  for (const count of counts.values()) total += count;
  return total;
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0
    ? 1
    : Math.round((numerator / denominator) * 1_000_000) / 1_000_000;
}

function bbox(value: unknown): [number, number, number, number] | null {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    !value.every((part) => typeof part === "number" && Number.isFinite(part))
  ) {
    return null;
  }
  return value as [number, number, number, number];
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
}

function safeId(value: string) {
  return value.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function verifyFileIdentity(filePath: string, bytes: number, sha256: string) {
  const actualBytes = fs.statSync(filePath).size;
  const actualSha256 = sha256File(filePath);
  if (actualBytes !== bytes || actualSha256 !== sha256) {
    throw new Error(`Pilot subset identity changed: ${filePath}`);
  }
}

function resolveAbsoluteInside(root: string, candidate: string) {
  const resolved = path.resolve(root, candidate);
  const relative = path.relative(root, resolved);
  if (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  ) {
    return resolved;
  }
  throw new Error(`Path escapes local data root: ${candidate}`);
}

function readJson(filePath: string, label: string) {
  if (!fs.existsSync(filePath))
    throw new Error(`${label} not found: ${filePath}`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      `${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" && entry.trim().length > 0)
  );
}
