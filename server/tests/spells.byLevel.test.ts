import request from "supertest";
import { app } from "../src/app";

describe("GET /api/spells/by--level", () => {
  it("lists spells for class + level", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({ classIds: "1", level: 3, rulebookIds: "4,6" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("lists spells for class + level + lang", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({ classIds: "1", level: 3, rulebookIds: "4,6", lang: "zh" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items[0].i18n.name).toBeDefined();
  });

  it("rejects missing level", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({ classIds: "1" });

    expect(res.status).toBe(400);
  });
});
