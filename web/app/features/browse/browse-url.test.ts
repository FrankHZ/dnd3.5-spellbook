import { describe, expect, it } from "vitest";

import { buildBrowsePageUrl } from "./browse-url";

describe("browse URL helpers", () => {
  it("changes only the page while preserving the full active scope", () => {
    const params = new URLSearchParams(
      "classIds=2,1&domainIds=8&level=3&page=4&schoolIds=5&descriptorBuckets=see-text&componentKeys=material&castingTimeKeys=minute",
    );

    expect(buildBrowsePageUrl(params, 5)).toBe(
      "/browse?classIds=2%2C1&domainIds=8&level=3&page=5&schoolIds=5&descriptorBuckets=see-text&componentKeys=material&castingTimeKeys=minute",
    );
    expect(params.get("page")).toBe("4");
  });
});
