import { createHash } from "node:crypto";

import type { PhbComparisonCategory } from "./pilot-comparison";
import type { FullDbComparisonRow } from "./full-comparison";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export type FullRowReview = {
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

export function buildProposedFullRowReviews(input: {
  comparisons: FullDbComparisonRow[];
  evidenceRowIdsByCase: Map<string, string[]>;
}) {
  return input.comparisons.map((comparison): FullRowReview => {
    const evidenceRowIds = Array.from(
      new Set(input.evidenceRowIdsByCase.get(comparison.caseId) ?? []),
    ).sort();
    if (evidenceRowIds.length === 0) {
      throw new Error(
        `Full comparison has no evidence rows: ${comparison.caseId}`,
      );
    }
    const reviewFlags = Array.from(new Set(comparison.reviewFlags)).sort();
    const automaticDecision = automaticReviewDecision(comparison.category);
    return {
      schemaVersion: 1,
      caseId: comparison.caseId,
      printedName: comparison.printedName,
      proposedCategory: comparison.category,
      status: automaticDecision ? "accepted" : "proposed",
      reviewer: automaticDecision ? "data-tools:auto" : null,
      decisionNote: automaticDecision,
      evidenceRowIds,
      evidenceFingerprintSha256: fullEvidenceFingerprint({
        comparison,
        evidenceRowIds,
        reviewFlags,
      }),
      reviewFlags,
    };
  });
}

export function mergeFullRowReviews(
  existing: FullRowReview[],
  proposed: FullRowReview[],
) {
  const byCase = new Map(existing.map((row) => [row.caseId, row]));
  return proposed.map((row) => {
    const previous = byCase.get(row.caseId);
    if (!previous || !sameEvidence(previous, row)) return row;
    return previous.status === "proposed" && row.status !== "proposed"
      ? row
      : previous;
  });
}

function automaticReviewDecision(category: PhbComparisonCategory) {
  if (category === "exact-match") {
    return "Deterministic comparison found no source-to-DB difference.";
  }
  if (category === "formatting-only") {
    return "Differences reduce to approved formatting normalization; no content correction is required.";
  }
  return null;
}

export function validateFullRowReviews(
  comparisons: FullDbComparisonRow[],
  rows: FullRowReview[],
  requireTerminal: boolean,
) {
  const errors: string[] = [];
  const expected = new Set(comparisons.map((row) => row.caseId));
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const prefix = `rows[${index}]`;
    if (row.schemaVersion !== 1)
      errors.push(`${prefix}.schemaVersion must be 1`);
    if (!expected.has(row.caseId))
      errors.push(`${prefix}.caseId is not in comparison`);
    if (seen.has(row.caseId)) errors.push(`${prefix}.caseId is duplicated`);
    seen.add(row.caseId);
    if (!row.printedName.trim()) errors.push(`${prefix}.printedName is empty`);
    if (row.evidenceRowIds.length === 0)
      errors.push(`${prefix}.evidenceRowIds is empty`);
    if (!SHA256_PATTERN.test(row.evidenceFingerprintSha256)) {
      errors.push(`${prefix}.evidenceFingerprintSha256 is invalid`);
    }
    if (!(["proposed", "accepted", "rejected"] as const).includes(row.status)) {
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
  });
  for (const caseId of expected) {
    if (!seen.has(caseId))
      errors.push(`comparison is missing row review: ${caseId}`);
  }
  return errors;
}

export function validateFullRowReviewEvidence(input: {
  comparisons: FullDbComparisonRow[];
  rows: FullRowReview[];
  evidenceRowIdsByCase: Map<string, string[]>;
}) {
  const expected = buildProposedFullRowReviews(input);
  const actual = new Map(input.rows.map((row) => [row.caseId, row]));
  return expected.flatMap((row) => {
    const current = actual.get(row.caseId);
    if (!current) return [`${row.caseId} row review is missing`];
    return sameEvidence(current, row)
      ? []
      : [`${row.caseId} row review evidence is stale`];
  });
}

export function fullEvidenceFingerprint(input: {
  comparison: FullDbComparisonRow;
  evidenceRowIds: string[];
  reviewFlags: string[];
}) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        stableValue({
          comparison: input.comparison,
          evidenceRowIds: Array.from(new Set(input.evidenceRowIds)).sort(),
          reviewFlags: Array.from(new Set(input.reviewFlags)).sort(),
        }),
      ),
    )
    .digest("hex");
}

function sameEvidence(left: FullRowReview, right: FullRowReview) {
  return (
    left.proposedCategory === right.proposedCategory &&
    JSON.stringify(left.evidenceRowIds) ===
      JSON.stringify(right.evidenceRowIds) &&
    JSON.stringify(left.reviewFlags) === JSON.stringify(right.reviewFlags) &&
    left.evidenceFingerprintSha256 === right.evidenceFingerprintSha256
  );
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
