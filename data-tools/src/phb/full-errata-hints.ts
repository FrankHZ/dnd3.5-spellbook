import fs from "node:fs";

import type { PhbErrataInventoryRow } from "./errata-inventory";
import { committedFileCommit, resolveInside } from "./source-manifest";

export const PHB_FULL_ERRATA_HINTS_RELATIVE_PATH =
  "phb35/review/full-errata-operation-hints.jsonl";

export type PhbFullErrataHintRow = {
  schemaVersion: 1;
  entryId: string;
  operationHints: NonNullable<PhbErrataInventoryRow["operationHints"]>;
  note: string;
};

export function readPhbFullErrataHints(dataRoot: string) {
  const filePath = resolveInside(dataRoot, PHB_FULL_ERRATA_HINTS_RELATIVE_PATH);
  if (!fs.existsSync(filePath)) {
    throw new Error(`PHB full errata hints not found: ${filePath}`);
  }
  const rows = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => parsePhbFullErrataHint(line, index + 1));
  const ids = rows.map((row) => row.entryId);
  if (new Set(ids).size !== ids.length) {
    throw new Error("PHB full errata hints contain duplicate entryId values");
  }
  committedFileCommit(dataRoot, filePath);
  return { filePath, rows };
}

export function parsePhbFullErrataHint(
  text: string,
  lineNumber = 1,
): PhbFullErrataHintRow {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      `PHB full errata hint line ${lineNumber} is not valid JSON: ${errorMessage(error)}`,
    );
  }
  const errors = validatePhbFullErrataHint(value);
  if (errors.length > 0) {
    throw new Error(
      `PHB full errata hint line ${lineNumber} is invalid:\n${errors.join("\n")}`,
    );
  }
  return value as PhbFullErrataHintRow;
}

export function validatePhbFullErrataHint(value: unknown) {
  const errors: string[] = [];
  if (!isRecord(value)) return ["row must be an object"];
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  for (const field of ["entryId", "note"] as const) {
    if (typeof value[field] !== "string" || value[field].trim().length === 0) {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (
    !Array.isArray(value.operationHints) ||
    value.operationHints.length === 0
  ) {
    errors.push("operationHints must be a non-empty array");
  } else {
    value.operationHints.forEach((hint, index) => {
      const prefix = `operationHints[${index}]`;
      if (!isRecord(hint) || hint.kind !== "replace-text") {
        errors.push(`${prefix}.kind must be replace-text`);
        return;
      }
      for (const field of ["target", "replacement"] as const) {
        if (
          typeof hint[field] !== "string" ||
          hint[field].trim().length === 0
        ) {
          errors.push(`${prefix}.${field} must be a non-empty string`);
        }
      }
      if (
        hint.occurrence !== undefined &&
        hint.occurrence !== "first" &&
        hint.occurrence !== "last"
      ) {
        errors.push(`${prefix}.occurrence must be first or last when present`);
      }
    });
  }
  return errors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
