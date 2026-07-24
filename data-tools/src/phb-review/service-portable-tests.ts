import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { FullDbComparisonRow } from "../phb/full-comparison";
import {
  PHB_FULL_DETACHED_TABLES_RELATIVE_PATH,
  PHB_FULL_ENTITIES_RELATIVE_PATH,
  PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH,
  PHB_FULL_MINERU_TABLES_RELATIVE_PATH,
  PHB_FULL_PAGES_RELATIVE_PATH,
} from "../phb/full-extraction";
import {
  buildFullMineruLayoutReviewCandidates,
  PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH,
  type FullMineruBlock,
  type FullMineruPageRow,
} from "../phb/full-mineru";
import {
  PHB_FULL_DB_COMPARISON_RELATIVE_PATH,
  PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH,
  PHB_FULL_ROW_REVIEW_RELATIVE_PATH,
  buildFullEvidenceRowIds,
} from "../phb/full-pipeline";
import { buildProposedFullRowReviews } from "../phb/full-row-review";
import { compareTokenMultisets } from "../phb/pilot-extraction";
import { PHB_SRD_ADJUDICATION_RELATIVE_PATH } from "../phb/srd-adjudication";
import {
  currentPhbAuthorityPolicyReference,
  PHB_SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH,
} from "../phb/source-authority";
import { PhbReviewError } from "./errors";
import { createPhbReviewService } from "./service";
import type { PhbCanonicalRerunRequired, PhbReviewQueueId } from "./types";

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phb-review-service-"));
  try {
    const fixture = createFixture(root);
    const service = createPhbReviewService({
      dataRoot: root,
      verifyEnglishQueue: verifySyntheticFreshness,
      deriveCanonicalRerunRequired: deriveSyntheticCanonicalRerun,
    });

    const queues = service.listQueues();
    assert.equal(
      queues.find((row) => row.queueId === "mineru-layout")!.total,
      2,
    );
    assert.equal(
      queues.find((row) => row.queueId === "english-residual")!.total,
      1,
    );

    const authorityManifestPath = inside(
      root,
      PHB_SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH,
    );
    const authorityManifest = JSON.parse(
      fs.readFileSync(authorityManifestPath, "utf8"),
    ) as { inputs: { authorityPolicy?: unknown } };
    delete authorityManifest.inputs.authorityPolicy;
    fs.writeFileSync(
      authorityManifestPath,
      `${JSON.stringify(authorityManifest)}\n`,
      "utf8",
    );
    const blocked = service
      .listQueues()
      .find((row) => row.queueId === "english-residual")!;
    assert.equal(blocked.availability.available, false);
    assert.match(
      blocked.availability.message ?? "",
      /authority policy is stale/u,
    );
    assert.throws(
      () => service.getQueue("english-residual"),
      (error: unknown) =>
        error instanceof PhbReviewError && error.code === "stale-queue",
    );
    await assert.rejects(
      service.submitDecision({
        queueId: "english-residual",
        itemId: "spell:test",
        reviewFingerprintSha256: "a".repeat(64),
        status: "accepted",
        reviewer: "portable-reviewer",
        decisionNote: "A stale authority policy must reject writes.",
      }),
      (error: unknown) =>
        error instanceof PhbReviewError && error.code === "stale-queue",
    );
    writeAuthorityManifest(root);
    assert.equal(service.getQueue("english-residual").items.length, 1);

    const first = service.getQueue("mineru-layout").items[0]!;
    const originalLayoutOrder = service
      .getQueue("mineru-layout")
      .items.map((item) => item.itemId);
    const rowReviewPath = inside(root, PHB_FULL_ROW_REVIEW_RELATIVE_PATH);
    const originalRowReview = fs.readFileSync(rowReviewPath, "utf8");
    const firstDetail = service.getItem("mineru-layout", first.itemId);
    assert.equal(firstDetail.queueId, "mineru-layout");
    assert.equal(firstDetail.page.mineruBlocks.length, 1);
    const firstCandidate = fixture.layoutRows.find(
      (row) => row.rowId === first.itemId,
    )!;
    assert.equal(firstCandidate.kind, "outside-bbox-projection");
    const targetBlockIndex =
      firstCandidate.kind === "outside-bbox-projection"
        ? firstCandidate.eligibleBlocks[0]!.blockIndex
        : -1;

    const [winningWrite, staleWrite] = await Promise.allSettled([
      service.submitDecision({
        queueId: "mineru-layout",
        itemId: first.itemId,
        reviewFingerprintSha256: first.reviewFingerprintSha256,
        status: "accepted",
        reviewer: "portable-reviewer",
        decisionNote:
          "The exact PDF item belongs to the selected MinerU block.",
        selection: { targetBlockIndex },
      }),
      service.submitDecision({
        queueId: "mineru-layout",
        itemId: first.itemId,
        reviewFingerprintSha256: first.reviewFingerprintSha256,
        status: "rejected",
        reviewer: "second-tab",
        decisionNote: "This tab loaded the same original review state.",
        selection: { targetBlockIndex },
      }),
    ]);
    assert.equal(winningWrite.status, "fulfilled");
    assert.equal(staleWrite.status, "rejected");
    assert.ok(
      staleWrite.status === "rejected" &&
        staleWrite.reason instanceof PhbReviewError &&
        staleWrite.reason.code === "stale-decision",
    );
    const layoutResult = winningWrite.value;
    assert.equal(layoutResult.changed, true);
    assert.deepEqual(layoutResult.canonicalRerunRequired, {
      from: "phb:source:extract",
    });
    const reloadedLayout = service.getQueue("mineru-layout");
    assert.deepEqual(reloadedLayout.summary.canonicalRerunRequired, {
      from: "phb:source:extract",
    });
    const currentLayout = reloadedLayout.items.find(
      (item) => item.itemId === first.itemId,
    )!;
    const layoutNoOp = await service.submitDecision({
      queueId: "mineru-layout",
      itemId: currentLayout.itemId,
      reviewFingerprintSha256: currentLayout.reviewFingerprintSha256,
      status: "accepted",
      reviewer: currentLayout.reviewer!,
      decisionNote: currentLayout.decisionNote!,
      selection: { targetBlockIndex },
    });
    assert.equal(layoutNoOp.changed, false);
    assert.deepEqual(layoutNoOp.canonicalRerunRequired, {
      from: "phb:source:extract",
    });
    assert.deepEqual(
      service.getQueue("mineru-layout").items.map((item) => item.itemId),
      originalLayoutOrder,
    );
    assert.equal(fs.readFileSync(rowReviewPath, "utf8"), originalRowReview);
    assert.equal(
      service.listQueues().find((row) => row.queueId === "english-residual")!
        .availability.available,
      false,
    );

    refreshSyntheticFreshness(root);
    assert.equal(
      service.getQueue("mineru-layout").summary.canonicalRerunRequired,
      null,
    );
    assert.equal(service.getQueue("english-residual").items.length, 1);

    const english = service.getQueue("english-residual").items[0]!;
    assert.equal(english.sourcePageIndex, 12);
    assert.equal(english.printedPageNumber, 200);
    const adjudicationPath = inside(root, PHB_SRD_ADJUDICATION_RELATIVE_PATH);
    const adjudication = JSON.parse(
      fs.readFileSync(adjudicationPath, "utf8").trim(),
    ) as Record<string, unknown>;
    writeJsonl(adjudicationPath, [
      { ...adjudication, evidenceFingerprintSha256: "e".repeat(64) },
    ]);
    const beforeStaleAdjudication = fs.readFileSync(rowReviewPath, "utf8");
    await assert.rejects(
      service.submitDecision({
        queueId: "english-residual",
        itemId: english.itemId,
        reviewFingerprintSha256: english.reviewFingerprintSha256,
        status: "accepted",
        reviewer: "portable-reviewer",
        decisionNote: "This decision observed the old SRD evidence.",
      }),
      (error: unknown) =>
        error instanceof PhbReviewError && error.code === "stale-decision",
    );
    assert.equal(
      fs.readFileSync(rowReviewPath, "utf8"),
      beforeStaleAdjudication,
    );
    const currentEnglish = service.getQueue("english-residual").items[0]!;
    assert.notEqual(
      currentEnglish.reviewFingerprintSha256,
      english.reviewFingerprintSha256,
    );
    const englishResult = await service.submitDecision({
      queueId: "english-residual",
      itemId: currentEnglish.itemId,
      reviewFingerprintSha256: currentEnglish.reviewFingerprintSha256,
      status: "accepted",
      reviewer: "portable-reviewer",
      decisionNote: "PHB evidence is accepted for this residual exception.",
    });
    assert.deepEqual(englishResult.canonicalRerunRequired, {
      from: "phb:source:compare",
    });
    const reloadedEnglish = service.getQueue("english-residual");
    assert.deepEqual(reloadedEnglish.summary.canonicalRerunRequired, {
      from: "phb:source:compare",
    });
    const currentAcceptedEnglish = reloadedEnglish.items[0]!;
    const englishNoOp = await service.submitDecision({
      queueId: "english-residual",
      itemId: currentAcceptedEnglish.itemId,
      reviewFingerprintSha256: currentAcceptedEnglish.reviewFingerprintSha256,
      status: "accepted",
      reviewer: currentAcceptedEnglish.reviewer!,
      decisionNote: currentAcceptedEnglish.decisionNote!,
    });
    assert.equal(englishNoOp.changed, false);
    assert.deepEqual(englishNoOp.canonicalRerunRequired, {
      from: "phb:source:compare",
    });
    assert.throws(
      () => verifySyntheticRowReviewManifest(root),
      /row-review manifest is stale/u,
    );
    assert.equal(
      service.getQueue("english-residual").items[0]!.status,
      "accepted",
    );
    refreshSyntheticRowReviewManifest(root);
    assert.doesNotThrow(() => verifySyntheticRowReviewManifest(root));
    assert.equal(
      service.getQueue("english-residual").summary.canonicalRerunRequired,
      null,
    );
    await assert.rejects(
      service.submitDecision({
        queueId: "english-residual",
        itemId: english.itemId,
        reviewFingerprintSha256: english.reviewFingerprintSha256,
        status: "rejected",
        reviewer: "second-tab",
        decisionNote: "This tab also loaded the old review state.",
      }),
      (error: unknown) =>
        error instanceof PhbReviewError && error.code === "stale-decision",
    );

    const layoutPath = inside(root, PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH);
    const beforeInvalid = fs.readFileSync(layoutPath, "utf8");
    const second = service.getQueue("mineru-layout").items[1]!;
    await assert.rejects(
      service.submitDecision({
        queueId: "mineru-layout",
        itemId: second.itemId,
        reviewFingerprintSha256: second.reviewFingerprintSha256,
        status: "accepted",
        reviewer: "portable-reviewer",
        decisionNote: "An invalid target must not modify the queue.",
        selection: { targetBlockIndex: 999 },
      }),
      /targetBlockIndex is not an eligible block/u,
    );
    assert.equal(fs.readFileSync(layoutPath, "utf8"), beforeInvalid);

    await assert.rejects(
      service.submitDecision({
        queueId: "mineru-layout",
        itemId: second.itemId,
        reviewFingerprintSha256: second.reviewFingerprintSha256,
        status: "accepted",
        reviewer: null,
        decisionNote: "Malformed runtime input must be rejected cleanly.",
      } as unknown as Parameters<typeof service.submitDecision>[0]),
      (error: unknown) =>
        error instanceof PhbReviewError && error.code === "invalid-request",
    );
    assert.equal(fs.readFileSync(layoutPath, "utf8"), beforeInvalid);

    const failingService = createPhbReviewService({
      dataRoot: root,
      verifyEnglishQueue: verifySyntheticFreshness,
      deriveCanonicalRerunRequired: deriveSyntheticCanonicalRerun,
      atomicWriter: async () => {
        throw new Error("simulated atomic replacement failure");
      },
    });
    const failingItem = failingService.getQueue("mineru-layout").items[1]!;
    await assert.rejects(
      failingService.submitDecision({
        queueId: "mineru-layout",
        itemId: failingItem.itemId,
        reviewFingerprintSha256: failingItem.reviewFingerprintSha256,
        status: "accepted",
        reviewer: "portable-reviewer",
        decisionNote: "A simulated I/O failure must leave the old file intact.",
        selection: {
          targetBlockIndex:
            fixture.layoutRows[1]!.kind === "outside-bbox-projection"
              ? fixture.layoutRows[1]!.eligibleBlocks[0]!.blockIndex
              : -1,
        },
      }),
      /simulated atomic replacement failure/u,
    );
    assert.equal(fs.readFileSync(layoutPath, "utf8"), beforeInvalid);

    console.log("PHB review-service portable tests passed");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

function createFixture(root: string) {
  const pages = [page(200, "Near block edge"), page(201, "Near block edge")];
  const layoutRows = buildFullMineruLayoutReviewCandidates(pages);
  writeJsonl(inside(root, PHB_FULL_PAGES_RELATIVE_PATH), pages);
  writeJsonl(inside(root, PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH), layoutRows);

  const comparison: FullDbComparisonRow = {
    schemaVersion: 1,
    caseId: "spell:test",
    printedName: "Test Spell",
    category: "substantive-mismatch",
    setMembership: "both",
    sourceEvidence: [],
    sourcePages: [200],
    dbSpellIds: [1],
    components: [],
    shortDescriptions: {
      occurrenceCount: 1,
      wordingGroupCount: 1,
      wordingGroupKeys: ["test"],
      dbSummaryText: "Old summary.",
    },
    reviewFlags: ["manual-review"],
  };
  const spells = [
    {
      rowId: "spell:test",
      printedName: "Test Spell",
      sourcePages: [
        {
          sourceId: "phb35-core",
          sourcePageIndex: 12,
          printedPageNumber: 200,
        },
      ],
    },
  ];
  const occurrences = [
    { occurrenceId: "list:test:1", printedName: "Test Spell" },
  ];
  const overlays = [{ rowId: "errata:spell:test", caseId: "spell:test" }];
  const evidence = buildFullEvidenceRowIds(
    [comparison],
    spells as never,
    occurrences as never,
    overlays,
  );
  const reviews = buildProposedFullRowReviews({
    comparisons: [comparison],
    evidenceRowIdsByCase: evidence,
  });
  const adjudications = [
    {
      schemaVersion: 1,
      caseId: comparison.caseId,
      printedName: comparison.printedName,
      srdPrintedName: comparison.printedName,
      aliasId: null,
      comparisonCategory: comparison.category,
      status: "exception",
      rule: "residual-exception",
      componentEvidence: [],
      unresolvedReasons: ["fixture residual"],
      evidenceRowIds: reviews[0]!.evidenceRowIds,
      evidenceFingerprintSha256: "d".repeat(64),
    },
  ];
  writeJsonl(inside(root, PHB_FULL_DB_COMPARISON_RELATIVE_PATH), [comparison]);
  writeJsonl(inside(root, PHB_FULL_ROW_REVIEW_RELATIVE_PATH), reviews);
  writeJsonl(inside(root, PHB_SRD_ADJUDICATION_RELATIVE_PATH), adjudications);
  writeAuthorityManifest(root);
  writeJsonl(inside(root, PHB_FULL_ENTITIES_RELATIVE_PATH), spells);
  writeJsonl(
    inside(root, PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH),
    occurrences,
  );
  writeJsonl(inside(root, PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH), overlays);
  writeJsonl(inside(root, PHB_FULL_DETACHED_TABLES_RELATIVE_PATH), []);
  writeJsonl(inside(root, PHB_FULL_MINERU_TABLES_RELATIVE_PATH), []);
  refreshSyntheticFreshness(root);
  refreshSyntheticRowReviewManifest(root);
  return { layoutRows };
}

function writeAuthorityManifest(root: string) {
  const filePath = inside(root, PHB_SRD_ADJUDICATION_MANIFEST_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify({
      schemaVersion: 1,
      inputs: {
        authorityPolicy: currentPhbAuthorityPolicyReference(),
      },
    })}\n`,
    "utf8",
  );
}

function page(sourcePageIndex: number, text: string): FullMineruPageRow {
  const items = [
    {
      text,
      x: 153,
      y: 700,
      width: text.length * 5,
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
      text,
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
    sourceArtifactSha256: "a".repeat(64),
    sourcePageIndex,
    printedPageNumber: sourcePageIndex,
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
      contentListSha256: "c".repeat(64),
      blocks,
    },
    comparison: compareTokenMultisets(text, text),
  };
}

function refreshSyntheticFreshness(root: string) {
  const layoutPath = inside(root, PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH);
  const value = { layoutSha256: sha256File(layoutPath) };
  const filePath = inside(root, "phb35/review/portable-freshness.json");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function verifySyntheticFreshness(root: string) {
  const expected = JSON.parse(
    fs.readFileSync(
      inside(root, "phb35/review/portable-freshness.json"),
      "utf8",
    ),
  ) as { layoutSha256: string };
  const actual = sha256File(inside(root, PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH));
  if (expected.layoutSha256 !== actual) {
    throw new Error("Synthetic extraction chain is stale after layout review");
  }
}

function refreshSyntheticRowReviewManifest(root: string) {
  const rowReviewPath = inside(root, PHB_FULL_ROW_REVIEW_RELATIVE_PATH);
  const filePath = inside(
    root,
    "phb35/review/portable-row-review-manifest.json",
  );
  fs.writeFileSync(
    filePath,
    `${JSON.stringify({ rowReviewSha256: sha256File(rowReviewPath) })}\n`,
    "utf8",
  );
}

function verifySyntheticRowReviewManifest(root: string) {
  const expected = JSON.parse(
    fs.readFileSync(
      inside(root, "phb35/review/portable-row-review-manifest.json"),
      "utf8",
    ),
  ) as { rowReviewSha256: string };
  const actual = sha256File(inside(root, PHB_FULL_ROW_REVIEW_RELATIVE_PATH));
  if (expected.rowReviewSha256 !== actual) {
    throw new Error("Synthetic row-review manifest is stale");
  }
}

function deriveSyntheticCanonicalRerun(
  root: string,
  queueId: PhbReviewQueueId,
): PhbCanonicalRerunRequired {
  try {
    verifySyntheticFreshness(root);
  } catch {
    return { from: "phb:source:extract" };
  }
  if (queueId === "english-residual") {
    try {
      verifySyntheticRowReviewManifest(root);
    } catch {
      return { from: "phb:source:compare" };
    }
  }
  return null;
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

function inside(root: string, relativePath: string) {
  return path.join(root, ...relativePath.split("/"));
}

function sha256File(filePath: string) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}
