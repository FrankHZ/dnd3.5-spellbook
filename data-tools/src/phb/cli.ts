import fs from "node:fs";
import path from "node:path";

import { localDataDir, repoRoot } from "../shared/env";
import {
  PHB_ERRATA_INVENTORY_RELATIVE_PATH,
  readPhbErrataInventory,
  summarizePhbErrataInventory,
} from "./errata-inventory";
import { inspectPdfTextLayer } from "./pdf-baseline";
import { buildPilotInputPdfs } from "./pilot-input";
import { importMineruPilot } from "./pilot-extraction";
import {
  PHB_PILOT_MANIFEST_RELATIVE_PATH,
  readPhbPilotManifest,
} from "./pilot-manifest";
import {
  PHB_END_TO_END_PILOT_REVIEW_RELATIVE_PATH,
  PHB_PAGE_PILOT_REVIEW_RELATIVE_PATH,
  type PhbPilotReviewStage,
  verifyPhbPilotReview,
} from "./pilot-review";
import {
  PHB_SOURCE_MANIFEST_RELATIVE_PATH,
  parsePhbSourceManifestText,
  readAndVerifyPhbSourceManifest,
  sha256File,
} from "./source-manifest";

const REPORT_PATH = path.join(
  repoRoot(),
  "data-tools",
  "out",
  "phb",
  "source-verify.generated.json",
);

async function verifySource() {
  const dataRoot = localDataDir();
  const verification = readAndVerifyPhbSourceManifest(dataRoot);
  const manifest = parsePhbSourceManifestText(
    fs.readFileSync(verification.manifestPath, "utf8"),
  );
  const pdfReports = [];

  for (const verified of verification.artifacts) {
    const artifact = manifest.artifacts.find(
      (entry) => entry.id === verified.id,
    );
    if (!artifact)
      throw new Error(
        `Verified artifact is missing from manifest: ${verified.id}`,
      );
    const { baseline } = await inspectPdfTextLayer(verified.path);
    const mismatches: string[] = [];
    if (baseline.pageCount !== artifact.pdf.pageCount) {
      mismatches.push(
        `pageCount changed (${artifact.pdf.pageCount} -> ${baseline.pageCount})`,
      );
    }
    if (baseline.textLayerPageCount !== artifact.pdf.textLayerPageCount) {
      mismatches.push(
        `textLayerPageCount changed (${artifact.pdf.textLayerPageCount} -> ${baseline.textLayerPageCount})`,
      );
    }
    if (baseline.encrypted !== artifact.pdf.encrypted) {
      mismatches.push(
        `encrypted changed (${artifact.pdf.encrypted} -> ${baseline.encrypted})`,
      );
    }
    compareNullable(
      "metadata title",
      artifact.pdf.metadataTitle,
      baseline.metadata.title,
      mismatches,
    );
    compareNullable(
      "metadata subject",
      artifact.pdf.metadataSubject,
      baseline.metadata.subject,
      mismatches,
    );
    if (mismatches.length > 0) {
      throw new Error(
        `${artifact.id} PDF evidence changed:\n${mismatches.join("\n")}`,
      );
    }
    pdfReports.push({
      id: artifact.id,
      role: artifact.role,
      relativePath: artifact.relativePath,
      bytes: verified.bytes,
      sha256: verified.sha256,
      extractor: baseline.extractor,
      pageCount: baseline.pageCount,
      textLayerPageCount: baseline.textLayerPageCount,
      metadata: baseline.metadata,
      pageFingerprints: baseline.pages,
    });
  }

  const pilot = readOptionalPilot(dataRoot, verification.manifestSha256);
  const pagePilotReview = readOptionalPagePilotReview(dataRoot);
  const errataInventory = readPhbErrataInventory(dataRoot);
  const report = {
    schemaVersion: 1,
    sourceManifest: {
      relativePath: PHB_SOURCE_MANIFEST_RELATIVE_PATH,
      sha256: verification.manifestSha256,
      dataRepoCommit: verification.manifestCommit,
      status: manifest.status,
    },
    artifacts: pdfReports,
    pilot,
    pagePilotReview,
    errataInventory: {
      relativePath: PHB_ERRATA_INVENTORY_RELATIVE_PATH,
      sha256: sha256File(errataInventory.filePath),
      ...summarizePhbErrataInventory(errataInventory.rows),
    },
    errataPolicy: manifest.errataPolicy,
  };
  writeJson(REPORT_PATH, report);
  console.log("PHB source verification OK");
  console.log(`Report: ${REPORT_PATH}`);
  console.log(
    JSON.stringify(
      {
        manifestSha256: verification.manifestSha256,
        manifestCommit: verification.manifestCommit,
        artifacts: pdfReports.map((entry) => ({
          id: entry.id,
          bytes: entry.bytes,
          sha256: entry.sha256,
          pageCount: entry.pageCount,
          textLayerPageCount: entry.textLayerPageCount,
        })),
        pilotStatus: pilot?.status ?? null,
        pilotCases: pilot?.caseCount ?? 0,
        pagePilotReview: pagePilotReview
          ? {
              stage: pagePilotReview.stage,
              status: pagePilotReview.status,
              sha256: pagePilotReview.sha256,
              commit: pagePilotReview.commit,
            }
          : null,
        errataInventory: summarizePhbErrataInventory(errataInventory.rows),
      },
      null,
      2,
    ),
  );
}

