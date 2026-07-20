import fs from "node:fs";

import {
  committedFileCommit,
  resolveInside,
  sha256File,
} from "./source-manifest";

export const PHB_PAGE_PILOT_REVIEW_RELATIVE_PATH =
  "phb35/review/pilot-page-extraction-review.json";
export const PHB_END_TO_END_PILOT_REVIEW_RELATIVE_PATH =
  "phb35/review/pilot-e2e-review.json";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const STAGES = ["page-extraction", "end-to-end"] as const;
const ARTIFACT_ROLES = [
  "source-manifest",
  "pilot-manifest",
  "input-manifest",
  "runtime-manifest",
  "extraction-manifest",
  "pages",
  "entity-extraction",
  "errata-overlay",
  "db-comparison",
  "row-review",
] as const;
const PAGE_ARTIFACT_PATHS = {
  "source-manifest": "phb35/source/source-manifest.json",
  "pilot-manifest": "phb35/review/pilot-manifest.json",
  "input-manifest": "phb35/extracted/pilot/input-manifest.json",
  "runtime-manifest": "phb35/source/mineru-runtime.json",
  "extraction-manifest": "phb35/extracted/pilot/extraction-manifest.json",
  pages: "phb35/extracted/pilot/pages.jsonl",
} as const;

export type PhbPilotReviewStage = (typeof STAGES)[number];
type PhbPilotReviewArtifactRole = (typeof ARTIFACT_ROLES)[number];

export type PhbPilotReview = {
  schemaVersion: 1;
  workspace: "phb35";
  stage: PhbPilotReviewStage;
  status: "proposed" | "accepted" | "rejected";
  reviewer: string | null;
  decisionNote: string | null;
  runDate: string;
  artifacts: Array<{
    role: PhbPilotReviewArtifactRole;
    relativePath: string;
    sha256: string;
  }>;
  reproducibility: {
    runCount: number;
    allComparedMineruFilesByteIdentical: boolean;
    importedPagesSha256: string;
    comparedFiles: Array<{ source: string; file: string; sha256: string }>;
  };
  automatedFindings: unknown;
  observedRisks: string[];
  requiredDecision: string;
};

