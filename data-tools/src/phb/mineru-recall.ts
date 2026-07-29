import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { repoRoot } from "../shared/env";
import {
  readPhbFullExtractionManifest,
  type PhbFullExtractionManifest,
  type PhbFullRangeKind,
} from "./full-manifest";
import {
  PHB_FULL_MINERU_INPUT_MANIFEST_RELATIVE_PATH,
  assertCanonicalFullPageMappings,
  isContentBlock,
  isKnownPageFurniture,
  normalizedItemCenter,
  parseFullMineruInputManifest,
  pointInside,
  type FullMineruInputManifest,
} from "./full-mineru";
import { inspectPdfTextLayer, type PhbPdfSourcePage } from "./pdf-baseline";
import {
  blockText,
  compareTokenMultisets,
  parseMineruContentList,
  readJson,
  resolveAbsoluteInside,
  safeId,
  type StableMineruBlock,
  toStableMineruBlock,
} from "./pilot-extraction";
import { readAndVerifyPhbSourceManifest, sha256File } from "./source-manifest";

export type MineruRecallAudit = {
  schemaVersion: 1;
  page: {
    sourcePageIndex: number;
    printedPageNumber: number | null;
    rangeKinds: PhbFullRangeKind[];
    textLayerSha256: string;
  };
  counts: {
    pdfContentItems: number;
    pdfContentCharacters: number;
    mineruBlocks: number;
    mineruContentBlocks: number;
    strictBboxCoveredItems: number;
    strictBboxMissItems: number;
    normalizedTextMatchedItems: number;
    normalizedTextMissItems: number;
  };
  tokenComparison: ReturnType<typeof compareTokenMultisets>;
  strictBboxMisses: MineruRecallMiss[];
  normalizedTextMisses: MineruRecallMiss[];
};

type MineruRecallMiss = {
  itemIndex: number;
  characters: number;
  textSha256: string;
};

export type MineruRecallReport = MineruRecallAudit & {
  provenance: {
    sourceId: string;
    sourceArtifactSha256: string;
    inputManifest: {
      relativePath: string;
      bytes: number;
      sha256: string;
    };
    subsetArtifactSha256: string;
    subsetPageIndex: number;
    sourcePageFingerprintSha256: string;
    subsetPageFingerprintSha256: string;
  };
  candidate: {
    label: string;
    backend: string;
    method: string;
    relativePath: string;
    bytes: number;
    sha256: string;
    pageIndex: number;
  };
};

export async function runMineruPageRecall(input: {
  dataRoot: string;
  label: string;
  sourceId: string;
  sourcePageIndex: number;
  candidatePageIndex: number;
  candidatePath: string;
  backend: string;
  method: string;
}) {
  const source = readAndVerifyPhbSourceManifest(input.dataRoot);
  const sourceArtifact = source.artifacts.find(
    (artifact) => artifact.id === input.sourceId,
  );
  if (!sourceArtifact) {
    throw new Error(`Unknown PHB source id: ${input.sourceId}`);
  }

  const candidatePath = resolveAbsoluteInside(
    input.dataRoot,
    input.candidatePath,
  );
  const candidateValue = readJson(
    candidatePath,
    `${input.label} MinerU content list`,
  );
  if (!Array.isArray(candidateValue) || candidateValue.length === 0) {
    throw new Error(
      `${input.label} MinerU content list must be a non-empty array`,
    );
  }
  const candidatePageCount =
    Math.max(
      ...candidateValue.map((row) =>
        row &&
        typeof row === "object" &&
        Number.isInteger((row as { page_idx?: unknown }).page_idx)
          ? Number((row as { page_idx: number }).page_idx)
          : -1,
      ),
    ) + 1;
  if (candidatePageCount <= 0) {
    throw new Error(
      `${input.label} MinerU content list has no non-negative page_idx values`,
    );
  }
  const blocks = parseMineruContentList(candidateValue, candidatePageCount)
    .filter((block) => block.page_idx === input.candidatePageIndex)
    .map(toStableMineruBlock);
  if (blocks.length === 0) {
    throw new Error(
      `${input.label} MinerU content list has no page ${input.candidatePageIndex}`,
    );
  }

  const { sourcePages } = await inspectPdfTextLayer(
    sourceArtifact.path,
    new Set([input.sourcePageIndex]),
  );
  const page = sourcePages[0];
  if (!page || page.zeroBasedPageIndex !== input.sourcePageIndex) {
    throw new Error(
      `PDF.js page not found: ${input.sourceId}[${input.sourcePageIndex}]`,
    );
  }
  const mapping = await readFullInputPageMapping({
    dataRoot: input.dataRoot,
    sourceId: input.sourceId,
    sourcePageIndex: input.sourcePageIndex,
    sourceManifestSha256: source.manifestSha256,
    sourceArtifactSha256: sourceArtifact.sha256,
    sourcePage: page,
  });
  const audit = auditMineruPageRecall({
    page,
    printedPageNumber: mapping.printedPageNumber,
    rangeKinds: mapping.rangeKinds,
    blocks,
  });
  const report: MineruRecallReport = {
    ...audit,
    provenance: {
      sourceId: input.sourceId,
      sourceArtifactSha256: sourceArtifact.sha256,
      inputManifest: mapping.inputManifest,
      subsetArtifactSha256: mapping.subsetArtifactSha256,
      subsetPageIndex: mapping.subsetPageIndex,
      sourcePageFingerprintSha256: mapping.sourcePageFingerprintSha256,
      subsetPageFingerprintSha256: mapping.subsetPageFingerprintSha256,
    },
    candidate: {
      label: input.label,
      backend: input.backend,
      method: input.method,
      relativePath: path
        .relative(input.dataRoot, candidatePath)
        .replace(/\\/gu, "/"),
      bytes: fs.statSync(candidatePath).size,
      sha256: sha256File(candidatePath),
      pageIndex: input.candidatePageIndex,
    },
  };
  const reportPath = path.join(
    repoRoot(),
    "data-tools",
    "out",
    "phb",
    `mineru-recall-${safeId(input.label)}.generated.json`,
  );
  writeJson(reportPath, report);
  return { report, reportPath };
}

