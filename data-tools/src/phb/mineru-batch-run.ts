import fs from "node:fs";
import path from "node:path";

import type { FullMineruPageMapping } from "./full-mineru";
import {
  buildMineruVlmArguments,
  MINERU_PROCESS_TIMEOUT_GRACE_SECONDS,
  mineruVlmContentListPath,
  readMineruFullInputSource,
  resolveMineruVlmRuntime,
  runMineruVlmProcess,
  type MineruPageRunManifest,
} from "./mineru-page-run";
import {
  parseMineruContentList,
  readJson,
  resolveAbsoluteInside,
  safeId,
} from "./pilot-extraction";
import { sha256File } from "./source-manifest";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export const DEFAULT_MINERU_BATCH_OUTPUT_ROOT =
  "artifacts/mineru/phb35/recall-full";
export const DEFAULT_MINERU_BATCH_TASK_TIMEOUT_SECONDS = 14_400;

export type MineruBatchRunManifest = {
  schemaVersion: 1;
  status: "succeeded";
  label: string;
  source: {
    id: string;
    artifactSha256: string;
  };
  selection: {
    sourcePageStart: number | null;
    sourcePageEnd: number | null;
    startSubsetPageIndex: number;
    endSubsetPageIndex: number;
  };
  input: {
    sourceManifestRelativePath: string;
    sourceManifestSha256: string;
    fullManifestRelativePath: string;
    fullManifestSha256: string;
    manifestRelativePath: string;
    manifestSha256: string;
    subsetRelativePath: string;
    subsetSha256: string;
  };
  runtime: MineruPageRunManifest["runtime"];
  invocation: MineruPageRunManifest["invocation"];
  output: {
    runRootRelativePath: string;
    stagingRunRootRelativePath: string;
    contentListRelativePath: string;
    contentListSha256: string;
    contentListBytes: number;
    stdoutRelativePath: string;
    stdoutSha256: string;
    stderrRelativePath: string;
    stderrSha256: string;
  };
  pages: Array<{
    sourcePageIndex: number;
    printedPageNumber: number;
    subsetPageIndex: number;
    candidatePageIndex: number;
    rangeKinds: string[];
  }>;
};

