import type { TFunction } from "i18next";

export type CollectionImportError =
  | {
      code: "INVALID_ROOT";
      details: { actualType: string };
    }
  | {
      code: "SCHEMA_VERSION_MISMATCH";
      details: { expectedVersion: number; receivedVersion: unknown };
    }
  | {
      code: "INVALID_ARRAY_FIELD";
      details: { field: string; actualType: string };
    };

export type CollectionImportResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: CollectionImportError };

export function getImportValueType(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function getCollectionImportErrorMessage(
  error: CollectionImportError,
  t: TFunction<"collections", undefined>,
) {
  switch (error.code) {
    case "INVALID_ROOT":
      return t("import.errors.invalid-format");
    case "SCHEMA_VERSION_MISMATCH":
      return t("import.errors.schema-version-mismatch", {
        expectedVersion: error.details.expectedVersion,
      });
    case "INVALID_ARRAY_FIELD":
      return t("import.errors.field-must-be-array", {
        field: error.details.field,
      });
  }
}
