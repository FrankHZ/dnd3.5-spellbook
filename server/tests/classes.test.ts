import request from "supertest";
import { app } from "../src/app";

describe("GET /api/classes", () => {
  it("returns base classes by default", async () => {
    const res = await request(app).get("/api/classes");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((c: any) => c.prestige === false)).toBe(true);
  });
});
