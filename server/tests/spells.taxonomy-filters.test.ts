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
          sourceKind: "spell",
          category: "spell_school",
          i18n: { name: "塑能" },
        }),
        expect.objectContaining({
          id: 17,
          key: "desert-wind",
          slug: "desert-wind",
          name: "Desert Wind",
          sourceKind: "maneuver",
          category: "maneuver_discipline",
        }),
      ]),
    );
    expect(body.taxonomy.subschools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          key: "calling",
          name: "Calling",
          sourceKind: "spell",
          category: "spell_subschool",
          i18n: { name: "呼唤" },
        }),
        expect.objectContaining({
          id: 22,
          key: "boost",
          name: "Boost",
          sourceKind: "maneuver",
          category: "maneuver_category",
        }),
      ]),
    );
    expect(body.taxonomy.descriptors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          key: "fire",
          name: "Fire",
          sourceKind: "spell",
          category: "spell_descriptor",
          i18n: { name: "火" },
        }),
        expect.objectContaining({
          key: "other",
          slug: "other",
          name: "Other",
          sourceKind: "spell",
          category: "spell_descriptor",
          queryParam: "descriptorBuckets",
          queryValue: "other",
          bucketKey: "other",
        }),
      ]),
    );
    expect(
      body.taxonomy.descriptors.some((item) => item.key.startsWith("see-text")),
    ).toBe(false);
    expect(body.components).toEqual({
      queryParam: "componentKeys",
      mode: "all",
      base: expect.arrayContaining([
        { key: "verbal", label: "Verbal", abbreviation: "V" },
        { key: "somatic", label: "Somatic", abbreviation: "S" },
        { key: "material", label: "Material", abbreviation: "M" },
      ]),
    });
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
    expect(body.componentKeys).toEqual([]);
    expect(body.items.map((item) => item.id)).toEqual([100]);
    expect(body.items[0]?.descriptors.map((descriptor) => descriptor.id)).toEqual([
      1,
    ]);
  });

  it("filters name search by the synthetic other descriptor bucket", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "magic", rulebookIds: "4", descriptorBuckets: "other" });

    expect(res.status).toBe(200);
    const body = res.body as SpellNameSearchResponse;

    expect(body.descriptorIds).toEqual([]);
    expect(body.descriptorBuckets).toEqual(["other"]);
    expect(body.items.map((item) => item.id)).toEqual([101]);
    expect(body.items[0]?.descriptors).toEqual([
      { key: "other", name: "Other", slug: "other" },
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
    expect(body.componentKeys).toEqual([]);
    expect(body.groups[0]?.items.map((item) => item.id)).toEqual([2441]);
  });

  it("filters name search by accepted component keys", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({
        q: "fire",
        rulebookIds: "4,6",
        componentKeys: "material,unknown,material",
      });

    expect(res.status).toBe(200);
    const body = res.body as SpellNameSearchResponse;

    expect(body.componentKeys).toEqual(["material"]);
    expect(body.items.map((item) => item.id)).toEqual([100]);
    expect(body.items[0]?.components.M).toBe(true);
  });

  it("filters by-level results by component keys", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({
        classIds: "1",
        level: 3,
        rulebookIds: "6",
        componentKeys: "material",
      });

    expect(res.status).toBe(200);
    const body = res.body as SpellByLevelResponse;

    expect(body.componentKeys).toEqual(["material"]);
    expect(body.groups[0]?.items.map((item) => item.id)).toEqual([100]);
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

    const combinedSchool = await request(app)
      .get("/api/spells/search")
      .query({ q: "hybrid", rulebookIds: "4", schoolIds: "1" });

    expect(combinedSchool.status).toBe(200);
    expect(
      (combinedSchool.body as SpellNameSearchResponse).items.map(
        (item) => item.id,
      ),
    ).toEqual([110]);

    const combinedSubschool = await request(app)
      .get("/api/spells/search")
      .query({ q: "hybrid", rulebookIds: "4", subschoolIds: "1" });

    expect(combinedSubschool.status).toBe(200);
    expect(
      (combinedSubschool.body as SpellNameSearchResponse).items.map(
        (item) => item.id,
      ),
    ).toEqual([110]);

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

    const otherBucket = await request(app)
      .get("/api/spells/search")
      .query({ q: "magic", rulebookIds: "4", descriptorBuckets: "other" });

    expect(otherBucket.status).toBe(200);
    expect(
      (otherBucket.body as SpellNameSearchResponse).items.map((item) => item.id),
    ).toEqual([101]);
    expect(
      (otherBucket.body as SpellNameSearchResponse).items[0]?.descriptors,
    ).toEqual([{ key: "other", name: "Other", slug: "other" }]);
  });

  it("applies component filters to the legacy rules read source", async () => {
    process.env.SPELL_READ_SOURCE = "rules";

    const byLevel = await request(app)
      .get("/api/spells/by-level")
      .query({
        classIds: "1",
        level: 3,
        rulebookIds: "6",
        componentKeys: "material",
      });

    expect(byLevel.status).toBe(200);
    expect(
      (byLevel.body as SpellByLevelResponse).groups[0]?.items.map(
        (item) => item.id,
      ),
    ).toEqual([100]);
  });

  it("applies the other descriptor bucket to the legacy rules read source", async () => {
    process.env.SPELL_READ_SOURCE = "rules";

    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "magic", rulebookIds: "4", descriptorBuckets: "other" });

    expect(res.status).toBe(200);
    const body = res.body as SpellNameSearchResponse;

    expect(body.descriptorIds).toEqual([]);
    expect(body.descriptorBuckets).toEqual(["other"]);
    expect(body.items.map((item) => item.id)).toEqual([101]);
  });
});
