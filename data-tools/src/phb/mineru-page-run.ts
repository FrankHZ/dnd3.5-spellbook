import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { repoRoot } from "../shared/env";
import {
  PHB_FULL_MINERU_INPUT_MANIFEST_RELATIVE_PATH,
  assertCanonicalFullPageMappings,
  parseFullMineruInputManifest,
  type FullMineruInputArtifact,
} from "./full-mineru";
import { readPhbFullExtractionManifest } from "./full-manifest";
import { readJson, resolveAbsoluteInside, safeId } from "./pilot-extraction";
import { readAndVerifyPhbSourceManifest, sha256File } from "./source-manifest";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const DEFAULT_EXECUTABLE = "artifacts/mineru/phb35/.venv/Scripts/mineru.exe";
const DEFAULT_CONFIG = "artifacts/mineru/phb35/mineru.json";
const DEFAULT_OUTPUT_ROOT = "artifacts/mineru/phb35/recall-pilot";
export const DEFAULT_MINERU_PAGE_TASK_TIMEOUT_SECONDS = 900;
export const MINERU_PROCESS_TIMEOUT_GRACE_SECONDS = 300;
const MINERU_RUNTIME_PROBE_TIMEOUT_MS = 60_000;
const MAX_NODE_TIMEOUT_SECONDS = Math.floor(2_147_483_647 / 1000);

type RuntimeProbe = {
  mineruVersion: string;
  pythonVersion: string;
  dependencies: Record<string, string>;
  cudaAvailable: boolean;
  device: string;
};

export type MineruFullInputSource = {
  sourceManifestRelativePath: string;
  sourceManifestSha256: string;
  fullManifestRelativePath: string;
  fullManifestSha256: string;
  inputManifestRelativePath: string;
  inputManifestSha256: string;
  sourceArtifact: {
    id: string;
    sha256: string;
  };
  inputArtifact: FullMineruInputArtifact;
  subsetPath: string;
};

export type MineruVlmRuntime = {
  executableRelativePath: string;
  executablePath: string;
  pythonExecutableRelativePath: string;
  pythonExecutablePath: string;
  configRelativePath: string;
  configPath: string;
  runtime: MineruPageRunManifest["runtime"];
};

export type MineruPageRunManifest = {
  schemaVersion: 1;
  status: "succeeded";
  label: string;
  source: {
    id: string;
    artifactSha256: string;
    sourcePageIndex: number;
    printedPageNumber: number | null;
  };
  input: {
    manifestRelativePath: string;
    manifestSha256: string;
    subsetRelativePath: string;
    subsetSha256: string;
    subsetPageIndex: number;
  };
  runtime: {
    engine: "MinerU";
    version: string;
    pythonVersion: string;
    backend: "vlm-engine";
    method: "auto";
    device: string;
    dependencies: Record<string, string>;
    pythonExecutable?: {
      relativePath: string;
      sha256: string;
    };
    model: {
      repository: string;
      revision: string;
      relativePath: string;
      fileManifest: {
        algorithm: "sha256-files-v1";
        fileCount: number;
        totalBytes: number;
        sha256: string;
        files: Array<{
          relativePath: string;
          bytes: number;
          sha256: string;
        }>;
      };
    };
    config: {
      relativePath: string;
      sha256: string;
      modelSource: string;
    };
  };
  invocation: {
    executableRelativePath: string;
    executablePath: string;
    executableSha256: string;
    cwd: string;
    dataRoot: string;
    arguments: string[];
    portableArguments: string[];
    environment: {
      MINERU_TOOLS_CONFIG_JSON: string;
      MINERU_LOG_LEVEL: string;
      MINERU_TASK_RESULT_TIMEOUT_SECONDS?: string;
    };
    portableEnvironment: {
      MINERU_TOOLS_CONFIG_JSON: string;
      MINERU_LOG_LEVEL: string;
      MINERU_TASK_RESULT_TIMEOUT_SECONDS?: string;
    };
    options: {
      formula: false;
      table: true;
      imageAnalysis: false;
      startPageIndex: number;
      endPageIndex: number;
      processTimeoutSeconds?: number;
    };
  };
  output: {
    contentListRelativePath: string;
    contentListSha256: string;
    contentListBytes: number;
    candidatePageIndex: 0;
    stdoutRelativePath: string;
    stdoutSha256: string;
    stderrRelativePath: string;
    stderrSha256: string;
  };
};

