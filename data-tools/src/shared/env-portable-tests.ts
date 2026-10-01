import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { localDataDir, repoRoot } from "./env";

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "spellbook-data-path-"));
const codeRoot = path.join(fixtureRoot, "public code");
const dataRoot = path.join(fixtureRoot, "private data with spaces");
const workspace = path.join(codeRoot, "data-tools");
const originalEnv = process.env.DATA_REPO_PATH;
const originalCwd = process.cwd();

try {
  delete process.env.DATA_REPO_PATH;
  fs.mkdirSync(workspace, { recursive: true });
  fs.mkdirSync(dataRoot);
  assert.equal(localDataDir(codeRoot), path.join(codeRoot, "data"));

  fs.writeFileSync(path.join(codeRoot, ".env"), `DATA_REPO_PATH="${dataRoot}"\n`);
  assert.equal(localDataDir(codeRoot), dataRoot);

  fs.writeFileSync(path.join(codeRoot, ".env"), "DATA_REPO_PATH=../private data with spaces\n");
  assert.equal(localDataDir(codeRoot), dataRoot);

  process.env.DATA_REPO_PATH = dataRoot;
  fs.writeFileSync(path.join(codeRoot, ".env"), "DATA_REPO_PATH=missing\n");
  assert.equal(localDataDir(codeRoot), dataRoot);

  for (const cwd of [repoRoot(), path.join(repoRoot(), "data-tools")]) {
    process.chdir(cwd);
    assert.equal(localDataDir(), dataRoot);
  }

  const sourceDir = path.join(dataRoot, "chm-raw");
  const outputDir = path.join(dataRoot, "chm-clean");
  fs.mkdirSync(sourceDir);
  fs.writeFileSync(path.join(sourceDir, "sample.html"), "<html><body>sample</body></html>");
  const cliPath = path.join(repoRoot(), "data-tools", "src", "zh-parser", "scripts", "preprocess-chm-html.ts");
  for (const cwd of [repoRoot(), path.join(repoRoot(), "data-tools")]) {
    const run = spawnSync(process.execPath, ["--import", "tsx", cliPath, "--utf8"], {
      cwd,
      env: { ...process.env, DATA_REPO_PATH: dataRoot },
      encoding: "utf8",
    });
    assert.equal(run.status, 0, run.stderr);
    assert.ok(fs.existsSync(path.join(outputDir, "sample.html")));
  }

  const explicitOutput = path.join(fixtureRoot, "explicit output");
  const explicit = spawnSync(process.execPath,
    ["--import", "tsx", cliPath, "--in", sourceDir, "--out", explicitOutput, "--utf8"], {
      cwd: repoRoot(),
      env: { ...process.env, DATA_REPO_PATH: path.join(fixtureRoot, "missing") },
      encoding: "utf8",
    });
  assert.equal(explicit.status, 0, explicit.stderr);
  assert.ok(fs.existsSync(path.join(explicitOutput, "sample.html")));

  delete process.env.DATA_REPO_PATH;
  assert.throws(() => localDataDir(codeRoot), /DATA_REPO_PATH.*existing directory/);
  fs.writeFileSync(path.join(codeRoot, ".env"), "DATA_REPO_PATH=\n");
  assert.throws(() => localDataDir(codeRoot), /DATA_REPO_PATH.*existing directory/);
  fs.writeFileSync(path.join(codeRoot, ".env"), "DATA_REPO_PATH=ordinary-file\n");
  fs.writeFileSync(path.join(codeRoot, "ordinary-file"), "not a directory");
  assert.throws(() => localDataDir(codeRoot), /DATA_REPO_PATH.*existing directory/);
} finally {
  process.chdir(originalCwd);
  if (originalEnv === undefined) delete process.env.DATA_REPO_PATH;
  else process.env.DATA_REPO_PATH = originalEnv;
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("Portable data repository path tests OK");
