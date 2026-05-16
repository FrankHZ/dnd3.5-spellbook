import { describe, expect, it } from "vitest";

import { summarizePreparedEntry } from "./prepared-entry-summary";

describe("prepared entry summary", () => {
  it("summarizes display overrides, metamagic, level overrides, and notes", () => {
    expect(
      summarizePreparedEntry(
        {
          entryId: "entry-1",
          spellId: 1,
          state: "ok",
          displayNameOverride: " Empowered Missile ",
          metamagic: [
            { key: "empower", name: "Empower", levelAdj: 2 },
            { key: "silent" },
          ],
          levelOverride: 4,
          notes: " boss fight ",
        },
        "Magic Missile",
      ),
    ).toEqual({
      baseName: "Magic Missile",
      effectiveDisplayName: "Empowered Missile",
      hasDisplayNameOverride: true,
      hasMetamagic: true,
      hasLevelOverride: true,
      hasNotes: true,
      metamagicSummary: "Empower (+2), silent",
      metamagicTotalAdj: 2,
    });
  });

  it("falls back to the base name and empty metamagic summary", () => {
    expect(
      summarizePreparedEntry(
        {
          entryId: "entry-1",
          spellId: 1,
          state: "ok",
        },
        "Magic Missile",
      ),
    ).toMatchObject({
      effectiveDisplayName: "Magic Missile",
      hasDisplayNameOverride: false,
      hasMetamagic: false,
      hasLevelOverride: false,
      hasNotes: false,
      metamagicSummary: "None",
      metamagicTotalAdj: 0,
    });
  });
});
