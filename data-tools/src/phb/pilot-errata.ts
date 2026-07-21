import type { PhbErrataInventoryRow } from "./errata-inventory";

type PdfTextItem = {
  text: string;
  fontName: string;
  hasEol: boolean;
  x?: number;
  y?: number;
};

export type PilotErrataPage = {
  sourceId: string;
  printedPageNumber: number | null;
  pdfjs: { items: PdfTextItem[] };
};

export type OverlaySpellEntity = {
  caseId: string;
  printedName: string;
  school?: string;
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
      kind: "delete-sentences";
      sentencePrefix: string;
      count: number;
    }
  | {
      kind: "insert-before-previous-sentence-end";
      followingSentencePrefix: string;
      insertion: string;
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
  effectiveSchool: string | null;
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
      effectiveSchool: applied.school,
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
  const selectedPages = inventoryRow.errataPages.map((pageNumber) => {
    const page = pages.find(
      (candidate) =>
        candidate.sourceId === "phb35-errata-2006-02-17" &&
        candidate.printedPageNumber === pageNumber,
    );
    if (!page) {
      throw new Error(
        `Errata page ${pageNumber} is missing for ${inventoryRow.entryId}`,
      );
    }
    return page;
  });
  const headingKey = normalizeKey(heading);
  const sectionItems: PdfTextItem[] = [];
  let started = false;
  let finished = false;
  for (const page of selectedPages) {
    for (const item of page.pdfjs.items) {
      if (isErrataPageBoilerplate(item)) continue;
      const itemKey = normalizeKey(item.text);
      if (!started) {
        if (isErrataHeading(item) && itemKey === headingKey) started = true;
        continue;
      }
      if (isErrataHeading(item) && itemKey === headingKey) continue;
      if (isErrataHeading(item) && headings.has(itemKey)) {
        finished = true;
        break;
      }
      sectionItems.push(item);
    }
    if (finished) break;
  }
  if (!started) throw new Error(`Errata heading not found: ${heading}`);
  return normalizeExtractedText(
    sectionItems.map((item) => item.text).join(" "),
  );
}