export function auditMineruPageRecall(input: {
  page: PhbPdfSourcePage;
  printedPageNumber: number | null;
  rangeKinds: PhbFullRangeKind[];
  blocks: StableMineruBlock[];
}): MineruRecallAudit {
  const pageMetadata = {
    printedPageNumber: input.printedPageNumber,
    rangeKinds: input.rangeKinds,
  };
  const pdfItems = input.page.items
    .map((item, itemIndex) => ({ item, itemIndex }))
    .filter(
      ({ item }) =>
        item.text.trim().length > 0 &&
        !isKnownPageFurniture(pageMetadata, item.text),
    );
  const contentBlocks = input.blocks.filter(isContentBlock);
  const mineruText = contentBlocks.map(blockText).join(" ");
  const normalizedMineruText = normalizeRecallText(mineruText);
  const strictBboxMisses = pdfItems
    .filter(({ item }) => {
      const center = normalizedItemCenter(
        {
          pdfjs: {
            width: input.page.width,
            height: input.page.height,
          },
        },
        item,
      );
      return !contentBlocks.some(
        (block) => block.bbox !== null && pointInside(center, block.bbox, 0),
      );
    })
    .map(({ item, itemIndex }) => recallMiss(item.text, itemIndex));
  const normalizedTextMisses = pdfItems
    .filter(({ item }, itemPosition) => {
      const normalized = normalizeRecallText(item.text);
      if (
        normalized.length === 0 ||
        normalizedMineruText.includes(normalized)
      ) {
        return false;
      }
      const nextItem = pdfItems[itemPosition + 1]?.item;
      if (!nextItem || !/-\s*$/u.test(item.text)) return true;
      const dehyphenated = normalizeRecallText(
        `${item.text.replace(/-\s*$/u, "")}${nextItem.text.trimStart()}`,
      );
      return !normalizedMineruText.includes(dehyphenated);
    })
    .map(({ item, itemIndex }) => recallMiss(item.text, itemIndex));
  const pdfText = joinPdfItemsForRecall(pdfItems.map(({ item }) => item.text));

  return {
    schemaVersion: 1,
    page: {
      sourcePageIndex: input.page.zeroBasedPageIndex,
      printedPageNumber: input.printedPageNumber,
      rangeKinds: [...input.rangeKinds].sort(),
      textLayerSha256: input.page.textLayerSha256,
    },
    counts: {
      pdfContentItems: pdfItems.length,
      pdfContentCharacters: pdfItems.reduce(
        (sum, { item }) => sum + item.text.length,
        0,
      ),
      mineruBlocks: input.blocks.length,
      mineruContentBlocks: contentBlocks.length,
      strictBboxCoveredItems: pdfItems.length - strictBboxMisses.length,
      strictBboxMissItems: strictBboxMisses.length,
      normalizedTextMatchedItems: pdfItems.length - normalizedTextMisses.length,
      normalizedTextMissItems: normalizedTextMisses.length,
    },
    tokenComparison: compareTokenMultisets(pdfText, mineruText),
    strictBboxMisses,
    normalizedTextMisses,
  };
}

function recallMiss(text: string, itemIndex: number): MineruRecallMiss {
  return {
    itemIndex,
    characters: text.length,
    textSha256: crypto.createHash("sha256").update(text).digest("hex"),
  };
}

