import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { repoRoot } from "../shared/env";
import {
  PHB_FULL_MINERU_INPUT_MANIFEST_RELATIVE_PATH,
  assertCanonicalFullPageMappings,
  parseFullMineruInputManifest,
} from "./full-mineru";
import { readPhbFullExtractionManifest } from "./full-manifest";
import { readJson, resolveAbsoluteInside, safeId } from "./pilot-extraction";
import { readAndVerifyPhbSourceManifest, sha256File } from "./source-manifest";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const DEFAULT_EXECUTABLE = "artifacts/mineru/phb35/.venv/Scripts/mineru.exe";
const DEFAULT_CONFIG = "artifacts/mineru/phb35/mineru.json";
const DEFAULT_OUTPUT_ROOT = "artifacts/mineru/phb35/recall-pilot";

type RuntimeProbe = {
  mineruVersion: string;
  pythonVersion: string;
  dependencies: Record<string, string>;
  cudaAvailable: boolean;
  device: string;
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
    model: {
      repository: string;
      revision: string;
    };
    config: {
      relativePath: string;
      sha256: string;
      modelSource: string;
    };
  };
  invocation: {
    executableRelativePath: string;
    executableSha256: string;
    arguments: string[];
    environment: {
      MINERU_TOOLS_CONFIG_JSON: string;
      MINERU_LOG_LEVEL: string;
    };
    options: {
      formula: false;
      table: true;
      imageAnalysis: false;
      startPageIndex: number;
      endPageIndex: number;
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

  const source = readAndVerifyPhbSourceManifest(dataRoot);
  const sourceArtifact = source.artifacts.find(
    (artifact) => artifact.id === input.sourceId,
  );
  if (!sourceArtifact) {
    throw new Error(`Unknown PHB source id: ${input.sourceId}`);
  }
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
  if (inputManifest.fullManifest.sha256 !== sha256File(fullManifestPath)) {
    throw new Error(
      "Full MinerU input does not pin the current full extraction manifest",
    );
  }
  const inputArtifact = inputManifest.artifacts.find(
    (artifact) => artifact.sourceId === input.sourceId,
  );
  if (!inputArtifact || inputArtifact.sourceSha256 !== sourceArtifact.sha256) {
    throw new Error(`Full MinerU input source changed: ${input.sourceId}`);
  }
  const sourceConfig = fullManifest.sources.find(
    (candidate) => candidate.sourceId === input.sourceId,
  );
  if (!sourceConfig) {
    throw new Error(
      `Full extraction manifest has no source: ${input.sourceId}`,
    );
  }
  assertCanonicalFullPageMappings(
    inputArtifact.pages,
    sourceConfig.ranges,
    input.sourceId,
  );
  const mapping = inputArtifact.pages.find(
    (page) => page.sourcePageIndex === input.sourcePageIndex,
  );
  if (!mapping) {
    throw new Error(
      `Full MinerU page mapping not found: ${input.sourceId}[${input.sourcePageIndex}]`,
    );
  }
  const subsetPath = resolveAbsoluteInside(
    dataRoot,
    inputArtifact.relativePath,
  );
  verifyFile(inputArtifact.relativePath, subsetPath, {
    bytes: inputArtifact.bytes,
    sha256: inputArtifact.sha256,
  });

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
  const model = modelIdentity(config.modelsDirVlm);
  const probe = probeRuntime(executablePath);
  if (!probe.cudaAvailable) {
    throw new Error("MinerU VLM page-run requires an available CUDA device");
  }

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

  const argumentsForManifest = buildMineruArguments({
    inputPath: inputArtifact.relativePath,
    outputPath: runRootRelativePath,
    pageIndex: mapping.subsetPageIndex,
  });
  const argumentsForProcess = buildMineruArguments({
    inputPath: subsetPath,
    outputPath: runRoot,
    pageIndex: mapping.subsetPageIndex,
  });
  const environment = {
    ...process.env,
    MINERU_TOOLS_CONFIG_JSON: configPath,
    MINERU_LOG_LEVEL: "INFO",
  };
  const result = spawnSync(executablePath, argumentsForProcess, {
    cwd: repoRoot(),
    encoding: "utf8",
    env: environment,
    maxBuffer: 64 * 1024 * 1024,
  });
  const stdoutPath = path.join(runRoot, "mineru.stdout.log");
  const stderrPath = path.join(runRoot, "mineru.stderr.log");
  fs.writeFileSync(stdoutPath, result.stdout ?? "", "utf8");
  fs.writeFileSync(stderrPath, result.stderr ?? "", "utf8");
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `MinerU page-run failed with exit code ${String(result.status)}; see ${normalizeRelativePath(
        path.relative(dataRoot, stderrPath),
      )}`,
    );
  }

  const documentStem = path.parse(subsetPath).name;
  const contentListPath = path.join(
    runRoot,
    documentStem,
    "vlm",
    `${documentStem}_content_list.json`,
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
      artifactSha256: sourceArtifact.sha256,
      sourcePageIndex: input.sourcePageIndex,
      printedPageNumber: mapping.printedPageNumber ?? null,
    },
    input: {
      manifestRelativePath: normalizeRelativePath(
        path.relative(dataRoot, inputManifestPath),
      ),
      manifestSha256: sha256File(inputManifestPath),
      subsetRelativePath: normalizeRelativePath(inputArtifact.relativePath),
      subsetSha256: inputArtifact.sha256,
      subsetPageIndex: mapping.subsetPageIndex,
    },
    runtime: {
      engine: "MinerU",
      version: probe.mineruVersion,
      pythonVersion: probe.pythonVersion,
      backend: "vlm-engine",
      method: "auto",
      device: probe.device,
      dependencies: probe.dependencies,
      model,
      config: {
        relativePath: configRelativePath,
        sha256: sha256File(configPath),
        modelSource: config.modelSource,
      },
    },
    invocation: {
      executableRelativePath,
      executableSha256: sha256File(executablePath),
      arguments: argumentsForManifest,
      environment: {
        MINERU_TOOLS_CONFIG_JSON: configRelativePath,
        MINERU_LOG_LEVEL: "INFO",
      },
      options: {
        formula: false,
        table: true,
        imageAnalysis: false,
        startPageIndex: mapping.subsetPageIndex,
        endPageIndex: mapping.subsetPageIndex,
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
        path.relative(dataRoot, stdoutPath),
      ),
      stdoutSha256: sha256File(stdoutPath),
      stderrRelativePath: normalizeRelativePath(
        path.relative(dataRoot, stderrPath),
      ),
      stderrSha256: sha256File(stderrPath),
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
    !model ||
    typeof model.repository !== "string" ||
    typeof model.revision !== "string" ||
    !config ||
    !isRelativePath(config.relativePath) ||
    !isSha256(config.sha256) ||
    typeof config.modelSource !== "string" ||
    !invocation ||
    !isRelativePath(invocation.executableRelativePath) ||
    !isSha256(invocation.executableSha256) ||
    !Array.isArray(invocation.arguments) ||
    !invocation.arguments.every((item) => typeof item === "string") ||
    !isRecord(invocation.environment) ||
    typeof invocation.environment.MINERU_TOOLS_CONFIG_JSON !== "string" ||
    invocation.environment.MINERU_LOG_LEVEL !== "INFO" ||
    !options ||
    options.formula !== false ||
    options.table !== true ||
    options.imageAnalysis !== false ||
    !isNonNegativeInteger(options.startPageIndex) ||
    options.endPageIndex !== options.startPageIndex ||
    options.startPageIndex !== input.subsetPageIndex ||
    invocation.environment.MINERU_TOOLS_CONFIG_JSON !== config.relativePath ||
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
  return value as MineruPageRunManifest;
}

export function readAndVerifyMineruPageRunManifest(
  dataRoot: string,
  manifestPath: string,
) {
  const resolvedManifestPath = resolveAbsoluteInside(dataRoot, manifestPath);
  const manifest = parseMineruPageRunManifest(
    readJson(resolvedManifestPath, "MinerU page-run manifest"),
  );
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

function buildMineruArguments(input: {
  inputPath: string;
  outputPath: string;
  pageIndex: number;
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
    String(input.pageIndex),
    "-e",
    String(input.pageIndex),
  ];
}

function probeRuntime(executablePath: string): RuntimeProbe {
  const pythonPath = path.join(path.dirname(executablePath), "python.exe");
  if (!fs.existsSync(pythonPath)) {
    throw new Error(`MinerU Python executable not found: ${pythonPath}`);
  }
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
  });
  if (result.error) throw result.error;
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

function modelIdentity(modelPath: string) {
  const normalized = modelPath.replace(/\\/gu, "/");
  const match = normalized.match(
    /models--([^/]+)--([^/]+)\/snapshots\/([^/]+)$/u,
  );
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error("MinerU VLM model path does not contain a pinned revision");
  }
  return {
    repository: `${match[1]}/${match[2]}`,
    revision: match[3],
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
