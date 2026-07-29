import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildMineruVlmArguments,
  parseMineruPageRunManifest,
  resolveMineruProcessTimeouts,
  runMineruVlmProcess,
} from "./mineru-page-run";
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
    pythonExecutable: {
      relativePath: "artifacts/mineru/phb35/.venv/Scripts/python.exe",
      sha256: SHA,
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
      MINERU_TASK_RESULT_TIMEOUT_SECONDS: "900",
    },
    options: {
      formula: false,
      table: true,
      imageAnalysis: false,
      startPageIndex: 38,
      endPageIndex: 38,
      processTimeoutSeconds: 1200,
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
assert.deepEqual(
  buildMineruVlmArguments({
    inputPath: "input.pdf",
    outputPath: "output",
    startPageIndex: 0,
    endPageIndex: 122,
  }).slice(-4),
  ["-s", "0", "-e", "122"],
);
assert.deepEqual(resolveMineruProcessTimeouts(60), {
  taskResultTimeoutSeconds: 60,
  processTimeoutSeconds: 360,
});
assert.throws(() => resolveMineruProcessTimeouts(0), /positive integer/u);
assert.throws(
  () => resolveMineruProcessTimeouts(Number.MAX_SAFE_INTEGER),
  /positive integer/u,
);
const timeoutRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mineru-timeout-"));
let observedTimeout: number | undefined;
try {
  assert.throws(
    () =>
      runMineruVlmProcess(
        {
          dataRoot: timeoutRoot,
          vlm: {
            executableRelativePath: "mineru.exe",
            executablePath: "mineru.exe",
            pythonExecutableRelativePath: "python.exe",
            pythonExecutablePath: "python.exe",
            configRelativePath: "mineru.json",
            configPath: "mineru.json",
            runtime: valid.runtime,
          },
          inputRelativePath: "input.pdf",
          inputPath: "input.pdf",
          outputRootRelativePath: "output",
          outputRoot: timeoutRoot,
          startPageIndex: 0,
          endPageIndex: 0,
          taskResultTimeoutSeconds: 1,
        },
        ((
          _command: string,
          _arguments: readonly string[],
          options: { timeout?: number },
        ) => {
          observedTimeout = options.timeout;
          return {
            error: Object.assign(new Error("timed out"), {
              code: "ETIMEDOUT",
            }),
            status: null,
            signal: "SIGTERM",
            output: [null, "", ""],
            pid: 1,
            stdout: "",
            stderr: "",
          } as never;
        }) as never,
      ),
    /exceeded parent timeout 301s/u,
  );
  assert.equal(observedTimeout, 301_000);
} finally {
  fs.rmSync(timeoutRoot, { recursive: true, force: true });
}

assert.throws(
  () =>
    parseMineruPageRunManifest({
      ...valid,
      status: "accepted",
    }),
  /manifest is invalid/u,
);
assert.throws(
  () =>
    parseMineruPageRunManifest({
      ...valid,
      invocation: {
        ...valid.invocation,
        options: {
          ...valid.invocation.options,
          processTimeoutSeconds: 1199,
        },
      },
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

assert.throws(
  () =>
    parseMineruPageRunManifest({
      ...valid,
      invocation: {
        ...valid.invocation,
        environment: {
          ...valid.invocation.environment,
          MINERU_TASK_RESULT_TIMEOUT_SECONDS: "0",
        },
      },
    }),
  /manifest is invalid/u,
);

console.log("PHB MinerU page-run portable tests passed");
