import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  parsePhbPilotManifestText,
  type PhbPilotManifest,
} from "./pilot-manifest";
import {
  parsePhbSourceManifestText,
  readAndVerifyPhbSourceManifest,
  sha256File,
  type PhbSourceArtifact,
  type PhbSourceManifest,
} from "./source-manifest";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "phb-portable-tests-"));

try {
  const basePath = path.join(tempRoot, "artifacts", "base.pdf");
  const errataPath = path.join(tempRoot, "artifacts", "errata.pdf");
  fs.mkdirSync(path.dirname(basePath), { recursive: true });
  fs.writeFileSync(basePath, "%PDF-1.4\nportable base fixture\n", "ascii");
  fs.writeFileSync(errataPath, "%PDF-1.4\nportable errata fixture\n", "ascii");

  const manifest = sourceManifest(basePath, errataPath);
  const manifestPath = path.join(
    tempRoot,
    "phb35",
    "source",
    "source-manifest.json",
  );
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  assert.deepEqual(
    parsePhbSourceManifestText(JSON.stringify(manifest)),
    manifest,
  );
  const verified = readAndVerifyPhbSourceManifest(tempRoot);
  assert.equal(verified.artifacts.length, 2);
  assert.equal(verified.manifestCommit, null);

  const escaping = structuredClone(manifest);
  escaping.artifacts[0]!.relativePath = "../outside.pdf";
  assert.throws(
    () => parsePhbSourceManifestText(JSON.stringify(escaping)),
    /relativePath must stay inside/,
  );

  fs.appendFileSync(basePath, "changed", "ascii");
  assert.throws(
    () => readAndVerifyPhbSourceManifest(tempRoot),
    /byte size changed/,
  );

  const pilot = pilotManifest(verified.manifestSha256);
  assert.deepEqual(parsePhbPilotManifestText(JSON.stringify(pilot)), pilot);
  const incomplete = structuredClone(pilot);
  incomplete.cases = incomplete.cases.filter(
    (entry) => !entry.selectionReasons.includes("errata-relevant"),
  );
  assert.throws(
    () => parsePhbPilotManifestText(JSON.stringify(incomplete)),
    /pilot coverage is missing errata-relevant/,
  );

  console.log("PHB portable tests passed");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function sourceManifest(
  basePath: string,
  errataPath: string,
): PhbSourceManifest {
  const base = artifact("base", basePath);
  const errata = artifact("errata", errataPath);
  errata.retrieval = {
    kind: "official-download",
    workspaceReceivedOn: "2026-07-19",
    originalRetrievedOn: "2026-07-19",
    discoveryUrl: "https://example.com/support",
    artifactUrl: "https://example.com/errata.zip",
    note: "Portable fixture.",
  };
  errata.distributionEvidence = {
    packageUrl: "https://example.com/errata.zip",
    packageBytes: 123,
    packageSha256: "a".repeat(64),
    packageEntry: "errata.pdf",
    verifiedOn: "2026-07-19",
  };
  return {
    schemaVersion: 1,
    workspace: "phb35",
    status: "proposed",
    artifacts: [base, errata],
    errataPolicy: {
      relevance: "Review only entries that alter the planned spell corpus.",
      doubleApplication:
        "Compare pinned source before applying each correction.",
    },
  };
}

function artifact(
  role: "base" | "errata",
  filePath: string,
): PhbSourceArtifact {
  const stat = fs.statSync(filePath);
  return {
    id: role === "base" ? "phb35-core" : "phb35-errata",
    role,
    title: role === "base" ? "Fixture Handbook" : "Fixture Errata",
    relativePath: `artifacts/${path.basename(filePath)}`,
    mediaType: "application/pdf",
    bytes: stat.size,
    sha256: sha256File(filePath),
    edition: "D&D 3.5",
    printing: "Fixture printing",
    editionEvidence: ["Portable fixture evidence."],
    pdf: {
      pageCount: 1,
      textLayerPageCount: 1,
      encrypted: false,
      metadataTitle: null,
      metadataSubject: null,
      provenanceWarning: null,
    },
    retrieval: {
      kind: "user-provided-local",
      workspaceReceivedOn: "2026-07-19",
      originalRetrievedOn: null,
      discoveryUrl: null,
      artifactUrl: null,
      note: "Portable fixture.",
    },
    distributionEvidence: null,
  };
}

function pilotManifest(sourceManifestSha256: string): PhbPilotManifest {
  const reasons = [
    "ordinary",
    "cross-page-body",
    "column-transition",
    "wrapped-field",
    "table-or-list",
    "repeated-summary",
    "errata-relevant",
    "ordinary",
  ] as const;
  return {
    schemaVersion: 1,
    workspace: "phb35",
    status: "proposed",
    sourceManifestSha256,
    reviewer: null,
    decisionNote: null,
    cases: reasons.map((reason, index) => ({
      id: `case-${index + 1}`,
      printedName: `Fixture ${index + 1}`,
      selectionReasons: [reason],
      locations: [
        {
          sourceId:
            reason === "errata-relevant" ? "phb35-errata" : "phb35-core",
          kind:
            reason === "errata-relevant"
              ? "errata"
              : reason === "table-or-list" || reason === "repeated-summary"
                ? "class-list"
                : "description",
          zeroBasedPageIndex: index,
          printedPageNumber: index + 1,
          anchor: `Fixture ${index + 1}`,
        },
      ],
      expectedRisk: "Portable fixture risk.",
    })),
  };
}
