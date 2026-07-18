import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkAgentRoles } from "./check-agent-roles.mjs";

const adapterDirectory = ".codex/agents";

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
      `name = "${role}"\nRead ${reference}\n`,
    );
  }

  return root;
}

test("accepts one matching Codex adapter per canonical role", (t) => {
  const root = createFixture(t);

  assert.deepEqual(checkAgentRoles(root), {
    roles: ["main-gate", "platform"],
    adapterCount: 2,
  });
});

test("reports missing, orphaned, and misdirected adapters", (t) => {
  const root = createFixture(t);

  rmSync(join(root, ".codex/agents/platform.toml"));
  writeFileSync(
    join(root, ".codex/agents/orphan.toml"),
    'name = "orphan"\nRead .agents/roles/orphan.md\n',
  );
  writeFileSync(
    join(root, ".codex/agents/main-gate.toml"),
    'name = "backend-db"\nRead .agents/roles/platform.md\n',
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