export function runMineruPage(input: {
  dataRoot: string;
  label: string;
  sourceId: string;
  sourcePageIndex: number;
  executablePath?: string;
  configPath?: string;
  outputRoot?: string;
}) {
  const dataRoot = path.resolve(input.dataRoot);
  const label = safeId(input.label);
  if (label !== input.label) {
    throw new Error(
      "MinerU page-run label must already be a lowercase filesystem-safe id",
    );
  }
  if (!Number.isInteger(input.sourcePageIndex) || input.sourcePageIndex < 0) {
    throw new Error("MinerU page-run source page index must be non-negative");
  }

  const fullInput = readMineruFullInputSource(dataRoot, input.sourceId);
  const mapping = fullInput.inputArtifact.pages.find(
    (page) => page.sourcePageIndex === input.sourcePageIndex,
  );
  if (!mapping) {
    throw new Error(
      `Full MinerU page mapping not found: ${input.sourceId}[${input.sourcePageIndex}]`,
    );
  }
  const vlm = resolveMineruVlmRuntime({
    dataRoot,
    ...(input.executablePath ? { executablePath: input.executablePath } : {}),
    ...(input.configPath ? { configPath: input.configPath } : {}),
  });

  const outputRootRelativePath = normalizeRelativePath(
    input.outputRoot ?? DEFAULT_OUTPUT_ROOT,
  );
  const runRootRelativePath = `${outputRootRelativePath}/${label}`;
  const runRoot = resolveAbsoluteInside(dataRoot, runRootRelativePath);
  if (fs.existsSync(runRoot)) {
    throw new Error(
      `MinerU page-run output already exists: ${runRootRelativePath}`,
    );
  }
  fs.mkdirSync(runRoot, { recursive: true });

  const processResult = runMineruVlmProcess({
    dataRoot,
    vlm,
    inputRelativePath: fullInput.inputArtifact.relativePath,
    inputPath: fullInput.subsetPath,
    outputRootRelativePath: runRootRelativePath,
    outputRoot: runRoot,
    startPageIndex: mapping.subsetPageIndex,
    endPageIndex: mapping.subsetPageIndex,
    taskResultTimeoutSeconds: DEFAULT_MINERU_PAGE_TASK_TIMEOUT_SECONDS,
  });
  const contentListPath = mineruVlmContentListPath(
    fullInput.subsetPath,
    runRoot,
  );
  if (!fs.existsSync(contentListPath)) {
    throw new Error(
      `MinerU page-run content list not found: ${normalizeRelativePath(
        path.relative(dataRoot, contentListPath),
      )}`,
    );
  }
  assertSinglePageContentList(contentListPath);

  const manifest: MineruPageRunManifest = {
    schemaVersion: 1,
    status: "succeeded",
    label,
    source: {
      id: input.sourceId,
      artifactSha256: fullInput.sourceArtifact.sha256,
      sourcePageIndex: input.sourcePageIndex,
      printedPageNumber: mapping.printedPageNumber ?? null,
    },
    input: {
      manifestRelativePath: normalizeRelativePath(
        fullInput.inputManifestRelativePath,
      ),
      manifestSha256: fullInput.inputManifestSha256,
      subsetRelativePath: normalizeRelativePath(
        fullInput.inputArtifact.relativePath,
      ),
      subsetSha256: fullInput.inputArtifact.sha256,
      subsetPageIndex: mapping.subsetPageIndex,
    },
    runtime: {
      ...vlm.runtime,
    },
    invocation: {
      executableRelativePath: vlm.executableRelativePath,
      executablePath: vlm.executablePath,
      executableSha256: sha256File(vlm.executablePath),
      cwd: processResult.cwd,
      dataRoot,
      arguments: processResult.arguments,
      portableArguments: processResult.portableArguments,
      environment: processResult.environment,
      portableEnvironment: processResult.portableEnvironment,
      options: {
        formula: false,
        table: true,
        imageAnalysis: false,
        startPageIndex: mapping.subsetPageIndex,
        endPageIndex: mapping.subsetPageIndex,
        processTimeoutSeconds: processResult.processTimeoutSeconds,
      },
    },
    output: {
      contentListRelativePath: normalizeRelativePath(
        path.relative(dataRoot, contentListPath),
      ),
      contentListSha256: sha256File(contentListPath),
      contentListBytes: fs.statSync(contentListPath).size,
      candidatePageIndex: 0,
      stdoutRelativePath: normalizeRelativePath(
        path.relative(dataRoot, processResult.stdoutPath),
      ),
      stdoutSha256: sha256File(processResult.stdoutPath),
      stderrRelativePath: normalizeRelativePath(
        path.relative(dataRoot, processResult.stderrPath),
      ),
      stderrSha256: sha256File(processResult.stderrPath),
    },
  };
  const manifestPath = path.join(runRoot, "run-manifest.json");
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return { manifest, manifestPath };
}

