import { describe, expect, it } from "vitest";

import type { CollectionsState } from "./collections.type";
import {
  getActivePreparedBook,
  getPreparedBookById,
  getPreparedEntries,
  getPreparedPrefs,
  getPreparedPrefsByBookId,
} from "./collections.selectors";

const state: CollectionsState = {
  version: 2,
  activePreparedBookId: "missing",
  books: [
    {
      id: "spellbook-1",
      kind: "spellbook",
      name: "Favorites",
      spellIds: [1, 2],
    },
    {
      id: "prepared-1",
      kind: "prepared",
      name: "Wizard",
      entries: [{ entryId: "entry-1", spellId: 10, state: "ok" }],
      selectedClassIds: [3],
      selectedDomainIds: [8],
    },
    {
      id: "prepared-2",
      kind: "prepared",
      name: "Cleric",
      entries: [{ entryId: "entry-2", spellId: 20, state: "used" }],
      selectedClassIds: [4],
      selectedDomainIds: [9],
    },
  ],
};

describe("collection selectors", () => {
  it("falls back to the first prepared book when active id is missing", () => {
    expect(getActivePreparedBook(state)?.id).toBe("prepared-1");
    expect(getPreparedEntries(state)).toEqual([
      { entryId: "entry-1", spellId: 10, state: "ok" },
    ]);
    expect(getPreparedPrefs(state)).toEqual({
      selectedClassIds: [3],
      selectedDomainIds: [8],
    });
  });

  it("returns the active prepared book when active id is valid", () => {
    const activeState = { ...state, activePreparedBookId: "prepared-2" };

    expect(getActivePreparedBook(activeState)?.id).toBe("prepared-2");
    expect(getPreparedPrefs(activeState)).toEqual({
      selectedClassIds: [4],
      selectedDomainIds: [9],
    });
  });

  it("does not return non-prepared books from prepared selectors", () => {
    expect(getPreparedBookById(state, "spellbook-1")).toBeNull();
    expect(getPreparedPrefsByBookId(state, "spellbook-1")).toEqual({
      selectedClassIds: [],
      selectedDomainIds: [],
    });
  });
});
