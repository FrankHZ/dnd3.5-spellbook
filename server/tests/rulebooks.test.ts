import request from "supertest";
import { app } from "../src/app";

describe("GET /api/rulebooks", () => {
  it("returns rulebooks list", async () => {
    const res = await request(app).get("/api/rulebooks");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
  });
});
