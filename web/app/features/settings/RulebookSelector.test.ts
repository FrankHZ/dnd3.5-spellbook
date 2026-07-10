import type { Edition, Rulebook } from "@dnd/contracts";
import { describe, expect, it } from "vitest";

import {
  getRulebookSettingsCategory,
  groupRulebooksByCategory,
  isMagazineRulebook,
} from "./RulebookSelector";

const coreEdition: Edition = {
  id: 1,
  name: "D&D 3.5 Core",
  system: "DnD 3.5",
  slug: "core-35",
  core: true,
};

const supplementEdition: Edition = {
  id: 5,
  name: "D&D 3.5 Supplements",
  system: "DnD 3.5",
  slug: "supplementals-35",
  core: false,
};

const otherEdition: Edition = {
  id: 3,
  name: "Eberron",
  system: "DnD 3.5",
  slug: "eberron-35",
  core: false,
};

function rulebook(overrides: Partial<Rulebook>): Rulebook {
  return {
    id: 1,
    abbr: "PH",
    name: "Player's Handbook",
    slug: "players-handbook",
    edition: coreEdition,
    ...overrides,
  };
}

describe("rulebook settings grouping", () => {
  it("detects Dragon Magazine sources by stable rulebook identity", () => {
    expect(
      isMagazineRulebook(
        rulebook({
          abbr: "Drg309",
          name: "Dragon Magazine #309",
          slug: "dragon-magazine-309",
          edition: supplementEdition,
        }),
      ),
    ).toBe(true);
    expect(
      isMagazineRulebook(rulebook({ abbr: "Dr", name: "Draconomicon" })),
    ).toBe(false);
  });

  it("classifies core, supplements, magazines, and other rulebooks", () => {
    expect(
      getRulebookSettingsCategory(rulebook({ edition: coreEdition })),
    ).toBe("core");
    expect(
      getRulebookSettingsCategory(
        rulebook({
          abbr: "CAr",
          name: "Complete Arcane",
          edition: supplementEdition,
        }),
      ),
    ).toBe("supplements");
    expect(
      getRulebookSettingsCategory(
        rulebook({
          abbr: "Drg330",
          name: "Dragon Magazine #330",
          slug: "dragon-magazine-330",
          edition: supplementEdition,
        }),
      ),
    ).toBe("magazines");
    expect(
      getRulebookSettingsCategory(
        rulebook({
          abbr: "ECS",
          name: "Eberron Campaign Setting",
          edition: otherEdition,
        }),
      ),
    ).toBe("other");
  });

  it("orders sections as core, supplements, magazines, then other", () => {
    const groups = groupRulebooksByCategory(
      [
        rulebook({
          id: 4,
          abbr: "ECS",
          name: "Eberron Campaign Setting",
          edition: otherEdition,
        }),
        rulebook({
          id: 3,
          abbr: "Drg330",
          name: "Dragon Magazine #330",
          slug: "dragon-magazine-330",
          edition: supplementEdition,
        }),
        rulebook({
          id: 2,
          abbr: "CAr",
          name: "Complete Arcane",
          edition: supplementEdition,
        }),
        rulebook({ id: 1, abbr: "PH", name: "Player's Handbook" }),
      ],
      (rb) => rb.abbr,
    );

    expect(groups.map((group) => group.key)).toEqual([
      "core",
      "supplements",
      "magazines",
      "other",
    ]);
  });
});
