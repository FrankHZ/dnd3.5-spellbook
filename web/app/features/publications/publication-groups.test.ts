import type { Edition, Rulebook } from "@dnd/contracts";
import { describe, expect, it } from "vitest";

import {
  formatPublicationFamily,
  getPublicationAbbr,
  groupRulebooksByPublication,
} from "./publication-groups";

const edition: Edition = {
  id: 1,
  name: "D&D 3.5",
  system: "DnD 3.5",
  slug: "dnd-35",
  core: false,
};

function rulebook(overrides: Partial<Rulebook>): Rulebook {
  return {
    id: 1,
    abbr: "PH",
    name: "Player's Handbook",
    slug: "players-handbook",
    edition,
    publicationCategory: "core",
    publicationFamily: "core",
    publicationSourceKind: "rulebook",
    publicationDisplayOrder: 10,
    publicationReviewStatus: "accepted",
    ...overrides,
  };
}

describe("publication grouping", () => {
  it("orders categories from publication metadata", () => {
    const groups = groupRulebooksByPublication([
      rulebook({
        id: 5,
        abbr: "Web",
        name: "Web Enhancement",
        publicationCategory: "other",
        publicationFamily: "web",
        publicationDisplayOrder: 900,
      }),
      rulebook({
        id: 4,
        abbr: "Drg330",
        name: "Dragon Magazine #330",
        publicationCategory: "magazine",
        publicationFamily: "dragon-magazine",
        publicationSourceKind: "magazine",
        publicationDisplayOrder: 500,
      }),
      rulebook({
        id: 3,
        abbr: "ECS",
        name: "Eberron Campaign Setting",
        publicationCategory: "setting",
        publicationFamily: "eberron",
        publicationDisplayOrder: 300,
      }),
      rulebook({
        id: 2,
        abbr: "CAr",
        name: "Complete Arcane",
        publicationCategory: "supplement",
        publicationFamily: "complete",
        publicationDisplayOrder: 200,
      }),
      rulebook({ id: 1, abbr: "PH", publicationDisplayOrder: 100 }),
    ]);

    expect(groups.map((group) => group.key)).toEqual([
      "core",
      "supplement",
      "setting",
      "magazine",
      "other",
    ]);
    expect(groups.find((group) => group.key === "magazine")).toMatchObject({
      families: [{ key: "dragon-magazine", rulebooks: [{ abbr: "Drg330" }] }],
    });
  });

  it("sorts rulebooks by publication order before display label", () => {
    const groups = groupRulebooksByPublication([
      rulebook({ id: 2, abbr: "B", publicationDisplayOrder: 20 }),
      rulebook({ id: 1, abbr: "A", publicationDisplayOrder: 10 }),
    ]);

    expect(groups[0]?.rulebooks.map((rb) => rb.abbr)).toEqual(["A", "B"]);
  });

  it("uses the curated abbreviation as the stable tie-breaker", () => {
    const groups = groupRulebooksByPublication([
      rulebook({
        id: 1,
        abbr: "Z-source",
        displayAbbr: "A-display",
        publicationDisplayOrder: 10,
      }),
      rulebook({
        id: 2,
        abbr: "A-source",
        displayAbbr: "Z-display",
        publicationDisplayOrder: 10,
      }),
    ]);

    expect(groups[0]?.rulebooks.map((rb) => rb.abbr)).toEqual([
      "Z-source",
      "A-source",
    ]);
  });

  it("formats publication family ids for display", () => {
    expect(formatPublicationFamily("forgotten-realms")).toBe(
      "Forgotten Realms",
    );
  });

  it("prefers the curated display abbreviation over the source abbreviation", () => {
    expect(
      getPublicationAbbr(rulebook({ abbr: "Sc_", displayAbbr: "SpC" })),
    ).toBe("SpC");
    expect(getPublicationAbbr(rulebook({ abbr: "PH" }))).toBe("PH");
  });
});