export function parseErrataOperations(
  inventoryRow: PhbErrataInventoryRow,
  instruction: string,
): PilotErrataOperation[] {
  if (inventoryRow.operationHints) {
    return inventoryRow.operationHints.map((hint) => ({ ...hint }));
  }
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
  if (inventoryRow.overlayPolicy === "field-replacement") {
    const match = /Change\s+.+?\s+from\s+(.+?)\s+to\s+(.+?)\.?$/iu.exec(
      instruction,
    );
    if (!match?.[1] || !match[2]) {
      throw new Error(
        `Field replacement instruction is unsupported: ${inventoryRow.entryId}`,
      );
    }
    return [
      {
        kind: "replace-text",
        target: match[1].trim(),
        replacement: match[2].replace(/\.$/u, "").trim(),
      },
    ];
  }
  const boldfaceReplacement =
    /Changes to the spell[’']s description are noted in boldface type:\s*/iu.exec(
      instruction,
    );
  if (boldfaceReplacement) {
    return [
      {
        kind: "replace-full-body",
        replacement: instruction
          .slice(boldfaceReplacement.index + boldfaceReplacement[0].length)
          .trim(),
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
    const sentenceOperations = parseSentenceOperations(instruction);
    if (sentenceOperations.length > 0) return sentenceOperations;
  }
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

function parseSentenceOperations(instruction: string): PilotErrataOperation[] {
  const quote = '[“"]([^”"]+)[”"]';
  const deleteMatch = new RegExp(
    `Delete the (one|two|three) sentences beginning with ${quote}`,
    "iu",
  ).exec(instruction);
  if (!deleteMatch?.[1] || !deleteMatch[2]) return [];
  const count = { one: 1, two: 2, three: 3 }[
    deleteMatch[1].toLocaleLowerCase("en-US") as "one" | "two" | "three"
  ];
  const sentencePrefix = cleanQuoted(deleteMatch[2]).replace(/[.!?]$/u, "");
  const operations: PilotErrataOperation[] = [];
  const quotedInsertMatch = new RegExp(
    `Insert ${quote} just before the end of the first sentence of this paragraph`,
    "iu",
  ).exec(instruction);
  const followingTextInsertMatch =
    /Insert the following text just before the end of the first sentence of this paragraph:\s*(\([^)]*\))/iu.exec(
      instruction,
    );
  const insertion = cleanQuoted(
    quotedInsertMatch?.[1] ?? followingTextInsertMatch?.[1],
  );
  if (insertion) {
    operations.push({
      kind: "insert-before-previous-sentence-end",
      followingSentencePrefix: sentencePrefix,
      insertion,
    });
  }
  operations.push({ kind: "delete-sentences", sentencePrefix, count });
  return operations;
}

function applyErrataOperations(
  spell: OverlaySpellEntity,
  operations: PilotErrataOperation[],
) {
  const fields = {
    ...spell.fields,
    ...(spell.school ? { __school: spell.school } : {}),
  };
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
    if (operation.kind === "insert-before-previous-sentence-end") {
      const result = insertBeforePreviousSentenceEnd(bodyText, operation);
      bodyText = result.bodyText;
      results.push({ kind: operation.kind, status: result.status });
      continue;
    }
    if (operation.kind === "delete-sentences") {
      const result = deleteSentences(bodyText, operation);
      bodyText = result.bodyText;
      results.push({ kind: operation.kind, status: result.status });
      continue;
    }
    const applied = applyTextOperation(fields, bodyText, operation);
    Object.assign(fields, applied.fields);
    bodyText = applied.bodyText;
    results.push({ kind: operation.kind, status: applied.status });
  }
  const school = fields.__school ?? spell.school ?? null;
  delete fields.__school;
  return { fields, school, bodyText, results };
}

function insertBeforePreviousSentenceEnd(
  bodyText: string,
  operation: Extract<
    PilotErrataOperation,
    { kind: "insert-before-previous-sentence-end" }
  >,
) {
  if (bodyText.includes(operation.insertion)) {
    return { bodyText, status: "already-present" as const };
  }
  const followingIndex = bodyText.indexOf(operation.followingSentencePrefix);
  if (followingIndex < 0) {
    return { bodyText, status: "target-not-found" as const };
  }
  const before = bodyText.slice(0, followingIndex).trimEnd();
  const sentenceEnd = Math.max(
    before.lastIndexOf("."),
    before.lastIndexOf("!"),
    before.lastIndexOf("?"),
  );
  if (sentenceEnd < 0) {
    return { bodyText, status: "target-not-found" as const };
  }
  return {
    bodyText: `${bodyText.slice(0, sentenceEnd)} ${operation.insertion}${bodyText.slice(sentenceEnd)}`,
    status: "applied" as const,
  };
}

function deleteSentences(
  bodyText: string,
  operation: Extract<PilotErrataOperation, { kind: "delete-sentences" }>,
) {
  const start = bodyText.indexOf(operation.sentencePrefix);
  if (start < 0) return { bodyText, status: "already-present" as const };
  let end = start;
  for (let index = 0; index < operation.count; index += 1) {
    const boundary = /[.!?](?=\s|$)/u.exec(bodyText.slice(end));
    if (!boundary || boundary.index === undefined) {
      return { bodyText, status: "target-not-found" as const };
    }
    end += boundary.index + boundary[0].length;
  }
  return {
    bodyText:
      `${bodyText.slice(0, start)}${bodyText.slice(end).replace(/^\s+/u, "")}`.replace(
        /\s+/gu,
        " ",
      ),
    status: "applied" as const,
  };
}

function applyTextOperation(
  fields: Record<string, string>,
  bodyText: string,
  operation: Exclude<
    PilotErrataOperation,
    | { kind: "replace-full-body" | "replace-first-sentence" }
    | { kind: "delete-sentences" | "insert-before-previous-sentence-end" }
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
    effectiveSchool: spell.school ?? null,
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

function isErrataPageBoilerplate(item: PdfTextItem) {
  return (
    item.fontName.endsWith("_f1") ||
    item.fontName.endsWith("_f2") ||
    /^©2006 Wizards of the Coast\b/u.test(item.text.trim())
  );
}