export function runMineruBatch(input: {
  dataRoot: string;
  label: string;
  sourceId: string;
  sourcePageStart?: number;
  sourcePageEnd?: number;
  executablePath?: string;
  configPath?: string;
  outputRoot?: string;
  taskTimeoutSeconds?: number;
}) {
  const dataRoot = path.resolve(input.dataRoot);
  assertBatchLabel(input.label);
  assertSourcePageBounds(input.sourcePageStart, input.sourcePageEnd);
  const taskTimeoutSeconds =
    input.taskTimeoutSeconds ?? DEFAULT_MINERU_BATCH_TASK_TIMEOUT_SECONDS;
  if (!Number.isSafeInteger(taskTimeoutSeconds) || taskTimeoutSeconds < 1) {
    throw new Error("MinerU batch task timeout must be a positive integer");
  }
  const current = readMineruFullInputSource(dataRoot, input.sourceId);
  const selected = selectCanonicalPages(
    current.inputArtifact.pages,
    input.sourcePageStart,
    input.sourcePageEnd,
  );
  const outputRootRelativePath = normalizeRelativePath(
    input.outputRoot ?? DEFAULT_MINERU_BATCH_OUTPUT_ROOT,
  );
  const runRootRelativePath = `${outputRootRelativePath}/${input.label}`;
  const runRoot = resolveAbsoluteInside(dataRoot, runRootRelativePath);
  if (fs.existsSync(runRoot)) {
    throw new Error(
      `MinerU batch output already exists and will not be reused: ${runRootRelativePath}`,
    );
  }
  const stagingRootRelativePath = `${outputRootRelativePath}/.${input.label}.partial-${process.pid}`;
  const stagingRoot = resolveAbsoluteInside(dataRoot, stagingRootRelativePath);
  if (fs.existsSync(stagingRoot)) {
    throw new Error(
      `MinerU batch staging output already exists: ${stagingRootRelativePath}`,
    );
  }

  const vlm = resolveMineruVlmRuntime({
    dataRoot,
    ...(input.executablePath ? { executablePath: input.executablePath } : {}),
    ...(input.configPath ? { configPath: input.configPath } : {}),
  });
  fs.mkdirSync(stagingRoot, { recursive: true });
  try {
    const processResult = runMineruVlmProcess({
      dataRoot,
      vlm,
      inputRelativePath: current.inputArtifact.relativePath,
      inputPath: current.subsetPath,
      outputRootRelativePath: stagingRootRelativePath,
      outputRoot: stagingRoot,
      startPageIndex: selected[0]!.subsetPageIndex,
      endPageIndex: selected.at(-1)!.subsetPageIndex,
      taskResultTimeoutSeconds: taskTimeoutSeconds,
    });
    const stagedContentListPath = mineruVlmContentListPath(
      current.subsetPath,
      stagingRoot,
    );
    if (!fs.existsSync(stagedContentListPath)) {
      throw new Error(
        `MinerU batch content list not found: ${normalizeRelativePath(
          path.relative(dataRoot, stagedContentListPath),
        )}`,
      );
    }
    assertMineruBatchContentList(
      readJson(stagedContentListPath, "MinerU batch content list"),
      selected.length,
    );

    const contentListRelativePath = `${runRootRelativePath}/${normalizeRelativePath(
      path.relative(stagingRoot, stagedContentListPath),
    )}`;
    const stdoutRelativePath = `${runRootRelativePath}/${normalizeRelativePath(
      path.relative(stagingRoot, processResult.stdoutPath),
    )}`;
    const stderrRelativePath = `${runRootRelativePath}/${normalizeRelativePath(
      path.relative(stagingRoot, processResult.stderrPath),
    )}`;
    const manifest: MineruBatchRunManifest = {
      schemaVersion: 1,
      status: "succeeded",
      label: input.label,
      source: {
        id: input.sourceId,
        artifactSha256: current.sourceArtifact.sha256,
      },
      selection: {
        sourcePageStart: input.sourcePageStart ?? null,
        sourcePageEnd: input.sourcePageEnd ?? null,
        startSubsetPageIndex: selected[0]!.subsetPageIndex,
        endSubsetPageIndex: selected.at(-1)!.subsetPageIndex,
      },
      input: {
        sourceManifestRelativePath: current.sourceManifestRelativePath,
        sourceManifestSha256: current.sourceManifestSha256,
        fullManifestRelativePath: current.fullManifestRelativePath,
        fullManifestSha256: current.fullManifestSha256,
        manifestRelativePath: current.inputManifestRelativePath,
        manifestSha256: current.inputManifestSha256,
        subsetRelativePath: current.inputArtifact.relativePath,
        subsetSha256: current.inputArtifact.sha256,
      },
      runtime: vlm.runtime,
      invocation: {
        executableRelativePath: vlm.executableRelativePath,
        executableSha256: sha256File(vlm.executablePath),
        arguments: processResult.argumentsForManifest,
        environment: {
          MINERU_TOOLS_CONFIG_JSON: vlm.configRelativePath,
          MINERU_LOG_LEVEL: "INFO",
          MINERU_TASK_RESULT_TIMEOUT_SECONDS: String(taskTimeoutSeconds),
        },
        options: {
          formula: false,
          table: true,
          imageAnalysis: false,
          startPageIndex: selected[0]!.subsetPageIndex,
          endPageIndex: selected.at(-1)!.subsetPageIndex,
          processTimeoutSeconds: processResult.processTimeoutSeconds,
        },
      },
      output: {
        runRootRelativePath,
        stagingRunRootRelativePath: stagingRootRelativePath,
        contentListRelativePath,
        contentListSha256: sha256File(stagedContentListPath),
        contentListBytes: fs.statSync(stagedContentListPath).size,
        stdoutRelativePath,
        stdoutSha256: sha256File(processResult.stdoutPath),
        stderrRelativePath,
        stderrSha256: sha256File(processResult.stderrPath),
      },
      pages: selected.map((page, candidatePageIndex) => ({
        sourcePageIndex: page.sourcePageIndex,
        printedPageNumber: page.printedPageNumber,
        subsetPageIndex: page.subsetPageIndex,
        candidatePageIndex,
        rangeKinds: [...page.rangeKinds],
      })),
    };
    parseMineruBatchRunManifest(manifest);
    const stagedManifestPath = path.join(stagingRoot, "run-manifest.json");
    fs.writeFileSync(
      stagedManifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    fs.renameSync(stagingRoot, runRoot);
    return { manifest, manifestPath: path.join(runRoot, "run-manifest.json") };
  } catch (error) {
    if (fs.existsSync(stagingRoot)) {
      try {
        fs.writeFileSync(
          path.join(stagingRoot, "run-failure.json"),
          `${JSON.stringify(
            {
              schemaVersion: 1,
              status: "failed",
              label: input.label,
              sourceId: input.sourceId,
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2,
          )}\n`,
          "utf8",
        );
      } catch {
        // Preserve the original MinerU or completeness error.
      }
    }
    throw error;
  }
}

export function parseMineruBatchRunManifest(
  value: unknown,
): MineruBatchRunManifest {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.status !== "succeeded"
  ) {
    throw new Error("MinerU batch manifest is invalid");
  }
  const source = isRecord(value.source) ? value.source : null;
  const selection = isRecord(value.selection) ? value.selection : null;
  const input = isRecord(value.input) ? value.input : null;
  const output = isRecord(value.output) ? value.output : null;
  if (
    typeof value.label !== "string" ||
    safeId(value.label) !== value.label ||
    !source ||
    typeof source.id !== "string" ||
    source.id.length === 0 ||
    !isSha256(source.artifactSha256) ||
    !selection ||
    !isNullableNonNegativeInteger(selection.sourcePageStart) ||
    !isNullableNonNegativeInteger(selection.sourcePageEnd) ||
    !isNonNegativeInteger(selection.startSubsetPageIndex) ||
    !isNonNegativeInteger(selection.endSubsetPageIndex) ||
    selection.endSubsetPageIndex < selection.startSubsetPageIndex ||
    !input ||
    !isBatchInput(input) ||
    !isBatchRuntime(value.runtime) ||
    !isBatchInvocation(value.invocation) ||
    !output ||
    !isBatchOutput(output) ||
    !Array.isArray(value.pages) ||
    value.pages.length === 0
  ) {
    throw new Error("MinerU batch manifest is invalid");
  }
  const invocation = value.invocation as MineruPageRunManifest["invocation"];
  if (
    invocation.options.startPageIndex !== selection.startSubsetPageIndex ||
    invocation.options.endPageIndex !== selection.endSubsetPageIndex ||
    invocation.environment.MINERU_TOOLS_CONFIG_JSON !==
      (value.runtime as MineruPageRunManifest["runtime"]).config.relativePath ||
    !isPositiveIntegerString(
      invocation.environment.MINERU_TASK_RESULT_TIMEOUT_SECONDS,
    ) ||
    invocation.options.processTimeoutSeconds !==
      Number(invocation.environment.MINERU_TASK_RESULT_TIMEOUT_SECONDS) +
        MINERU_PROCESS_TIMEOUT_GRACE_SECONDS
  ) {
    throw new Error("MinerU batch manifest is invalid");
  }
  assertManifestPages(value.pages, selection);
  const manifest = value as MineruBatchRunManifest;
  assertStagingPublicationPaths(manifest);
  assertBatchInvocationProvenance(manifest);
  return manifest;
}