function normalizeRecallText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/[\u2013\u2014\u2212]/gu, "-")
    .replace(/[^\p{L}\p{N}+'/-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function joinPdfItemsForRecall(items: string[]) {
  return items.reduce(
    (text, item) =>
      /-\s*$/u.test(text)
        ? `${text.replace(/-\s*$/u, "")}${item.trimStart()}`
        : `${text}${text ? " " : ""}${item}`,
    "",
  );
}

async function readFullInputPageMapping(input: {
  dataRoot: string;
  sourceId: string;
  sourcePageIndex: number;
  sourceManifestSha256: string;
  sourceArtifactSha256: string;
  sourcePage: PhbPdfSourcePage;
}) {
  const { filePath: fullManifestPath, manifest: fullManifest } =
    readPhbFullExtractionManifest(input.dataRoot);
  const inputManifestPath = path.join(
    input.dataRoot,
    PHB_FULL_MINERU_INPUT_MANIFEST_RELATIVE_PATH,
  );
  const manifest = parseFullMineruInputManifest(
    readJson(inputManifestPath, "PHB full MinerU input manifest"),
  );
  return verifyMineruRecallInputProvenance({
    dataRoot: input.dataRoot,
    inputManifestPath,
    manifest,
    sourceId: input.sourceId,
    sourcePageIndex: input.sourcePageIndex,
    sourceManifestSha256: input.sourceManifestSha256,
    sourceArtifactSha256: input.sourceArtifactSha256,
    fullManifestPath,
    fullManifest,
    sourcePage: input.sourcePage,
  });
}

export async function verifyMineruRecallInputProvenance(input: {
  dataRoot: string;
  inputManifestPath: string;
  manifest: FullMineruInputManifest;
  sourceId: string;
  sourcePageIndex: number;
  sourceManifestSha256: string;
  sourceArtifactSha256: string;
  fullManifestPath: string;
  fullManifest: PhbFullExtractionManifest;
  sourcePage: PhbPdfSourcePage;
}) {
  const manifest = input.manifest;
  if (manifest.sourceManifest?.sha256 !== input.sourceManifestSha256) {
    throw new Error(
      "Full MinerU input does not pin the current source manifest",
    );
  }
  if (manifest.fullManifest.sha256 !== sha256File(input.fullManifestPath)) {
    throw new Error(
      "Full MinerU input does not pin the current full extraction manifest",
    );
  }
  const artifact = manifest.artifacts.find(
    (candidate) => candidate.sourceId === input.sourceId,
  );
  if (!artifact || artifact.sourceSha256 !== input.sourceArtifactSha256) {
    throw new Error(`Full MinerU input source changed: ${input.sourceId}`);
  }
  const sourceConfig = input.fullManifest.sources.find(
    (candidate) => candidate.sourceId === input.sourceId,
  );
  if (!sourceConfig) {
    throw new Error(
      `Full extraction manifest has no source: ${input.sourceId}`,
    );
  }
  assertCanonicalFullPageMappings(
    artifact.pages,
    sourceConfig.ranges,
    input.sourceId,
  );
  const subsetPath = resolveAbsoluteInside(
    input.dataRoot,
    artifact.relativePath,
  );
  if (
    !fs.existsSync(subsetPath) ||
    fs.statSync(subsetPath).size !== artifact.bytes ||
    sha256File(subsetPath) !== artifact.sha256
  ) {
    throw new Error(`Full MinerU input bytes changed: ${input.sourceId}`);
  }
  const mapping = artifact.pages.find(
    (page) => page.sourcePageIndex === input.sourcePageIndex,
  );
  if (!mapping) {
    throw new Error(
      `Full MinerU page mapping not found: ${input.sourceId}[${input.sourcePageIndex}]`,
    );
  }
  const { baseline: subsetBaseline, sourcePages: subsetPages } =
    await inspectPdfTextLayer(subsetPath, new Set([mapping.subsetPageIndex]));
  if (subsetBaseline.pageCount !== artifact.pages.length) {
    throw new Error(
      `Full MinerU subset page count changed: ${artifact.pages.length} -> ${subsetBaseline.pageCount}`,
    );
  }
  const subsetPage = subsetPages[0];
  const sourcePageFingerprintSha256 = recallPageFingerprint(input.sourcePage);
  const subsetPageFingerprintSha256 = subsetPage
    ? recallPageFingerprint(subsetPage)
    : "missing";
  if (
    !subsetPage ||
    subsetPage.zeroBasedPageIndex !== mapping.subsetPageIndex ||
    subsetPageFingerprintSha256 !== sourcePageFingerprintSha256
  ) {
    throw new Error(
      `Full MinerU subset page mapping changed: ${input.sourceId}[${input.sourcePageIndex}] ` +
        `(expected ${sourcePageFingerprintSha256}, found ${subsetPageFingerprintSha256})`,
    );
  }
  return {
    inputManifest: {
      relativePath: path
        .relative(input.dataRoot, input.inputManifestPath)
        .replace(/\\/gu, "/"),
      bytes: fs.statSync(input.inputManifestPath).size,
      sha256: sha256File(input.inputManifestPath),
    },
    subsetArtifactSha256: artifact.sha256,
    subsetPageIndex: mapping.subsetPageIndex,
    sourcePageFingerprintSha256,
    subsetPageFingerprintSha256,
    printedPageNumber: mapping.printedPageNumber ?? null,
    rangeKinds: mapping.rangeKinds,
  };
}

export function recallPageFingerprint(page: PhbPdfSourcePage) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        width: page.width,
        height: page.height,
        items: page.items.map((item) => ({
          text: item.text,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          hasEol: item.hasEol,
        })),
      }),
    )
    .digest("hex");
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
