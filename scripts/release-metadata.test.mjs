import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getReleaseLabel, getReleaseVersion } from "./release-metadata.mjs";

function readRepoFile(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("release label derives from the root package version", () => {
  assert.equal(getReleaseVersion(), "1.2.1");
  assert.equal(getReleaseLabel(), "v1.2.1");
});

test("the pinned backend helper derives the release label", () => {
  const workflow = readRepoFile(".github/workflows/deploy.yml");
  const backendScript = readRepoFile(
    "docs/deployment-scripts/deploy-backend.sh",
  );
  const packageJson = JSON.parse(readRepoFile("package.json"));

  assert.doesNotMatch(workflow, /SPELLBOOK_VERSION_LABEL=/);
  assert.doesNotMatch(workflow, /release_label=/);
  assert.match(
    backendScript,
    /node "\$REPO\/scripts\/release-metadata\.mjs" --label/,
  );
  assert.match(
    backendScript,
    /upsert_env_var "SPELLBOOK_BACKEND_COMMIT_SHA" "\$VERIFIED_COMMIT"/,
  );
  assert.equal(packageJson.scripts["build:production"], "node scripts/build-production.mjs");
});
