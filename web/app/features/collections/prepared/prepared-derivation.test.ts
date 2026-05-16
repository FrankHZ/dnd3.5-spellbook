import { describe, expect, it } from "vitest";

import type { SpellItemView } from "@dnd/contracts";
import type { PreparedEntry } from "~/storage/collections.type";
import {
  buildPreparedColumns,
  getEffectivePreparedLevel,
  getPreparedSpellIds,
} from "./prepared-derivation";

function spell(overrides: Partial<SpellItemView> = {}): SpellItemView {
  return {
    id: 1,
    slug: "test-spell",
    name: "Test Spell",
    rulebook: { id: 1, name: "Book", abbr: "B" },
    page: 1,
    school: null,
    subSchool: null,
    descriptors: [],
    components: {
      V: false,
      S: false,
      M: false,
      AF: false,
      DF: false,
      XP: false,
      metabreath: false,
      truename: false,
      corrupt: false,
    },
    classLevels: [
      { id: 1, name: "Wizard", slug: "wizard", prestige: false, level: 3, extra: "" },
      { id: 2, name: "Cleric", slug: "cleric", prestige: false, level: 4, extra: "" },
    ],
    domainLevels: [{ id: 8, name: "Fire", slug: "fire", level: 2, extra: "" }],
    casting: {},
    ...overrides,
  };
}

describe("prepared derivation", () => {
  it("deduplicates prepared spell ids in insertion order", () => {
    expect(
      getPreparedSpellIds([
        { entryId: "a", spellId: 2, state: "ok" },
        { entryId: "b", spellId: 1, state: "ok" },
        { entryId: "c", spellId: 2, state: "used" },
      ]),
    ).toEqual([2, 1]);
  });

  it("uses selected class and domain levels before fallback levels", () => {
    const entry: PreparedEntry = { entryId: "a", spellId: 1, state: "ok" };

    expect(getEffectivePreparedLevel(entry, spell(), [1], [])).toBe(3);
    expect(getEffectivePreparedLevel(entry, spell(), [], [8])).toBe(2);
  });

  it("adds metamagic adjustment and clamps out-of-range levels", () => {
    const entry: PreparedEntry = {
      entryId: "a",
      spellId: 1,
      state: "ok",
      metamagic: [{ key: "heighten", levelAdj: 8 }],
    };

    expect(getEffectivePreparedLevel(entry, spell(), [1], [])).toBe(0);
    expect(
      getEffectivePreparedLevel(
        { ...entry, levelOverride: 12 },
        spell(),
        [1],
        [],
      ),
    ).toBe(0);
  });

  it("places entries into derived level columns", () => {
    const entries: PreparedEntry[] = [
      { entryId: "a", spellId: 1, state: "ok" },
      { entryId: "b", spellId: 2, state: "used", levelOverride: 5 },
    ];
    const spellsById = new Map<number, SpellItemView>([
      [1, spell({ id: 1 })],
      [2, spell({ id: 2 })],
    ]);

    const columns = buildPreparedColumns({
      entries,
      spellsById,
      selectedClassIds: [1],
      selectedDomainIds: [],
    });

    expect(columns[3]).toEqual([entries[0]]);
    expect(columns[5]).toEqual([entries[1]]);
  });
});
