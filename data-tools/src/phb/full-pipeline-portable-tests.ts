import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  PHB_FULL_DETACHED_TABLES_RELATIVE_PATH,
  PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH,
  PHB_FULL_ENTITIES_RELATIVE_PATH,
  PHB_FULL_ISSUES_RELATIVE_PATH,
  PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH,
  PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH,
  PHB_FULL_LIST_ROWS_RELATIVE_PATH,
  PHB_FULL_MINERU_TABLES_RELATIVE_PATH,
} from "./full-extraction";
import { PHB_FULL_ERRATA_HINTS_RELATIVE_PATH } from "./full-errata-hints";
import {
  assertEmptyJsonl,
  PHB_FULL_DB_COMPARISON_RELATIVE_PATH,
  PHB_FULL_ERRATA_MANIFEST_RELATIVE_PATH,
  PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH,
  verifyFullComparisonArtifacts,
  verifyRowReviewEvidenceArtifacts,
} from "./full-pipeline";
import { sha256File } from "./source-manifest";

const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "phb-full-chain-"));
try {
  const inputs = [
    PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH,
    "phb35/review/errata-inventory.jsonl",
    PHB_FULL_ERRATA_HINTS_RELATIVE_PATH,
    PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH,
    PHB_FULL_DB_COMPARISON_RELATIVE_PATH,
    "phb35/extracted/pilot/entities.jsonl",
    PHB_FULL_ENTITIES_RELATIVE_PATH,
    PHB_FULL_LIST_ROWS_RELATIVE_PATH,
    PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH,
    PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH,
    PHB_FULL_DETACHED_TABLES_RELATIVE_PATH,
    PHB_FULL_MINERU_TABLES_RELATIVE_PATH,
    PHB_FULL_ISSUES_RELATIVE_PATH,
  ];
  inputs.forEach((relativePath) => write(relativePath, ""));

  const errataManifest = {
    entitiesManifest: artifact(PHB_FULL_ENTITIES_MANIFEST_RELATIVE_PATH),
    inventory: artifact("phb35/review/errata-inventory.jsonl"),
    operationHints: artifact(PHB_FULL_ERRATA_HINTS_RELATIVE_PATH),
    output: artifact(PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH),
  };
  write(PHB_FULL_ERRATA_MANIFEST_RELATIVE_PATH, JSON.stringify(errataManifest));
  const comparisonManifest = {
    output: artifact(PHB_FULL_DB_COMPARISON_RELATIVE_PATH),
    errataManifest: artifact(PHB_FULL_ERRATA_MANIFEST_RELATIVE_PATH),
    pilotSummonTable: artifact("phb35/extracted/pilot/entities.jsonl"),
  };
  verifyFullComparisonArtifacts(dataRoot, comparisonManifest);

  write(PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH, "changed\n");
  assert.throws(
    () => verifyFullComparisonArtifacts(dataRoot, comparisonManifest),
    /errata manifest -> overlays/u,
  );
  write(PHB_FULL_ERRATA_OVERLAYS_RELATIVE_PATH, "");

  write("phb35/extracted/pilot/entities.jsonl", "changed\n");
  assert.throws(
    () => verifyFullComparisonArtifacts(dataRoot, comparisonManifest),
    /pilot summon table/u,
  );
  write("phb35/extracted/pilot/entities.jsonl", "");

  const rowReviewManifest = {
    evidence: {
      entities: artifact(PHB_FULL_ENTITIES_RELATIVE_PATH),
      listRows: artifact(PHB_FULL_LIST_ROWS_RELATIVE_PATH),
      listOccurrences: artifact(PHB_FULL_LIST_OCCURRENCES_RELATIVE_PATH),
      listFootnotes: artifact(PHB_FULL_LIST_FOOTNOTES_RELATIVE_PATH),
      detachedTables: artifact(PHB_FULL_DETACHED_TABLES_RELATIVE_PATH),
      mineruTables: artifact(PHB_FULL_MINERU_TABLES_RELATIVE_PATH),
    },
  };
  verifyRowReviewEvidenceArtifacts(dataRoot, rowReviewManifest);
  write(PHB_FULL_DETACHED_TABLES_RELATIVE_PATH, "changed\n");
  assert.throws(
    () => verifyRowReviewEvidenceArtifacts(dataRoot, rowReviewManifest),
    /detachedTables/u,
  );
  write(PHB_FULL_DETACHED_TABLES_RELATIVE_PATH, "");
  write(PHB_FULL_MINERU_TABLES_RELATIVE_PATH, "changed\n");
  assert.throws(
    () => verifyRowReviewEvidenceArtifacts(dataRoot, rowReviewManifest),
    /mineruTables/u,
  );

  assertEmptyJsonl(
    resolve(PHB_FULL_ISSUES_RELATIVE_PATH),
    "description issues",
  );
  write(PHB_FULL_ISSUES_RELATIVE_PATH, '{"issue":"unresolved"}\n');
  assert.throws(
    () =>
      assertEmptyJsonl(
        resolve(PHB_FULL_ISSUES_RELATIVE_PATH),
        "description issues",
      ),
    /must be empty/u,
  );
} finally {
  fs.rmSync(dataRoot, { recursive: true, force: true });
}

console.log("PHB full pipeline portable tests passed");

function artifact(relativePath: string) {
  return { relativePath, sha256: sha256File(resolve(relativePath)) };
}

function write(relativePath: string, content: string) {
  const filePath = resolve(relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function resolve(relativePath: string) {
  return path.join(dataRoot, ...relativePath.split("/"));
}
