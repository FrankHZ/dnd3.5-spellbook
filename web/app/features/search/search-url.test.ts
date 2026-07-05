import { describe, expect, it } from "vitest";

import {
  buildSearchParams,
  buildSearchUrl,
  buildSearchUrlWithPreservedScope,
  hasSearchScope,
  parseSearchScope,
} from "./search-url";

describe("search URL helpers", () => {
  it("parses name search and browse scope from query params", () => {
    const scope = parseSearchScope(
      new URLSearchParams("q=fire&classIds=1,2,2&domainIds=8&level=3&page=4"),
    );

    expect(scope).toEqual({
      q: "fire",
      classIds: [1, 2],
      domainIds: [8],
      filters: {
        schoolIds: [],
        subschoolIds: [],
        descriptorIds: [],
        descriptorBuckets: [],
        componentKeys: [],
        castingTimeKeys: [],
        rangeKeys: [],
        durationKeys: [],
      },
      level: 3,
      page: 4,
    });
  });

  it("parses taxonomy filters from query params", () => {
    const scope = parseSearchScope(
      new URLSearchParams(
        "q=fire&schoolIds=2,1,1&subschoolIds=3&descriptorIds=0,5,bad&descriptorBuckets=see-text&page=2",
      ),
    );

    expect(scope.filters).toEqual({
      schoolIds: [1, 2],
      subschoolIds: [3],
      descriptorIds: [5],
      descriptorBuckets: ["see-text"],
      componentKeys: [],
      castingTimeKeys: [],
      rangeKeys: [],
      durationKeys: [],
    });
  });

  it("parses component filters from query params", () => {
    const scope = parseSearchScope(
      new URLSearchParams(
        "q=fire&componentKeys=material,unknown,verbal,material&page=2",
      ),
    );

    expect(scope.filters.componentKeys).toEqual(["verbal", "material"]);
  });

  it("parses mechanic filters from query params", () => {
    const scope = parseSearchScope(
      new URLSearchParams(
        "q=fire&castingTimeKeys=minute,bad,standard_action&rangeKeys=fixed,close&durationKeys=timed,unknown,instantaneous&page=2",
      ),
    );

    expect(scope.filters.castingTimeKeys).toEqual([
      "standard_action",
      "minute",
    ]);
    expect(scope.filters.rangeKeys).toEqual(["close", "fixed"]);
    expect(scope.filters.durationKeys).toEqual(["instantaneous", "timed"]);
  });

  it("builds clean and scoped search URLs", () => {
    expect(buildSearchUrl({})).toBe("/search");
    expect(
      buildSearchUrl({
        q: "fire ball",
        classIds: [2, 1, 1],
        domainIds: [8],
        filters: {
          schoolIds: [4],
          subschoolIds: [3],
          descriptorIds: [9, 8],
          descriptorBuckets: ["see-text"],
          componentKeys: ["material", "verbal"],
          castingTimeKeys: ["standard_action", "minute"],
          rangeKeys: ["close"],
          durationKeys: ["instantaneous"],
        },
        level: "all",
      }),
    ).toBe(
      "/search?q=fire+ball&classIds=1%2C2&domainIds=8&schoolIds=4&subschoolIds=3&descriptorIds=8%2C9&descriptorBuckets=see-text&componentKeys=verbal%2Cmaterial&castingTimeKeys=standard_action%2Cminute&rangeKeys=close&durationKeys=instantaneous",
    );
  });

  it("normalizes all-level search scope to any level", () => {
    expect(
      parseSearchScope(new URLSearchParams("q=fire&level=all")).level,
    ).toBeNull();
    expect(String(buildSearchParams({ q: "fire", level: "all" }))).toBe(
      "q=fire",
    );
  });

  it("omits page 1 from generated params", () => {
    expect(String(buildSearchParams({ q: "fire", page: 1 }))).toBe("q=fire");
    expect(String(buildSearchParams({ q: "fire", page: 2 }))).toBe(
      "q=fire&page=2",
    );
  });

  it("builds search URLs by preserving filter scope and replacing q", () => {
    expect(
      buildSearchUrlWithPreservedScope(
        new URLSearchParams(
          "q=old&page=3&classIds=2,1&domainIds=8&schoolIds=5&descriptorIds=9&componentKeys=material&level=all",
        ),
        "magic missile",
      ),
    ).toBe(
      "/search?q=magic+missile&classIds=1%2C2&domainIds=8&schoolIds=5&descriptorIds=9&componentKeys=material",
    );
  });

  it("treats taxonomy ids as structured search scope", () => {
    expect(
      hasSearchScope({
        classIds: [],
        domainIds: [],
        filters: {
          schoolIds: [],
          subschoolIds: [],
          descriptorIds: [9],
          descriptorBuckets: [],
          componentKeys: [],
          castingTimeKeys: [],
          rangeKeys: [],
          durationKeys: [],
        },
        level: null,
      }),
    ).toBe(true);
  });

  it("treats component keys as structured search scope", () => {
    expect(
      hasSearchScope({
        classIds: [],
        domainIds: [],
        filters: {
          schoolIds: [],
          subschoolIds: [],
          descriptorIds: [],
          descriptorBuckets: [],
          componentKeys: ["material"],
          castingTimeKeys: [],
          rangeKeys: [],
          durationKeys: [],
        },
        level: null,
      }),
    ).toBe(true);
  });

  it("treats mechanic keys as structured search scope", () => {
    expect(
      hasSearchScope({
        classIds: [],
        domainIds: [],
        filters: {
          schoolIds: [],
          subschoolIds: [],
          descriptorIds: [],
          descriptorBuckets: [],
          componentKeys: [],
          castingTimeKeys: ["standard_action"],
          rangeKeys: [],
          durationKeys: [],
        },
        level: null,
      }),
    ).toBe(true);
  });
});
