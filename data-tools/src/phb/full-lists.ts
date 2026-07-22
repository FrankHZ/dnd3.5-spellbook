import {
  isSpellHeadingAt,
  uniqueSourcePages,
  type PilotSourcePage,
  type ReadingLine,
} from "./pilot-entities";
import type { FullPageRow } from "./full-extraction";
import { reconstructMineruReadingLines } from "./full-mineru";

const CLASS_OWNERS = new Map([
  ["BARD", "Bard"],
  ["CLERIC", "Cleric"],
  ["DRUID", "Druid"],
  ["PALADIN", "Paladin"],
  ["RANGER", "Ranger"],
  ["SORCERER/WIZARD", "Sorcerer/Wizard"],
]);

const ALIGNMENT_EXPANSIONS = new Map<string, string[]>([
  [
    "Detect Chaos/Evil/Good/Law",
    ["Detect Chaos", "Detect Evil", "Detect Good", "Detect Law"],
  ],
  [
    "Protection from Chaos/Evil/Good/Law",
    [
      "Protection from Chaos",
      "Protection from Evil",
      "Protection from Good",
      "Protection from Law",
    ],
  ],
  [
    "Magic Circle against Chaos/Evil/Good/Law",
    [
      "Magic Circle against Chaos",
      "Magic Circle against Evil",
      "Magic Circle against Good",
      "Magic Circle against Law",
    ],
  ],
  [
    "Dispel Chaos/Evil/Good/Law",
    ["Dispel Chaos", "Dispel Evil", "Dispel Good", "Dispel Law"],
  ],
  [
    "Protection from Chaos/Evil",
    ["Protection from Chaos", "Protection from Evil"],
  ],
]);

export type FullListOwnerKind = "class" | "domain";
export type FullListExpansionKind =
  "direct" | "alignment-fan-out" | "printed-alias";

export type FullListSourceStart = {
  sourceId: string;
  sourcePageIndex: number;
  printedPageNumber: number | null;
  x: number;
  y: number;
};

export type FullListPrintedRow = {
  schemaVersion: 1;
  rowId: string;
  entityType: "spell-list-row";
  ownerKind: FullListOwnerKind;
  owner: string;
  level: number;
  printedName: string;
  rawPrintedName: string;
  summaryText: string;
  rawText: string;
  footnotes: string[];
  sourceStart: FullListSourceStart;
  sourcePages: PilotSourcePage[];
  reviewFlags: string[];
};

export type FullListOccurrence = {
  schemaVersion: 1;
  occurrenceId: string;
  entityType: "spell-list-occurrence";
  printedRowId: string;
  ownerKind: FullListOwnerKind;
  owner: string;
  level: number;
  printedName: string;
  sourcePrintedName: string;
  expansionKind: FullListExpansionKind;
  summaryText: string;
  rawText: string;
  sourceStart: FullListSourceStart;
  sourcePages: PilotSourcePage[];
  reviewFlags: string[];
};

export type FullListParserIssueKind =
  | "non-class-list-page"
  | "orphan-list-text"
  | "incomplete-list-row"
  | "invalid-domain-row"
  | "domain-heading-mismatch"
  | "missing-summary"
  | "duplicate-row-id"
  | "mineru-projection-failed";

export type FullListParserIssue = {
  schemaVersion: 1;
  issueId: string;
  kind: FullListParserIssueKind;
  message: string;
  ownerKind: FullListOwnerKind | null;
  owner: string | null;
  level: number | null;
  rawText: string;
  sourceStart: FullListSourceStart;
};

export type FullListFootnote = {
  schemaVersion: 1;
  footnoteId: string;
  entityType: "spell-list-footnote";
  ownerKind: FullListOwnerKind;
  owner: string;
  marker: string;
  text: string;
  rawText: string;
  sourceStart: FullListSourceStart;
  sourcePages: PilotSourcePage[];
};

