import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const adapterSpec = {
  directory: ".codex/agents",
  suffix: ".toml",
  label: "Codex",
};

function listRoleNames(directory, suffix, excludedNames = new Set()) {
  return readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(suffix) &&
        !excludedNames.has(entry.name),
    )
    .map((entry) => entry.name.slice(0, -suffix.length))
    .sort();
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function readAdapterName(adapter, role, errors) {
  const matches = [
    ...adapter.matchAll(/^\s*name\s*=\s*"([^"\r\n]+)"\s*(?:#.*)?$/gm),
  ];

  if (matches.length !== 1) {
    errors.push(
      `${adapterSpec.label} adapter ${role} must define exactly one quoted name`,
    );
    return undefined;
  }

  return matches[0][1];
}

export function checkAgentRoles(repoRoot) {
  const canonicalDirectory = resolve(repoRoot, ".agents/roles");
  const canonicalRoles = listRoleNames(
    canonicalDirectory,
    ".md",
    new Set(["README.md"]),
  );
  const errors = [];

  if (canonicalRoles.length === 0) {
    errors.push("No canonical agent roles found in .agents/roles");
  }

  const adapterDirectory = resolve(repoRoot, adapterSpec.directory);
  const adapterRoles = listRoleNames(adapterDirectory, adapterSpec.suffix);
  const missing = difference(canonicalRoles, adapterRoles);
  const orphaned = difference(adapterRoles, canonicalRoles);

  if (missing.length > 0) {
    errors.push(`${adapterSpec.label} adapters missing: ${missing.join(", ")}`);
  }
  if (orphaned.length > 0) {
    errors.push(
      `${adapterSpec.label} adapters orphaned: ${orphaned.join(", ")}`,
    );
  }

  for (const role of adapterRoles.filter((name) =>
    canonicalRoles.includes(name),
  )) {
    const adapterPath = resolve(
      adapterDirectory,
      `${role}${adapterSpec.suffix}`,
    );
    const canonicalReference = `.agents/roles/${role}.md`;
    const adapter = readFileSync(adapterPath, "utf8");
    const declaredName = readAdapterName(adapter, role, errors);

    if (declaredName !== undefined && declaredName !== role) {
      errors.push(
        `${adapterSpec.label} adapter ${role} declares name ${declaredName}`,
      );
    }

    if (!adapter.includes(canonicalReference)) {
      errors.push(
        `${adapterSpec.label} adapter ${role} must reference ${canonicalReference}`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Agent role correspondence failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return {
    roles: canonicalRoles,
    adapterCount: canonicalRoles.length,
  };
}

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;

if (invokedPath === fileURLToPath(import.meta.url)) {
  const result = checkAgentRoles(repoRoot);
  process.stdout.write(
    `Agent role correspondence valid: ${result.roles.length} roles, ${result.adapterCount} adapters.\n`,
  );
}
