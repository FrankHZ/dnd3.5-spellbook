import request from "supertest";
import { app } from "../src/app";

describe("GET /api/domains", () => {
  it("returns base domains by default", async () => {
    const res = await request(app).get("/api/domains");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((c: any) => c.name.length > 0)).toBe(true);
  });
});
