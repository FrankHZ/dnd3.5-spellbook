import request from "supertest";
import { app } from "#server/app";

describe("GET /api/spells/:id", () => {
  const previousSource = process.env.SPELL_READ_SOURCE;

  afterEach(() => {
    if (previousSource === undefined) {
      delete process.env.SPELL_READ_SOURCE;
    } else {
      process.env.SPELL_READ_SOURCE = previousSource;
    }
  });

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

  it("returns accepted normalized mechanics metadata from content detail", async () => {
    delete process.env.SPELL_READ_SOURCE;

    const magicMissile = await request(app).get("/api/spells/101");

    expect(magicMissile.status).toBe(200);
    expect(magicMissile.body.casting).toMatchObject({
      duration: "1 round/level (D)",
      savingThrow: "Will negates (harmless)",
      spellResistance: "No",
      mechanics: {
        duration: { dismissible: true },
        savingThrow: { negates: true, harmless: true },
      },
    });
    expect(magicMissile.body.casting.mechanics.spellResistance).toBeUndefined();

    const fireball = await request(app).get("/api/spells/100");

    expect(fireball.status).toBe(200);
    expect(fireball.body.casting).toMatchObject({
      spellResistance: "Yes (harmless)",
      mechanics: {
        spellResistance: { harmless: true },
      },
    });
    expect(fireball.body.casting.mechanics.duration).toBeUndefined();
    expect(fireball.body.casting.mechanics.savingThrow).toBeUndefined();
  });

  it("does not infer normalized mechanics metadata from legacy rules detail", async () => {
    process.env.SPELL_READ_SOURCE = "rules";

    const res = await request(app).get("/api/spells/101");

    expect(res.status).toBe(200);
    expect(res.body.casting).toMatchObject({
      duration: "1 round/level (D)",
      savingThrow: "Will negates (harmless)",
      spellResistance: "No",
    });
    expect(res.body.casting.mechanics).toBeUndefined();
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
