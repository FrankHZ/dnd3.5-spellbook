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
      spellIds: [3, 2, 4],
      invalidEntriesCount: 5,
    });
  });

  it("rejects invalid schema and payload shapes", () => {
    expect(() => parseSpellIdBookImport(null)).toThrow(
      "Invalid import JSON format.",
    );
    expect(() =>
      parseSpellIdBookImport({ schemaVersion: 999, favoriteSpellIds: [] }),
    ).toThrow("Schema version mismatch: expected 1.");
    expect(() =>
      parseSpellIdBookImport({ schemaVersion: 1, favoriteSpellIds: "1,2" }),
    ).toThrow("Invalid import JSON: favoriteSpellIds must be an array.");
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
