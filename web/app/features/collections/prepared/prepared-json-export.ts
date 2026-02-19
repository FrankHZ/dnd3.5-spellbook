import type { PreparedBook, PreparedEntry } from "~/storage/collections.type";
import {
  normalizePositiveIntIds,
  normalizePreparedEntries,
} from "~/storage/prepared-normalize";

export const PREPARED_EXPORT_SCHEMA_VERSION = 1 as const;

export type PreparedCollectionExport = {
  schemaVersion: typeof PREPARED_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  collectionMeta?: {
    id: string;
    name: string;
    kind: "prepared";
  };
  preparedEntries: PreparedEntry[];
  resolutionPrefs: {
    selectedClassIds: number[];
    selectedDomainIds: number[];
  };
};

type PreparedCollectionLike = {
  schemaVersion?: unknown;
  exportedAt?: unknown;
  collectionMeta?: unknown;
  preparedEntries?: unknown;
  resolutionPrefs?: unknown;
};

export type PreparedCollectionImportParsed = {
  entries: PreparedEntry[];
  selectedClassIds: number[];
  selectedDomainIds: number[];
  invalidEntriesCount: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parsePreparedCollectionImport(
  raw: unknown,
  bookId: string,
): PreparedCollectionImportParsed {
  const obj = asRecord(raw) as PreparedCollectionLike | null;
  if (!obj) throw new Error("Invalid import JSON format.");

  if (obj.schemaVersion !== PREPARED_EXPORT_SCHEMA_VERSION) {
    throw new Error(
      `Schema version mismatch: expected ${PREPARED_EXPORT_SCHEMA_VERSION}.`,
    );
  }

  if (!Array.isArray(obj.preparedEntries)) {
    throw new Error("Invalid import JSON: preparedEntries must be an array.");
  }

  const entries = normalizePreparedEntries(obj.preparedEntries, bookId);
  const invalidEntriesCount = obj.preparedEntries.length - entries.length;

  const prefs = asRecord(obj.resolutionPrefs);
  const selectedClassIds = normalizePositiveIntIds(prefs?.selectedClassIds ?? []);
  const selectedDomainIds = normalizePositiveIntIds(prefs?.selectedDomainIds ?? []);

  return {
    entries,
    selectedClassIds,
    selectedDomainIds,
    invalidEntriesCount,
  };
}

export function buildPreparedCollectionExport(
  book: PreparedBook,
): PreparedCollectionExport {
  const preparedEntries = normalizePreparedEntries(book.entries, book.id);
  return {
    schemaVersion: PREPARED_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    collectionMeta: {
      id: book.id,
      name: book.name,
      kind: "prepared",
    },
    preparedEntries,
    resolutionPrefs: {
      selectedClassIds: normalizePositiveIntIds(book.selectedClassIds),
      selectedDomainIds: normalizePositiveIntIds(book.selectedDomainIds),
    },
  };
}

function sanitizeFileToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getPreparedExportFilename(book: PreparedBook): string {
  const base = sanitizeFileToken(book.name) || "prepared";
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-${date}.json`;
}

export function downloadPreparedCollectionExport(
  book: PreparedBook,
): PreparedCollectionExport {
  const payload = buildPreparedCollectionExport(book);
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const filename = getPreparedExportFilename(book);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return payload;
}
