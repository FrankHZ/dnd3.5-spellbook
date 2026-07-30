import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildMineruVlmArguments,
  parseMineruPageRunManifest,
  resolveMineruModelIdentity,
  resolveMineruProcessTimeouts,
  runMineruVlmProcess,
} from "./mineru-page-run";
import { assertRunManifestMatchesRecall } from "./mineru-recall";

const SHA = "a".repeat(64);
const DATA_ROOT = path.resolve("C:/data");
const EXECUTABLE_RELATIVE_PATH =
  "artifacts/mineru/phb35/.venv/Scripts/mineru.exe";
const CONFIG_RELATIVE_PATH = "artifacts/mineru/phb35/mineru.json";
const INPUT_RELATIVE_PATH = "artifacts/mineru/phb35/full-input/core.pdf";
const OUTPUT_ROOT_RELATIVE_PATH = "artifacts/mineru/output";
const MODEL_FILES = [{ relativePath: "config.json", bytes: 2, sha256: SHA }];
const MODEL_FILE_MANIFEST_SHA = crypto
  .createHash("sha256")
  .update(JSON.stringify(MODEL_FILES))
  .digest("hex");

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
    subsetRelativePath: INPUT_RELATIVE_PATH,
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
      inputPath: resolveDataPath(INPUT_RELATIVE_PATH),
      outputPath: resolveDataPath(OUTPUT_ROOT_RELATIVE_PATH),
      startPageIndex: 38,
      endPageIndex: 38,
    }),
    portableArguments: buildMineruVlmArguments({
      inputPath: INPUT_RELATIVE_PATH,
      outputPath: OUTPUT_ROOT_RELATIVE_PATH,
      startPageIndex: 38,
      endPageIndex: 38,
    }),
    environment: {
      MINERU_TOOLS_CONFIG_JSON: resolveDataPath(CONFIG_RELATIVE_PATH),
      MINERU_LOG_LEVEL: "INFO",
      MINERU_TASK_RESULT_TIMEOUT_SECONDS: "900",
    },
    portableEnvironment: {
      MINERU_TOOLS_CONFIG_JSON: CONFIG_RELATIVE_PATH,
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
    stdoutRelativePath: `${OUTPUT_ROOT_RELATIVE_PATH}/stdout.log`,
    stdoutSha256: SHA,
    stderrRelativePath: `${OUTPUT_ROOT_RELATIVE_PATH}/stderr.log`,
    stderrSha256: SHA,
  },
} as const;

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
  fs.writeFileSync(weightsPath, "second", "utf8");
  const secondIdentity = resolveMineruModelIdentity(modelRoot, snapshotPath);
  assert.notEqual(
    firstIdentity.fileManifest.sha256,
    secondIdentity.fileManifest.sha256,
  );
  assert.notEqual(
    firstIdentity.fileManifest.files[0]?.sha256,
    secondIdentity.fileManifest.files[0]?.sha256,
  );
} finally {
  fs.rmSync(modelRoot, { recursive: true, force: true });
}

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

const invocationRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "mineru-invocation-"),
);
try {
  const actualInputPath = path.join(invocationRoot, "input.pdf");
  const actualOutputPath = path.join(invocationRoot, "output");
  fs.mkdirSync(actualOutputPath, { recursive: true });
  let observedArguments: readonly string[] = [];
  let observedCwd = "";
  let observedConfig = "";
  const result = runMineruVlmProcess(
    {
      dataRoot: invocationRoot,
      vlm: {
        executableRelativePath: "mineru.exe",
        executablePath: path.join(invocationRoot, "mineru.exe"),
        pythonExecutableRelativePath: "python.exe",
        pythonExecutablePath: path.join(invocationRoot, "python.exe"),
        configRelativePath: "mineru.json",
        configPath: path.join(invocationRoot, "mineru.json"),
        runtime: valid.runtime,
      },
      inputRelativePath: "input.pdf",
      inputPath: actualInputPath,
      outputRootRelativePath: "output",
      outputRoot: actualOutputPath,
      startPageIndex: 0,
      endPageIndex: 0,
      taskResultTimeoutSeconds: 1,
    },
    ((
      _command: string,
      args: readonly string[],
      options: {
        cwd?: string;
        env?: NodeJS.ProcessEnv;
      },
    ) => {
      observedArguments = args;
      observedCwd = options.cwd ?? "";
      observedConfig = options.env?.MINERU_TOOLS_CONFIG_JSON ?? "";
      return {
        error: undefined,
        status: 0,
        signal: null,
        output: [null, "ok", ""],
        pid: 1,
        stdout: "ok",
        stderr: "",
      } as never;
    }) as never,
  );
  assert.deepEqual(result.arguments, observedArguments);
  assert.equal(result.cwd, observedCwd);
  assert.equal(result.environment.MINERU_TOOLS_CONFIG_JSON, observedConfig);
  assert.equal(
    result.portableEnvironment.MINERU_TOOLS_CONFIG_JSON,
    "mineru.json",
  );
  assert.deepEqual(
    result.portableArguments,
    buildMineruVlmArguments({
      inputPath: "input.pdf",
      outputPath: "output",
      startPageIndex: 0,
      endPageIndex: 0,
    }),
  );
} finally {
  fs.rmSync(invocationRoot, { recursive: true, force: true });
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

function resolveDataPath(relativePath: string) {
  return path.join(DATA_ROOT, ...relativePath.split("/"));
}
