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

test("production deploy paths derive the release label", () => {
  const workflow = readRepoFile(".github/workflows/deploy.yml");
  const backendScript = readRepoFile(
    "docs/deployment-scripts/deploy-backend.sh",
  );
  const packageJson = JSON.parse(readRepoFile("package.json"));

  assert.match(
    workflow,
    /release_label="\$\(node scripts\/release-metadata\.mjs --label\)"/,
  );
  assert.doesNotMatch(workflow, /SPELLBOOK_VERSION_LABEL='v\d/);
  assert.match(
    backendScript,
    /node "\$REPO\/scripts\/release-metadata\.mjs" --label/,
  );
  assert.equal(packageJson.scripts["build:production"], "node scripts/build-production.mjs");
});
