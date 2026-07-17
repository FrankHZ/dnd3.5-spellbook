import { describe, expect, it } from "vitest";

import {
  hasChineseChar,
  hasFullTextSearchToken,
  isSearchQueryValid,
} from "./validation";

describe("search validation", () => {
  it("allows one-character CJK queries in Chinese mode", () => {
    expect(hasChineseChar("火")).toBe(true);
    expect(isSearchQueryValid(" 火 ", "zh")).toEqual({ ok: true, q: "火" });
  });

  it("requires two non-CJK characters in Chinese mode", () => {
    expect(isSearchQueryValid("f", "zh")).toEqual({
      ok: false,
      q: "f",
      reason: "min2OrZh",
    });
  });

  it("requires two characters in English mode", () => {
    expect(isSearchQueryValid("f", "en")).toEqual({
      ok: false,
      q: "f",
      reason: "min2",
    });
    expect(isSearchQueryValid("fi", "en")).toEqual({ ok: true, q: "fi" });
  });

  it("trims and rejects empty queries", () => {
    expect(isSearchQueryValid("   ", "en")).toEqual({
      ok: false,
      q: "",
      reason: "empty",
    });
  });

  it("requires one three-code-point token for full-text mode", () => {
    expect(hasFullTextSearchToken("of 火")).toBe(false);
    expect(hasFullTextSearchToken("of 火焰墙")).toBe(true);
    expect(hasFullTextSearchToken("wall of fire")).toBe(true);

    expect(isSearchQueryValid("of 火", "zh", "full")).toEqual({
      ok: false,
      q: "of 火",
      reason: "fullTextMin3",
    });
    expect(isSearchQueryValid("of 火焰墙", "zh", "full")).toEqual({
      ok: true,
      q: "of 火焰墙",
    });
  });
});
