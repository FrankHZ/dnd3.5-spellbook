import assert from "node:assert/strict";

import type { PhbPilotManifest } from "./pilot-manifest";
import type { PilotDbComparisonRow } from "./pilot-comparison";
import {
  buildProposedPilotRowReviews,
  mergePilotRowReviews,
  validatePilotRowReviewEvidence,
  validatePilotRowReviews,
} from "./pilot-row-review";

const manifest: PhbPilotManifest = {
  schemaVersion: 1,
  workspace: "phb35",
  status: "proposed",
  sourceManifestSha256: "a".repeat(64),
  reviewer: null,
  decisionNote: null,
  cases: [
    {
      id: "summary",
      printedName: "Spell",
      selectionReasons: ["repeated-summary"],
      locations: [
        {
          sourceId: "phb35-core",
          kind: "class-list",
          zeroBasedPageIndex: 1,
          printedPageNumber: 1,
          anchor: "Owner 1",
        },
      ],
      expectedRisk: "test",
    },
  ],
};

const comparison: PilotDbComparisonRow = {
  schemaVersion: 1,
  caseId: "summary",
  printedName: "Spell",
  category: "manual-review",
  sourcePages: [1],
  dbSpellIds: [1],
  components: [
    {
      component: "shortDescription:1",
      category: "substantive-mismatch",
      sourceValue: "A",
      dbValue: "B",
    },
  ],
  shortDescriptions: {
    occurrenceCount: 2,
    wordingGroupCount: 2,
    wordingGroupKeys: ["a", "b"],
    dbSummaryText: "B",
  },
  reviewFlags: ["short-description-wording-conflict"],
};

const buildInput = {
  manifest,
  comparisons: [comparison],
  entityRowIdsByCase: new Map([["summary", ["row-1", "row-2"]]]),
};
const rows = buildProposedPilotRowReviews(buildInput);

assert.equal(rows[0]?.proposedCategory, "manual-review");
assert.match(rows[0]?.evidenceFingerprintSha256 ?? "", /^[a-f0-9]{64}$/u);
assert.deepEqual(validatePilotRowReviews(manifest, rows, false), []);
assert.match(
  validatePilotRowReviews(manifest, rows, true)[0] ?? "",
  /proposed/,
);

const accepted = rows.map((row) => ({
  ...row,
  status: "accepted" as const,
  reviewer: "main-gate",
  decisionNote: "Accepted fixture evidence.",
}));
assert.deepEqual(
  validatePilotRowReviewEvidence({ ...buildInput, rows: accepted }),
  [],
);
const changedComparison: PilotDbComparisonRow = {
  ...comparison,
  components: comparison.components.map((component) => ({
    ...component,
    sourceValue: "Changed source with the same category and row ids",
  })),
};
const changedInput = { ...buildInput, comparisons: [changedComparison] };
assert.match(
  validatePilotRowReviewEvidence({ ...changedInput, rows: accepted }).join(
    "\n",
  ),
  /fingerprint is stale/,
);
const refreshed = buildProposedPilotRowReviews(changedInput);
assert.equal(mergePilotRowReviews(accepted, refreshed)[0]?.status, "proposed");

console.log("PHB pilot row-review portable tests passed");
