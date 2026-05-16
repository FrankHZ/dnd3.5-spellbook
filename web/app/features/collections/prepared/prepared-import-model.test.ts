import { describe, expect, it } from "vitest";

import type { ResolveSpellNamesResponse } from "@dnd/contracts";
import {
  collectSelectedSpellIds,
  countAddableRows,
  mapResolvedRows,
  parseTsvNames,
  setAmbiguousPickedId,
  summarizeRows,
} from "./prepared-import-model";

const resolveResponse: ResolveSpellNamesResponse = {
  conflictRulebooks: [20, 10],
  results: [
    {
      input: "Magic Missile",
      status: "resolved",
      spellId: 1,
      spell: {} as any,
    },
    {
      input: "Last Breath",
      status: "ambiguous",
      candidates: [
        {
          id: 10,
          name: "Last Breath",
          rulebook: { id: 10, name: "Book A", abbr: "A" },
        } as any,
        {
          id: 20,
          name: "Last Breath",
          rulebook: { id: 20, name: "Book B", abbr: "B" },
        } as any,
      ],
    },
    { input: "Nope", status: "not_found" },
  ],
};

describe("prepared import model", () => {
  it("parses pasted TSV names into trimmed non-empty names", () => {
    expect(parseTsvNames(" Magic Missile\t\nFireball\r\n  Cure Light Wounds ")).toEqual([
      "Magic Missile",
      "Fireball",
      "Cure Light Wounds",
    ]);
  });

  it("maps resolve responses into addable rows with deterministic picks", () => {
    const rows = mapResolvedRows(resolveResponse, {
      getCandidateName: (candidate) => candidate.name,
      getRulebookName: (rulebook) => rulebook.name,
    });

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      key: "0-Magic Missile",
      status: "resolved",
      spellId: 1,
    });
    expect(rows[1]).toMatchObject({
      key: "1-Last Breath",
      status: "ambiguous",
      pickedId: 20,
      defaultPickedId: 20,
    });
    expect(rows[2]).toMatchObject({
      key: "2-Nope",
      status: "not_found",
    });

    expect(summarizeRows(rows)).toEqual({
      resolved: 1,
      conflicts: 1,
      notFound: 1,
    });
    expect(countAddableRows(rows)).toBe(2);
    expect(collectSelectedSpellIds(rows)).toEqual([1, 20]);
  });

  it("updates ambiguous picks without mutating other rows", () => {
    const rows = mapResolvedRows(resolveResponse, {
      getCandidateName: (candidate) => candidate.name,
      getRulebookName: (rulebook) => rulebook.name,
    });

    const next = setAmbiguousPickedId(rows, "1-Last Breath", 10);

    expect(collectSelectedSpellIds(next)).toEqual([1, 10]);
    expect(rows[1]).toMatchObject({ pickedId: 20 });
  });
});
