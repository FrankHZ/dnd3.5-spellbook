import * as cheerio from "cheerio";
import { isSpellHeaderP, parseSpellHeader } from "./header";
import { Element } from "domhandler";
import { normText } from "./utils";

function textOfNode($: cheerio.CheerioAPI, node: Element): string {
  return $(node)
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nodeHtml($: cheerio.CheerioAPI, node: Element): string {
  return $.html(node);
}

export function segmentLetterPage(html: string): Array<{
  headerText: string;
  zhName: string;
  enName: string;
  bookLabels: string[];
  segmentHtml: string;
  method: string;
  confidence: number;
}> {
  const $ = cheerio.load(html);

  const contentRoot = $("#content");

  const blocks = contentRoot.children().toArray(); // preserves <p> + <table> etc

  const pToBlockIdx = new Map<Element, number>();
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i]!.tagName === "p") {
      pToBlockIdx.set(blocks[i] as unknown as Element, i);
    }
  }

  // We segment over <p> blocks inside the container.
  const ps = contentRoot
    .find("p")
    .filter((_, el) => $(el).parents("table").length === 0)
    .toArray();

  const headers: Array<{ pIdx: number; blockIdx: number; headerText: string }> =
    [];
  for (let i = 0; i < ps.length; i++) {
    if (isSpellHeaderP($, ps[i]!)) {
      const blockIdx = pToBlockIdx.get(ps[i] as unknown as Element);
      if (blockIdx === undefined) continue; // header not a top-level <p>, skip
      headers.push({
        pIdx: i,
        blockIdx,
        headerText: normText($(ps[i]!).text()),
      });
    }
  }

  const segments: Array<{
    headerText: string;
    zhName: string;
    enName: string;
    bookLabels: string[];
    segmentHtml: string;
    method: string;
    confidence: number;
  }> = [];

  for (let h = 0; h < headers.length; h++) {
    const startBlock = headers[h]!.blockIdx;
    const endBlock =
      h + 1 < headers.length ? headers[h + 1]!.blockIdx : blocks.length;

    const chunk: string[] = [];
    for (let i = startBlock + 1; i < endBlock; i++) {
      chunk.push(nodeHtml($, blocks[i]!));
    }

    const parsed = parseSpellHeader(headers[h]!.headerText)!;

    // header node is still a <p>
    const headerP = ps[headers[h]!.pIdx]!;
    const headerText = textOfNode($, headerP);

    let conf = 0.7;
    if (chunk.join("").length > 400) conf += 0.2;
    const headerHasBold = $(headerP).find("b,strong").length > 0;
    if (headerHasBold) conf += 0.1;

    const method = [
      `seg:topLevelBlocks`,
      `header:${headerHasBold ? "bold" : "plain"}+parenSplit`,
    ].join(";");

    segments.push({
      headerText,
      zhName: parsed.zhName,
      enName: parsed.enName!,
      bookLabels: parsed.bookLabels,
      segmentHtml: chunk.join("\n"),
      method,
      confidence: Math.max(0, Math.min(1, conf)),
    });
  }

  return segments;
}
