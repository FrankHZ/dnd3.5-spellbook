import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiGet, apiPost } from "./http";
import {
  getSpellsBatch,
  getSpellsByLevel,
  resolveSpellNames,
  searchSpellsByName,
} from "./spells";

vi.mock("./http", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

const mockedApiGet = vi.mocked(apiGet);
const mockedApiPost = vi.mocked(apiPost);

function spell(id: number) {
  return { id, name: `Spell ${id}` } as any;
}

describe("spell API wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds search URLs with pagination and optional rulebooks", async () => {
    mockedApiGet.mockResolvedValue({ items: [] } as any);

    await searchSpellsByName({
      q: "fire ball",
      rulebookIds: [4, 6],
      classIds: [1],
      domainIds: [8],
      level: 3,
      page: 2,
      pageSize: 25,
    });

    expect(apiGet).toHaveBeenCalledWith(
      "/api/spells/search?q=fire+ball&page=2&pageSize=25&rulebookIds=4%2C6&classIds=1&domainIds=8&level=3",
      undefined,
    );
  });

  it("builds search URLs with normalized filters", async () => {
    mockedApiGet.mockResolvedValue({ items: [] } as any);

    await searchSpellsByName({
      q: "fire",
      filters: {
        schoolIds: [2, 2, 0],
        subschoolIds: [4],
        descriptorIds: [7, 6],
        descriptorBuckets: ["see-text"],
        componentKeys: ["material", "unknown" as any, "verbal", "material"],
        castingTimeKeys: ["minute", "standard_action", "bad" as any],
        rangeKeys: ["fixed", "close"],
        durationKeys: ["timed", "instantaneous"],
      },
      page: 1,
      pageSize: 25,
    });

    expect(apiGet).toHaveBeenCalledWith(
      "/api/spells/search?q=fire&page=1&pageSize=25&schoolIds=2&subschoolIds=4&descriptorIds=6%2C7&descriptorBuckets=see-text&componentKeys=verbal%2Cmaterial&castingTimeKeys=standard_action%2Cminute&rangeKeys=close%2Cfixed&durationKeys=instantaneous%2Ctimed",
      undefined,
    );
  });

  it("builds by-level URLs with class and domain filters", async () => {
    mockedApiGet.mockResolvedValue({ groups: [] } as any);

    await getSpellsByLevel({
      classIds: [1, 2],
      domainIds: [8],
      level: "all",
      page: 3,
      pageSize: 50,
    });

    expect(apiGet).toHaveBeenCalledWith(
      "/api/spells/by-level?classIds=1%2C2&domainIds=8&level=all&page=3&pageSize=50",
      undefined,
    );
  });

  it("builds by-level URLs with normalized filters", async () => {
    mockedApiGet.mockResolvedValue({ groups: [] } as any);

    await getSpellsByLevel({
      classIds: [1],
      domainIds: [],
      level: 3,
      filters: {
        schoolIds: [2],
        subschoolIds: [],
        descriptorIds: [6],
        descriptorBuckets: ["see-text"],
        componentKeys: ["somatic"],
        castingTimeKeys: ["standard_action"],
        rangeKeys: ["medium"],
        durationKeys: ["instantaneous"],
      },
      page: 1,
      pageSize: 50,
    });

    expect(apiGet).toHaveBeenCalledWith(
      "/api/spells/by-level?classIds=1&level=3&schoolIds=2&descriptorIds=6&descriptorBuckets=see-text&componentKeys=somatic&castingTimeKeys=standard_action&rangeKeys=medium&durationKeys=instantaneous&page=1&pageSize=50",
      undefined,
    );
  });

  it("normalizes and chunks batch ids while preserving item order", async () => {
    mockedApiPost
      .mockResolvedValueOnce({
        ids: Array.from({ length: 100 }, (_, i) => i + 1),
        items: [spell(1), spell(50), spell(100)],
        missingIds: [99],
      })
      .mockResolvedValueOnce({
        ids: [101, 102],
        items: [spell(102)],
        missingIds: [101],
      });

    const ids = [
      ...Array.from({ length: 102 }, (_, i) => i + 1),
      0,
      -1,
      1.5,
      102,
    ];

    const result = await getSpellsBatch(ids);

    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(apiPost).toHaveBeenNthCalledWith(
      1,
      "/api/spells/batch",
      { ids: Array.from({ length: 100 }, (_, i) => i + 1) },
      undefined,
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      2,
      "/api/spells/batch",
      { ids: [101, 102] },
      undefined,
    );
    expect(result.ids).toHaveLength(102);
    expect(result.items.map((item) => item.id)).toEqual([1, 50, 100, 102]);
    expect(result.missingIds).toEqual([99, 101]);
  });

  it("returns an empty batch result without an API call for empty ids", async () => {
    await expect(getSpellsBatch([0, -1, 1.5])).resolves.toEqual({
      ids: [],
      items: [],
      missingIds: [],
    });
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("chunks resolved names at the backend limit and unions conflicts", async () => {
    mockedApiPost
      .mockResolvedValueOnce({
        results: [{ input: "A", status: "not_found" }],
        conflictRulebooks: [6, 4],
      })
      .mockResolvedValueOnce({
        results: [{ input: "B", status: "not_found" }],
        conflictRulebooks: [4, 9],
      });

    const names = Array.from({ length: 201 }, (_, i) => `Spell ${i + 1}`);
    const result = await resolveSpellNames(names, [4, 6]);

    expect(apiPost).toHaveBeenCalledTimes(2);
    expect((mockedApiPost.mock.calls[0][1] as any).names).toHaveLength(200);
    expect((mockedApiPost.mock.calls[1][1] as any).names).toHaveLength(1);
    expect(mockedApiPost.mock.calls[0][1]).toMatchObject({
      rulebookIds: [4, 6],
    });
    expect(result.results).toEqual([
      { input: "A", status: "not_found" },
      { input: "B", status: "not_found" },
    ]);
    expect(result.conflictRulebooks).toEqual([4, 6, 9]);
  });

  it("returns an empty resolve result without an API call for empty names", async () => {
    await expect(resolveSpellNames([])).resolves.toEqual({
      results: [],
      conflictRulebooks: [],
    });
    expect(apiPost).not.toHaveBeenCalled();
  });
});