export type FullListExtraction = {
  printedRows: FullListPrintedRow[];
  occurrences: FullListOccurrence[];
  footnotes: FullListFootnote[];
  issues: FullListParserIssue[];
  counts: {
    printedRows: number;
    occurrences: number;
    footnotes: number;
    uniqueSpellNames: number;
    classAssociations: number;
    domainAssociations: number;
  };
};

type SectionContext =
  | { ownerKind: "class"; owner: string; level: number }
  | { ownerKind: "domain"; owner: string };

type MutablePrintedRow = {
  section: SectionContext;
  level: number;
  rawPrintedName: string;
  printedName: string;
  nameLines: ReadingLine[];
  summaryParts: string[];
  rawLines: ReadingLine[];
  footnotes: string[];
};

export function extractFullSpellLists(
  pages: FullPageRow[],
): FullListExtraction {
  const printedRows: FullListPrintedRow[] = [];
  const occurrences: FullListOccurrence[] = [];
  const footnotes: FullListFootnote[] = [];
  const issues: FullListParserIssue[] = [];
  const rowIds = new Set<string>();
  let issueSequence = 0;
  let section: SectionContext | null = null;
  let domainHeading: string | null = null;
  let activeRow: MutablePrintedRow | null = null;
  let pendingLines: ReadingLine[] = [];

  const addIssue = (
    kind: FullListParserIssueKind,
    message: string,
    lines: ReadingLine[],
    context: SectionContext | null = section,
  ) => {
    const first = lines[0];
    if (!first) return;
    issueSequence += 1;
    issues.push({
      schemaVersion: 1,
      issueId: `list-issue:${String(issueSequence).padStart(4, "0")}:${kind}`,
      kind,
      message,
      ownerKind: context?.ownerKind ?? null,
      owner: context?.owner ?? null,
      level: context?.ownerKind === "class" ? context.level : null,
      rawText: lines.map((line) => line.text).join("\n"),
      sourceStart: sourceStart(first),
    });
  };

  const commitPendingAsSummary = () => {
    if (pendingLines.length === 0) return;
    if (activeRow) {
      activeRow.summaryParts.push(...pendingLines.map((line) => line.text));
      activeRow.rawLines.push(...pendingLines);
    } else {
      addIssue(
        "orphan-list-text",
        "List text was not attached to a source-bearing spell row",
        pendingLines,
      );
    }
    pendingLines = [];
  };

  const finalizeActiveRow = () => {
    if (!activeRow) return;
    const summaryText = joinWrappedText(activeRow.summaryParts);
    const sourcePages = uniqueSourcePages(
      activeRow.rawLines.map((line) => line.page),
    );
    const first = activeRow.nameLines[0] ?? activeRow.rawLines[0]!;
    const flags: string[] = [];
    if (activeRow.nameLines.length > 1) flags.push("wrapped-name");
    if (activeRow.summaryParts.length > 1) flags.push("wrapped-summary");
    if (sourcePages.length > 1) flags.push("cross-page");
    if (activeRow.footnotes.length > 0) flags.push("list-footnote");
    const rowId = [
      "list-row",
      activeRow.section.ownerKind,
      slug(activeRow.section.owner),
      activeRow.level,
      slug(first.page.sourceId),
      first.page.sourcePageIndex,
      coordinate(first.x),
      coordinate(first.y),
    ].join(":");
    const row: FullListPrintedRow = {
      schemaVersion: 1,
      rowId,
      entityType: "spell-list-row",
      ownerKind: activeRow.section.ownerKind,
      owner: activeRow.section.owner,
      level: activeRow.level,
      printedName: activeRow.printedName,
      rawPrintedName: activeRow.rawPrintedName,
      summaryText,
      rawText: activeRow.rawLines.map((line) => line.text).join("\n"),
      footnotes: [...activeRow.footnotes],
      sourceStart: sourceStart(first),
      sourcePages,
      reviewFlags: flags,
    };
    if (rowIds.has(rowId)) {
      addIssue(
        "duplicate-row-id",
        `A list row already occupies deterministic id ${rowId}`,
        activeRow.rawLines,
        activeRow.section,
      );
    } else {
      rowIds.add(rowId);
      printedRows.push(row);
      for (const expansion of expandPrintedName(row.printedName)) {
        const occurrenceFlags = [...row.reviewFlags];
        if (expansion.kind !== "direct") {
          occurrenceFlags.push(`name-${expansion.kind}`);
        }
        occurrences.push({
          schemaVersion: 1,
          occurrenceId: `${rowId}:${slug(expansion.printedName)}`,
          entityType: "spell-list-occurrence",
          printedRowId: rowId,
          ownerKind: row.ownerKind,
          owner: row.owner,
          level: row.level,
          printedName: expansion.printedName,
          sourcePrintedName: row.printedName,
          expansionKind: expansion.kind,
          summaryText: row.summaryText,
          rawText: row.rawText,
          sourceStart: row.sourceStart,
          sourcePages: row.sourcePages,
          reviewFlags: occurrenceFlags,
        });
      }
    }
    if (summaryText.length === 0) {
      addIssue(
        "missing-summary",
        `Spell-list row ${activeRow.printedName} has no summary text`,
        activeRow.rawLines,
        activeRow.section,
      );
    }
    activeRow = null;
  };

  const flushSection = () => {
    commitPendingAsSummary();
    finalizeActiveRow();
  };

  const sortedPages = [...pages].sort(
    (left, right) =>
      left.sourceId.localeCompare(right.sourceId) ||
      left.sourcePageIndex - right.sourcePageIndex,
  );

  for (const page of sortedPages) {
    const projection = reconstructMineruReadingLines(page);
    for (const projectionIssue of projection.issues) {
      issueSequence += 1;
      issues.push({
        schemaVersion: 1,
        issueId: `list-issue:${String(issueSequence).padStart(4, "0")}:mineru-projection-failed`,
        kind: "mineru-projection-failed",
        message: projectionIssue.message,
        ownerKind: null,
        owner: null,
        level: null,
        rawText: `MinerU block ${projectionIssue.blockIndex}`,
        sourceStart: {
          sourceId: page.sourceId,
          sourcePageIndex: page.sourcePageIndex,
          printedPageNumber: page.printedPageNumber,
          x: 0,
          y: 0,
        },
      });
    }
    if (!page.rangeKinds.includes("class-list")) {
      const firstLine = projection.lines[0];
      if (firstLine) {
        addIssue(
          "non-class-list-page",
          "Page was supplied to the list parser without class-list range provenance",
          [firstLine],
          null,
        );
      }
      continue;
    }

    const pageLines = projection.lines;
    const firstDescriptionHeading = pageLines.findIndex((_, index) =>
      isSpellHeadingAt(pageLines, index),
    );
    const firstDescriptionIntro = pageLines.findIndex((line) =>
      line.text.startsWith("The spells herein are presented"),
    );
    const stopIndexes = [firstDescriptionHeading, firstDescriptionIntro].filter(
      (index) => index >= 0,
    );
    const listStop = stopIndexes.length > 0 ? Math.min(...stopIndexes) : -1;
    const listLines = listStop >= 0 ? pageLines.slice(0, listStop) : pageLines;
    for (const line of listLines) {
      if (line.text === "SPELLS") {
        flushSection();
        section = null;
        domainHeading = null;
        break;
      }

      if (line.text === "CLERIC DOMAINS") {
        flushSection();
        section = null;
        domainHeading = null;
        continue;
      }

      const classOwner = parseClassOwnerHeader(line.text);
      if (classOwner) {
        flushSection();
        section = null;
        domainHeading = null;
        continue;
      }

      const classLevel = parseClassLevelHeader(line.text);
      if (classLevel) {
        flushSection();
        section = {
          ownerKind: "class",
          owner: classLevel.owner,
          level: classLevel.level,
        };
        domainHeading = null;
        continue;
      }

      const parsedDomainHeading = parseDomainHeading(line.text);
      if (parsedDomainHeading) {
        flushSection();
        section = null;
        domainHeading = parsedDomainHeading;
        continue;
      }

      const domainTable = /^(.+?) Domain Spells$/iu.exec(line.text);
      if (domainTable) {
        flushSection();
        const ownerBase = titleCase(domainTable[1]!.trim());
        if (
          domainHeading !== null &&
          normalizeNameKey(domainHeading) !== normalizeNameKey(ownerBase)
        ) {
          addIssue(
            "domain-heading-mismatch",
            `Domain table ${ownerBase} does not match heading ${domainHeading}`,
            [line],
            null,
          );
        }
        section = { ownerKind: "domain", owner: `${ownerBase} domain` };
        domainHeading = ownerBase;
        continue;
      }

      if (/^\(?(?:CANTRIPS|ORISONS)\)?$/iu.test(line.text)) continue;
      if (!section) continue;

      if (/^\*/u.test(line.text)) {
        commitPendingAsSummary();
        finalizeActiveRow();
        const parsedFootnote = /^(\*+)\s*(.+)$/u.exec(line.text);
        if (!parsedFootnote) {
          addIssue(
            "orphan-list-text",
            "List footnote definition could not be parsed",
            [line],
          );
        } else {
          footnotes.push({
            schemaVersion: 1,
            footnoteId: [
              "list-footnote",
              section.ownerKind,
              slug(section.owner),
              parsedFootnote[1]!.length,
              page.sourcePageIndex,
            ].join(":"),
            entityType: "spell-list-footnote",
            ownerKind: section.ownerKind,
            owner: section.owner,
            marker: parsedFootnote[1]!,
            text: parsedFootnote[2]!.trim(),
            rawText: line.text,
            sourceStart: sourceStart(line),
            sourcePages: uniqueSourcePages([line.page]),
          });
        }
        continue;
      }

      const colonIndex = line.text.indexOf(":");
      if (colonIndex < 0) {
        pendingLines.push(line);
        continue;
      }

      const namePrefixCount = trailingNamePrefixCount(pendingLines, line);
      const summaryContinuation = pendingLines.slice(
        0,
        pendingLines.length - namePrefixCount,
      );
      const namePrefixLines = pendingLines.slice(
        pendingLines.length - namePrefixCount,
      );
      pendingLines = [];
      if (summaryContinuation.length > 0) {
        if (activeRow) {
          activeRow.summaryParts.push(
            ...summaryContinuation.map((entry) => entry.text),
          );
          activeRow.rawLines.push(...summaryContinuation);
        } else {
          addIssue(
            "orphan-list-text",
            "List text before a new spell row could not be attached",
            summaryContinuation,
          );
        }
      }
      finalizeActiveRow();

      const rawNameParts = [
        ...namePrefixLines
          .map((entry) => nameTextFromLine(entry, nameFontNames(line)))
          .filter(Boolean),
        nameTextBeforeColon(line),
      ].filter(Boolean);
      const rawNameWithMarkers = stripInlineComponentMarkers(
        joinWrappedText(rawNameParts),
      );
      const parsedName = stripTrailingFootnoteMarkers(rawNameWithMarkers);
      let level: number;
      let rawPrintedName: string;
      if (section.ownerKind === "domain") {
        const domainRow = /^([1-9])\s+(.+)$/u.exec(parsedName.name);
        if (!domainRow) {
          addIssue(
            "invalid-domain-row",
            "Domain spell row must begin with a level from 1 through 9",
            [...namePrefixLines, line],
          );
          pendingLines = [...namePrefixLines, line];
          continue;
        }
        level = Number(domainRow[1]);
        rawPrintedName = domainRow[2]!.trim();
      } else {
        level = section.level;
        rawPrintedName = parsedName.name;
      }

      if (rawPrintedName.length === 0) {
        addIssue(
          "incomplete-list-row",
          "Spell-list row has no printed spell name before its colon",
          [...namePrefixLines, line],
        );
        continue;
      }
      const cleaned = stripTrailingFootnoteMarkers(rawPrintedName);
      const summaryStart = line.text.slice(colonIndex + 1).trim();
      activeRow = {
        section,
        level,
        rawPrintedName,
        printedName: cleaned.name,
        nameLines: [...namePrefixLines, line],
        summaryParts: summaryStart.length > 0 ? [summaryStart] : [],
        rawLines: [...namePrefixLines, line],
        footnotes: [...parsedName.markers, ...cleaned.markers],
      };
    }
  }

  flushSection();

  const uniqueSpellNames = new Set(
    occurrences.map((entry) => normalizeNameKey(entry.printedName)),
  ).size;
  return {
    printedRows,
    occurrences,
    footnotes,
    issues,
    counts: {
      printedRows: printedRows.length,
      occurrences: occurrences.length,
      footnotes: footnotes.length,
      uniqueSpellNames,
      classAssociations: occurrences.filter(
        (entry) => entry.ownerKind === "class",
      ).length,
      domainAssociations: occurrences.filter(
        (entry) => entry.ownerKind === "domain",
      ).length,
    },
  };
}

