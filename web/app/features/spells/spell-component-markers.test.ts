import type { SpellComponents } from "@dnd/contracts";
import { describe, expect, it } from "vitest";

import {
  getSpecialComponentMarkers,
  getSpellComponentDisplayItems,
} from "./spell-component-markers";

function components(overrides: Partial<SpellComponents>): SpellComponents {
  return {
    V: true,
    S: true,
    M: false,
    AF: false,
    DF: false,
    XP: false,
    metabreath: false,
    truename: false,
    corrupt: false,
    ...overrides,
  };
}

describe("getSpecialComponentMarkers", () => {
  it("omits ordinary verbal and somatic components", () => {
    expect(
      getSpecialComponentMarkers(components({ V: true, S: true })),
    ).toEqual([]);
  });

  it("returns compact markers for notable spell-list components", () => {
    expect(
      getSpecialComponentMarkers(
        components({ M: true, DF: true, XP: true, truename: true }),
      ),
    ).toEqual(["M", "DF", "XP", "TN"]);
  });

  it("returns full component display items for spell detail", () => {
    expect(
      getSpellComponentDisplayItems(
        components({ V: true, S: true, M: true, AF: true }),
      ).map((item) => [item.id, item.marker, item.fullLabelKey]),
    ).toEqual([
      ["verbal", "V", "components.full.verbal"],
      ["somatic", "S", "components.full.somatic"],
      ["material", "M", "components.full.material"],
      ["arcane-focus", "AF", "components.full.arcane-focus"],
    ]);
  });
});
