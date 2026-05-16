import fs from "node:fs";
import path from "node:path";

export function scanHtmlFiles(dir: string): string[] {
  const files: string[] = [];

  function visit(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const ent of entries) {
      const fullPath = path.join(currentDir, ent.name);
      if (ent.isDirectory()) {
        if (!ent.name.toLowerCase().endsWith(".files")) visit(fullPath);
        continue;
      }

      if (ent.isFile() && /\.(htm|html)$/i.test(ent.name)) {
        files.push(fullPath);
      }
    }
  }

  visit(dir);
  return files.sort();
}

export function relFile(rootDir: string, abs: string): string {
  return path.relative(rootDir, abs).replaceAll("\\", "/");
}
