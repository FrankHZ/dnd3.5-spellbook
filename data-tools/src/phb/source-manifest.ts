import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const PHB_SOURCE_MANIFEST_RELATIVE_PATH =
  "phb35/source/source-manifest.json";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_ROLES = ["base", "errata"] as const;

export type PhbSourceArtifactRole = (typeof REQUIRED_ROLES)[number];

export type PhbSourceArtifact = {
  id: string;
  role: PhbSourceArtifactRole;
  title: string;
  relativePath: string;
  mediaType: "application/pdf";
  bytes: number;
  sha256: string;
  edition: string;
  printing: string;
  editionEvidence: string[];
  pdf: {
    pageCount: number;
    textLayerPageCount: number;
    encrypted: boolean;
    metadataTitle: string | null;
    metadataSubject: string | null;
    provenanceWarning: string | null;
  };
  retrieval: {
    kind: "official-download" | "user-provided-local";
    workspaceReceivedOn: string;
    originalRetrievedOn: string | null;
    discoveryUrl: string | null;
    artifactUrl: string | null;
    note: string;
  };
  distributionEvidence: {
    packageUrl: string;
    packageBytes: number;
    packageSha256: string;
    packageEntry: string;
    verifiedOn: string;
  } | null;
};

export type PhbSourceManifest = {
  schemaVersion: 1;
  workspace: "phb35";
  status: "proposed" | "accepted";
  artifacts: PhbSourceArtifact[];
  errataPolicy: {
    relevance: string;
    doubleApplication: string;
  };
};

export type VerifiedPhbSourceArtifact = {
  id: string;
  role: PhbSourceArtifactRole;
  path: string;
  bytes: number;
  sha256: string;
};

export type PhbSourceVerification = {
  manifestPath: string;
  manifestSha256: string;
  manifestCommit: string | null;
  artifacts: VerifiedPhbSourceArtifact[];
};

export function parsePhbSourceManifestText(text: string): PhbSourceManifest {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      `PHB source manifest is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const errors = validatePhbSourceManifest(value);
  if (errors.length > 0) {
    throw new Error(`PHB source manifest is invalid:\n${errors.join("\n")}`);
  }
  return value as PhbSourceManifest;
}

export function validatePhbSourceManifest(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ["manifest must be a JSON object"];

  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (value.workspace !== "phb35") errors.push("workspace must be phb35");
  if (value.status !== "proposed" && value.status !== "accepted") {
    errors.push("status must be proposed or accepted");
  }

  const artifacts = Array.isArray(value.artifacts) ? value.artifacts : [];
  if (!Array.isArray(value.artifacts))
    errors.push("artifacts must be an array");
  if (artifacts.length !== REQUIRED_ROLES.length) {
    errors.push(
      "artifacts must contain exactly one base PDF and one errata PDF",
    );
  }

  const ids = new Set<string>();
  const paths = new Set<string>();
  const roles = new Map<string, number>();
  artifacts.forEach((artifact, index) => {
    validateArtifact(artifact, index, errors);
    if (!isRecord(artifact)) return;
    if (typeof artifact.id === "string") {
      if (ids.has(artifact.id))
        errors.push(`artifacts[${index}].id is duplicated`);
      ids.add(artifact.id);
    }
    if (typeof artifact.relativePath === "string") {
      const key = artifact.relativePath.replace(/\\/g, "/").toLowerCase();
      if (paths.has(key)) {
        errors.push(`artifacts[${index}].relativePath is duplicated`);
      }
      paths.add(key);
    }
    if (typeof artifact.role === "string") {
      roles.set(artifact.role, (roles.get(artifact.role) ?? 0) + 1);
    }
  });
  for (const role of REQUIRED_ROLES) {
    if (roles.get(role) !== 1)
      errors.push(`artifacts must contain one ${role} role`);
  }

  if (!isRecord(value.errataPolicy)) {
    errors.push("errataPolicy must be an object");
  } else {
    requireNonEmptyString(
      value.errataPolicy,
      "relevance",
      "errataPolicy",
      errors,
    );
    requireNonEmptyString(
      value.errataPolicy,
      "doubleApplication",
      "errataPolicy",
      errors,
    );
  }
  return errors;
}

export function readAndVerifyPhbSourceManifest(
  dataRoot: string,
  manifestRelativePath = PHB_SOURCE_MANIFEST_RELATIVE_PATH,
): PhbSourceVerification {
  const manifestPath = resolveInside(dataRoot, manifestRelativePath);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`PHB source manifest not found: ${manifestPath}`);
  }
  const manifestText = fs.readFileSync(manifestPath, "utf8");
  const manifest = parsePhbSourceManifestText(manifestText);
  const artifacts = manifest.artifacts.map((artifact) =>
    verifyArtifact(dataRoot, artifact),
  );
  return {
    manifestPath,
    manifestSha256: sha256Buffer(Buffer.from(manifestText, "utf8")),
    manifestCommit: fileCommit(dataRoot, manifestPath),
    artifacts,
  };
}

export function resolveInside(root: string, relativePath: string) {
  if (path.isAbsolute(relativePath)) {
    throw new Error(
      `Path must be relative to the data repository: ${relativePath}`,
    );
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes the data repository: ${relativePath}`);
  }
  return resolved;
}

