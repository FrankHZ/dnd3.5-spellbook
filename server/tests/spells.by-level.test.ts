import request from "supertest";
import { app } from "~/app";

describe("GET /api/spells/by-level", () => {
  it("lists spells for class + single level (grouped)", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({ classIds: "1", level: 3, rulebookIds: "4,6" });

    expect(res.status).toBe(200);

    expect(Array.isArray(res.body.groups)).toBe(true);
    expect(res.body.groups.length).toBeGreaterThan(0);
    expect(res.body.groups[0].level).toBe(3);
    expect(Array.isArray(res.body.groups[0].items)).toBe(true);
  });

  it("lists spells for class + single level + lang=zh", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({ classIds: "1", level: 3, rulebookIds: "4,6", lang: "zh" });

    expect(res.status).toBe(200);

    expect(Array.isArray(res.body.groups)).toBe(true);
    expect(res.body.groups[0]?.items?.length ?? 0).toBeGreaterThan(0);

    const first = res.body.groups[0].items[0];
    expect(first.i18n).toBeDefined();
    expect(first.i18n.name).toBeDefined();
  });

  it("lists spells for class + level=all (grouped)", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({ classIds: "1", level: "all", rulebookIds: "4,6" });

    expect(res.status).toBe(200);

    expect(Array.isArray(res.body.groups)).toBe(true);

    // groups should be sorted by level ascending; just sanity check shape
    if (res.body.groups.length > 0) {
      expect(typeof res.body.groups[0].level).toBe("number");
      expect(Array.isArray(res.body.groups[0].items)).toBe(true);
    }
  });

  it("rejects missing level", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({ classIds: "1", rulebookIds: "4,6" });

    expect(res.status).toBe(400);
  });

  it("rejects missing classIds and domainIds", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({ level: 3, rulebookIds: "4,6" });

    expect(res.status).toBe(400);
  });
});
