import fs from "node:fs";
import path from "node:path";

import { localDataDir } from "./env";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readOptionalLocalJsonRecord<T extends Record<string, unknown>>(
  relativePath: string,
): T {
  const filePath = path.join(localDataDir(), relativePath);
  if (!fs.existsSync(filePath)) return {} as T;

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
    if (!isRecord(parsed)) {
      throw new Error("expected a JSON object");
    }
    return parsed as T;
  } catch (error) {
    throw new Error(
      `Failed to read local JSON ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