export function parseMineruPageRunManifest(
  value: unknown,
): MineruPageRunManifest {
  if (!isRecord(value)) {
    throw new Error("MinerU page-run manifest is invalid");
  }
  const source = isRecord(value.source) ? value.source : null;
  const input = isRecord(value.input) ? value.input : null;
  const runtime = isRecord(value.runtime) ? value.runtime : null;
  const model = runtime && isRecord(runtime.model) ? runtime.model : null;
  const config = runtime && isRecord(runtime.config) ? runtime.config : null;
  const pythonExecutable =
    runtime && isRecord(runtime.pythonExecutable)
      ? runtime.pythonExecutable
      : null;
  const invocation = isRecord(value.invocation) ? value.invocation : null;
  const options =
    invocation && isRecord(invocation.options) ? invocation.options : null;
  const output = isRecord(value.output) ? value.output : null;
  if (
    value.schemaVersion !== 1 ||
    value.status !== "succeeded" ||
    typeof value.label !== "string" ||
    safeId(value.label) !== value.label ||
    !source ||
    typeof source.id !== "string" ||
    !isSha256(source.artifactSha256) ||
    !isNonNegativeInteger(source.sourcePageIndex) ||
    !(
      source.printedPageNumber === null ||
      Number.isInteger(source.printedPageNumber)
    ) ||
    !input ||
    !isRelativePath(input.manifestRelativePath) ||
    !isSha256(input.manifestSha256) ||
    !isRelativePath(input.subsetRelativePath) ||
    !isSha256(input.subsetSha256) ||
    !isNonNegativeInteger(input.subsetPageIndex) ||
    !runtime ||
    runtime.engine !== "MinerU" ||
    typeof runtime.version !== "string" ||
    typeof runtime.pythonVersion !== "string" ||
    runtime.backend !== "vlm-engine" ||
    runtime.method !== "auto" ||
    typeof runtime.device !== "string" ||
    !isStringRecord(runtime.dependencies) ||
    !(
      runtime.pythonExecutable === undefined ||
      (pythonExecutable &&
        isRelativePath(pythonExecutable.relativePath) &&
        isSha256(pythonExecutable.sha256))
    ) ||
    !model ||
    typeof model.repository !== "string" ||
    typeof model.revision !== "string" ||
    !isRelativePath(model.relativePath) ||
    !isMineruModelFileManifest(model.fileManifest) ||
    !config ||
    !isRelativePath(config.relativePath) ||
    !isSha256(config.sha256) ||
    typeof config.modelSource !== "string" ||
    !invocation ||
    !isRelativePath(invocation.executableRelativePath) ||
    typeof invocation.executablePath !== "string" ||
    !path.isAbsolute(invocation.executablePath) ||
    !isSha256(invocation.executableSha256) ||
    typeof invocation.cwd !== "string" ||
    !path.isAbsolute(invocation.cwd) ||
    typeof invocation.dataRoot !== "string" ||
    !path.isAbsolute(invocation.dataRoot) ||
    !Array.isArray(invocation.arguments) ||
    !invocation.arguments.every((item) => typeof item === "string") ||
    !Array.isArray(invocation.portableArguments) ||
    !invocation.portableArguments.every((item) => typeof item === "string") ||
    !isRecord(invocation.environment) ||
    typeof invocation.environment.MINERU_TOOLS_CONFIG_JSON !== "string" ||
    invocation.environment.MINERU_LOG_LEVEL !== "INFO" ||
    !(
      invocation.environment.MINERU_TASK_RESULT_TIMEOUT_SECONDS === undefined ||
      isPositiveIntegerString(
        invocation.environment.MINERU_TASK_RESULT_TIMEOUT_SECONDS,
      )
    ) ||
    !isRecord(invocation.portableEnvironment) ||
    typeof invocation.portableEnvironment.MINERU_TOOLS_CONFIG_JSON !==
      "string" ||
    invocation.portableEnvironment.MINERU_LOG_LEVEL !== "INFO" ||
    !(
      invocation.portableEnvironment.MINERU_TASK_RESULT_TIMEOUT_SECONDS ===
        undefined ||
      isPositiveIntegerString(
        invocation.portableEnvironment.MINERU_TASK_RESULT_TIMEOUT_SECONDS,
      )
    ) ||
    !options ||
    options.formula !== false ||
    options.table !== true ||
    options.imageAnalysis !== false ||
    !isNonNegativeInteger(options.startPageIndex) ||
    options.endPageIndex !== options.startPageIndex ||
    !(
      options.processTimeoutSeconds === undefined ||
      isPositiveSafeInteger(options.processTimeoutSeconds)
    ) ||
    !(
      invocation.environment.MINERU_TASK_RESULT_TIMEOUT_SECONDS === undefined ||
      options.processTimeoutSeconds ===
        Number(invocation.environment.MINERU_TASK_RESULT_TIMEOUT_SECONDS) +
          MINERU_PROCESS_TIMEOUT_GRACE_SECONDS
    ) ||
    options.startPageIndex !== input.subsetPageIndex ||
    !output ||
    !isRelativePath(output.contentListRelativePath) ||
    !isSha256(output.contentListSha256) ||
    !isNonNegativeInteger(output.contentListBytes) ||
    output.candidatePageIndex !== 0 ||
    !isRelativePath(output.stdoutRelativePath) ||
    !isSha256(output.stdoutSha256) ||
    !isRelativePath(output.stderrRelativePath) ||
    !isSha256(output.stderrSha256)
  ) {
    throw new Error("MinerU page-run manifest is invalid");
  }
  const manifest = value as MineruPageRunManifest;
  assertPageInvocationProvenance(manifest);
  return manifest;
}

