import crypto from "node:crypto";
import fs from "node:fs";

import { localDataDir } from "../shared/env";
import type { FullDbComparisonRow } from "../phb/full-comparison";
import {
  PHB_FULL_DETACHED_TABLES_RELATIVE_PATH,
  PHB_FULL_ENTITIES_RELATIVE_PATH,
  PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH,
  PHB_FULL_MINERU_TABLES_RELATIVE_PATH,
  PHB_FULL_PAGES_RELATIVE_PATH,
  type FullDetachedTableEvidence,
  type FullMineruTableEvidence,
  type FullSpellEntity,
} from "../phb/full-extraction";
import type { FullListOccurrence } from "../phb/full-lists";
import {
  buildFullMineruLayoutReviewCandidates,
  PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH,
  parseFullMineruPageRows,
  validateFullMineruLayoutReviews,
  type FullMineruLayoutReview,
  type FullMineruPageRow,
} from "../phb/full-mineru";
import {
  PHB_FULL_DB_COMPARISON_MANIFEST_RELATIVE_PATH,
  PHB_FULL_DB_COMPARISON_RELATIVE_PATH,
  PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH,
  PHB_FULL_ROW_REVIEW_RELATIVE_PATH,
  buildFullEvidenceRowIds,
  verifyFullComparisonArtifacts,
  verifyFullExtractionChain,
  verifySrdBackedReviews,
} from "../phb/full-pipeline";
import {
  validateFullRowReviewEvidence,
  validateFullRowReviews,
  type FullRowReview,
} from "../phb/full-row-review";
import {
  PHB_SRD_ADJUDICATION_RELATIVE_PATH,
  verifySrdAdjudicationArtifacts,
  type SrdAdjudicationRow,
} from "../phb/srd-adjudication";
import {
  readAndVerifyPhbSourceManifest,
  resolveInside,
} from "../phb/source-manifest";
import { writeJsonlAtomically, type AtomicJsonlWriter } from "./atomic-jsonl";
import { PhbReviewError } from "./errors";
import {
  PHB_REVIEW_QUEUE_IDS,
  type EnglishResidualReviewDetail,
  type MineruLayoutReviewDetail,
  type PhbReviewDecisionRequest,
  type PhbReviewDecisionResult,
  type PhbReviewItemDetail,
  type PhbReviewListItem,
  type PhbReviewQueue,
  type PhbReviewQueueAvailability,
  type PhbReviewQueueId,
  type PhbReviewQueueSummary,
  type PhbReviewService,
  type PhbReviewSourcePdf,
  type PhbReviewStatus,
} from "./types";

type ServiceOptions = {
  dataRoot?: string;
  atomicWriter?: AtomicJsonlWriter;
  verifyEnglishQueue?: (dataRoot: string) => void;
};

type EnglishQueueState = {
  comparisons: FullDbComparisonRow[];
  reviews: FullRowReview[];
  adjudications: SrdAdjudicationRow[];
  residuals: Array<{
    comparison: FullDbComparisonRow;
    review: FullRowReview;
    adjudication: SrdAdjudicationRow;
    source: FullSpellEntity | null;
  }>;
};

