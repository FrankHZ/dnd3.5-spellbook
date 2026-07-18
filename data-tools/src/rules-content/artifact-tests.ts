import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertImportableRulesContentArtifact,
  collectRulesContentArtifactProvenance,
  createRulesContentArtifactMetadata,
  resolveRulesContentGenerationOutput,
  sha256File,
  validateRulesContentArtifact,
  verifyRulesContentArtifactProvenance,
  type InputFingerprint,
  type RulesContentArtifactProvenance,
} from "./artifact";
import { normalizeRulesContent } from "./normalize";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const fullOutput = path.join(repoRoot, "data-tools", "out", "rules-content", "rules-content.generated.json");
const limitedOutput = path.join(
  repoRoot,
  "data-tools",
  "out",
  "rules-content",
  "rules-content.limited.generated.json",
);

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: "full artifacts require canonical publication provenance",
    run: () => {
      const tempRoot = fs.mkdtempSync(
        path.join(os.tmpdir(), "spellbook-rules-content-artifact-"),
      );
      try {
        const dataRoot = path.join(tempRoot, "data");
        fs.mkdirSync(dataRoot, { recursive: true });
        const rulesDbPath = path.join(tempRoot, "rules.sqlite");
        const rulesManifestPath = path.join(dataRoot, "rules-db-manifest.json");
        fs.writeFileSync(rulesDbPath, "portable rules DB input", "utf8");
        fs.writeFileSync(rulesManifestPath, "{}\n", "utf8");

        assert.throws(
          () =>
            collectRulesContentArtifactProvenance(
              {
                parentRepoRoot: repoRoot,
                dataRepoRoot: dataRoot,
                rulesDbPath,
                rulesManifestPath,
                rulebookPublicationMetadataPath: path.join(
                  dataRoot,
                  "rulebook-publications",
                  "publications.jsonl",
                ),
                chmRulebookPublicationsPath: path.join(
                  dataRoot,
                  "rulebook-labels",
                  "chm-publications.jsonl",
                ),
                contentMigrationsPath: path.join(
                  repoRoot,
                  "server",
                  "db",
                  "content",
                  "migrations",
                ),
              },
              {
                requireDataRepo: false,
                requireRulesManifest: true,
                requirePublicationMetadata: true,
              },
            ),
          /Required rules-content input not found/,
        );
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    },
  },
  {
    name: "limited generation is explicit and cannot target or enter live import",
    run: () => {
      assert.throws(
        () =>
          resolveRulesContentGenerationOutput({
            auditOnly: false,
            limit: 1,
            requestedOutput: null,
            fullOutput,
            limitedOutput,
          }),
        /requires --audit-only/,
      );
      assert.equal(
        resolveRulesContentGenerationOutput({
          auditOnly: true,
          limit: 1,
          requestedOutput: null,
          fullOutput,
          limitedOutput,
        }),
        limitedOutput,
      );
      assert.throws(
        () =>
          resolveRulesContentGenerationOutput({
            auditOnly: true,
            limit: 1,
            requestedOutput: fullOutput,
            fullOutput,
            limitedOutput,
          }),
        /cannot write the canonical full-artifact path/,
      );
      if (process.platform === "win32") {
        assert.throws(
          () =>
            resolveRulesContentGenerationOutput({
              auditOnly: true,
              limit: 1,
              requestedOutput: fullOutput.toUpperCase(),
              fullOutput,
              limitedOutput,
            }),
          /cannot write the canonical full-artifact path/,
        );
      }

      const content = emptyContent();
      content.artifact = createRulesContentArtifactMetadata({
        scope: "limited",
        sourceTotals: sourceTotals(10),
        provenance: fakeProvenance({ includeCanonical: false }),
        limitations: ["audit-only generation", "spell query limited to 1 row"],
      });
      assert.deepEqual(validateRulesContentArtifact(content), []);
      assert.throws(
        () => assertImportableRulesContentArtifact(content),
        /cannot be imported/,
      );
    },
  },
  {
    name: "full artifact records source totals and generation input hashes",
    run: () => {
      const content = emptyContent();
      content.artifact = createRulesContentArtifactMetadata({
        scope: "full",
        sourceTotals: sourceTotals(0),
        provenance: fakeProvenance({ includeCanonical: true }),
      });
      assert.deepEqual(validateRulesContentArtifact(content), []);
      assert.equal(content.artifact.scope, "full");
      assert.equal(content.artifact.importable, true);
      assert.equal(content.artifact.sourceTotals.spells, 0);
      assert.equal(
        content.artifact.provenance.rulesDb.sha256,
        hash("b"),
      );
    },
  },
  {
    name: "import provenance verification rejects changed canonical inputs",
    run: () => {
      const expected = fakeProvenance({ includeCanonical: true });
      const current = structuredClone(expected);
      current.rulesDb.sha256 = hash("f");
      current.canonicalInputs.rulebookPublicationMetadata!.sha256 = hash("e");
      assert.throws(
        () => verifyRulesContentArtifactProvenance(expected, current),
        /rules DB SHA-256 changed[\s\S]*canonical publication metadata SHA-256 changed/,
      );
    },
  },
  {
    name: "generation provenance hashes the actual rules DB bytes",
    run: () => {
      const tempRoot = fs.mkdtempSync(
        path.join(os.tmpdir(), "spellbook-rules-content-provenance-"),
      );
      try {
        const dataRoot = path.join(tempRoot, "data");
        const publicationsPath = path.join(
          dataRoot,
          "rulebook-publications",
          "publications.jsonl",
        );
        const rulesManifestPath = path.join(dataRoot, "rules-db-manifest.json");
        const rulesDbPath = path.join(tempRoot, "rules.sqlite");
        fs.mkdirSync(path.dirname(publicationsPath), { recursive: true });
        fs.writeFileSync(publicationsPath, "{\"portable\":true}\n", "utf8");
        fs.writeFileSync(rulesManifestPath, "{\"database\":{\"sha256\":\"stale\"}}\n", "utf8");
        fs.writeFileSync(rulesDbPath, "actual rules DB bytes", "utf8");

        const provenance = collectRulesContentArtifactProvenance(
          {
            parentRepoRoot: repoRoot,
            dataRepoRoot: dataRoot,
            rulesDbPath,
            rulesManifestPath,
            rulebookPublicationMetadataPath: publicationsPath,
            chmRulebookPublicationsPath: path.join(
              dataRoot,
              "rulebook-labels",
              "chm-publications.jsonl",
            ),
            contentMigrationsPath: path.join(
              repoRoot,
              "server",
              "db",
              "content",
              "migrations",
            ),
          },
          {
            requireDataRepo: false,
            requireRulesManifest: true,
            requirePublicationMetadata: true,
          },
        );
        assert.equal(provenance.rulesDb.sha256, sha256File(rulesDbPath));
        assert.notEqual(provenance.rulesDb.sha256, "stale");
        assert.equal(
          provenance.canonicalInputs.rulebookPublicationMetadata?.sha256,
          sha256File(publicationsPath),
        );
        assert.equal(typeof provenance.parentRepo.dirty, "boolean");
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    },
  },
];