export function readAndVerifyMineruPageRunManifest(
  dataRoot: string,
  manifestPath: string,
) {
  const resolvedManifestPath = resolveAbsoluteInside(dataRoot, manifestPath);
  const manifest = parseMineruPageRunManifest(
    readJson(resolvedManifestPath, "MinerU page-run manifest"),
  );
  if (
    path.resolve(manifest.invocation.dataRoot) !== path.resolve(dataRoot) ||
    path.resolve(manifest.invocation.cwd) !== path.resolve(repoRoot())
  ) {
    throw new Error("MinerU page-run execution paths changed since completion");
  }
  verifyFile(
    manifest.output.contentListRelativePath,
    resolveAbsoluteInside(dataRoot, manifest.output.contentListRelativePath),
    {
      bytes: manifest.output.contentListBytes,
      sha256: manifest.output.contentListSha256,
    },
  );
  verifyFile(
    manifest.runtime.config.relativePath,
    resolveAbsoluteInside(dataRoot, manifest.runtime.config.relativePath),
    { sha256: manifest.runtime.config.sha256 },
  );
  verifyFile(
    manifest.invocation.executableRelativePath,
    resolveAbsoluteInside(dataRoot, manifest.invocation.executableRelativePath),
    { sha256: manifest.invocation.executableSha256 },
  );
  if (manifest.runtime.pythonExecutable) {
    verifyFile(
      manifest.runtime.pythonExecutable.relativePath,
      resolveAbsoluteInside(
        dataRoot,
        manifest.runtime.pythonExecutable.relativePath,
      ),
      { sha256: manifest.runtime.pythonExecutable.sha256 },
    );
  }
  const currentModel = resolveMineruModelIdentity(
    dataRoot,
    resolveAbsoluteInside(dataRoot, manifest.runtime.model.relativePath),
  );
  if (JSON.stringify(manifest.runtime.model) !== JSON.stringify(currentModel)) {
    throw new Error("MinerU page-run model files changed since completion");
  }
  verifyFile(
    manifest.output.stdoutRelativePath,
    resolveAbsoluteInside(dataRoot, manifest.output.stdoutRelativePath),
    { sha256: manifest.output.stdoutSha256 },
  );
  verifyFile(
    manifest.output.stderrRelativePath,
    resolveAbsoluteInside(dataRoot, manifest.output.stderrRelativePath),
    { sha256: manifest.output.stderrSha256 },
  );
  return {
    manifest,
    manifestPath: resolvedManifestPath,
    manifestSha256: sha256File(resolvedManifestPath),
  };
}

