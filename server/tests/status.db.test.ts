import request from "supertest";
import type { DbStatusResponse } from "@dnd/contracts";
import { app } from "../src/app";
import { contentPrisma } from "../src/lib/content-prisma-client";

const STATUS_ENV_KEYS = [
  "APP_DATABASE_URL",
  "ENABLE_DB_STATUS_PUBLIC",
  "NODE_ENV",
  "SPELL_READ_SOURCE",
  "SPELLBOOK_DB_STATUS_TOKEN",
] as const;

describe("GET /api/status/db", () => {
  const previousEnv = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const key of STATUS_ENV_KEYS) {
      previousEnv.set(key, process.env[key]);
    }
  });

  afterEach(() => {
    for (const key of STATUS_ENV_KEYS) {
      const previous = previousEnv.get(key);
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  });

  it("reports content DB provenance and sanitized database roles", async () => {
    delete process.env.SPELL_READ_SOURCE;
    process.env.APP_DATABASE_URL = process.env.CONTENT_DATABASE_URL;

    const res = await request(app).get("/api/status/db");

    expect(res.status).toBe(200);
    const body = res.body as DbStatusResponse;

    expect(body.activeSpellReadSource).toBe("content");
    expect(body.databases.rules).toMatchObject({
      configured: true,
      scheme: "file",
      fileName: "rules-test.sqlite",
      exists: true,
    });
    expect(body.databases.content).toMatchObject({
      configured: true,
      scheme: "file",
      fileName: "content-test.sqlite",
      exists: true,
    });
    expect(body.databases.contentAlias).toMatchObject({
      configured: true,
      scheme: "file",
      fileName: "content-test.sqlite",
      exists: true,
      matchesContent: true,
    });
    expect(body.databases.appState).toMatchObject({
      configured: true,
      scheme: "file",
      fileName: "app-state-test.sqlite",
      exists: false,
    });

    expect(body.content.status).toBe("ok");
    expect(body.content.latestBuild).toMatchObject({
      id: "rules-content:fixture",
      sourceKind: "rules-clean",
      generatorVersion: "rules-content-normalizer-fixture",
      generatedAt: "2026-07-03T00:00:00.000Z",
      spellCount: 7,
      issueCount: 1,
      parentRepoCommit: "fixture-parent-commit",
      dataRepoCommit: "fixture-data-commit",
      rulesManifestSha256: "fixture-manifest-sha256",
      rulesDbSha256: "fixture-rules-db-sha256",
      migrationSetSha256: "fixture-migrations-sha256",
    });
    expect(body.content.tableCounts).toMatchObject({
      rulebookContent: 3,
      spellContent: 7,
      spellTaxonomyFacet: 10,
      spellComponent: 14,
      spellMechanicFacet: 0,
      rulesContentIssue: 1,
    });
  });

  it("reports missing content build metadata without failing the endpoint", async () => {
    const latestBuild = await contentPrisma.rulesContentBuild.findFirst({
      orderBy: [{ generatedAt: "desc" }, { id: "desc" }],
    });
    await contentPrisma.rulesContentBuild.deleteMany();

    try {
      const res = await request(app).get("/api/status/db");

      expect(res.status).toBe(200);
      const body = res.body as DbStatusResponse;
      expect(body.content.status).toBe("missing_metadata");
      expect(body.content.latestBuild).toBeNull();
      expect(body.content.tableCounts).toMatchObject({
        rulebookContent: 3,
        spellContent: 7,
        rulesContentIssue: 1,
      });
    } finally {
      if (latestBuild) {
        await contentPrisma.rulesContentBuild.create({ data: latestBuild });
      }
    }
  });

  it("reports the explicit legacy rules read-source rollback switch", async () => {
    process.env.SPELL_READ_SOURCE = "rules";
    process.env.APP_DATABASE_URL = "file:/tmp/legacy-app-alias.sqlite";

    const res = await request(app).get("/api/status/db");

    expect(res.status).toBe(200);
    const body = res.body as DbStatusResponse;
    expect(body.activeSpellReadSource).toBe("rules");
    expect(body.databases.contentAlias).toMatchObject({
      configured: true,
      scheme: "file",
      fileName: "legacy-app-alias.sqlite",
      exists: false,
      matchesContent: false,
    });
  });

  it("blocks production DB provenance by default", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENABLE_DB_STATUS_PUBLIC;
    delete process.env.SPELLBOOK_DB_STATUS_TOKEN;

    const res = await request(app).get("/api/status/db");

    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain("activeSpellReadSource");
  });

  it("allows production DB provenance with the operations token", async () => {
    process.env.NODE_ENV = "production";
    process.env.SPELLBOOK_DB_STATUS_TOKEN = "status-secret";

    const res = await request(app)
      .get("/api/status/db")
      .set("Authorization", "Bearer status-secret");

    expect(res.status).toBe(200);
    const body = res.body as DbStatusResponse;
    expect(body.activeSpellReadSource).toBe("rules");
  });

  it("allows production DB provenance when explicitly public", async () => {
    process.env.NODE_ENV = "production";
    process.env.ENABLE_DB_STATUS_PUBLIC = "true";

    const res = await request(app).get("/api/status/db");

    expect(res.status).toBe(200);
    const body = res.body as DbStatusResponse;
    expect(body.databases.content).toMatchObject({
      configured: true,
      fileName: "content-test.sqlite",
    });
  });
});
