import assert from "node:assert/strict";

import type { PhbPilotManifest } from "./pilot-manifest";
import {
  buildProposedPilotRowReviews,
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

const rows = buildProposedPilotRowReviews({
  manifest,
  comparisons: [],
  classListOccurrences: [
    {
      caseId: "summary",
      printedName: "Spell",
      owner: "Owner",
      level: 1,
      summaryText: "A",
      wordingGroupKey: "a",
    },
    {
      caseId: "summary",
      printedName: "Spell",
      owner: "Owner 2",
      level: 1,
      summaryText: "B",
      wordingGroupKey: "b",
    },
  ],
  entityRowIdsByCase: new Map([["summary", ["row-1", "row-2"]]]),
});

assert.equal(rows[0]?.proposedCategory, "manual-review");
assert.deepEqual(validatePilotRowReviews(manifest, rows, false), []);
assert.match(
  validatePilotRowReviews(manifest, rows, true)[0] ?? "",
  /proposed/,
);

console.log("PHB pilot row-review portable tests passed");
