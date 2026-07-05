import { describe, expect, it } from "vitest";

import {
  countComponentFilters,
  countMechanicFilters,
  countTaxonomyFilters,
  hasComponentFilters,
  hasMechanicFilters,
  hasTaxonomyFilters,
  normalizeComponentFilters,
  normalizeMechanicFilters,
  normalizeTaxonomyFilters,
  normalizeNormalizedFilters,
  parseComponentFilters,
  parseMechanicFilters,
  parseTaxonomyFilters,
  setComponentFilterParams,
  setMechanicFilterParams,
  setTaxonomyFilterParams,
} from "./taxonomy-filter-state";

describe("taxonomy filter state helpers", () => {
  it("parses positive taxonomy id lists from URL params", () => {
    expect(
      parseTaxonomyFilters(
        new URLSearchParams(
          "schoolIds=2,1,1&subschoolIds=0,4&descriptorIds=bad,6&descriptorBuckets=see-text,bad,other",
        ),
      ),
    ).toEqual({
      schoolIds: [1, 2],
      subschoolIds: [4],
      descriptorIds: [6],
      descriptorBuckets: ["see-text"],
    });
  });

  it("normalizes partial filter objects", () => {
    expect(
      normalizeTaxonomyFilters({
        schoolIds: [3, 2, 2],
        descriptorIds: [0, 7],
      }),
    ).toEqual({
      schoolIds: [2, 3],
      subschoolIds: [],
      descriptorIds: [7],
      descriptorBuckets: [],
    });
  });

  it("sets and deletes taxonomy URL params", () => {
    const params = new URLSearchParams(
      "schoolIds=1&subschoolIds=2&descriptorIds=3&descriptorBuckets=see-text&page=4",
    );

    setTaxonomyFilterParams(params, {
      schoolIds: [5],
      subschoolIds: [],
      descriptorIds: [9, 8],
      descriptorBuckets: ["see-text"],
    });

    expect(String(params)).toBe(
      "schoolIds=5&descriptorIds=8%2C9&descriptorBuckets=see-text&page=4",
    );
  });

  it("counts active taxonomy filters", () => {
    const filters = {
      schoolIds: [1],
      subschoolIds: [],
      descriptorIds: [2, 3],
      descriptorBuckets: ["see-text" as const],
    };

    expect(hasTaxonomyFilters(filters)).toBe(true);
    expect(countTaxonomyFilters(filters)).toBe(4);
  });

  it("normalizes component filter keys in contract order", () => {
    expect(
      parseComponentFilters(
        new URLSearchParams(
          "componentKeys=material,unknown,verbal,material,arcane_focus",
        ),
      ),
    ).toEqual({
      componentKeys: ["verbal", "material", "arcane_focus"],
    });

    expect(
      normalizeComponentFilters({
        componentKeys: ["xp", "verbal", "xp", "bad" as any],
      }),
    ).toEqual({
      componentKeys: ["verbal", "xp"],
    });
  });

  it("sets and deletes component URL params", () => {
    const params = new URLSearchParams("componentKeys=verbal&page=4");

    setComponentFilterParams(params, {
      componentKeys: ["material", "verbal"],
    });

    expect(String(params)).toBe("componentKeys=verbal%2Cmaterial&page=4");

    setComponentFilterParams(params, { componentKeys: [] });

    expect(String(params)).toBe("page=4");
  });

  it("normalizes combined filter objects", () => {
    expect(
      normalizeNormalizedFilters({
        schoolIds: [3],
        componentKeys: ["material", "verbal", "material"],
      }),
    ).toEqual({
      schoolIds: [3],
      subschoolIds: [],
      descriptorIds: [],
      descriptorBuckets: [],
      componentKeys: ["verbal", "material"],
      castingTimeKeys: [],
      rangeKeys: [],
      durationKeys: [],
      savingThrowKeys: [],
    });
  });

  it("counts active component filters", () => {
    const filters = {
      componentKeys: ["verbal" as const, "somatic" as const],
    };

    expect(hasComponentFilters(filters)).toBe(true);
    expect(countComponentFilters(filters)).toBe(2);
  });

  it("normalizes mechanic filter keys in contract order", () => {
    expect(
      parseMechanicFilters(
        new URLSearchParams(
          "castingTimeKeys=minute,bad,standard_action,minute&rangeKeys=fixed,close",
        ),
      ),
    ).toEqual({
      castingTimeKeys: ["standard_action", "minute"],
      rangeKeys: ["close", "fixed"],
      durationKeys: [],
      savingThrowKeys: [],
    });

    expect(
      normalizeMechanicFilters({
        castingTimeKeys: ["hour", "swift_action", "bad" as any],
        rangeKeys: ["unlimited", "touch", "touch"],
        durationKeys: ["timed", "instantaneous", "bad" as any],
        savingThrowKeys: ["will", "none", "bad" as any],
      }),
    ).toEqual({
      castingTimeKeys: ["swift_action", "hour"],
      rangeKeys: ["touch", "unlimited"],
      durationKeys: ["instantaneous", "timed"],
      savingThrowKeys: ["none", "will"],
    });
  });

  it("sets and deletes mechanic URL params", () => {
    const params = new URLSearchParams("castingTimeKeys=minute&page=4");

    setMechanicFilterParams(params, {
      castingTimeKeys: ["standard_action", "minute"],
      rangeKeys: ["close"],
      durationKeys: ["instantaneous"],
      savingThrowKeys: ["none"],
    });

    expect(String(params)).toBe(
      "castingTimeKeys=standard_action%2Cminute&page=4&rangeKeys=close&durationKeys=instantaneous&savingThrowKeys=none",
    );

    setMechanicFilterParams(params, {
      castingTimeKeys: [],
      rangeKeys: [],
      durationKeys: [],
      savingThrowKeys: [],
    });

    expect(String(params)).toBe("page=4");
  });

  it("counts active mechanic filters", () => {
    const filters = {
      castingTimeKeys: ["standard_action" as const],
      rangeKeys: ["close" as const, "medium" as const],
      durationKeys: ["timed" as const],
      savingThrowKeys: ["none" as const],
    };

    expect(hasMechanicFilters(filters)).toBe(true);
    expect(countMechanicFilters(filters)).toBe(5);
  });
});
