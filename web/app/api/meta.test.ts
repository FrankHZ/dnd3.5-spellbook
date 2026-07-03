import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiGet } from "./http";
import { getMetaI18n, getSpellFilterVocabulary } from "./meta";

vi.mock("./http", () => ({
  apiGet: vi.fn(),
}));

describe("meta API wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads metadata i18n overlays", async () => {
    vi.mocked(apiGet).mockResolvedValue({ i18n: { lang: "zh" } } as any);

    await getMetaI18n();

    expect(apiGet).toHaveBeenCalledWith("/api/meta/i18n", undefined);
  });

  it("loads spell filter vocabulary", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      i18n: { lang: "en" },
      taxonomy: { schools: [], subschools: [], descriptors: [] },
    } as any);

    await getSpellFilterVocabulary();

    expect(apiGet).toHaveBeenCalledWith("/api/meta/filters", undefined);
  });
});
