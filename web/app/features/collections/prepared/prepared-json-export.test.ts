import { describe, expect, it, vi } from "vitest";

import type { PreparedBook } from "~/storage/collections.type";
import {
  buildPreparedCollectionExport,
  getPreparedExportFilename,
  parsePreparedCollectionImport,
} from "./prepared-json-export";

describe("prepared collection JSON", () => {
  it("normalizes imported entries and resolution prefs", () => {
    const parsed = parsePreparedCollectionImport(
      {
        schemaVersion: 1,
        preparedEntries: [
          { spellId: 4, state: "used", entryId: "kept", notes: " ready " },
          { spellId: 0 },
          { spellId: 5, used: true, metamagic: [{ key: "empower", levelAdj: 2 }] },
          { spellId: "bad" },
        ],
        resolutionPrefs: {
          selectedClassIds: [3, 3, -1, 2],
          selectedDomainIds: [10, 0, 11, 10],
        },
      },
      "book-1",
    );

    expect(parsed.entries).toEqual([
      {
        entryId: "kept",
        spellId: 4,
        state: "used",
        notes: "ready",
        displayNameOverride: undefined,
        levelOverride: undefined,
        metamagic: undefined,
      },
      {
        entryId: "legacy-book-1-2-5",
        spellId: 5,
        state: "used",
        displayNameOverride: undefined,
        levelOverride: undefined,
        metamagic: [{ key: "empower", levelAdj: 2, name: undefined }],
        notes: undefined,
      },
    ]);
    expect(parsed.selectedClassIds).toEqual([3, 2]);
    expect(parsed.selectedDomainIds).toEqual([10, 11]);
    expect(parsed.invalidEntriesCount).toBe(2);
  });

  it("rejects invalid schema and payload shapes", () => {
    expect(() => parsePreparedCollectionImport([], "book-1")).toThrow(
      "Invalid import JSON format.",
    );
    expect(() =>
      parsePreparedCollectionImport({ schemaVersion: 2, preparedEntries: [] }, "book-1"),
    ).toThrow("Schema version mismatch: expected 1.");
    expect(() =>
      parsePreparedCollectionImport({ schemaVersion: 1, preparedEntries: {} }, "book-1"),
    ).toThrow("Invalid import JSON: preparedEntries must be an array.");
  });

  it("builds stable export payloads from normalized prepared books", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-16T12:34:56.000Z"));

    const book: PreparedBook = {
      id: "prep-1",
      kind: "prepared",
      name: " Wizard Prep! ",
      entries: [
        { entryId: "a", spellId: 1, state: "ok" },
        { entryId: "bad", spellId: 0, state: "ok" },
      ],
      selectedClassIds: [5, 5, 1],
      selectedDomainIds: [2, -1, 2],
    };

    expect(buildPreparedCollectionExport(book)).toEqual({
      schemaVersion: 1,
      exportedAt: "2026-05-16T12:34:56.000Z",
      collectionMeta: {
        id: "prep-1",
        name: " Wizard Prep! ",
        kind: "prepared",
      },
      preparedEntries: [{ entryId: "a", spellId: 1, state: "ok" }],
      resolutionPrefs: {
        selectedClassIds: [5, 1],
        selectedDomainIds: [2],
      },
    });
    expect(getPreparedExportFilename(book)).toBe("wizard-prep-2026-05-16.json");

    vi.useRealTimers();
  });
});
