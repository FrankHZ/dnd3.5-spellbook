import request from "supertest";
import { app } from "~/app";

describe("POST /api/spells/resolve", () => {
  it("returns resolved / ambiguous / not_found structure", async () => {
    const res = await request(app)
      .post("/api/spells/resolve")
      .send({
        names: ["Magic Missile", "DefinitelyNotASpell"],
      });

    expect(res.status).toBe(200);

    expect(Array.isArray(res.body.results)).toBe(true);
    expect(Array.isArray(res.body.conflictRulebooks)).toBe(true);

    const results = res.body.results;
    expect(results.length).toBe(2);

    // First result structure check
    expect(results[0]).toHaveProperty("input");
    expect(results[0]).toHaveProperty("status");

    // Second should be not_found
    const nf = results.find((x: any) => x.input === "DefinitelyNotASpell");
    expect(nf).toBeDefined();
    expect(nf.status).toBe("not_found");
  });

  it("handles ambiguous names without crashing", async () => {
    const res = await request(app)
      .post("/api/spells/resolve")
      .send({
        names: ["Last Breath"],
        rulebookIds: [6, 56, 86],
      });

    expect(res.status).toBe(200);

    const result = res.body.results[0];
    expect(result).toHaveProperty("status");

    if (result.status === "ambiguous") {
      expect(Array.isArray(result.candidates)).toBe(true);
      expect(res.body.conflictRulebooks.length).toBeGreaterThan(0);
    }

    if (result.status === "resolved") {
      expect(result).toHaveProperty("spellId");
      expect(result).toHaveProperty("spell");
    }
  });

  it("rejects invalid body", async () => {
    const res = await request(app).post("/api/spells/resolve").send({});

    expect(res.status).toBe(400);
  });

  it("rejects empty names array", async () => {
    const res = await request(app)
      .post("/api/spells/resolve")
      .send({ names: [] });

    expect(res.status).toBe(400);
  });

  it("rejects oversized names array", async () => {
    const large = new Array(5000).fill("Magic Missile");

    const res = await request(app)
      .post("/api/spells/resolve")
      .send({ names: large });

    expect(res.status).toBe(400);
  });
});
