import request from "supertest";
import { app } from "~/app";

function expectPositiveInteger(value: unknown) {
  expect(typeof value).toBe("number");
  expect(Number.isInteger(value)).toBe(true);
  expect(value).toBeGreaterThan(0);
}

function expectRulebookMin(value: any) {
  expectPositiveInteger(value.id);
  expect(typeof value.name).toBe("string");
  expect(value.name.length).toBeGreaterThan(0);
  expect(typeof value.abbr).toBe("string");
  expect(value.abbr.length).toBeGreaterThan(0);
}

function expectSpellItemShape(item: any) {
  expectPositiveInteger(item.id);
  expect(typeof item.slug).toBe("string");
  expect(typeof item.name).toBe("string");
  expect(item.name.length).toBeGreaterThan(0);
  expectRulebookMin(item.rulebook);
  expect(Array.isArray(item.descriptors)).toBe(true);
  expect(Array.isArray(item.classLevels)).toBe(true);
  expect(Array.isArray(item.domainLevels)).toBe(true);
  expect(typeof item.components).toBe("object");
  expect(typeof item.casting).toBe("object");
}

describe("API response shape invariants", () => {
  it("keeps spell search pagination and item shape stable", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "fire", page: 1, pageSize: 5 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(5);
    expect(res.body.q).toBe("fire");
    expect(typeof res.body.total).toBe("number");
    expect(Array.isArray(res.body.rulebookIds)).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeLessThanOrEqual(5);
    if (res.body.items.length > 0) expectSpellItemShape(res.body.items[0]);
  });

  it("keeps spell detail shape stable", async () => {
    const res = await request(app).get("/api/spells/1");

    expect(res.status).toBe(200);
    expectSpellItemShape(res.body);
    expect(typeof res.body.added).toBe("string");
    expect(typeof res.body.description).toBe("object");
    expect(typeof res.body.description.text).toBe("string");
    expect(typeof res.body.description.html).toBe("string");
    expect(typeof res.body.verified).toBe("object");
    expect(typeof res.body.verified.verified).toBe("boolean");
  });

  it("keeps by-level group and pagination shape stable", async () => {
    const res = await request(app)
      .get("/api/spells/by-level")
      .query({ classIds: "1", level: 3, rulebookIds: "4,6", page: 1, pageSize: 5 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(5);
    expect(typeof res.body.total).toBe("number");
    expect(res.body.classIds).toEqual([1]);
    expect(res.body.domainIds).toEqual([]);
    expect(res.body.rulebookIds).toEqual([4, 6]);
    expect(Array.isArray(res.body.groups)).toBe(true);

    if (res.body.groups.length > 0) {
      expect(typeof res.body.groups[0].level).toBe("number");
      expect(Array.isArray(res.body.groups[0].items)).toBe(true);
      if (res.body.groups[0].items.length > 0) {
        expectSpellItemShape(res.body.groups[0].items[0]);
      }
    }
  });

  it("keeps metadata list shape stable", async () => {
    const [rulebooks, classes, domains] = await Promise.all([
      request(app).get("/api/rulebooks"),
      request(app).get("/api/classes"),
      request(app).get("/api/domains"),
    ]);

    expect(rulebooks.status).toBe(200);
    expect(classes.status).toBe(200);
    expect(domains.status).toBe(200);

    expect(Array.isArray(rulebooks.body.items)).toBe(true);
    expect(Array.isArray(classes.body.items)).toBe(true);
    expect(Array.isArray(domains.body.items)).toBe(true);

    expectRulebookMin(rulebooks.body.items[0]);
    expectPositiveInteger(classes.body.items[0].id);
    expect(typeof classes.body.items[0].name).toBe("string");
    expect(typeof classes.body.items[0].prestige).toBe("boolean");
    expectPositiveInteger(domains.body.items[0].id);
    expect(typeof domains.body.items[0].name).toBe("string");
  });
});
