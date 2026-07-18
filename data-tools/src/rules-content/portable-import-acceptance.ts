import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

import {
  collectRulesContentArtifactProvenance,
  createRulesContentArtifactMetadata,
  sha256File,
} from "./artifact";
import {
  importGenerated,
  readGenerated,
  type RulesContentImportContext,
} from "./cli";
import {
  RULES_CONTENT_GENERATOR_VERSION,
  type NormalizedRulebookRow,
  type NormalizedRulesContent,
  type NormalizedRulesContentIssueRow,
  type NormalizedSpellAppearanceRow,
  type NormalizedSpellComponentRow,
  type NormalizedSpellListEntryRow,
  type NormalizedSpellMechanicFacetRow,
  type NormalizedSpellRow,
  type NormalizedSpellTaxonomyFacetRow,
} from "./normalize";

type PortableFixtureOperation = {
  op: "insert";
  table: string;
  key: string;
  data: Record<string, unknown>;
};

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const migrationsRoot = path.join(
  repoRoot,
  "server",
  "db",
  "content",
  "migrations",
);
const normalizedFixturePath = path.join(
  repoRoot,
  "server",
  "db",
  "content",
  "fixtures",
  "portable",
  "normalized-rules-spells.jsonl",
);
const buildFixturePath = path.join(
  repoRoot,
  "server",
  "db",
  "content",
  "fixtures",
  "portable",
  "rules-content-builds.jsonl",
);

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "spellbook-rules-content-import-"),
);
const db = new Database(":memory:");

