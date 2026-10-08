import { describe, expect, it } from "vitest";
import {
  buildSpellReportUrl,
  getSpellReportSources,
  type ReportableSpell,
} from "./spell-report";

const spell: ReportableSpell = {
  id: 876,
  name: "Heart & Air/#?\nnext",
  rulebook: { id: 1, name: "Book & One", abbr: "B1" },
  i18n: {
    name: "天翔之心",
    variant: "chm",
    summary: {
      lang: "zh",
      variant: "chm",
      shortDescription: "Private body must not be copied",
    },
  },
};
const version = { versionLabel: "v1.5", source: "local" as const };
const draft = (value = spell, lang: "zh" | "en" = "zh") =>
  new URL(buildSpellReportUrl({ spell: value, lang, version }));

describe("spell report draft", () => {
  it("encodes metadata into only title/body at the fixed public repository", () => {
    const url = draft();
    expect(url.origin + url.pathname).toBe(
      "https://github.com/FrankHZ/dnd3.5-spellbook/issues/new",
    );
    expect([...url.searchParams.keys()]).toEqual(["title", "body"]);
    expect(url.hash).toBe("");
    expect(url.searchParams.get("title")).toBe("[Spell #876] 天翔之心");
    const body = url.searchParams.get("body")!;
    expect(body).toContain("English: Heart & Air/#? next");
    expect(body).toContain("https://www.d20spellcodex.com/spells/876");
    expect(body).toContain("## 问题描述");
    expect(body).toContain("UI language: zh");
    expect(body).toContain("Name variant: chm");
    expect(body).toContain("Body variant: not loaded (card)");
    expect(body).not.toContain("Commit:");
    expect(body).not.toContain("Private body");
  });

  it("uses English titles/prompts and displayed English sources", () => {
    const url = draft(spell, "en");
    expect(url.searchParams.get("title")).toBe(
      "[Spell #876] Heart & Air/#? next",
    );
    expect(url.searchParams.get("body")).toContain("## Problem");
    expect(getSpellReportSources(spell, "en")).toEqual({
      name: "en (canonical)",
      summary: "not displayed",
      body: "not loaded (card)",
    });
  });

  it("distinguishes effective name, CHM summary and English body provenance", () => {
    const mixed: ReportableSpell = {
      ...spell,
      description: { text: "SECRET", html: "" },
      i18n: {
        ...spell.i18n,
        variant: "effective",
        description: { text: "SECRET" },
        nameProvenance: {
          schemaVersion: 1,
          acceptedRevision: "r1",
          language: "zh",
          origin: { kind: "chm", sourceKey: "old" },
        },
        bodyProvenance: {
          schemaVersion: 1,
          acceptedRevision: "r1",
          language: "en",
          origin: { kind: "english", sourceKey: null },
        },
      },
    };
    expect(getSpellReportSources(mixed, "zh")).toEqual({
      name: "effective; language=zh; origin=chm",
      summary: "zh/chm",
      body: "effective; language=en; origin=english",
    });
    expect(draft(mixed).searchParams.get("body")).not.toContain("SECRET");
  });

  it("reports actual CHM bodies and canonical fallback without inferring effective", () => {
    const detail = { ...spell, description: { text: "English", html: "" } };
    expect(getSpellReportSources(detail, "zh").body).toBe("en (canonical)");
    expect(
      getSpellReportSources(
        { ...detail, i18n: { ...spell.i18n, description: { text: "中文" } } },
        "zh",
      ).body,
    ).toBe("chm");
    expect(
      getSpellReportSources({ ...spell, i18n: { name: "未知" } }, "zh").name,
    ).toBe("unknown");
  });

  it("bounds worst-case encoded Unicode metadata while keeping ID and detail URL", () => {
    const huge = "🐉界&/#?".repeat(1000);
    const url = new URL(
      buildSpellReportUrl({
        spell: {
          ...spell,
          name: huge,
          rulebook: { ...spell.rulebook, name: huge, abbr: huge },
          i18n: {
            name: huge,
            variant: huge,
            summary: { lang: "zh", variant: huge, shortDescription: "summary" },
          },
        },
        lang: "zh",
        version: { ...version, versionLabel: huge, commitSha: huge },
      }),
    );
    expect(url.href.length).toBeLessThanOrEqual(4000);
    expect(url.searchParams.get("title")).toContain("#876");
    expect(url.searchParams.get("body")).toContain(
      "https://www.d20spellcodex.com/spells/876",
    );
    expect(url.searchParams.get("body")).not.toContain("�");
  });

  it("allowlists public context even when callers hold private user state", () => {
    const withState = {
      ...spell,
      favorites: "PRIVATE-FAVORITES",
      prepared: "PRIVATE-PREPARED",
      session: "PRIVATE-SESSION",
    };
    const url = new URL(
      buildSpellReportUrl({
        spell: withState,
        lang: "en",
        version: { ...version, commitSha: "123456789", ref: "PRIVATE-REF" },
      }),
    );
    expect(url.searchParams.get("body")).toContain("Commit: 123456789");
    expect(decodeURIComponent(url.href)).not.toContain("PRIVATE-");
  });
});
