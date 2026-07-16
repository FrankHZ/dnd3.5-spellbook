import { describe, expect, it } from "vitest";

import {
  getMechanicDetailNotes,
  hasMechanicDetailNotes,
} from "./mechanic-detail-notes";

const facet = () => ({
  category: "fixture",
  amount: null,
  unit: null,
  flags: {},
  normalizedText: "Fixture",
  displayCoverage: "complete" as const,
});

describe("mechanic detail notes", () => {
  it("keeps only backend-provided supported detail flags", () => {
    expect(
      getMechanicDetailNotes({
        duration: { ...facet(), dismissible: true },
        savingThrow: { ...facet(), partial: true, harmless: true },
        spellResistance: { ...facet(), object: true },
      }),
    ).toEqual({
      duration: ["dismissible"],
      savingThrow: ["partial", "harmless"],
      spellResistance: ["object"],
    });
  });

  it("detects whether a spell has structured mechanic notes", () => {
    expect(
      hasMechanicDetailNotes({
        duration: "1 round/level",
        mechanics: {
          duration: { ...facet(), discharge: true },
        },
      }),
    ).toBe(true);

    expect(hasMechanicDetailNotes({ duration: "1 round/level" })).toBe(false);
  });
});