export function readAndVerifyMineruBatchRunManifest(
  dataRootInput: string,
  manifestPath: string,
) {
  const dataRoot = path.resolve(dataRootInput);
  const resolvedManifestPath = resolveAbsoluteInside(dataRoot, manifestPath);
  const manifest = parseMineruBatchRunManifest(
    readJson(resolvedManifestPath, "MinerU batch manifest"),
  );
  const current = readMineruFullInputSource(dataRoot, manifest.source.id);
  if (
    manifest.source.artifactSha256 !== current.sourceArtifact.sha256 ||
    manifest.input.sourceManifestRelativePath !==
      current.sourceManifestRelativePath ||
    manifest.input.sourceManifestSha256 !== current.sourceManifestSha256 ||
    manifest.input.fullManifestRelativePath !==
      current.fullManifestRelativePath ||
    manifest.input.fullManifestSha256 !== current.fullManifestSha256 ||
    manifest.input.manifestRelativePath !== current.inputManifestRelativePath ||
    manifest.input.manifestSha256 !== current.inputManifestSha256 ||
    manifest.input.subsetRelativePath !== current.inputArtifact.relativePath ||
    manifest.input.subsetSha256 !== current.inputArtifact.sha256
  ) {
    throw new Error("MinerU batch input changed since completion");
  }
  const expectedPages = selectCanonicalPages(
    current.inputArtifact.pages,
    manifest.selection.sourcePageStart ?? undefined,
    manifest.selection.sourcePageEnd ?? undefined,
  );
  assertManifestMatchesCanonicalPages(manifest, expectedPages);
  verifyMineruBatchRuntime(dataRoot, manifest);
  if (
    !sameStrings(
      manifest.invocation.arguments,
      buildMineruVlmArguments({
        inputPath: current.inputArtifact.relativePath,
        outputPath: manifest.output.stagingRunRootRelativePath,
        startPageIndex: manifest.selection.startSubsetPageIndex,
        endPageIndex: manifest.selection.endSubsetPageIndex,
      }),
    )
  ) {
    throw new Error(
      "MinerU batch invocation arguments changed since completion",
    );
  }
  verifyOutputPath(
    manifest.output.runRootRelativePath,
    manifest.output.contentListRelativePath,
  );
  verifyOutputPath(
    manifest.output.runRootRelativePath,
    manifest.output.stdoutRelativePath,
  );
  verifyOutputPath(
    manifest.output.runRootRelativePath,
    manifest.output.stderrRelativePath,
  );
  verifyFile(dataRoot, manifest.output.contentListRelativePath, {
    bytes: manifest.output.contentListBytes,
    sha256: manifest.output.contentListSha256,
  });
  verifyFile(dataRoot, manifest.output.stdoutRelativePath, {
    sha256: manifest.output.stdoutSha256,
  });
  verifyFile(dataRoot, manifest.output.stderrRelativePath, {
    sha256: manifest.output.stderrSha256,
  });
  assertMineruBatchContentList(
    readJson(
      resolveAbsoluteInside(dataRoot, manifest.output.contentListRelativePath),
      "MinerU batch content list",
    ),
    manifest.pages.length,
  );
  return {
    manifest,
    manifestPath: resolvedManifestPath,
    manifestSha256: sha256File(resolvedManifestPath),
  };
}

