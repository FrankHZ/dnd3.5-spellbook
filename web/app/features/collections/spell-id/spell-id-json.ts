import type { SpellIdBook } from "~/storage/collections.type";
import { normalizePositiveIntIds } from "~/storage/prepared-normalize";

export const SPELL_ID_BOOK_EXPORT_SCHEMA_VERSION = 1 as const;

export type SpellIdBookExport = {
  schemaVersion: typeof SPELL_ID_BOOK_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  favoriteSpellIds: number[];
};

type SpellIdBookLike = {
  schemaVersion?: unknown;
  exportedAt?: unknown;
  favoriteSpellIds?: unknown;
};

export type SpellIdBookImportParsed = {
  spellIds: number[];
  invalidEntriesCount: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseSpellIdBookImport(raw: unknown): SpellIdBookImportParsed {
  const obj = asRecord(raw) as SpellIdBookLike | null;
  if (!obj) throw new Error("Invalid import JSON format.");

  if (obj.schemaVersion !== SPELL_ID_BOOK_EXPORT_SCHEMA_VERSION) {
    throw new Error(
      `Schema version mismatch: expected ${SPELL_ID_BOOK_EXPORT_SCHEMA_VERSION}.`,
    );
  }

  if (!Array.isArray(obj.favoriteSpellIds)) {
    throw new Error("Invalid import JSON: favoriteSpellIds must be an array.");
  }

  const spellIds = normalizePositiveIntIds(obj.favoriteSpellIds);

  return {
    spellIds,
    invalidEntriesCount: obj.favoriteSpellIds.length - spellIds.length,
  };
}

export function buildSpellIdBookExport(book: SpellIdBook): SpellIdBookExport {
  return {
    schemaVersion: SPELL_ID_BOOK_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    favoriteSpellIds: normalizePositiveIntIds(book.spellIds),
  };
}

function sanitizeFileToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getSpellIdBookExportFilename(book: SpellIdBook): string {
  const base = sanitizeFileToken(book.name) || "favorites";
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-${date}.json`;
}

export function downloadSpellIdBookExport(book: SpellIdBook): SpellIdBookExport {
  const payload = buildSpellIdBookExport(book);
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const filename = getSpellIdBookExportFilename(book);
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
