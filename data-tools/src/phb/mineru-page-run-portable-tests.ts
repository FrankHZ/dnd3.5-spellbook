import assert from "node:assert/strict";

import { parseMineruPageRunManifest } from "./mineru-page-run";
import { assertRunManifestMatchesRecall } from "./mineru-recall";

const SHA = "a".repeat(64);

const valid = {
  schemaVersion: 1,
  status: "succeeded",
  label: "printed-219-vlm",
  source: {
    id: "phb35-core",
    artifactSha256: SHA,
    sourcePageIndex: 219,
    printedPageNumber: 219,
  },
  input: {
    manifestRelativePath: "phb35/extracted/full/mineru-input-manifest.json",
    manifestSha256: SHA,
    subsetRelativePath: "artifacts/mineru/phb35/full-input/core.pdf",
    subsetSha256: SHA,
    subsetPageIndex: 38,
  },
  runtime: {
    engine: "MinerU",
    version: "3.4.0",
    pythonVersion: "3.12.13",
    backend: "vlm-engine",
    method: "auto",
    device: "Test GPU",
    dependencies: {
      accelerate: "1.0.0",
      torch: "2.0.0",
      transformers: "5.0.0",
    },
    model: {
      repository: "opendatalab/MinerU",
      revision: "revision",
    },
    config: {
      relativePath: "artifacts/mineru/phb35/mineru.json",
      sha256: SHA,
      modelSource: "huggingface",
    },
  },
  invocation: {
    executableRelativePath: "artifacts/mineru/phb35/.venv/Scripts/mineru.exe",
    executableSha256: SHA,
    arguments: ["-p", "input.pdf"],
    environment: {
      MINERU_TOOLS_CONFIG_JSON: "artifacts/mineru/phb35/mineru.json",
      MINERU_LOG_LEVEL: "INFO",
    },
    options: {
      formula: false,
      table: true,
      imageAnalysis: false,
      startPageIndex: 38,
      endPageIndex: 38,
    },
  },
  output: {
    contentListRelativePath: "artifacts/mineru/output/content_list.json",
    contentListSha256: SHA,
    contentListBytes: 1,
    candidatePageIndex: 0,
    stdoutRelativePath: "artifacts/mineru/output/stdout.log",
    stdoutSha256: SHA,
    stderrRelativePath: "artifacts/mineru/output/stderr.log",
    stderrSha256: SHA,
  },
} as const;

assert.equal(parseMineruPageRunManifest(valid).label, "printed-219-vlm");

assert.throws(
  () =>
    parseMineruPageRunManifest({
      ...valid,
      status: "accepted",
    }),
  /manifest is invalid/u,
);

const recallInput = {
  dataRoot: "C:/data",
  label: valid.label,
  sourceId: valid.source.id,
  sourcePageIndex: valid.source.sourcePageIndex,
  candidatePageIndex: valid.output.candidatePageIndex,
  candidatePath: valid.output.contentListRelativePath,
  backend: valid.runtime.backend,
  method: valid.runtime.method,
};
const current = {
  sourceArtifactSha256: valid.source.artifactSha256,
  inputManifest: {
    relativePath: valid.input.manifestRelativePath,
    sha256: valid.input.manifestSha256,
  },
  subsetArtifactSha256: valid.input.subsetSha256,
  subsetPageIndex: valid.input.subsetPageIndex,
  printedPageNumber: valid.source.printedPageNumber,
};
assert.doesNotThrow(() =>
  assertRunManifestMatchesRecall(
    parseMineruPageRunManifest(valid),
    recallInput,
    current,
  ),
);
assert.throws(
  () =>
    assertRunManifestMatchesRecall(
      parseMineruPageRunManifest(valid),
      recallInput,
      {
        ...current,
        subsetPageIndex: current.subsetPageIndex + 1,
      },
    ),
  /does not match recall arguments/u,
);

assert.throws(
  () =>
    parseMineruPageRunManifest({
      ...valid,
      invocation: {
        ...valid.invocation,
        options: {
          ...valid.invocation.options,
          imageAnalysis: true,
        },
      },
    }),
  /manifest is invalid/u,
);

assert.throws(
  () =>
    parseMineruPageRunManifest({
      ...valid,
      output: {
        ...valid.output,
        candidatePageIndex: 219,
      },
    }),
  /manifest is invalid/u,
);

console.log("PHB MinerU page-run portable tests passed");
