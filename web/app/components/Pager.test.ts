import i18next from "i18next";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";

import enPager from "../../public/locales/en/pager.json";
import zhPager from "../../public/locales/zh/pager.json";
import Pager, { shouldHandlePageClick } from "./Pager";

async function renderPager(lang: "en" | "zh" = "en") {
  const i18n = i18next.createInstance();
  await i18n.init({
    lng: lang,
    fallbackLng: "en",
    keySeparator: ">",
    ns: ["pager"],
    defaultNS: "pager",
    resources: {
      en: { pager: enPager },
      zh: { pager: zhPager },
    },
  });

  return renderToStaticMarkup(
    createElement(I18nextProvider, {
      i18n,
      children: createElement(Pager, {
        page: 2,
        pageSize: 25,
        total: 75,
        onPageChange: () => undefined,
        getPageHref: (page: number) =>
          `/browse?classIds=1&level=1&page=${page}`,
      }),
    }),
  );
}

describe("Pager", () => {
  it("renders full hrefs for previous, numbered, and next page links", async () => {
    const html = await renderPager();
    const hrefs = Array.from(html.matchAll(/href="([^"]+)"/g), (match) =>
      match[1].replaceAll("&amp;", "&"),
    );

    expect(hrefs).toEqual([
      "/browse?classIds=1&level=1&page=1",
      "/browse?classIds=1&level=1&page=1",
      "/browse?classIds=1&level=1&page=2",
      "/browse?classIds=1&level=1&page=3",
      "/browse?classIds=1&level=1&page=3",
    ]);
  });

  it("localizes pagination navigation and page-link names in Chinese", async () => {
    const html = await renderPager("zh");

    expect(html).toContain('aria-label="分页"');
    expect(html).toContain('aria-label="第1页"');
    expect(html).toContain('aria-label="第2页"');
    expect(html).toContain('aria-label="第3页"');
    expect(html).not.toContain('aria-label="Page ');
  });

  it("leaves modified clicks to native browser navigation", () => {
    const plainClick = {
      button: 0,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    };

    expect(shouldHandlePageClick(plainClick)).toBe(true);
    expect(shouldHandlePageClick({ ...plainClick, ctrlKey: true })).toBe(false);
    expect(shouldHandlePageClick({ ...plainClick, metaKey: true })).toBe(false);
    expect(shouldHandlePageClick({ ...plainClick, shiftKey: true })).toBe(
      false,
    );
    expect(shouldHandlePageClick({ ...plainClick, button: 1 })).toBe(false);
  });
});
