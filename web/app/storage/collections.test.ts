import { describe, expect, it } from "vitest";

import { LS_KEY_COLLECTIONS, PREPARED_BOOK_ID } from "./keys";
import {
  defaultCollectionsState,
  getBook,
  getBookSpellIds,
  isInBook,
  loadCollections,
  saveCollections,
} from "./collections";
import { installMemoryStorage } from "./storage-test-utils";

installMemoryStorage();

describe("collections storage", () => {
  it("loads defaults when storage is empty or invalid", () => {
    expect(loadCollections()).toEqual(defaultCollectionsState);

    localStorage.setItem(LS_KEY_COLLECTIONS, JSON.stringify({ version: 999, books: [] }));

    expect(loadCollections()).toEqual(defaultCollectionsState);
  });

  it("normalizes books and ensures default books exist", () => {
    localStorage.setItem(
      LS_KEY_COLLECTIONS,
      JSON.stringify({
        version: 2,
        activePreparedBookId: "custom-prepared",
        books: [
          {
            id: " custom ",
            kind: "custom",
            name: " Custom Book ",
            spellIds: [4, 4, -1, 0, 9, 1.5],
          },
          {
            id: "custom-prepared",
            kind: "prepared",
            name: " Prepared Book ",
            entries: [
              { spellId: 2, state: "used", entryId: "entry-1" },
              { spellId: 0 },
            ],
            selectedClassIds: [3, 3, -1, 4],
            selectedDomainIds: [8, 0, 8],
          },
          { id: "", kind: "spellbook", name: "bad", spellIds: [1] },
        ],
      }),
    );

    const state = loadCollections();

    expect(state.activePreparedBookId).toBe("custom-prepared");
    expect(state.books.map((book) => book.id)).toEqual([
      "default",
      "custom",
      "custom-prepared",
      "prepared",
    ]);
    expect(getBook(state, "custom")).toMatchObject({
      id: "custom",
      kind: "custom",
      name: "Custom Book",
      spellIds: [4, 9],
    });
    expect(getBook(state, "custom-prepared")).toMatchObject({
      id: "custom-prepared",
      kind: "prepared",
      name: "Prepared Book",
      entries: [{ entryId: "entry-1", spellId: 2, state: "used" }],
      selectedClassIds: [3, 4],
      selectedDomainIds: [8],
    });
  });

  it("falls back activePreparedBookId when the active prepared book is missing", () => {
    localStorage.setItem(
      LS_KEY_COLLECTIONS,
      JSON.stringify({
        version: 2,
        activePreparedBookId: "missing",
        books: [{ id: "default", kind: "spellbook", name: "Favorite", spellIds: [] }],
      }),
    );

    expect(loadCollections().activePreparedBookId).toBe(PREPARED_BOOK_ID);
  });

  it("saves collections and exposes spell ids across book kinds", () => {
    saveCollections(defaultCollectionsState);

    expect(JSON.parse(localStorage.getItem(LS_KEY_COLLECTIONS) ?? "")).toEqual(
      defaultCollectionsState,
    );

    const spellbook = { id: "a", kind: "spellbook" as const, name: "A", spellIds: [1] };
    const prepared = {
      id: "b",
      kind: "prepared" as const,
      name: "B",
      entries: [
        { entryId: "a", spellId: 2, state: "ok" as const },
        { entryId: "b", spellId: 2, state: "used" as const },
      ],
      selectedClassIds: [],
      selectedDomainIds: [],
    };

    expect(getBookSpellIds(spellbook)).toEqual([1]);
    expect(getBookSpellIds(prepared)).toEqual([2]);
    expect(isInBook(spellbook, 1)).toBe(true);
    expect(isInBook(prepared, 2)).toBe(true);
  });
});
