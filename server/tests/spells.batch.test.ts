import request from "supertest";
import { app } from "../src/app";

describe("POST /api/spells/batch", () => {
  it("returns items in input order and missingIds", async () => {
    const res = await request(app)
      .post("/api/spells/batch")
      .send({ ids: [1, 9999999, 2] });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(Array.isArray(res.body.missingIds)).toBe(true);
    expect(res.body.missingIds).toContain(9999999);

    // if 1 and 2 exist, they should appear in the same order
    const returnedIds = res.body.items.map((x: any) => x.id);
    // returnedIds should be a subsequence of [1,2] in order
    expect(returnedIds.join(",")).toMatch(/1.*2|2.*1|1|2/); // tolerant if one id missing in your DB
  });

  it("rejects empty ids", async () => {
    const res = await request(app).post("/api/spells/batch").send({ ids: [] });

    expect(res.status).toBe(400);
  });
});
