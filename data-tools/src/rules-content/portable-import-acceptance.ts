import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
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
    `${JSON.stringify({ database: { sha256: sha256File(rulesDbPath) } })}\n`,
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
  verifyCliManifestBinding(tempRoot, content);

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

  for (const staleInput of ["rulesDb", "publications", "migrations"] as const) {
    const staleContext = structuredClone(importContext);
    const fingerprint = staleInput === "rulesDb"
      ? staleContext.currentProvenance.rulesDb
      : staleInput === "publications"
        ? staleContext.currentProvenance.canonicalInputs.rulebookPublicationMetadata!
        : staleContext.currentProvenance.contentMigrations;
    fingerprint.sha256 = "0".repeat(64);
    const before = db.serialize();
    for (const dryRun of [true, false]) {
      assert.throws(
        () => importGenerated(db, content, dryRun, artifactPath, staleContext),
        /artifact provenance does not match current import inputs/,
      );
      assert.deepEqual(db.serialize(), before);
    }
  }

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

// Exercise production callers without injecting an already-collected import context.
function verifyCliManifestBinding(tempRoot: string, content: NormalizedRulesContent) {
  const dataRoot = path.join(tempRoot, "cli-data");
  fs.mkdirSync(path.join(dataRoot, "rulebook-publications"), { recursive: true });
  execFileSync("git", ["init", dataRoot], { stdio: "ignore" });
  execFileSync("git", ["-C", dataRoot, "-c", "user.name=Portable", "-c", "user.email=portable@example.invalid", "commit", "--allow-empty", "-m", "synthetic inputs"], { stdio: "ignore" });
  const publications = path.join(dataRoot, "rulebook-publications", "publications.jsonl");
  fs.writeFileSync(publications, "", "utf8");
  const rulesPath = path.join(tempRoot, "cli-rules.sqlite");
  const rules = new Database(rulesPath);
  // Empty legacy schema: full generation still traverses the actual reader.
  rules.exec(`
    CREATE TABLE dnd_dndedition (id, slug, core);
    CREATE TABLE dnd_rulebook (id, dnd_edition_id, name, abbr, slug, description, year, published, official_url, image);
    CREATE TABLE dnd_spellschool (id, name, slug);
    CREATE TABLE dnd_spellsubschool (id, name, slug);
    CREATE TABLE dnd_spell (id, added, rulebook_id, page, name, slug, school_id, sub_school_id,
      verbal_component, somatic_component, material_component, arcane_focus_component,
      divine_focus_component, xp_component, meta_breath_component, true_name_component,
      corrupt_component, corrupt_level, extra_components, casting_time, range, target,
      effect, area, duration, saving_throw, spell_resistance, description, description_html,
      verified, verified_author_id, verified_time);
    CREATE TABLE dnd_spell_descriptors (spell_id, spelldescriptor_id);
    CREATE TABLE dnd_spellclasslevel (id, spell_id, character_class_id, level, extra);
    CREATE TABLE dnd_spelldomainlevel (id, spell_id, domain_id, level, extra);
  `);
  rules.close();
  const contentPath = path.join(tempRoot, "cli-content.sqlite");
  const target = new Database(contentPath);
  applyTrackedMigrations(target, migrationsRoot);
  target.exec("CREATE TABLE ProtectedOverlay (value TEXT); INSERT INTO ProtectedOverlay VALUES ('keep');");
  target.close();
  const protectedPath = path.join(tempRoot, "cli-app-state.sqlite");
  fs.writeFileSync(protectedPath, "protected app-state bytes", "utf8");
  const manifestPath = path.join(dataRoot, "rules-db-manifest.json");
  const output = path.join(tempRoot, "cli-generated.json");
  const input = path.join(tempRoot, "cli-import.json");
  const cli = path.join(repoRoot, "data-tools", "src", "rules-content", "cli.ts");
  const env = {
    ...process.env,
    DATA_REPO_PATH: dataRoot,
    RULES_DATABASE_URL: `file:${rulesPath}`,
    CONTENT_DATABASE_URL: `file:${contentPath}`,
    APP_DATABASE_URL: `file:${protectedPath}`,
  };
  const run = (args: string[], cwd: string, expectedError?: RegExp) => {
    // Reuse this test's tsx loader/runtime, including an external NODE_PATH.
    const result = spawnSync(process.execPath, [...process.execArgv, cli, ...args], {
      cwd, env, encoding: "utf8",
    });
    assert.ifError(result.error);
    const messages = result.stdout + result.stderr;
    if (expectedError) {
      assert.notEqual(result.status, 0, messages);
      assert.match(messages, expectedError);
    } else {
      assert.equal(result.status, 0, messages);
      const report = /^Report: (.+)$/m.exec(result.stdout)?.[1]?.trim();
      assert.ok(report && path.dirname(report) === path.join(repoRoot, "data-tools", "out", "rules-content"));
      fs.rmSync(report);
    }
  };
  const validManifest = JSON.stringify({ database: { sha256: sha256File(rulesPath) } });
  fs.writeFileSync(manifestPath, validManifest, "utf8");
  for (const cwd of [repoRoot, path.join(repoRoot, "data-tools")]) {
    run(["generate", "--output", output], cwd);
    const generated = readGenerated(output);
    assert.equal(generated.artifact!.scope, "full");
    assert.equal(generated.artifact!.provenance.rulesDb.sha256, sha256File(rulesPath));
    assert.equal(generated.artifact!.provenance.canonicalInputs.rulesManifest!.sha256, sha256File(manifestPath));
    const importContent = structuredClone(content);
    importContent.artifact!.provenance = generated.artifact!.provenance;
    writeArtifact(input, importContent);
    const before = sha256File(contentPath);
    run(["import", "--dry-run", "--input", input], cwd);
    assert.equal(sha256File(contentPath), before);
    run(["import", "--input", input], cwd);
  }
  const imported = new Database(contentPath, { readonly: true });
  assert.equal(tableCount(imported, "SpellContent"), content.spells.length);
  assert.deepEqual(imported.prepare("SELECT * FROM ProtectedOverlay").all(), [{ value: "keep" }]);
  imported.close();
  const protectedFiles = [rulesPath, contentPath, protectedPath, publications, output];
  const before = protectedFiles.map(sha256File);
  const cases = [
    { text: JSON.stringify({ database: { sha256: "0".repeat(64) } }), error: /does not match actual rules DB SHA-256/ },
    { text: "{broken", error: /not valid JSON/ },
    ...[null, {}, { database: {} }, { database: { sha256: null } }, { database: { sha256: 42 } },
      { database: { sha256: "invalid" } }, { database: { sha256: "A".repeat(64) } }]
      .map((value) => ({ text: JSON.stringify(value), error: /database.sha256 must be SHA-256/ })),
  ];
  for (const [index, invalid] of cases.entries()) {
    fs.writeFileSync(manifestPath, invalid.text, "utf8");
    // Match the artifact's manifest-file fingerprint to the invalid current file:
    // rejection must come from DB binding, not merely stale artifact detection.
    const importContent = readGenerated(input);
    importContent.artifact!.provenance.canonicalInputs.rulesManifest!.sha256 = sha256File(manifestPath);
    writeArtifact(input, importContent);
    const cwd = index % 2 === 0 ? repoRoot : path.join(repoRoot, "data-tools");
    run(["generate", "--output", output], cwd, invalid.error);
    for (const flags of [["--dry-run"], []]) {
      run(["import", ...flags, "--input", input], cwd, invalid.error);
    }
    assert.deepEqual(protectedFiles.map(sha256File), before);
    assert.equal(fs.readFileSync(manifestPath, "utf8"), invalid.text);
  }
  fs.rmSync(manifestPath);
  run(["generate", "--output", output], repoRoot, /Required rules-content input not found/);
  for (const flags of [["--dry-run"], []]) {
    run(["import", ...flags, "--input", input], path.join(repoRoot, "data-tools"), /Required rules-content input not found/);
  }
  assert.deepEqual(protectedFiles.map(sha256File), before);
  fs.writeFileSync(manifestPath, "{broken", "utf8");
  const limitedPath = path.join(tempRoot, "cli-limited.json");
  run(["generate", "--audit-only", "--output", limitedPath], repoRoot);
  assert.equal(readGenerated(limitedPath).artifact!.importable, false);
  run(["import", "--input", limitedPath], repoRoot, /cannot be imported/);
  assert.deepEqual(protectedFiles.map(sha256File), before);
  console.log("Rules-content CLI manifest binding and protected-input nonmutation OK");
}