function parseClassOwnerHeader(text: string) {
  const match = /^(.+) SPELLS$/u.exec(text);
  return match ? (CLASS_OWNERS.get(match[1]!) ?? null) : null;
}

function parseClassLevelHeader(text: string) {
  const match =
    /^(0|[1-9](?:ST|ND|RD|TH))-LEVEL (.+?) SPELLS(?: \(.+\))?$/u.exec(text);
  if (!match) return null;
  const owner = CLASS_OWNERS.get(match[2]!);
  if (!owner) return null;
  return { level: Number.parseInt(match[1]!, 10), owner };
}

function parseDomainHeading(text: string) {
  const match = /^([A-Z]+(?: [A-Z]+)*) DOMAIN$/u.exec(text);
  return match ? titleCase(match[1]!) : null;
}

function trailingNamePrefixCount(
  pending: ReadingLine[],
  colonLine: ReadingLine,
) {
  const nameFonts = nameFontNames(colonLine);
  let count = 0;
  for (let index = pending.length - 1; index >= 0; index -= 1) {
    const line = pending[index]!;
    if (!isNamePrefixLine(line, colonLine, nameFonts)) break;
    count += 1;
  }
  return count;
}

function isNamePrefixLine(
  line: ReadingLine,
  colonLine: ReadingLine,
  nameFonts: Set<string>,
) {
  if (line.text.includes(":") || /[.!?]$/u.test(line.text)) return false;
  const visible = line.segments.filter(
    (segment) => segment.text.trim().length > 0,
  );
  if (visible.length === 0) return false;
  if (visible.every((segment) => segment.height < 7)) {
    return (
      line.page === colonLine.page &&
      Math.abs(line.y - colonLine.y) <= 5 &&
      /^(?:M|F|X)(?:\s+(?:M|F|X))*$/u.test(line.text)
    );
  }
  const normal = visible.filter((segment) => segment.height >= 7);
  if (
    normal.length === 0 ||
    !normal.some((segment) => nameFonts.has(segment.fontName))
  ) {
    return false;
  }
  if (line.page !== colonLine.page) return false;
  const sameBaseline = Math.abs(line.y - colonLine.y) <= 5;
  const wrappedBaseline = line.y > colonLine.y && line.y - colonLine.y <= 16;
  return sameBaseline || wrappedBaseline;
}