function emptyContent() {
  return normalizeRulesContent(
    { rulebooks: [], spells: [], descriptors: [], listEntries: [] },
    "2026-07-18T00:00:00.000Z",
  );
}

function sourceTotals(spells: number) {
  return {
    rulebooks: 0,
    spells,
    descriptors: 0,
    classListEntries: 0,
    domainListEntries: 0,
  };
}

function fakeProvenance(input: {
  includeCanonical: boolean;
}): RulesContentArtifactProvenance {
  return {
    schemaVersion: 1,
    parentRepo: { commit: "parent-generation-commit", dirty: true },
    dataRepo: input.includeCanonical
      ? { commit: "data-generation-commit", dirty: false }
      : null,
    rulesDb: fingerprint("server/db/local/rules-clean.sqlite", "b"),
    canonicalInputs: {
      rulesManifest: input.includeCanonical
        ? fingerprint("data/rules-db-manifest.json", "c")
        : null,
      rulebookPublicationMetadata: input.includeCanonical
        ? fingerprint(
            "data/rulebook-publications/publications.jsonl",
            "d",
          )
        : null,
      chmRulebookPublications: null,
    },
    contentMigrations: fingerprint(
      "server/db/content/migrations",
      "a",
    ),
  };
}

function fingerprint(filePath: string, character: string): InputFingerprint {
  return { path: filePath, sha256: hash(character) };
}

function hash(character: string) {
  return character.repeat(64);
}

for (const test of tests) {
  test.run();
  console.log(`ok - ${test.name}`);
}

console.log(`Rules-content artifact tests OK (${tests.length})`);
