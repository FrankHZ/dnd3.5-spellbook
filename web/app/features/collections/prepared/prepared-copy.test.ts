import { describe, expect, it } from "vitest";

import type { SpellItemView } from "@dnd/contracts";
import type { PreparedEntry } from "~/storage/collections.type";
import {
  buildDetailedPreparedTsv,
  buildSimplePreparedTsv,
  hasPreparedCopyRows,
  isPreparedCopyReady,
} from "./prepared-copy";

function spell(id: number, name: string, level: number): SpellItemView {
  return {
    id,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    i18n: { lang: "zh", name: `${name} zh` },
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
      { id: 1, name: "Wizard", slug: "wizard", prestige: false, level, extra: "" },
    ],
    domainLevels: [],
    casting: {},
  };
}

describe("prepared copy helpers", () => {
  it("requires a complete successful batch before enabling copy", () => {
    const entries: PreparedEntry[] = [
      { entryId: "a", spellId: 1, state: "ok" },
      { entryId: "b", spellId: 2, state: "used" },
    ];
    const completeById = new Map([
      [1, spell(1, "Magic Missile", 1)],
      [2, spell(2, "Shield", 1)],
    ]);

    expect(
      isPreparedCopyReady({
        entries,
        byId: completeById,
        isBatchSuccess: false,
        isBatchFetching: true,
        missingIds: [],
      }),
    ).toBe(false);
    expect(
      isPreparedCopyReady({
        entries,
        byId: completeById,
        isBatchSuccess: false,
        isBatchFetching: false,
        missingIds: [],
      }),
    ).toBe(false);
    expect(
      isPreparedCopyReady({
        entries,
        byId: completeById,
        isBatchSuccess: true,
        isBatchFetching: false,
        missingIds: [2],
      }),
    ).toBe(false);
    expect(
      isPreparedCopyReady({
        entries,
        byId: new Map([[1, completeById.get(1)!]]),
        isBatchSuccess: true,
        isBatchFetching: false,
        missingIds: [],
      }),
    ).toBe(false);
    expect(
      isPreparedCopyReady({
        entries,
        byId: completeById,
        isBatchSuccess: true,
        isBatchFetching: false,
        missingIds: [],
      }),
    ).toBe(true);
    expect(
      isPreparedCopyReady({
        entries: [],
        byId: new Map(),
        isBatchSuccess: true,
        isBatchFetching: false,
        missingIds: [],
      }),
    ).toBe(false);
  });

  it("builds simple TSV columns and sanitizes cell text", () => {
    const entries: PreparedEntry[][] = Array.from({ length: 10 }, () => []);
    entries[1].push({
      entryId: "a",
      spellId: 1,
      state: "ok",
      displayNameOverride: "Line\nBreak\tSpell",
    });

    const tsv = buildSimplePreparedTsv({
      columns: entries,
      byId: new Map([[1, spell(1, "Magic Missile", 1)]]),
      getVisibleName: (s) => s.name,
    });

    expect(tsv.split("\n")[0]).toBe(
      "Level 0\tLevel 1\tLevel 2\tLevel 3\tLevel 4\tLevel 5\tLevel 6\tLevel 7\tLevel 8\tLevel 9",
    );
    expect(tsv.split("\n")[1]).toBe("\tLine Break Spell\t\t\t\t\t\t\t\t");
    expect(hasPreparedCopyRows(tsv)).toBe(true);
  });

  it("builds detailed TSV rows and can aggregate matching entries", () => {
    const entries: PreparedEntry[] = [
      {
        entryId: "a",
        spellId: 1,
        state: "used",
        metamagic: [{ key: "empower", name: "Empower", levelAdj: 2 }],
        notes: "first",
      },
      {
        entryId: "b",
        spellId: 1,
        state: "ok",
        metamagic: [{ key: "empower", name: "Empower", levelAdj: 2 }],
        notes: "first",
      },
    ];

    const tsv = buildDetailedPreparedTsv({
      entries,
      byId: new Map([[1, spell(1, "Magic Missile", 1)]]),
      selectedClassIds: [1],
      selectedDomainIds: [],
      aggregateRows: true,
      getVisibleName: (s) => s.name,
    });

    expect(tsv.split("\n")).toEqual([
      "SpellId\tName (EN)\tName (ZH)\tLevel\tPreparedCount\tUsedCount\tDisplayName\tMetamagic\tLevelAdj\tNotes",
      "1\tMagic Missile\tMagic Missile zh\t3\t2\t1\tMagic Missile\tEmpower (+2)\t2\tfirst",
    ]);
  });

  it("rejects header-only or incomplete copy output", () => {
    const columns: PreparedEntry[][] = Array.from({ length: 10 }, () => []);
    const entry: PreparedEntry = {
      entryId: "missing",
      spellId: 99,
      state: "ok",
    };
    columns[0].push(entry);

    expect(hasPreparedCopyRows("Level 0\tLevel 1")).toBe(false);
    expect(hasPreparedCopyRows("Level 0\tLevel 1\n\t")).toBe(false);
    expect(() =>
      buildSimplePreparedTsv({
        columns,
        byId: new Map(),
        getVisibleName: (s) => s.name,
      }),
    ).toThrow("Missing prepared spell data for id 99");
    expect(() =>
      buildDetailedPreparedTsv({
        entries: [entry],
        byId: new Map(),
        selectedClassIds: [],
        selectedDomainIds: [],
        aggregateRows: true,
        getVisibleName: (s) => s.name,
      }),
    ).toThrow("Missing prepared spell data for id 99");
  });
});
