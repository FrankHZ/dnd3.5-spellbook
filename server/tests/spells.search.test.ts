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

  it("rejects short query", async () => {
    const res = await request(app).get("/api/spells/search").query({ q: "f" });

    expect(res.status).toBe(400);
  });
});
