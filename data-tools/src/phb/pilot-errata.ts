import type { PhbErrataInventoryRow } from "./errata-inventory";

type PdfTextItem = {
  text: string;
  fontName: string;
  hasEol: boolean;
};

export type PilotErrataPage = {
  sourceId: string;
  printedPageNumber: number | null;
  pdfjs: { items: PdfTextItem[] };
};

export type OverlaySpellEntity = {
  caseId: string;
  printedName: string;
  fields: Record<string, string>;
  bodyText: string;
};

export type PilotErrataOperation =
  | {
      kind: "replace-first-sentence";
      replacement: string;
    }
  | {
      kind: "replace-text";
      target: string;
      replacement: string;
      occurrence?: "first" | "last";
    }
  | {
      kind: "insert-before";
      target: string;
      insertion: string;
      occurrence?: "first" | "last";
      separator?: " " | ", ";
    }
  | {
      kind: "delete-text";
      target: string;
      occurrence?: "first" | "last";
    }
  | {
      kind: "replace-full-body";
      replacement: string;
    };

export type PilotErrataOverlayRow = {
  schemaVersion: 1;
  caseId: string;
  printedName: string;
  entryId: string | null;
  disposition: PhbErrataInventoryRow["disposition"] | "not-listed";
  overlayPolicy: PhbErrataInventoryRow["overlayPolicy"];
  errataPages: number[];
  sourceInstruction: string | null;
  operations: PilotErrataOperation[];
  operationResults: Array<{
    kind: PilotErrataOperation["kind"];
    status: "applied" | "already-present" | "target-not-found";
  }>;
  effectiveFields: Record<string, string>;
  effectiveBodyText: string;
  reviewRequired: boolean;
  reviewFlags: string[];
};

export function buildPilotErrataOverlays(
  spells: OverlaySpellEntity[],
  inventory: PhbErrataInventoryRow[],
  pages: PilotErrataPage[],
): PilotErrataOverlayRow[] {
  const errataByName = new Map(
    inventory.map((row) => [normalizeKey(row.printedName), row]),
  );
  return spells.map((spell) => {
    const inventoryRow = errataByName.get(normalizeKey(spell.printedName));
    if (!inventoryRow) return noErrataOverlay(spell);
    const sourceInstruction = extractErrataSection(
      inventoryRow,
      pages,
      inventory,
    );
    const operations = parseErrataOperations(inventoryRow, sourceInstruction);
    const applied = applyErrataOperations(spell, operations);
    const reviewFlags: string[] = [];
    if (inventoryRow.reviewRequired)
      reviewFlags.push("inventory-review-required");
    if (applied.results.some((row) => row.status === "target-not-found")) {
      reviewFlags.push("errata-target-not-found");
    }
    if (
      inventoryRow.disposition === "already-incorporated" &&
      applied.results.some((row) => row.status === "applied")
    ) {
      reviewFlags.push("already-incorporated-overlay-mutated-source");
    }
    return {
      schemaVersion: 1,
      caseId: spell.caseId,
      printedName: spell.printedName,
      entryId: inventoryRow.entryId,
      disposition: inventoryRow.disposition,
      overlayPolicy: inventoryRow.overlayPolicy,
      errataPages: inventoryRow.errataPages,
      sourceInstruction,
      operations,
      operationResults: applied.results,
      effectiveFields: applied.fields,
      effectiveBodyText: applied.bodyText,
      reviewRequired: inventoryRow.reviewRequired || reviewFlags.length > 0,
      reviewFlags,
    };
  });
}

export function extractErrataSection(
  inventoryRow: PhbErrataInventoryRow,
  pages: PilotErrataPage[],
  inventory: PhbErrataInventoryRow[],
) {
  const headings = new Set(
    inventory.map((row) => normalizeKey(row.printedName)),
  );
  for (const row of inventory) {
    if (row.errataAnchor) headings.add(normalizeKey(row.errataAnchor));
  }
  const heading = inventoryRow.errataAnchor ?? inventoryRow.printedName;
  const page = pages.find(
    (candidate) =>
      candidate.sourceId === "phb35-errata-2006-02-17" &&
      candidate.printedPageNumber === inventoryRow.errataPages[0],
  );
  if (!page) {
    throw new Error(
      `Errata page ${inventoryRow.errataPages[0]} is missing for ${inventoryRow.entryId}`,
    );
  }
  const start = page.pdfjs.items.findIndex(
    (item) =>
      isErrataHeading(item) &&
      normalizeKey(item.text) === normalizeKey(heading),
  );
  if (start < 0) {
    throw new Error(`Errata heading not found: ${heading}`);
  }
  let end = page.pdfjs.items.length;
  for (let index = start + 1; index < page.pdfjs.items.length; index += 1) {
    const item = page.pdfjs.items[index];
    if (!item) continue;
    if (
      isErrataHeading(item) &&
      headings.has(normalizeKey(item.text)) &&
      normalizeKey(item.text) !== normalizeKey(heading)
    ) {
      end = index;
      break;
    }
  }
  return normalizeExtractedText(
    page.pdfjs.items
      .slice(start + 1, end)
      .map((item) => item.text)
      .join(" "),
  );
}

