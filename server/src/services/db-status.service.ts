import fs from "node:fs";
import path from "node:path";
import type {
  ContentDbTableCounts,
  DbRoleStatus,
  DbStatusResponse,
  PublicContentStatus,
  RulesContentBuildStatus,
} from "@dnd/contracts";
import { contentPrisma } from "#server/lib/content-prisma-client";
import { activeSpellReadSource } from "#server/services/spells/spells.repo.read";

function optional(value: string | null | undefined) {
  return value && value.length > 0 ? value : undefined;
}

function filePathFromUrl(value: string | undefined) {
  if (!value?.startsWith("file:")) return undefined;
  return decodeURI(value.slice("file:".length));
}

function fileNameFromPath(filePath: string) {
  return filePath.split(/[\\/]/).filter(Boolean).at(-1) ?? path.basename(filePath);
}

function dbRoleStatus(value: string | undefined): DbRoleStatus {
  if (!value) return { configured: false };

  const filePath = filePathFromUrl(value);
  if (!filePath) {
    const scheme = value.includes(":") ? value.split(":", 1)[0] : "unknown";
    return {
      configured: true,
      scheme,
    };
  }

  return {
    configured: true,
    scheme: "file",
    fileName: fileNameFromPath(filePath),
    exists: fs.existsSync(filePath),
  };
}

function sameFileUrl(left: string | undefined, right: string | undefined) {
  const leftPath = filePathFromUrl(left);
  const rightPath = filePathFromUrl(right);
  if (!leftPath || !rightPath) return left === right;
  return path.resolve(leftPath) === path.resolve(rightPath);
}

function mapBuild(
  build: Awaited<ReturnType<typeof contentPrisma.rulesContentBuild.findFirst>>,
): RulesContentBuildStatus | null {
  if (!build) return null;

  return {
    id: build.id,
    sourceKind: build.sourceKind,
    ...(build.sourceSha256 ? { sourceSha256: build.sourceSha256 } : {}),
    generatorVersion: build.generatorVersion,
    generatedAt: build.generatedAt.toISOString(),
    spellCount: build.spellCount,
    issueCount: build.issueCount,
    ...(build.parentRepoCommit
      ? { parentRepoCommit: build.parentRepoCommit }
      : {}),
    ...(build.dataRepoCommit ? { dataRepoCommit: build.dataRepoCommit } : {}),
    ...(build.rulesManifestSha256
      ? { rulesManifestSha256: build.rulesManifestSha256 }
      : {}),
    ...(build.rulesDbSha256 ? { rulesDbSha256: build.rulesDbSha256 } : {}),
    ...(build.migrationSetSha256
      ? { migrationSetSha256: build.migrationSetSha256 }
      : {}),
  };
}

async function getContentStatus(): Promise<DbStatusResponse["content"]> {
  try {
    const [latestBuild, tableCounts] = await Promise.all([
      contentPrisma.rulesContentBuild.findFirst({
        orderBy: [{ generatedAt: "desc" }, { id: "desc" }],
      }),
      getContentTableCounts(),
    ]);

    return {
      status: latestBuild ? "ok" : "missing_metadata",
      latestBuild: mapBuild(latestBuild),
      tableCounts,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown content DB error";
    return {
      status: "error",
      latestBuild: null,
      tableCounts: null,
      error: message,
    };
  }
}

async function getContentTableCounts(): Promise<ContentDbTableCounts> {
  const [
    rulebookContent,
    spellContent,
    spellTaxonomyFacet,
    spellComponent,
    spellMechanicFacet,
    rulesContentIssue,
  ] = await Promise.all([
    contentPrisma.rulebookContent.count(),
    contentPrisma.spellContent.count(),
    contentPrisma.spellTaxonomyFacet.count(),
    contentPrisma.spellComponent.count(),
    contentPrisma.spellMechanicFacet.count(),
    contentPrisma.rulesContentIssue.count(),
  ]);

  return {
    rulebookContent,
    spellContent,
    spellTaxonomyFacet,
    spellComponent,
    spellMechanicFacet,
    rulesContentIssue,
  };
}

export const dbStatusService = {
  async getPublicContentStatus(): Promise<PublicContentStatus> {
    const content = await getContentStatus();
    const latestBuild = content.latestBuild
      ? {
          generatorVersion: content.latestBuild.generatorVersion,
          generatedAt: content.latestBuild.generatedAt,
          spellCount: content.latestBuild.spellCount,
          issueCount: content.latestBuild.issueCount,
        }
      : null;

    return {
      activeSpellReadSource: activeSpellReadSource(),
      status: content.status,
      latestBuild,
    };
  },

  async getDbStatus(): Promise<DbStatusResponse> {
    const contentUrl = process.env.CONTENT_DATABASE_URL ?? process.env.APP_DATABASE_URL;
    const contentAlias = dbRoleStatus(process.env.APP_DATABASE_URL);
    if (contentAlias.configured) {
      contentAlias.matchesContent = sameFileUrl(
        process.env.APP_DATABASE_URL,
        contentUrl,
      );
    }

    return {
      activeSpellReadSource: activeSpellReadSource(),
      databases: {
        rules: dbRoleStatus(process.env.RULES_DATABASE_URL),
        content: dbRoleStatus(contentUrl),
        contentAlias,
        appState: dbRoleStatus(process.env.APP_STATE_DATABASE_URL),
      },
      content: await getContentStatus(),
    };
  },
};
