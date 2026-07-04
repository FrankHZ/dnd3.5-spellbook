import express from "express";
import request from "supertest";
import { app } from "~/app";
import { errorMiddleware } from "~/middlewares/error.middleware";

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

  it("hides unexpected error details in production", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const testApp = express();
    testApp.get("/boom", () => {
      throw new Error("secret sqlite path /opt/spellbook/data/content.sqlite");
    });
    testApp.use(errorMiddleware);

    try {
      const res = await request(testApp).get("/boom");

      expect(res.status).toBe(500);
      expectApiErrorShape(
        res.body,
        "Internal server error",
        "Internal server error",
      );
      expect(JSON.stringify(res.body)).not.toContain("/opt/spellbook");
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });

  it("keeps unexpected error details in non-production responses", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    const testApp = express();
    testApp.get("/boom", () => {
      throw new Error("visible local debug message");
    });
    testApp.use(errorMiddleware);

    try {
      const res = await request(testApp).get("/boom");

      expect(res.status).toBe(500);
      expectApiErrorShape(
        res.body,
        "Internal server error",
        "visible local debug message",
      );
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });
});
