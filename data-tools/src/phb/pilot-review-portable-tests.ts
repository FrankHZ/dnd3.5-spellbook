import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  validatePhbPilotReview,
  verifyReferencedArtifact,
  type PhbPilotReview,
} from "./pilot-review";
import { sha256File } from "./source-manifest";

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
const endToEndArtifacts: PhbPilotReview["artifacts"] = [
  ...pageArtifacts,
  {
    role: "entity-extraction",
    relativePath: "phb35/extracted/pilot/entities-manifest.json",
    sha256: sha,
  },
  {
    role: "errata-overlay",
    relativePath: "phb35/extracted/pilot/errata-overlay-manifest.json",
    sha256: sha,
  },
  {
    role: "db-comparison",
    relativePath: "phb35/extracted/pilot/db-comparison-manifest.json",
    sha256: sha,
  },
  {
    role: "row-review",
    relativePath: "phb35/review/pilot-row-review-manifest.json",
    sha256: sha,
  },
];

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
assert.deepEqual(
  validatePhbPilotReview({
    ...review,
    stage: "end-to-end",
    artifacts: endToEndArtifacts,
  }),
  [],
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

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "phb-review-test-"));
try {
  const relativePath = "phb35/review/errata-inventory.jsonl";
  const fixturePath = path.join(tempRoot, relativePath);
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, "accepted bytes\n", "utf8");
  const reference = { relativePath, sha256: sha256File(fixturePath) };
  verifyReferencedArtifact(tempRoot, reference, "fixture inventory");
  fs.writeFileSync(fixturePath, "mutated bytes\n", "utf8");
  assert.throws(
    () => verifyReferencedArtifact(tempRoot, reference, "fixture inventory"),
    /fixture inventory hash chain is stale/,
  );
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
console.log("PHB pilot review portable tests passed");