export function readMineruFullInputSource(
  dataRootInput: string,
  sourceId: string,
): MineruFullInputSource {
  const dataRoot = path.resolve(dataRootInput);
  const source = readAndVerifyPhbSourceManifest(dataRoot);
  const sourceArtifact = source.artifacts.find(
    (artifact) => artifact.id === sourceId,
  );
  if (!sourceArtifact) throw new Error(`Unknown PHB source id: ${sourceId}`);
  const inputManifestPath = path.join(
    dataRoot,
    PHB_FULL_MINERU_INPUT_MANIFEST_RELATIVE_PATH,
  );
  const inputManifest = parseFullMineruInputManifest(
    readJson(inputManifestPath, "PHB full MinerU input manifest"),
  );
  if (inputManifest.sourceManifest.sha256 !== source.manifestSha256) {
    throw new Error(
      "Full MinerU input does not pin the current source manifest",
    );
  }
  const { filePath: fullManifestPath, manifest: fullManifest } =
    readPhbFullExtractionManifest(dataRoot);
  const fullManifestSha256 = sha256File(fullManifestPath);
  if (inputManifest.fullManifest.sha256 !== fullManifestSha256) {
    throw new Error(
      "Full MinerU input does not pin the current full extraction manifest",
    );
  }
  const inputArtifact = inputManifest.artifacts.find(
    (artifact) => artifact.sourceId === sourceId,
  );
  if (!inputArtifact || inputArtifact.sourceSha256 !== sourceArtifact.sha256) {
    throw new Error(`Full MinerU input source changed: ${sourceId}`);
  }
  const sourceConfig = fullManifest.sources.find(
    (candidate) => candidate.sourceId === sourceId,
  );
  if (!sourceConfig) {
    throw new Error(`Full extraction manifest has no source: ${sourceId}`);
  }
  assertCanonicalFullPageMappings(
    inputArtifact.pages,
    sourceConfig.ranges,
    sourceId,
  );
  const subsetPath = resolveAbsoluteInside(
    dataRoot,
    inputArtifact.relativePath,
  );
  verifyFile(inputArtifact.relativePath, subsetPath, {
    bytes: inputArtifact.bytes,
    sha256: inputArtifact.sha256,
  });
  return {
    sourceManifestRelativePath: normalizeRelativePath(
      path.relative(dataRoot, source.manifestPath),
    ),
    sourceManifestSha256: source.manifestSha256,
    fullManifestRelativePath: normalizeRelativePath(
      path.relative(dataRoot, fullManifestPath),
    ),
    fullManifestSha256,
    inputManifestRelativePath: normalizeRelativePath(
      path.relative(dataRoot, inputManifestPath),
    ),
    inputManifestSha256: sha256File(inputManifestPath),
    sourceArtifact: { id: sourceArtifact.id, sha256: sourceArtifact.sha256 },
    inputArtifact,
    subsetPath,
  };
}

export function resolveMineruVlmRuntime(input: {
  dataRoot: string;
  executablePath?: string;
  configPath?: string;
}): MineruVlmRuntime {
  const dataRoot = path.resolve(input.dataRoot);
  const executableRelativePath = normalizeRelativePath(
    input.executablePath ?? DEFAULT_EXECUTABLE,
  );
  const executablePath = resolveAbsoluteInside(
    dataRoot,
    executableRelativePath,
  );
  if (!fs.existsSync(executablePath)) {
    throw new Error(`MinerU executable not found: ${executableRelativePath}`);
  }
  const configRelativePath = normalizeRelativePath(
    input.configPath ?? DEFAULT_CONFIG,
  );
  const configPath = resolveAbsoluteInside(dataRoot, configRelativePath);
  if (!fs.existsSync(configPath)) {
    throw new Error(`MinerU config not found: ${configRelativePath}`);
  }
  const config = parseMineruConfig(readJson(configPath, "MinerU config"));
  if (!fs.existsSync(config.modelsDirVlm)) {
    throw new Error("MinerU configured VLM model directory does not exist");
  }
  const pythonExecutablePath = path.join(
    path.dirname(executablePath),
    "python.exe",
  );
  if (!fs.existsSync(pythonExecutablePath)) {
    throw new Error(
      `MinerU Python executable not found: ${pythonExecutablePath}`,
    );
  }
  const pythonExecutableRelativePath = normalizeRelativePath(
    path.relative(dataRoot, pythonExecutablePath),
  );
  const probe = probeRuntime(pythonExecutablePath);
  if (!probe.cudaAvailable) {
    throw new Error("MinerU VLM run requires an available CUDA device");
  }
  return {
    executableRelativePath,
    executablePath,
    pythonExecutableRelativePath,
    pythonExecutablePath,
    configRelativePath,
    configPath,
    runtime: {
      engine: "MinerU",
      version: probe.mineruVersion,
      pythonVersion: probe.pythonVersion,
      backend: "vlm-engine",
      method: "auto",
      device: probe.device,
      dependencies: probe.dependencies,
      pythonExecutable: {
        relativePath: pythonExecutableRelativePath,
        sha256: sha256File(pythonExecutablePath),
      },
      model: resolveMineruModelIdentity(dataRoot, config.modelsDirVlm),
      config: {
        relativePath: configRelativePath,
        sha256: sha256File(configPath),
        modelSource: config.modelSource,
      },
    },
  };
}

