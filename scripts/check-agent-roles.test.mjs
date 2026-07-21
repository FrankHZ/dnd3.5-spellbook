import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkAgentRoles } from "./check-agent-roles.mjs";

const adapterDirectory = ".codex/agents";
const executionProfiles = {
  explorer: ["gpt-5.6-terra", "medium", "read-only"],
  worker: ["gpt-5.6-terra", "high"],
};

function createFixture(t, roles = ["main-gate", "platform"]) {
  const root = mkdtempSync(join(tmpdir(), "spellbook-agent-roles-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  mkdirSync(join(root, ".agents/roles"), { recursive: true });
  writeFileSync(join(root, ".agents/roles/README.md"), "# Roles\n");

  mkdirSync(join(root, adapterDirectory), { recursive: true });

  for (const role of roles) {
    const reference = `.agents/roles/${role}.md`;
    writeFileSync(join(root, reference), `# ${role}\n`);

    writeFileSync(
      join(root, adapterDirectory, `${role}.toml`),
      adapter(
        role,
        "gpt-5.6-sol",
        role === "main-gate" ? "xhigh" : "high",
        reference,
      ),
    );
  }

  for (const [profile, [model, reasoningEffort, sandboxMode]] of Object.entries(
    executionProfiles,
  )) {
    writeFileSync(
      join(root, adapterDirectory, `${profile}.toml`),
      adapter(
        profile,
        model,
        reasoningEffort,
        ".agents/roles/README.md",
        sandboxMode,
      ),
    );
  }

  return root;
}

function adapter(name, model, reasoningEffort, reference, sandboxMode) {
  const sandbox = sandboxMode ? `sandbox_mode = "${sandboxMode}"\n` : "";
  return `name = "${name}"\nmodel = "${model}"\nmodel_reasoning_effort = "${reasoningEffort}"\n${sandbox}Read ${reference}\n`;
}

test("accepts one matching Codex adapter per canonical role", (t) => {
  const root = createFixture(t);

  assert.deepEqual(checkAgentRoles(root), {
    roles: ["main-gate", "platform"],
    executionProfiles: ["explorer", "worker"],
    adapterCount: 4,
  });
});

test("reports missing, orphaned, and misdirected adapters", (t) => {
  const root = createFixture(t);

  rmSync(join(root, ".codex/agents/platform.toml"));
  writeFileSync(
    join(root, ".codex/agents/orphan.toml"),
    adapter("orphan", "gpt-5.6-terra", "medium", ".agents/roles/orphan.md"),
  );
  writeFileSync(
    join(root, ".codex/agents/main-gate.toml"),
    adapter("backend-db", "gpt-5.6-sol", "xhigh", ".agents/roles/platform.md"),
  );

  assert.throws(
    () => checkAgentRoles(root),
    (error) => {
      assert.match(error.message, /Codex adapters missing: platform/);
      assert.match(error.message, /Codex adapters orphaned: orphan/);
      assert.match(
        error.message,
        /Codex adapter main-gate declares name backend-db/,
      );
      assert.match(
        error.message,
        /Codex adapter main-gate must reference \.agents\/roles\/main-gate\.md/,
      );
      return true;
    },
  );
});

test("enforces the Sol role and Terra child execution tiers", (t) => {
  const root = createFixture(t);

  writeFileSync(
    join(root, ".codex/agents/main-gate.toml"),
    adapter("main-gate", "gpt-5.6-sol", "high", ".agents/roles/main-gate.md"),
  );
  writeFileSync(
    join(root, ".codex/agents/explorer.toml"),
    adapter(
      "explorer",
      "gpt-5.6-sol",
      "medium",
      ".agents/roles/README.md",
      "workspace-write",
    ),
  );

  assert.throws(
    () => checkAgentRoles(root),
    (error) => {
      assert.match(
        error.message,
        /main-gate declares model_reasoning_effort high, expected xhigh/,
      );
      assert.match(
        error.message,
        /explorer declares model gpt-5\.6-sol, expected gpt-5\.6-terra/,
      );
      assert.match(
        error.message,
        /explorer declares sandbox_mode workspace-write, expected read-only/,
      );
      return true;
    },
  );
});
