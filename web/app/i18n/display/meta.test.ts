import { describe, expect, it } from "vitest";

import { getMetaDisplayName, getMetaDisplayNameWithEn } from "./meta";

describe("meta display helpers", () => {
  const meta = {
    i18n: { lang: "zh" as const, variant: "chm" },
    classes: {
      1: { name: "法师" },
    },
    rulebooks: {},
    domains: {},
    schools: {},
    subschools: {},
    descriptors: {},
  };

  it("uses entity names in English mode", () => {
    const entity = { id: 1, name: "Wizard" };

    expect(getMetaDisplayName(meta, "classes", entity, "en")).toBe("Wizard");
    expect(getMetaDisplayNameWithEn(meta, "classes", entity, "en")).toBe(
      "Wizard",
    );
  });

  it("uses translated names in Chinese mode", () => {
    const entity = { id: 1, name: "Wizard" };

    expect(getMetaDisplayName(meta, "classes", entity, "zh")).toBe("法师");
    expect(getMetaDisplayNameWithEn(meta, "classes", entity, "zh")).toBe(
      "法师 - Wizard",
    );
  });

  it("falls back to entity names and empty placeholders", () => {
    expect(
      getMetaDisplayName(meta, "classes", { id: 2, name: "Cleric" }, "zh"),
    ).toBe("Cleric");
    expect(getMetaDisplayName(meta, "classes", null, "zh")).toBe("—");
  });
});
