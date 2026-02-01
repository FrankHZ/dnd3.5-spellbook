import fs from "node:fs";
import path from "node:path";
import { prisma } from "../../lib/rules-prisma-client";

/**
 * Input: your raw mapping text file (books-zh.txt)
 * Output:
 *  - out/rulebook-label-map.json   (zhLabel -> abbr)
 *  - console diffs vs DB Rulebook.abbr
 */
function normDash(s: string) {
  return s.replace(/[－—–]+/g, "—"); // normalize different dash types
}

function extractParenZh(line: string): string | null {
  // Prefer full-width parentheses: （中文）
  const m = line.match(/（([^（）]+)）/);
  if (m?.[1]) return m[1].trim();

  // Fallback half-width: (中文)
  const m2 = line.match(/\(([^()]+)\)/);
  return m2?.[1]?.trim() ?? null;
}

function extractAbbr(line: string): string | null {
  // abbr is at start: "BoED—— ..."
  const m = normDash(line).match(/^([A-Za-z0-9]+)\s*—/);
  return m?.[1] ?? null;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error(
      "Usage: npx tsx src/tools/zh-parser/check-rulebook-abbr.ts <path-to-books-zh.txt>",
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const labelToAbbr: Record<string, string> = {};
  const txtAbbrs = new Set<string>();

  for (const line of lines) {
    const abbr = extractAbbr(line);
    const zh = extractParenZh(line);

    if (!abbr || !zh) continue;

    txtAbbrs.add(abbr);

    // allow duplicates only if same mapping
    if (labelToAbbr[zh] && labelToAbbr[zh] !== abbr) {
      console.warn(
        `Conflict for zh label "${zh}": ${labelToAbbr[zh]} vs ${abbr}`,
      );
    }
    labelToAbbr[zh] = abbr;
  }

  const outDir = path.resolve("out/zh-parser");
  fs.mkdirSync(outDir, { recursive: true });

  const mapPath = path.join(outDir, "rulebook-label-map.json");
  fs.writeFileSync(mapPath, JSON.stringify(labelToAbbr, null, 2), "utf8");
  console.log(`Wrote: ${mapPath}`);

  // ---- DB check
  const dbRulebooks = await prisma.rulebook.findMany({
    select: { abbr: true, name: true, slug: true },
  });

  const dbAbbrs = new Set(dbRulebooks.map((r) => r.abbr));

  const inTxtNotDb = [...txtAbbrs].filter((a) => !dbAbbrs.has(a)).sort();
  const inDbNotTxt = [...dbAbbrs].filter((a) => !txtAbbrs.has(a)).sort();

  console.log("\n=== Abbr in TXT but NOT in DB ===");
  console.log(inTxtNotDb.length ? inTxtNotDb.join(", ") : "(none)");

  console.log("\n=== Abbr in DB but NOT in TXT ===");
  console.log(inDbNotTxt.length ? inDbNotTxt.join(", ") : "(none)");

  // Helpful: show close candidates for missing ones
  if (inTxtNotDb.length) {
    console.log("\nDetails (TXT-not-DB):");
    for (const a of inTxtNotDb) {
      console.log(`- ${a}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
