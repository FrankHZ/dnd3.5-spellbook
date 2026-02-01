import fs from "node:fs";
import path from "node:path";

export function scanHtmlFiles(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((ent) => ent.isFile() && /\.(htm|html)$/i.test(ent.name))
    .map((ent) => path.join(dir, ent.name))
    .sort();
}

export function relFile(rootDir: string, abs: string): string {
  return path.relative(rootDir, abs).replaceAll("\\", "/");
}
