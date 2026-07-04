import request from "supertest";
import type { AppStatusResponse } from "@dnd/contracts";
import { app } from "../src/app";

const METADATA_ENV_KEYS = [
  "SPELLBOOK_VERSION_LABEL",
  "SPELLBOOK_BACKEND_COMMIT_SHA",
  "SPELLBOOK_BACKEND_SHORT_SHA",
  "SPELLBOOK_BACKEND_REF",
  "SPELLBOOK_BACKEND_DEPLOYED_AT",
  "SPELLBOOK_BACKEND_GITHUB_RUN_ID",
  "SPELLBOOK_BACKEND_GITHUB_RUN_ATTEMPT",
  "SPELLBOOK_SECRET_TOKEN",
] as const;

describe("GET /api/status/app", () => {
  const previousEnv = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const key of METADATA_ENV_KEYS) {
      previousEnv.set(key, process.env[key]);
    }
  });

  afterEach(() => {
    for (const key of METADATA_ENV_KEYS) {
      const previous = previousEnv.get(key);
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  });

  it("returns local fallback metadata when deploy metadata is absent", async () => {
    for (const key of METADATA_ENV_KEYS) delete process.env[key];

    const res = await request(app).get("/api/status/app");

    expect(res.status).toBe(200);
    const body = res.body as AppStatusResponse;
    expect(body.backend).toEqual({
      versionLabel: "local",
      source: "local",
    });
  });

  it("returns sanitized deploy metadata from explicit environment variables", async () => {
    process.env.SPELLBOOK_VERSION_LABEL = "v3.7";
    process.env.SPELLBOOK_BACKEND_COMMIT_SHA =
      "1234567890abcdef1234567890abcdef12345678";
    process.env.SPELLBOOK_BACKEND_REF = "main";
    process.env.SPELLBOOK_BACKEND_DEPLOYED_AT = "2026-07-03T20:00:00Z";
    process.env.SPELLBOOK_BACKEND_GITHUB_RUN_ID = "987654321";
    process.env.SPELLBOOK_BACKEND_GITHUB_RUN_ATTEMPT = "2";
    process.env.SPELLBOOK_SECRET_TOKEN = "do-not-leak";

    const res = await request(app).get("/api/status/app");

    expect(res.status).toBe(200);
    const body = res.body as AppStatusResponse;
    expect(body.backend).toMatchObject({
      versionLabel: "v3.7",
      source: "deploy",
      commitSha: "1234567890abcdef1234567890abcdef12345678",
      shortSha: "1234567",
      ref: "main",
      deployedAt: "2026-07-03T20:00:00Z",
      githubRunId: "987654321",
      githubRunAttempt: "2",
    });
    expect(JSON.stringify(body)).not.toContain("do-not-leak");
  });
});
