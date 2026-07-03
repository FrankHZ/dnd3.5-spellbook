import request from "supertest";
import { app } from "~/app";
import { activeSpellReadSource } from "~/services/spells/spells.repo.read";

describe("normalized content spell read source", () => {
  const previousSource = process.env.SPELL_READ_SOURCE;

  afterEach(() => {
    if (previousSource === undefined) {
      delete process.env.SPELL_READ_SOURCE;
    } else {
      process.env.SPELL_READ_SOURCE = previousSource;
    }
  });

  it("uses normalized content by default", () => {
    delete process.env.SPELL_READ_SOURCE;
    expect(activeSpellReadSource()).toBe("content");
  });

  it("allows an explicit legacy rules opt-out", () => {
    process.env.SPELL_READ_SOURCE = "rules";
    expect(activeSpellReadSource()).toBe("rules");
  });

  it("serves representative spell API flows from normalized content by default", async () => {
    delete process.env.SPELL_READ_SOURCE;

    const search = await request(app)
      .get("/api/spells/search")
      .query({ q: "fire", rulebookIds: "4,6" });
    expect(search.status).toBe(200);
    expect(search.body.items.map((item: any) => item.id)).toEqual([100]);

    const byLevel = await request(app)
      .get("/api/spells/by-level")
      .query({ classIds: "1", level: 3, rulebookIds: "4" });
    expect(byLevel.status).toBe(200);
    expect(byLevel.body.groups[0]?.items.map((item: any) => item.id)).toEqual([
      1, 2,
    ]);

    const detail = await request(app).get("/api/spells/1");
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id: 1,
      name: "Acid Arrow",
      rulebook: { id: 4, abbr: "PH" },
    });

    const batch = await request(app)
      .post("/api/spells/batch")
      .send({ ids: [1, 999999, 2] });
    expect(batch.status).toBe(200);
    expect(batch.body.items.map((item: any) => item.id)).toEqual([1, 2]);
    expect(batch.body.missingIds).toEqual([999999]);

    const resolve = await request(app)
      .post("/api/spells/resolve")
      .send({ names: ["Last Breath"], rulebookIds: [6, 56] });
    expect(resolve.status).toBe(200);
    expect(resolve.body.results[0]).toMatchObject({
      input: "Last Breath",
      status: "ambiguous",
    });
    expect(resolve.body.results[0].candidates.map((item: any) => item.id)).toEqual([
      3000, 3001,
    ]);
  });
});
