import { describe, expect, it } from "vitest";

import { getDisplayName, getDisplayNameWithEn } from "./name";

describe("display name helpers", () => {
  const spell = { name: "Magic Missile", i18n: { name: "魔法飞弹" } };

  it("uses English names in English mode", () => {
    expect(getDisplayName(spell, "en")).toBe("Magic Missile");
    expect(getDisplayNameWithEn(spell, "en")).toBe("Magic Missile");
  });

  it("uses translated names in Chinese mode", () => {
    expect(getDisplayName(spell, "zh")).toBe("魔法飞弹");
    expect(getDisplayNameWithEn(spell, "zh")).toBe("魔法飞弹 - Magic Missile");
  });

  it("falls back to English when Chinese name is missing", () => {
    const untranslated = { name: "Shield" };

    expect(getDisplayName(untranslated, "zh")).toBe("Shield");
    expect(getDisplayNameWithEn(untranslated, "zh")).toBe("Shield");
  });
});