function nameFontNames(line: ReadingLine) {
  const result = new Set<string>();
  for (const segment of line.segments) {
    if (segment.text.trim().length === 0) continue;
    result.add(segment.fontName);
    if (segment.text.includes(":")) break;
  }
  return result;
}

function nameTextBeforeColon(line: ReadingLine) {
  let nameFont: string | undefined;
  for (const segment of line.segments) {
    const colonIndex = segment.text.indexOf(":");
    if (
      segment.height >= 7 &&
      segment.text.slice(0, colonIndex < 0 ? undefined : colonIndex).trim()
    ) {
      nameFont = segment.fontName;
    }
    if (colonIndex >= 0) break;
  }
  const segments = [];
  for (const segment of line.segments) {
    const colonIndex = segment.text.indexOf(":");
    const text =
      colonIndex >= 0 ? segment.text.slice(0, colonIndex) : segment.text;
    if (
      segment.height >= 7 &&
      text.length > 0 &&
      (!nameFont || segment.fontName === nameFont)
    ) {
      segments.push({ ...segment, text });
    }
    if (colonIndex >= 0) break;
  }
  return joinSegments(segments);
}

function nameTextFromLine(line: ReadingLine, nameFonts: Set<string>) {
  return joinSegments(
    line.segments.filter(
      (segment) =>
        segment.height >= 7 &&
        segment.text.trim().length > 0 &&
        nameFonts.has(segment.fontName),
    ),
  );
}

