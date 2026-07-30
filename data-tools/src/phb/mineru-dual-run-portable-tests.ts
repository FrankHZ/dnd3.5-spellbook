import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
  PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH,
  buildFullMineruLayoutReviewCandidates,
  type FullMineruBlock,
  type FullMineruLayoutReview,
  type FullMineruPageRow,
} from "./full-mineru";
import {
  PHB_MINERU_DUAL_REVIEW_MANIFEST_RELATIVE_PATH,
  PHB_MINERU_DUAL_REVIEW_RELATIVE_PATH,
  buildMineruDualReviewRows,
} from "./mineru-dual-review";
import {
  parseMineruDualReviewManifest,
  verifyMineruDualReview,
} from "./mineru-dual-run";
import { auditMineruPageRecall } from "./mineru-recall";
import { compareTokenMultisets, toStableMineruBlock } from "./pilot-extraction";
import { sha256File } from "./source-manifest";

const SHA = "a".repeat(64);
const artifact = (relativePath: string) => ({
  relativePath,
  sha256: SHA,
});
const valid = {
  schemaVersion: 1,
  source: {
    id: "phb35-core",
    artifactSha256: SHA,
  },
  pipeline: {
    extractionManifest: artifact(
      "phb35/extracted/full/extraction-manifest.json",
    ),
    pages: artifact("phb35/extracted/full/pages.jsonl"),
    contentList: artifact(
      "artifacts/mineru/phb35/full-output/content-list.json",
    ),
  },
  vlm: {
    batchManifest: artifact(
      "artifacts/mineru/phb35/recall-full/full/run-manifest.json",
    ),
    version: "3.4.4",
    model: {
      repository: "opendatalab/MinerU2.5-Pro-2605-1.2B",
      revision: "revision",
    },
  },
  layoutReview: artifact("phb35/review/full-mineru-layout-review.jsonl"),
  review: artifact("phb35/review/full-mineru-dual-engine-review.jsonl"),
  counts: {
    pages: 123,
    disagreementRows: 4,
    itemRows: 3,
    tableRows: 1,
    proposed: 1,
    accepted: 3,
    rejected: 0,
  },
};

assert.equal(parseMineruDualReviewManifest(valid).counts.pages, 123);
assert.throws(
  () =>
    parseMineruDualReviewManifest({
      ...valid,
      vlm: {
        ...valid.vlm,
        batchManifest: artifact("../escaped/run-manifest.json"),
      },
    }),
  /manifest is invalid/u,
);
assert.throws(
  () =>
    parseMineruDualReviewManifest({
      ...valid,
      counts: { ...valid.counts, disagreementRows: 5 },
    }),
  /manifest is invalid/u,
);
assert.throws(
  () =>
    parseMineruDualReviewManifest({
      ...valid,
      review: { ...valid.review, sha256: "not-a-hash" },
    }),
  /manifest is invalid/u,
);

