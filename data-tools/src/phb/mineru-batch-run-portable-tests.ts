import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertMineruBatchContentList,
  parseMineruBatchRunManifest,
  verifyMineruBatchRuntime,
} from "./mineru-batch-run";
import {
  buildMineruVlmArguments,
  resolveMineruModelIdentity,
} from "./mineru-page-run";

const SHA = "a".repeat(64);
const DATA_ROOT = path.resolve("C:/data");
const EXECUTABLE_RELATIVE_PATH =
  "artifacts/mineru/phb35/.venv/Scripts/mineru.exe";
const CONFIG_RELATIVE_PATH = "artifacts/mineru/phb35/mineru.json";
const MODEL_FILES = [{ relativePath: "config.json", bytes: 2, sha256: SHA }];
const MODEL_FILE_MANIFEST_SHA = crypto
  .createHash("sha256")
  .update(JSON.stringify(MODEL_FILES))
  .digest("hex");

const valid = {
  schemaVersion: 1,
  status: "succeeded",
  label: "recall-full",
  source: { id: "phb35-core", artifactSha256: SHA },
  selection: {
    sourcePageStart: null,
    sourcePageEnd: null,
    startSubsetPageIndex: 0,
    endSubsetPageIndex: 2,
  },
  input: {
    sourceManifestRelativePath: "phb35/source/source-manifest.json",
    sourceManifestSha256: SHA,
    fullManifestRelativePath: "phb35/review/full-extraction-manifest.json",
    fullManifestSha256: SHA,
    manifestRelativePath: "phb35/extracted/full/mineru-input-manifest.json",
    manifestSha256: SHA,
    subsetRelativePath: "artifacts/mineru/phb35/full-input/phb35-core.full.pdf",
    subsetSha256: SHA,
  },
  runtime: {
    engine: "MinerU",
    version: "3.4.0",
    pythonVersion: "3.12.13",
    backend: "vlm-engine",
    method: "auto",
    device: "Test GPU",
    dependencies: { torch: "2.0.0" },
    pythonExecutable: {
      relativePath: "artifacts/mineru/phb35/.venv/Scripts/python.exe",
      sha256: SHA,
    },
    model: {
      repository: "opendatalab/MinerU",
      revision: "revision",
      relativePath:
        "artifacts/mineru/phb35/hf-home/hub/models--opendatalab--MinerU/snapshots/revision",
      fileManifest: {
        algorithm: "sha256-files-v1",
        fileCount: 1,
        totalBytes: 2,
        sha256: MODEL_FILE_MANIFEST_SHA,
        files: MODEL_FILES,
      },
    },
    config: {
      relativePath: CONFIG_RELATIVE_PATH,
      sha256: SHA,
      modelSource: "huggingface",
    },
  },
  invocation: {
    executableRelativePath: EXECUTABLE_RELATIVE_PATH,
    executablePath: resolveDataPath(EXECUTABLE_RELATIVE_PATH),
    executableSha256: SHA,
    cwd: path.resolve("C:/repo"),
    dataRoot: DATA_ROOT,
    arguments: buildMineruVlmArguments({
      inputPath: resolveDataPath(
        "artifacts/mineru/phb35/full-input/phb35-core.full.pdf",
      ),
      outputPath: resolveDataPath(
        "artifacts/mineru/phb35/recall-full/.recall-full.partial-1234",
      ),
      startPageIndex: 0,
      endPageIndex: 2,
    }),
    portableArguments: buildMineruVlmArguments({
      inputPath: "artifacts/mineru/phb35/full-input/phb35-core.full.pdf",
      outputPath:
        "artifacts/mineru/phb35/recall-full/.recall-full.partial-1234",
      startPageIndex: 0,
      endPageIndex: 2,
    }),
    environment: {
      MINERU_TOOLS_CONFIG_JSON: resolveDataPath(CONFIG_RELATIVE_PATH),
      MINERU_LOG_LEVEL: "INFO",
      MINERU_TASK_RESULT_TIMEOUT_SECONDS: "14400",
    },
    portableEnvironment: {
      MINERU_TOOLS_CONFIG_JSON: CONFIG_RELATIVE_PATH,
      MINERU_LOG_LEVEL: "INFO",
      MINERU_TASK_RESULT_TIMEOUT_SECONDS: "14400",
    },
    options: {
      formula: false,
      table: true,
      imageAnalysis: false,
      startPageIndex: 0,
      endPageIndex: 2,
      processTimeoutSeconds: 14700,
    },
  },
  output: {
    runRootRelativePath: "artifacts/mineru/phb35/recall-full/recall-full",
    stagingRunRootRelativePath:
      "artifacts/mineru/phb35/recall-full/.recall-full.partial-1234",
    contentListRelativePath:
      "artifacts/mineru/phb35/recall-full/recall-full/phb35-core.full/vlm/phb35-core.full_content_list.json",
    contentListSha256: SHA,
    contentListBytes: 1,
    stdoutRelativePath:
      "artifacts/mineru/phb35/recall-full/recall-full/mineru.stdout.log",
    stdoutSha256: SHA,
    stderrRelativePath:
      "artifacts/mineru/phb35/recall-full/recall-full/mineru.stderr.log",
    stderrSha256: SHA,
  },
  pages: [
    {
      sourcePageIndex: 181,
      printedPageNumber: 181,
      subsetPageIndex: 0,
      candidatePageIndex: 0,
      rangeKinds: ["description"],
    },
    {
      sourcePageIndex: 182,
      printedPageNumber: 182,
      subsetPageIndex: 1,
      candidatePageIndex: 1,
      rangeKinds: ["description"],
    },
    {
      sourcePageIndex: 183,
      printedPageNumber: 183,
      subsetPageIndex: 2,
      candidatePageIndex: 2,
      rangeKinds: ["description"],
    },
  ],
};

