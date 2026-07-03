import { describe, expect, it } from "vitest";

import { getRulebookDisplay } from "./rulebook";

const meta = {
  i18n: { lang: "zh" as const, variant: "default" },
  rulebooks: {
    6: { name: "法术大全" },
  },
  classes: {},
  domains: {},
  schools: {},
  subschools: {},
  descriptors: {},
};

describe("rulebook display helpers", () => {
  it("uses curated display abbreviations in English mode", () => {
    expect(
      getRulebookDisplay(
        meta,
        {
          id: 6,
          abbr: "SC",
          displayAbbr: "SpC",
          name: "Spell Compendium",
        },
        "en",
      ),
    ).toMatchObject({
      abbr: "SpC",
      name: "Spell Compendium",
      sourceAbbr: "SC",
    });
  });

  it("uses Chinese full names as the primary Chinese display label", () => {
    expect(
      getRulebookDisplay(
        meta,
        {
          id: 6,
          abbr: "SC",
          displayAbbr: "SpC",
          name: "Spell Compendium",
        },
        "zh",
      ),
    ).toMatchObject({
      abbr: "法术大全",
      name: "法术大全",
      sourceAbbr: "SC",
    });
  });

  it("falls back to source names and abbreviations when display data is absent", () => {
    expect(
      getRulebookDisplay(undefined, { id: 4, abbr: "PH", name: "Player's Handbook" }, "en"),
    ).toMatchObject({
      abbr: "PH",
      name: "Player's Handbook",
    });
  });
});
