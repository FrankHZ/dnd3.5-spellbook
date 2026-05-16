import fs from "node:fs";
import path from "node:path";
import { scanHtmlFiles, relFile } from "./scan";
import { segmentLetterPage } from "./segment";
import { matchByEnNameAllBooks } from "./match";
import { sanitizeDescription } from "./sanitize";
import { ParserStats, ZhMatchedRecord } from "./types";
import bookMap from "DATA/chm-mapping/books-zh-chm-mapping.json";

const ZH_BOOK_MAP: Record<string, string> = bookMap;

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      args.set(
        a,
        argv[i + 1] && !argv[i + 1]!.startsWith("--") ? argv[i + 1]! : "true",
      );
    }
  }
  return args;
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function makeStats(): ParserStats {
  return {
    filesScanned: 0,
    segmentsFound: 0,
    segmentsWithHeader: 0,
    matched: 0,
    unmatched: 0,
    unknownBookLabel: 0,
    missingRulebookInDb: 0,
    missingSpellInDb: 0,
    lowConfidence: 0,
    errors: 0,
    byMatchMethod: {},
  };
}

function encodeKeyPart(s: string): string {
  return encodeURIComponent(s.toLowerCase()).replace(/%20/g, "+");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = args.get("--input");
  const outDir = args.get("--outDir") ?? "out/zh-parser";
  const defaultBookAbbr = args.get("--defaultBookAbbr") ?? "PH";

  if (!inputDir) {
    console.error(
      "Usage: npm run -w data-tools zh:parse -- --input <html_root> [--outDir out/zh-parser]",
    );
    process.exit(1);
  }

  const rootDir = path.resolve(inputDir);
  const files = scanHtmlFiles(rootDir);
  fs.mkdirSync(outDir, { recursive: true });

  const stats = makeStats();
  const matchedMap: Map<number, ZhMatchedRecord> = new Map();
  const unmatched: ZhMatchedRecord[] = [];

  for (const abs of files) {
    stats.filesScanned++;
    const file = relFile(rootDir, abs);

    try {
      const html = fs.readFileSync(abs, "utf-8");
      const segments = segmentLetterPage(html);

      stats.segmentsFound += segments.length;

      for (const seg of segments) {
        stats.segmentsWithHeader++;

        const sourceKeyBase = `${file}#${encodeKeyPart(seg.enName)}`;
        const extractMethod = seg.method;

        const matches = await matchByEnNameAllBooks({
          enName: seg.enName,
          bookLabels: seg.bookLabels,
        });

        let segRulebookAbbrs = seg.bookLabels
          .map((label) => ZH_BOOK_MAP[label])
          .filter((abbr) => abbr != undefined);

        if (segRulebookAbbrs.length === 0) {
          segRulebookAbbrs = [defaultBookAbbr];
        }

        const sanitized = sanitizeDescription(seg.segmentHtml);
        const sourceKey = `${sourceKeyBase}@${segRulebookAbbrs.join(",")}`;

        for (const m of matches) {
          const finalConfidence = Math.min(seg.confidence, m.matchConfidence);
          const matchMethod = `${extractMethod}; ${m.matchMethod}`;

          bump(stats.byMatchMethod, matchMethod);
          if (finalConfidence < 0.6) stats.lowConfidence++;

          const rec: ZhMatchedRecord = {
            spellId: m.spellId,
            rulebookId: m.rulebookId,
            rulebookAbbr: m.rulebookAbbr,
            sourceKey,
            file,
            chmRulebookLabels: m.chmRulebookLabels,
            zhName: seg.zhName,
            enName: seg.enName,
            zhDescriptionHtml: sanitized,
            matchMethod,
          };

          if (m.spellId) {
            if (!matchedMap.has(m.spellId)) {
              matchedMap.set(m.spellId, rec);
            } else if (segRulebookAbbrs.includes(m.rulebookAbbr as string)) {
              matchedMap.set(m.spellId, rec);
            }
          } else {
            stats.unmatched++;
            if (m.failReason === "unknownBookLabel") stats.unknownBookLabel++;
            if (m.failReason === "missingRulebookInDb")
              stats.missingRulebookInDb++;
            if (m.failReason === "missingSpellInDb") stats.missingSpellInDb++;
            unmatched.push(rec);
          }
        }
      }
    } catch (e) {
      stats.errors++;
      // Keep going; we’ll inspect error-heavy files later
    }
  }

  stats.matched = matchedMap.size;

  fs.writeFileSync(
    path.join(outDir, "stats.json"),
    JSON.stringify(stats, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(outDir, "matched.json"),
    JSON.stringify([...matchedMap.values()], null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(outDir, "unmatched.json"),
    JSON.stringify(unmatched, null, 2),
    "utf8",
  );
  const candidateMap: Record<string, string> = {};
  unmatched
    .map((item) => item.enName)
    .forEach((name) => (candidateMap[name] = ""));
  fs.writeFileSync(
    path.join(outDir, "candidates.json"),
    JSON.stringify(candidateMap, null, 2),
    "utf8",
  );

  console.log("zh-parser done");
  console.log(stats);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
