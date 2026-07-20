import crypto from "node:crypto";
import fs from "node:fs";

type PdfTextItem = {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
  hasEOL: boolean;
};

export type PhbPdfPageBaseline = {
  zeroBasedPageIndex: number;
  width: number;
  height: number;
  textItemCount: number;
  textCharacterCount: number;
  textLayerSha256: string;
};

export type PhbPdfBaseline = {
  extractor: {
    name: "pdfjs-dist";
    version: string;
  };
  pageCount: number;
  textLayerPageCount: number;
  encrypted: boolean;
  metadata: {
    title: string | null;
    subject: string | null;
    author: string | null;
    creator: string | null;
    producer: string | null;
  };
  pages: PhbPdfPageBaseline[];
};

export type PhbPdfSourcePage = PhbPdfPageBaseline & {
  items: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontName: string;
    hasEol: boolean;
  }>;
};

export async function inspectPdfTextLayer(
  filePath: string,
  sourcePageIndexes: ReadonlySet<number> = new Set(),
) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(filePath)),
    useSystemFonts: true,
  });
  try {
    const document = await loadingTask.promise;
    const metadata = await document.getMetadata();
    const info = asRecord(metadata.info);
    const pages: PhbPdfPageBaseline[] = [];
    const sourcePages: PhbPdfSourcePage[] = [];
    let textLayerPageCount = 0;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const zeroBasedPageIndex = pageNumber - 1;
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = content.items.filter(isTextItem).map(toStableTextItem);
      const textCharacterCount = items.reduce(
        (total, item) => total + item.text.length,
        0,
      );
      if (textCharacterCount > 0) textLayerPageCount += 1;
      const baseline: PhbPdfPageBaseline = {
        zeroBasedPageIndex,
        width: round(viewport.width),
        height: round(viewport.height),
        textItemCount: items.length,
        textCharacterCount,
        textLayerSha256: sha256(stablePageBytes(items)),
      };
      pages.push(baseline);
      if (sourcePageIndexes.has(zeroBasedPageIndex)) {
        sourcePages.push({ ...baseline, items });
      }
      page.cleanup();
    }

    const baseline: PhbPdfBaseline = {
      extractor: {
        name: "pdfjs-dist",
        version: pdfjs.version,
      },
      pageCount: document.numPages,
      textLayerPageCount,
      encrypted: false,
      metadata: {
        title: nullableMetadata(info.Title),
        subject: nullableMetadata(info.Subject),
        author: nullableMetadata(info.Author),
        creator: nullableMetadata(info.Creator),
        producer: nullableMetadata(info.Producer),
      },
      pages,
    };
    return { baseline, sourcePages };
  } finally {
    await loadingTask.destroy();
  }
}

function isTextItem(value: unknown): value is PdfTextItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "str" in value &&
    typeof (value as { str?: unknown }).str === "string" &&
    "transform" in value &&
    Array.isArray((value as { transform?: unknown }).transform)
  );
}

function toStableTextItem(item: PdfTextItem) {
  return {
    text: item.str,
    x: round(item.transform[4] ?? 0),
    y: round(item.transform[5] ?? 0),
    width: round(item.width),
    height: round(item.height),
    fontName: item.fontName,
    hasEol: item.hasEOL,
  };
}

function stablePageBytes(items: ReturnType<typeof toStableTextItem>[]) {
  return Buffer.from(`${JSON.stringify(items)}\n`, "utf8");
}

function sha256(value: Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function round(value: number) {
  return Math.round(value * 1_000) / 1_000;
}

function nullableMetadata(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}