export function parseErrataOperations(
  inventoryRow: PhbErrataInventoryRow,
  instruction: string,
): PilotErrataOperation[] {
  if (inventoryRow.overlayPolicy === "none") {
    return parseQuotedOperations(instruction);
  }
  if (inventoryRow.overlayPolicy === "full-body-replacement") {
    const marker =
      /Replace the text of this spell with the following text\.?\s*/i;
    const match = marker.exec(instruction);
    if (!match) {
      throw new Error(
        `Full-body replacement marker missing: ${inventoryRow.entryId}`,
      );
    }
    return [
      {
        kind: "replace-full-body",
        replacement: instruction.slice(match.index + match[0].length).trim(),
      },
    ];
  }
  if (/Replace the first sentence of the spell/i.test(instruction)) {
    const marker = /following text:\s*/i;
    const match = marker.exec(instruction);
    if (!match) {
      throw new Error(
        `First-sentence replacement marker missing: ${inventoryRow.entryId}`,
      );
    }
    return [
      {
        kind: "replace-first-sentence",
        replacement: instruction.slice(match.index + match[0].length).trim(),
      },
    ];
  }
  const operations = withOperationHints(
    parseQuotedOperations(instruction),
    inventoryRow,
  );
  if (operations.length === 0) {
    throw new Error(
      `No supported errata operations found: ${inventoryRow.entryId}`,
    );
  }
  return operations;
}

function withOperationHints(
  operations: PilotErrataOperation[],
  inventoryRow: PhbErrataInventoryRow,
) {
  return operations.map((operation) => {
    if (
      operation.kind === "replace-full-body" ||
      operation.kind === "replace-first-sentence"
    ) {
      return operation;
    }
    const occurrence = inventoryRow.textTargetOccurrence
      ? { occurrence: inventoryRow.textTargetOccurrence }
      : {};
    if (operation.kind !== "insert-before") {
      return { ...operation, ...occurrence };
    }
    const separator =
      inventoryRow.insertBeforeSeparator === "comma"
        ? ({ separator: ", " } as const)
        : inventoryRow.insertBeforeSeparator === "space"
          ? ({ separator: " " } as const)
          : {};
    return {
      ...operation,
      ...occurrence,
      ...separator,
    };
  });
}

function parseQuotedOperations(instruction: string): PilotErrataOperation[] {
  const operations: PilotErrataOperation[] = [];
  const quote = '[“"]([^”"]+)[”"]';
  for (const match of instruction.matchAll(
    new RegExp(`(?:Change|change) ${quote} to ${quote}`, "g"),
  )) {
    const target = cleanQuoted(match[1]);
    const replacement = cleanQuoted(match[2]);
    if (!target || !replacement) continue;
    operations.push({
      kind: "replace-text",
      target,
      replacement,
    });
  }
  for (const match of instruction.matchAll(
    new RegExp(`(?:Insert|insert) ${quote} in front of ${quote}`, "g"),
  )) {
    const insertion = cleanQuoted(match[1]);
    const target = cleanQuoted(match[2]);
    if (!insertion || !target) continue;
    operations.push({
      kind: "insert-before",
      insertion,
      target,
    });
  }
  for (const match of instruction.matchAll(
    new RegExp(`(?:Delete|delete) ${quote}`, "g"),
  )) {
    const target = cleanQuoted(match[1]);
    if (target) operations.push({ kind: "delete-text", target });
  }
  return operations;
}

