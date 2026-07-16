import type { SpellMechanicDetailFacet } from "@dnd/contracts";
import { describe, expect, it } from "vitest";

import {
  getSpellMechanicDisplayValue,
  type SpellMechanicDisplayTranslator,
} from "./spell-mechanics";

const messages: Record<string, string> = {
  "mechanics.values.actions.standard-action": "标准动作",
  "mechanics.values.flags.dismissible": "可解除",
  "mechanics.values.flags.harmless": "无害",
  "mechanics.values.qualifiers.negates": "通过则无效",
  "mechanics.values.ranges.medium": "中距（100 尺 + 10 尺/等级）",
  "mechanics.values.saving-throws.will": "意志",
  "mechanics.values.separators.list": "、",
  "mechanics.values.spell-resistances.no": "不可用",
  "mechanics.values.templates.amount-action": "{{amount}}个{{action}}",
  "mechanics.values.templates.amount-unit": "{{amount}}{{unit}}",
  "mechanics.values.templates.parenthetical": "{{base}}（{{notes}}）",
  "mechanics.values.templates.per-level": "{{value}}/等级",
  "mechanics.values.templates.qualified": "{{base}}，{{qualifier}}",
  "mechanics.values.units.round": "轮",
};

const t: SpellMechanicDisplayTranslator = (key, options = {}) => {
  const template = messages[key] ?? String(options.defaultValue ?? key);
  return Object.entries(options).reduce(
    (value, [name, replacement]) =>
      value.replaceAll(`{{${name}}}`, String(replacement)),
    template,
  );
};

function facet(
  values: Partial<SpellMechanicDetailFacet> = {},
): SpellMechanicDetailFacet {
  return {
    category: "standard_action",
    amount: 1,
    unit: "action",
    flags: {},
    normalizedText: "1 standard action",
    displayCoverage: "complete",
    ...values,
  };
}

describe("spell mechanic display", () => {
  it("formats complete structured mechanics for Chinese display", () => {
    expect(
      getSpellMechanicDisplayValue({
        field: "castingTime",
        raw: "1 standard action",
        facet: facet(),
        language: "zh",
        t,
      }),
    ).toBe("1个标准动作");

    expect(
      getSpellMechanicDisplayValue({
        field: "range",
        raw: "Medium (100 ft. + 10 ft./level)",
        facet: facet({
          category: "medium",
          amount: null,
          unit: null,
          normalizedText: "Medium (100 ft. + 10 ft./level)",
        }),
        language: "zh-CN",
        t,
      }),
    ).toBe("中距（100 尺 + 10 尺/等级）");

    expect(
      getSpellMechanicDisplayValue({
        field: "duration",
        raw: "1 round/level (D)",
        facet: facet({
          category: "timed",
          amount: 1,
          unit: "round",
          flags: { perLevel: true, dismissible: true },
          normalizedText: "1 round/level (D)",
        }),
        language: "zh",
        t,
      }),
    ).toBe("1轮/等级（可解除）");
  });

  it("formats save and resistance qualifiers without relying on English text", () => {
    expect(
      getSpellMechanicDisplayValue({
        field: "savingThrow",
        raw: "Will negates (harmless)",
        facet: facet({
          category: "will",
          amount: null,
          unit: null,
          flags: { negates: true, harmless: true },
          normalizedText: "Will negates (harmless)",
        }),
        language: "zh",
        t,
      }),
    ).toBe("意志，通过则无效（无害）");

    expect(
      getSpellMechanicDisplayValue({
        field: "spellResistance",
        raw: "No",
        facet: facet({
          category: "no",
          amount: null,
          unit: null,
          normalizedText: "No",
        }),
        language: "zh",
        t,
      }),
    ).toBe("不可用");
  });

  it("uses normalized English only for complete facets", () => {
    expect(
      getSpellMechanicDisplayValue({
        field: "castingTime",
        raw: "1 Standard Action",
        facet: facet(),
        language: "en",
        t,
      }),
    ).toBe("1 standard action");

    expect(
      getSpellMechanicDisplayValue({
        field: "castingTime",
        raw: "1 standard action, or longer",
        facet: facet({
          normalizedText: null,
          displayCoverage: "partial",
        }),
        language: "zh",
        t,
      }),
    ).toBe("1 standard action, or longer");
  });

  it("falls back to raw text for unsupported complete categories", () => {
    expect(
      getSpellMechanicDisplayValue({
        field: "target",
        raw: "One creature per level",
        facet: facet({
          category: "creature",
          amount: null,
          unit: null,
          normalizedText: "One creature per level",
        }),
        language: "zh",
        t,
      }),
    ).toBe("One creature per level");
  });
});
