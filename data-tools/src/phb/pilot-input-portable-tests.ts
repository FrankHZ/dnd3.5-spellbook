import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

import { buildPilotInputPdfs } from "./pilot-input";
import type { PhbPilotManifest } from "./pilot-manifest";
import { sha256File, type PhbSourceManifest } from "./source-manifest";

async function main() {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "phb-pilot-input-tests-"),
  );
  try {
    const sourcePath = path.join(tempRoot, "artifacts", "source.pdf");
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    const sourcePdf = await PDFDocument.create();
    for (let index = 0; index < 4; index += 1) {
      sourcePdf.addPage([300 + index, 400 + index]);
    }
    fs.writeFileSync(
      sourcePath,
      await sourcePdf.save({ useObjectStreams: false }),
    );
    const sourceManifest = makeSourceManifest(sourcePath);
    const pilotManifest = makePilotManifest();

    const first = await buildPilotInputPdfs({
      dataRoot: tempRoot,
      outputRoot: path.join(tempRoot, "out-one"),
      sourceManifest,
      pilotManifest,
    });
    const second = await buildPilotInputPdfs({
      dataRoot: tempRoot,
      outputRoot: path.join(tempRoot, "out-two"),
      sourceManifest,
      pilotManifest,
    });
    assert.equal(first.length, 1);
    assert.equal(first[0]!.sha256, second[0]!.sha256);
    assert.deepEqual(
      first[0]!.pages.map((page) => page.sourcePageIndex),
      [1, 3],
    );
    assert.deepEqual(first[0]!.pages[0]!.caseIds, [
      "case-1",
      "case-3",
      "case-5",
      "case-7",
    ]);
    console.log("PHB pilot input portable tests passed");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function makeSourceManifest(sourcePath: string): PhbSourceManifest {
  const stat = fs.statSync(sourcePath);
  return {
    schemaVersion: 1,
    workspace: "phb35",
    status: "proposed",
    artifacts: [
      {
        id: "phb35-core",
        role: "base",
        title: "Portable source",
        relativePath: "artifacts/source.pdf",
        mediaType: "application/pdf",
        bytes: stat.size,
        sha256: sha256File(sourcePath),
        edition: "D&D 3.5",
        printing: "Portable fixture",
        editionEvidence: ["Portable fixture"],
        pdf: {
          pageCount: 4,
          textLayerPageCount: 0,
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
          note: "Portable fixture",
        },
        distributionEvidence: null,
      },
    ],
    errataPolicy: {
      relevance: "Portable fixture",
      doubleApplication: "Portable fixture",
    },
  };
}

function makePilotManifest(): PhbPilotManifest {
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
    sourceManifestSha256: "a".repeat(64),
    reviewer: null,
    decisionNote: null,
    cases: reasons.map((reason, index) => ({
      id: `case-${index + 1}`,
      printedName: `Fixture ${index + 1}`,
      selectionReasons: [reason],
      locations: [
        {
          sourceId: "phb35-core",
          kind: reason === "table-or-list" ? "class-list" : "description",
          zeroBasedPageIndex: index % 2 === 0 ? 1 : 3,
          printedPageNumber: index % 2 === 0 ? 1 : 3,
          anchor: `Fixture ${index + 1}`,
        },
      ],
      expectedRisk: "Portable fixture",
    })),
  };
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
