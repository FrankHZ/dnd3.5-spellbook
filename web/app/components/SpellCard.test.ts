import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import type { SpellItemView } from "@dnd/contracts";
import { describe, expect, it, vi } from "vitest";
import { SpellCard } from "./SpellCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("~/state/collections-state", () => ({
  useCollections: () => ({
    spellbook: { isInDefault: () => false },
    prepared: {},
  }),
}));
vi.mock("~/i18n/hooks/useAppI18n", () => ({
  useAppI18n: () => ({
    lang: "en",
    spellName: (spell: SpellItemView) => spell.name,
  }),
}));
vi.mock("~/i18n/hooks/useMetaNames", () => ({
  useMetaNames: () => ({ metaName: () => "", metaNameWithEn: () => "" }),
}));
vi.mock("~/i18n/hooks/useRulebookDisplay", () => ({
  useRulebookDisplay: () => ({ rulebookDisplay: () => ({ abbr: "TEST" }) }),
}));
vi.mock("~/features/display/useDisplayPrefs", () => ({
  useDisplayPrefs: () => ({
    spellCardDetails: "summary",
    spellListDensity: "compact",
  }),
}));

const spell = {
  id: 42,
  name: "Test spell",
  rulebook: { id: 1, name: "Test book", abbr: "TEST" },
  classLevels: [],
  domainLevels: [],
  components: {},
} as unknown as SpellItemView;

describe("shared spell card report action", () => {
  it.each([
    ["summary", false],
    ["summary", true],
    ["full", false],
    ["full", true],
  ] as const)(
    "keeps one report link in %s mode with collections=%s",
    (detailMode, showActions) => {
      const html = renderToStaticMarkup(
        createElement(
          MemoryRouter,
          {},
          createElement(SpellCard, { spell, detailMode, showActions }),
        ),
      );
      expect(
        html.match(
          /https:\/\/github.com\/FrankHZ\/dnd3.5-spellbook\/issues\/new/g,
        ),
      ).toHaveLength(1);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain(
        'aria-label="actions.report — actions.report-hint"',
      );
      expect(html).toContain("Body+variant%3A+not+loaded+%28card%29");
      expect(html.includes("prepared.prepare-action")).toBe(
        detailMode === "full" && showActions,
      );
    },
  );
});
