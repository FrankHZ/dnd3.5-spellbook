import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const adapterSpec = {
  directory: ".codex/agents",
  suffix: ".toml",
  label: "Codex",
};

const executionProfiles = {
  explorer: {
    model: "gpt-5.6-terra",
    reasoningEffort: "medium",
    sandboxMode: "read-only",
  },
  worker: {
    model: "gpt-5.6-terra",
    reasoningEffort: "high",
  },
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

function readQuotedSetting(adapter, role, setting, errors) {
  const matches = [
    ...adapter.matchAll(
      new RegExp(`^\\s*${setting}\\s*=\\s*"([^"\\r\\n]+)"\\s*(?:#.*)?$`, "gm"),
    ),
  ];

  if (matches.length !== 1) {
    errors.push(
      `${adapterSpec.label} adapter ${role} must define exactly one quoted ${setting}`,
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
  const profileNames = Object.keys(executionProfiles).sort();
  const expectedAdapters = [...canonicalRoles, ...profileNames].sort();
  const missing = difference(canonicalRoles, adapterRoles);
  const missingProfiles = difference(profileNames, adapterRoles);
  const orphaned = difference(adapterRoles, expectedAdapters);

  if (missing.length > 0) {
    errors.push(`${adapterSpec.label} adapters missing: ${missing.join(", ")}`);
  }
  if (missingProfiles.length > 0) {
    errors.push(
      `${adapterSpec.label} execution profiles missing: ${missingProfiles.join(", ")}`,
    );
  }
  if (orphaned.length > 0) {
    errors.push(
      `${adapterSpec.label} adapters orphaned: ${orphaned.join(", ")}`,
    );
  }

  for (const role of adapterRoles.filter((name) =>
    expectedAdapters.includes(name),
  )) {
    const adapterPath = resolve(
      adapterDirectory,
      `${role}${adapterSpec.suffix}`,
    );
    const canonicalReference = canonicalRoles.includes(role)
      ? `.agents/roles/${role}.md`
      : ".agents/roles/README.md";
    const adapter = readFileSync(adapterPath, "utf8");
    const declaredName = readQuotedSetting(adapter, role, "name", errors);
    const declaredModel = readQuotedSetting(adapter, role, "model", errors);
    const declaredReasoningEffort = readQuotedSetting(
      adapter,
      role,
      "model_reasoning_effort",
      errors,
    );
    const expectedExecution = canonicalRoles.includes(role)
      ? {
          model: "gpt-5.6-sol",
          reasoningEffort: role === "main-gate" ? "xhigh" : "high",
        }
      : executionProfiles[role];
    const declaredSandboxMode = expectedExecution.sandboxMode
      ? readQuotedSetting(adapter, role, "sandbox_mode", errors)
      : undefined;

    if (declaredName !== undefined && declaredName !== role) {
      errors.push(
        `${adapterSpec.label} adapter ${role} declares name ${declaredName}`,
      );
    }

    if (
      declaredModel !== undefined &&
      declaredModel !== expectedExecution.model
    ) {
      errors.push(
        `${adapterSpec.label} adapter ${role} declares model ${declaredModel}, expected ${expectedExecution.model}`,
      );
    }
    if (
      declaredReasoningEffort !== undefined &&
      declaredReasoningEffort !== expectedExecution.reasoningEffort
    ) {
      errors.push(
        `${adapterSpec.label} adapter ${role} declares model_reasoning_effort ${declaredReasoningEffort}, expected ${expectedExecution.reasoningEffort}`,
      );
    }
    if (
      declaredSandboxMode !== undefined &&
      declaredSandboxMode !== expectedExecution.sandboxMode
    ) {
      errors.push(
        `${adapterSpec.label} adapter ${role} declares sandbox_mode ${declaredSandboxMode}, expected ${expectedExecution.sandboxMode}`,
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
    executionProfiles: profileNames,
    adapterCount: expectedAdapters.length,
  };
}

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;

if (invokedPath === fileURLToPath(import.meta.url)) {
  const result = checkAgentRoles(repoRoot);
  process.stdout.write(
    `Agent role correspondence valid: ${result.roles.length} roles, ${result.executionProfiles.length} execution profiles, ${result.adapterCount} adapters.\n`,
  );
}
