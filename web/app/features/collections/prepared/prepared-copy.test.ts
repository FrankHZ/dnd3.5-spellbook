import { describe, expect, it } from "vitest";

import type { SpellItemView } from "@dnd/contracts";
import type { PreparedEntry } from "~/storage/collections.type";
import {
  buildDetailedPreparedTsv,
  buildSimplePreparedTsv,
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
});
