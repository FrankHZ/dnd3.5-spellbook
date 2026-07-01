import request from "supertest";
import { app } from "../src/app";

describe("GET /api/spells/search", () => {
  it("searches spells by name", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "fire" });

    expect(res.status).toBe(200);
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
});
