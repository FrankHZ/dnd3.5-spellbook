import { createHash } from "node:crypto";

import type { PhbPilotManifest } from "./pilot-manifest";
import type {
  PhbComparisonCategory,
  PilotDbComparisonRow,
} from "./pilot-comparison";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export type PilotRowReview = {
  schemaVersion: 1;
  caseId: string;
  printedName: string;
  proposedCategory: PhbComparisonCategory;
  status: "proposed" | "accepted" | "rejected";
  reviewer: string | null;
  decisionNote: string | null;
  evidenceRowIds: string[];
  evidenceFingerprintSha256: string;
  reviewFlags: string[];
};

export function buildProposedPilotRowReviews(input: {
  manifest: PhbPilotManifest;
  comparisons: PilotDbComparisonRow[];
  entityRowIdsByCase: Map<string, string[]>;
}) {
  return input.manifest.cases.map((pilotCase): PilotRowReview => {
    const caseComparisons = input.comparisons.filter(
      (candidate) => candidate.caseId === pilotCase.id,
    );
    if (caseComparisons.length !== 1) {
      throw new Error(
        `Pilot case must have exactly one DB comparison: ${pilotCase.id} (${caseComparisons.length})`,
      );
    }
    const comparison = caseComparisons[0]!;
    const reviewFlags = [...comparison.reviewFlags];
    const proposedCategory = comparison.category;
    const evidenceRowIds = input.entityRowIdsByCase.get(pilotCase.id) ?? [];
    if (evidenceRowIds.length === 0) {
      throw new Error(
        `Pilot case has no extracted evidence rows: ${pilotCase.id}`,
      );
    }
    return {
      schemaVersion: 1,
      caseId: pilotCase.id,
      printedName: pilotCase.printedName,
      proposedCategory,
      status: "proposed",
      reviewer: null,
      decisionNote: null,
      evidenceRowIds: Array.from(new Set(evidenceRowIds)).sort(),
      evidenceFingerprintSha256: computePilotEvidenceFingerprint({
        comparison,
        evidenceRowIds,
        reviewFlags,
      }),
      reviewFlags: Array.from(new Set(reviewFlags)).sort(),
    };
  });
}

export function validatePilotRowReviews(
  manifest: PhbPilotManifest,
  rows: PilotRowReview[],
  requireTerminal: boolean,
) {
  const errors: string[] = [];
  const expected = new Set(manifest.cases.map((entry) => entry.id));
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const prefix = `rows[${index}]`;
    if (row.schemaVersion !== 1)
      errors.push(`${prefix}.schemaVersion must be 1`);
    if (!expected.has(row.caseId))
      errors.push(`${prefix}.caseId is not in the pilot`);
    if (seen.has(row.caseId)) errors.push(`${prefix}.caseId is duplicated`);
    seen.add(row.caseId);
    if (!row.printedName.trim()) errors.push(`${prefix}.printedName is empty`);
    if (!row.evidenceRowIds.length)
      errors.push(`${prefix}.evidenceRowIds is empty`);
    if (!SHA256_PATTERN.test(row.evidenceFingerprintSha256)) {
      errors.push(`${prefix}.evidenceFingerprintSha256 is invalid`);
    }
    if (
      row.status !== "proposed" &&
      row.status !== "accepted" &&
      row.status !== "rejected"
    ) {
      errors.push(`${prefix}.status is invalid`);
    }
    if (requireTerminal && row.status === "proposed") {
      errors.push(`${prefix} remains proposed`);
    }
    if (row.status !== "proposed" && (!row.reviewer || !row.decisionNote)) {
      errors.push(
        `${prefix} terminal decision requires reviewer and decisionNote`,
      );
    }
    if (
      row.proposedCategory === "manual-review" &&
      row.status === "accepted" &&
      !row.decisionNote
    ) {
      errors.push(`${prefix} manual-review acceptance requires decisionNote`);
    }
  });
  for (const caseId of expected) {
    if (!seen.has(caseId))
      errors.push(`pilot case is missing row review: ${caseId}`);
  }
  return errors;
}

export function validatePilotRowReviewEvidence(input: {
  manifest: PhbPilotManifest;
  rows: PilotRowReview[];
  comparisons: PilotDbComparisonRow[];
  entityRowIdsByCase: Map<string, string[]>;
}) {
  const expectedRows = buildProposedPilotRowReviews({
    manifest: input.manifest,
    comparisons: input.comparisons,
    entityRowIdsByCase: input.entityRowIdsByCase,
  });
  const actualByCase = new Map(input.rows.map((row) => [row.caseId, row]));
  const errors: string[] = [];
  const expectedCaseIds = new Set(
    input.manifest.cases.map((pilotCase) => pilotCase.id),
  );
  for (const comparison of input.comparisons) {
    if (!expectedCaseIds.has(comparison.caseId)) {
      errors.push(`comparison case is not in the pilot: ${comparison.caseId}`);
    }
  }
  if (input.comparisons.length !== expectedCaseIds.size) {
    errors.push("comparison count does not match pilot case count");
  }
  for (const expected of expectedRows) {
    const actual = actualByCase.get(expected.caseId);
    if (!actual) continue;
    if (actual.proposedCategory !== expected.proposedCategory) {
      errors.push(`${expected.caseId} proposedCategory is stale`);
    }
    if (
      JSON.stringify(actual.evidenceRowIds) !==
      JSON.stringify(expected.evidenceRowIds)
    ) {
      errors.push(`${expected.caseId} evidenceRowIds are stale`);
    }
    if (
      JSON.stringify(actual.reviewFlags) !==
      JSON.stringify(expected.reviewFlags)
    ) {
      errors.push(`${expected.caseId} reviewFlags are stale`);
    }
    if (
      actual.evidenceFingerprintSha256 !== expected.evidenceFingerprintSha256
    ) {
      errors.push(`${expected.caseId} evidence fingerprint is stale`);
    }
  }
  return errors;
}

export function mergePilotRowReviews(
  existing: PilotRowReview[],
  proposed: PilotRowReview[],
) {
  const byCase = new Map(existing.map((row) => [row.caseId, row]));
  return proposed.map((row) => {
    const previous = byCase.get(row.caseId);
    if (
      previous &&
      previous.proposedCategory === row.proposedCategory &&
      JSON.stringify(previous.evidenceRowIds) ===
        JSON.stringify(row.evidenceRowIds) &&
      JSON.stringify(previous.reviewFlags) ===
        JSON.stringify(row.reviewFlags) &&
      previous.evidenceFingerprintSha256 === row.evidenceFingerprintSha256
    ) {
      return previous;
    }
    return row;
  });
}

export function computePilotEvidenceFingerprint(input: {
  comparison: PilotDbComparisonRow;
  evidenceRowIds: string[];
  reviewFlags: string[];
}) {
  const evidence = stableValue({
    comparison: input.comparison,
    evidenceRowIds: Array.from(new Set(input.evidenceRowIds)).sort(),
    reviewFlags: Array.from(new Set(input.reviewFlags)).sort(),
  });
  return createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right, "en-US"))
      .map(([key, nested]) => [key, stableValue(nested)]),
  );
}
