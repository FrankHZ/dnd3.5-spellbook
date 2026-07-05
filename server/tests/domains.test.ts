import request from "supertest";
import { app } from "#server/app";

describe("GET /api/domains", () => {
  it("returns base domains by default", async () => {
    const res = await request(app).get("/api/domains");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((c: any) => c.name.length > 0)).toBe(true);
  });
  it("returns domains with zh", async () => {
    const res = await request(app).get("/api/domains?lang=zh");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.some((c: any) => c.i18n !== undefined)).toBe(true);
  });
});
