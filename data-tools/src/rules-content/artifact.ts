import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { NormalizedRulesContent } from "./normalize";

export type RulesContentArtifactScope = "full" | "limited";

export type RulesContentSourceTotals = {
  rulebooks: number;
  spells: number;
  descriptors: number;
  classListEntries: number;
  domainListEntries: number;
};

export type RepositoryState = {
  commit: string;
  dirty: boolean;
};

export type InputFingerprint = {
  path: string;
  sha256: string;
};

export type RulesContentArtifactProvenance = {
  schemaVersion: 1;
  parentRepo: RepositoryState;
  dataRepo: RepositoryState | null;
  rulesDb: InputFingerprint;
  canonicalInputs: {
    rulesManifest: InputFingerprint | null;
    rulebookPublicationMetadata: InputFingerprint | null;
    chmRulebookPublications: InputFingerprint | null;
  };
  contentMigrations: InputFingerprint;
};

export type RulesContentArtifactMetadata = {
  schemaVersion: 1;
  scope: RulesContentArtifactScope;
  importable: boolean;
  limitations: string[];
  sourceTotals: RulesContentSourceTotals;
  provenance: RulesContentArtifactProvenance;
};

export type RulesContentProvenancePaths = {
  parentRepoRoot: string;
  dataRepoRoot: string;
  rulesDbPath: string;
  rulesManifestPath: string;
  rulebookPublicationMetadataPath: string;
  chmRulebookPublicationsPath: string;
  contentMigrationsPath: string;
};

