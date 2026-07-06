import { describe, expect, it } from "vitest";

import {
  getMechanicDetailNotes,
  hasMechanicDetailNotes,
} from "./mechanic-detail-notes";

describe("mechanic detail notes", () => {
  it("keeps only backend-provided supported detail flags", () => {
    expect(
      getMechanicDetailNotes({
        duration: { dismissible: true },
        savingThrow: { partial: true, harmless: true },
        spellResistance: { object: true },
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
          duration: { discharge: true },
        },
      }),
    ).toBe(true);

    expect(hasMechanicDetailNotes({ duration: "1 round/level" })).toBe(false);
  });
});
