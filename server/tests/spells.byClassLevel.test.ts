import request from "supertest";
import { app } from "../src/app";

describe("GET /api/spells/by-class-level", () => {
  it("lists spells for class + level", async () => {
    const res = await request(app)
      .get("/api/spells/by-class-level")
      .query({ classIds: "1", level: 3 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("rejects missing level", async () => {
    const res = await request(app)
      .get("/api/spells/by-class-level")
      .query({ classIds: "1" });

    expect(res.status).toBe(400);
  });
});
