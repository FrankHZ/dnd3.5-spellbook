import { describe, expect, it } from "vitest";

import {
  buildSearchParams,
  buildSearchUrl,
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
      level: 3,
      page: 4,
    });
  });

  it("builds clean and scoped search URLs", () => {
    expect(buildSearchUrl({})).toBe("/search");
    expect(
      buildSearchUrl({
        q: "fire ball",
        classIds: [2, 1, 1],
        domainIds: [8],
        level: "all",
      }),
    ).toBe("/search?q=fire+ball&classIds=1%2C2&domainIds=8&level=all");
  });

  it("omits page 1 from generated params", () => {
    expect(String(buildSearchParams({ q: "fire", page: 1 }))).toBe("q=fire");
    expect(String(buildSearchParams({ q: "fire", page: 2 }))).toBe(
      "q=fire&page=2",
    );
  });
});
