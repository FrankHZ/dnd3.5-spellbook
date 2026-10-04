import { execFileSync } from "node:child_process";
import { localDataDir } from "../shared/env";

// #503 source/Chinese handoff accepted by main-gate; never read private HEAD.
export const scIntroductionRevision = "3148d36fb51fd353b097ad911d2e04b33c9c706c";
const readerPath = "dice-qa/books/86/issue-503/introduction.zh-CN.html";

export function readScIntroduction(dataRoot = localDataDir()) {
  return execFileSync("git", ["-C", dataRoot, "show", `${scIntroductionRevision}:${readerPath}`],
    { encoding: "utf8", maxBuffer: 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}
