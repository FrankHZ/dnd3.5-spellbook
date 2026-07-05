import request from "supertest";
import type {
  SpellByLevelResponse,
  SpellFilterVocabularyResponse,
  SpellNameSearchResponse,
} from "@dnd/contracts";
import { app } from "#server/app";

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
          key: "see-text",
          slug: "see-text",
          name: "See text",
          sourceKind: "spell",
          category: "spell_descriptor",
          queryParam: "descriptorBuckets",
          queryValue: "see-text",
          bucketKey: "see-text",
        }),
      ]),
    );
    expect(
      body.taxonomy.descriptors.some(
        (item) => item.key !== "see-text" && item.key.startsWith("see-text-"),
      ),
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
    expect(body.mechanics.castingTimes).toEqual({
      queryParam: "castingTimeKeys",
      mode: "any",
      buckets: expect.arrayContaining([
        { key: "standard_action", label: "Standard action", sortOrder: 40 },
        { key: "minute", label: "Minutes", sortOrder: 70 },
      ]),
    });
    expect(body.mechanics.ranges).toEqual({
      queryParam: "rangeKeys",
      mode: "any",
      buckets: expect.arrayContaining([
        { key: "close", label: "Close", sortOrder: 30 },
        { key: "medium", label: "Medium", sortOrder: 40 },
        { key: "fixed", label: "Fixed distance", sortOrder: 60 },
      ]),
    });
    expect(body.mechanics.durations).toEqual({
      queryParam: "durationKeys",
      mode: "any",
      buckets: expect.arrayContaining([
        { key: "instantaneous", label: "Instantaneous", sortOrder: 10 },
        { key: "timed", label: "Timed", sortOrder: 20 },
        { key: "concentration", label: "Concentration", sortOrder: 30 },
        { key: "permanent", label: "Permanent", sortOrder: 40 },
      ]),
    });
    expect(body.mechanics.savingThrows).toEqual({
      queryParam: "savingThrowKeys",
      mode: "any",
      buckets: expect.arrayContaining([
        { key: "none", label: "No save", sortOrder: 10 },
        { key: "fortitude", label: "Fortitude", sortOrder: 20 },
        { key: "reflex", label: "Reflex", sortOrder: 30 },
        { key: "will", label: "Will", sortOrder: 40 },
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

  it("filters name search by the synthetic see-text descriptor bucket", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "magic", rulebookIds: "4", descriptorBuckets: "see-text" });

    expect(res.status).toBe(200);
    const body = res.body as SpellNameSearchResponse;

    expect(body.descriptorIds).toEqual([]);
    expect(body.descriptorBuckets).toEqual(["see-text"]);
    expect(body.items.map((item) => item.id)).toEqual([101]);
    expect(body.items[0]?.descriptors).toEqual([
      {
        key: "see-text",
        name: "See text",
        slug: "see-text",
        rawText: "see text",
      },
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

  it("filters name search by accepted mechanics buckets", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({
        q: "fire",
        rulebookIds: "4,6",
        castingTimeKeys: "minute,standard_action,unknown",
        rangeKeys: "medium",
        durationKeys: "timed,instantaneous,unknown",
        savingThrowKeys: "will,none,unknown",
      });

    expect(res.status).toBe(200);
    const body = res.body as SpellNameSearchResponse;

    expect(body.castingTimeKeys).toEqual(["standard_action", "minute"]);
    expect(body.rangeKeys).toEqual(["medium"]);
    expect(body.durationKeys).toEqual(["instantaneous", "timed"]);
    expect(body.savingThrowKeys).toEqual(["none", "will"]);
    expect(body.items.map((item) => item.id)).toEqual([100]);
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
      .query({ q: "magic", rulebookIds: "4", descriptorBuckets: "see-text" });

    expect(otherBucket.status).toBe(200);
    expect(
      (otherBucket.body as SpellNameSearchResponse).items.map((item) => item.id),
    ).toEqual([101]);
    expect(
      (otherBucket.body as SpellNameSearchResponse).items[0]?.descriptors,
    ).toEqual([
      {
        key: "see-text",
        name: "See text",
        slug: "see-text",
        rawText: "see text",
      },
    ]);

    const mechanics = await request(app)
      .get("/api/spells/search")
      .query({
        q: "fire",
        rulebookIds: "4,6",
        castingTimeKeys: "standard_action",
        rangeKeys: "medium",
        durationKeys: "instantaneous",
        savingThrowKeys: "none",
      });

    expect(mechanics.status).toBe(200);
    expect(
      (mechanics.body as SpellNameSearchResponse).items.map((item) => item.id),
    ).toEqual([100]);
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

  it("applies the see-text descriptor bucket to the legacy rules read source", async () => {
    process.env.SPELL_READ_SOURCE = "rules";

    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "magic", rulebookIds: "4", descriptorBuckets: "see-text" });

    expect(res.status).toBe(200);
    const body = res.body as SpellNameSearchResponse;

    expect(body.descriptorIds).toEqual([]);
    expect(body.descriptorBuckets).toEqual(["see-text"]);
    expect(body.items.map((item) => item.id)).toEqual([101]);
  });

  it("applies mechanic filters to the legacy rules read source", async () => {
    process.env.SPELL_READ_SOURCE = "rules";

    const res = await request(app)
      .get("/api/spells/search")
      .query({
        q: "fire",
        rulebookIds: "4,6",
        castingTimeKeys: "standard_action",
        rangeKeys: "medium",
        durationKeys: "instantaneous",
        savingThrowKeys: "none",
      });

    expect(res.status).toBe(200);
    const body = res.body as SpellNameSearchResponse;

    expect(body.castingTimeKeys).toEqual(["standard_action"]);
    expect(body.rangeKeys).toEqual(["medium"]);
    expect(body.durationKeys).toEqual(["instantaneous"]);
    expect(body.savingThrowKeys).toEqual(["none"]);
    expect(body.items.map((item) => item.id)).toEqual([100]);
  });
});