function stripInlineComponentMarkers(value: string) {
  return value.replace(/\s+(?:M|F|X)(?:\s+(?:M|F|X))*$/u, "").trim();
}

function joinSegments(segments: ReadingLine["segments"]) {
  let output = "";
  let previous: ReadingLine["segments"][number] | null = null;
  for (const segment of segments) {
    const text = segment.text;
    if (
      previous &&
      output.length > 0 &&
      !/\s$/u.test(output) &&
      !/^\s/u.test(text) &&
      !/^[,.;:!?\])}]/u.test(text) &&
      !/[([{]$/u.test(output) &&
      segment.x - (previous.x + previous.width) > 1
    ) {
      output += " ";
    }
    output += text;
    previous = segment;
  }
  return output.replace(/\s+/gu, " ").trim();
}

function stripTrailingFootnoteMarkers(value: string) {
  const match = /^(.*?)([\*†‡]+)$/u.exec(value.trim());
  return match
    ? { name: match[1]!.trim(), markers: [...match[2]!] }
    : { name: value.trim(), markers: [] as string[] };
}

function expandPrintedName(printedName: string) {
  const alignmentNames = ALIGNMENT_EXPANSIONS.get(printedName);
  if (alignmentNames) {
    return alignmentNames.map((name) => ({
      printedName: name,
      kind: "alignment-fan-out" as const,
    }));
  }
  if (printedName === "Lesser Confusion") {
    return [
      {
        printedName: "Confusion, Lesser",
        kind: "printed-alias" as const,
      },
    ];
  }
  return [{ printedName, kind: "direct" as const }];
}

function joinWrappedText(parts: string[]) {
  let output = "";
  for (const rawPart of parts) {
    const part = rawPart.replace(/\s+/gu, " ").trim();
    if (part.length === 0) continue;
    if (/[-‐‑]$/u.test(output) && /^\p{Ll}/u.test(part)) {
      output = `${output.slice(0, -1)}${part}`;
    } else {
      output = output.length > 0 ? `${output} ${part}` : part;
    }
  }
  return output.trim();
}

function sourceStart(line: ReadingLine): FullListSourceStart {
  return {
    sourceId: line.page.sourceId,
    sourcePageIndex: line.page.sourcePageIndex,
    printedPageNumber: line.page.printedPageNumber,
    x: line.x,
    y: line.y,
  };
}

function normalizeNameKey(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[‘’]/gu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function titleCase(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/(?:^|\s)\p{Ll}/gu, (letter) => letter.toLocaleUpperCase("en-US"));
}

function coordinate(value: number) {
  return Math.round(value * 10) / 10;
}

function slug(value: string | number) {
  return String(value)
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[‘’]/gu, "'")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}
