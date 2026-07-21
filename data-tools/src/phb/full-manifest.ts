import fs from "node:fs";

import {
  committedFileCommit,
  resolveInside,
  sha256File,
} from "./source-manifest";

export const PHB_FULL_MANIFEST_RELATIVE_PATH =
  "phb35/review/full-extraction-manifest.json";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RANGE_KINDS = ["class-list", "description", "errata"] as const;

export type PhbFullRangeKind = (typeof RANGE_KINDS)[number];

export type PhbFullExtractionManifest = {
  schemaVersion: 1;
  workspace: "phb35";
  sourceManifest: {
    relativePath: string;
    sha256: string;
  };
  gate1Review: {
    relativePath: string;
    sha256: string;
    status: "accepted";
  };
  sources: Array<{
    sourceId: string;
    ranges: Array<{
      kind: PhbFullRangeKind;
      startPageIndex: number;
      endPageIndex: number;
      printedPageOffset: number;
    }>;
  }>;
  specialHandlers: Array<{
    id: "summon-monster-table";
    sourceId: string;
    sourcePageIndex: number;
  }>;
  expectedCounts: {
    descriptionSpells: number;
    printedListRows: number;
    listOccurrences: number;
    uniqueListSpellNames: number;
    classAssociations: number;
    domainAssociations: number;
  };
};

export function readPhbFullExtractionManifest(dataRoot: string) {
  const filePath = resolveInside(dataRoot, PHB_FULL_MANIFEST_RELATIVE_PATH);
  if (!fs.existsSync(filePath)) {
    throw new Error(`PHB full extraction manifest not found: ${filePath}`);
  }
  const manifest = parsePhbFullExtractionManifestText(
    fs.readFileSync(filePath, "utf8"),
  );
  verifyPinnedArtifact(dataRoot, manifest.sourceManifest, "source manifest");
  verifyPinnedArtifact(dataRoot, manifest.gate1Review, "Gate 1 review");
  committedFileCommit(dataRoot, filePath);
  return { filePath, manifest };
}

export function parsePhbFullExtractionManifestText(
  text: string,
): PhbFullExtractionManifest {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      `PHB full extraction manifest is not valid JSON: ${errorMessage(error)}`,
    );
  }
  const errors = validatePhbFullExtractionManifest(value);
  if (errors.length > 0) {
    throw new Error(
      `PHB full extraction manifest is invalid:\n${errors.join("\n")}`,
    );
  }
  return value as PhbFullExtractionManifest;
}

