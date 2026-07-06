import type {
  SpellFilterVocabularyItem,
  SpellMechanicFilterVocabularyItem,
} from "@dnd/contracts";
import { describe, expect, it } from "vitest";

import {
  getMechanicFilterDisplayLabel,
  getTaxonomyFilterDisplayLabel,
} from "./spell-filter";

const labels = new Map<string, string>([
  ["taxonomy.options.spell-school.abjuration", "防护"],
  ["taxonomy.options.spell-descriptor.see-text", "见正文"],
  ["mechanics.casting-times.options.standard-action", "标准动作"],
]);

function t(key: string, options?: { defaultValue?: string }) {
  return labels.get(key) ?? options?.defaultValue ?? key;
}

describe("spell filter display labels", () => {
  it("localizes taxonomy labels by stable category and key", () => {
    const item = {
      id: 1,
      key: "abjuration",
      name: "Abjuration",
      sourceKind: "spell",
      category: "spell_school",
    } satisfies SpellFilterVocabularyItem;

    expect(getTaxonomyFilterDisplayLabel(item, t)).toBe("防护");
  });

  it("can keep the English source label beside localized taxonomy labels", () => {
    const item = {
      id: 1,
      key: "abjuration",
      name: "Abjuration",
      sourceKind: "spell",
      category: "spell_school",
    } satisfies SpellFilterVocabularyItem;

    expect(
      getTaxonomyFilterDisplayLabel(item, t, { includeEnglish: true }),
    ).toBe("防护 - Abjuration");
  });

  it("uses bucket keys for synthetic descriptor vocabulary", () => {
    const item = {
      key: "see-text",
      bucketKey: "see-text",
      name: "See text",
      sourceKind: "spell",
      category: "spell_descriptor",
    } satisfies SpellFilterVocabularyItem;

    expect(getTaxonomyFilterDisplayLabel(item, t)).toBe("见正文");
  });

  it("falls back to server labels for unknown taxonomy keys", () => {
    const item = {
      key: "future",
      name: "Future",
      sourceKind: "spell",
      category: "spell_descriptor",
    } satisfies SpellFilterVocabularyItem;

    expect(getTaxonomyFilterDisplayLabel(item, t)).toBe("Future");
  });

  it("localizes mechanics bucket labels by group and key", () => {
    const item = {
      key: "standard_action",
      label: "Standard action",
      sortOrder: 40,
    } satisfies SpellMechanicFilterVocabularyItem;

    expect(getMechanicFilterDisplayLabel("castingTimes", item, t)).toBe(
      "标准动作",
    );
  });
});
