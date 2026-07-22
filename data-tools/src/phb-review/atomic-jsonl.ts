import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type AtomicJsonlWriter = (
  filePath: string,
  rows: readonly unknown[],
) => Promise<void>;

export const writeJsonlAtomically: AtomicJsonlWriter = async (
  filePath,
  rows,
) => {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  const contents =
    rows.length === 0
      ? ""
      : `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  let handle: fs.promises.FileHandle | null = null;
  try {
    handle = await fs.promises.open(temporaryPath, "wx", 0o600);
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.promises.rename(temporaryPath, filePath);
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    await fs.promises.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
};
