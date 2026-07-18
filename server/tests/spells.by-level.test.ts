import request from "supertest";
import { app } from "#server/app";

async function withSpellReadSource<T>(
  source: "rules" | "content",
  run: () => Promise<T>,
) {
  const previous = process.env.SPELL_READ_SOURCE;
  process.env.SPELL_READ_SOURCE = source;
  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env.SPELL_READ_SOURCE;
    else process.env.SPELL_READ_SOURCE = previous;
  }
}

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

  it("returns short descriptions for by-level items", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({ classIds: "1", level: 1, rulebookIds: "6", pageSize: 100 });

    expect(res.status).toBe(200);
    const summonMonster = res.body.groups
      .flatMap((group: any) => group.items)
      .find((item: any) => item.id === 2441);
    expect(summonMonster?.i18n?.summary).toMatchObject({
      lang: "en",
      variant: "imarvin",
      shortDescription: "Calls extraplanar creature to fight for you.",
    });
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

  it.each(["rules", "content"] as const)(
    "preserves one spell in each matching all-level group from the %s source",
    async (source) => {
      const res = await withSpellReadSource(source, () =>
        request(app).get("/api/spells/by-level").query({
          classIds: "1",
          domainIds: "1",
          level: "all",
          rulebookIds: "6",
          componentKeys: "material",
          pageSize: 100,
        }),
      );

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(
        res.body.groups.map((group: any) => ({
          level: group.level,
          ids: group.items.map((item: any) => item.id),
        })),
      ).toEqual([
        { level: 3, ids: [100] },
        { level: 4, ids: [100] },
      ]);
    },
  );

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
