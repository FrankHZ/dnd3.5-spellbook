import fs from "node:fs";

import { resolveInside } from "./source-manifest";

export const PHB_ERRATA_INVENTORY_RELATIVE_PATH =
  "phb35/review/errata-inventory.jsonl";

export const PHB_ERRATA_DISPOSITIONS = [
  "applicable",
  "already-incorporated",
  "out-of-scope",
  "manual-review",
] as const;

export type PhbErrataDisposition = (typeof PHB_ERRATA_DISPOSITIONS)[number];

export type PhbErrataInventoryRow = {
  schemaVersion: 1;
  entryId: string;
  printedName: string;
  phbPages: number[];
  errataPages: number[];
  disposition: PhbErrataDisposition;
  overlayPolicy:
    | "none"
    | "field-replacement"
    | "targeted-replacement"
    | "full-body-replacement";
  reviewRequired: boolean;
  note: string;
};

export function readPhbErrataInventory(dataRoot: string) {
  const filePath = resolveInside(dataRoot, PHB_ERRATA_INVENTORY_RELATIVE_PATH);
  if (!fs.existsSync(filePath)) {
    throw new Error(`PHB errata inventory not found: ${filePath}`);
  }
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const rows = lines.map((line, index) => {
    let value: unknown;
    try {
      value = JSON.parse(line) as unknown;
    } catch (error) {
      throw new Error(
        `PHB errata inventory line ${index + 1} is not valid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const errors = validatePhbErrataInventoryRow(value);
    if (errors.length > 0) {
      throw new Error(
        `PHB errata inventory line ${index + 1} is invalid:\n${errors.join("\n")}`,
      );
    }
    return value as PhbErrataInventoryRow;
  });
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.entryId)) {
      throw new Error(
        `PHB errata inventory entryId is duplicated: ${row.entryId}`,
      );
    }
    ids.add(row.entryId);
  }
  if (rows.length === 0)
    throw new Error("PHB errata inventory must not be empty");
  return { filePath, rows };
}

export function summarizePhbErrataInventory(rows: PhbErrataInventoryRow[]) {
  return {
    rowCount: rows.length,
    dispositions: Object.fromEntries(
      PHB_ERRATA_DISPOSITIONS.map((disposition) => [
        disposition,
        rows.filter((row) => row.disposition === disposition).length,
      ]),
    ),
    reviewRequiredCount: rows.filter((row) => row.reviewRequired).length,
  };
}

export function validatePhbErrataInventoryRow(value: unknown) {
  const errors: string[] = [];
  if (!isRecord(value)) return ["row must be an object"];
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  for (const field of ["entryId", "printedName", "note"] as const) {
    if (typeof value[field] !== "string" || value[field].trim().length === 0) {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  validatePages(value.phbPages, "phbPages", errors);
  validatePages(value.errataPages, "errataPages", errors);
  if (
    !PHB_ERRATA_DISPOSITIONS.includes(value.disposition as PhbErrataDisposition)
  ) {
    errors.push("disposition is invalid");
  }
  if (
    value.overlayPolicy !== "none" &&
    value.overlayPolicy !== "field-replacement" &&
    value.overlayPolicy !== "targeted-replacement" &&
    value.overlayPolicy !== "full-body-replacement"
  ) {
    errors.push("overlayPolicy is invalid");
  }
  if (typeof value.reviewRequired !== "boolean") {
    errors.push("reviewRequired must be boolean");
  }
  if (
    value.disposition === "already-incorporated" &&
    value.overlayPolicy !== "none"
  ) {
    errors.push("already-incorporated rows must use overlayPolicy none");
  }
  if (value.disposition === "applicable" && value.overlayPolicy === "none") {
    errors.push("applicable rows require an overlay policy");
  }
  return errors;
}

function validatePages(value: unknown, field: string, errors: string[]) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((page) => Number.isInteger(page) && page > 0)
  ) {
    errors.push(`${field} must be a non-empty array of positive integers`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
