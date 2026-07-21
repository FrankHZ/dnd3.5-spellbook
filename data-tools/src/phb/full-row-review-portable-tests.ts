import assert from "node:assert/strict";

import type { FullDbComparisonRow } from "./full-comparison";
import {
  buildProposedFullRowReviews,
  mergeFullRowReviews,
  validateFullRowReviewEvidence,
  validateFullRowReviews,
} from "./full-row-review";

const comparison: FullDbComparisonRow = {
  schemaVersion: 1,
  caseId: "spell:test",
  printedName: "Test",
  category: "exact-match",
  setMembership: "both",
  sourceEvidence: [],
  sourcePages: [200],
  dbSpellIds: [1],
  components: [],
  shortDescriptions: {
    occurrenceCount: 1,
    wordingGroupCount: 1,
    wordingGroupKeys: ["test"],
    dbSummaryText: "Test summary.",
  },
  reviewFlags: [],
};
const evidence = new Map([[comparison.caseId, ["spell:test", "list:test:1"]]]);
const proposed = buildProposedFullRowReviews({
  comparisons: [comparison],
  evidenceRowIdsByCase: evidence,
});
assert.deepEqual(validateFullRowReviews([comparison], proposed, false), []);
assert.deepEqual(validateFullRowReviews([comparison], proposed, true), []);
assert.equal(proposed[0]!.status, "accepted");
assert.equal(proposed[0]!.reviewer, "data-tools:auto");

const accepted = {
  ...proposed[0]!,
  status: "accepted" as const,
  reviewer: "fixture",
  decisionNote: "Fixture acceptance.",
};
assert.equal(mergeFullRowReviews([accepted], proposed)[0]!.status, "accepted");

const substantive = buildProposedFullRowReviews({
  comparisons: [{ ...comparison, category: "substantive-mismatch" }],
  evidenceRowIdsByCase: evidence,
});
assert.match(
  validateFullRowReviews(
    [{ ...comparison, category: "substantive-mismatch" }],
    substantive,
    true,
  )[0]!,
  /remains proposed/u,
);

const changed = structuredClone(comparison);
changed.components.push({
  component: "body",
  category: "substantive-mismatch",
  sourceValue: "one",
  dbValue: "two",
});
assert.equal(
  validateFullRowReviewEvidence({
    comparisons: [changed],
    rows: [accepted],
    evidenceRowIdsByCase: evidence,
  }).length,
  1,
);

console.log("PHB full row-review portable tests passed");
