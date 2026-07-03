import { describe, expect, it } from "vitest";

import { buildSpellFilterScopeSummaryItems } from "./SpellFilterScopeSummary";

const en = {
  "classes.none": "no class filter",
  "classes.selected": "{{count}} class filters",
  "domains.none": "no domain filter",
  "domains.selected": "{{count}} domain filters",
  "labels.classes": "Classes",
  "labels.domains": "Domains",
  "labels.level": "Level",
  "labels.rulebooks": "Rulebooks",
  "labels.taxonomy": "Taxonomy",
  "level.all": "all levels",
  "level.any": "any level",
  "level.not-selected": "not selected",
  "rulebooks.default-core-value": "default 3.5 core",
  "rulebooks.selected-summary": "{{count}} selected (Settings)",
  "taxonomy.none": "none",
  "taxonomy.selected": "{{count}} active filters",
};

function t(key: string, options?: { count?: number; ns: "spell-scope" }) {
  const template = en[key as keyof typeof en] ?? key;
  return options?.count
    ? template.replace("{{count}}", String(options.count))
    : template;
}

describe("buildSpellFilterScopeSummaryItems", () => {
  it("keeps empty Browse scope explicit and neutral", () => {
    const items = buildSpellFilterScopeSummaryItems({
      classCount: 0,
      domainCount: 0,
      level: null,
      rulebookCount: 0,
      taxonomyFilterCount: 0,
      nullLevelMode: "required",
      t,
    });

    expect(items.map((item) => [item.key, item.value, item.isActive])).toEqual([
      ["classes", "no class filter", false],
      ["domains", "no domain filter", false],
      ["level", "not selected", false],
      ["taxonomy", "none", false],
      ["rulebooks", "default 3.5 core", false],
    ]);
  });

  it("summarizes active filters for shareable Search or Browse URLs", () => {
    const items = buildSpellFilterScopeSummaryItems({
      classCount: 2,
      domainCount: 3,
      level: "all",
      rulebookCount: 3,
      taxonomyFilterCount: 4,
      nullLevelMode: "any",
      t,
    });

    expect(items.map((item) => [item.key, item.value, item.isActive])).toEqual([
      ["classes", "2 class filters", true],
      ["domains", "3 domain filters", true],
      ["level", "all levels", true],
      ["taxonomy", "4 active filters", true],
      ["rulebooks", "3 selected (Settings)", true],
    ]);
  });

  it("treats missing Search level as any level", () => {
    const level = buildSpellFilterScopeSummaryItems({
      classCount: 0,
      domainCount: 0,
      level: null,
      rulebookCount: 0,
      taxonomyFilterCount: 0,
      nullLevelMode: "any",
      t,
    }).find((item) => item.key === "level");

    expect(level).toMatchObject({
      value: "any level",
      isActive: false,
    });
  });
});
