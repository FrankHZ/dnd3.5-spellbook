import { contentPrisma } from "~/lib/content-prisma-client";
import fs from "node:fs";
import path from "node:path";
import { load } from "cheerio";

type ZhMatchedRecord = {
  spellId: number | null;
  rulebookId: number | null;
  sourceKey: string;
  zhName: string;
  enName: string;
  zhDescriptionHtml: string;
};

const LANG = "zh";
const VARIANT = "chm";
const DEFAULT_MATCHED_PATH = path.resolve(
  __dirname,
  "../../data-tools/out/zh-parser/matched.json",
);

function htmlToText(html: string): string {
  if (!html) return "";

  const $ = load(html);

  // Remove non-content nodes just in case
  $("script, style, noscript").remove();

  const lines: string[] = [];

  // CHM content tends to be paragraph-based
  const ps = $("p");
  if (ps.length > 0) {
    ps.each((_, el) => {
      const t = $(el)
        .text()
        .replace(/\u00A0/g, " ") // nbsp
        .replace(/\u3000/g, " ") // full-width space
        .replace(/[ \t]+/g, " ")
        .trim();

      if (t) lines.push(t);
    });

    // Paragraphs separated by a blank line
    return lines.join("\n\n").trim();
  }

  // Fallback: no <p> tags, just take body text
  return $("body")
    .text()
    .replace(/\u00A0/g, " ")
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function main() {
  const matchedPath = process.argv[2] ?? DEFAULT_MATCHED_PATH;
  const raw = fs.readFileSync(matchedPath, "utf-8");
  const matched = JSON.parse(raw) as ZhMatchedRecord[];

  const spellIdSet = new Set<number>();
  matched.forEach((m) => {
    if (!spellIdSet.has(m.spellId as number)) {
      spellIdSet.add(m.spellId as number);
    } else {
      console.log([m.spellId, m.enName, m.zhName]);
    }
  });

  const transactions = [
    contentPrisma.i18nSpellText.deleteMany({ where: { lang: "zh-chm" } }),
    contentPrisma.i18nSpellText.deleteMany({ where: { lang: LANG } }),
    contentPrisma.i18nSpellText.createMany({
      data: matched.map((m) => ({
        spellId: m.spellId as number,
        rulebookId: m.rulebookId as number,
        lang: LANG,
        variant: VARIANT,

        name: m.zhName,
        descriptionHtml: m.zhDescriptionHtml,
        descriptionText: htmlToText(m.zhDescriptionHtml),

        sourceKey: m.sourceKey,
      })),
    }),
  ];

  await contentPrisma.$transaction(transactions);
}

main().finally(async () => await contentPrisma.$disconnect());
