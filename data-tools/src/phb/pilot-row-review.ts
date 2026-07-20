import type { PhbPilotManifest } from "./pilot-manifest";
import type {
  PhbComparisonCategory,
  PilotClassListOccurrenceForComparison,
  PilotDbComparisonRow,
} from "./pilot-comparison";

export type PilotRowReview = {
  schemaVersion: 1;
  caseId: string;
  printedName: string;
  proposedCategory: PhbComparisonCategory;
  status: "proposed" | "accepted" | "rejected";
  reviewer: string | null;
  decisionNote: string | null;
  evidenceRowIds: string[];
  reviewFlags: string[];
};

export function buildProposedPilotRowReviews(input: {
  manifest: PhbPilotManifest;
  comparisons: PilotDbComparisonRow[];
  classListOccurrences: PilotClassListOccurrenceForComparison[];
  entityRowIdsByCase: Map<string, string[]>;
}) {
  return input.manifest.cases.map((pilotCase): PilotRowReview => {
    const comparison = input.comparisons.find(
      (candidate) => candidate.caseId === pilotCase.id,
    );
    const occurrences = input.classListOccurrences.filter(
      (candidate) => candidate.caseId === pilotCase.id,
    );
    const wordingGroups = new Set(
      occurrences.map((candidate) => candidate.wordingGroupKey),
    );
    const reviewFlags = comparison ? [...comparison.reviewFlags] : [];
    if (!comparison && wordingGroups.size > 1) {
      reviewFlags.push("short-description-wording-conflict");
    }
    const proposedCategory =
      comparison?.category ??
      (reviewFlags.length > 0 ? "manual-review" : "exact-match");
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
