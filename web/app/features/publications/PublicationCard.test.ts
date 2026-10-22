import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import type { PublicationStats, Rulebook } from "@dnd/contracts";
import { describe, expect, it } from "vitest";
import en from "../../../public/locales/en/publications.json";
import zh from "../../../public/locales/zh/publications.json";
import { PublicationCard } from "./PublicationCard";

const book: Rulebook = {
  id: 6,
  name: "Player's Handbook",
  abbr: "PH",
  slug: "players-handbook",
  edition: {
    id: 1,
    name: "Core (3.5)",
    slug: "core-35",
    system: "DnD 3.5",
    core: true,
  },
};
const known: PublicationStats = {
  rulebookId: 6,
  siteSpellCount: 1001,
  classSources: {
    coverage: "bounded-candidates",
    inventoryComplete: false,
    handoffRevision: "private-revision",
    excludedCandidateCount: 1,
    uncertainCandidateCount: 1,
    supported: [
      {
        classId: 1,
        variantId: 11,
        name: "First",
        slug: "first",
        prestige: false,
        listKind: "spells",
        relation: "class-entry",
        i18n: { lang: "zh", name: "首个职业" },
      },
      {
        classId: 2,
        variantId: 12,
        name: "Martial",
        slug: "martial",
        prestige: false,
        listKind: "maneuvers",
        relation: "class-entry",
      },
      {
        classId: 3,
        variantId: 13,
        name: "Infuser",
        slug: "infuser",
        prestige: true,
        listKind: "infusions",
        relation: "variant",
      },
      {
        classId: 4,
        variantId: 14,
        name: "Fourth hidden class",
        slug: "fourth",
        prestige: false,
        listKind: "spells",
        relation: "class-entry",
      },
    ],
  },
};

async function render(
  stats: PublicationStats | undefined,
  lang: "en" | "zh" = "en",
  options: {
    pending?: boolean;
    error?: boolean;
    book?: Rulebook;
    withEnglish?: boolean;
  } = {},
) {
  const i18n = createInstance();
  await i18n.init({
    lng: lang,
    resources: { en: { publications: en }, zh: { publications: zh } },
    defaultNS: "publications",
    keySeparator: false,
    interpolation: { escapeValue: false },
  });
  return renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n },
      createElement(PublicationCard, {
        rulebook: options.book ?? book,
        displayName: lang === "zh" ? "玩家手册" : "Player's Handbook",
        lang,
        classNamesWithEnglish: options.withEnglish ?? false,
        selected: true,
        stats,
        statsPending: options.pending ?? false,
        statsError: options.error ?? false,
        onCheckedChange: () => {},
      }),
    ),
  );
}

describe("publication card", () => {
  it("shows canonical site counts and a bounded preview, without provenance or completeness claims", async () => {
    const html = await render(known);
    expect(html).toContain("1,001");
    expect(html).toContain("entries on this site");
    expect(html).toContain("Confirmed classes · partial list");
    expect(html).toContain("Maneuvers");
    expect(html).toContain("Infusions");
    expect(html).toContain("Prestige");
    expect(html).not.toContain("Fourth hidden class");
    expect(html).toContain("+1 more class");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="publication-classes-6"');
    expect(html).toContain('id="publication-rulebook-6"');
    expect(html).not.toContain("private-revision");
    expect(html).not.toContain("bounded-candidates");
    expect(await render({ ...known, siteSpellCount: 1 })).toContain(
      "entry on this site",
    );
  });

  it("distinguishes a true zero site spell count from unknown or excluded-only class sources", async () => {
    for (const coverage of ["unknown", "bounded-candidates"] as const) {
      const html = await render({
        ...known,
        siteSpellCount: 0,
        classSources: { ...known.classSources, coverage, supported: [] },
      });
      expect(html).toContain("Class sources not yet confirmed");
      expect(html).toContain(">0</span>");
      expect(html).not.toContain("0 classes");
      expect(html).not.toContain("Confirmed classes · partial list");
    }
  });

  it("keeps selection available while missing or failed aggregate data never becomes zero", async () => {
    for (const options of [{ pending: true }, { error: true }]) {
      const html = await render(undefined, "en", options);
      expect(html).toContain("—");
      expect(html).toContain("entries on this site");
      expect(html).not.toContain("card.site-entries");
      expect(html).not.toContain(">0</span>");
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain(
        options.pending
          ? "Loading counts and class sources"
          : "Counts and class sources are unavailable",
      );
    }
  });

  it("uses Chinese display names and localized type labels with English fallback", async () => {
    const html = await render(known, "zh");
    expect(html).toContain("首个职业");
    expect(html).toContain("Martial");
    expect(html).toContain("武技");
    expect(html).toContain("注能");
    expect(html).toContain("进阶");
    expect(html).toContain("本站收录条目");
    expect(html).toContain("清单尚不完整");
    expect(html).toContain("另有 1 个职业");
    expect(await render(known, "zh", { withEnglish: true })).toContain(
      "首个职业 - First",
    );
  });

  it("uses only accepted cover metadata and supplies a normal layout when it is missing", async () => {
    const image = "https://example.invalid/accepted-cover.jpg";
    expect(
      await render(known, "en", {
        book: {
          ...book,
          publicationImage: image,
          publicationReviewStatus: "accepted",
        },
      }),
    ).toContain(image);
    expect(
      await render(known, "en", {
        book: {
          ...book,
          publicationImage: image,
          publicationReviewStatus: "review",
        },
      }),
    ).not.toContain(image);
    expect(await render(known)).toContain("app-publication-cover");
  });
});
