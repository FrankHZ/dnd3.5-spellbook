import type { SpellComponentFilterKey } from "@dnd/contracts";
import { describe, expect, it } from "vitest";

import { getComponentFilterLabel } from "./ComponentFilterSelector";

const detailLabels = new Map<string, string>([
  ["components.full.material", "材料"],
  ["components.full.arcane-focus", "器材"],
]);

function translateDetail(key: string) {
  return detailLabels.get(key) ?? key;
}

describe("getComponentFilterLabel", () => {
  it("keeps API vocabulary labels for non-localized component filters", () => {
    expect(
      getComponentFilterLabel("material", translateDetail, "Material", false),
    ).toBe("Material");
  });

  it("reuses spell-detail labels for localized component filters", () => {
    expect(
      getComponentFilterLabel(
        "arcane_focus" satisfies SpellComponentFilterKey,
        translateDetail,
        "Arcane focus",
        true,
      ),
    ).toBe("器材");
  });
});
