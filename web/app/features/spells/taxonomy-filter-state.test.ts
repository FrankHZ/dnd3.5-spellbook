import { describe, expect, it } from "vitest";

import {
  countTaxonomyFilters,
  hasTaxonomyFilters,
  normalizeTaxonomyFilters,
  parseTaxonomyFilters,
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
});