export function parsePhbPilotReviewText(text: string): PhbPilotReview {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      `PHB pilot review is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const errors = validatePhbPilotReview(value);
  if (errors.length > 0) {
    throw new Error(`PHB pilot review is invalid:\n${errors.join("\n")}`);
  }
  return value as PhbPilotReview;
}

export function validatePhbPilotReview(value: unknown) {
  const errors: string[] = [];
  if (!isRecord(value)) return ["review must be an object"];
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (value.workspace !== "phb35") errors.push("workspace must be phb35");
  if (!STAGES.includes(value.stage as PhbPilotReviewStage)) {
    errors.push("stage must be page-extraction or end-to-end");
  }
  if (
    value.status !== "proposed" &&
    value.status !== "accepted" &&
    value.status !== "rejected"
  ) {
    errors.push("status must be proposed, accepted, or rejected");
  }
  validateNullableString(value.reviewer, "reviewer", errors);
  validateNullableString(value.decisionNote, "decisionNote", errors);
  if (value.status !== "proposed") {
    if (!isNonEmptyString(value.reviewer)) {
      errors.push("terminal reviews require reviewer");
    }
    if (!isNonEmptyString(value.decisionNote)) {
      errors.push("terminal reviews require decisionNote");
    }
  }
  if (!isDate(value.runDate)) errors.push("runDate must use YYYY-MM-DD");

  const artifacts = Array.isArray(value.artifacts) ? value.artifacts : [];
  if (!Array.isArray(value.artifacts))
    errors.push("artifacts must be an array");
  const roles = new Set<string>();
  artifacts.forEach((artifact, index) => {
    const prefix = `artifacts[${index}]`;
    if (!isRecord(artifact)) {
      errors.push(`${prefix} must be an object`);
      return;
    }
    if (!ARTIFACT_ROLES.includes(artifact.role as PhbPilotReviewArtifactRole)) {
      errors.push(`${prefix}.role is invalid`);
    } else if (roles.has(artifact.role as string)) {
      errors.push(`${prefix}.role is duplicated`);
    } else {
      roles.add(artifact.role as string);
    }
    if (!isSafePhbPath(artifact.relativePath)) {
      errors.push(`${prefix}.relativePath must stay under phb35/`);
    }
    if (
      typeof artifact.sha256 !== "string" ||
      !SHA256_PATTERN.test(artifact.sha256)
    ) {
      errors.push(`${prefix}.sha256 must be lowercase SHA-256`);
    }
  });
  const requiredRoles = requiredArtifactRoles(
    STAGES.includes(value.stage as PhbPilotReviewStage)
      ? (value.stage as PhbPilotReviewStage)
      : "page-extraction",
  );
  for (const role of requiredRoles) {
    if (!roles.has(role))
      errors.push(`artifacts is missing required role ${role}`);
  }
  for (const [role, expectedPath] of Object.entries(PAGE_ARTIFACT_PATHS)) {
    const artifact = artifacts.find(
      (candidate) => isRecord(candidate) && candidate.role === role,
    );
    if (isRecord(artifact) && artifact.relativePath !== expectedPath) {
      errors.push(`${role} must use ${expectedPath}`);
    }
  }

  if (!isRecord(value.reproducibility)) {
    errors.push("reproducibility must be an object");
  } else {
    if (
      !Number.isInteger(value.reproducibility.runCount) ||
      (value.reproducibility.runCount as number) < 2
    ) {
      errors.push("reproducibility.runCount must be at least 2");
    }
    if (value.reproducibility.allComparedMineruFilesByteIdentical !== true) {
      errors.push(
        "reproducibility.allComparedMineruFilesByteIdentical must be true",
      );
    }
    if (
      typeof value.reproducibility.importedPagesSha256 !== "string" ||
      !SHA256_PATTERN.test(value.reproducibility.importedPagesSha256)
    ) {
      errors.push(
        "reproducibility.importedPagesSha256 must be lowercase SHA-256",
      );
    }
    if (
      !Array.isArray(value.reproducibility.comparedFiles) ||
      value.reproducibility.comparedFiles.length === 0
    ) {
      errors.push("reproducibility.comparedFiles must not be empty");
    } else {
      value.reproducibility.comparedFiles.forEach((entry, index) => {
        if (
          !isRecord(entry) ||
          !isNonEmptyString(entry.source) ||
          !isNonEmptyString(entry.file) ||
          typeof entry.sha256 !== "string" ||
          !SHA256_PATTERN.test(entry.sha256)
        ) {
          errors.push(`reproducibility.comparedFiles[${index}] is invalid`);
        }
      });
    }
  }
  if (
    !Array.isArray(value.observedRisks) ||
    value.observedRisks.some((entry) => !isNonEmptyString(entry))
  ) {
    errors.push("observedRisks must contain strings");
  }
  if (!isNonEmptyString(value.requiredDecision)) {
    errors.push("requiredDecision must be a non-empty string");
  }
  return errors;
}

export function verifyPhbPilotReview(input: {
  dataRoot: string;
  reviewRelativePath: string;
  expectedStage: PhbPilotReviewStage;
  requireAccepted: boolean;
}) {
  const reviewPath = resolveInside(input.dataRoot, input.reviewRelativePath);
  if (!fs.existsSync(reviewPath)) {
    throw new Error(`PHB pilot review not found: ${reviewPath}`);
  }
  const review = parsePhbPilotReviewText(fs.readFileSync(reviewPath, "utf8"));
  if (review.stage !== input.expectedStage) {
    throw new Error(
      `PHB pilot review stage is ${review.stage}, expected ${input.expectedStage}`,
    );
  }
  const reviewCommit = committedFileCommit(input.dataRoot, reviewPath);
  const artifacts = new Map(
    review.artifacts.map((artifact) => [artifact.role, artifact]),
  );
  const artifactCommits: Record<string, string> = {};
  for (const artifact of review.artifacts) {
    const artifactPath = resolveInside(input.dataRoot, artifact.relativePath);
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`PHB pilot artifact not found: ${artifact.relativePath}`);
    }
    const actualSha256 = sha256File(artifactPath);
    if (actualSha256 !== artifact.sha256) {
      throw new Error(
        `PHB pilot artifact is stale: ${artifact.relativePath} (${artifact.sha256} -> ${actualSha256})`,
      );
    }
    artifactCommits[artifact.role] = committedFileCommit(
      input.dataRoot,
      artifactPath,
    );
  }
  const chain = verifyPageArtifactChain(input.dataRoot, artifacts, review);
  if (input.requireAccepted && review.status !== "accepted") {
    throw new Error(
      `PHB ${review.stage} pilot review is ${review.status}; accepted is required`,
    );
  }
  if (input.requireAccepted && chain.sourceStatus !== "accepted") {
    throw new Error(
      `PHB source manifest is ${String(chain.sourceStatus)}; accepted is required`,
    );
  }
  if (input.requireAccepted && chain.pilotStatus !== "accepted") {
    throw new Error(
      `PHB pilot manifest is ${String(chain.pilotStatus)}; accepted is required`,
    );
  }
  return {
    relativePath: input.reviewRelativePath,
    sha256: sha256File(reviewPath),
    commit: reviewCommit,
    stage: review.stage,
    status: review.status,
    reviewer: review.reviewer,
    artifactCount: review.artifacts.length,
    artifactCommits,
    sourceStatus: chain.sourceStatus,
    pilotStatus: chain.pilotStatus,
  };
}

function verifyPageArtifactChain(
  dataRoot: string,
  artifacts: Map<
    PhbPilotReviewArtifactRole,
    PhbPilotReview["artifacts"][number]
  >,
  review: PhbPilotReview,
) {
  const source = requiredArtifact(artifacts, "source-manifest");
  const pilot = requiredArtifact(artifacts, "pilot-manifest");
  const input = requiredArtifact(artifacts, "input-manifest");
  const runtime = requiredArtifact(artifacts, "runtime-manifest");
  const extraction = requiredArtifact(artifacts, "extraction-manifest");
  const pages = requiredArtifact(artifacts, "pages");
  const sourceJson = readObject(dataRoot, source.relativePath);
  const pilotJson = readObject(dataRoot, pilot.relativePath);
  expectHash(pilotJson.sourceManifestSha256, source.sha256, "pilot -> source");

  const inputJson = readObject(dataRoot, input.relativePath);
  expectNestedHash(
    inputJson,
    ["sourceManifest", "sha256"],
    source.sha256,
    "input -> source",
  );
  expectNestedHash(
    inputJson,
    ["pilotManifest", "sha256"],
    pilot.sha256,
    "input -> pilot",
  );

  const extractionJson = readObject(dataRoot, extraction.relativePath);
  expectNestedHash(
    extractionJson,
    ["sourceManifest", "sha256"],
    source.sha256,
    "extraction -> source",
  );
  expectNestedHash(
    extractionJson,
    ["pilotManifest", "sha256"],
    pilot.sha256,
    "extraction -> pilot",
  );
  expectNestedHash(
    extractionJson,
    ["inputManifest", "sha256"],
    input.sha256,
    "extraction -> input",
  );
  expectNestedHash(
    extractionJson,
    ["runtime", "sha256"],
    runtime.sha256,
    "extraction -> runtime",
  );
  expectNestedHash(
    extractionJson,
    ["output", "sha256"],
    pages.sha256,
    "extraction -> pages",
  );
  expectHash(
    review.reproducibility.importedPagesSha256,
    pages.sha256,
    "review -> pages",
  );
  return {
    sourceStatus: sourceJson.status,
    pilotStatus: pilotJson.status,
  };
}

function requiredArtifact(
  artifacts: Map<
    PhbPilotReviewArtifactRole,
    PhbPilotReview["artifacts"][number]
  >,
  role: PhbPilotReviewArtifactRole,
) {
  const artifact = artifacts.get(role);
  if (!artifact) throw new Error(`PHB pilot review is missing ${role}`);
  return artifact;
}

function requiredArtifactRoles(stage: PhbPilotReviewStage) {
  const pageRoles = Object.keys(
    PAGE_ARTIFACT_PATHS,
  ) as PhbPilotReviewArtifactRole[];
  return stage === "page-extraction"
    ? pageRoles
    : [
        ...pageRoles,
        "entity-extraction",
        "errata-overlay",
        "db-comparison",
        "row-review",
      ];
}

function readObject(dataRoot: string, relativePath: string) {
  const value = JSON.parse(
    fs.readFileSync(resolveInside(dataRoot, relativePath), "utf8"),
  ) as unknown;
  if (!isRecord(value))
    throw new Error(`${relativePath} must contain an object`);
  return value;
}

function expectNestedHash(
  value: Record<string, unknown>,
  fields: [string, string],
  expected: string,
  label: string,
) {
  const parent = value[fields[0]];
  expectHash(isRecord(parent) ? parent[fields[1]] : undefined, expected, label);
}

function expectHash(actual: unknown, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(
      `${label} hash chain is stale (${String(actual)} -> ${expected})`,
    );
  }
}

function validateNullableString(
  value: unknown,
  field: string,
  errors: string[],
) {
  if (value !== null && typeof value !== "string") {
    errors.push(`${field} must be string or null`);
  }
}

function isSafePhbPath(value: unknown) {
  return (
    typeof value === "string" &&
    value.startsWith("phb35/") &&
    !value.split("/").includes("..")
  );
}

function isDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
