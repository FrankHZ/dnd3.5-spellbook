import { describe, expect, it, vi } from "vitest";

import type { SpellIdBook } from "~/storage/collections.type";
import {
  buildSpellIdBookExport,
  getSpellIdBookExportFilename,
  parseSpellIdBookImport,
} from "./spell-id-json";

describe("spell-id book JSON", () => {
  it("normalizes imported ids and counts invalid entries", () => {
    const parsed = parseSpellIdBookImport({
      schemaVersion: 1,
      favoriteSpellIds: [3, "bad", 2, 3, 0, -1, 1.5, 4],
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        spellIds: [3, 2, 4],
        invalidEntriesCount: 5,
      },
    });
  });

  it("returns structured errors for invalid schema and payload shapes", () => {
    expect(parseSpellIdBookImport(null)).toEqual({
      ok: false,
      error: {
        code: "INVALID_ROOT",
        details: { actualType: "null" },
      },
    });
    expect(
      parseSpellIdBookImport({
        schemaVersion: 999,
        favoriteSpellIds: [],
      }),
    ).toEqual({
      ok: false,
      error: {
        code: "SCHEMA_VERSION_MISMATCH",
        details: { expectedVersion: 1, receivedVersion: 999 },
      },
    });
    expect(
      parseSpellIdBookImport({
        schemaVersion: 1,
        favoriteSpellIds: "1,2",
      }),
    ).toEqual({
      ok: false,
      error: {
        code: "INVALID_ARRAY_FIELD",
        details: { field: "favoriteSpellIds", actualType: "string" },
      },
    });
  });

  it("builds stable export payloads from normalized book ids", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-16T12:34:56.000Z"));

    const book: SpellIdBook = {
      id: "book-1",
      kind: "spellbook",
      name: " Evoker's Picks! ",
      spellIds: [2, 2, 0, 7, -3, 9],
    };

    expect(buildSpellIdBookExport(book)).toEqual({
      schemaVersion: 1,
      exportedAt: "2026-05-16T12:34:56.000Z",
      favoriteSpellIds: [2, 7, 9],
    });
    expect(getSpellIdBookExportFilename(book)).toBe("evoker-s-picks-2026-05-16.json");

    vi.useRealTimers();
  });
});