try {
  const appliedMigrations = applyTrackedMigrations(db, migrationsRoot);
  assert.ok(appliedMigrations.length >= 1);
  assert.ok(
    appliedMigrations.includes("20260702090000_add_normalized_rules_content"),
  );
  assert.ok(
    appliedMigrations.includes("20260716060000_add_mechanics_display_coverage"),
  );

  const rulesDbPath = path.join(tempRoot, "portable-rules.sqlite");
  const rulesManifestPath = path.join(tempRoot, "rules-db-manifest.json");
  fs.writeFileSync(rulesDbPath, "portable rules DB bytes", "utf8");
  fs.writeFileSync(
    rulesManifestPath,
    '{"database":{"sha256":"manifest value is not artifact truth"}}\n',
    "utf8",
  );

  const generationProvenance = collectRulesContentArtifactProvenance(
    {
      parentRepoRoot: repoRoot,
      dataRepoRoot: tempRoot,
      rulesDbPath,
      rulesManifestPath,
      rulebookPublicationMetadataPath: normalizedFixturePath,
      chmRulebookPublicationsPath: path.join(
        tempRoot,
        "chm-publications.jsonl",
      ),
      contentMigrationsPath: migrationsRoot,
    },
    {
      requireDataRepo: false,
      requireRulesManifest: true,
      requirePublicationMetadata: true,
    },
  );
  generationProvenance.dataRepo = {
    commit: "portable-data-generation-commit",
    dirty: false,
  };

  const generatedContent = portableArtifact(generationProvenance);
  const artifactPath = path.join(tempRoot, "rules-content.generated.json");
  writeArtifact(artifactPath, generatedContent);
  const content = readGenerated(artifactPath);

  const importerProvenance = structuredClone(generationProvenance);
  importerProvenance.parentRepo = {
    commit: "portable-parent-importer-commit",
    dirty: true,
  };
  importerProvenance.dataRepo = {
    commit: "portable-data-importer-commit",
    dirty: true,
  };
  const importContext: RulesContentImportContext = {
    currentProvenance: importerProvenance,
    importedAt: "2026-07-18T01:00:00.000Z",
  };

  const dryRun = importGenerated(db, content, true, artifactPath, importContext);
  assert.equal(
    (dryRun as unknown as Record<string, unknown>).spells,
    content.spells.length,
  );
  assert.equal(tableCount(db, "SpellContent"), 0);

  const imported = importGenerated(db, content, false, artifactPath, importContext);
  assert.equal(
    (imported as unknown as Record<string, unknown>).spells,
    content.spells.length,
  );
  assert.equal(tableCount(db, "RulebookContent"), content.rulebooks.length);
  assert.equal(tableCount(db, "SpellContent"), content.spells.length);
  assert.equal(tableCount(db, "SpellAppearance"), content.appearances.length);
  assert.equal(
    tableCount(db, "SpellMechanicFacet"),
    content.mechanicFacets.length,
  );

  const build = db
    .prepare(
      `
        SELECT parentRepoCommit, dataRepoCommit, rulesManifestSha256,
          rulesDbSha256, migrationSetSha256, buildMetaJson
        FROM RulesContentBuild
      `,
    )
    .get() as {
    parentRepoCommit: string;
    dataRepoCommit: string;
    rulesManifestSha256: string;
    rulesDbSha256: string;
    migrationSetSha256: string;
    buildMetaJson: string;
  };
  assert.equal(
    build.parentRepoCommit,
    generationProvenance.parentRepo.commit,
  );
  assert.equal(build.dataRepoCommit, generationProvenance.dataRepo.commit);
  assert.equal(build.rulesDbSha256, sha256File(rulesDbPath));
  assert.equal(
    build.rulesManifestSha256,
    generationProvenance.canonicalInputs.rulesManifest?.sha256,
  );
  assert.equal(
    build.migrationSetSha256,
    generationProvenance.contentMigrations.sha256,
  );
  const buildMeta = JSON.parse(build.buildMetaJson) as {
    schema: string;
    artifact: {
      generation: { parentRepo: { commit: string; dirty: boolean } };
    };
    importer: {
      current: { parentRepo: { commit: string; dirty: boolean } };
    };
  };
  assert.equal(buildMeta.schema, "rules-content-build-meta.v2");
  assert.equal(
    buildMeta.artifact.generation.parentRepo.commit,
    generationProvenance.parentRepo.commit,
  );
  assert.equal(
    buildMeta.importer.current.parentRepo.commit,
    importerProvenance.parentRepo.commit,
  );
  assert.notEqual(
    buildMeta.artifact.generation.parentRepo.commit,
    buildMeta.importer.current.parentRepo.commit,
  );

  const limited = structuredClone(content);
  limited.artifact = createRulesContentArtifactMetadata({
    scope: "limited",
    sourceTotals: content.artifact!.sourceTotals,
    provenance: generationProvenance,
    limitations: ["portable limited-artifact regression"],
  });
  assert.throws(
    () => importGenerated(db, limited, false, artifactPath, importContext),
    /cannot be imported/,
  );
  assert.equal(tableCount(db, "SpellContent"), content.spells.length);

  const duplicate = structuredClone(content);
  duplicate.rulebooks.push({
    ...duplicate.rulebooks[0]!,
    id: "rulebook:portable-duplicate",
  });
  duplicate.counts.rulebooks = duplicate.rulebooks.length;
  duplicate.artifact!.sourceTotals.rulebooks = duplicate.rulebooks.length;
  const duplicatePath = path.join(tempRoot, "rules-content.duplicate.json");
  writeArtifact(duplicatePath, duplicate);
  assert.throws(
    () => importGenerated(db, duplicate, false, duplicatePath, importContext),
    /UNIQUE constraint failed: RulebookContent.legacyRulebookId/,
  );
  assert.equal(tableCount(db, "RulebookContent"), content.rulebooks.length);

  console.log("Rules-content portable migration/import acceptance OK");
  console.log(`Applied migrations: ${appliedMigrations.length}`);
  console.log(`Imported spells: ${content.spells.length}`);
} finally {
  db.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function portableArtifact(
  provenance: NonNullable<NormalizedRulesContent["artifact"]>["provenance"],
): NormalizedRulesContent {
  const normalizedOperations = readFixture(normalizedFixturePath);
  const buildOperations = readFixture(buildFixturePath);
  const rulebooks = rows<NormalizedRulebookRow>(
    normalizedOperations,
    "RulebookContent",
  );
  const spells = rows<NormalizedSpellRow>(
    normalizedOperations,
    "SpellContent",
    { verified: false },
  );
  const sparseSpell = spells.find((spell) => spell.id === "spell:5001");
  assert.ok(sparseSpell, "expected sparse pagination spell fixture");
  assert.equal(sparseSpell.sourcePage, null);
  assert.equal(sparseSpell.verified, false);
  assert.ok(Object.hasOwn(sparseSpell, "sourcePage"));
  assert.ok(Object.hasOwn(sparseSpell, "verified"));
  const firstSpell = spells[0]!;
  const appearances: NormalizedSpellAppearanceRow[] = [
    {
      id: `${firstSpell.id}:appearance:portable`,
      spellId: firstSpell.id,
      legacySpellId: firstSpell.legacySpellId,
      rulebookId: firstSpell.sourceRulebookId,
      page: firstSpell.sourcePage,
      printedName: firstSpell.canonicalName,
      sourceSlug: firstSpell.slug,
      sourceKey: "portable-fixture",
      sourceNote: null,
    },
  ];
  const taxonomyFacets = rows<NormalizedSpellTaxonomyFacetRow>(
    normalizedOperations,
    "SpellTaxonomyFacet",
  );
  const listEntries = rows<NormalizedSpellListEntryRow>(
    normalizedOperations,
    "SpellListEntry",
  );
  const components = rows<NormalizedSpellComponentRow>(
    normalizedOperations,
    "SpellComponent",
  );
  const mechanicFacets = rows<NormalizedSpellMechanicFacetRow>(
    normalizedOperations,
    "SpellMechanicFacet",
  );
  const issues = rows<NormalizedRulesContentIssueRow>(
    buildOperations,
    "RulesContentIssue",
  );
  const content: NormalizedRulesContent = {
    schemaVersion: 2,
    generatorVersion: RULES_CONTENT_GENERATOR_VERSION,
    generatedAt: "2026-07-18T00:00:00.000Z",
    artifact: null,
    counts: {
      rulebooks: rulebooks.length,
      spells: spells.length,
      appearances: appearances.length,
      taxonomyFacets: taxonomyFacets.length,
      listEntries: listEntries.length,
      components: components.length,
      mechanicFacets: mechanicFacets.length,
      issues: issues.length,
    },
    rulebooks,
    spells,
    appearances,
    taxonomyFacets,
    listEntries,
    components,
    mechanicFacets,
    issues,
  };
  content.artifact = createRulesContentArtifactMetadata({
    scope: "full",
    sourceTotals: {
      rulebooks: rulebooks.length,
      spells: spells.length,
      descriptors: taxonomyFacets.filter(
        (row) => row.facetType === "descriptor",
      ).length,
      classListEntries: listEntries.filter((row) => row.listType === "class")
        .length,
      domainListEntries: listEntries.filter((row) => row.listType === "domain")
        .length,
    },
    provenance,
  });
  return content;
}

function applyTrackedMigrations(db: Database.Database, migrationsPath: string) {
  const migrations = fs
    .readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const migration of migrations) {
    db.exec(
      fs.readFileSync(
        path.join(migrationsPath, migration, "migration.sql"),
        "utf8",
      ),
    );
  }
  return migrations;
}

function readFixture(filePath: string): PortableFixtureOperation[] {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as PortableFixtureOperation);
}

function rows<T>(
  operations: PortableFixtureOperation[],
  table: string,
  missingDefaults: Record<string, unknown> = {},
): T[] {
  const fixtureRows = operations
    .filter((operation) => operation.op === "insert" && operation.table === table)
    .map((operation) => operation.data);
  const columns = Array.from(
    new Set(fixtureRows.flatMap((row) => Object.keys(row))),
  );
  return fixtureRows.map(
    (row) =>
      Object.fromEntries(
        columns.map((column) => [
          column,
          Object.hasOwn(row, column)
            ? row[column]
            : Object.hasOwn(missingDefaults, column)
              ? missingDefaults[column]
              : null,
        ]),
      ) as T,
  );
}

function writeArtifact(filePath: string, content: NormalizedRulesContent) {
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

function tableCount(db: Database.Database, table: string) {
  return Number(
    (
      db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as {
        count: number | bigint;
      }
    ).count,
  );
}
