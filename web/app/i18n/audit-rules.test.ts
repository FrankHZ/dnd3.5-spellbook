import { describe, expect, it } from "vitest";

import {
  isPluralVariantKey,
  isRawEnglishI18nKey,
  isSemanticI18nKey,
  missingRequiredPluralVariantKeys,
  normalizePluralKey,
  normalizedKeySet,
} from "./audit-rules";

describe("i18n audit rules", () => {
  it("recognizes semantic keys", () => {
    expect(isSemanticI18nKey("nav.browse")).toBe(true);
    expect(isSemanticI18nKey("prepared.bulk-paste.example")).toBe(true);
    expect(isSemanticI18nKey("Search spells by name...")).toBe(false);
  });

  it("detects raw-English sentence keys", () => {
    expect(isRawEnglishI18nKey("Search spells by name...")).toBe(true);
    expect(isRawEnglishI18nKey("Copied {{count}} row(s) as TSV._one")).toBe(
      true,
    );
    expect(isRawEnglishI18nKey("prepared.copy.rows_one")).toBe(false);
  });

  it("normalizes plural variant keys for cross-locale comparison", () => {
    expect(isPluralVariantKey("prepared.copy.rows_one")).toBe(true);
    expect(normalizePluralKey("prepared.copy.rows_other")).toBe(
      "prepared.copy.rows",
    );
    expect(normalizedKeySet(["rows_one", "rows_other"])).toEqual(
      new Set(["rows"]),
    );
  });

  it("requires the runtime plural variants used by each supported locale", () => {
    const referenceKeys = ["rows_one", "rows_other"];

    expect(
      missingRequiredPluralVariantKeys(referenceKeys, ["rows_other"], "en"),
    ).toEqual(["rows_one"]);
    expect(
      missingRequiredPluralVariantKeys(referenceKeys, ["rows_one"], "zh"),
    ).toEqual(["rows_other"]);
    expect(
      missingRequiredPluralVariantKeys(referenceKeys, ["rows_other"], "zh"),
    ).toEqual([]);
  });
});