function applyErrataOperations(
  spell: OverlaySpellEntity,
  operations: PilotErrataOperation[],
) {
  const fields = { ...spell.fields };
  let bodyText = spell.bodyText;
  const results: PilotErrataOverlayRow["operationResults"] = [];
  for (const operation of operations) {
    if (operation.kind === "replace-full-body") {
      const status = equivalentText(bodyText, operation.replacement)
        ? "already-present"
        : "applied";
      bodyText = operation.replacement;
      results.push({ kind: operation.kind, status });
      continue;
    }
    if (operation.kind === "replace-first-sentence") {
      if (bodyText.startsWith(operation.replacement)) {
        results.push({ kind: operation.kind, status: "already-present" });
        continue;
      }
      const boundary = bodyText.search(/(?<=[.!?])\s+(?=[A-Z])/);
      if (boundary < 0) {
        results.push({ kind: operation.kind, status: "target-not-found" });
        continue;
      }
      bodyText = `${operation.replacement} ${bodyText.slice(boundary).trim()}`;
      results.push({ kind: operation.kind, status: "applied" });
      continue;
    }
    const applied = applyTextOperation(fields, bodyText, operation);
    Object.assign(fields, applied.fields);
    bodyText = applied.bodyText;
    results.push({ kind: operation.kind, status: applied.status });
  }
  return { fields, bodyText, results };
}

function applyTextOperation(
  fields: Record<string, string>,
  bodyText: string,
  operation: Exclude<
    PilotErrataOperation,
    { kind: "replace-full-body" | "replace-first-sentence" }
  >,
) {
  const target = normalizeTypography(operation.target);
  const replacement =
    operation.kind === "delete-text"
      ? ""
      : operation.kind === "insert-before"
        ? `${operation.insertion}${operation.separator ?? " "}${operation.target}`
        : operation.replacement;
  const normalizedReplacement = normalizeTypography(replacement);
  const targetExists = [bodyText, ...Object.values(fields)].some((value) =>
    normalizeTypography(value).includes(target),
  );
  if (operation.kind === "delete-text" && !targetExists) {
    return { fields, bodyText, status: "already-present" as const };
  }
  if (
    operation.kind !== "delete-text" &&
    containsReplacement(bodyText, normalizedReplacement)
  ) {
    return { fields, bodyText, status: "already-present" as const };
  }
  if (operation.kind !== "delete-text") {
    for (const value of Object.values(fields)) {
      if (containsReplacement(value, normalizedReplacement)) {
        return { fields, bodyText, status: "already-present" as const };
      }
    }
  }
  const bodyResult = replaceNormalized(
    bodyText,
    target,
    replacement,
    operation.occurrence,
  );
  if (bodyResult !== null) {
    return { fields, bodyText: bodyResult, status: "applied" as const };
  }
  for (const [key, value] of Object.entries(fields)) {
    const fieldResult = replaceNormalized(
      value,
      target,
      replacement,
      operation.occurrence,
    );
    if (fieldResult !== null) {
      return {
        fields: { ...fields, [key]: fieldResult },
        bodyText,
        status: "applied" as const,
      };
    }
  }
  return { fields, bodyText, status: "target-not-found" as const };
}

function containsReplacement(value: string, replacement: string) {
  const normalized = normalizeTypography(value);
  return (
    normalized.includes(replacement) ||
    normalized.includes(replacement.replace(/[.;:]$/, ""))
  );
}

function replaceNormalized(
  value: string,
  target: string,
  replacement: string,
  occurrence: "first" | "last" = "first",
) {
  const normalized = normalizeTypography(value);
  const index =
    occurrence === "last"
      ? normalized.lastIndexOf(target)
      : normalized.indexOf(target);
  if (index < 0) return null;
  return `${normalized.slice(0, index)}${replacement}${normalized.slice(index + target.length)}`;
}

function noErrataOverlay(spell: OverlaySpellEntity): PilotErrataOverlayRow {
  return {
    schemaVersion: 1,
    caseId: spell.caseId,
    printedName: spell.printedName,
    entryId: null,
    disposition: "not-listed",
    overlayPolicy: "none",
    errataPages: [],
    sourceInstruction: null,
    operations: [],
    operationResults: [],
    effectiveFields: { ...spell.fields },
    effectiveBodyText: spell.bodyText,
    reviewRequired: false,
    reviewFlags: [],
  };
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/([A-Za-z])-\s+([a-z])/g, "$1$2")
    .replace(/([“\"])\s+/g, "$1")
    .replace(/\s+([”\"])/g, "$1")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function cleanQuoted(value: string | undefined) {
  return value?.trim().replace(/\.$/, "") ?? "";
}

function normalizeTypography(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function equivalentText(left: string, right: string) {
  return normalizeTypography(left) === normalizeTypography(right);
}

function normalizeKey(value: string) {
  return normalizeTypography(value).toLocaleLowerCase("en-US");
}

function isErrataHeading(item: PdfTextItem) {
  return item.fontName.endsWith("_f7") && item.text.trim().length > 0;
}
