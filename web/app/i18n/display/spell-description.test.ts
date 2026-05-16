import { describe, expect, it } from "vitest";

import { getSpellDescription } from "./spell-description";

const baseSpell = {
  description: { html: "<p>English</p>", text: "English" },
};

describe("spell description i18n", () => {
  it("returns English descriptions in English mode", () => {
    expect(getSpellDescription(baseSpell as any, "en")).toEqual({
      html: "<p>English</p>",
      text: "English",
      usedFallback: false,
    });
  });

  it("returns Chinese descriptions when present", () => {
    expect(
      getSpellDescription(
        {
          ...baseSpell,
          i18n: {
            sourceKey: "zh:spell",
            description: { html: "<p>中文</p>", text: "中文" },
          },
        } as any,
        "zh",
      ),
    ).toEqual({
      html: "<p>中文</p>",
      text: "中文",
      sourceKey: "zh:spell",
      usedFallback: false,
    });
  });

  it("falls back to English when Chinese descriptions are missing", () => {
    expect(getSpellDescription({ ...baseSpell, i18n: {} } as any, "zh")).toEqual(
      {
        html: "<p>English</p>",
        text: "English",
        usedFallback: true,
      },
    );
  });
});
