import assert from "node:assert/strict";

import { validatePhbPilotReview, type PhbPilotReview } from "./pilot-review";

const sha = "a".repeat(64);
const pageArtifactPaths: Array<
  [PhbPilotReview["artifacts"][number]["role"], string]
> = [
  ["source-manifest", "phb35/source/source-manifest.json"],
  ["pilot-manifest", "phb35/review/pilot-manifest.json"],
  ["input-manifest", "phb35/extracted/pilot/input-manifest.json"],
  ["runtime-manifest", "phb35/source/mineru-runtime.json"],
  ["extraction-manifest", "phb35/extracted/pilot/extraction-manifest.json"],
  ["pages", "phb35/extracted/pilot/pages.jsonl"],
];
const pageArtifacts: PhbPilotReview["artifacts"] = pageArtifactPaths.map(
  ([role, relativePath]) => ({
    role,
    relativePath,
    sha256: sha,
  }),
);

const review: PhbPilotReview = {
  schemaVersion: 1,
  workspace: "phb35",
  stage: "page-extraction",
  status: "proposed",
  reviewer: null,
  decisionNote: null,
  runDate: "2026-07-20",
  artifacts: pageArtifacts,
  reproducibility: {
    runCount: 2,
    allComparedMineruFilesByteIdentical: true,
    importedPagesSha256: sha,
    comparedFiles: [{ source: "fixture", file: "content.json", sha256: sha }],
  },
  automatedFindings: {},
  observedRisks: ["Fixture risk."],
  requiredDecision: "Accept only this fixture stage.",
};

assert.deepEqual(validatePhbPilotReview(review), []);
assert.match(
  validatePhbPilotReview({ ...review, status: "accepted" }).join("\n"),
  /terminal reviews require reviewer/,
);
assert.match(
  validatePhbPilotReview({ ...review, stage: "end-to-end" }).join("\n"),
  /missing required role entity-extraction/,
);
assert.match(
  validatePhbPilotReview({
    ...review,
    artifacts: pageArtifacts.map((artifact, index) =>
      index === 0
        ? { ...artifact, relativePath: "phb35/other.json" }
        : artifact,
    ),
  }).join("\n"),
  /source-manifest must use phb35\/source\/source-manifest.json/,
);
console.log("PHB pilot review portable tests passed");
