import { describe, expect, it } from "vitest";

import {
  countComponentFilters,
  countTaxonomyFilters,
  hasComponentFilters,
  hasTaxonomyFilters,
  normalizeComponentFilters,
  normalizeTaxonomyFilters,
  normalizeNormalizedFilters,
  parseComponentFilters,
  parseTaxonomyFilters,
  setComponentFilterParams,
  setTaxonomyFilterParams,
} from "./taxonomy-filter-state";

describe("taxonomy filter state helpers", () => {
  it("parses positive taxonomy id lists from URL params", () => {
    expect(
      parseTaxonomyFilters(
        new URLSearchParams(
          "schoolIds=2,1,1&subschoolIds=0,4&descriptorIds=bad,6&descriptorBuckets=other,bad,other",
        ),
      ),
    ).toEqual({
      schoolIds: [1, 2],
      subschoolIds: [4],
      descriptorIds: [6],
      descriptorBuckets: ["other"],
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
      "schoolIds=1&subschoolIds=2&descriptorIds=3&descriptorBuckets=other&page=4",
    );

    setTaxonomyFilterParams(params, {
      schoolIds: [5],
      subschoolIds: [],
      descriptorIds: [9, 8],
      descriptorBuckets: ["other"],
    });

    expect(String(params)).toBe(
      "schoolIds=5&descriptorIds=8%2C9&descriptorBuckets=other&page=4",
    );
  });

  it("counts active taxonomy filters", () => {
    const filters = {
      schoolIds: [1],
      subschoolIds: [],
      descriptorIds: [2, 3],
      descriptorBuckets: ["other" as const],
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
    });
  });

  it("counts active component filters", () => {
    const filters = {
      componentKeys: ["verbal" as const, "somatic" as const],
    };

    expect(hasComponentFilters(filters)).toBe(true);
    expect(countComponentFilters(filters)).toBe(2);
  });
});