export function createPhbReviewService(
  options: ServiceOptions = {},
): PhbReviewService {
  const dataRoot = options.dataRoot ?? localDataDir();
  const atomicWriter = options.atomicWriter ?? writeJsonlAtomically;
  const verifyEnglishQueue =
    options.verifyEnglishQueue ?? verifyCanonicalEnglishQueue;
  let writeTail: Promise<void> = Promise.resolve();

  function listQueues() {
    return PHB_REVIEW_QUEUE_IDS.map((queueId) => queueSummary(queueId));
  }

  function getQueue(queueId: PhbReviewQueueId): PhbReviewQueue {
    assertQueueId(queueId);
    if (queueId === "mineru-layout") {
      const { rows } = loadLayoutState(dataRoot);
      return {
        summary: summaryForItems(
          queueId,
          { available: true },
          rows.map(layoutListItem),
        ),
        items: rows.map(layoutListItem),
      };
    }
    const availability = englishAvailability();
    if (!availability.available) {
      throw new PhbReviewError("stale-queue", availability.message, {
        availability,
      });
    }
    const state = loadEnglishState(dataRoot);
    const items = state.residuals.map(({ comparison, review, source }) =>
      englishListItem(comparison, review, source),
    );
    return {
      summary: summaryForItems(queueId, availability, items),
      items,
    };
  }

  function getItem(
    queueId: PhbReviewQueueId,
    itemId: string,
  ): PhbReviewItemDetail {
    assertQueueId(queueId);
    if (queueId === "mineru-layout") {
      return layoutDetail(dataRoot, itemId);
    }
    const availability = englishAvailability();
    if (!availability.available) {
      throw new PhbReviewError("stale-queue", availability.message, {
        availability,
      });
    }
    return englishDetail(dataRoot, itemId);
  }

  function getSourcePdf(sourceId: string): PhbReviewSourcePdf {
    if (!sourceId.trim()) {
      throw new PhbReviewError("invalid-request", "sourceId is required");
    }
    const verified = readAndVerifyPhbSourceManifest(dataRoot);
    const source = verified.artifacts.find(
      (artifact) => artifact.id === sourceId && artifact.role === "base",
    );
    if (!source) {
      throw new PhbReviewError(
        "not-found",
        `Unknown PHB PDF source: ${sourceId}`,
      );
    }
    return {
      sourceId,
      bytes: source.bytes,
      sha256: source.sha256,
      mediaType: "application/pdf",
      createReadStream: (range) =>
        fs.createReadStream(source.path, range ?? undefined),
    };
  }

  function submitDecision(request: PhbReviewDecisionRequest) {
    const operation = writeTail.then(() => writeDecision(request));
    writeTail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  async function writeDecision(
    request: PhbReviewDecisionRequest,
  ): Promise<PhbReviewDecisionResult> {
    validateDecisionRequest(request);
    if (request.queueId === "mineru-layout") {
      const state = loadLayoutState(dataRoot);
      const index = state.rows.findIndex((row) => row.rowId === request.itemId);
      if (index < 0) notFound(request.queueId, request.itemId);
      const current = state.rows[index]!;
      const currentDetail = layoutDetailFromState(state, current);
      assertObservedFingerprint(request.reviewFingerprintSha256, currentDetail);
      const next = applyLayoutDecision(current, request);
      const nextRows = state.rows.with(index, next);
      const errors = validateFullMineruLayoutReviews(state.pages, nextRows);
      if (errors.length > 0) {
        throw new PhbReviewError(
          "invalid-request",
          `MinerU layout decision is invalid:\n${errors.join("\n")}`,
        );
      }
      if (stableJson(current) === stableJson(next)) {
        return {
          item: layoutListItem(current),
          changed: false,
          canonicalRerunRequired: null,
        };
      }
      await atomicWriter(
        resolveInside(dataRoot, PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH),
        nextRows,
      );
      return {
        item: layoutListItem(next),
        changed: true,
        canonicalRerunRequired: { from: "phb:source:extract" },
      };
    }

    const availability = englishAvailability();
    if (!availability.available) {
      throw new PhbReviewError("stale-queue", availability.message, {
        availability,
      });
    }
    const state = loadEnglishState(dataRoot);
    const residual = state.residuals.find(
      ({ review }) => review.caseId === request.itemId,
    );
    if (!residual) notFound(request.queueId, request.itemId);
    const currentDetail = englishDetailFromState(dataRoot, residual!);
    assertObservedFingerprint(request.reviewFingerprintSha256, currentDetail);
    if (request.selection) {
      throw new PhbReviewError(
        "invalid-request",
        "English residual decisions do not accept a layout selection",
      );
    }
    const index = state.reviews.findIndex(
      (row) => row.caseId === request.itemId,
    );
    const current = state.reviews[index]!;
    const next: FullRowReview = {
      ...current,
      status: request.status,
      reviewer: request.reviewer.trim(),
      decisionNote: request.decisionNote.trim(),
    };
    const nextRows = state.reviews.with(index, next);
    const errors = validateFullRowReviews(state.comparisons, nextRows, false);
    if (errors.length > 0) {
      throw new PhbReviewError(
        "invalid-request",
        `English residual decision is invalid:\n${errors.join("\n")}`,
      );
    }
    if (stableJson(current) === stableJson(next)) {
      return {
        item: englishListItem(residual!.comparison, current, residual!.source),
        changed: false,
        canonicalRerunRequired: null,
      };
    }
    await atomicWriter(
      resolveInside(dataRoot, PHB_FULL_ROW_REVIEW_RELATIVE_PATH),
      nextRows,
    );
    return {
      item: englishListItem(residual!.comparison, next, residual!.source),
      changed: true,
      canonicalRerunRequired: { from: "phb:source:compare" },
    };
  }

  function englishAvailability(): PhbReviewQueueAvailability {
    try {
      verifyEnglishQueue(dataRoot);
      return { available: true };
    } catch (error) {
      return {
        available: false,
        code: "stale-queue",
        message: publicErrorMessage(error, dataRoot),
        requiredRerunFrom: "phb:source:extract",
      };
    }
  }

  function queueSummary(queueId: PhbReviewQueueId): PhbReviewQueueSummary {
    if (queueId === "mineru-layout") return getQueue(queueId).summary;
    const availability = englishAvailability();
    if (!availability.available) {
      return summaryForItems(queueId, availability, []);
    }
    const state = loadEnglishState(dataRoot);
    return summaryForItems(
      queueId,
      availability,
      state.residuals.map(({ comparison, review, source }) =>
        englishListItem(comparison, review, source),
      ),
    );
  }

  return { listQueues, getQueue, getItem, getSourcePdf, submitDecision };
}

function loadLayoutState(dataRoot: string) {
  const pages = parseFullMineruPageRows(
    fs.readFileSync(
      resolveInside(dataRoot, PHB_FULL_PAGES_RELATIVE_PATH),
      "utf8",
    ),
  );
  const rows = readJsonl<FullMineruLayoutReview>(
    resolveInside(dataRoot, PHB_FULL_LAYOUT_REVIEW_RELATIVE_PATH),
  );
  const errors = validateFullMineruLayoutReviews(pages, rows);
  if (errors.length > 0) {
    throw new Error(
      `MinerU layout review is stale or invalid:\n${errors.join("\n")}`,
    );
  }
  return { pages, rows };
}

function loadEnglishState(dataRoot: string): EnglishQueueState {
  const comparisons = readJsonl<FullDbComparisonRow>(
    resolveInside(dataRoot, PHB_FULL_DB_COMPARISON_RELATIVE_PATH),
  );
  const reviews = readJsonl<FullRowReview>(
    resolveInside(dataRoot, PHB_FULL_ROW_REVIEW_RELATIVE_PATH),
  );
  const adjudications = readJsonl<SrdAdjudicationRow>(
    resolveInside(dataRoot, PHB_SRD_ADJUDICATION_RELATIVE_PATH),
  );
  const spells = readJsonl<FullSpellEntity>(
    resolveInside(dataRoot, PHB_FULL_ENTITIES_RELATIVE_PATH),
  );
  const occurrences = readJsonl<FullListOccurrence>(
    resolveInside(dataRoot, PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH),
  );
  const overlays = readJsonl<{ rowId: string; caseId: string }>(
    resolveInside(dataRoot, PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH),
  );
  const evidenceRowIdsByCase = buildFullEvidenceRowIds(
    comparisons,
    spells,
    occurrences,
    overlays,
  );
  const errors = [
    ...validateFullRowReviews(comparisons, reviews, false),
    ...validateFullRowReviewEvidence({
      comparisons,
      rows: reviews,
      evidenceRowIdsByCase,
    }),
  ];
  if (errors.length > 0) {
    throw new Error(
      `English row review is stale or invalid:\n${errors.join("\n")}`,
    );
  }
  const comparisonByCase = new Map(comparisons.map((row) => [row.caseId, row]));
  const reviewByCase = new Map(reviews.map((row) => [row.caseId, row]));
  const sourceByCase = new Map(spells.map((row) => [row.rowId, row]));
  const residuals = adjudications
    .filter((row) => row.status === "exception")
    .map((adjudication) => {
      const comparison = comparisonByCase.get(adjudication.caseId);
      const review = reviewByCase.get(adjudication.caseId);
      if (!comparison || !review) {
        throw new Error(
          `SRD residual has no current comparison/review: ${adjudication.caseId}`,
        );
      }
      if (!adjudication.evidenceFingerprintSha256) {
        throw new Error(
          `SRD residual fingerprint is missing: ${adjudication.caseId}`,
        );
      }
      return {
        comparison,
        review,
        adjudication,
        source: sourceByCase.get(adjudication.caseId) ?? null,
      };
    });
  return { comparisons, reviews, adjudications, residuals };
}

function layoutDetail(dataRoot: string, itemId: string) {
  const state = loadLayoutState(dataRoot);
  const row = state.rows.find((value) => value.rowId === itemId);
  if (!row) notFound("mineru-layout", itemId);
  return layoutDetailFromState(state, row!);
}

function layoutDetailFromState(
  state: { pages: FullMineruPageRow[]; rows: FullMineruLayoutReview[] },
  row: FullMineruLayoutReview,
): MineruLayoutReviewDetail {
  const candidate = buildFullMineruLayoutReviewCandidates(state.pages).find(
    (value) => value.rowId === row.rowId,
  );
  const page = state.pages.find(
    (value) =>
      value.sourceId === row.sourceId &&
      value.sourcePageIndex === row.sourcePageIndex,
  );
  if (!candidate || !page) {
    throw new Error(`MinerU layout evidence is incomplete: ${row.rowId}`);
  }
  return {
    queueId: "mineru-layout",
    item: layoutListItem(row),
    candidate,
    page: {
      sourceId: page.sourceId,
      sourcePageIndex: page.sourcePageIndex,
      printedPageNumber: page.printedPageNumber,
      width: page.pdfjs.width,
      height: page.pdfjs.height,
      mineruBlocks: page.mineru.blocks,
      pdfItems: page.pdfjs.items,
    },
  };
}

function englishDetail(dataRoot: string, itemId: string) {
  const state = loadEnglishState(dataRoot);
  const residual = state.residuals.find(
    ({ review }) => review.caseId === itemId,
  );
  if (!residual) notFound("english-residual", itemId);
  return englishDetailFromState(dataRoot, residual!);
}

function englishDetailFromState(
  dataRoot: string,
  residual: EnglishQueueState["residuals"][number],
): EnglishResidualReviewDetail {
  const ids = new Set(residual.review.evidenceRowIds);
  return {
    queueId: "english-residual",
    item: englishListItem(
      residual.comparison,
      residual.review,
      residual.source,
    ),
    comparison: residual.comparison,
    rowReview: residual.review,
    adjudication: residual.adjudication,
    evidence: {
      spellEntities: readJsonl<FullSpellEntity>(
        resolveInside(dataRoot, PHB_FULL_ENTITIES_RELATIVE_PATH),
      ).filter((row) => typeof row.rowId === "string" && ids.has(row.rowId)),
      listOccurrences: readJsonl<FullListOccurrence>(
        resolveInside(dataRoot, PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH),
      ).filter(
        (row) =>
          typeof row.occurrenceId === "string" && ids.has(row.occurrenceId),
      ),
      errataOverlays: readJsonl<Record<string, unknown>>(
        resolveInside(dataRoot, PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH),
      ).filter((row) => typeof row.rowId === "string" && ids.has(row.rowId)),
      detachedTables: filterEvidenceRows<FullDetachedTableEvidence>(
        dataRoot,
        PHB_FULL_DETACHED_TABLES_RELATIVE_PATH,
        ids,
      ),
      mineruTables: filterEvidenceRows<FullMineruTableEvidence>(
        dataRoot,
        PHB_FULL_MINERU_TABLES_RELATIVE_PATH,
        ids,
      ),
    },
  };
}

function layoutListItem(row: FullMineruLayoutReview): PhbReviewListItem {
  return {
    queueId: "mineru-layout",
    itemId: row.rowId,
    label:
      row.kind === "content-order-conflict" ? row.blockText : row.pdfItem.text,
    status: row.status,
    kind: row.kind,
    category: null,
    sourceId: row.sourceId,
    sourcePageIndex: row.sourcePageIndex,
    printedPageNumber: row.printedPageNumber,
    evidenceFingerprintSha256: row.evidenceFingerprintSha256,
    reviewFingerprintSha256: reviewFingerprint(row),
    reviewer: row.reviewer,
    decisionNote: row.decisionNote,
    allowedActions: ["accepted", "rejected"],
  };
}

function englishListItem(
  comparison: FullDbComparisonRow,
  review: FullRowReview,
  source: FullSpellEntity | null,
): PhbReviewListItem {
  const sourcePage = source?.sourcePages[0];
  return {
    queueId: "english-residual",
    itemId: review.caseId,
    label: review.printedName,
    status: review.status,
    kind: "srd-exception",
    category: review.proposedCategory,
    sourceId: "phb35-core",
    sourcePageIndex: sourcePage?.sourcePageIndex ?? null,
    printedPageNumber:
      sourcePage?.printedPageNumber ?? comparison.sourcePages[0] ?? null,
    evidenceFingerprintSha256: review.evidenceFingerprintSha256,
    reviewFingerprintSha256: reviewFingerprint(review),
    reviewer: review.reviewer,
    decisionNote: review.decisionNote,
    allowedActions: ["accepted", "rejected"],
  };
}

function applyLayoutDecision(
  current: FullMineruLayoutReview,
  request: PhbReviewDecisionRequest,
): FullMineruLayoutReview {
  if (current.kind === "outside-bbox-projection") {
    const targetBlockIndex = request.selection?.targetBlockIndex;
    if (!Number.isInteger(targetBlockIndex)) {
      throw new PhbReviewError(
        "invalid-request",
        "outside-bbox-projection requires targetBlockIndex",
      );
    }
    return {
      ...current,
      targetBlockIndex: targetBlockIndex!,
      status: request.status,
      reviewer: request.reviewer.trim(),
      decisionNote: request.decisionNote.trim(),
    };
  }
  if (current.kind === "content-order-conflict") {
    const anchorBlockIndex = request.selection?.anchorBlockIndex;
    if (!Number.isInteger(anchorBlockIndex)) {
      throw new PhbReviewError(
        "invalid-request",
        "content-order-conflict requires anchorBlockIndex",
      );
    }
    return {
      ...current,
      anchorBlockIndex: anchorBlockIndex!,
      status: request.status,
      reviewer: request.reviewer.trim(),
      decisionNote: request.decisionNote.trim(),
    };
  }
  if (request.selection) {
    throw new PhbReviewError(
      "invalid-request",
      "image-adjacent-exclusion does not accept a target selection",
    );
  }
  return {
    ...current,
    status: request.status,
    reviewer: request.reviewer.trim(),
    decisionNote: request.decisionNote.trim(),
  };
}

function verifyCanonicalEnglishQueue(dataRoot: string) {
  verifyFullExtractionChain(dataRoot);
  const comparisonManifest = readJson<Record<string, unknown>>(
    resolveInside(dataRoot, PHB_FULL_DB_COMPARISON_MANIFEST_RELATIVE_PATH),
  );
  verifyFullComparisonArtifacts(dataRoot, comparisonManifest);
  verifySrdAdjudicationArtifacts(dataRoot);
  const reviews = readJsonl<FullRowReview>(
    resolveInside(dataRoot, PHB_FULL_ROW_REVIEW_RELATIVE_PATH),
  );
  verifySrdBackedReviews(dataRoot, reviews);
}

function summaryForItems(
  queueId: PhbReviewQueueId,
  availability: PhbReviewQueueAvailability,
  items: PhbReviewListItem[],
): PhbReviewQueueSummary {
  return {
    queueId,
    availability,
    total: items.length,
    countsByStatus: countValues(
      ["proposed", "accepted", "rejected"],
      items.map((item) => item.status),
    ) as Record<PhbReviewStatus, number>,
    facets: {
      kind: countValues(
        [],
        items.map((item) => item.kind),
      ),
      category: countValues(
        [],
        items.flatMap((item) => (item.category ? [item.category] : [])),
      ),
    },
  };
}

function validateDecisionRequest(request: PhbReviewDecisionRequest) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new PhbReviewError(
      "invalid-request",
      "Decision request must be an object",
    );
  }
  assertQueueId(request.queueId);
  if (typeof request.itemId !== "string" || !request.itemId.trim()) {
    throw new PhbReviewError("invalid-request", "itemId is required");
  }
  if (
    typeof request.reviewFingerprintSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(request.reviewFingerprintSha256)
  ) {
    throw new PhbReviewError(
      "invalid-request",
      "reviewFingerprintSha256 must be a SHA-256 hash",
    );
  }
  if (!(["accepted", "rejected"] as const).includes(request.status)) {
    throw new PhbReviewError(
      "invalid-request",
      "status must be accepted or rejected",
    );
  }
  if (
    typeof request.reviewer !== "string" ||
    typeof request.decisionNote !== "string" ||
    !request.reviewer.trim() ||
    !request.decisionNote.trim()
  ) {
    throw new PhbReviewError(
      "invalid-request",
      "reviewer and decisionNote are required",
    );
  }
  if (
    request.selection !== undefined &&
    (!request.selection ||
      typeof request.selection !== "object" ||
      Array.isArray(request.selection))
  ) {
    throw new PhbReviewError("invalid-request", "selection must be an object");
  }
}

