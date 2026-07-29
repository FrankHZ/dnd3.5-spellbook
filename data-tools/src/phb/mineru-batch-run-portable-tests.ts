import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertMineruBatchContentList,
  parseMineruBatchRunManifest,
  verifyMineruBatchRuntime,
} from "./mineru-batch-run";
import { buildMineruVlmArguments } from "./mineru-page-run";

const SHA = "a".repeat(64);

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
    model: { repository: "opendatalab/MinerU", revision: "revision" },
    config: {
      relativePath: "artifacts/mineru/phb35/mineru.json",
      sha256: SHA,
      modelSource: "huggingface",
    },
  },
  invocation: {
    executableRelativePath: "artifacts/mineru/phb35/.venv/Scripts/mineru.exe",
    executableSha256: SHA,
    arguments: buildMineruVlmArguments({
      inputPath: "artifacts/mineru/phb35/full-input/phb35-core.full.pdf",
      outputPath:
        "artifacts/mineru/phb35/recall-full/.recall-full.partial-1234",
      startPageIndex: 0,
      endPageIndex: 2,
    }),
    environment: {
      MINERU_TOOLS_CONFIG_JSON: "artifacts/mineru/phb35/mineru.json",
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
        arguments: buildMineruVlmArguments({
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
