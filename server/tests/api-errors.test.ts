import request from "supertest";
import { app } from "~/app";

function expectApiErrorShape(body: any, message: string, error: string) {
  expect(body).toEqual({ message, error });
}

describe("API error response invariants", () => {
  it("returns a stable 404 payload for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist");

    expect(res.status).toBe(404);
    expectApiErrorShape(
      res.body,
      "Not found",
      "No route for GET /api/does-not-exist",
    );
  });

  it("returns a stable 400 payload for missing search query", async () => {
    const res = await request(app).get("/api/spells/search");

    expect(res.status).toBe(400);
    expectApiErrorShape(
      res.body,
      "Invalid request",
      "q must be a non-empty string",
    );
  });

  it("returns a stable 400 payload for invalid spell detail ids", async () => {
    const res = await request(app).get("/api/spells/not-a-number");

    expect(res.status).toBe(400);
    expectApiErrorShape(
      res.body,
      "Invalid request",
      "id must be a positive integer",
    );
  });

  it("clamps spell search pagination to documented request bounds", async () => {
    const res = await request(app)
      .get("/api/spells/search")
      .query({ q: "fire", page: -10, pageSize: 5000 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(100);
  });
});