export function verifyMineruBatchRuntime(
  dataRoot: string,
  manifest: MineruBatchRunManifest,
  runtimeResolver: typeof resolveMineruVlmRuntime = resolveMineruVlmRuntime,
) {
  verifyFile(dataRoot, manifest.invocation.executableRelativePath, {
    sha256: manifest.invocation.executableSha256,
  });
  verifyFile(dataRoot, manifest.runtime.config.relativePath, {
    sha256: manifest.runtime.config.sha256,
  });
  verifyFile(dataRoot, manifest.runtime.pythonExecutable!.relativePath, {
    sha256: manifest.runtime.pythonExecutable!.sha256,
  });
  const currentRuntime = runtimeResolver({
    dataRoot,
    executablePath: manifest.invocation.executableRelativePath,
    configPath: manifest.runtime.config.relativePath,
  });
  if (
    JSON.stringify(manifest.runtime) !== JSON.stringify(currentRuntime.runtime)
  ) {
    throw new Error("MinerU batch runtime changed since completion");
  }
}

export function assertMineruBatchContentList(
  value: unknown,
  pageCount: number,
) {
  if (!Number.isInteger(pageCount) || pageCount <= 0 || !Array.isArray(value)) {
    throw new Error("MinerU batch content list is invalid");
  }
  parseMineruContentList(value, pageCount);
  const seen = new Set<number>();
  let previous = -1;
  for (const row of value) {
    if (!isRecord(row) || !isNonNegativeInteger(row.page_idx)) {
      throw new Error("MinerU batch content list is invalid");
    }
    if (row.page_idx >= pageCount || row.page_idx < previous) {
      throw new Error("MinerU batch content list is partial or reordered");
    }
    previous = row.page_idx;
    seen.add(row.page_idx);
  }
  if (value.length === 0 || seen.size !== pageCount) {
    throw new Error("MinerU batch content list is partial or reordered");
  }
  for (
    let candidatePageIndex = 0;
    candidatePageIndex < pageCount;
    candidatePageIndex += 1
  ) {
    if (!seen.has(candidatePageIndex)) {
      throw new Error("MinerU batch content list is partial or reordered");
    }
  }
}

function selectCanonicalPages(
  pages: FullMineruPageMapping[],
  sourcePageStart: number | undefined,
  sourcePageEnd: number | undefined,
) {
  const selected = pages.filter(
    (page) =>
      (sourcePageStart === undefined ||
        page.sourcePageIndex >= sourcePageStart) &&
      (sourcePageEnd === undefined || page.sourcePageIndex <= sourcePageEnd),
  );
  if (selected.length === 0)
    throw new Error("MinerU batch has no selected pages");
  if (
    selected.some(
      (page, index) =>
        page.subsetPageIndex !== selected[0]!.subsetPageIndex + index,
    )
  ) {
    throw new Error(
      "MinerU batch selected pages are not a contiguous subset range",
    );
  }
  return selected;
}

