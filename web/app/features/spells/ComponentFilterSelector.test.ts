import type { SpellComponentFilterKey } from "@dnd/contracts";
import { describe, expect, it } from "vitest";

import { getComponentFilterDisplayLabel } from "~/i18n/display/spell-filter";

const labels = new Map<string, string>([
  ["components.options.material", "材料"],
  ["components.options.arcane-focus", "器材"],
]);

function t(key: string, options?: { defaultValue?: string }) {
  return labels.get(key) ?? options?.defaultValue ?? key;
}

describe("getComponentFilterDisplayLabel", () => {
  function item(key: SpellComponentFilterKey, label: string) {
    return { key, label, abbreviation: label.slice(0, 1).toUpperCase() };
  }

  it("keeps API vocabulary labels when a localized key is missing", () => {
    expect(
      getComponentFilterDisplayLabel(item("verbal", "Verbal"), t),
    ).toBe("Verbal");
  });

  it("uses localized component labels for stable keys", () => {
    expect(
      getComponentFilterDisplayLabel(
        item("arcane_focus" satisfies SpellComponentFilterKey, "Arcane focus"),
        t,
      ),
    ).toBe("器材");
  });
});