const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "phb-dual-run-"));
try {
  const pipelineContentListPath =
    "artifacts/mineru/phb35/full-output/content-list.json";
  const vlmContentListPath =
    "artifacts/mineru/phb35/recall-full/test/content-list.json";
  const batchManifestPath =
    "artifacts/mineru/phb35/recall-full/test/run-manifest.json";
  const pagesPath = "phb35/extracted/full/pages.jsonl";
  write(pipelineContentListPath, "[]\n");
  const page = fixturePage(sha256File(resolve(pipelineContentListPath)));
  writeJsonl(pagesPath, [page]);
  const layoutReviews = buildFullMineruLayoutReviewCandidates([page]);
  assert.equal(layoutReviews.length, 1);
  assert.equal(layoutReviews[0]?.status, "proposed");
  writeJsonl(PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH, layoutReviews);

  const vlmRawBlocks = [
    {
      page_idx: 0,
      type: "text",
      bbox: [0, 0, 1000, 1000],
      text: "Near block edge",
    },
  ];
  writeJson(vlmContentListPath, vlmRawBlocks);
  writeJson(batchManifestPath, { fixture: true });

  const extractionManifest = {
    schemaVersion: 2,
    sources: [
      {
        sourceId: "phb35-core",
        sourceArtifactSha256: SHA,
        mineruContentList: fileIdentity(pipelineContentListPath),
        pageCount: 1,
      },
    ],
    output: fileIdentity(pagesPath),
  };
  writeJson(PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH, extractionManifest);

  const auditInput = {
    page: {
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
    },
    printedPageNumber: page.printedPageNumber,
    rangeKinds: page.rangeKinds,
  };
  const batchManifestSha256 = sha256File(resolve(batchManifestPath));
  const makeCandidates = (currentLayoutReviews: FullMineruLayoutReview[]) =>
    buildMineruDualReviewRows({
      sourceId: "phb35-core",
      sourceArtifactSha256: SHA,
      pipelineContentListSha256: page.mineru.contentListSha256,
      vlmBatchManifestSha256: batchManifestSha256,
      pages: [
        {
          page,
          pipelineAudit: auditMineruPageRecall({
            ...auditInput,
            blocks: page.mineru.blocks,
          }),
          vlmAudit: auditMineruPageRecall({
            ...auditInput,
            blocks: vlmRawBlocks.map((block) => toStableMineruBlock(block)),
          }),
          layoutReviews: currentLayoutReviews,
        },
      ],
    });
  const candidates = makeCandidates(layoutReviews);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.status, "proposed");
  writeJsonl(PHB_MINERU_DUAL_REVIEW_RELATIVE_PATH, candidates);
  writeDualManifest({
    batchManifestPath,
    pagesPath,
    pipelineContentListPath,
    proposed: 1,
    accepted: 0,
  });

  const batchResult = fixtureBatchResult({
    batchManifestPath,
    batchManifestSha256,
    vlmContentListPath,
  });
  const batchReader = (() => batchResult) as never;
  assert.doesNotThrow(() =>
    verifyMineruDualReview({
      dataRoot,
      batchManifestPath,
      batchReader,
      requireTerminal: false,
    }),
  );
  assert.throws(
    () =>
      verifyMineruDualReview({
        dataRoot,
        batchManifestPath,
        batchReader,
        requireTerminal: true,
      }),
    /still proposed/u,
  );

  const accepted = candidates.map((row) => ({
    ...row,
    status: "accepted" as const,
    reviewer: "portable-test",
    decisionNote: "Source review confirms the pipeline projection.",
  }));
  writeJsonl(PHB_MINERU_DUAL_REVIEW_RELATIVE_PATH, accepted);
  writeDualManifest({
    batchManifestPath,
    pagesPath,
    pipelineContentListPath,
    proposed: 0,
    accepted: 1,
  });
  assert.throws(
    () =>
      verifyMineruDualReview({
        dataRoot,
        batchManifestPath,
        batchReader,
        requireTerminal: true,
      }),
    /layout review is invalid.*still proposed/su,
  );
  const acceptedLayoutReviews = layoutReviews.map((row) => ({
    ...row,
    status: "accepted" as const,
    reviewer: "portable-test",
    decisionNote: "Source review confirms the pipeline projection.",
  }));
  writeJsonl(PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH, acceptedLayoutReviews);
  const terminalCandidates = makeCandidates(acceptedLayoutReviews);
  assert.equal(terminalCandidates[0]?.status, "accepted");
  writeJsonl(PHB_MINERU_DUAL_REVIEW_RELATIVE_PATH, terminalCandidates);
  writeDualManifest({
    batchManifestPath,
    pagesPath,
    pipelineContentListPath,
    proposed: 0,
    accepted: 1,
  });
  assert.doesNotThrow(() =>
    verifyMineruDualReview({
      dataRoot,
      batchManifestPath,
      batchReader,
      requireTerminal: true,
    }),
  );

  write(pagesPath, `${JSON.stringify(page)}\nchanged\n`);
  assert.throws(
    () =>
      verifyMineruDualReview({
        dataRoot,
        batchManifestPath,
        batchReader,
      }),
    /pipeline pages changed/u,
  );
  writeJsonl(pagesPath, [page]);

  const staleLayoutReviews = structuredClone(acceptedLayoutReviews);
  if (staleLayoutReviews[0]?.kind === "outside-bbox-projection") {
    staleLayoutReviews[0].pdfItem.text = "Changed layout evidence";
  }
  writeJsonl(PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH, staleLayoutReviews);
  assert.throws(
    () =>
      verifyMineruDualReview({
        dataRoot,
        batchManifestPath,
        batchReader,
      }),
    /layout review is invalid/u,
  );
  writeJsonl(PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH, acceptedLayoutReviews);

  writeJson(vlmContentListPath, []);
  assert.throws(
    () =>
      verifyMineruDualReview({
        dataRoot,
        batchManifestPath,
        batchReader,
      }),
    /has no blocks/u,
  );
  writeJson(vlmContentListPath, vlmRawBlocks);

  const reorderedBatchReader = (() => ({
    ...batchResult,
    manifest: {
      ...batchResult.manifest,
      pages: [
        {
          ...batchResult.manifest.pages[0],
          sourcePageIndex: page.sourcePageIndex + 1,
        },
      ],
    },
  })) as never;
  assert.throws(
    () =>
      verifyMineruDualReview({
        dataRoot,
        batchManifestPath,
        batchReader: reorderedBatchReader,
      }),
    /canonical page order differs/u,
  );
} finally {
  fs.rmSync(dataRoot, { recursive: true, force: true });
}

