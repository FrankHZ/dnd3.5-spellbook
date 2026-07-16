import request from "supertest";
import { app } from "#server/app";

describe("GET /api/spells/search", () => {
  it("searches spells by name", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "fire" });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("name");
    expect(Array.isArray(res.body.items)).toBe(true);
  });

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
      error: "full-text query must contain at least 3 Unicode code points",
      code: "FULL_TEXT_QUERY_TOO_SHORT",
    });
  });

  it("fails closed when full-text search is not available", async () => {
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
});