function assertManifestMatchesCanonicalPages(
  manifest: MineruBatchRunManifest,
  expected: FullMineruPageMapping[],
) {
  if (
    expected.length !== manifest.pages.length ||
    expected[0]!.subsetPageIndex !== manifest.selection.startSubsetPageIndex ||
    expected.at(-1)!.subsetPageIndex !==
      manifest.selection.endSubsetPageIndex ||
    expected.some((page, index) => {
      const actual = manifest.pages[index];
      return (
        !actual ||
        actual.sourcePageIndex !== page.sourcePageIndex ||
        actual.printedPageNumber !== page.printedPageNumber ||
        actual.subsetPageIndex !== page.subsetPageIndex ||
        actual.candidatePageIndex !== index ||
        !sameStrings(actual.rangeKinds, page.rangeKinds)
      );
    })
  ) {
    throw new Error(
      "MinerU batch canonical page mappings changed since completion",
    );
  }
}

function assertManifestPages(
  value: unknown[],
  selection: Record<string, unknown>,
) {
  const start = selection.startSubsetPageIndex;
  const end = selection.endSubsetPageIndex;
  if (!isNonNegativeInteger(start) || !isNonNegativeInteger(end)) {
    throw new Error("MinerU batch manifest is invalid");
  }
  if (value.length !== end - start + 1) {
    throw new Error("MinerU batch manifest is invalid");
  }
  let previousSourcePage = -1;
  for (const [index, page] of value.entries()) {
    if (
      !isRecord(page) ||
      !isNonNegativeInteger(page.sourcePageIndex) ||
      page.sourcePageIndex <= previousSourcePage ||
      !Number.isInteger(page.printedPageNumber) ||
      page.subsetPageIndex !== start + index ||
      page.candidatePageIndex !== index ||
      !isStringArray(page.rangeKinds) ||
      page.rangeKinds.length === 0 ||
      new Set(page.rangeKinds).size !== page.rangeKinds.length
    ) {
      throw new Error("MinerU batch manifest is invalid");
    }
    previousSourcePage = page.sourcePageIndex;
  }
}

function isBatchInput(value: Record<string, unknown>) {
  return (
    isRelativePath(value.sourceManifestRelativePath) &&
    isSha256(value.sourceManifestSha256) &&
    isRelativePath(value.fullManifestRelativePath) &&
    isSha256(value.fullManifestSha256) &&
    isRelativePath(value.manifestRelativePath) &&
    isSha256(value.manifestSha256) &&
    isRelativePath(value.subsetRelativePath) &&
    isSha256(value.subsetSha256)
  );
}

function isBatchRuntime(
  value: unknown,
): value is MineruPageRunManifest["runtime"] {
  const runtime = isRecord(value) ? value : null;
  const model = runtime && isRecord(runtime.model) ? runtime.model : null;
  const config = runtime && isRecord(runtime.config) ? runtime.config : null;
  const pythonExecutable =
    runtime && isRecord(runtime.pythonExecutable)
      ? runtime.pythonExecutable
      : null;
  return !!(
    runtime &&
    runtime.engine === "MinerU" &&
    typeof runtime.version === "string" &&
    typeof runtime.pythonVersion === "string" &&
    runtime.backend === "vlm-engine" &&
    runtime.method === "auto" &&
    typeof runtime.device === "string" &&
    isStringRecord(runtime.dependencies) &&
    pythonExecutable &&
    isRelativePath(pythonExecutable.relativePath) &&
    isSha256(pythonExecutable.sha256) &&
    model &&
    typeof model.repository === "string" &&
    typeof model.revision === "string" &&
    config &&
    isRelativePath(config.relativePath) &&
    isSha256(config.sha256) &&
    typeof config.modelSource === "string"
  );
}

function isBatchInvocation(
  value: unknown,
): value is MineruPageRunManifest["invocation"] {
  const invocation = isRecord(value) ? value : null;
  const options =
    invocation && isRecord(invocation.options) ? invocation.options : null;
  return !!(
    invocation &&
    isRelativePath(invocation.executableRelativePath) &&
    isSha256(invocation.executableSha256) &&
    Array.isArray(invocation.arguments) &&
    invocation.arguments.every((item) => typeof item === "string") &&
    isRecord(invocation.environment) &&
    typeof invocation.environment.MINERU_TOOLS_CONFIG_JSON === "string" &&
    invocation.environment.MINERU_LOG_LEVEL === "INFO" &&
    isPositiveIntegerString(
      invocation.environment.MINERU_TASK_RESULT_TIMEOUT_SECONDS,
    ) &&
    options &&
    options.formula === false &&
    options.table === true &&
    options.imageAnalysis === false &&
    isNonNegativeInteger(options.startPageIndex) &&
    isNonNegativeInteger(options.endPageIndex) &&
    options.endPageIndex >= options.startPageIndex &&
    isPositiveSafeInteger(options.processTimeoutSeconds)
  );
}