console.log("PHB MinerU dual-run portable tests passed");

function fixturePage(contentListSha256: string): FullMineruPageRow {
  const items = [
    {
      text: "Near block edge",
      x: 153,
      y: 700,
      width: 75,
      height: 10,
      fontName: "fixture",
      hasEol: true,
    },
  ];
  const blocks: FullMineruBlock[] = [
    {
      blockIndex: 0,
      type: "text",
      bbox: [50, 90, 300, 140],
      text: "Near block edge",
      textLevel: null,
      tableHtml: null,
      listItems: [],
      captions: [],
      footnotes: [],
      assetPath: null,
      textOrigin: "text-layer",
    },
  ];
  return {
    schemaVersion: 1,
    sourceId: "phb35-core",
    sourceArtifactSha256: SHA,
    sourcePageIndex: 200,
    printedPageNumber: 200,
    rangeKinds: ["description"],
    pdfjs: {
      extractor: { name: "pdfjs-dist", version: "fixture" },
      width: 612,
      height: 792,
      textLayerSha256: "b".repeat(64),
      items,
    },
    mineru: {
      engine: "MinerU",
      version: "fixture",
      contentListSha256,
      blocks,
    },
    comparison: compareTokenMultisets(
      items.map((item) => item.text).join(" "),
      blocks.map((block) => block.text ?? "").join(" "),
    ),
  };
}

function fixtureBatchResult(input: {
  batchManifestPath: string;
  batchManifestSha256: string;
  vlmContentListPath: string;
}) {
  return {
    manifest: {
      selection: {
        sourcePageStart: null,
        sourcePageEnd: null,
      },
      source: {
        id: "phb35-core",
        artifactSha256: SHA,
      },
      pages: [
        {
          sourcePageIndex: 200,
          printedPageNumber: 200,
          subsetPageIndex: 0,
          candidatePageIndex: 0,
          rangeKinds: ["description"],
        },
      ],
      output: {
        contentListRelativePath: input.vlmContentListPath,
      },
      runtime: {
        version: "3.4.4",
        model: {
          repository: "opendatalab/MinerU2.5-Pro-2605-1.2B",
          revision: "revision",
        },
      },
    },
    manifestPath: resolve(input.batchManifestPath),
    manifestSha256: input.batchManifestSha256,
  };
}

function writeDualManifest(input: {
  batchManifestPath: string;
  pagesPath: string;
  pipelineContentListPath: string;
  proposed: number;
  accepted: number;
}) {
  writeJson(PHB_MINERU_DUAL_REVIEW_MANIFEST_RELATIVE_PATH, {
    schemaVersion: 1,
    source: {
      id: "phb35-core",
      artifactSha256: SHA,
    },
    pipeline: {
      extractionManifest: fileIdentity(
        PHB_FULL_EXTRACTION_MANIFEST_RELATIVE_PATH,
      ),
      pages: fileIdentity(input.pagesPath),
      contentList: fileIdentity(input.pipelineContentListPath),
    },
    vlm: {
      batchManifest: fileIdentity(input.batchManifestPath),
      version: "3.4.4",
      model: {
        repository: "opendatalab/MinerU2.5-Pro-2605-1.2B",
        revision: "revision",
      },
    },
    layoutReview: fileIdentity(PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH),
    review: fileIdentity(PHB_MINERU_DUAL_REVIEW_RELATIVE_PATH),
    counts: {
      pages: 1,
      disagreementRows: 1,
      itemRows: 1,
      tableRows: 0,
      proposed: input.proposed,
      accepted: input.accepted,
      rejected: 0,
    },
  });
}

function fileIdentity(relativePath: string) {
  return { relativePath, sha256: sha256File(resolve(relativePath)) };
}

function writeJson(relativePath: string, value: unknown) {
  write(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(relativePath: string, rows: unknown[]) {
  write(
    relativePath,
    rows.map((row) => JSON.stringify(row)).join("\n") +
      (rows.length ? "\n" : ""),
  );
}

function write(relativePath: string, content: string) {
  const filePath = resolve(relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function resolve(relativePath: string) {
  return path.join(dataRoot, ...relativePath.split("/"));
}