export function runMineruVlmProcess(
  input: {
    dataRoot: string;
    vlm: MineruVlmRuntime;
    inputRelativePath: string;
    inputPath: string;
    outputRootRelativePath: string;
    outputRoot: string;
    startPageIndex: number;
    endPageIndex: number;
    taskResultTimeoutSeconds?: number;
  },
  spawnProcess: typeof spawnSync = spawnSync,
) {
  const portableArguments = buildMineruVlmArguments({
    inputPath: input.inputRelativePath,
    outputPath: input.outputRootRelativePath,
    startPageIndex: input.startPageIndex,
    endPageIndex: input.endPageIndex,
  });
  const actualArguments = buildMineruVlmArguments({
    inputPath: input.inputPath,
    outputPath: input.outputRoot,
    startPageIndex: input.startPageIndex,
    endPageIndex: input.endPageIndex,
  });
  const { taskResultTimeoutSeconds, processTimeoutSeconds } =
    resolveMineruProcessTimeouts(input.taskResultTimeoutSeconds);
  const cwd = repoRoot();
  const environment = {
    MINERU_TOOLS_CONFIG_JSON: input.vlm.configPath,
    MINERU_LOG_LEVEL: "INFO",
    MINERU_TASK_RESULT_TIMEOUT_SECONDS: String(taskResultTimeoutSeconds),
  };
  const portableEnvironment = {
    ...environment,
    MINERU_TOOLS_CONFIG_JSON: input.vlm.configRelativePath,
  };
  const result = spawnProcess(input.vlm.executablePath, actualArguments, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...environment,
    },
    maxBuffer: 64 * 1024 * 1024,
    timeout: processTimeoutSeconds * 1000,
    killSignal: "SIGTERM",
  });
  const stdoutPath = path.join(input.outputRoot, "mineru.stdout.log");
  const stderrPath = path.join(input.outputRoot, "mineru.stderr.log");
  fs.writeFileSync(stdoutPath, result.stdout ?? "", "utf8");
  fs.writeFileSync(stderrPath, result.stderr ?? "", "utf8");
  if (result.error) {
    if ("code" in result.error && result.error.code === "ETIMEDOUT") {
      throw new Error(
        `MinerU VLM run exceeded parent timeout ${processTimeoutSeconds}s; see ${normalizeRelativePath(
          path.relative(input.dataRoot, stderrPath),
        )}`,
      );
    }
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `MinerU VLM run failed with exit code ${String(result.status)}; see ${normalizeRelativePath(
        path.relative(input.dataRoot, stderrPath),
      )}`,
    );
  }
  return {
    arguments: actualArguments,
    portableArguments,
    cwd,
    environment,
    portableEnvironment,
    stdoutPath,
    stderrPath,
    taskResultTimeoutSeconds,
    processTimeoutSeconds,
  };
}

export function resolveMineruProcessTimeouts(
  taskResultTimeoutSeconds = DEFAULT_MINERU_PAGE_TASK_TIMEOUT_SECONDS,
) {
  if (
    !isPositiveSafeInteger(taskResultTimeoutSeconds) ||
    taskResultTimeoutSeconds >
      MAX_NODE_TIMEOUT_SECONDS - MINERU_PROCESS_TIMEOUT_GRACE_SECONDS
  ) {
    throw new Error("MinerU task-result timeout must be a positive integer");
  }
  return {
    taskResultTimeoutSeconds,
    processTimeoutSeconds:
      taskResultTimeoutSeconds + MINERU_PROCESS_TIMEOUT_GRACE_SECONDS,
  };
}

export function mineruVlmContentListPath(
  inputPath: string,
  outputRoot: string,
) {
  const documentStem = path.parse(inputPath).name;
  return path.join(
    outputRoot,
    documentStem,
    "vlm",
    `${documentStem}_content_list.json`,
  );
}

export function buildMineruVlmArguments(input: {
  inputPath: string;
  outputPath: string;
  startPageIndex: number;
  endPageIndex: number;
}) {
  return [
    "-p",
    input.inputPath,
    "-o",
    input.outputPath,
    "-m",
    "auto",
    "-b",
    "vlm-engine",
    "--formula",
    "false",
    "--table",
    "true",
    "--image-analysis",
    "false",
    "-s",
    String(input.startPageIndex),
    "-e",
    String(input.endPageIndex),
  ];
}

