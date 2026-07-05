import request from "supertest";
import { app } from "#server/app";

describe("GET /api/spells/:id", () => {
  it("returns spell detail", async () => {
    const res = await request(app).get("/api/spells/1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.name).toBeTruthy();
  });

  it("returns spell detail with an English short description", async () => {
    const res = await request(app).get("/api/spells/2441");
    expect(res.status).toBe(200);
    expect(res.body.i18n?.summary).toMatchObject({
      lang: "en",
      variant: "imarvin",
      shortDescription: "Calls extraplanar creature to fight for you.",
    });
  });

  it("returns 404 for invalid id", async () => {
    const res = await request(app).get("/api/spells/9999999");
    expect(res.status).toBe(404);
  });

  it("returns spell detail with chm zh", async () => {
    const res = await request(app).get("/api/spells/887?lang=zh");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(887);
    expect(res.body.name).toBeTruthy();
    expect(res.body.i18n.name).toBe("独角兽之心");
    expect(res.body.i18n.summary).toMatchObject({
      lang: "zh",
      variant: "chm",
      shortDescription:
        "获得60尺速度,+4基于力量,敏捷,体质的检定；可使用一次次元门。",
    });
  });
});
