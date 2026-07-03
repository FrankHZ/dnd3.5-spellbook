import request from "supertest";
import type { DbStatusResponse } from "@dnd/contracts";
import { app } from "../src/app";

describe("GET /api/status/db", () => {
  const previousReadSource = process.env.SPELL_READ_SOURCE;
  const previousAppDatabaseUrl = process.env.APP_DATABASE_URL;

  afterEach(() => {
    if (previousReadSource === undefined) {
      delete process.env.SPELL_READ_SOURCE;
    } else {
      process.env.SPELL_READ_SOURCE = previousReadSource;
    }

    if (previousAppDatabaseUrl === undefined) {
      delete process.env.APP_DATABASE_URL;
    } else {
      process.env.APP_DATABASE_URL = previousAppDatabaseUrl;
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
});
