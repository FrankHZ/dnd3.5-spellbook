import { describe, expect, it } from "vitest";

import { getSpellShortDescription } from "./spell-short-description";

describe("spell short description i18n", () => {
  it("returns matching English summaries", () => {
    expect(
      getSpellShortDescription(
        {
          i18n: {
            summary: {
              lang: "en",
              variant: "imarvin",
              shortDescription: "Calls extraplanar creature to fight for you.",
            },
          },
        },
        "en",
      ),
    ).toBe("Calls extraplanar creature to fight for you.");
  });

  it("returns matching Chinese summaries", () => {
    expect(
      getSpellShortDescription(
        {
          i18n: {
            summary: {
              lang: "zh",
              variant: "chm",
              shortDescription: "召唤跨位面生物为你作战。",
            },
          },
        },
        "zh",
      ),
    ).toBe("召唤跨位面生物为你作战。");
  });

  it("does not fall back across languages", () => {
    expect(
      getSpellShortDescription(
        {
          i18n: {
            summary: {
              lang: "en",
              shortDescription: "English only.",
            },
          },
        },
        "zh",
      ),
    ).toBeUndefined();
  });

  it("hides blank summaries", () => {
    expect(
      getSpellShortDescription(
        {
          i18n: {
            summary: {
              lang: "en",
              shortDescription: "   ",
            },
          },
        },
        "en",
      ),
    ).toBeUndefined();
  });
});
