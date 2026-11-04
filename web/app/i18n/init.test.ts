import fs from "node:fs/promises";
import { afterEach, expect, it, vi } from "vitest";
import { I18N_NAMESPACES } from "./config";

vi.mock("./storage", () => ({ getI18nFromStorage: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

async function loadAppLanguage(lang: "en" | "zh", missing: string[] = []) {
  vi.resetModules();
  const { getI18nFromStorage } = await import("./storage");
  vi.mocked(getI18nFromStorage).mockReturnValue({ lang });
  vi.spyOn(console, "log").mockImplementation(() => {});
  const fetch = vi.fn(async (input: string) => {
    // Exercise the real HTTP backend and maintained locale JSON, never a DB/API.
    expect(input).toMatch(/^\/locales\/(en|zh)\/[a-z-]+\.json$/);
    if (missing.includes(input)) return new Response("missing", { status: 404 });
    try {
      const json = await fs.readFile(new URL(`../../public${input}`, import.meta.url), "utf8");
      return new Response(json, { status: 200 });
    } catch {
      return new Response("missing", { status: 404 });
    }
  });
  vi.stubGlobal("fetch", fetch);
  const { default: i18n } = await import("i18next");
  // i18next is an external singleton; wait for this initialization, not its old flag.
  const ready = new Promise<void>((resolve) => {
    const initialized = () => {
      i18n.off("initialized", initialized);
      resolve();
    };
    i18n.on("initialized", initialized);
  });
  await import("./init");
  await ready;
  return { i18n, fetch };
}

it.each(["en", "zh"] as const)("loads %s first, switches languages, and reuses loaded namespaces", async (lang) => {
  const { i18n, fetch } = await loadAppLanguage(lang);
  expect(i18n.t("nav.browse", { ns: "topbar" })).toBe(lang === "zh" ? "浏览" : "Browse");
  for (const ns of I18N_NAMESPACES) {
    expect(fetch.mock.calls.some(([url]) => url === `/locales/${lang}/${ns}.json`)).toBe(true);
    expect(i18n.hasResourceBundle(lang, ns)).toBe(true);
  }
  const other = lang === "zh" ? "en" : "zh";
  await i18n.changeLanguage(other);
  expect(i18n.t("nav.browse", { ns: "topbar" })).toBe(other === "zh" ? "浏览" : "Browse");
  const requests = fetch.mock.calls.length;
  await i18n.changeLanguage(lang);
  expect(fetch).toHaveBeenCalledTimes(requests);
});

it("falls back to the English namespace when the Chinese bundle returns 404", async () => {
  const { i18n, fetch } = await loadAppLanguage("zh", ["/locales/zh/topbar.json"]);
  expect(i18n.language).toBe("zh");
  expect(i18n.hasResourceBundle("zh", "topbar")).toBe(false);
  expect(i18n.t("nav.browse", { ns: "topbar" })).toBe("Browse");
  expect(fetch.mock.calls.filter(([url]) => url === "/locales/zh/topbar.json")).toHaveLength(1);
  expect(i18n.hasResourceBundle("zh", "spell-search")).toBe(true);
});

it("settles missing-namespace 404s and keeps existing translations usable", async () => {
  const { i18n, fetch } = await loadAppLanguage("zh");
  const failed = vi.fn();
  i18n.on("failedLoading", failed);
  await i18n.loadNamespaces("synthetic-missing");
  expect(failed).toHaveBeenCalledWith("zh", "synthetic-missing", expect.any(String));
  expect(failed).toHaveBeenCalledWith("en", "synthetic-missing", expect.any(String));
  expect(fetch.mock.calls.filter(([url]) => url.endsWith("/synthetic-missing.json"))).toHaveLength(2);
  await i18n.changeLanguage("en");
  expect(i18n.t("nav.browse", { ns: "topbar" })).toBe("Browse");
});
