import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { PDFDocument, StandardFonts } from "pdf-lib";

import type { PhbFullExtractionManifest } from "./full-manifest";
import {
  parseFullMineruInputManifest,
  type FullMineruInputManifest,
} from "./full-mineru";
import { verifyMineruRecallInputProvenance } from "./mineru-recall";
import { inspectPdfTextLayer } from "./pdf-baseline";
import { sha256File } from "./source-manifest";

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "phb-mineru-recall-provenance-"),
);

async function main() {
  try {
    const sourceManifestSha256 = "a".repeat(64);
    const sourceArtifactSha256 = "b".repeat(64);
    const fullManifestPath = path.join(
      tempRoot,
      "phb35",
      "review",
      "full-extraction-manifest.json",
    );
    const inputManifestPath = path.join(
      tempRoot,
      "phb35",
      "extracted",
      "full",
      "mineru-input-manifest.json",
    );
    const subsetPath = path.join(
      tempRoot,
      "artifacts",
      "mineru",
      "phb35",
      "full-input",
      "core.full.pdf",
    );
    const sourcePath = path.join(tempRoot, "source.pdf");
    const sourceBytes = await createPdf([
      "SOURCE PAGE ZERO",
      "SOURCE PAGE ONE",
    ]);
    writeBytes(sourcePath, sourceBytes);
    writeBytes(subsetPath, sourceBytes);

    const fullManifest: PhbFullExtractionManifest = {
      schemaVersion: 1,
      workspace: "phb35",
      sourceManifest: {
        relativePath: "phb35/source/source-manifest.json",
        sha256: sourceManifestSha256,
      },
      gate1Review: {
        relativePath: "phb35/review/pilot-e2e-review.json",
        sha256: "c".repeat(64),
        status: "accepted",
      },
      sources: [
        {
          sourceId: "core",
          ranges: [
            {
              kind: "class-list",
              startPageIndex: 0,
              endPageIndex: 1,
              printedPageOffset: 0,
            },
            {
              kind: "description",
              startPageIndex: 1,
              endPageIndex: 1,
              printedPageOffset: 0,
            },
          ],
        },
      ],
      specialHandlers: [
        {
          id: "summon-monster-table",
          sourceId: "core",
          sourcePageIndex: 1,
        },
      ],
      expectedCounts: {
        descriptionSpells: 1,
        printedListRows: 1,
        listOccurrences: 1,
        uniqueListSpellNames: 1,
        classAssociations: 1,
        domainAssociations: 1,
      },
    };
    writeJson(fullManifestPath, fullManifest);
    const { sourcePages } = await inspectPdfTextLayer(sourcePath, new Set([0]));
    const sourcePage = sourcePages[0]!;
    const baseManifest = manifestForSubset({
      sourceManifestSha256,
      fullManifestSha256: sha256File(fullManifestPath),
      sourceArtifactSha256,
      subsetPath,
    });

    const verify = async (value: unknown) => {
      writeJson(inputManifestPath, value);
      return verifyMineruRecallInputProvenance({
        dataRoot: tempRoot,
        inputManifestPath,
        manifest: parseFullMineruInputManifest(value),
        sourceId: "core",
        sourcePageIndex: 0,
        sourceManifestSha256,
        sourceArtifactSha256,
        fullManifestPath,
        fullManifest,
        sourcePage,
      });
    };

    const accepted = await verify(baseManifest);
    assert.equal(accepted.inputManifest.sha256, sha256File(inputManifestPath));
    assert.equal(
      accepted.inputManifest.bytes,
      fs.statSync(inputManifestPath).size,
    );
    assert.equal(accepted.subsetPageIndex, 0);
    assert.equal(
      accepted.subsetPageFingerprintSha256,
      accepted.sourcePageFingerprintSha256,
    );

    const staleSource = structuredClone(baseManifest);
    staleSource.sourceManifest.sha256 = "d".repeat(64);
    await assert.rejects(
      () => verify(staleSource),
      /does not pin the current source manifest/u,
    );

    const staleFull = structuredClone(baseManifest);
    staleFull.fullManifest.sha256 = "e".repeat(64);
    await assert.rejects(
      () => verify(staleFull),
      /does not pin the current full extraction manifest/u,
    );

    writeBytes(subsetPath, Buffer.concat([sourceBytes, Buffer.from([0])]));
    await assert.rejects(() => verify(baseManifest), /input bytes changed/u);
    writeBytes(subsetPath, sourceBytes);

    const invalidIndex = structuredClone(baseManifest);
    invalidIndex.artifacts[0]!.pages[0]!.subsetPageIndex = -1;
    await assert.rejects(
      () => verify(invalidIndex),
      /invalid or non-contiguous/u,
    );

    const swappedMapping = structuredClone(baseManifest);
    swappedMapping.artifacts[0]!.pages[0]!.sourcePageIndex = 1;
    swappedMapping.artifacts[0]!.pages[1]!.sourcePageIndex = 0;
    await assert.rejects(
      () => verify(swappedMapping),
      /page mappings are not canonical/u,
    );

    const shortSubsetBytes = await createPdf(["SOURCE PAGE ZERO"]);
    writeBytes(subsetPath, shortSubsetBytes);
    const shortSubsetManifest = manifestForSubset({
      sourceManifestSha256,
      fullManifestSha256: sha256File(fullManifestPath),
      sourceArtifactSha256,
      subsetPath,
    });
    await assert.rejects(
      () => verify(shortSubsetManifest),
      /subset page count changed/u,
    );

    const swappedSubsetBytes = await createPdf([
      "SOURCE PAGE ONE",
      "SOURCE PAGE ZERO",
    ]);
    writeBytes(subsetPath, swappedSubsetBytes);
    const swappedSubsetManifest = manifestForSubset({
      sourceManifestSha256,
      fullManifestSha256: sha256File(fullManifestPath),
      sourceArtifactSha256,
      subsetPath,
    });
    await assert.rejects(
      () => verify(swappedSubsetManifest),
      /subset page mapping changed/u,
    );

    console.log("PHB MinerU recall provenance portable tests passed");
  } finally {
    const resolvedTempRoot = path.resolve(tempRoot);
    if (
      resolvedTempRoot.startsWith(path.resolve(os.tmpdir()) + path.sep) &&
      path
        .basename(resolvedTempRoot)
        .startsWith("phb-mineru-recall-provenance-")
    ) {
      fs.rmSync(resolvedTempRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

function manifestForSubset(input: {
  sourceManifestSha256: string;
  fullManifestSha256: string;
  sourceArtifactSha256: string;
  subsetPath: string;
}): FullMineruInputManifest {
  return {
    schemaVersion: 1,
    sourceManifest: {
      relativePath: "phb35/source/source-manifest.json",
      sha256: input.sourceManifestSha256,
    },
    fullManifest: {
      relativePath: "phb35/review/full-extraction-manifest.json",
      sha256: input.fullManifestSha256,
    },
    artifacts: [
      {
        sourceId: "core",
        sourceSha256: input.sourceArtifactSha256,
        relativePath: path
          .relative(tempRoot, input.subsetPath)
          .replace(/\\/gu, "/"),
        bytes: fs.statSync(input.subsetPath).size,
        sha256: sha256File(input.subsetPath),
        pages: [
          {
            subsetPageIndex: 0,
            sourcePageIndex: 0,
            printedPageNumber: 0,
            rangeKinds: ["class-list"],
          },
          {
            subsetPageIndex: 1,
            sourcePageIndex: 1,
            printedPageNumber: 1,
            rangeKinds: ["class-list", "description"],
          },
        ],
      },
    ],
  };
}

async function createPdf(pageTexts: string[]) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const text of pageTexts) {
    const page = document.addPage([612, 792]);
    page.drawText(text, { x: 72, y: 720, size: 12, font });
  }
  return Buffer.from(
    await document.save({
      addDefaultPage: false,
      objectsPerTick: Number.POSITIVE_INFINITY,
      useObjectStreams: false,
      updateFieldAppearances: false,
    }),
  );
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeBytes(filePath: string, value: Uint8Array) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}
