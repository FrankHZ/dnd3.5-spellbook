import request from "supertest";
import type {
  SpellByLevelResponse,
  SpellFilterVocabularyResponse,
  SpellNameSearchResponse,
} from "@dnd/contracts";
import { app } from "~/app";

describe("spell taxonomy filter contracts", () => {
  const previousSource = process.env.SPELL_READ_SOURCE;

  afterEach(() => {
    if (previousSource === undefined) {
      delete process.env.SPELL_READ_SOURCE;
    } else {
      process.env.SPELL_READ_SOURCE = previousSource;
    }
  });

  it("exposes taxonomy filter vocabulary with localized labels", async () => {
    const res = await request(app).get("/api/meta/filters").query({ lang: "zh" });

    expect(res.status).toBe(200);
    const body = res.body as SpellFilterVocabularyResponse;

    expect(body.i18n.lang).toBe("zh");
    expect(body.taxonomy.schools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          key: "evocation",
          slug: "evocation",
          name: "Evocation",
          i18n: { name: "塑能" },
        }),
      ]),
    );
    expect(body.taxonomy.subschools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          key: "calling",
          name: "Calling",
          i18n: { name: "呼唤" },
        }),
      ]),
    );
    expect(body.taxonomy.descriptors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          key: "fire",
          name: "Fire",
          i18n: { name: "火" },
        }),
      ]),
    );
  });

  it("filters name search by descriptor ids and echoes taxonomy scope", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "fire", rulebookIds: "4,6", descriptorIds: "1" });

    expect(res.status).toBe(200);
    const body = res.body as SpellNameSearchResponse;

    expect(body.descriptorIds).toEqual([1]);
    expect(body.schoolIds).toEqual([]);
    expect(body.subschoolIds).toEqual([]);
    expect(body.items.map((item) => item.id)).toEqual([100]);
    expect(body.items[0]?.descriptors.map((descriptor) => descriptor.id)).toEqual([
      1,
    ]);
  });

  it("filters by-level results by subschool ids", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({
        classIds: "1",
        level: 1,
        rulebookIds: "6",
        subschoolIds: "1",
      });

    expect(res.status).toBe(200);
    const body = res.body as SpellByLevelResponse;

    expect(body.subschoolIds).toEqual([1]);
    expect(body.schoolIds).toEqual([]);
    expect(body.descriptorIds).toEqual([]);
    expect(body.groups[0]?.items.map((item) => item.id)).toEqual([2441]);
  });

  it("applies taxonomy filters to the normalized content read source", async () => {
    delete process.env.SPELL_READ_SOURCE;

    const search = await request(app)
      .get("/api/spells/search")
      .query({ q: "fire", rulebookIds: "4,6", descriptorIds: "1" });

    expect(search.status).toBe(200);
    expect(
      (search.body as SpellNameSearchResponse).items.map((item) => item.id),
    ).toEqual([100]);

    const byLevel = await request(app)
      .get("/api/spells/by-level")
      .query({
        classIds: "1",
        level: 1,
        rulebookIds: "6",
        subschoolIds: "1",
      });

    expect(byLevel.status).toBe(200);
    expect(
      (byLevel.body as SpellByLevelResponse).groups[0]?.items.map(
        (item) => item.id,
      ),
    ).toEqual([2441]);
  });
});
