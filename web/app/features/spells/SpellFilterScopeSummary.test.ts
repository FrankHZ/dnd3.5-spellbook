import { describe, expect, it } from "vitest";

import { buildSpellFilterScopeSummaryItems } from "./SpellFilterScopeSummary";

const en = {
  "labels.classes": "Classes",
  "labels.components": "Components",
  "labels.domains": "Domains",
  "labels.level": "Level",
  "labels.rulebooks": "Rulebooks",
  "labels.taxonomy": "Taxonomy",
  "rulebooks.selected-summary": "{{count}} (Settings)",
};

function t(key: string, options?: { count?: number; ns: "spell-scope" }) {
  const template = en[key as keyof typeof en] ?? key;
  return options?.count
    ? template.replace("{{count}}", String(options.count))
    : template;
}

describe("buildSpellFilterScopeSummaryItems", () => {
  it("omits inactive and default scope items", () => {
    const items = buildSpellFilterScopeSummaryItems({
      classCount: 0,
      domainCount: 0,
      level: null,
      rulebookCount: 0,
      taxonomyFilterCount: 0,
      nullLevelMode: "required",
      t,
    });

    expect(items).toEqual([]);
  });

  it("summarizes active filters with compact counts", () => {
    const items = buildSpellFilterScopeSummaryItems({
      classCount: 2,
      domainCount: 3,
      level: "all",
      rulebookCount: 3,
      taxonomyFilterCount: 4,
      componentFilterCount: 2,
      nullLevelMode: "any",
      t,
    });

    expect(items.map((item) => [item.key, item.value, item.isActive])).toEqual([
      ["classes", "2", true],
      ["domains", "3", true],
      ["taxonomy", "4", true],
      ["components", "2", true],
      ["rulebooks", "3 (Settings)", true],
    ]);
  });

  it("only shows concrete level filters", () => {
    const anyLevel = buildSpellFilterScopeSummaryItems({
      classCount: 0,
      domainCount: 0,
      level: null,
      rulebookCount: 0,
      taxonomyFilterCount: 0,
      nullLevelMode: "any",
      t,
    }).find((item) => item.key === "level");
    const concreteLevel = buildSpellFilterScopeSummaryItems({
      classCount: 0,
      domainCount: 0,
      level: 3,
      rulebookCount: 0,
      taxonomyFilterCount: 0,
      nullLevelMode: "any",
      t,
    }).find((item) => item.key === "level");

    expect(anyLevel).toBeUndefined();
    expect(concreteLevel).toMatchObject({ value: "3", isActive: true });
  });
});
