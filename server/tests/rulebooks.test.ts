import request from "supertest";
import { app } from "#server/app";
import type { RulebookListResponse } from "@dnd/contracts";

describe("GET /api/rulebooks", () => {
  it("returns rulebooks list", async () => {
    const res = await request(app).get("/api/rulebooks");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it("distinguishes source abbreviations from display abbreviations", async () => {
    const res = await request(app).get("/api/rulebooks");
    expect(res.status).toBe(200);

    const body = res.body as RulebookListResponse;
    const spellCompendium = body.items.find((item) => item.id === 6);

    expect(spellCompendium).toMatchObject({
      id: 6,
      abbr: "SC",
      displayAbbr: "SpC",
      name: "Spell Compendium",
      publicationCategory: "supplement",
      publicationFamily: "supplemental",
      publicationSourceKind: "rulebook",
      publicationDisplayOrder: 20006,
      publicationYear: "2005",
      publicationDate: "2005-12-01",
      publicationReviewStatus: "accepted",
    });
  });
});
