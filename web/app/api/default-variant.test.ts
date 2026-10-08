import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGet, apiPost } from "./http";
import { getI18nFromStorage } from "~/i18n/storage";
import { LS_KEY_PREFS } from "~/storage/keys";
import { installMemoryStorage } from "~/storage/storage-test-utils";
installMemoryStorage();
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Chinese default and persisted variant requests", () => {
  it.each([undefined, "chm", "effective", "other-variant", "", 42])("uses effective with saved variant %s without rewriting storage", async variant => {
    vi.stubGlobal("window", { location: { origin: "http://test" } });
    vi.stubGlobal("navigator", { language: "zh-CN", languages: ["zh-CN"] });
    if (variant !== undefined) localStorage.setItem(LS_KEY_PREFS, JSON.stringify({ storageVersion: 1, uiPrefs: { lang: "zh", zhVariant: variant } }));
    const before = localStorage.getItem(LS_KEY_PREFS);
    expect(getI18nFromStorage()).toEqual({ lang: "zh", variant: "effective" });
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "{}" });
    vi.stubGlobal("fetch", fetch);
    await apiGet("/api/spells/100");
    await apiGet("/api/spells/by-level?classIds=1&level=3");
    await apiGet("/api/spells/search?q=Synthetic");
    await apiPost("/api/spells/resolve", { names: ["Synthetic"] });
    await apiPost("/api/spells/batch", { ids: [100] });
    for (const [url] of fetch.mock.calls) {
      const params = new URL(url, "http://test").searchParams;
      expect(params.get("lang")).toBe("zh");
      expect(params.get("variant")).toBe("effective");
    }
    expect(localStorage.getItem(LS_KEY_PREFS)).toBe(before);
  });
});