async function verifyPilotAcceptance() {
  await verifySource();
  const dataRoot = localDataDir();
  const expectedStage = pilotReviewStage(optionValue("--stage"));
  const reviewRelativePath =
    optionValue("--review") ??
    (expectedStage === "page-extraction"
      ? PHB_PAGE_PILOT_REVIEW_RELATIVE_PATH
      : PHB_END_TO_END_PILOT_REVIEW_RELATIVE_PATH);
  const result = verifyPhbPilotReview({
    dataRoot,
    reviewRelativePath,
    expectedStage,
    requireAccepted: true,
  });
  const reportPath = path.join(
    repoRoot(),
    "data-tools",
    "out",
    "phb",
    "pilot-verify.generated.json",
  );
  writeJson(reportPath, { schemaVersion: 1, review: result });
  console.log(`PHB ${expectedStage} pilot acceptance verified`);
  console.log(`Report: ${reportPath}`);
}

async function startFullExtraction() {
  await verifySource();
  verifyPhbPilotReview({
    dataRoot: localDataDir(),
    reviewRelativePath: PHB_END_TO_END_PILOT_REVIEW_RELATIVE_PATH,
    expectedStage: "end-to-end",
    requireAccepted: true,
  });
  throw new Error(
    "PHB full extraction is not implemented yet; the accepted end-to-end pilot gate passed",
  );
}

async function preparePilotInput() {
  const dataRoot = localDataDir();
  const verification = readAndVerifyPhbSourceManifest(dataRoot);
  const sourceManifest = parsePhbSourceManifestText(
    fs.readFileSync(verification.manifestPath, "utf8"),
  );
  const { filePath: pilotPath, manifest: pilotManifest } =
    readPhbPilotManifest(dataRoot);
  if (pilotManifest.sourceManifestSha256 !== verification.manifestSha256) {
    throw new Error(
      `Pilot manifest pins ${pilotManifest.sourceManifestSha256}, expected ${verification.manifestSha256}`,
    );
  }
  const outputRoot = path.join(
    dataRoot,
    "artifacts",
    "mineru",
    "phb35",
    "pilot-input",
  );
  const artifacts = await buildPilotInputPdfs({
    dataRoot,
    outputRoot,
    sourceManifest,
    pilotManifest,
  });
  const extractionManifestPath = path.join(
    dataRoot,
    "phb35",
    "extracted",
    "pilot",
    "input-manifest.json",
  );
  writeJson(extractionManifestPath, {
    schemaVersion: 1,
    sourceManifest: {
      relativePath: PHB_SOURCE_MANIFEST_RELATIVE_PATH,
      sha256: verification.manifestSha256,
    },
    pilotManifest: {
      relativePath: PHB_PILOT_MANIFEST_RELATIVE_PATH,
      sha256: sha256File(pilotPath),
      status: pilotManifest.status,
    },
    artifacts,
  });
  console.log("PHB pilot subset PDFs prepared");
  console.log(`Manifest: ${extractionManifestPath}`);
  console.log(
    JSON.stringify(
      artifacts.map((artifact) => ({
        sourceId: artifact.sourceId,
        pages: artifact.pages.length,
        bytes: artifact.bytes,
        sha256: artifact.sha256,
      })),
      null,
      2,
    ),
  );
}

