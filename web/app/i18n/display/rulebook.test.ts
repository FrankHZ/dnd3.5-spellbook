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

  it("uses Chinese short labels as the primary Chinese display abbreviation", () => {
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

  it("strips trailing edition text from Chinese rulebook abbreviations", () => {
    expect(
      getRulebookDisplay(
        {
          ...meta,
          rulebooks: {
            4: { name: "玩家手册 v3.5" },
          },
        },
        { id: 4, abbr: "PH", name: "Player's Handbook" },
        "zh",
      ),
    ).toMatchObject({
      abbr: "玩家手册",
      name: "玩家手册 v3.5",
      sourceAbbr: "PH",
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

  it("keeps compact English abbreviations when the Chinese overlay is missing", () => {
    const rulebook = {
      id: 4,
      abbr: "PH",
      displayAbbr: "PHB",
      name: "Player's Handbook",
    };

    expect(getRulebookDisplay(meta, rulebook, "zh")).toMatchObject({
      abbr: "PHB",
      name: "Player's Handbook",
    });
    expect(
      getRulebookDisplay(meta, { ...rulebook, displayAbbr: undefined }, "zh"),
    ).toMatchObject({
      abbr: "PH",
      name: "Player's Handbook",
    });
  });
});