type CollectProvenanceOptions = {
  requireDataRepo: boolean;
  requireRulesManifest: boolean;
  requirePublicationMetadata: boolean;
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export function resolveRulesContentGenerationOutput(input: {
  auditOnly: boolean;
  limit: number | null;
  requestedOutput: string | null;
  fullOutput: string;
  limitedOutput: string;
}) {
  if (input.limit !== null && !input.auditOnly) {
    throw new Error(
      "Limited generation requires --audit-only so the artifact is explicitly non-importable.",
    );
  }
  const output =
    input.requestedOutput ?? (input.auditOnly ? input.limitedOutput : input.fullOutput);
  if (
    input.auditOnly &&
    comparablePath(output) === comparablePath(input.fullOutput)
  ) {
    throw new Error(
      "Audit-only generation cannot write the canonical full-artifact path. Use the limited default or a distinct --output path.",
    );
  }
  return output;
}

function comparablePath(filePath: string) {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function createRulesContentArtifactMetadata(input: {
  scope: RulesContentArtifactScope;
  sourceTotals: RulesContentSourceTotals;
  provenance: RulesContentArtifactProvenance;
  limitations?: string[];
}): RulesContentArtifactMetadata {
  const limitations = input.limitations ?? [];
  return {
    schemaVersion: 1,
    scope: input.scope,
    importable: input.scope === "full",
    limitations,
    sourceTotals: input.sourceTotals,
    provenance: input.provenance,
  };
}

export function collectRulesContentArtifactProvenance(
  paths: RulesContentProvenancePaths,
  options: CollectProvenanceOptions,
): RulesContentArtifactProvenance {
  const parentRepo = repositoryState(paths.parentRepoRoot);
  if (!parentRepo) {
    throw new Error(
      `Cannot capture parent repository commit and dirty state at ${paths.parentRepoRoot}.`,
    );
  }

  const dataRepo = repositoryState(paths.dataRepoRoot);
  if (options.requireDataRepo && !dataRepo) {
    throw new Error(
      `Importable rules-content generation requires the nested data repository at ${paths.dataRepoRoot}.`,
    );
  }

  return {
    schemaVersion: 1,
    parentRepo,
    dataRepo,
    rulesDb: fingerprintFile(paths.parentRepoRoot, paths.rulesDbPath, true)!,
    canonicalInputs: {
      rulesManifest: fingerprintFile(
        paths.parentRepoRoot,
        paths.rulesManifestPath,
        options.requireRulesManifest,
      ),
      rulebookPublicationMetadata: fingerprintFile(
        paths.parentRepoRoot,
        paths.rulebookPublicationMetadataPath,
        options.requirePublicationMetadata,
      ),
      chmRulebookPublications: fingerprintFile(
        paths.parentRepoRoot,
        paths.chmRulebookPublicationsPath,
        false,
      ),
    },
    contentMigrations: fingerprintDirectory(
      paths.parentRepoRoot,
      paths.contentMigrationsPath,
    ),
  };
}

export function assertRulesContentArtifact(
  content: NormalizedRulesContent,
): asserts content is NormalizedRulesContent & {
  artifact: RulesContentArtifactMetadata;
} {
  const errors = validateRulesContentArtifact(content);
  if (errors.length > 0) {
    throw new Error(`Generated rules-content artifact is invalid:\n${errors.join("\n")}`);
  }
}

export function assertImportableRulesContentArtifact(
  content: NormalizedRulesContent,
): asserts content is NormalizedRulesContent & {
  artifact: RulesContentArtifactMetadata;
} {
  assertRulesContentArtifact(content);
  if (content.artifact.scope !== "full" || !content.artifact.importable) {
    throw new Error(
      "Limited rules-content artifacts are audit-only and cannot be imported. Regenerate without --audit-only or --limit.",
    );
  }
}

export function validateRulesContentArtifact(
  content: NormalizedRulesContent,
): string[] {
  const errors: string[] = [];
  if (content.schemaVersion !== 2) {
    errors.push("schemaVersion must be 2");
  }

  const artifact = content.artifact;
  if (!artifact || typeof artifact !== "object") {
    errors.push("artifact metadata is required");
    return errors;
  }
  if (artifact.schemaVersion !== 1) {
    errors.push("artifact.schemaVersion must be 1");
  }
  if (artifact.scope !== "full" && artifact.scope !== "limited") {
    errors.push("artifact.scope must be full or limited");
  }
  if (typeof artifact.importable !== "boolean") {
    errors.push("artifact.importable must be boolean");
  }
  const limitations = Array.isArray(artifact.limitations)
    ? artifact.limitations
    : [];
  if (!Array.isArray(artifact.limitations)) {
    errors.push("artifact.limitations must be an array");
  }

  const sourceTotals =
    artifact.sourceTotals && typeof artifact.sourceTotals === "object"
      ? artifact.sourceTotals
      : null;
  if (!sourceTotals) errors.push("artifact.sourceTotals is required");
  for (const [name, value] of Object.entries(sourceTotals ?? {})) {
    if (!Number.isInteger(value) || value < 0) {
      errors.push(`artifact.sourceTotals.${name} must be a non-negative integer`);
    }
  }
  for (const name of [
    "rulebooks",
    "spells",
    "descriptors",
    "classListEntries",
    "domainListEntries",
  ] as const) {
    if (!Number.isInteger(sourceTotals?.[name])) {
      errors.push(`artifact.sourceTotals.${name} is required`);
    }
  }

  if (artifact.scope === "full") {
    if (!artifact.importable) errors.push("full artifacts must be importable");
    if (limitations.length > 0) {
      errors.push("full artifacts cannot declare limitations");
    }
    if (sourceTotals?.spells !== content.counts?.spells) {
      errors.push("full artifact spell count must match sourceTotals.spells");
    }
    if (sourceTotals?.rulebooks !== content.counts?.rulebooks) {
      errors.push("full artifact rulebook count must match sourceTotals.rulebooks");
    }
    if (!artifact.provenance?.dataRepo) {
      errors.push("full artifacts require data repository provenance");
    }
    if (!artifact.provenance?.canonicalInputs?.rulesManifest) {
      errors.push("full artifacts require the canonical rules manifest hash");
    }
    if (!artifact.provenance?.canonicalInputs?.rulebookPublicationMetadata) {
      errors.push("full artifacts require canonical publication metadata hash");
    }
  }

  if (artifact.scope === "limited") {
    if (artifact.importable) errors.push("limited artifacts must not be importable");
    if (limitations.length === 0) {
      errors.push("limited artifacts must declare at least one limitation");
    }
  }

  validateProvenance(artifact.provenance, errors);
  return errors;
}

export function verifyRulesContentArtifactProvenance(
  expected: RulesContentArtifactProvenance,
  current: RulesContentArtifactProvenance,
) {
  const mismatches: string[] = [];
  compareFingerprint("rules DB", expected.rulesDb, current.rulesDb, mismatches);
  compareFingerprint(
    "rules manifest",
    expected.canonicalInputs.rulesManifest,
    current.canonicalInputs.rulesManifest,
    mismatches,
  );
  compareFingerprint(
    "canonical publication metadata",
    expected.canonicalInputs.rulebookPublicationMetadata,
    current.canonicalInputs.rulebookPublicationMetadata,
    mismatches,
  );
  compareFingerprint(
    "CHM publication labels",
    expected.canonicalInputs.chmRulebookPublications,
    current.canonicalInputs.chmRulebookPublications,
    mismatches,
  );
  compareFingerprint(
    "content migrations",
    expected.contentMigrations,
    current.contentMigrations,
    mismatches,
  );
  if (mismatches.length > 0) {
    throw new Error(
      `Rules-content artifact provenance does not match current import inputs:\n${mismatches.join("\n")}`,
    );
  }
}

export function sha256File(filePath: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function hashDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Required directory not found: ${dirPath}`);
  }
  const hash = crypto.createHash("sha256");
  for (const filePath of listFilesRecursive(dirPath)) {
    hash.update(relativePath(dirPath, filePath), "utf8");
    hash.update("\0");
    hash.update(fs.readFileSync(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function validateProvenance(
  provenance: RulesContentArtifactProvenance | undefined,
  errors: string[],
) {
  if (!provenance || typeof provenance !== "object") {
    errors.push("artifact.provenance is required");
    return;
  }
  if (provenance.schemaVersion !== 1) {
    errors.push("artifact.provenance.schemaVersion must be 1");
  }
  validateRepositoryState("parentRepo", provenance.parentRepo, errors);
  if (provenance.dataRepo) {
    validateRepositoryState("dataRepo", provenance.dataRepo, errors);
  }
  validateFingerprint("rulesDb", provenance.rulesDb, errors);
  validateFingerprint("contentMigrations", provenance.contentMigrations, errors);
  validateOptionalFingerprint(
    "canonicalInputs.rulesManifest",
    provenance.canonicalInputs?.rulesManifest,
    errors,
  );
  validateOptionalFingerprint(
    "canonicalInputs.rulebookPublicationMetadata",
    provenance.canonicalInputs?.rulebookPublicationMetadata,
    errors,
  );
  validateOptionalFingerprint(
    "canonicalInputs.chmRulebookPublications",
    provenance.canonicalInputs?.chmRulebookPublications,
    errors,
  );
}

function validateRepositoryState(
  name: string,
  value: RepositoryState | undefined,
  errors: string[],
) {
  if (!value || typeof value.commit !== "string" || value.commit.length === 0) {
    errors.push(`artifact.provenance.${name}.commit is required`);
  }
  if (!value || typeof value.dirty !== "boolean") {
    errors.push(`artifact.provenance.${name}.dirty must be boolean`);
  }
}

function validateOptionalFingerprint(
  name: string,
  value: InputFingerprint | null | undefined,
  errors: string[],
) {
  if (value === null) return;
  validateFingerprint(name, value, errors);
}

function validateFingerprint(
  name: string,
  value: InputFingerprint | undefined,
  errors: string[],
) {
  if (!value || typeof value.path !== "string" || value.path.length === 0) {
    errors.push(`artifact.provenance.${name}.path is required`);
  }
  if (!value || typeof value.sha256 !== "string" || !SHA256_PATTERN.test(value.sha256)) {
    errors.push(`artifact.provenance.${name}.sha256 must be SHA-256`);
  }
}

function compareFingerprint(
  name: string,
  expected: InputFingerprint | null,
  current: InputFingerprint | null,
  mismatches: string[],
) {
  if (!expected || !current) {
    if (expected !== current) mismatches.push(`${name} presence changed`);
    return;
  }
  if (expected.sha256 !== current.sha256) {
    mismatches.push(
      `${name} SHA-256 changed (${expected.sha256} -> ${current.sha256})`,
    );
  }
}

function fingerprintFile(
  root: string,
  filePath: string,
  required: boolean,
): InputFingerprint | null {
  if (!fs.existsSync(filePath)) {
    if (required) throw new Error(`Required rules-content input not found: ${filePath}`);
    return null;
  }
  return {
    path: artifactPath(root, filePath),
    sha256: sha256File(filePath),
  };
}

function fingerprintDirectory(root: string, dirPath: string): InputFingerprint {
  return {
    path: artifactPath(root, dirPath),
    sha256: hashDirectory(dirPath),
  };
}

function repositoryState(cwd: string): RepositoryState | null {
  const commit = runGit(cwd, ["rev-parse", "HEAD"]);
  const status = runGit(cwd, ["status", "--porcelain"]);
  if (commit === null || status === null) return null;
  return { commit, dirty: status.length > 0 };
}

function runGit(cwd: string, args: string[]) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function listFilesRecursive(dirPath: string): string[] {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return listFilesRecursive(entryPath);
      if (entry.isFile()) return [entryPath];
      return [];
    })
    .sort((left, right) =>
      relativePath(dirPath, left).localeCompare(relativePath(dirPath, right)),
    );
}

function artifactPath(root: string, filePath: string) {
  const relative = path.relative(root, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
    ? relative.replace(/\\/g, "/")
    : path.basename(filePath);
}

function relativePath(from: string, to: string) {
  return path.relative(from, to).replace(/\\/g, "/");
}
