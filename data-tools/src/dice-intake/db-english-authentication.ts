import assert from "node:assert/strict";
import {join} from "node:path";
import {validateQaInputs, type QaRecords} from "./qa";
import {bindCommittedInputs, cityscapeAcceptance as a, handoffFiles,
  validateHandoffEvidence, type HandoffEvidence} from "./db-english-handoff";

/** Fixed accepted sources plus complete QA; destination state is checked by its owner. */
export function authenticateCityscapeInputs(dataRoot: string, rulesPath: string, contentPath: string,
  loaded?: QaRecords) {
  const baselineDir = join(dataRoot, "dice-baselines/issue-520");
  const book = join(dataRoot, a.directory);
  const evidencePaths = handoffFiles.map((file) => join(book, file));
  const acceptedBuffers = bindCommittedInputs(
    dataRoot,
    a.revision,
    evidencePaths,
  );
  bindCommittedInputs(dataRoot, a.preparedRevision, [
    join(book, "target-inputs.jsonl"),
    join(baselineDir, "intake/candidates.jsonl"),
    join(baselineDir, "intake/source-inventory.jsonl"),
  ]);
  const rows = <T>(file: string): T[] =>
    acceptedBuffers
      .get(join(book, file))!
      .toString("utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  const evidence: HandoffEvidence = {
    accepted: rows("out/accepted.jsonl"),
    fallback: rows("out/fallback.jsonl"),
    targetInputs: rows("target-inputs.jsonl"),
    clauses: rows("clause-review.jsonl"),
    unresolved: rows("unresolved.jsonl"),
    semantic: JSON.parse(
      acceptedBuffers
        .get(join(book, "semantic-review.json"))!
        .toString("utf8"),
    ),
  };
  const qa = validateQaInputs([
    "--data-root",
    dataRoot,
    "--baseline-dir",
    baselineDir,
    "--rules-db",
    rulesPath,
    "--content-db",
    contentPath,
    "--rulebook-id",
    "53",
  ], loaded);
  bindCommittedInputs(
    dataRoot,
    a.revision,
    qa.inputPaths.filter(
      (path) => path !== rulesPath && path !== contentPath,
    ),
  );
  assert.equal(
    qa.result.summary.sourceRevision,
    a.sourceRevision,
    "source revision drift",
  );
  assert.equal(
    qa.result.summary.mappingRevision,
    a.sourceRevision,
    "map revision drift",
  );
  const coverage = validateHandoffEvidence(qa, evidence);
  assert.equal(coverage.segments, 64, "accepted clause count drift");
  assert.equal(
    coverage.physicalLines,
    67,
    "accepted English line count drift",
  );
  return {evidence, qa, coverage};
}