assert.equal(parseMineruBatchRunManifest(valid).label, "recall-full");
assert.throws(
  () => parseMineruBatchRunManifest({ ...valid, label: "Recall Full" }),
  /batch manifest is invalid/u,
);
assert.throws(
  () =>
    parseMineruBatchRunManifest({
      ...valid,
      invocation: {
        ...valid.invocation,
        portableArguments: buildMineruVlmArguments({
          inputPath: valid.input.subsetRelativePath,
          outputPath: valid.output.runRootRelativePath,
          startPageIndex: 0,
          endPageIndex: 2,
        }),
      },
    }),
  /executed staging command/u,
);
assert.throws(
  () =>
    parseMineruBatchRunManifest({
      ...valid,
      output: {
        ...valid.output,
        stagingRunRootRelativePath:
          "artifacts/mineru/phb35/recall-full/.other.partial-1234",
      },
    }),
  /staging path/u,
);
const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mineru-runtime-"));
let resolverCalled = false;
try {
  for (const relativePath of [
    valid.invocation.executableRelativePath,
    valid.runtime.pythonExecutable.relativePath,
    valid.runtime.config.relativePath,
  ]) {
    const filePath = path.join(runtimeRoot, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "tampered", "utf8");
  }
  assert.throws(
    () =>
      verifyMineruBatchRuntime(
        runtimeRoot,
        parseMineruBatchRunManifest(valid),
        (() => {
          resolverCalled = true;
          throw new Error("resolver must not run");
        }) as never,
      ),
    /file changed/u,
  );
  assert.equal(resolverCalled, false);
} finally {
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
}
const modelRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mineru-model-"));
try {
  const snapshotPath = path.join(
    modelRoot,
    "models--opendatalab--MinerU",
    "snapshots",
    "revision",
  );
  fs.mkdirSync(snapshotPath, { recursive: true });
  const weightsPath = path.join(snapshotPath, "model.safetensors");
  fs.writeFileSync(weightsPath, "first", "utf8");
  const firstIdentity = resolveMineruModelIdentity(modelRoot, snapshotPath);
  const runtimeBound = structuredClone(valid);
  runtimeBound.runtime.model = firstIdentity;
  runtimeBound.invocation.dataRoot = modelRoot;
  runtimeBound.invocation.executablePath = path.join(
    modelRoot,
    ...runtimeBound.invocation.executableRelativePath.split("/"),
  );
  for (const [relativePath, content] of [
    [runtimeBound.invocation.executableRelativePath, "executable"],
    [runtimeBound.runtime.pythonExecutable.relativePath, "python"],
    [runtimeBound.runtime.config.relativePath, "config"],
  ] as const) {
    const filePath = path.join(modelRoot, ...relativePath.split("/"));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }
  runtimeBound.invocation.executableSha256 = hashFile(
    runtimeBound.invocation.executablePath,
  );
  runtimeBound.runtime.pythonExecutable.sha256 = hashFile(
    path.join(
      modelRoot,
      ...runtimeBound.runtime.pythonExecutable.relativePath.split("/"),
    ),
  );
  runtimeBound.runtime.config.sha256 = hashFile(
    path.join(
      modelRoot,
      ...runtimeBound.runtime.config.relativePath.split("/"),
    ),
  );
  fs.writeFileSync(weightsPath, "second", "utf8");
  const secondIdentity = resolveMineruModelIdentity(modelRoot, snapshotPath);
  assert.notEqual(
    firstIdentity.fileManifest.sha256,
    secondIdentity.fileManifest.sha256,
  );
  assert.throws(
    () =>
      verifyMineruBatchRuntime(
        modelRoot,
        runtimeBound as never,
        (() => ({
          executableRelativePath:
            runtimeBound.invocation.executableRelativePath,
          executablePath: runtimeBound.invocation.executablePath,
          pythonExecutableRelativePath:
            runtimeBound.runtime.pythonExecutable.relativePath,
          pythonExecutablePath: path.join(
            modelRoot,
            ...runtimeBound.runtime.pythonExecutable.relativePath.split("/"),
          ),
          configRelativePath: runtimeBound.runtime.config.relativePath,
          configPath: path.join(
            modelRoot,
            ...runtimeBound.runtime.config.relativePath.split("/"),
          ),
          runtime: {
            ...runtimeBound.runtime,
            model: secondIdentity,
          },
        })) as never,
      ),
    /runtime changed/u,
  );
} finally {
  fs.rmSync(modelRoot, { recursive: true, force: true });
}
assert.throws(
  () =>
    parseMineruBatchRunManifest({
      ...valid,
      pages: [valid.pages[1], valid.pages[0], valid.pages[2]],
    }),
  /batch manifest is invalid/u,
);
assert.throws(
  () =>
    parseMineruBatchRunManifest({
      ...valid,
      pages: valid.pages.slice(0, 2),
    }),
  /batch manifest is invalid/u,
);
assert.throws(
  () =>
    parseMineruBatchRunManifest({
      ...valid,
      invocation: {
        ...valid.invocation,
        environment: {
          ...valid.invocation.environment,
          MINERU_TASK_RESULT_TIMEOUT_SECONDS: "0",
        },
      },
    }),
  /batch manifest is invalid/u,
);

assert.doesNotThrow(() =>
  assertMineruBatchContentList(
    [
      { page_idx: 0, type: "text" },
      { page_idx: 0, type: "text" },
      { page_idx: 1, type: "text" },
      { page_idx: 2, type: "text" },
    ],
    3,
  ),
);
assert.throws(
  () =>
    assertMineruBatchContentList(
      [
        { page_idx: 0, type: "text" },
        { page_idx: 2, type: "text" },
      ],
      3,
    ),
  /partial or reordered/u,
);
assert.throws(
  () =>
    assertMineruBatchContentList(
      [
        { page_idx: 1, type: "text" },
        { page_idx: 0, type: "text" },
      ],
      2,
    ),
  /partial or reordered/u,
);

console.log("PHB MinerU batch-run portable tests passed");

function resolveDataPath(relativePath: string) {
  return path.join(DATA_ROOT, ...relativePath.split("/"));
}

function hashFile(filePath: string) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}
