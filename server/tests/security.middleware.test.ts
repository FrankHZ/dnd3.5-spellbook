import request from "supertest";
import { app } from "~/app";

const ENV_KEYS = ["NODE_ENV", "SPELLBOOK_CORS_ORIGINS"] as const;

describe("security middleware", () => {
  const previousEnv = new Map<string, string | undefined>();

  beforeEach(() => {
    previousEnv.clear();
    for (const key of ENV_KEYS) {
      previousEnv.set(key, process.env[key]);
    }
    delete process.env.SPELLBOOK_CORS_ORIGINS;
  });

  afterEach(() => {
    for (const [key, previous] of previousEnv) {
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  });

  it("adds baseline security headers to API responses", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["cross-origin-resource-policy"]).toBe("same-origin");
    expect(res.headers["content-security-policy"]).toContain(
      "default-src 'none'",
    );
  });

  it("keeps local development CORS permissive", async () => {
    process.env.NODE_ENV = "development";

    const res = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("does not allow arbitrary production CORS origins by default", async () => {
    process.env.NODE_ENV = "production";

    const res = await request(app)
      .get("/health")
      .set("Origin", "https://untrusted.example");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows configured production CORS origins", async () => {
    process.env.NODE_ENV = "production";
    process.env.SPELLBOOK_CORS_ORIGINS =
      "https://spellbook.example, https://www.spellbook.example";

    const res = await request(app)
      .get("/health")
      .set("Origin", "https://www.spellbook.example");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "https://www.spellbook.example",
    );
  });
});
