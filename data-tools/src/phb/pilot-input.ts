import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

import type { PhbPilotManifest } from "./pilot-manifest";
import type { PhbSourceManifest } from "./source-manifest";
import { resolveInside } from "./source-manifest";

const FIXED_PDF_DATE = new Date("2000-01-01T00:00:00.000Z");

export type PhbPilotPageMapping = {
  subsetPageIndex: number;
  sourcePageIndex: number;
  printedPageNumber: number | null;
  caseIds: string[];
  kinds: Array<"description" | "class-list" | "errata">;
};

export type PhbPilotInputArtifact = {
  sourceId: string;
  sourceSha256: string;
  relativePath: string;
  bytes: number;
  sha256: string;
  pages: PhbPilotPageMapping[];
};

export function collectPilotPageMappings(pilot: PhbPilotManifest) {
  const bySource = new Map<
    string,
    Map<
      number,
      {
        printedPageNumbers: Set<number>;
        caseIds: Set<string>;
        kinds: Set<"description" | "class-list" | "errata">;
      }
    >
  >();
  for (const pilotCase of pilot.cases) {
    for (const location of pilotCase.locations) {
      let pages = bySource.get(location.sourceId);
      if (!pages) {
        pages = new Map();
        bySource.set(location.sourceId, pages);
      }
      let page = pages.get(location.zeroBasedPageIndex);
      if (!page) {
        page = {
          printedPageNumbers: new Set(),
          caseIds: new Set(),
          kinds: new Set(),
        };
        pages.set(location.zeroBasedPageIndex, page);
      }
      if (location.printedPageNumber !== null) {
        page.printedPageNumbers.add(location.printedPageNumber);
      }
      page.caseIds.add(pilotCase.id);
      page.kinds.add(location.kind);
    }
  }

  return new Map(
    Array.from(bySource, ([sourceId, pages]) => [
      sourceId,
      Array.from(pages, ([sourcePageIndex, page]) => {
        const printedPageNumbers = Array.from(page.printedPageNumbers).sort(
          (left, right) => left - right,
        );
        const caseIds = Array.from(page.caseIds).sort();
        if (printedPageNumbers.length > 1) {
          throw new Error(
            `${sourceId} source page ${sourcePageIndex} has conflicting printed pages ${printedPageNumbers.join(", ")} across cases ${caseIds.join(", ")}`,
          );
        }
        return {
          sourcePageIndex,
          printedPageNumbers,
          caseIds,
          kinds: Array.from(page.kinds).sort(),
        };
      }).sort((left, right) => left.sourcePageIndex - right.sourcePageIndex),
    ]),
  );
}

export async function buildPilotInputPdfs(input: {
  dataRoot: string;
  outputRoot: string;
  sourceManifest: PhbSourceManifest;
  pilotManifest: PhbPilotManifest;
}) {
  const mappings = collectPilotPageMappings(input.pilotManifest);
  const artifacts: PhbPilotInputArtifact[] = [];
  fs.mkdirSync(input.outputRoot, { recursive: true });

  for (const [sourceId, pages] of mappings) {
    const source = input.sourceManifest.artifacts.find(
      (artifact) => artifact.id === sourceId,
    );
    if (!source)
      throw new Error(`Pilot references unknown source artifact: ${sourceId}`);
    const invalidPage = pages.find(
      (page) => page.sourcePageIndex >= source.pdf.pageCount,
    );
    if (invalidPage) {
      throw new Error(
        `${sourceId} pilot page ${invalidPage.sourcePageIndex} exceeds the ${source.pdf.pageCount}-page source`,
      );
    }

    const sourcePath = resolveInside(input.dataRoot, source.relativePath);
    const sourcePdf = await PDFDocument.load(fs.readFileSync(sourcePath), {
      updateMetadata: false,
    });
    const subsetPdf = await PDFDocument.create();
    subsetPdf.setTitle(`PHB 3.5 pilot subset: ${sourceId}`);
    subsetPdf.setAuthor("dnd3.5-spellbook data pipeline");
    subsetPdf.setCreator("data-tools phb pilot input builder");
    subsetPdf.setProducer("pdf-lib 1.17.1");
    subsetPdf.setCreationDate(FIXED_PDF_DATE);
    subsetPdf.setModificationDate(FIXED_PDF_DATE);
    const copied = await subsetPdf.copyPages(
      sourcePdf,
      pages.map((page) => page.sourcePageIndex),
    );
    copied.forEach((page) => subsetPdf.addPage(page));
    const pdfBytes = await subsetPdf.save({
      addDefaultPage: false,
      objectsPerTick: Number.POSITIVE_INFINITY,
      useObjectStreams: false,
      updateFieldAppearances: false,
    });
    const fileName = `${safeId(sourceId)}.pilot.pdf`;
    const outputPath = path.join(input.outputRoot, fileName);
    fs.writeFileSync(outputPath, pdfBytes);
    artifacts.push({
      sourceId,
      sourceSha256: source.sha256,
      relativePath: path
        .relative(input.dataRoot, outputPath)
        .replace(/\\/g, "/"),
      bytes: pdfBytes.length,
      sha256: sha256(pdfBytes),
      pages: pages.map((page, subsetPageIndex) => ({
        subsetPageIndex,
        sourcePageIndex: page.sourcePageIndex,
        printedPageNumber: page.printedPageNumbers[0] ?? null,
        caseIds: page.caseIds,
        kinds: page.kinds,
      })),
    });
  }
  return artifacts.sort((left, right) =>
    left.sourceId.localeCompare(right.sourceId),
  );
}

function safeId(value: string) {
  return value.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function sha256(value: Uint8Array) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
