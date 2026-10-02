import { describe, expect, it } from "vitest";

import { getSpellDescription } from "./spell-description";
import { getDisplayName } from "./name";
import { getSpellShortDescription } from "./spell-short-description";

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
  it("renders server-selected mixed fields and CHM summary without making source decisions", () => {
    const spell = { ...baseSpell, name: "Canonical English", i18n: { variant: "effective",
      name: "Selected Chinese", nameProvenance: { language: "zh", origin: { kind: "chm" } },
      description: { html: "<pre>Selected English fallback</pre>", text: "Selected English fallback" },
      bodyProvenance: { language: "en", origin: { kind: "english" } },
      summary: { lang: "zh" as const, variant: "chm", shortDescription: "Reviewed summary" } } };
    expect(getDisplayName(spell, "zh")).toBe("Selected Chinese");
    expect(getSpellDescription(spell as any, "zh")).toMatchObject(spell.i18n.description);
    expect(getSpellDescription(spell as any, "zh").sourceKey).toBeUndefined();
    expect(getSpellShortDescription(spell, "zh")).toBe("Reviewed summary");
    const amended = { ...spell, i18n: { ...spell.i18n, description: { text: "Selected current amendment" },
      bodyProvenance: { language: "zh", origin: { kind: "native" }, amendment: { kind: "accepted-body-amendment" } } } };
    expect(getSpellDescription(amended as any, "zh").text).toBe("Selected current amendment");
    expect(getSpellDescription(amended as any, "zh").sourceKey).toBeUndefined();
  });
});
