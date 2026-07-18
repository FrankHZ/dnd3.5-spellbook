import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertStrictDescendant,
  resolveSourceIndexWriteTarget,
  stageAndActivateSourceIndex,
} from "./en-summaries";

type TestCase = {
  name: string;
  run: () => void;
};

function withTempRoot(run: (tempRoot: string) => void) {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "spellbook-en-summaries-write-safety-"),
  );
  assertStrictDescendant(os.tmpdir(), tempRoot);
  try {
    run(tempRoot);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

const completeOptions = {
  sourceOffset: 0,
  sourceLimit: null,
  outputName: "source-index",
};

const tests: TestCase[] = [
  {
    name: "source-index targets reject root equality and destructive names",
    run: () => {
      withTempRoot((tempRoot) => {
        assert.throws(
          () => assertStrictDescendant(tempRoot, tempRoot),
          /must be a strict descendant/,
        );

        for (const outputName of [
          ".",
          "..",
          ".hidden",
          "../escape",
          "nested/escape",
          "candidates.json",
          "NUL",
          "COM1.json",
          "source-index.",
          " source-index",
        ]) {
          assert.throws(
            () =>
              resolveSourceIndexWriteTarget(tempRoot, {
                ...completeOptions,
                outputName,
              }),
            /Unsafe --output-name|must be a non-empty basename/,
            outputName,
          );
        }

        const fileTarget = path.join(tempRoot, "existing-file");
        fs.writeFileSync(fileTarget, "preserve me", "utf8");
        assert.throws(
          () =>
            resolveSourceIndexWriteTarget(tempRoot, {
              ...completeOptions,
              outputName: "existing-file",
            }),
          /Refusing to replace non-directory/,
        );
        assert.equal(fs.readFileSync(fileTarget, "utf8"), "preserve me");
      });
    },
  },
  {
    name: "partial source crawls require a non-canonical output target",
    run: () => {
      withTempRoot((tempRoot) => {
        assert.throws(
          () =>
            resolveSourceIndexWriteTarget(tempRoot, {
              ...completeOptions,
              sourceOffset: 1,
            }),
          /Partial source crawls cannot target canonical source-index/,
        );
        assert.throws(
          () =>
            resolveSourceIndexWriteTarget(tempRoot, {
              ...completeOptions,
              sourceLimit: 10,
            }),
          /Partial source crawls cannot target canonical source-index/,
        );
        assert.throws(
          () =>
            resolveSourceIndexWriteTarget(tempRoot, {
              sourceOffset: 1,
              sourceLimit: null,
              outputName: "SOURCE-INDEX",
            }),
          /Partial source crawls cannot target canonical source-index/,
        );

        const partialTarget = resolveSourceIndexWriteTarget(tempRoot, {
          sourceOffset: 10,
          sourceLimit: 10,
          outputName: "source-index-00010-00020",
        });
        assert.equal(partialTarget.isCanonical, false);
        assert.equal(partialTarget.isPartial, true);
      });
    },
  },
  {
    name: "failed staging preserves the complete canonical source index",
    run: () => {
      withTempRoot((tempRoot) => {
        const target = resolveSourceIndexWriteTarget(tempRoot, completeOptions);
        fs.mkdirSync(target.dataDir, { recursive: true });
        fs.writeFileSync(
          path.join(target.dataDir, "old.txt"),
          "complete",
          "utf8",
        );

        assert.throws(
          () =>
            stageAndActivateSourceIndex(target, (stagingDir) => {
              assert.notEqual(stagingDir, target.dataDir);
              assert.equal(
                fs.readFileSync(path.join(target.dataDir, "old.txt"), "utf8"),
                "complete",
              );
              fs.writeFileSync(
                path.join(stagingDir, "partial.txt"),
                "partial",
                "utf8",
              );
              throw new Error("fixture staging failure");
            }),
          /fixture staging failure/,
        );

        assert.equal(
          fs.readFileSync(path.join(target.dataDir, "old.txt"), "utf8"),
          "complete",
        );
        assert.equal(
          fs.existsSync(path.join(target.dataDir, "partial.txt")),
          false,
        );
        assert.deepEqual(fs.readdirSync(tempRoot), ["source-index"]);
      });
    },
  },
  {
    name: "complete canonical source index activates from a sibling staging tree",
    run: () => {
      withTempRoot((tempRoot) => {
        const target = resolveSourceIndexWriteTarget(tempRoot, completeOptions);
        fs.mkdirSync(target.dataDir, { recursive: true });
        fs.writeFileSync(path.join(target.dataDir, "old.txt"), "old", "utf8");

        const activatedDir = stageAndActivateSourceIndex(
          target,
          (stagingDir) => {
            assert.notEqual(stagingDir, target.dataDir);
            assert.match(
              path.basename(stagingDir),
              /^\.source-index\.staging-/,
            );
            assert.equal(
              fs.existsSync(path.join(target.dataDir, "old.txt")),
              true,
            );
            fs.mkdirSync(path.join(stagingDir, "books"), { recursive: true });
            fs.writeFileSync(
              path.join(stagingDir, "manifest.json"),
              "{}\n",
              "utf8",
            );
          },
        );

        assert.equal(activatedDir, target.dataDir);
        assert.equal(
          fs.existsSync(path.join(target.dataDir, "old.txt")),
          false,
        );
        assert.equal(
          fs.readFileSync(path.join(target.dataDir, "manifest.json"), "utf8"),
          "{}\n",
        );
        assert.deepEqual(fs.readdirSync(tempRoot), ["source-index"]);
      });
    },
  },
];

for (const test of tests) {
  test.run();
  console.log(`ok - ${test.name}`);
}

console.log(`English summary write-safety tests OK (${tests.length})`);