export function sha256File(filePath: string) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function verifyArtifact(
  dataRoot: string,
  artifact: PhbSourceArtifact,
): VerifiedPhbSourceArtifact {
  const filePath = resolveInside(dataRoot, artifact.relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Pinned PHB source artifact not found: ${filePath}`);
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile())
    throw new Error(`Pinned artifact is not a file: ${filePath}`);
  if (stat.size !== artifact.bytes) {
    throw new Error(
      `${artifact.id} byte size changed (${artifact.bytes} -> ${stat.size})`,
    );
  }
  const bytes = fs.readFileSync(filePath);
  const sha256 = sha256Buffer(bytes);
  if (sha256 !== artifact.sha256) {
    throw new Error(
      `${artifact.id} SHA-256 changed (${artifact.sha256} -> ${sha256})`,
    );
  }
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error(`${artifact.id} does not start with a PDF header`);
  }
  return {
    id: artifact.id,
    role: artifact.role,
    path: filePath,
    bytes: stat.size,
    sha256,
  };
}

function validateArtifact(value: unknown, index: number, errors: string[]) {
  const prefix = `artifacts[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  requireNonEmptyString(value, "id", prefix, errors);
  if (!REQUIRED_ROLES.includes(value.role as PhbSourceArtifactRole)) {
    errors.push(`${prefix}.role must be base or errata`);
  }
  requireNonEmptyString(value, "title", prefix, errors);
  if (!isSafeRelativePath(value.relativePath)) {
    errors.push(`${prefix}.relativePath must stay inside the data repository`);
  }
  if (value.mediaType !== "application/pdf") {
    errors.push(`${prefix}.mediaType must be application/pdf`);
  }
  if (!Number.isInteger(value.bytes) || (value.bytes as number) <= 0) {
    errors.push(`${prefix}.bytes must be a positive integer`);
  }
  if (typeof value.sha256 !== "string" || !SHA256_PATTERN.test(value.sha256)) {
    errors.push(`${prefix}.sha256 must be lowercase SHA-256`);
  }
  requireNonEmptyString(value, "edition", prefix, errors);
  requireNonEmptyString(value, "printing", prefix, errors);
  if (
    !Array.isArray(value.editionEvidence) ||
    value.editionEvidence.length === 0 ||
    value.editionEvidence.some((entry) => !isNonEmptyString(entry))
  ) {
    errors.push(`${prefix}.editionEvidence must contain non-empty strings`);
  }
  validatePdfEvidence(value.pdf, `${prefix}.pdf`, errors);
  validateRetrieval(value.retrieval, `${prefix}.retrieval`, errors);
  validateDistributionEvidence(
    value.distributionEvidence,
    `${prefix}.distributionEvidence`,
    value.role,
    errors,
  );
}

function validatePdfEvidence(value: unknown, prefix: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (!Number.isInteger(value.pageCount) || (value.pageCount as number) <= 0) {
    errors.push(`${prefix}.pageCount must be a positive integer`);
  }
  if (
    !Number.isInteger(value.textLayerPageCount) ||
    (value.textLayerPageCount as number) < 0 ||
    (value.textLayerPageCount as number) > (value.pageCount as number)
  ) {
    errors.push(
      `${prefix}.textLayerPageCount must be between zero and pageCount`,
    );
  }
  if (typeof value.encrypted !== "boolean") {
    errors.push(`${prefix}.encrypted must be boolean`);
  }
  for (const field of [
    "metadataTitle",
    "metadataSubject",
    "provenanceWarning",
  ] as const) {
    if (value[field] !== null && typeof value[field] !== "string") {
      errors.push(`${prefix}.${field} must be string or null`);
    }
  }
}

function validateRetrieval(value: unknown, prefix: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (
    value.kind !== "official-download" &&
    value.kind !== "user-provided-local"
  ) {
    errors.push(`${prefix}.kind is invalid`);
  }
  validateDate(
    value.workspaceReceivedOn,
    `${prefix}.workspaceReceivedOn`,
    errors,
  );
  if (value.originalRetrievedOn !== null) {
    validateDate(
      value.originalRetrievedOn,
      `${prefix}.originalRetrievedOn`,
      errors,
    );
  }
  validateNullableHttpUrl(value.discoveryUrl, `${prefix}.discoveryUrl`, errors);
  validateNullableHttpUrl(value.artifactUrl, `${prefix}.artifactUrl`, errors);
  requireNonEmptyString(value, "note", prefix, errors);
  if (
    value.kind === "official-download" &&
    (value.discoveryUrl === null || value.artifactUrl === null)
  ) {
    errors.push(
      `${prefix} official downloads require discoveryUrl and artifactUrl`,
    );
  }
}

function validateDistributionEvidence(
  value: unknown,
  prefix: string,
  role: unknown,
  errors: string[],
) {
  if (value === null) {
    if (role === "errata") {
      errors.push(`${prefix} is required for the official errata artifact`);
    }
    return;
  }
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object or null`);
    return;
  }
  validateNullableHttpUrl(
    value.packageUrl,
    `${prefix}.packageUrl`,
    errors,
    false,
  );
  if (
    !Number.isInteger(value.packageBytes) ||
    (value.packageBytes as number) <= 0
  ) {
    errors.push(`${prefix}.packageBytes must be a positive integer`);
  }
  if (
    typeof value.packageSha256 !== "string" ||
    !SHA256_PATTERN.test(value.packageSha256)
  ) {
    errors.push(`${prefix}.packageSha256 must be lowercase SHA-256`);
  }
  requireNonEmptyString(value, "packageEntry", prefix, errors);
  validateDate(value.verifiedOn, `${prefix}.verifiedOn`, errors);
}

function validateDate(value: unknown, name: string, errors: string[]) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    errors.push(`${name} must use YYYY-MM-DD`);
  }
}

function validateNullableHttpUrl(
  value: unknown,
  name: string,
  errors: string[],
  nullable = true,
) {
  if (nullable && value === null) return;
  if (typeof value !== "string") {
    errors.push(`${name} must be an HTTP(S) URL${nullable ? " or null" : ""}`);
    return;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      errors.push(`${name} must be an HTTP(S) URL`);
    }
  } catch {
    errors.push(`${name} must be an HTTP(S) URL`);
  }
}

function isSafeRelativePath(value: unknown) {
  if (typeof value !== "string" || !value || path.isAbsolute(value))
    return false;
  const normalized = value.replace(/\\/g, "/");
  return normalized !== "." && !normalized.split("/").includes("..");
}

function requireNonEmptyString(
  value: Record<string, unknown>,
  field: string,
  prefix: string,
  errors: string[],
) {
  if (!isNonEmptyString(value[field])) {
    errors.push(`${prefix}.${field} must be a non-empty string`);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256Buffer(value: Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileCommit(dataRoot: string, filePath: string) {
  const relativePath = path.relative(dataRoot, filePath).replace(/\\/g, "/");
  try {
    const output = execFileSync(
      "git",
      ["log", "-1", "--format=%H", "--", relativePath],
      {
        cwd: dataRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    return output || null;
  } catch {
    return null;
  }
}
