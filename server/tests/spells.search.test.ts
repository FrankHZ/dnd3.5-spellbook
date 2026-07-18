import request from "supertest";
import { app } from "#server/app";
import { contentPrisma } from "#server/lib/content-prisma-client";
import {
  fullTextSearchTokens,
  toFts5Query,
} from "#server/services/spells/full-text-query";

async function withSpellReadSource<T>(
  source: "rules" | "content",
  run: () => Promise<T>,
) {
  const previous = process.env.SPELL_READ_SOURCE;
  process.env.SPELL_READ_SOURCE = source;
  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env.SPELL_READ_SOURCE;
    else process.env.SPELL_READ_SOURCE = previous;
  }
}

describe("GET /api/spells/search", () => {
  it("drops short trigram tokens from multi-word queries", () => {
    expect(toFts5Query("wall of fire")).toBe('"wall" AND "fire"');
    expect(toFts5Query("Shield of Faith")).toBe('"Shield" AND "Faith"');
    expect(fullTextSearchTokens("of to a")).toEqual([]);
  });

  it("searches spells by name", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "fire" });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("name");
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it.each(["rules", "content"] as const)(
    "paginates one stable name-search result set from the %s source",
    async (source) => {
      const [first, second] = await withSpellReadSource(source, () =>
        Promise.all([
          request(app).get("/api/spells/search").query({
            q: "pagination candidate",
            rulebookIds: "6",
            page: 1,
            pageSize: 1,
          }),
          request(app).get("/api/spells/search").query({
            q: "pagination candidate",
            rulebookIds: "6",
            page: 2,
            pageSize: 1,
          }),
        ]),
      );

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.total).toBe(21);
      expect(second.body.total).toBe(first.body.total);
      expect(first.body.items.map((item: any) => item.id)).toEqual([5021]);
      expect(second.body.items.map((item: any) => item.id)).toEqual([5001]);
    },
  );

  it("returns English short descriptions from the summary overlay", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "Summon Monster I", rulebookIds: "6" });

    expect(res.status).toBe(200);
    const summonMonster = res.body.items.find((item: any) => item.id === 2441);
    expect(summonMonster?.i18n?.summary).toMatchObject({
      lang: "en",
      variant: "imarvin",
      shortDescription: "Calls extraplanar creature to fight for you.",
    });
  });

  it("can constrain name search by browse filters", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "fire", classIds: "1", level: 3, rulebookIds: "4,6" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    for (const item of res.body.items) {
      expect(
        item.classLevels.some(
          (entry: any) => entry.id === 1 && entry.level === 3,
        ),
      ).toBe(true);
    }
  });

  it("rejects short query", async () => {
    const res = await request(app).get("/api/spells/search").query({ q: "f" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(0);
  });

  it("rejects invalid search modes", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "fire", mode: "body" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: "Invalid request",
      error: "mode must be either 'name' or 'full'",
    });
  });

  it("rejects short full-text queries with a stable code", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "火球", mode: "full" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      message: "Invalid request",
      error:
        "full-text query must contain at least one term with 3 Unicode code points",
      code: "FULL_TEXT_QUERY_TOO_SHORT",
    });
  });

  it("rejects full-text queries with only short trigram tokens", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "of to a", mode: "full" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("FULL_TEXT_QUERY_TOO_SHORT");
  });

  it("fails closed when the legacy rules source is active", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "fireball", mode: "full" });

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      message: "Full-text search unavailable",
      error:
        "The active spell source does not provide a compatible full-text index",
      code: "FULL_TEXT_SEARCH_UNAVAILABLE",
    });
  });

  it("returns summary-only full-text matches once per spell", async () => {
    const res = await withSpellReadSource("content", () =>
      request(app)
        .get("/api/spells/search")
        .query({
          q: "extraplanar creature",
          mode: "full",
          rulebookIds: "6",
        }),
    );

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("full");
    expect(res.body.total).toBe(1);
    expect(res.body.items.map((item: any) => item.id)).toEqual([2441]);
  });

  it("ignores short words while matching multi-word full-text queries", async () => {
    const res = await withSpellReadSource("content", () =>
      request(app)
        .get("/api/spells/search")
        .query({
          q: "summon of monster",
          mode: "full",
          rulebookIds: "6",
        }),
    );

    expect(res.status).toBe(200);
    expect(res.body.items.map((item: any) => item.id)).toContain(2441);
  });

  it("searches localized documents and collapses matching variants", async () => {
    const res = await withSpellReadSource("content", () =>
      request(app)
        .get("/api/spells/search")
        .query({ q: "火球术", mode: "full", rulebookIds: "6", lang: "zh" }),
    );

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items.map((item: any) => item.id)).toEqual([100]);
  });

  it("ranks name matches ahead of body-only matches", async () => {
    const res = await withSpellReadSource("content", () =>
      request(app)
        .get("/api/spells/search")
        .query({ q: "fireball", mode: "full", rulebookIds: "4,6" }),
    );

    expect(res.status).toBe(200);
    expect(res.body.items.map((item: any) => item.id)).toEqual([100, 2]);
  });

  it("paginates the de-duplicated spell set deterministically", async () => {
    const [first, second] = await withSpellReadSource("content", () =>
      Promise.all([
        request(app)
          .get("/api/spells/search")
          .query({
            q: "description",
            mode: "full",
            rulebookIds: "4,6",
            page: 1,
            pageSize: 1,
          }),
        request(app)
          .get("/api/spells/search")
          .query({
            q: "description",
            mode: "full",
            rulebookIds: "4,6",
            page: 2,
            pageSize: 1,
          }),
      ]),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.total).toBe(second.body.total);
    expect(first.body.total).toBeGreaterThan(1);
    expect(first.body.items).toHaveLength(1);
    expect(second.body.items).toHaveLength(1);
    expect(first.body.items[0].id).not.toBe(second.body.items[0].id);
  });

  it("applies list, taxonomy, component, and mechanics filters in SQL", async () => {
    const res = await withSpellReadSource("content", () =>
      request(app)
        .get("/api/spells/search")
        .query({
          q: "description",
          mode: "full",
          rulebookIds: "6",
          classIds: "1",
          level: "3",
          schoolIds: "1",
          componentKeys: "material",
          rangeKeys: "medium",
          spellResistanceKeys: "yes",
        }),
    );

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items.map((item: any) => item.id)).toEqual([100]);
  });

  it("fails closed for an incompatible content search index", async () => {
    await contentPrisma.$executeRawUnsafe(
      'UPDATE "SpellSearchIndexState" SET "schemaVersion" = 0 WHERE "id" = 1',
    );
    try {
      const res = await withSpellReadSource("content", () =>
        request(app)
          .get("/api/spells/search")
          .query({ q: "fireball", mode: "full", rulebookIds: "6" }),
      );

      expect(res.status).toBe(503);
      expect(res.body.code).toBe("FULL_TEXT_SEARCH_UNAVAILABLE");
    } finally {
      await contentPrisma.$executeRawUnsafe(
        'UPDATE "SpellSearchIndexState" SET "schemaVersion" = 1 WHERE "id" = 1',
      );
    }
  });
});