export function validatePhbFullExtractionManifest(value: unknown) {
  const errors: string[] = [];
  if (!isRecord(value)) return ["manifest must be a JSON object"];
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (value.workspace !== "phb35") errors.push("workspace must be phb35");
  validateArtifact(value.sourceManifest, "sourceManifest", errors, false);
  validateArtifact(value.gate1Review, "gate1Review", errors, true);

  const sources = Array.isArray(value.sources) ? value.sources : [];
  if (!Array.isArray(value.sources) || sources.length !== 2) {
    errors.push("sources must contain the base and errata source");
  }
  const sourceIds = new Set<string>();
  const kinds = new Set<PhbFullRangeKind>();
  sources.forEach((source, sourceIndex) => {
    const prefix = `sources[${sourceIndex}]`;
    if (!isRecord(source)) {
      errors.push(`${prefix} must be an object`);
      return;
    }
    if (!nonEmptyString(source.sourceId)) {
      errors.push(`${prefix}.sourceId must be a non-empty string`);
    } else if (sourceIds.has(source.sourceId)) {
      errors.push(`${prefix}.sourceId is duplicated`);
    } else {
      sourceIds.add(source.sourceId);
    }
    const ranges = Array.isArray(source.ranges) ? source.ranges : [];
    if (!Array.isArray(source.ranges) || ranges.length === 0) {
      errors.push(`${prefix}.ranges must be a non-empty array`);
    }
    ranges.forEach((range, rangeIndex) => {
      const rangePrefix = `${prefix}.ranges[${rangeIndex}]`;
      if (!isRecord(range)) {
        errors.push(`${rangePrefix} must be an object`);
        return;
      }
      if (!RANGE_KINDS.includes(range.kind as PhbFullRangeKind)) {
        errors.push(`${rangePrefix}.kind is invalid`);
      } else {
        kinds.add(range.kind as PhbFullRangeKind);
      }
      if (!nonNegativeInteger(range.startPageIndex)) {
        errors.push(`${rangePrefix}.startPageIndex must be non-negative`);
      }
      if (!nonNegativeInteger(range.endPageIndex)) {
        errors.push(`${rangePrefix}.endPageIndex must be non-negative`);
      }
      if (
        nonNegativeInteger(range.startPageIndex) &&
        nonNegativeInteger(range.endPageIndex) &&
        range.endPageIndex < range.startPageIndex
      ) {
        errors.push(`${rangePrefix} has a reversed page range`);
      }
      if (!Number.isInteger(range.printedPageOffset)) {
        errors.push(`${rangePrefix}.printedPageOffset must be an integer`);
      }
    });
  });
  for (const kind of RANGE_KINDS) {
    if (!kinds.has(kind)) errors.push(`sources are missing ${kind} coverage`);
  }

  const handlers = Array.isArray(value.specialHandlers)
    ? value.specialHandlers
    : [];
  if (!Array.isArray(value.specialHandlers) || handlers.length !== 1) {
    errors.push("specialHandlers must contain Summon Monster table handling");
  }
  handlers.forEach((handler, index) => {
    const prefix = `specialHandlers[${index}]`;
    if (!isRecord(handler)) {
      errors.push(`${prefix} must be an object`);
      return;
    }
    if (handler.id !== "summon-monster-table") {
      errors.push(`${prefix}.id must be summon-monster-table`);
    }
    if (!nonEmptyString(handler.sourceId)) {
      errors.push(`${prefix}.sourceId must be a non-empty string`);
    }
    if (!nonNegativeInteger(handler.sourcePageIndex)) {
      errors.push(`${prefix}.sourcePageIndex must be non-negative`);
    }
  });
  if (!isRecord(value.expectedCounts)) {
    errors.push("expectedCounts must be an object");
  } else {
    for (const field of [
      "descriptionSpells",
      "printedListRows",
      "listOccurrences",
      "uniqueListSpellNames",
      "classAssociations",
      "domainAssociations",
    ] as const) {
      if (!positiveInteger(value.expectedCounts[field])) {
        errors.push(`expectedCounts.${field} must be a positive integer`);
      }
    }
  }
  return errors;
}

function verifyPinnedArtifact(
  dataRoot: string,
  artifact: { relativePath: string; sha256: string },
  label: string,
) {
  const filePath = resolveInside(dataRoot, artifact.relativePath);
  if (!fs.existsSync(filePath))
    throw new Error(`PHB ${label} not found: ${filePath}`);
  const actual = sha256File(filePath);
  if (actual !== artifact.sha256) {
    throw new Error(`PHB ${label} is stale: ${artifact.sha256} -> ${actual}`);
  }
  committedFileCommit(dataRoot, filePath);
}

function validateArtifact(
  value: unknown,
  prefix: string,
  errors: string[],
  requireAccepted: boolean,
) {
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (!safeRelativePath(value.relativePath)) {
    errors.push(`${prefix}.relativePath must stay inside the data repository`);
  }
  if (typeof value.sha256 !== "string" || !SHA256_PATTERN.test(value.sha256)) {
    errors.push(`${prefix}.sha256 must be lowercase SHA-256`);
  }
  if (requireAccepted && value.status !== "accepted") {
    errors.push(`${prefix}.status must be accepted`);
  }
}

function safeRelativePath(value: unknown) {
  return (
    nonEmptyString(value) &&
    !/^(?:[A-Za-z]:|[\\/])/u.test(value) &&
    !value.replace(/\\/gu, "/").split("/").includes("..")
  );
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
