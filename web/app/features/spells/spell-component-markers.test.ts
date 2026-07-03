import type { SpellComponents } from "@dnd/contracts";
import { describe, expect, it } from "vitest";

import { getSpecialComponentMarkers } from "./spell-component-markers";

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
    expect(getSpecialComponentMarkers(components({ V: true, S: true }))).toEqual(
      [],
    );
  });

  it("returns compact markers for notable spell-list components", () => {
    expect(
      getSpecialComponentMarkers(
        components({ M: true, DF: true, XP: true, truename: true }),
      ),
    ).toEqual(["M", "DF", "XP", "TN"]);
  });
});