function probeRuntime(pythonPath: string): RuntimeProbe {
  const script = [
    "import importlib.metadata as m",
    "import json, platform, torch",
    "def version(name):",
    "    try: return m.version(name)",
    "    except m.PackageNotFoundError: return 'missing'",
    "available = torch.cuda.is_available()",
    "print(json.dumps({",
    "  'mineruVersion': version('mineru'),",
    "  'pythonVersion': platform.python_version(),",
    "  'dependencies': {",
    "    'accelerate': version('accelerate'),",
    "    'torch': version('torch'),",
    "    'transformers': version('transformers')",
    "  },",
    "  'cudaAvailable': available,",
    "  'device': torch.cuda.get_device_name(0) if available else 'cpu'",
    "}))",
  ].join("\n");
  const result = spawnSync(pythonPath, ["-X", "utf8", "-c", script], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: MINERU_RUNTIME_PROBE_TIMEOUT_MS,
    killSignal: "SIGTERM",
  });
  if (result.error) {
    if ("code" in result.error && result.error.code === "ETIMEDOUT") {
      throw new Error(
        `MinerU runtime probe exceeded ${MINERU_RUNTIME_PROBE_TIMEOUT_MS / 1000}s`,
      );
    }
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `MinerU runtime probe failed with exit code ${String(result.status)}: ${
        result.stderr ?? ""
      }`,
    );
  }
  const value = JSON.parse(result.stdout) as unknown;
  if (
    !isRecord(value) ||
    typeof value.mineruVersion !== "string" ||
    typeof value.pythonVersion !== "string" ||
    !isStringRecord(value.dependencies) ||
    typeof value.cudaAvailable !== "boolean" ||
    typeof value.device !== "string"
  ) {
    throw new Error("MinerU runtime probe returned invalid JSON");
  }
  return value as RuntimeProbe;
}

function parseMineruConfig(value: unknown) {
  if (!isRecord(value)) throw new Error("MinerU config is invalid");
  const modelsDir = isRecord(value["models-dir"]) ? value["models-dir"] : null;
  if (
    !modelsDir ||
    typeof modelsDir.vlm !== "string" ||
    typeof value["model-source"] !== "string"
  ) {
    throw new Error("MinerU config has no VLM model identity");
  }
  return {
    modelsDirVlm: modelsDir.vlm,
    modelSource: value["model-source"],
  };
}

export function resolveMineruModelIdentity(
  dataRootInput: string,
  modelPathInput: string,
): MineruPageRunManifest["runtime"]["model"] {
  const dataRoot = path.resolve(dataRootInput);
  const modelPath = path.resolve(modelPathInput);
  const relativePath = normalizeRelativePath(
    path.relative(dataRoot, modelPath),
  );
  if (!isRelativePath(relativePath)) {
    throw new Error("MinerU VLM model path escapes the data repository");
  }
  const normalized = modelPath.replace(/\\/gu, "/");
  const match = normalized.match(
    /models--([^/]+)--([^/]+)\/snapshots\/([^/]+)$/u,
  );
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error("MinerU VLM model path does not contain a pinned revision");
  }
  const files = listModelFiles(modelPath);
  if (files.length === 0) {
    throw new Error("MinerU VLM model directory contains no files");
  }
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  return {
    repository: `${match[1]}/${match[2]}`,
    revision: match[3],
    relativePath,
    fileManifest: {
      algorithm: "sha256-files-v1",
      fileCount: files.length,
      totalBytes,
      sha256: crypto
        .createHash("sha256")
        .update(JSON.stringify(files))
        .digest("hex"),
      files,
    },
  };
}

function listModelFiles(modelRoot: string) {
  const files: Array<{
    relativePath: string;
    bytes: number;
    sha256: string;
  }> = [];
  const visit = (directory: string) => {
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        if (entry.isSymbolicLink()) {
          throw new Error(
            "MinerU VLM model directory contains a directory symlink",
          );
        }
        visit(filePath);
      } else if (stats.isFile()) {
        files.push({
          relativePath: normalizeRelativePath(
            path.relative(modelRoot, filePath),
          ),
          bytes: stats.size,
          sha256: sha256FileChunked(filePath),
        });
      }
    }
  };
  visit(modelRoot);
  return files.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath, "en"),
  );
}

function sha256FileChunked(filePath: string) {
  const hash = crypto.createHash("sha256");
  const buffer = Buffer.allocUnsafe(4 * 1024 * 1024);
  const descriptor = fs.openSync(filePath, "r");
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest("hex");
}

function assertSinglePageContentList(contentListPath: string) {
  const value = readJson(contentListPath, "MinerU page-run content list");
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some(
      (row) =>
        !isRecord(row) || !Number.isInteger(row.page_idx) || row.page_idx !== 0,
    )
  ) {
    throw new Error(
      "MinerU page-run content list must contain exactly candidate page index 0",
    );
  }
}