async function importPilotExtraction() {
  const outputArg = optionValue("--mineru-output");
  if (!outputArg) {
    throw new Error(
      "--mineru-output is required when importing a MinerU pilot",
    );
  }
  const dataRoot = localDataDir();
  const verification = readAndVerifyPhbSourceManifest(dataRoot);
  const sourceManifest = parsePhbSourceManifestText(
    fs.readFileSync(verification.manifestPath, "utf8"),
  );
  const result = await importMineruPilot({
    dataRoot,
    mineruOutputRoot: outputArg,
    sourceManifest,
    sourceManifestSha256: verification.manifestSha256,
  });
  const reportPath = path.join(
    repoRoot(),
    "data-tools",
    "out",
    "phb",
    "pilot-extraction.generated.json",
  );
  writeJson(reportPath, result.report);
  console.log("PHB MinerU pilot imported");
  console.log(`Data manifest: ${result.extractionManifestPath}`);
  console.log(`Source-free report: ${reportPath}`);
}

function readOptionalPilot(dataRoot: string, sourceManifestSha256: string) {
  try {
    const { filePath, manifest } = readPhbPilotManifest(dataRoot);
    if (manifest.sourceManifestSha256 !== sourceManifestSha256) {
      throw new Error(
        `Pilot manifest pins ${manifest.sourceManifestSha256}, expected ${sourceManifestSha256}`,
      );
    }
    return {
      relativePath: path.relative(dataRoot, filePath).replace(/\\/g, "/"),
      status: manifest.status,
      caseCount: manifest.cases.length,
      coverage: Array.from(
        new Set(manifest.cases.flatMap((entry) => entry.selectionReasons)),
      ).sort(),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("PHB pilot manifest not found:")
    ) {
      return null;
    }
    throw error;
  }
}

function readOptionalPagePilotReview(dataRoot: string) {
  try {
    return verifyPhbPilotReview({
      dataRoot,
      reviewRelativePath: PHB_PAGE_PILOT_REVIEW_RELATIVE_PATH,
      expectedStage: "page-extraction",
      requireAccepted: false,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("PHB pilot review not found:")
    ) {
      return null;
    }
    throw error;
  }
}

function compareNullable(
  name: string,
  expected: string | null,
  actual: string | null,
  mismatches: string[],
) {
  if (expected !== actual) {
    mismatches.push(
      `${name} changed (${expected ?? "null"} -> ${actual ?? "null"})`,
    );
  }
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function usage(): never {
  throw new Error(
    "Usage: phb:source:verify | phb:pilot:verify [-- --stage page-extraction|end-to-end --review <data-relative-path>] | phb:source:extract -- --pilot --prepare-only | phb:source:extract -- --pilot --mineru-output <data-relative-path>",
  );
}

function optionValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function pilotReviewStage(value: string | undefined): PhbPilotReviewStage {
  if (value === undefined || value === "end-to-end") return "end-to-end";
  if (value === "page-extraction") return value;
  throw new Error(`Invalid --stage value: ${value}`);
}

async function main() {
  const command = process.argv[2] ?? "verify";
  if (command === "verify") {
    await verifySource();
    return;
  }
  if (command === "pilot:verify") {
    await verifyPilotAcceptance();
    return;
  }
  if (
    command === "extract" &&
    process.argv.includes("--pilot") &&
    process.argv.includes("--prepare-only")
  ) {
    await preparePilotInput();
    return;
  }
  if (
    command === "extract" &&
    process.argv.includes("--pilot") &&
    process.argv.includes("--mineru-output")
  ) {
    await importPilotExtraction();
    return;
  }
  if (command === "extract" && !process.argv.includes("--pilot")) {
    await startFullExtraction();
    return;
  }
  usage();
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
