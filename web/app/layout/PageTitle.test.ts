import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { matchPath } from "react-router";
import PageTitle from "./PageTitle";
import { DEFAULT_STATE } from "~/storage/userPrefs";
import { defaultCollectionsState } from "~/storage/collections";
import enTopbar from "../../public/locales/en/topbar.json";
import zhTopbar from "../../public/locales/zh/topbar.json";
import enCollections from "../../public/locales/en/collections.json";
import zhCollections from "../../public/locales/zh/collections.json";
import enDefault from "../../public/locales/en/collections-default.json";
import zhDefault from "../../public/locales/zh/collections-default.json";
import enPublications from "../../public/locales/en/publications.json";
import zhPublications from "../../public/locales/zh/publications.json";
import enSettings from "../../public/locales/en/settings.json";
import zhSettings from "../../public/locales/zh/settings.json";
import enAbout from "../../public/locales/en/about.json";
import zhAbout from "../../public/locales/zh/about.json";

const current = vi.hoisted(() => ({
  pathname: "/browse",
  lang: "en" as "en" | "zh",
  spellNamesWithEnglish: false,
  query: { isSuccess: false, data: undefined as unknown },
  queryOptions: undefined as unknown,
}));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useLocation: () => ({ pathname: current.pathname }),
  useMatch: (pattern: string) => matchPath(pattern, current.pathname),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => {
    current.queryOptions = options;
    return current.query;
  },
}));
vi.mock("~/state/user-prefs-state", () => ({
  useUserPrefs: () => ({
    state: {
      ...DEFAULT_STATE,
      uiPrefs: { lang: current.lang, zhVariant: "effective" },
      displayPrefs: {
        ...DEFAULT_STATE.displayPrefs,
        zhDisplay: {
          ...DEFAULT_STATE.displayPrefs.zhDisplay,
          spellNamesWithEnglish: current.spellNamesWithEnglish,
        },
      },
    },
  }),
}));
vi.mock("~/state/collections-state", () => ({
  useCollections: () => ({
    collections: {
      ...defaultCollectionsState,
      books: [
        ...defaultCollectionsState.books,
        {
          id: "my-book",
          kind: "spellbook",
          name: "My Wizard",
          spellIds: [876],
        },
      ],
    },
  }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18n.getFixedT(current.lang, "topbar") }),
}));
const i18n = createInstance();
await i18n.init({
  resources: {
    en: {
      topbar: enTopbar,
      collections: enCollections,
      "collections-default": enDefault,
      publications: enPublications,
      settings: enSettings,
      about: enAbout,
    },
    zh: {
      topbar: zhTopbar,
      collections: zhCollections,
      "collections-default": zhDefault,
      publications: zhPublications,
      settings: zhSettings,
      about: zhAbout,
    },
  },
});
function title() {
  const html = renderToStaticMarkup(createElement(PageTitle));
  expect(html.match(/<title>/g)).toHaveLength(1);
  return html
    .replace("<title>", "")
    .replace("</title>", "")
    .replaceAll("&amp;", "&");
}
describe("page title", () => {
  beforeEach(() => {
    current.pathname = "/browse";
    current.lang = "en";
    current.query = { isSuccess: false, data: undefined };
    current.spellNamesWithEnglish = false;
  });
  it.each(["/", "/browse", "/unknown"])(
    "keeps the default site title for %s",
    (path) => {
      current.pathname = path;
      expect(title()).toBe("D&D 3.5 Spellbook");
      expect(current.queryOptions).toMatchObject({ enabled: false });
    },
  );
  it.each([
    ["/search", "Search", "搜索"],
    ["/publications", "Publications", "出版物"],
    ["/spellbooks", enCollections["books.title"], zhCollections["books.title"]],
    ["/settings", "Settings", "设置"],
    ["/about", enAbout["page.title"], zhAbout["page.title"]],
  ])("localizes %s on language changes", (path, en, zh) => {
    current.pathname = path;
    expect(title()).toBe(`${en} — D&D 3.5 Spellbook`);
    current.lang = "zh";
    expect(title()).toBe(`${zh} — D&D 3.5 Spellbook`);
  });
  it("reuses displayed spell names, replaces async titles, and resets on navigation", () => {
    current.pathname = "/spells/876";
    expect(title()).toBe("Spell — D&D 3.5 Spellbook");
    expect(current.queryOptions).toMatchObject({
      enabled: true,
      queryKey: [
        "spellDetail",
        {
          idNum: 876,
          lang: "en",
          variant: "",
        },
      ],
    });
    current.query = {
      isSuccess: true,
      data: { id: 876, name: "Heart of Air", i18n: { name: "天翔之心" } },
    };
    expect(title()).toBe("Heart of Air — D&D 3.5 Spellbook");
    current.lang = "zh";
    expect(title()).toBe("天翔之心 — D&D 3.5 Spellbook");
    current.spellNamesWithEnglish = true;
    expect(title()).toBe("天翔之心 - Heart of Air — D&D 3.5 Spellbook");
    current.pathname = "/spells/877";
    current.query = { isSuccess: false, data: undefined };
    expect(title()).toBe("法术 — D&D 3.5 Spellbook");
    expect(current.queryOptions).toMatchObject({
      queryKey: [
        "spellDetail",
        {
          idNum: 877,
          lang: "zh",
          variant: "effective",
        },
      ],
    });
    current.pathname = "/browse";
    expect(title()).toBe("D&D 3.5 Spellbook");
  });
  it.each(["invalid", "0", "999999"])(
    "uses fallback for unavailable spell %s",
    (id) => {
      current.pathname = `/spells/${id}`;
      current.query = { isSuccess: false, data: { name: "Old cached spell" } };
      expect(title()).toBe("Spell — D&D 3.5 Spellbook");
    },
  );
  it("uses actual custom and localized built-in collection names", () => {
    current.pathname = "/spellbooks/my-book";
    expect(title()).toBe("My Wizard — D&D 3.5 Spellbook");
    current.pathname = "/spellbooks/default";
    expect(title()).toBe(`${enDefault.default} — D&D 3.5 Spellbook`);
    current.lang = "zh";
    expect(title()).toBe(`${zhDefault.default} — D&D 3.5 Spellbook`);
    current.pathname = "/spellbooks/prepared";
    expect(title()).toBe(`${zhDefault.prepared} — D&D 3.5 Spellbook`);
    current.pathname = "/spellbooks/missing";
    expect(title()).toBe(`${zhCollections["books.title"]} — D&D 3.5 Spellbook`);
  });
});