function assertPageInvocationProvenance(manifest: MineruPageRunManifest) {
  const outputRootRelativePath = normalizeRelativePath(
    path.posix.dirname(manifest.output.stdoutRelativePath),
  );
  const expectedPortableArguments = buildMineruVlmArguments({
    inputPath: manifest.input.subsetRelativePath,
    outputPath: outputRootRelativePath,
    startPageIndex: manifest.input.subsetPageIndex,
    endPageIndex: manifest.input.subsetPageIndex,
  });
  const expectedArguments = buildMineruVlmArguments({
    inputPath: resolveAbsoluteInside(
      manifest.invocation.dataRoot,
      manifest.input.subsetRelativePath,
    ),
    outputPath: resolveAbsoluteInside(
      manifest.invocation.dataRoot,
      outputRootRelativePath,
    ),
    startPageIndex: manifest.input.subsetPageIndex,
    endPageIndex: manifest.input.subsetPageIndex,
  });
  if (
    path.resolve(manifest.invocation.executablePath) !==
      resolveAbsoluteInside(
        manifest.invocation.dataRoot,
        manifest.invocation.executableRelativePath,
      ) ||
    !sameStrings(manifest.invocation.arguments, expectedArguments) ||
    !sameStrings(
      manifest.invocation.portableArguments,
      expectedPortableArguments,
    ) ||
    path.resolve(manifest.invocation.environment.MINERU_TOOLS_CONFIG_JSON) !==
      resolveAbsoluteInside(
        manifest.invocation.dataRoot,
        manifest.runtime.config.relativePath,
      ) ||
    manifest.invocation.portableEnvironment.MINERU_TOOLS_CONFIG_JSON !==
      manifest.runtime.config.relativePath ||
    manifest.invocation.environment.MINERU_LOG_LEVEL !==
      manifest.invocation.portableEnvironment.MINERU_LOG_LEVEL ||
    manifest.invocation.environment.MINERU_TASK_RESULT_TIMEOUT_SECONDS !==
      manifest.invocation.portableEnvironment.MINERU_TASK_RESULT_TIMEOUT_SECONDS
  ) {
    throw new Error(
      "MinerU page-run invocation does not match the executed command",
    );
  }
}

export function isMineruModelFileManifest(
  value: unknown,
): value is MineruPageRunManifest["runtime"]["model"]["fileManifest"] {
  const manifest = isRecord(value) ? value : null;
  if (
    !manifest ||
    manifest.algorithm !== "sha256-files-v1" ||
    !isNonNegativeInteger(manifest.fileCount) ||
    !isNonNegativeInteger(manifest.totalBytes) ||
    !isSha256(manifest.sha256) ||
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0 ||
    manifest.fileCount !== manifest.files.length
  ) {
    return false;
  }
  const files = manifest.files.map((file) => {
    if (
      !isRecord(file) ||
      !isRelativePath(file.relativePath) ||
      !isNonNegativeInteger(file.bytes) ||
      !isSha256(file.sha256)
    ) {
      return null;
    }
    return {
      relativePath: file.relativePath,
      bytes: file.bytes,
      sha256: file.sha256,
    };
  });
  if (files.some((file) => file === null)) return false;
  const typedFiles = files as Array<{
    relativePath: string;
    bytes: number;
    sha256: string;
  }>;
  const paths = typedFiles.map((file) => file.relativePath);
  return (
    paths.every(
      (relativePath, index) =>
        index === 0 || paths[index - 1]!.localeCompare(relativePath, "en") < 0,
    ) &&
    typedFiles.reduce((sum, file) => sum + file.bytes, 0) ===
      manifest.totalBytes &&
    crypto
      .createHash("sha256")
      .update(JSON.stringify(typedFiles))
      .digest("hex") === manifest.sha256
  );
}

function verifyFile(
  relativePath: string,
  filePath: string,
  identity: { bytes?: number; sha256: string },
) {
  if (
    !fs.existsSync(filePath) ||
    (identity.bytes !== undefined &&
      fs.statSync(filePath).size !== identity.bytes) ||
    sha256File(filePath) !== identity.sha256
  ) {
    throw new Error(`MinerU page-run file changed: ${relativePath}`);
  }
}

function normalizeRelativePath(value: string) {
  return value.replace(/\\/gu, "/");
}

function isRelativePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.split("/").includes("..")
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

function isPositiveIntegerString(value: unknown) {
  return (
    typeof value === "string" &&
    /^\d+$/u.test(value) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) >= 1
  );
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1;
}

function sameStrings(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
