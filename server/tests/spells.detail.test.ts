import request from "supertest";
import { app } from "#server/app";
import { contentPrisma } from "#server/lib/content-prisma-client";

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
        castingTime: {
          category: "standard_action",
          amount: 1,
          unit: "action",
          flags: {},
          normalizedText: "1 standard action",
          displayCoverage: "complete",
        },
        range: {
          category: "medium",
          amount: null,
          unit: null,
          flags: {},
          normalizedText: "Medium (100 ft. + 10 ft./level)",
          displayCoverage: "complete",
        },
        target: {
          category: "creature",
          normalizedText: null,
          displayCoverage: "partial",
        },
        effect: {
          category: "empty",
          normalizedText: null,
          displayCoverage: "empty",
        },
        area: {
          category: "empty",
          normalizedText: null,
          displayCoverage: "empty",
        },
        duration: {
          category: "timed",
          amount: 1,
          unit: "round",
          flags: {
            dismissible: true,
            discharge: false,
            concentration: false,
            perLevel: true,
          },
          normalizedText: "1 round/level (D)",
          displayCoverage: "complete",
          dismissible: true,
        },
        savingThrow: {
          category: "will",
          normalizedText: "Will negates (harmless)",
          displayCoverage: "complete",
          negates: true,
          harmless: true,
        },
        spellResistance: {
          category: "no",
          normalizedText: "No",
          displayCoverage: "complete",
        },
      },
    });
    expect(
      magicMissile.body.casting.mechanics.spellResistance.harmless,
    ).toBeUndefined();

    const fireball = await request(app).get("/api/spells/100");

    expect(fireball.status).toBe(200);
    expect(fireball.body.casting).toMatchObject({
      spellResistance: "Yes (harmless)",
      mechanics: {
        spellResistance: {
          category: "yes",
          normalizedText: "Yes (harmless)",
          displayCoverage: "complete",
          harmless: true,
        },
      },
    });
    expect(fireball.body.casting.mechanics.duration).toMatchObject({
      category: "instantaneous",
      displayCoverage: "complete",
    });
    expect(fireball.body.casting.mechanics.savingThrow).toMatchObject({
      category: "none",
      displayCoverage: "complete",
    });
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

  it("fails closed on default malformed effective while preserving explicit CHM", async () => {
    for (const source of ["rules", "content"]) {
      process.env.SPELL_READ_SOURCE = source;
      const before = await request(app).get("/api/spells/1?lang=zh&variant=chm");
      expect(before.status).toBe(200);
      await contentPrisma.i18nSpellText.create({ data: {
        spellId: 1, rulebookId: 4, lang: "zh", variant: "effective",
        name: "Synthetic effective name", descriptionText: "Synthetic effective body",
        nameProvenanceJson: '{"language":"en"}', bodyProvenanceJson: '{"language":"en"}',
      } });
      try {
        const invalid = await request(app).get("/api/spells/1?lang=zh");
        expect(invalid.status).toBe(500);
        expect(invalid.body.code).toBe("INVALID_EFFECTIVE_PROVENANCE");
        for (const query of ["lang=zh&variant=chm"]) {
          const after = await request(app).get(`/api/spells/1?${query}`);
          expect(after.status).toBe(200);
          expect(after.body).toEqual(before.body);
        }
      } finally {
        await contentPrisma.i18nSpellText.deleteMany({ where: { spellId: 1, lang: "zh", variant: "effective" } });
      }
    }
  });
});
