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
      taxonomyFilters: {
        schoolIds: [],
        subschoolIds: [],
        descriptorIds: [],
        descriptorBuckets: [],
      },
      level: 3,
      page: 4,
    });
  });

  it("parses taxonomy filters from query params", () => {
    const scope = parseSearchScope(
      new URLSearchParams(
        "q=fire&schoolIds=2,1,1&subschoolIds=3&descriptorIds=0,5,bad&descriptorBuckets=other&page=2",
      ),
    );

    expect(scope.taxonomyFilters).toEqual({
      schoolIds: [1, 2],
      subschoolIds: [3],
      descriptorIds: [5],
      descriptorBuckets: ["other"],
    });
  });

  it("builds clean and scoped search URLs", () => {
    expect(buildSearchUrl({})).toBe("/search");
    expect(
      buildSearchUrl({
        q: "fire ball",
        classIds: [2, 1, 1],
        domainIds: [8],
        taxonomyFilters: {
          schoolIds: [4],
          subschoolIds: [3],
          descriptorIds: [9, 8],
          descriptorBuckets: ["other"],
        },
        level: "all",
      }),
    ).toBe(
      "/search?q=fire+ball&classIds=1%2C2&domainIds=8&schoolIds=4&subschoolIds=3&descriptorIds=8%2C9&descriptorBuckets=other&level=all",
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
          "q=old&page=3&classIds=2,1&domainIds=8&schoolIds=5&descriptorIds=9&level=all",
        ),
        "magic missile",
      ),
    ).toBe(
      "/search?q=magic+missile&classIds=1%2C2&domainIds=8&schoolIds=5&descriptorIds=9&level=all",
    );
  });

  it("treats taxonomy ids as structured search scope", () => {
    expect(
      hasSearchScope({
        classIds: [],
        domainIds: [],
        taxonomyFilters: {
          schoolIds: [],
          subschoolIds: [],
          descriptorIds: [9],
          descriptorBuckets: [],
        },
        level: null,
      }),
    ).toBe(true);
  });
});
