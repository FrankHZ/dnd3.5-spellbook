import fs from "node:fs";

import { resolveInside } from "./source-manifest";

export const PHB_PILOT_MANIFEST_RELATIVE_PATH =
  "phb35/review/pilot-manifest.json";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export const PHB_PILOT_COVERAGE = [
  "ordinary",
  "cross-page-body",
  "column-transition",
  "wrapped-field",
  "table-or-list",
  "repeated-summary",
  "errata-relevant",
] as const;

export type PhbPilotCoverage = (typeof PHB_PILOT_COVERAGE)[number];

export type PhbPilotLocation = {
  sourceId: string;
  kind: "description" | "class-list" | "errata";
  zeroBasedPageIndex: number;
  printedPageNumber: number | null;
  anchor: string;
};

export type PhbPilotCase = {
  id: string;
  printedName: string;
  selectionReasons: PhbPilotCoverage[];
  locations: PhbPilotLocation[];
  expectedRisk: string;
};

export type PhbPilotManifest = {
  schemaVersion: 1;
  workspace: "phb35";
  status: "proposed" | "accepted" | "rejected";
  sourceManifestSha256: string;
  reviewer: string | null;
  decisionNote: string | null;
  cases: PhbPilotCase[];
};

export function parsePhbPilotManifestText(text: string): PhbPilotManifest {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      `PHB pilot manifest is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const errors = validatePhbPilotManifest(value);
  if (errors.length > 0) {
    throw new Error(`PHB pilot manifest is invalid:\n${errors.join("\n")}`);
  }
  return value as PhbPilotManifest;
}

export function readPhbPilotManifest(
  dataRoot: string,
  relativePath = PHB_PILOT_MANIFEST_RELATIVE_PATH,
) {
  const filePath = resolveInside(dataRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`PHB pilot manifest not found: ${filePath}`);
  }
  return {
    filePath,
    manifest: parsePhbPilotManifestText(fs.readFileSync(filePath, "utf8")),
  };
}

export function validatePhbPilotManifest(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) return ["manifest must be a JSON object"];
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (value.workspace !== "phb35") errors.push("workspace must be phb35");
  if (
    value.status !== "proposed" &&
    value.status !== "accepted" &&
    value.status !== "rejected"
  ) {
    errors.push("status must be proposed, accepted, or rejected");
  }
  if (
    typeof value.sourceManifestSha256 !== "string" ||
    !SHA256_PATTERN.test(value.sourceManifestSha256)
  ) {
    errors.push("sourceManifestSha256 must be lowercase SHA-256");
  }
  validateNullableString(value.reviewer, "reviewer", errors);
  validateNullableString(value.decisionNote, "decisionNote", errors);
  if (value.status === "accepted" && !isNonEmptyString(value.reviewer)) {
    errors.push("accepted pilot manifests require reviewer");
  }
  if (value.status !== "proposed" && !isNonEmptyString(value.decisionNote)) {
    errors.push("terminal pilot manifests require decisionNote");
  }

  const cases = Array.isArray(value.cases) ? value.cases : [];
  if (!Array.isArray(value.cases)) errors.push("cases must be an array");
  if (cases.length < 8 || cases.length > 12) {
    errors.push("cases must contain between 8 and 12 representative cases");
  }
  const ids = new Set<string>();
  const coverage = new Set<string>();
  cases.forEach((entry, index) => {
    validatePilotCase(entry, index, errors, coverage);
    if (isRecord(entry) && typeof entry.id === "string") {
      if (ids.has(entry.id)) errors.push(`cases[${index}].id is duplicated`);
      ids.add(entry.id);
    }
  });
  for (const required of PHB_PILOT_COVERAGE) {
    if (!coverage.has(required)) {
      errors.push(`pilot coverage is missing ${required}`);
    }
  }
  return errors;
}

function validatePilotCase(
  value: unknown,
  index: number,
  errors: string[],
  coverage: Set<string>,
) {
  const prefix = `cases[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  requireNonEmptyString(value, "id", prefix, errors);
  requireNonEmptyString(value, "printedName", prefix, errors);
  requireNonEmptyString(value, "expectedRisk", prefix, errors);
  const reasons = Array.isArray(value.selectionReasons)
    ? value.selectionReasons
    : [];
  if (reasons.length === 0) {
    errors.push(`${prefix}.selectionReasons must not be empty`);
  }
  for (const reason of reasons) {
    if (!PHB_PILOT_COVERAGE.includes(reason as PhbPilotCoverage)) {
      errors.push(`${prefix}.selectionReasons contains an invalid value`);
    } else {
      coverage.add(reason as string);
    }
  }
  const locations = Array.isArray(value.locations) ? value.locations : [];
  if (locations.length === 0)
    errors.push(`${prefix}.locations must not be empty`);
  locations.forEach((location, locationIndex) =>
    validateLocation(location, `${prefix}.locations[${locationIndex}]`, errors),
  );
}

function validateLocation(value: unknown, prefix: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  requireNonEmptyString(value, "sourceId", prefix, errors);
  if (
    value.kind !== "description" &&
    value.kind !== "class-list" &&
    value.kind !== "errata"
  ) {
    errors.push(`${prefix}.kind is invalid`);
  }
  if (
    !Number.isInteger(value.zeroBasedPageIndex) ||
    (value.zeroBasedPageIndex as number) < 0
  ) {
    errors.push(`${prefix}.zeroBasedPageIndex must be a non-negative integer`);
  }
  if (
    value.printedPageNumber !== null &&
    (!Number.isInteger(value.printedPageNumber) ||
      (value.printedPageNumber as number) <= 0)
  ) {
    errors.push(
      `${prefix}.printedPageNumber must be a positive integer or null`,
    );
  }
  requireNonEmptyString(value, "anchor", prefix, errors);
}

function validateNullableString(
  value: unknown,
  name: string,
  errors: string[],
) {
  if (value !== null && typeof value !== "string") {
    errors.push(`${name} must be string or null`);
  }
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