function assertObservedFingerprint(
  observed: string,
  current: PhbReviewItemDetail,
) {
  if (observed !== current.item.reviewFingerprintSha256) {
    throw new PhbReviewError(
      "stale-decision",
      `Review item changed since it was loaded: ${current.item.itemId}`,
      { current },
    );
  }
}

function assertQueueId(value: string): asserts value is PhbReviewQueueId {
  if (!(PHB_REVIEW_QUEUE_IDS as readonly string[]).includes(value)) {
    throw new PhbReviewError("invalid-queue", `Unknown review queue: ${value}`);
  }
}

function notFound(queueId: PhbReviewQueueId, itemId: string): never {
  throw new PhbReviewError(
    "not-found",
    `Unknown ${queueId} review item: ${itemId}`,
  );
}

function filterEvidenceRows<T>(
  dataRoot: string,
  relativePath: string,
  ids: Set<string>,
) {
  return readJsonl<T>(resolveInside(dataRoot, relativePath)).filter((row) => {
    const record = row as Record<string, unknown>;
    const values = [record.rowId, record.tableId, record.evidenceId];
    return values.some((value) => typeof value === "string" && ids.has(value));
  });
}

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath))
    throw new Error(`PHB artifact not found: ${filePath}`);
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

function readJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath))
    throw new Error(`PHB artifact not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function reviewFingerprint(value: unknown) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown) {
  return JSON.stringify(stableValue(value));
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

function countValues(initial: string[], values: string[]) {
  const counts: Record<string, number> = Object.fromEntries(
    initial.map((value) => [value, 0]),
  );
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

function publicErrorMessage(error: unknown, dataRoot: string) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replaceAll(dataRoot, "<data>")
    .replaceAll(dataRoot.replaceAll("\\", "/"), "<data>");
}
