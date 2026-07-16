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
  it("keeps backend-provided notes for raw fallback fields", () => {
    expect(
      getMechanicDetailNotes({
        duration: {
          ...facet(),
          displayCoverage: "partial",
          normalizedText: null,
          dismissible: true,
        },
        savingThrow: {
          ...facet(),
          displayCoverage: "partial",
          normalizedText: null,
          partial: true,
          harmless: true,
        },
        spellResistance: {
          ...facet(),
          displayCoverage: "review",
          normalizedText: null,
          object: true,
        },
      }),
    ).toEqual({
      duration: ["dismissible"],
      savingThrow: ["partial", "harmless"],
      spellResistance: ["object"],
    });
  });

  it("does not repeat notes already represented by complete display values", () => {
    expect(
      getMechanicDetailNotes({
        duration: { ...facet(), dismissible: true },
        savingThrow: { ...facet(), negates: true, harmless: true },
        spellResistance: { ...facet(), object: true },
      }),
    ).toEqual({
      duration: [],
      savingThrow: [],
      spellResistance: [],
    });
  });

  it("detects whether a spell has structured mechanic notes", () => {
    expect(
      hasMechanicDetailNotes({
        duration: "1 round/level",
        mechanics: {
          duration: {
            ...facet(),
            displayCoverage: "partial",
            normalizedText: null,
            discharge: true,
          },
        },
      }),
    ).toBe(true);

    expect(hasMechanicDetailNotes({ duration: "1 round/level" })).toBe(false);
  });
});