function isBatchOutput(value: Record<string, unknown>) {
  return (
    isRelativePath(value.runRootRelativePath) &&
    isRelativePath(value.stagingRunRootRelativePath) &&
    isRelativePath(value.contentListRelativePath) &&
    isSha256(value.contentListSha256) &&
    isNonNegativeInteger(value.contentListBytes) &&
    isRelativePath(value.stdoutRelativePath) &&
    isSha256(value.stdoutSha256) &&
    isRelativePath(value.stderrRelativePath) &&
    isSha256(value.stderrSha256)
  );
}

function verifyFile(
  dataRoot: string,
  relativePathValue: string,
  identity: { bytes?: number; sha256: string },
) {
  const filePath = resolveAbsoluteInside(dataRoot, relativePathValue);
  if (
    !fs.existsSync(filePath) ||
    (identity.bytes !== undefined &&
      fs.statSync(filePath).size !== identity.bytes) ||
    sha256File(filePath) !== identity.sha256
  ) {
    throw new Error(`MinerU batch file changed: ${relativePathValue}`);
  }
}

function verifyOutputPath(
  runRootRelativePath: string,
  outputRelativePath: string,
) {
  if (!outputRelativePath.startsWith(`${runRootRelativePath}/`)) {
    throw new Error("MinerU batch output path escapes its run root");
  }
}

function assertStagingPublicationPaths(manifest: MineruBatchRunManifest) {
  const runRoot = manifest.output.runRootRelativePath;
  const separator = runRoot.lastIndexOf("/");
  const outputRoot = separator < 0 ? "" : runRoot.slice(0, separator);
  const expectedFinalName =
    separator < 0 ? runRoot : runRoot.slice(separator + 1);
  const stagingPrefix = `${outputRoot ? `${outputRoot}/` : ""}.${expectedFinalName}.partial-`;
  if (
    manifest.label !== expectedFinalName ||
    !manifest.output.stagingRunRootRelativePath.startsWith(stagingPrefix) ||
    !/^\d+$/u.test(
      manifest.output.stagingRunRootRelativePath.slice(stagingPrefix.length),
    )
  ) {
    throw new Error(
      "MinerU batch staging path does not match its atomic publication path",
    );
  }
}

function assertBatchInvocationProvenance(manifest: MineruBatchRunManifest) {
  const expectedPythonPath = path.posix.join(
    path.posix.dirname(manifest.invocation.executableRelativePath),
    "python.exe",
  );
  if (
    manifest.runtime.pythonExecutable?.relativePath !== expectedPythonPath ||
    manifest.invocation.environment.MINERU_TOOLS_CONFIG_JSON !==
      manifest.runtime.config.relativePath ||
    !sameStrings(
      manifest.invocation.arguments,
      buildMineruVlmArguments({
        inputPath: manifest.input.subsetRelativePath,
        outputPath: manifest.output.stagingRunRootRelativePath,
        startPageIndex: manifest.selection.startSubsetPageIndex,
        endPageIndex: manifest.selection.endSubsetPageIndex,
      }),
    )
  ) {
    throw new Error(
      "MinerU batch invocation does not match the executed staging command",
    );
  }
}

function assertBatchLabel(label: string) {
  if (label.length === 0 || safeId(label) !== label) {
    throw new Error(
      "MinerU batch label must already be a lowercase filesystem-safe id",
    );
  }
}

function assertSourcePageBounds(
  start: number | undefined,
  end: number | undefined,
) {
  if (start !== undefined && !isNonNegativeInteger(start)) {
    throw new Error("MinerU batch source page start must be non-negative");
  }
  if (end !== undefined && !isNonNegativeInteger(end)) {
    throw new Error("MinerU batch source page end must be non-negative");
  }
  if (start !== undefined && end !== undefined && end < start) {
    throw new Error("MinerU batch source page range is reversed");
  }
}

function normalizeRelativePath(value: string) {
  return value.replace(/\\/gu, "/");
}

function sameStrings(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
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

function isNullableNonNegativeInteger(value: unknown) {
  return value === null || isNonNegativeInteger(value);
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

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
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
