import request from "supertest";
import { app } from "../src/app";

describe("GET /api/spells/:id", () => {
  it("returns spell detail", async () => {
    const res = await request(app).get("/api/spells/1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.name).toBeTruthy();
  });

  it("returns 404 for invalid id", async () => {
    const res = await request(app).get("/api/spells/9999999");
    expect(res.status).toBe(404);
  });
});
